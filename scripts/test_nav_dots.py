"""End-to-end checks for the "new since you looked" nav dots.

Usage:  python scripts/test_nav_dots.py     (server on :8000, disposable DB)

Every check goes through the real HTTP API against real state — real support
tickets, real evidence, real verifications, real messages. Nothing is stubbed.

Not idempotent by design: verifying a deal genuinely consumes it. A rerun picks
fresh targets from live state, and once owner@example.com has no fundable deal
left the evidence check is skipped out loud rather than reported as a pass.
"""
import json, sys, urllib.request, urllib.error, http.cookiejar, sqlite3, time

B = "http://localhost:8000"
DB = "/Users/robertmckenzie/PromoSlot/promoslot.sqlite3"
PW = "r2test1234"
PASS, FAIL = [], []


def check(name, got, want):
    ok = got == want
    (PASS if ok else FAIL).append(name)
    print(f"  {'PASS' if ok else 'FAIL'}  {name}  (got {got!r}, want {want!r})")


def client():
    return urllib.request.build_opener(
        urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))


def call(op, method, path, body=None, form=None):
    if form is not None:
        import uuid
        bd = "----b" + uuid.uuid4().hex
        parts = []
        for k, v in form.items():
            parts.append(f"--{bd}\r\nContent-Disposition: form-data; name=\"{k}\"\r\n\r\n{v}\r\n")
        data = ("".join(parts) + f"--{bd}--\r\n").encode()
        hdrs = {"Content-Type": f"multipart/form-data; boundary={bd}"}
    else:
        data = json.dumps(body or {}).encode() if method != "GET" else None
        hdrs = {"Content-Type": "application/json"}
    req = urllib.request.Request(B + path, data=data, headers=hdrs, method=method)
    try:
        with op.open(req) as r:
            raw = r.read().decode()
            return r.status, (json.loads(raw) if raw else {})
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()[:200]


def login(email, pw=PW):
    op = client()
    st, _ = call(op, "POST", "/auth/login", {"email": email, "password": pw})
    assert st == 200, f"login {email} -> {st}"
    return op


def summary(op):
    st, s = call(op, "GET", "/notifications/summary")
    assert st == 200, s
    return s


def reset_views(*emails):
    db = sqlite3.connect(DB)
    for e in emails:
        db.execute("update users set queue_last_viewed_at=null where email=?", (e,))
    db.commit(); db.close()


def pick_deals():
    """Two real deals owned by owner@example.com that can still take new evidence.

    Read from live state so the run isn't tied to fixture ids a previous run
    already consumed.
    """
    db = sqlite3.connect(DB)
    # A deal owner@example.com can still submit evidence against.
    a = db.execute("""select id from deals where funded_at is not null
                      and verified_at is null and platform_owner_id=2
                      and status in ('funded','in_delivery','proof_submitted')
                      order by id limit 1""").fetchone()
    # Any deal a reviewer can still verify (no owner login needed).
    b = db.execute("""select id from deals where funded_at is not null
                      and verified_at is null and status='proof_submitted'
                      order by id limit 1""").fetchone()
    db.close()
    assert b, "need at least one verifiable proof_submitted deal"
    return (a[0] if a else None), b[0]


DEAL_A, DEAL_B = pick_deals()
print(f"evidence deal: {DEAL_A or 'NONE LEFT'}   verifiable deal: {DEAL_B}")

print("=== setup: two reviewers with no view history ===")
reset_views("rev1@example.com", "rev2@example.com")
rev1, rev2 = login("rev1@example.com"), login("rev2@example.com")
owner, biz = login("owner@example.com"), login("business@example.com")

# A real open ticket has to exist for the support queue to have anything in it.
st, t = call(biz, "POST", "/support", {"name": "Test Business Ltd",
                                       "email": "business@example.com",
                                       "subject": "Dot test ticket",
                                       "body": "Checking the support nav dot."})
print(f"  created ticket -> {st} {t.get('id') if isinstance(t, dict) else t}")

print("\n=== 1. fresh reviewer, never opened anything, work outstanding in all three ===")
s = summary(rev1)
check("review_new", s["review_new"], True)
check("payouts_new", s["payouts_new"], True)
check("support_new", s["support_new"], True)
check("review_pending still counted", s["review_pending"] > 0, True)
check("awaiting_payout still counted", s["awaiting_payout"] > 0, True)

