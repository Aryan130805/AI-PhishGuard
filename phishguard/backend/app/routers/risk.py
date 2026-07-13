from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.rbac import require_role
from app.models.user import User
from app.models.risk import RiskScore, get_risk_level

router = APIRouter(prefix="/risk-scores", tags=["risk-scores"])

@router.get("/{user_id}/history")
def get_user_risk_history(
    user_id: int,
    current_user: User = Depends(require_role(["admin", "employee"])),
    db: Session = Depends(get_db)
):
    is_admin = current_user.role.name == "admin" if current_user.role else False
    if not is_admin and current_user.id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this risk history"
        )
        
    history = db.query(RiskScore).filter(RiskScore.user_id == user_id).order_by(RiskScore.computed_at.asc()).all()
    return [
        {
            "score": r.score,
            "computed_at": r.computed_at,
            "level": get_risk_level(r.score)
        }
        for r in history
    ]

@router.post("/mock-submit-quiz")
def mock_submit_quiz(
    quiz_id: int,
    score: int,
    passed: bool,
    current_user: User = Depends(require_role(["admin", "employee"])),
    db: Session = Depends(get_db)
):
    from app.models.learning import QuizAttempt, Quiz, Lesson
    from app.tasks.campaigns import recompute_user_risk_score
    
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        lesson = Lesson(topic="General Security", title="Phishing Basics", content="Mock Content")
        db.add(lesson)
        db.commit()
        db.refresh(lesson)
        
        quiz = Quiz(id=quiz_id, lesson_id=lesson.id, questions=[])
        db.add(quiz)
        db.commit()
        db.refresh(quiz)
        
    attempt = QuizAttempt(
        quiz_id=quiz_id,
        user_id=current_user.id,
        score=score,
        passed=passed
    )
    db.add(attempt)
    db.commit()
    db.refresh(attempt)
    
    # Trigger recalculation inline for instant feedback in API responses
    new_score = recompute_user_risk_score(current_user.id)
    
    return {
        "message": "Quiz attempt submitted and risk recomputed",
        "attempt_id": attempt.id,
        "score": score,
        "passed": passed,
        "new_risk_score": new_score
    }
