from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)
    needs_advanced_training = Column(Boolean, default=False, nullable=False)
    suggested_next_difficulty = Column(String, default="easy", nullable=False)
    
    organization_id = Column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    department_id = Column(Integer, ForeignKey("departments.id", ondelete="SET NULL"), nullable=True)
    role_id = Column(Integer, ForeignKey("roles.id", ondelete="RESTRICT"), nullable=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    organization = relationship("Organization")
    department = relationship("Department")
    role = relationship("Role")
