import argparse
import io
import os
import random
from getpass import getpass

from PIL import Image
from sqlalchemy import select
from sqlalchemy.engine import make_url

from .auth import hasher
from .db import database_url, session_for_url
from .media import sanitize_image, save_image
from .models import Notification, Report, ReportEvent, StaffAction, User
from .reports import CATEGORIES
from .workflow import NEXT

# Synthetic point near Dasmariñas, Cavite; not a real resident address.
CENTER = (14.3294, 120.9367)
ACCOUNTS = [
    ("staff@demo.test", "staff"),
    ("admin@demo.test", "administrator"),
    ("resident1@demo.test", "resident"),
    ("resident2@demo.test", "resident"),
]
PATH = ["Pending", "Under Verification", "Accepted", "In Progress", "Resolved"]


def is_local():
    # Only SQLite counts: a "localhost" Postgres may be a tunnel to Supabase.
    return make_url(database_url()).get_backend_name() == "sqlite"


def photo(seed):
    color = random.Random(seed).choices(range(40, 220), k=3)
    output = io.BytesIO()
    Image.new("RGB", (640, 480), tuple(color)).save(output, format="JPEG")
    return sanitize_image(output.getvalue())


def seed(password: str, count: int):
    if len(password) < 12:
        raise ValueError("Password must be at least 12 characters")
    rng = random.Random(42)
    with session_for_url() as db:
        users = {}
        for email, role in ACCOUNTS:
            users[email] = db.scalar(select(User).where(User.email == email)) or User(
                email=email, password_hash=hasher.hash(password), role=role
            )
            db.add(users[email])
        db.flush()
        staff, residents = users["staff@demo.test"], [users["resident1@demo.test"], users["resident2@demo.test"]]
        for index in range(count):
            resident, category = residents[index % 2], sorted(CATEGORIES)[index % len(CATEGORIES)]
            final = PATH[index % len(PATH)] if index % 7 else "Rejected"
            report = Report(
                resident_id=resident.id,
                resident_category=category,
                image_path="",
                description=f"Synthetic demo concern #{index + 1}",
                latitude=CENTER[0] + rng.uniform(-0.006, 0.006),
                longitude=CENTER[1] + rng.uniform(-0.006, 0.006),
            )
            db.add(report)
            db.flush()
            db.add(ReportEvent(report_id=report.id, to_status="Pending", actor_id=resident.id))
            previous = "Pending"
            for status in (
                PATH[1 : PATH.index(final) + 1] if final != "Rejected" else ["Under Verification", "Rejected"]
            ):
                if status not in NEXT[previous]:
                    raise ValueError(f"{previous} cannot become {status}")
                db.add(ReportEvent(report_id=report.id, from_status=previous, to_status=status, actor_id=staff.id))
                db.add(Notification(user_id=resident.id, report_id=report.id, status=status))
                if status == "Accepted":
                    report.verified_category = category
                previous = status
            report.status = previous
            if previous in {"In Progress", "Resolved"}:
                db.add(
                    StaffAction(report_id=report.id, actor_id=staff.id, kind="action", note="Synthetic crew dispatched")
                )
            report.image_path = save_image(report.id, photo(index))
        db.commit()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Create synthetic demo accounts and reports")
    parser.add_argument("--count", type=int, default=12)
    parser.add_argument("--allow-remote", action="store_true", help="Permit PostgreSQL or Supabase storage")
    args = parser.parse_args()
    if not args.allow_remote and (not is_local() or os.environ.get("MEDIA_STORAGE", "local") != "local"):
        raise SystemExit("Refusing to seed a remote database or storage without --allow-remote")
    seed(os.environ.get("SEED_DEMO_PASSWORD") or getpass("Demo account password: "), args.count)
