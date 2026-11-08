import logging

from fastapi import APIRouter, BackgroundTasks, Depends, Request
from sqlalchemy.orm import Session

from app.core.rate_limit import limiter
from app.models.database import ContactMessage, SessionLocal, get_db
from app.schemas.contact import ContactRequest
from app.services.contact_mail import notify_contact_message

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["contact"])


async def _announce(message_id: int, topic: str, email: str, message: str) -> None:
    sent = await notify_contact_message(message_id, topic, email, message)
    if not sent:
        return
    db = SessionLocal()
    try:
        row = db.query(ContactMessage).filter(ContactMessage.id == message_id).first()
        if row:
            row.notified = True
            db.commit()
    finally:
        db.close()


@router.post("/contact", status_code=201)
@limiter.limit("5/hour")
def send_contact_message(
    request: Request,
    payload: ContactRequest,
    background: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """Public: no account needed to write to us. Stores the message first, then
    emails the owner in the background, so a slow or failing mail service never
    slows or fails the form."""
    # A robot filled the hidden field. Answer exactly as for a real message, so
    # it learns nothing, and keep nothing.
    if payload.website.strip():
        return {"status": "sent"}

    row = ContactMessage(email=payload.email, topic=payload.topic, message=payload.message.strip())
    db.add(row)
    db.commit()
    db.refresh(row)
    logger.info("Contact message %d stored (topic=%s)", row.id, row.topic)

    background.add_task(_announce, row.id, row.topic, row.email, row.message)
    return {"status": "sent"}
