import logging

import httpx

from app.config.settings import settings

logger = logging.getLogger(__name__)

_TOPIC_LABELS = {
    "question": "Question",
    "bug": "Problème technique",
    "data": "Mes données personnelles",
    "suggestion": "Suggestion",
}


async def notify_contact_message(message_id: int, topic: str, email: str, message: str) -> bool:
    """Tell the owner a message arrived. Returns whether the email went out.

    Plain text only, and the sender's address goes in Reply-To, so answering
    from the mailbox answers the person. Nothing the sender typed reaches a
    header except their address, which is validated, and the subject uses the
    fixed topic label."""
    if not (settings.RESEND_API_KEY and settings.CONTACT_TO_EMAIL):
        logger.warning("Contact message %d stored, email not configured", message_id)
        return False

    label = _TOPIC_LABELS.get(topic, topic)
    payload = {
        "from": settings.CONTACT_FROM_EMAIL,
        "to": [settings.CONTACT_TO_EMAIL],
        "reply_to": email,
        "subject": f"[Takalam] {label}",
        "text": f"{label}\nDe : {email}\n\n{message}",
    }
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.post(
                "https://api.resend.com/emails",
                headers={"Authorization": f"Bearer {settings.RESEND_API_KEY}"},
                json=payload,
            )
        response.raise_for_status()
    except Exception as e:
        # The message is already safe in the database; only the alert failed.
        logger.error("Contact message %d email failed (%s)", message_id, type(e).__name__)
        return False
    return True
