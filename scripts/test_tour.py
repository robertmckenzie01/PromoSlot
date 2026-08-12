"""End-to-end checks for the guided product tour's persistence.

Usage:  python scripts/test_tour.py     (server on :8000, disposable DB)

Covers the backend contract only — the spotlight, focus trap and reduced-motion
behaviour are browser concerns and are verified in the browser.

Idempotent: each check resets the tour columns for the test account first, so a
rerun starts from the same place. The account's other state is untouched.
"""
import json, os, sys, urllib.request, urllib.error, http.cookiejar, sqlite3

# Override with PROMOSLOT_URL when the API is on a non-default port.
B = os.environ.get("PROMOSLOT_URL", "http://localhost:8000")
DB = "/Users/robertmckenzie/PromoSlot/promoslot.sqlite3"
EMAIL = "owner@example.com"
PW = "r2test1234"
PASS, FAIL = [], []


def check(name, got, want):
    ok = got == want
    (PASS if ok else FAIL).append(name)
    print(f"  {'PASS' if ok else 'FAIL'}  {name}  (got {got!r}, want {want!r})")


def truthy(name, got):
    ok = bool(got)
    (PASS if ok else FAIL).append(name)
    print(f"  {'PASS' if ok else 'FAIL'}  {name}  (got {got!r})")


def client():
    return urllib.request.build_opener(
        urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))


def call(op, method, path, body=None):
    data = json.dumps(body or {}).encode() if method != "GET" else None
    req = urllib.request.Request(B + path, data=data,
                                 headers={"Content-Type": "application/json"},
                                 method=method)
    try:
        with op.open(req) as r:
            raw = r.read().decode()
            return r.status, (json.loads(raw) if raw else {})
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()[:200]


def login(email=EMAIL, pw=PW):
    op = client()
    st, _ = call(op, "POST", "/auth/login", {"email": email, "password": pw})
    assert st == 200, f"login {email} -> {st}"
    return op


def reset():
    db = sqlite3.connect(DB)
    db.execute("update users set product_tour_started_at=null, "
               "product_tour_completed_at=null, product_tour_skipped_at=null, "
               "product_tour_current_step=0, product_tour_version=null "
               "where email=?", (EMAIL,))
    db.commit(); db.close()


def main():
    print("Guided product tour — backend persistence\n")
    op = login()

    print("a fresh account looks un-offered")
    reset()
    st, me = call(op, "GET", "/auth/me")
    check("GET /auth/me ok", st, 200)
    check("started_at null", me.get("product_tour_started_at"), None)
    check("completed_at null", me.get("product_tour_completed_at"), None)
    check("skipped_at null", me.get("product_tour_skipped_at"), None)
    check("current_step 0", me.get("product_tour_current_step"), 0)

    print("\nstart stamps started_at and records the version")
    st, r = call(op, "POST", "/auth/tour", {"action": "start", "step": 0, "version": "1"})
    check("POST /auth/tour ok", st, 200)
    truthy("started_at set", r.get("product_tour_started_at"))
    check("version recorded", r.get("product_tour_version"), "1")

    print("\nadvance moves the step forward")
    st, r = call(op, "POST", "/auth/tour", {"action": "advance", "step": 3, "version": "1"})
    check("step is 3", r.get("product_tour_current_step"), 3)

    print("\nadvance never rewinds (Back must not lose progress)")
    st, r = call(op, "POST", "/auth/tour", {"action": "advance", "step": 1, "version": "1"})
    check("step still 3", r.get("product_tour_current_step"), 3)

    print("\nskip stamps skipped_at and keeps the step")
    st, r = call(op, "POST", "/auth/tour", {"action": "skip", "step": 3, "version": "1"})
    truthy("skipped_at set", r.get("product_tour_skipped_at"))
    check("step still 3", r.get("product_tour_current_step"), 3)
    check("not completed", r.get("product_tour_completed_at"), None)

    print("\ncomplete clears the skip — finishing beats abandoning")
    st, r = call(op, "POST", "/auth/tour", {"action": "complete", "step": 5, "version": "1"})
    truthy("completed_at set", r.get("product_tour_completed_at"))
    check("skipped_at cleared", r.get("product_tour_skipped_at"), None)
    check("step 5", r.get("product_tour_current_step"), 5)

    print("\nrestarting a finished tour makes it live again")
    st, r = call(op, "POST", "/auth/tour", {"action": "start", "step": 0, "version": "1"})
    check("completed_at cleared", r.get("product_tour_completed_at"), None)
    check("skipped_at cleared", r.get("product_tour_skipped_at"), None)
    check("step back to 0", r.get("product_tour_current_step"), 0)

    print("\nbad input is rejected, not silently accepted")
    st, _ = call(op, "POST", "/auth/tour", {"action": "nonsense"})
    check("unknown action -> 422", st, 422)
    st, _ = call(op, "POST", "/auth/tour", {"action": "advance", "step": -1})
    check("negative step -> 422", st, 422)

    print("\nthe endpoint requires a session")
    st, _ = call(client(), "POST", "/auth/tour", {"action": "start"})
    check("anonymous -> 401", st, 401)

    reset()
    print(f"\n{len(PASS)} passed, {len(FAIL)} failed")
    if FAIL:
        for f in FAIL:
            print("  FAILED:", f)
        sys.exit(1)


if __name__ == "__main__":
    main()
