"""The authoritative fee/quote service (task #30).

Every pence figure PromoSlot shows or moves — a checkout line item, a Stripe
Transfer amount, a pool-settlement refund, an affiliate payout split — comes
from exactly one place: deal_money() below, called either directly or through
one of the composing functions in this file. Nothing outside this module
does its own `* pct // 100` arithmetic on a fee percentage; grep the rest of
the backend for that pattern and it won't find one (verified while building
this module — see the #30 commit message for the audit that confirmed it).

Every function here is a pure, side-effect-free calculation: no db.commit(),
no Stripe calls, no ORM mutation. That's deliberate — it's what makes them
safe to call as many times as convenient (a preview, an admin-limit check,
and the real payout can all independently call the same function and get
the same number back, with no risk of drifting from each other) and safe to
call BEFORE anything real has happened yet (deal_quote() below, for a deal
that doesn't exist as a row in the database at all). The *committing* twin
of each of these (creating a real Stripe Transfer/Refund, writing the
result onto a Deal/AffiliateProgram row) lives in services.py, which calls
back into this module for the numbers rather than recomputing them.

Money is always a plain minor-unit integer (pence for GBP). `currency` is
carried by callers as a separate, parallel display/Stripe-API field — it is
never read inside this module, and none of this math accounts for
zero-decimal currencies (e.g. JPY) or FX conversion. PromoSlot operates in
GBP only today; if that ever changes, every function below needs revisiting.
"""


def deal_money(listed_price: int, seller_pct: int, buyer_pct: int) -> dict:
    """Split-fee breakdown, all fees on the agreed/listed price (pence).

    Example ($100 listed, 10% seller / 5% buyer):
      buyer_fee=500, seller_fee=1000, charge_amount=10500 (business pays $105),
      net_to_owner=9000 (owner gets $90), platform_take=1500 ($15).
    """
    buyer_fee = listed_price * buyer_pct // 100
    seller_fee = listed_price * seller_pct // 100
    return {
        "listed_price": listed_price,
        "buyer_fee": buyer_fee,             # buyer protection fee, added at funding
        "seller_fee": seller_fee,           # seller fee, deducted at payout
        "charge_amount": listed_price + buyer_fee,   # what the business is charged
        "net_to_owner": listed_price - seller_fee,   # what the owner receives
        "platform_take": buyer_fee + seller_fee,
    }


def deal_money_for(deal) -> dict:
    """Breakdown for a specific deal, using the fee rates locked on it."""
    return deal_money(deal.listed_price, deal.seller_fee_percent, deal.buyer_fee_percent)


def total_charge_for(deal) -> dict:
    """What the business is actually charged at funding, fixed + pool combined
    into one number for one PaymentIntent (see routers/deals.py's fund_deal).

    A plain fixed deal (pool_max_budget is None) is unaffected — this is
    just deal_money_for(deal)'s charge_amount with 0 added. For a pool/
    hybrid deal it's that same fixed-side charge plus what deal_money()
    says the pool's own max budget would cost to fully fund (pool_max_budget
    + its own buyer fee) — the same "pool listed_price equivalent" framing
    pool_settlement_for() uses at the other end, at settlement.
    """
    fixed = deal_money_for(deal)
    pool_charge = 0
    if deal.pool_max_budget:
        pool_charge = deal_money(deal.pool_max_budget, deal.seller_fee_percent,
                                 deal.buyer_fee_percent)["charge_amount"]
    return {"fixed_charge": fixed["charge_amount"], "pool_charge": pool_charge,
            "total_charge": fixed["charge_amount"] + pool_charge}


def deal_quote(*, listed_price: int = 0, pool_max_budget: int = None,
               seller_pct: int, buyer_pct: int) -> dict:
    """total_charge_for()'s hypothetical twin: the same breakdown for a deal
    that doesn't exist as a database row yet.

    Nothing is locked in by calling this — seller_fee_percent/buyer_fee_percent
    are only ever frozen onto a real Deal row at creation (routers/deals.py,
    routers/campaigns.py), so this always reflects the platform's CURRENT
    live rates (settings.seller_fee_percent/buyer_fee_percent), which is
    exactly right for a pre-creation preview: it's showing what the deal
    would cost if created right now, not making any promise about what it
    will cost if created later after a rate change. Callers are expected to
    have already validated the pricing-model shape (see routers/deals.py's
    validate_pricing_fields) before calling this — this function trusts its
    inputs and does no validation of its own, matching every other function
    in this module.
    """
    fixed = deal_money(listed_price or 0, seller_pct, buyer_pct)
    pool = deal_money(pool_max_budget, seller_pct, buyer_pct) if pool_max_budget else None
    total_charge = fixed["charge_amount"] + (pool["charge_amount"] if pool else 0)
    return {
        "seller_fee_percent": seller_pct,
        "buyer_fee_percent": buyer_pct,
        "fixed": fixed,
        "pool": pool,
        "total_charge": total_charge,
    }


