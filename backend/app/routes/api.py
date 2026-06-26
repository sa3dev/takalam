import logging
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List
from app.models.database import (
    get_db,
    SessionLocal,
    Session as DBSession,
    SessionAnalytics,
    Transcription,
    User,
)
from app.schemas.session import (
    SessionCreate,
    SessionResponse,
    AnalyticsResponse,
    TranscriptionResponse,
)
from app.services.shadow_feedback import ShadowFeedbackAnalyzer
from app.core.auth_deps import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["api"])


@router.post("/sessions", response_model=SessionResponse)
def create_session(
    session_data: SessionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db_session = DBSession(user_id=current_user.id)
    db.add(db_session)
    db.commit()
    db.refresh(db_session)
    return db_session


@router.get("/sessions/{session_id}", response_model=SessionResponse)
def get_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session = db.query(DBSession).filter(
        DBSession.id == session_id,
        DBSession.user_id == current_user.id,
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


@router.get("/users/me/sessions", response_model=List[SessionResponse])
def get_my_sessions(
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(DBSession)
        .filter(DBSession.user_id == current_user.id)
        .order_by(DBSession.started_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


@router.get("/sessions/{session_id}/transcriptions", response_model=List[TranscriptionResponse])
def get_session_transcriptions(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session = db.query(DBSession).filter(
        DBSession.id == session_id,
        DBSession.user_id == current_user.id,
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return (
        db.query(Transcription)
        .filter(Transcription.session_id == session_id)
        .order_by(Transcription.created_at.asc())
        .all()
    )


@router.get("/sessions/{session_id}/analytics", response_model=AnalyticsResponse)
def get_session_analytics(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session = db.query(DBSession).filter(
        DBSession.id == session_id,
        DBSession.user_id == current_user.id,
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    analytics = (
        db.query(SessionAnalytics)
        .filter(SessionAnalytics.session_id == session_id)
        .first()
    )
    if not analytics:
        raise HTTPException(status_code=404, detail="Analytics not found")
    return analytics


@router.post("/sessions/{session_id}/analyze")
async def trigger_session_analysis(
    session_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session = db.query(DBSession).filter(
        DBSession.id == session_id,
        DBSession.user_id == current_user.id,
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    background_tasks.add_task(analyze_session_background, session_id)
    return {"message": "Analysis started", "session_id": session_id}


async def analyze_session_background(session_id: int):
    db = SessionLocal()
    try:
        transcriptions = (
            db.query(Transcription)
            .filter(Transcription.session_id == session_id)
            .order_by(Transcription.created_at.asc())
            .all()
        )
        if not transcriptions:
            logger.warning("No transcriptions found for session %s", session_id)
            return

        transcription_data = [{"speaker": t.speaker, "text": t.text} for t in transcriptions]

        analyzer = ShadowFeedbackAnalyzer()
        feedback = await analyzer.analyze_session(transcription_data)
        metrics = analyzer.calculate_additional_metrics(transcription_data)

        analytics = (
            db.query(SessionAnalytics)
            .filter(SessionAnalytics.session_id == session_id)
            .first()
        )
        if analytics:
            analytics.grammar_corrections = [c.model_dump() for c in feedback.grammar_corrections]
            analytics.vocabulary_new = feedback.vocabulary_new
            analytics.fluency_score = feedback.fluency_score
            analytics.confidence_level = feedback.confidence_level
            analytics.total_words_spoken = metrics["total_words_spoken"]
            analytics.average_response_time = metrics["average_response_time"]
        else:
            analytics = SessionAnalytics(
                session_id=session_id,
                grammar_corrections=[c.model_dump() for c in feedback.grammar_corrections],
                vocabulary_new=feedback.vocabulary_new,
                fluency_score=feedback.fluency_score,
                confidence_level=feedback.confidence_level,
                total_words_spoken=metrics["total_words_spoken"],
                average_response_time=metrics["average_response_time"],
            )
            db.add(analytics)

        db.commit()
        logger.info("Analysis completed for session %s", session_id)

    except Exception as e:
        logger.error("Error analyzing session %s: %s", session_id, e)
        db.rollback()
    finally:
        db.close()


@router.post("/ws-ticket")
def issue_ws_ticket(current_user: User = Depends(get_current_user)):
    """Exchange a valid auth session for a short-lived (60s) one-time WebSocket ticket."""
    from app.core.security import create_ws_ticket
    return {"ticket": create_ws_ticket(current_user.id)}


@router.get("/health")
def health_check():
    return {"status": "healthy", "service": "Takalam API"}
