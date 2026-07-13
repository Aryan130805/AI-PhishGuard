import os
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from typing import Optional, List
from pydantic import BaseModel

from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER

from app.database import get_db
from app.rbac import require_role
from app.models.user import User
from app.models.learning import Lesson, Quiz, QuizAttempt, LessonAssignment, Certificate
from app.tasks.campaigns import recompute_user_risk_score

router = APIRouter(prefix="/training", tags=["training"])
cert_router = APIRouter(tags=["certificates"])

class QuizSubmissionPayload(BaseModel):
    answers: Optional[List[int]] = None

def generate_certificate_pdf(user_name: str, lesson_title: str, dest_path: str):
    os.makedirs(os.path.dirname(dest_path), exist_ok=True)
    
    # Create the document with landscape letter size
    doc = SimpleDocTemplate(
        dest_path,
        pagesize=(letter[1], letter[0]), # Landscape
        rightMargin=40,
        leftMargin=40,
        topMargin=40,
        bottomMargin=40
    )
    
    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle(
        'CertTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=36,
        leading=42,
        textColor=colors.HexColor('#1E3A8A'), # Dark Blue
        alignment=TA_CENTER
    )
    
    subtitle_style = ParagraphStyle(
        'CertSub',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=18,
        leading=22,
        textColor=colors.HexColor('#4B5563'),
        alignment=TA_CENTER
    )
    
    name_style = ParagraphStyle(
        'CertName',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=28,
        leading=34,
        textColor=colors.HexColor('#059669'), # Emerald Green
        alignment=TA_CENTER
    )
    
    course_style = ParagraphStyle(
        'CertCourse',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=20,
        leading=26,
        textColor=colors.HexColor('#1F2937'),
        alignment=TA_CENTER
    )
    
    footer_style = ParagraphStyle(
        'CertFooter',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=12,
        leading=16,
        textColor=colors.HexColor('#9CA3AF'),
        alignment=TA_CENTER
    )
    
    story = [
        Spacer(1, 45),
        Paragraph("CERTIFICATE OF COMPLETION", title_style),
        Spacer(1, 20),
        Paragraph("This is proudly presented to", subtitle_style),
        Spacer(1, 20),
        Paragraph(user_name, name_style),
        Spacer(1, 20),
        Paragraph("for successfully completing the security awareness training course:", subtitle_style),
        Spacer(1, 15),
        Paragraph(f"<b>{lesson_title}</b>", course_style),
        Spacer(1, 45),
        Paragraph("PhishGuard Security Awareness Training Platform", footer_style),
        Paragraph(f"Issued on: {datetime.now(timezone.utc).strftime('%Y-%m-%d')}", footer_style)
    ]
    
    doc.build(story)

@router.get("/assignments")
def get_assignments(
    current_user: User = Depends(require_role(["admin", "employee"])),
    db: Session = Depends(get_db)
):
    assignments = db.query(LessonAssignment).filter(LessonAssignment.user_id == current_user.id).all()
    results = []
    for assoc in assignments:
        lesson = assoc.lesson
        quiz = db.query(Quiz).filter(Quiz.lesson_id == lesson.id).first()
        
        results.append({
            "id": assoc.id,
            "lesson_id": assoc.lesson_id,
            "assigned_at": assoc.assigned_at,
            "completed_at": assoc.completed_at,
            "lesson": {
                "id": lesson.id,
                "topic": lesson.topic,
                "title": lesson.title,
                "content": lesson.content,
                "quiz": {
                    "id": quiz.id if quiz else None,
                    "questions": quiz.questions if quiz else []
                }
            }
        })
    return results

@router.get("/lessons")
def get_lessons(
    current_user: User = Depends(require_role(["admin", "employee"])),
    db: Session = Depends(get_db)
):
    assignments = db.query(LessonAssignment).filter(LessonAssignment.user_id == current_user.id).all()
    results = []
    for assoc in assignments:
        lesson = assoc.lesson
        results.append({
            "id": lesson.id,
            "topic": lesson.topic,
            "title": lesson.title,
            "assigned_at": assoc.assigned_at,
            "completed_at": assoc.completed_at,
            "completed": assoc.completed_at is not None
        })
    return results

@router.get("/lessons/{id}")
def get_lesson(
    id: int,
    current_user: User = Depends(require_role(["admin", "employee"])),
    db: Session = Depends(get_db)
):
    assignment = db.query(LessonAssignment).filter(
        LessonAssignment.lesson_id == id,
        LessonAssignment.user_id == current_user.id
    ).first()
    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lesson assignment not found"
        )
        
    lesson = assignment.lesson
    quiz = db.query(Quiz).filter(Quiz.lesson_id == lesson.id).first()
    
    stripped_questions = []
    if quiz and quiz.questions:
        for q in quiz.questions:
            stripped_questions.append({
                "question": q.get("question"),
                "options": q.get("options", [])
            })
            
    return {
        "id": lesson.id,
        "topic": lesson.topic,
        "title": lesson.title,
        "content": lesson.content,
        "completed_at": assignment.completed_at,
        "completed": assignment.completed_at is not None,
        "quiz": {
            "id": quiz.id if quiz else None,
            "questions": stripped_questions
        }
    }

