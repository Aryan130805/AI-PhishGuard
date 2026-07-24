from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    organization_name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

class RefreshRequest(BaseModel):
    refresh_token: str

class TokenRefreshResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

class UserProfile(BaseModel):
    id: int
    email: str
    is_active: bool
    is_admin: bool
    organization_name: Optional[str] = None
    department_name: Optional[str] = None
    role_name: Optional[str] = None

    class Config:
        from_attributes = True

class UserProfileUpdate(BaseModel):
    email: Optional[EmailStr] = None
    password: Optional[str] = None

class EmailGenerateRequest(BaseModel):
    department_id: Optional[int] = None
    difficulty: str
    theme: str
    language: str
    tone: str

class EmailTemplateUpdate(BaseModel):
    subject: Optional[str] = None
    sender_name: Optional[str] = None
    sender_email: Optional[str] = None
    body_html: Optional[str] = None
    cta_text: Optional[str] = None
    fake_url: Optional[str] = None

class CampaignCreate(BaseModel):
    name: str
    theme: str
    difficulty: str
    language: str
    department_id: Optional[int] = None
    template_ids: list[int]
    org_id: Optional[int] = None
    status: Optional[str] = "draft"

class CampaignUpdate(BaseModel):
    name: Optional[str] = None
    theme: Optional[str] = None
    difficulty: Optional[str] = None
    language: Optional[str] = None
    department_id: Optional[int] = None
    template_ids: Optional[list[int]] = None

class CampaignSchedule(BaseModel):
    scheduled_at: datetime


class OrganizationPublic(BaseModel):
    id: int
    name: str
    logo_url: Optional[str] = None
    industry: Optional[str] = None
    is_verified: bool = True

    class Config:
        from_attributes = True

class EmployeeRegister(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: EmailStr
    password: str
    organization_id: int

class OrganizationRegister(BaseModel):
    name: str
    email: EmailStr
    password: str
    industry: Optional[str] = None
    company_size: Optional[str] = None
    website: Optional[str] = None
    country: Optional[str] = None
    state: Optional[str] = None
    city: Optional[str] = None
    logo_url: Optional[str] = None

