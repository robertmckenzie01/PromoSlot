# PromoSlot — Refund Policy (DRAFT)

**⚠️ This is a starting draft, not a finished legal document.** Flagging one important thing up front: this policy describes how refunds are *meant* to work, but part of it — automatically cancelling the Stripe payment when a listing/campaign is removed post-funding — isn't built yet (that's tracked as task #24, currently optional/pending). Until that's built, any refund on an already-funded, cancelled deal would need to be issued manually rather than automatically. Either build #24 before publishing this, or word the policy to say refunds are "processed by our team" rather than implying instant automatic reversal — your call, but the two need to match reality.

*Last updated: [DATE]*

## 1. Overview

A Business Owner's payment is held by PromoSlot pending verification until the agreed deliverable is submitted and confirmed, at which point it's released to the Platform Owner (minus PromoSlot's fee). This policy explains what happens to funds when a deal doesn't complete as planned.

## 2. Cancelled before funding

If a deal is cancelled before it's funded, no payment has been taken, so there's nothing to refund. The deal is marked "Cancelled" and remains visible in both parties' deal history.

## 3. Cancelled after funding, before delivery

If the deal has been funded (funds held pending verification) and is then cancelled — by mutual agreement, or because the underlying listing/campaign is removed — the Business Owner is entitled to a full refund of the amount paid, `[minus/including the buyer protection fee — confirm which]`.

`[Current state: this refund is not yet automatic — see the flag at the top of this document. Until it is, describe your actual process here, e.g. "refunds are reviewed and processed by our team within X business days."]`

## 4. Disputed deliverables

If a Business Owner believes a submitted deliverable doesn't meet the agreed terms, they can raise a dispute before funds are released. PromoSlot reviews the submitted evidence against the agreed deliverables and may:

- Release the funds to the Platform Owner in full, if the deliverable meets the agreed terms.
- Refund the Business Owner in full, if the deliverable clearly wasn't provided.
- `[Confirm: is a partial release/refund possible for partially-completed work? The codebase has a refund action tied to deal review, but the exact split logic needs to be defined here.]`

## 5. Fees on refunded deals

`[Decision needed: if a deal is refunded, does PromoSlot keep, waive, or refund the buyer protection fee? This should match what Section 6 of the Terms of Service says once that's finalized — keep them consistent.]`

## 6. How to request a refund or raise a dispute

Refund and dispute requests are made through the deal page on PromoSlot, or by contacting `[support email]` with the deal reference. `[Confirm actual in-app mechanism — is there a "Raise a dispute" button, or is this support-ticket-only for now?]`

## 7. Timeframes

`[State actual expected timeframes once the process above is finalized — e.g. "Refund requests are reviewed within X business days; approved refunds are returned to your original payment method within 5–10 business days via Stripe."]`

## 8. Contact

Questions about a specific deal or refund: `[support email]`, including your deal reference number.
