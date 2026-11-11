import logging
from typing import Optional

import httpx

from app.config.settings import settings

logger = logging.getLogger(__name__)


async def send_email(
    to: str,
    subject: str,
    text: str,
    reply_to: Optional[str] = None,
) -> bool:
    """Send one plain-text email through Resend. Returns whether it went out.

    Never raises: callers run this after their own work is safely done (a
    message stored, a token written), and a mail failure must not undo that.
    The recipient and the reply-to are validated addresses; the subject is
    fixed by the caller, never built from user input."""
    if not settings.RESEND_API_KEY:
        logger.warning("Email not sent: no mail key configured")
        return False

    payload: dict = {
        "from": settings.MAIL_FROM_EMAIL,
        "to": [to],
        "subject": subject,
        "text": text,
    }
    if reply_to:
        payload["reply_to"] = reply_to

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.post(
                "https://api.resend.com/emails",
                headers={"Authorization": f"Bearer {settings.RESEND_API_KEY}"},
                json=payload,
            )
        response.raise_for_status()
    except Exception as e:
        logger.error("Email failed (%s)", type(e).__name__)
        return False
    return True
