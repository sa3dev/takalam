import logging
from fastapi import APIRouter, Depends, HTTPException, Response, Request
from sqlalchemy.orm import Session
from app.models.database import (
    get_db,
    User,
    Session as DBSession,
    Transcription,
    SessionAnalytics,
    PaywallEvent,
)
from app.schemas.auth import UserCreate, UserResponse, LoginRequest
from app.core.security import verify_password, get_password_hash, create_access_token
from app.core.auth_deps import get_current_user
from app.core.rate_limit import limiter
from app.core.redis_client import client as _redis
from app.config.settings import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/auth", tags=["auth"])

_COOKIE_NAME = "takalam_token"
_COOKIE_MAX_AGE = settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60


def _set_auth_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=_COOKIE_NAME,
        value=token,
        max_age=_COOKIE_MAX_AGE,
        httponly=True,
        secure=settings.ENVIRONMENT == "production",
        samesite="lax",
        path="/",
    )


@router.post("/register", response_model=UserResponse)
@limiter.limit("5/minute")
def register(request: Request, user_data: UserCreate, response: Response, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == user_data.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    if db.query(User).filter(User.username == user_data.username).first():
        raise HTTPException(status_code=400, detail="Username already taken")

    user = User(
        email=user_data.email,
        username=user_data.username,
        hashed_password=get_password_hash(user_data.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token({"sub": str(user.id)})
    _set_auth_cookie(response, token)
    return user


@router.post("/login", response_model=UserResponse)
@limiter.limit("10/minute")
def login(request: Request, credentials: LoginRequest, response: Response, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == credentials.email).first()
    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token({"sub": str(user.id)})
    _set_auth_cookie(response, token)
    return user


@router.post("/logout")
def logout(response: Response):
    response.delete_cookie(key=_COOKIE_NAME, path="/")
    return {"message": "Logged out"}


@router.get("/me", response_model=UserResponse)
def me(current_user: User = Depends(get_current_user)):
    return current_user


@router.delete("/me")
def delete_account(
    response: Response,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Permanently delete account and all associated data (RGPD right to erasure)."""
    user_id = current_user.id

    # Collect session IDs before deletion for Redis cleanup
    session_ids = [s.id for s in db.query(DBSession.id).filter(DBSession.user_id == user_id).all()]

    # Delete in FK-safe order: analytics → transcriptions → sessions → user
    if session_ids:
        db.query(SessionAnalytics).filter(SessionAnalytics.session_id.in_(session_ids)).delete(synchronize_session=False)
        db.query(Transcription).filter(Transcription.session_id.in_(session_ids)).delete(synchronize_session=False)
    db.query(DBSession).filter(DBSession.user_id == user_id).delete(synchronize_session=False)
    # Paywall analytics reference the user too, and erasure is not negotiable:
    # the funnel loses a data point rather than the account surviving a deletion
    # request. Without this the FK blocks the delete outright, and precisely for
    # the users who engaged most.
    db.query(PaywallEvent).filter(PaywallEvent.user_id == user_id).delete(synchronize_session=False)
    db.delete(current_user)
    db.commit()

    # Clean up any live conversation history in Redis
    for sid in session_ids:
        _redis.delete(f"conv_history:{sid}")

    logger.info("Account deleted for user_id=%d", user_id)

    response.delete_cookie(key=_COOKIE_NAME, path="/")
    return {"message": "Account and all associated data deleted"}
