"""Promote a user to reviewer (out-of-band; reviewers are never self-serve).

Usage:  python -m scripts.make_reviewer <email>
"""
import sys

from backend.db import SessionLocal
from backend.models import User


def main() -> int:
    if len(sys.argv) != 2:
        print("usage: python -m scripts.make_reviewer <email>")
        return 2
    email = sys.argv[1].strip().lower()
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if user is None:
            print(f"No user with email {email}")
            return 1
        user.is_reviewer = True
        db.commit()
        print(f"Promoted {email} to reviewer.")
        return 0
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
