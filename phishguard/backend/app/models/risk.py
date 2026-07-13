from sqlalchemy import Column, Integer, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class RiskScore(Base):
    __tablename__ = "risk_scores"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    score = Column(Float, nullable=False)
    computed_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User")

class UserMetrics(Base):
    __tablename__ = "user_metrics"

    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    click_rate = Column(Float, nullable=False, default=0.0)
    report_rate = Column(Float, nullable=False, default=0.0)
    open_rate = Column(Float, nullable=False, default=0.0)
    avg_time_to_click = Column(Float, nullable=False, default=0.0)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User")

RISK_LEVELS = {
    "excellent": {"name": "Excellent", "min": 90.0, "max": 100.0, "color": "green"},
    "good": {"name": "Good", "min": 70.0, "max": 89.0, "color": "blue"},
    "needs-improvement": {"name": "Needs Improvement", "min": 50.0, "max": 69.0, "color": "orange"},
    "critical": {"name": "Critical", "min": 0.0, "max": 49.0, "color": "red"}
}

def get_risk_level(score: float) -> str:
    if score >= 90.0:
        return "excellent"
    elif score >= 70.0:
        return "good"
    elif score >= 50.0:
        return "needs-improvement"
    else:
        return "critical"