@router.get("/quiz/{id}")
def get_quiz(
    id: int,
    current_user: User = Depends(require_role(["admin", "employee"])),
    db: Session = Depends(get_db)
):
    quiz = db.query(Quiz).filter(Quiz.id == id).first()
    if not quiz:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quiz not found"
        )
        
    assignment = db.query(LessonAssignment).filter(
        LessonAssignment.lesson_id == quiz.lesson_id,
        LessonAssignment.user_id == current_user.id
    ).first()
    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Lesson is not assigned to you"
        )
        
    stripped_questions = []
    if quiz.questions:
        for q in quiz.questions:
            stripped_questions.append({
                "question": q.get("question"),
                "options": q.get("options", [])
            })
            
    return {
        "id": quiz.id,
        "lesson_id": quiz.lesson_id,
        "lesson_title": quiz.lesson.title if quiz.lesson else "Training Module",
        "questions": stripped_questions
    }

@router.post("/quiz/{id}/submit")
def submit_quiz(
    id: int,
    payload: QuizSubmissionPayload,
    current_user: User = Depends(require_role(["admin", "employee"])),
    db: Session = Depends(get_db)
):
    current_user = db.merge(current_user, load=False)
    quiz = db.query(Quiz).filter(Quiz.id == id).first()
    if not quiz:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quiz not found"
        )
        
    lesson_id = quiz.lesson_id
    assignment = db.query(LessonAssignment).filter(
        LessonAssignment.lesson_id == lesson_id,
        LessonAssignment.user_id == current_user.id
    ).first()
    
    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Lesson not assigned to this user"
        )
        
    if payload.answers is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Answers are required"
        )
        
    correct_count = 0
    total_questions = len(quiz.questions)
    
    if total_questions > 0:
        for idx, q in enumerate(quiz.questions):
            correct_idx = q.get("correct_index", 0)
            user_ans = payload.answers[idx] if idx < len(payload.answers) else -1
            if user_ans == correct_idx:
                correct_count += 1
        score = int((correct_count / total_questions) * 100)
        passed = score >= 70
    else:
        score = 100
        passed = True
        
    attempt = QuizAttempt(
        quiz_id=quiz.id,
        user_id=current_user.id,
        score=score,
        passed=passed
    )
    db.add(attempt)
    
    if passed:
        assignment.completed_at = datetime.now(timezone.utc)
        
        # Promote user suggested difficulty tier
        tiers = ["easy", "medium", "hard", "expert"]
        current_diff = current_user.suggested_next_difficulty or "easy"
        if current_diff in tiers:
            idx = tiers.index(current_diff)
            if idx < len(tiers) - 1:
                current_user.suggested_next_difficulty = tiers[idx + 1]
            else:
                current_user.suggested_next_difficulty = "expert"
        else:
            current_user.suggested_next_difficulty = "medium"
            
        # PDF Generation
        pdf_dir = "certificates"
        os.makedirs(pdf_dir, exist_ok=True)
        today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        pdf_filename = f"{today_str}_{current_user.id}_{lesson_id}.pdf"
        pdf_path = os.path.join(pdf_dir, pdf_filename)
        
        user_name = current_user.email.split('@')[0].capitalize()
        generate_certificate_pdf(user_name, assignment.lesson.title, pdf_path)
        
        existing_cert = db.query(Certificate).filter(
            Certificate.user_id == current_user.id,
            Certificate.lesson_id == lesson_id
        ).first()
        if not existing_cert:
            cert = Certificate(
                user_id=current_user.id,
                lesson_id=lesson_id,
                pdf_path=pdf_path
            )
            db.add(cert)
            
            try:
                from app.services.notification_service import create_notification
                create_notification(
                    db=db,
                    user_id=current_user.id,
                    notif_type="certificate_issued",
                    payload={
                        "message": f"Congratulations! You have completed the quiz and been issued a certificate for '{assignment.lesson.title}'.",
                        "link": "/employee/certificates"
                    }
                )
            except Exception as notif_err:
                print(f"Failed to create certificate_issued notification: {str(notif_err)}")
            
    db.commit()
    
    # Synchronously update risk score
    recompute_user_risk_score(current_user.id)
    
    return {
        "score": score,
        "passed": passed,
        "suggested_next_difficulty": current_user.suggested_next_difficulty
    }

