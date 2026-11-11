"""Forgotten passwords: a single-use, one-hour link sent by email."""
import hashlib
import logging
import secrets
from datetime import datetime, timedelta
from typing import Optional

from sqlalchemy.orm import Session

from app.config.settings import settings
from app.models.database import PasswordResetToken, User
from app.services.mailer import send_email

logger = logging.getLogger(__name__)

TOKEN_LIFETIME = timedelta(hours=1)
# One request per address per this long: a way to stop the form being used to
# fill someone's inbox, without telling the caller anything about the account.
RESEND_COOLDOWN = timedelta(minutes=2)


def _hash(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def issue_token(db: Session, user: User) -> Optional[str]:
    """Create a fresh token for the user and retire the ones still open, so
    only the latest link works. Returns None while the cooldown is running."""
    now = datetime.utcnow()
    latest = (
        db.query(PasswordResetToken)
        .filter(PasswordResetToken.user_id == user.id)
        .order_by(PasswordResetToken.created_at.desc())
        .first()
    )
    if latest and now - latest.created_at < RESEND_COOLDOWN:
        return None

    db.query(PasswordResetToken).filter(
        PasswordResetToken.user_id == user.id,
        PasswordResetToken.used_at.is_(None),
    ).update({"used_at": now}, synchronize_session=False)

    token = secrets.token_urlsafe(32)
    db.add(PasswordResetToken(
        user_id=user.id,
        token_hash=_hash(token),
        expires_at=now + TOKEN_LIFETIME,
    ))
    db.commit()
    return token


def find_valid_token(db: Session, token: str) -> Optional[PasswordResetToken]:
    row = db.query(PasswordResetToken).filter(PasswordResetToken.token_hash == _hash(token)).first()
    if not row or row.used_at is not None or row.expires_at < datetime.utcnow():
        return None
    return row


def consume_token(db: Session, row: PasswordResetToken) -> None:
    """Spend this token and any other still open for the same account."""
    now = datetime.utcnow()
    db.query(PasswordResetToken).filter(
        PasswordResetToken.user_id == row.user_id,
        PasswordResetToken.used_at.is_(None),
    ).update({"used_at": now}, synchronize_session=False)


async def send_reset_email(email: str, token: str) -> bool:
    link = f"{settings.FRONTEND_URL.rstrip('/')}/reset-password?token={token}"
    return await send_email(
        to=email,
        subject="Réinitialisation de votre mot de passe Takalam",
        text=(
            "Bonjour,\n\n"
            "Vous avez demandé à réinitialiser votre mot de passe Takalam. "
            "Ouvrez ce lien pour en choisir un nouveau (valable 1 heure, une seule fois) :\n\n"
            f"{link}\n\n"
            "Si vous n'êtes pas à l'origine de cette demande, ignorez ce message : "
            "votre mot de passe reste inchangé.\n"
        ),
    )
