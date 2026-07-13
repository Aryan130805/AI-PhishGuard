from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

# Cross-platform JSON type
JSON_TYPE = JSON().with_variant(JSONB, "postgresql")


class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)

    # Report identity
    type = Column(String, nullable=False, default="executive_summary")
    generated_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    generated_at = Column(DateTime(timezone=True), server_default=func.now())

    # Async job tracking
    job_id = Column(String, unique=True, index=True, nullable=True)
    status = Column(String, nullable=False, default="pending")   # pending|running|completed|failed
    error_message = Column(String, nullable=True)

    # Filter parameters used during generation
    date_from = Column(DateTime(timezone=True), nullable=True)
    date_to = Column(DateTime(timezone=True), nullable=True)
    department_id = Column(Integer, ForeignKey("departments.id", ondelete="SET NULL"), nullable=True)

    # Requested + produced formats
    formats = Column(JSON_TYPE, nullable=True)       # e.g. ["pdf", "excel", "csv"]
    file_paths = Column(JSON_TYPE, nullable=True)    # e.g. {"pdf": "/app/reports/1/report.pdf"}

    # Legacy single-file column kept for backward compat (nullable)
    file_path = Column(String, nullable=True)

    organization = relationship("Organization")
    creator = relationship("User", foreign_keys=[generated_by])
    department = relationship("Department", foreign_keys=[department_id])
