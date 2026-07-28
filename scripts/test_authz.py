"""Authorization test suite — hits the real HTTP API directly.

Deliberately bypasses the front end: every check is a raw request, proving the
API enforces permissions on its own and that hiding a button changes nothing.

Usage:  python scripts/test_authz.py [base_url]
Expects a disposable database (it creates and mutates accounts).
"""
import json
import sys
import urllib.error
import urllib.request
import http.cookiejar
import warnings

warnings.filterwarnings("ignore")
sys.path.insert(0, __file__.rsplit("/scripts/", 1)[0])

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8001"

PASSED, FAILED = [], []


def check(name, got, expect):
    ok = (got == expect) if not isinstance(expect, (list, tuple)) else (got in expect)
    (PASSED if ok else FAILED).append(f"{name}: got {got}, expected {expect}")
    print(f"  {'PASS' if ok else 'FAIL'}  {name}  (got {got}, expected {expect})")
    return ok


def client():
    return urllib.request.build_opener(
        urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))


def call(op, method, path, body=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(BASE + path, data=data, method=method)
    if data:
        req.add_header("Content-Type", "application/json")
    try:
        with op.open(req) as r:
            return r.status, json.loads(r.read().decode() or "null")
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.loads(e.read().decode())
        except Exception:
            return e.code, None


def login(email, pw):
    op = client()
    st, _ = call(op, "POST", "/auth/login", {"email": email, "password": pw})
    if st != 200:
        raise SystemExit(f"login failed for {email}: {st}")
    return op


def main():
    from backend.db import SessionLocal
    from backend.models import User, Deal, DealStatus, Proof, Platform
    from backend.permissions import Role
    from backend.security import hash_password
    from datetime import datetime

    db = SessionLocal()
    PW = "pw12345678"

    def ensure(email, **kw):
        u = db.query(User).filter(User.email == email).first()
        if u is None:
            u = User(email=email, password_hash=hash_password(PW), **kw)
            db.add(u)
        else:
            u.password_hash = hash_password(PW)
            for k, v in kw.items():
                setattr(u, k, v)
        db.commit(); db.refresh(u)
        return u

    su = ensure("su@authz.example", display_name="Super", role=Role.SUPER_ADMIN)
    ad = ensure("admin@authz.example", display_name="Admin", role=Role.ADMIN)
    ad2 = ensure("admin2@authz.example", display_name="Admin2", role=Role.ADMIN)
    usr = ensure("user@authz.example", display_name="User", role=Role.USER,
                 is_business=True)
    biz = ensure("biz@authz.example", display_name="Biz", role=Role.USER, is_business=True)
    own = ensure("own@authz.example", display_name="Own", role=Role.USER,
                 is_platform_owner=True)

    # A funded deal with evidence, ready for review.
    d = Deal(business_id=biz.id, platform_owner_id=own.id, listed_price=10000,
             currency="gbp", status=DealStatus.PROOF_SUBMITTED,
             business_approved=True, owner_approved=True,
             funded_at=datetime.utcnow(), charge_id="ch_authz")
    db.add(d); db.commit(); db.refresh(d)
    db.add(Proof(deal_id=d.id, kind="screenshot", url="https://example.com/p",
                 submitted_by=own.id))
    # A deal the ADMIN is personally a party to (conflict of interest).
    conflict = Deal(business_id=ad.id, platform_owner_id=own.id, listed_price=10000,
                    currency="gbp", status=DealStatus.PROOF_SUBMITTED,
                    business_approved=True, owner_approved=True,
                    funded_at=datetime.utcnow(), charge_id="ch_conf")
    db.add(conflict); db.commit(); db.refresh(conflict)
    db.add(Proof(deal_id=conflict.id, kind="screenshot", url="https://example.com/c",
                 submitted_by=own.id))
    # A big verified deal to test the payout threshold (net £900 > £500 limit).
    big = Deal(business_id=biz.id, platform_owner_id=own.id, listed_price=100000,
               currency="gbp", status=DealStatus.VERIFIED,
               business_approved=True, owner_approved=True,
               funded_at=datetime.utcnow(), verified_at=datetime.utcnow(),
               charge_id="ch_big")
    db.add(big); db.commit(); db.refresh(big)
    plat = Platform(owner_id=own.id, name="AuthZ Listing", platform_type="TikTok")
    db.add(plat); db.commit(); db.refresh(plat)
    deal_id, conflict_id, big_id, plat_id = d.id, conflict.id, big.id, plat.id
    su_id, ad_id, ad2_id, usr_id = su.id, ad.id, ad2.id, usr.id
    db.close()

    c_su = login("su@authz.example", PW)
    c_ad = login("admin@authz.example", PW)
    c_usr = login("user@authz.example", PW)

    R = {"reason": "authorization test", "password": PW, "evidence_reviewed": True}

    print("\n--- USER cannot access admin endpoints ---")
    check("USER GET /admin/admins", call(c_usr, "GET", "/admin/admins")[0], 403)
    check("USER GET /admin/audit-log", call(c_usr, "GET", "/admin/audit-log")[0], 403)
    check("USER GET /review/queue", call(c_usr, "GET", "/review/queue")[0], 403)
    check("USER verify deal", call(c_usr, "POST", f"/review/deals/{deal_id}/verify",
                                   {**R, "decision": "approved"})[0], 403)
    check("USER release payout", call(c_usr, "POST", f"/review/deals/{big_id}/release", R)[0], 403)
    check("USER suspend user", call(c_usr, "POST", f"/admin/users/{ad2_id}/suspend", R)[0], 403)
    check("USER set role (self-promote)",
          call(c_usr, "POST", f"/admin/users/{usr_id}/role", {**R, "role": "SUPER_ADMIN"})[0], 403)

    print("\n--- ADMIN can review evidence ---")
    check("ADMIN GET /review/queue", call(c_ad, "GET", "/review/queue")[0], 200)
    check("ADMIN GET /review/payouts", call(c_ad, "GET", "/review/payouts")[0], 200)
    st, _ = call(c_ad, "POST", f"/review/deals/{deal_id}/verify", {**R, "decision": "approved"})
    check("ADMIN verify deal", st, 200)

    print("\n--- ADMIN cannot manage accounts or roles ---")
    check("ADMIN suspend user", call(c_ad, "POST", f"/admin/users/{usr_id}/suspend", R)[0], 403)
    check("ADMIN ban user", call(c_ad, "POST", f"/admin/users/{usr_id}/ban", R)[0], 403)
    check("ADMIN create admin (set role)",
          call(c_ad, "POST", f"/admin/users/{usr_id}/role", {**R, "role": "ADMIN"})[0], 403)
    check("ADMIN promote self",
          call(c_ad, "POST", f"/admin/users/{ad_id}/role", {**R, "role": "SUPER_ADMIN"})[0], 403)
    check("ADMIN list admins", call(c_ad, "GET", "/admin/admins")[0], 403)
    check("ADMIN remove listing",
          call(c_ad, "POST", f"/admin/listings/{plat_id}/remove", R)[0], 403)

    print("\n--- Conflict of interest + state machine + thresholds ---")
    check("ADMIN verify own deal (conflict)",
          call(c_ad, "POST", f"/review/deals/{conflict_id}/verify",
               {**R, "decision": "approved"})[0], 403)
    check("ADMIN verify without evidence_reviewed",
          call(c_ad, "POST", f"/review/deals/{deal_id}/verify",
               {"reason": "x", "decision": "approved", "evidence_reviewed": False})[0], 422)
    check("ADMIN release payout over threshold (needs SUPER_ADMIN)",
          call(c_ad, "POST", f"/review/deals/{big_id}/release", R)[0], 403)
    # A rejected deal must never be payable.
    from backend.db import SessionLocal as S2
    db2 = S2(); dd = db2.get(Deal, deal_id)
    dd.status = DealStatus.REJECTED; dd.verified_at = None; db2.commit(); db2.close()
    check("release a REJECTED deal (invalid transition)",
          call(c_su, "POST", f"/review/deals/{deal_id}/release", R)[0], 409)

    print("\n--- SUPER_ADMIN can perform privileged actions ---")
    check("SUPER_ADMIN list admins", call(c_su, "GET", "/admin/admins")[0], 200)
    check("SUPER_ADMIN audit log", call(c_su, "GET", "/admin/audit-log")[0], 200)
    # MFA is mandatory for privileged super-admin actions.
    st, body = call(c_su, "POST", f"/admin/users/{usr_id}/suspend", R)
    mfa_required = st == 403 and "multi-factor" in json.dumps(body).lower()
    check("SUPER_ADMIN suspend blocked until MFA enrolled", mfa_required, True)

    # Enrol MFA for the super-admin, then retry.
    from backend.totp import now_code
    st, start = call(c_su, "POST", "/mfa/start", {"password": PW})
    check("SUPER_ADMIN mfa start", st, 200)
    secret = start["secret"]
    st, conf = call(c_su, "POST", "/mfa/confirm", {"code": now_code(secret)})
    check("SUPER_ADMIN mfa confirm", st, 200)
    check("recovery codes issued", len(conf.get("recovery_codes", [])), 10)
    RM = {**R, "mfa_code": now_code(secret)}
    check("SUPER_ADMIN suspend user (with MFA)",
          call(c_su, "POST", f"/admin/users/{usr_id}/suspend", RM)[0], 200)
    check("SUPER_ADMIN create admin",
          call(c_su, "POST", f"/admin/users/{ad2_id}/role", {**RM, "role": "ADMIN"})[0], 200)
    check("SUPER_ADMIN cannot change own role",
          call(c_su, "POST", f"/admin/users/{su_id}/role", {**RM, "role": "USER"})[0], 403)
    check("SUPER_ADMIN release big payout allowed past threshold (fails later on Stripe/account)",
          call(c_su, "POST", f"/review/deals/{big_id}/release", RM)[0], [409, 502])

    print("\n--- Suspended admin loses access immediately ---")
    c_ad2 = login("admin2@authz.example", PW)
    check("admin2 can read queue before suspension", call(c_ad2, "GET", "/review/queue")[0], 200)
    check("SUPER_ADMIN suspends admin2",
          call(c_su, "POST", f"/admin/users/{ad2_id}/suspend", RM)[0], 200)
    check("suspended admin2 blocked (same session)", call(c_ad2, "GET", "/review/queue")[0],
          [401, 403])

    print("\n--- Last Super-Admin protection ---")
    check("cannot demote the last active Super-Admin",
          call(c_su, "POST", f"/admin/users/{su_id}/role", {**RM, "role": "USER"})[0], 403)

    print("\n--- Audit log is append-only through every path ---")
    st, rows = call(c_su, "GET", "/admin/audit-log")
    check("audit entries recorded", len(rows) > 0, True)
    actions = {r["action"] for r in rows}
    check("verify recorded", "deal.verify" in actions, True)
    check("suspend recorded", "user.suspend" in actions, True)
    check("no audit mutation endpoints",
          any(m in str(call(c_su, "GET", "/openapi.json")[1]) for m in
              ['"/admin/audit-log/{', "audit-log/delete"]), False)

    print("\n" + "=" * 60)
    print(f"PASSED {len(PASSED)}   FAILED {len(FAILED)}")
    if FAILED:
        print("\nFAILURES:")
        for f in FAILED:
            print("  -", f)
        sys.exit(1)
    print("All authorization tests passed.")


if __name__ == "__main__":
    main()
