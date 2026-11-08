import logging

from app.config.settings import settings
from app.services.mailer import send_email

logger = logging.getLogger(__name__)

_TOPIC_LABELS = {
    "question": "Question",
    "bug": "Problème technique",
    "data": "Mes données personnelles",
    "suggestion": "Suggestion",
}


async def notify_contact_message(message_id: int, topic: str, email: str, message: str) -> bool:
    """Tell the owner a message arrived. Returns whether the email went out.

    The sender's address goes in Reply-To, so answering from the mailbox answers
    the person, and the subject is the fixed topic label."""
    if not settings.CONTACT_TO_EMAIL:
        logger.warning("Contact message %d stored, no recipient configured", message_id)
        return False

    label = _TOPIC_LABELS.get(topic, topic)
    return await send_email(
        to=settings.CONTACT_TO_EMAIL,
        subject=f"[Takalam] {label}",
        text=f"{label}\nDe : {email}\n\n{message}",
        reply_to=email,
    )
