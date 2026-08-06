from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class SecurityGroup(Base):
    __tablename__ = "security_groups"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    code = Column(String, nullable=False)
    tier = Column(String, nullable=False, default="Tier 4 (Standard)")
    tier_number = Column(Integer, default=4)
    description = Column(String, nullable=True)
    simulation_frequency = Column(String, default="Bi-weekly")
    simulation_type = Column(String, default="Spear Phishing & Link Verification")
    risk_score = Column(Integer, default=15)
    policies = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    organization = relationship("Organization")
    members = relationship("GroupMember", back_populates="group", cascade="all, delete-orphan")
    join_requests = relationship("GroupJoinRequest", back_populates="group", cascade="all, delete-orphan")


class GroupJoinRequest(Base):
    __tablename__ = "group_join_requests"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    group_id = Column(Integer, ForeignKey("security_groups.id", ondelete="CASCADE"), nullable=False)
    requested_at = Column(DateTime(timezone=True), server_default=func.now())
    status = Column(String, default="pending")  # 'pending', 'approved', 'rejected'

    organization = relationship("Organization")
    user = relationship("User")
    group = relationship("SecurityGroup", back_populates="join_requests")


class GroupMember(Base):
    __tablename__ = "group_members"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    group_id = Column(Integer, ForeignKey("security_groups.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    joined_at = Column(DateTime(timezone=True), server_default=func.now())

    organization = relationship("Organization")
    user = relationship("User")
    group = relationship("SecurityGroup", back_populates="members")