@router.post("/lessons/{id}/complete")
def complete_lesson(
    id: int,
    payload: QuizSubmissionPayload,
    current_user: User = Depends(require_role(["admin", "employee"])),
    db: Session = Depends(get_db)
):
    # Backward compatible complete route matching Phase 11
    current_user = db.merge(current_user, load=False)
    assignment = db.query(LessonAssignment).filter(
        LessonAssignment.lesson_id == id,
        LessonAssignment.user_id == current_user.id
    ).first()
    
    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lesson assignment not found for this user"
        )
        
    assignment.completed_at = datetime.now(timezone.utc)
    
    quiz = db.query(Quiz).filter(Quiz.lesson_id == id).first()
    score = 100
    passed = True
    
    if quiz and payload.answers is not None:
        correct_count = 0
        total_questions = len(quiz.questions)
        
        if total_questions > 0:
            for idx, q in enumerate(quiz.questions):
                correct_idx = q.get("correct_index", 0)
                user_ans = payload.answers[idx] if idx < len(payload.answers) else -1
                if user_ans == correct_idx:
                    correct_count += 1
            score = int((correct_count / total_questions) * 100)
            passed = score >= 70
            
        attempt = QuizAttempt(
            quiz_id=quiz.id,
            user_id=current_user.id,
            score=score,
            passed=passed
        )
        db.add(attempt)
        
        tiers = ["easy", "medium", "hard", "expert"]
        current_diff = current_user.suggested_next_difficulty or "easy"
        
        if passed:
            if current_diff in tiers:
                idx = tiers.index(current_diff)
                if idx < len(tiers) - 1:
                    current_user.suggested_next_difficulty = tiers[idx + 1]
                else:
                    current_user.suggested_next_difficulty = "expert"
            else:
                current_user.suggested_next_difficulty = "medium"
                
    if passed:
        # PDF Generation for certificates
        pdf_dir = "certificates"
        os.makedirs(pdf_dir, exist_ok=True)
        today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        pdf_filename = f"{today_str}_{current_user.id}_{id}.pdf"
        pdf_path = os.path.join(pdf_dir, pdf_filename)
        
        user_name = current_user.email.split('@')[0].capitalize()
        generate_certificate_pdf(user_name, assignment.lesson.title, pdf_path)
        
        existing_cert = db.query(Certificate).filter(
            Certificate.user_id == current_user.id,
            Certificate.lesson_id == id
        ).first()
        if not existing_cert:
            cert = Certificate(
                user_id=current_user.id,
                lesson_id=id,
                pdf_path=pdf_path
            )
            db.add(cert)
            
    db.commit()
    
    recompute_user_risk_score(current_user.id)
    
    return {
        "message": "Lesson completed and quiz processed",
        "score": score,
        "passed": passed,
        "suggested_next_difficulty": current_user.suggested_next_difficulty
    }

@router.get("/leaderboard")
def get_leaderboard(
    department_id: Optional[int] = None,
    current_user: User = Depends(require_role(["admin", "employee"])),
    db: Session = Depends(get_db)
):
    from app.models.risk import UserMetrics
    
    users_query = db.query(User).join(User.role).filter(User.role.has(name="employee"))
    if department_id:
        users_query = users_query.filter(User.department_id == department_id)
        
    users = users_query.all()
    leaderboard = []
    
    for u in users:
        metrics = db.query(UserMetrics).filter(UserMetrics.user_id == u.id).first()
        report_rate = metrics.report_rate if metrics else 0.0
        
        total_assigned = db.query(LessonAssignment).filter(LessonAssignment.user_id == u.id).count()
        completed_lessons = db.query(LessonAssignment).filter(
            LessonAssignment.user_id == u.id,
            LessonAssignment.completed_at != None
        ).count()
        
        quiz_pass_rate = completed_lessons / total_assigned if total_assigned > 0 else 0.0
        composite_score = round((quiz_pass_rate * 0.5 + report_rate * 0.5) * 100, 1)
        
        dept_name = u.department.name if u.department else "General"
        name = u.email.split('@')[0].capitalize()
        
        leaderboard.append({
            "name": name,
            "department": dept_name,
            "composite_score": composite_score
        })
        
    leaderboard.sort(key=lambda x: x["composite_score"], reverse=True)
    return leaderboard

@cert_router.get("/certificates")
def list_certificates(
    current_user: User = Depends(require_role(["admin", "employee"])),
    db: Session = Depends(get_db)
):
    """List all certificates for the current user."""
    certs = db.query(Certificate).filter(Certificate.user_id == current_user.id).order_by(Certificate.issued_at.desc()).all()
    return [
        {
            "id": c.id,
            "lesson_id": c.lesson_id,
            "lesson_title": c.lesson.title if c.lesson else "Security Training Module",
            "issued_at": c.issued_at.isoformat(),
            "pdf_path": c.pdf_path
        }
        for c in certs
    ]

@cert_router.get("/certificates/{id}/download")
def download_certificate(
    id: int,
    current_user: User = Depends(require_role(["admin", "employee"])),
    db: Session = Depends(get_db)
):
    cert = db.query(Certificate).filter(Certificate.id == id).first()
    if not cert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Certificate not found"
        )
        
    is_admin = current_user.role.name == "admin" if current_user.role else False
    if not is_admin and cert.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Cannot access other users' certificates"
        )
        
    if not os.path.exists(cert.pdf_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Certificate file not found on disk"
        )
        
    filename = os.path.basename(cert.pdf_path)
    return FileResponse(
        path=cert.pdf_path,
        filename=filename,
        media_type="application/pdf"
    )
