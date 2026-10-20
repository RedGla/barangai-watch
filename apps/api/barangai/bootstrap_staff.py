import argparse
from getpass import getpass

from sqlalchemy import select

from .auth import hasher
from .db import session_for_url
from .models import User


def create_staff(email: str, password: str, role: str):
    if role not in {"staff", "administrator"} or len(password) < 12:
        raise ValueError("Valid role and a password of at least 12 characters required")
    with session_for_url() as db:
        if db.scalar(select(User).where(User.email == email.lower())):
            raise ValueError("Email already exists")
        db.add(User(email=email.lower(), password_hash=hasher.hash(password), role=role))
        db.commit()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Create staff or administrator account")
    parser.add_argument("email")
    parser.add_argument("--role", choices=["staff", "administrator"], default="staff")
    args = parser.parse_args()
    create_staff(args.email, getpass("Password: "), args.role)