def pool_settlement_for(deal, verified_quantity: int) -> dict:
    """Pure math for settling a per_view/per_impression pool — no Stripe, no DB.

    Pays only for complete priced units, floor-rounded (agreed explicitly:
    real view counts are never round, so payout is always in whole units of
    rate_unit_quantity rather than trying to force reality to be tidy).
    Fee is only ever taken on the released slice — reuses deal_money() twice
    (once for the full pool, once for the released slice) rather than a new
    formula, so refund = (what was charged for the pool) - (what's kept for
    the released slice) can never drift from what deal_money() would compute
    for either amount on its own.
    """
    units = verified_quantity // deal.rate_unit_quantity if deal.rate_unit_quantity else 0
    gross = units * deal.rate_unit_pence
    gross = min(gross, deal.pool_max_budget or 0)   # can never release more than was funded

    charged_for_pool = deal_money(deal.pool_max_budget or 0, deal.seller_fee_percent, deal.buyer_fee_percent)
    kept_for_released = deal_money(gross, deal.seller_fee_percent, deal.buyer_fee_percent)

    return {
        "verified_quantity": verified_quantity,
        "units": units,
        "pool_gross": gross,
        "pool_net_to_owner": kept_for_released["net_to_owner"],
        "pool_platform_take": kept_for_released["platform_take"],
        "refund_to_business": charged_for_pool["charge_amount"] - kept_for_released["charge_amount"],
    }


def affiliate_settlement_for(program, owner_commission_totals: dict) -> dict:
    """Pure math for one-time campaign-end settlement of an affiliate pool —
    no Stripe, no DB. Same shape as pool_settlement_for (deal_money() used
    once for the full pool, once for the released slice, so refund =
    charged_for_pool - kept_for_released can never drift from what
    deal_money() would compute for either on its own), extended to split the
    released slice across however many platform owners earned commission on
    this program, since — unlike a Deal, which always has exactly one
    platform owner — a program can have many.

    owner_commission_totals: {platform_owner_id: sum of PENDING (non-
    reversed) AffiliateConversion.commission_amount for that owner on this
    program}. Reversed conversions must already be excluded by the caller's
    query — this function has no way to tell the difference itself.

    If total commission earned exceeds pool_max_budget, every owner's share
    is scaled down proportionally to the capped total, rather than paying
    out in some arbitrary order until the pool runs dry — that would make
    payout depend on iteration order, not on what was actually earned.

    Per-owner net is floor-rounded independently per owner (each gets their
    own real, whole-pence Stripe Transfer). The sum of those may land a few
    pence under the aggregate kept_for_released["net_to_owner"] purely from
    splitting one floor-rounded number across several floor-rounded parts —
    the same kind of harmless rounding slack pool_settlement_for's own
    docstring already accepts ("real view counts are never round"). This
    function never lets that slack push a payout OVER the aggregate net
    budget, only under it by at most a few pence, which is not owed to
    anyone and is simply retained rather than distributed.

    Fee-parameter naming note: an AffiliateProgram calls these same two
    percentages payout_fee_percent (owner side, deducted at payout — plays
    deal_money()'s seller_pct role) and funding_fee_percent (business side,
    added at funding — plays buyer_pct's role). Same formula, renamed
    fields — see routers/affiliate.py's fund_program/topup_program for the
    charge-time use of the same renaming.
    """
    total_commission = sum(owner_commission_totals.values())
    total_commission_capped = min(total_commission, program.pool_max_budget)

    charged_for_pool = deal_money(program.pool_max_budget, program.payout_fee_percent, program.funding_fee_percent)
    kept_for_released = deal_money(total_commission_capped, program.payout_fee_percent, program.funding_fee_percent)
    refund_to_business = max(0, charged_for_pool["charge_amount"] - kept_for_released["charge_amount"])

    payouts = {}
    net_budget_remaining = kept_for_released["net_to_owner"]
    if total_commission > 0:
        for owner_id, commission in owner_commission_totals.items():
            share = commission * total_commission_capped // total_commission
            net = deal_money(share, program.payout_fee_percent, 0)["net_to_owner"]
            net = max(0, min(net, net_budget_remaining))  # never exceed what's actually kept back
            net_budget_remaining -= net
            payouts[owner_id] = {"commission": commission, "capped_share": share, "net_to_owner": net}

    return {
        "total_commission": total_commission,
        "total_commission_capped": total_commission_capped,
        "refund_to_business": refund_to_business,
        "platform_take": kept_for_released["platform_take"],
        "payouts": payouts,   # {platform_owner_id: {commission, capped_share, net_to_owner}}
    }
