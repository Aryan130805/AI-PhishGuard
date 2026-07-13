import enum
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Enum, JSON, Index
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class CampaignStatus(str, enum.Enum):
    draft = "draft"
    scheduled = "scheduled"
    running = "running"
    paused = "paused"
    completed = "completed"
    cancelled = "cancelled"

class EmailEventType(str, enum.Enum):
    sent = "sent"
    delivered = "delivered"
    opened = "opened"
    clicked = "clicked"
    attachment_downloaded = "attachment_downloaded"
    credentials_submitted = "credentials_submitted"
    reported = "reported"
    ignored = "ignored"

# Cross-platform JSON type using postgres JSONB as variant
JSON_TYPE = JSON().with_variant(JSONB, "postgresql")

class Campaign(Base):
    __tablename__ = "campaigns"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    theme = Column(String, nullable=False)
    difficulty = Column(String, nullable=False)
    language = Column(String, nullable=False)
    department_id = Column(Integer, ForeignKey("departments.id", ondelete="SET NULL"), nullable=True)
    status = Column(Enum(CampaignStatus, name="campaign_status"), nullable=False, default=CampaignStatus.draft)
    scheduled_at = Column(DateTime(timezone=True), nullable=True)
    created_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    organization = relationship("Organization")
    department = relationship("Department")
    creator = relationship("User")
    templates = relationship("EmailTemplate", back_populates="campaign", cascade="all, delete-orphan")

class EmailTemplate(Base):
    __tablename__ = "email_templates"

    id = Column(Integer, primary_key=True, index=True)
    campaign_id = Column(Integer, ForeignKey("campaigns.id", ondelete="CASCADE"), nullable=True)
    subject = Column(String, nullable=False)
    sender_name = Column(String, nullable=False)
    sender_email = Column(String, nullable=False)
    body_html = Column(String, nullable=False)
    cta_text = Column(String, nullable=False)
    fake_url = Column(String, nullable=False)
    ai_generated = Column(Boolean, default=False)
    approved = Column(Boolean, default=False)

    campaign = relationship("Campaign", back_populates="templates")

class CampaignTarget(Base):
    __tablename__ = "campaign_targets"

    id = Column(Integer, primary_key=True, index=True)
    campaign_id = Column(Integer, ForeignKey("campaigns.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    tracking_token = Column(String, unique=True, index=True, nullable=False)

    campaign = relationship("Campaign")
    user = relationship("User")

class EmailEvent(Base):
    __tablename__ = "email_events"

    id = Column(Integer, primary_key=True, index=True)
    campaign_id = Column(Integer, ForeignKey("campaigns.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    event_type = Column(Enum(EmailEventType, name="email_event_type"), nullable=False)
    occurred_at = Column(DateTime(timezone=True), server_default=func.now())
    event_metadata = Column(JSON_TYPE, name="metadata", nullable=True)

    campaign = relationship("Campaign")
    user = relationship("User")

# Add indexes on campaign_id, user_id, and occurred_at for performance
Index("ix_email_events_campaign_id", EmailEvent.campaign_id)
Index("ix_email_events_user_id", EmailEvent.user_id)
Index("ix_email_events_occurred_at", EmailEvent.occurred_at)
