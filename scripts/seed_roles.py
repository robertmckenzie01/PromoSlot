"""Seed the initial role hierarchy.

Run once per environment:  python scripts/seed_roles.py <super-admin-email>

* Promotes the given account to SUPER_ADMIN (the single initial super-admin).
* Migrates the legacy reviewer account to ADMIN.
* Everyone else stays USER.

Role assignment afterwards happens only through the super-admin-only API
(POST /admin/users/{id}/role), never through a generic user-edit path.
"""
import sys
import warnings

warnings.filterwarnings("ignore")

sys.path.insert(0, __file__.rsplit("/scripts/", 1)[0])

from backend.db import SessionLocal          # noqa: E402
from backend.models import User              # noqa: E402
from backend.permissions import Role         # noqa: E402


def main(super_email: str):
    db = SessionLocal()
    email = (super_email or "").strip().lower()

    supers = db.query(User).filter(User.role == Role.SUPER_ADMIN).all()
    target = db.query(User).filter(User.email == email).first()
    if target is None:
        print(f"! No account with email {email!r}. Sign up first, then re-run.")
    else:
        if supers and all(u.id != target.id for u in supers):
            print(f"! A Super-Admin already exists ({supers[0].email}). "
                  f"Use the API to assign further roles.")
        else:
            target.role = Role.SUPER_ADMIN
            print(f"SUPER_ADMIN -> {target.email} (id {target.id})")

    # Legacy reviewer accounts become ADMIN (delivery review + normal payouts).
    for u in db.query(User).filter(User.is_reviewer.is_(True)).all():
        if u.role == Role.USER:
            u.role = Role.ADMIN
            print(f"ADMIN       -> {u.email} (id {u.id})")

    db.commit()
    print("\nfinal roles:")
    for u in db.query(User).order_by(User.id).all():
        print(f"  id={u.id} {u.email} role={u.role} action_code={"set" if u.action_code_hash else "not set"}")
    db.close()


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "")