print("\n=== 2. open Review queue -> only its own dot clears ===")
st, _ = call(rev1, "POST", "/notifications/queue-viewed/review")
check("queue-viewed/review", st, 200)
s = summary(rev1)
check("review_new cleared", s["review_new"], False)
check("payouts_new untouched", s["payouts_new"], True)
check("support_new untouched", s["support_new"], True)
check("review_pending unchanged by looking", s["review_pending"] > 0, True)

print("\n=== 3. new evidence lands on a different deal -> review dot relights ===")
if DEAL_A is None:
    print("  SKIPPED — no funded deal left for owner@example.com to submit evidence against.")
    print("  (Each pass verifies the deals it uses; seeding a fresh one needs a real Stripe charge.)")
else:
  time.sleep(1.1)
  st, p = call(owner, "POST", f"/deals/{DEAL_A}/proof", form={"kind": "link",
                                                             "url": "https://example.com/dot-test-proof"})
  print(f"  submitted proof on deal {DEAL_A} -> {st}")
  s = summary(rev1)
  check("review_new relit by new evidence", s["review_new"], True)
  check("...even though the earlier item is still unresolved", s["review_pending"] > 1, True)

print("\n=== 4. resolving work is not new work: verify a deal without reopening ===")
call(rev1, "POST", "/notifications/queue-viewed/review")
check("review_new cleared again", summary(rev1)["review_new"], False)
time.sleep(1.1)
st, v = call(rev1, "POST", f"/review/deals/{DEAL_B}/verify", {"decision": "approved", "reason": "dot test verification",
                     "evidence_reviewed": True})
print(f"  verified deal {DEAL_B} -> {st}")
s = summary(rev1)
check("verifying does NOT relight review dot", s["review_new"], False)
check("...but it DOES land in payouts (already lit)", s["payouts_new"], True)

print("\n=== 5. payouts: open it, then a new verification relights it ===")
call(rev1, "POST", "/notifications/queue-viewed/payouts")
check("payouts_new cleared", summary(rev1)["payouts_new"], False)
time.sleep(1.1)
_d = sqlite3.connect(DB)
_next = _d.execute("""select id from deals where funded_at is not null and verified_at is null
                      and status='proof_submitted' order by id limit 1""").fetchone()
_d.close()
st, _ = call(rev1, "POST", f"/review/deals/{_next[0]}/verify",
             {"decision": "approved", "reason": "second dot test verification",
              "evidence_reviewed": True})
print(f"  verified deal {_next[0]} -> {st}")
check("payouts_new relit by a new verification", summary(rev1)["payouts_new"], True)

print("\n=== 6. support queue is per-reviewer, not global ===")
check("rev2 (hasn't looked) sees support_new", summary(rev2)["support_new"], True)
call(rev1, "POST", "/notifications/queue-viewed/support")
check("rev1 cleared their own", summary(rev1)["support_new"], False)
check("rev2 STILL sees it", summary(rev2)["support_new"], True)
time.sleep(1.1)
call(biz, "POST", "/support", {"name": "Test Business Ltd", "email": "business@example.com",
                               "subject": "Second dot test", "body": "New ticket after rev1 looked."})
check("new ticket relights rev1", summary(rev1)["support_new"], True)
check("and rev2 too", summary(rev2)["support_new"], True)

print("\n=== 7. messages: per-recipient, cleared by opening the thread ===")
before = summary(rev1)["unread_messages"]
st, m = call(biz, "POST", "/messages", {"to_user_id": 4, "body": "Dot test message"})
print(f"  business -> rev1 message: {st}")
s = summary(rev1)
check("unread_messages lit for recipient", s["unread_messages"], True)
check("sender's own dot not lit by their own message", summary(biz)["unread_messages"], False)
st, convos = call(rev1, "GET", "/conversations")
cid = [c["id"] for c in convos if c.get("unread")][0]
call(rev1, "GET", f"/conversations/{cid}/messages")
check("cleared by opening the thread", summary(rev1)["unread_messages"], False)

print("\n=== 8. plain USER sees none of it and cannot mark queues viewed ===")
s = summary(biz)
check("business review_new", s["review_new"], False)
check("business payouts_new", s["payouts_new"], False)
check("business support_new", s["support_new"], False)
st, _ = call(biz, "POST", "/notifications/queue-viewed/review")
check("queue-viewed 403s for a plain USER", st, 403)
st, _ = call(rev1, "POST", "/notifications/queue-viewed/bogus")
check("unknown queue 422s", st, 422)

print("\n" + "=" * 56)
print(f"PASSED {len(PASS)}   FAILED {len(FAIL)}")
if FAIL:
    print("failures:", FAIL); sys.exit(1)
print("All nav-dot checks passed.")
