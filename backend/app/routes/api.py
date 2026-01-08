from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List
from app.models.database import (
    get_db,
    Session as DBSession,
    SessionAnalytics,
    Transcription,
    User
)
from app.schemas.session import (
    SessionCreate,
    SessionResponse,
    AnalyticsResponse,
    TranscriptionResponse
)
from app.services.shadow_feedback import ShadowFeedbackAnalyzer

router = APIRouter(prefix="/api", tags=["api"])


# Session Endpoints
@router.post("/sessions", response_model=SessionResponse)
def create_session(
    session_data: SessionCreate,
    db: Session = Depends(get_db)
):
    """Create a new conversation session."""
    db_session = DBSession(user_id=session_data.user_id)
    db.add(db_session)
    db.commit()
    db.refresh(db_session)
    return db_session


@router.get("/sessions/{session_id}", response_model=SessionResponse)
def get_session(session_id: int, db: Session = Depends(get_db)):
    """Get session details by ID."""
    session = db.query(DBSession).filter(DBSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


@router.get("/users/{user_id}/sessions", response_model=List[SessionResponse])
def get_user_sessions(
    user_id: int,
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db)
):
    """Get all sessions for a user."""
    sessions = (
        db.query(DBSession)
        .filter(DBSession.user_id == user_id)
        .order_by(DBSession.started_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return sessions


# Transcription Endpoints
@router.get("/sessions/{session_id}/transcriptions", response_model=List[TranscriptionResponse])
def get_session_transcriptions(
    session_id: int,
    db: Session = Depends(get_db)
):
    """Get all transcriptions for a session."""
    transcriptions = (
        db.query(Transcription)
        .filter(Transcription.session_id == session_id)
        .order_by(Transcription.created_at.asc())
        .all()
    )
    return transcriptions


# Analytics Endpoints
@router.get("/sessions/{session_id}/analytics", response_model=AnalyticsResponse)
def get_session_analytics(
    session_id: int,
    db: Session = Depends(get_db)
):
    """Get analytics for a specific session."""
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
    db: Session = Depends(get_db)
):
    """
    Trigger Shadow Feedback analysis for a session.
    Runs asynchronously in the background.
    """
    # Verify session exists
    session = db.query(DBSession).filter(DBSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Add analysis task to background
    background_tasks.add_task(analyze_session_background, session_id)

    return {
        "message": "Analysis started",
        "session_id": session_id
    }


async def analyze_session_background(session_id: int):
    """Background task to analyze session and save results."""
    db = Session()

    try:
        # Get transcriptions
        transcriptions = (
            db.query(Transcription)
            .filter(Transcription.session_id == session_id)
            .order_by(Transcription.created_at.asc())
            .all()
        )

        if not transcriptions:
            print(f"No transcriptions found for session {session_id}")
            return

        # Format transcriptions for analysis
        transcription_data = [
            {"speaker": t.speaker, "text": t.text}
            for t in transcriptions
        ]

        # Run analysis
        analyzer = ShadowFeedbackAnalyzer()
        feedback = await analyzer.analyze_session(transcription_data)
        metrics = analyzer.calculate_additional_metrics(transcription_data)

        # Check if analytics already exist
        analytics = (
            db.query(SessionAnalytics)
            .filter(SessionAnalytics.session_id == session_id)
            .first()
        )

        if analytics:
            # Update existing
            analytics.grammar_corrections = [
                correction.dict() for correction in feedback.grammar_corrections
            ]
            analytics.vocabulary_new = feedback.vocabulary_new
            analytics.fluency_score = feedback.fluency_score
            analytics.confidence_level = feedback.confidence_level
            analytics.total_words_spoken = metrics["total_words_spoken"]
            analytics.average_response_time = metrics["average_response_time"]
        else:
            # Create new
            analytics = SessionAnalytics(
                session_id=session_id,
                grammar_corrections=[
                    correction.dict() for correction in feedback.grammar_corrections
                ],
                vocabulary_new=feedback.vocabulary_new,
                fluency_score=feedback.fluency_score,
                confidence_level=feedback.confidence_level,
                total_words_spoken=metrics["total_words_spoken"],
                average_response_time=metrics["average_response_time"]
            )
            db.add(analytics)

        db.commit()
        print(f"Analysis completed for session {session_id}")

    except Exception as e:
        print(f"Error analyzing session {session_id}: {e}")
        db.rollback()

    finally:
        db.close()


# Health Check
@router.get("/health")
def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "Takalam API"}
