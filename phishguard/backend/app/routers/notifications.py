from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from typing import Optional
from pydantic import BaseModel

from app.database import get_db
from app.rbac import require_role
from app.models.user import User
from app.models.notification import Notification

router = APIRouter(prefix="/notifications", tags=["notifications"])


class NotificationPayload(BaseModel):
    message: str
    link: Optional[str] = None


@router.get("")
def list_notifications(
    current_user: User = Depends(require_role(["admin", "employee"])),
    db: Session = Depends(get_db)
):
    """Return all notifications for the current user, newest first."""
    notifs = (
        db.query(Notification)
        .filter(Notification.user_id == current_user.id)
        .order_by(Notification.created_at.desc())
        .limit(50)
        .all()
    )
    return [
        {
            "id": n.id,
            "type": n.type,
            "payload": n.payload,
            "read": n.read,
            "created_at": n.created_at.isoformat() if n.created_at else None,
        }
        for n in notifs
    ]


@router.get("/unread-count")
def unread_count(
    current_user: User = Depends(require_role(["admin", "employee"])),
    db: Session = Depends(get_db)
):
    count = db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.read == False
    ).count()
    return {"unread": count}


@router.post("/{id}/read")
def mark_read(
    id: int,
    current_user: User = Depends(require_role(["admin", "employee"])),
    db: Session = Depends(get_db)
):
    notif = db.query(Notification).filter(
        Notification.id == id,
        Notification.user_id == current_user.id
    ).first()
    if not notif:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")
    notif.read = True
    db.commit()
    return {"ok": True}


@router.post("/read-all")
def mark_all_read(
    current_user: User = Depends(require_role(["admin", "employee"])),
    db: Session = Depends(get_db)
):
    db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.read == False
    ).update({"read": True})
    db.commit()
    return {"ok": True}


def create_notification(db: Session, user_id: int, notif_type: str, payload: dict):
    """Helper called by other services to insert a notification row."""
    from app.services.notification_service import create_notification as service_create_notification
    return service_create_notification(db, user_id, notif_type, payload)

