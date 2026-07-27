from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

# Cross-platform JSON type supporting JSONB on Postgres
JSON_TYPE = JSON().with_variant(JSONB, "postgresql")

class Lesson(Base):
    __tablename__ = "lessons"

    id = Column(Integer, primary_key=True, index=True)
    topic = Column(String, nullable=False)
    title = Column(String, nullable=False)
    content = Column(String, nullable=False)
    ai_generated = Column(Boolean, default=False)
    category = Column(String, default="Phishing Attacks")
    difficulty = Column(String, default="Beginner")
    summary = Column(String, nullable=True)
    is_emerging_threat = Column(Boolean, default=False)
    cve_id = Column(String, nullable=True)
    published_date = Column(String, nullable=True)

    quizzes = relationship("Quiz", back_populates="lesson", cascade="all, delete-orphan")

class Quiz(Base):
    __tablename__ = "quizzes"

    id = Column(Integer, primary_key=True, index=True)
    lesson_id = Column(Integer, ForeignKey("lessons.id", ondelete="CASCADE"), nullable=False)
    questions = Column(JSON_TYPE, nullable=False)

    lesson = relationship("Lesson", back_populates="quizzes")

class QuizAttempt(Base):
    __tablename__ = "quiz_attempts"

    id = Column(Integer, primary_key=True, index=True)
    quiz_id = Column(Integer, ForeignKey("quizzes.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    score = Column(Integer, nullable=False)
    passed = Column(Boolean, nullable=False)
    attempted_at = Column(DateTime(timezone=True), server_default=func.now())

    quiz = relationship("Quiz")
    user = relationship("User")

class Certificate(Base):
    __tablename__ = "certificates"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    lesson_id = Column(Integer, ForeignKey("lessons.id", ondelete="CASCADE"), nullable=False)
    issued_at = Column(DateTime(timezone=True), server_default=func.now())
    pdf_path = Column(String, nullable=False)

    user = relationship("User")
    lesson = relationship("Lesson")

class LessonAssignment(Base):
    __tablename__ = "lesson_assignments"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    lesson_id = Column(Integer, ForeignKey("lessons.id", ondelete="CASCADE"), nullable=False)
    assigned_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)

    user = relationship("User")
    lesson = relationship("Lesson")

