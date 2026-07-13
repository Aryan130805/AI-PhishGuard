from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

# Cross-platform JSON type supporting JSONB on Postgres
JSON_TYPE = JSON().with_variant(JSONB, "postgresql")

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    type = Column(String, nullable=False)
    payload = Column(JSON_TYPE, nullable=False)
    read = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User")
