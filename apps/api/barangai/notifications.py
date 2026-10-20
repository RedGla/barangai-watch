from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from .auth import get_current_user, require_csrf
from .db import get_db
from .models import Notification, User, now, utc_iso

router = APIRouter(prefix="/notifications")


def serialize(item: Notification):
    return {"id": item.id, "report_id": item.report_id, "status": item.status,
            "created_at": utc_iso(item.created_at), "read_at": utc_iso(item.read_at) if item.read_at else None}


@router.get("")
def list_notifications(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    items = db.scalars(select(Notification).where(Notification.user_id == user.id)
                       .order_by(Notification.created_at.desc()).limit(100)).all()
    return [serialize(item) for item in items]


@router.post("/{notification_id}/read")
def mark_read(notification_id: str, db: Session = Depends(get_db), user: User = Depends(require_csrf)):
    item = db.get(Notification, notification_id)
    if not item or item.user_id != user.id:
        raise HTTPException(404, "Notification not found")
    if item.read_at is None:
        item.read_at = now()
        db.commit()
        db.refresh(item)
    return serialize(item)
