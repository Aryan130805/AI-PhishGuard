from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.sql import func
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

from app.database import get_db
from app.rbac import get_current_user
from app.models.user import User
from app.models.organization import Organization
from app.models.risk import RiskScore
from app.models.group import SecurityGroup, GroupJoinRequest, GroupMember

router = APIRouter(prefix="/groups", tags=["groups"])
training_router = APIRouter(prefix="/training/groups", tags=["groups"])


# Pydantic Schemas
class GroupCreate(BaseModel):
    name: str
    code: Optional[str] = None
    tier: str = "Tier 4 (Standard)"
    description: str
    simulationFrequency: str = "Bi-weekly"
    simulationType: str = "Spear Phishing & Link Verification"

class DirectAddMember(BaseModel):
    name: str
    email: str
    department: Optional[str] = "Engineering"
    role: Optional[str] = "Security Specialist"

class PolicyUpdate(BaseModel):
    policies: List[str]


def seed_default_groups_for_org(db: Session, org_id: int):
    """Seed standard initial security groups if none exist for an organization."""
    existing_count = db.query(SecurityGroup).filter(SecurityGroup.organization_id == org_id).count()
    if existing_count > 0:
        return

    defaults = [
        {
            "name": "Executive & C-Suite HVT",
            "code": "EXEC-HVT",
            "tier": "Tier 1 (Critical HVT)",
            "tier_number": 1,
            "description": "High-Value Executive Targets with administrative wire transfer authority and board communications.",
            "simulation_frequency": "Weekly",
            "simulation_type": "Quishing, Deepfake Voice & Executive Whaling",
            "risk_score": 24,
            "policies": [
                "Hardware FIDO2 / WebAuthn Only",
                "Mandatory Verbal Passphrase Check for Wires",
                "Weekly Quishing & Deepfake Drills",
                "Out-of-band Email Signature Verification"
            ]
        },
        {
            "name": "IT Systems & DevOps Security Tier",
            "code": "SYS-ADMIN",
            "tier": "Tier 1 (Critical HVT)",
            "tier_number": 1,
            "description": "Privileged IT system administrators, Cloud Infrastructure Leads, and DevOps engineers with root production access.",
            "simulation_frequency": "Weekly",
            "simulation_type": "Spear Phishing, Supply Chain Malware & Token Theft",
            "risk_score": 14,
            "policies": [
                "YubiKey FIDO2 Enforcement",
                "Short-lived AWS IAM Session Tokens",
                "Zero-Trust IP Whitelisting",
                "Weekly Infostealer Malware Drills"
            ]
        },
        {
            "name": "HR & Payroll Data Protection",
            "code": "HR-PAYROLL",
            "tier": "Tier 2 (Sensitive Data)",
            "tier_number": 2,
            "description": "Human Resources and Payroll specialists managing PII, employee bank routing, and tax documents.",
            "simulation_frequency": "Bi-weekly",
            "simulation_type": "Direct Deposit Fraud & Resume Payload Scams",
            "risk_score": 18,
            "policies": [
                "Number-Matching Push MFA",
                "Direct Deposit Out-of-band Phone Verify",
                "Attachment Sandbox Inspection",
                "Bi-weekly Spear Phishing Drills"
            ]
        },
        {
            "name": "Sales & Customer Inbound Tier",
            "code": "SALES-FRONT",
            "tier": "Tier 3 (Inbound Facing)",
            "tier_number": 3,
            "description": "High-volume external email communications handling unverified prospective customer attachments and links.",
            "simulation_frequency": "Bi-weekly",
            "simulation_type": "Deceptive RFP Links & Fake Invoice QR Codes",
            "risk_score": 29,
            "policies": [
                "External Link Caution Banner",
                "Real-time URL Reputation Check",
                "Bi-weekly Phishing Scams",
                "One-click Report Phish Integration"
            ]
        },
        {
            "name": "Standard Baseline Staff & Contractors",
            "code": "STD-STAFF",
            "tier": "Tier 4 (Standard)",
            "tier_number": 4,
            "description": "General employees, temporary contractors, and office operations staff with standard corporate access.",
            "simulation_frequency": "Monthly",
            "simulation_type": "General Phishing & IT Support Impersonation",
            "risk_score": 15,
            "policies": [
                "Standard Authenticator App MFA",
                "Monthly Awareness Refreshers",
                "Quarterly Compliance Checkups",
                "Standard Password Vault Usage"
            ]
        }
    ]

    for item in defaults:
        grp = SecurityGroup(
            organization_id=org_id,
            name=item["name"],
            code=item["code"],
            tier=item["tier"],
            tier_number=item["tier_number"],
            description=item["description"],
            simulation_frequency=item["simulation_frequency"],
            simulation_type=item["simulation_type"],
            risk_score=item["risk_score"],
            policies=item["policies"]
        )
        db.add(grp)
    db.commit()


def build_group_dict(group: SecurityGroup, db: Session):
    """Formats a SecurityGroup model to match frontend contract."""
    # Get group members
    member_rows = db.query(GroupMember).filter(GroupMember.group_id == group.id).all()
    members_list = []
    departments_set = set()

    for m in member_rows:
        user = db.query(User).filter(User.id == m.user_id).first()
        if user:
            u_name = f"{user.first_name or ''} {user.last_name or ''}".strip() or user.email.split('@')[0]
            dept_name = user.department.name if user.department else "Engineering"
            role_name = user.role.name if user.role else ("Administrator" if user.is_admin else "Employee")
            departments_set.add(dept_name)

            # Get user risk score if available
            r_score_obj = db.query(RiskScore).filter(RiskScore.user_id == user.id).order_by(RiskScore.computed_at.desc()).first()
            user_risk = int(r_score_obj.score) if r_score_obj else 15

            members_list.append({
                "id": str(user.id),
                "name": u_name,
                "email": user.email,
                "department": dept_name,
                "role": role_name,
                "riskScore": user_risk
            })

    if not departments_set:
        departments_set = {"General Security"}

    return {
        "id": str(group.id),
        "name": group.name,
        "code": group.code,
        "tier": group.tier,
        "tierNumber": group.tier_number,
        "description": group.description or "",
        "simulationFrequency": group.simulation_frequency or "Bi-weekly",
        "simulationType": group.simulation_type or "Spear Phishing & Link Verification",
        "riskScore": group.risk_score or 15,
        "membersCount": len(members_list),
        "departments": list(departments_set),
        "policies": group.policies or [],
        "members": members_list
    }


# ── GET GROUPS ───────────────────────────────────────────────────────────────
@router.get("", response_model=List[dict])
@training_router.get("", response_model=List[dict])
def get_security_groups(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    org_id = current_user.organization_id
    if not org_id:
        raise HTTPException(status_code=400, detail="User does not belong to any organization")

    seed_default_groups_for_org(db, org_id)

    groups = db.query(SecurityGroup).filter(SecurityGroup.organization_id == org_id).all()
    return [build_group_dict(g, db) for g in groups]


# ── CREATE GROUP (ADMIN ONLY) ─────────────────────────────────────────────────
@router.post("", status_code=status.HTTP_201_CREATED)
@training_router.post("", status_code=status.HTTP_201_CREATED)
def create_security_group(payload: GroupCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Only organization admins can create security groups")

    org_id = current_user.organization_id
    tier_num = 1 if "1" in payload.tier else 2 if "2" in payload.tier else 3 if "3" in payload.tier else 4
    code = payload.code or (payload.name[:4].upper() + "-GRP")

    new_group = SecurityGroup(
        organization_id=org_id,
        name=payload.name,
        code=code,
        tier=payload.tier,
        tier_number=tier_num,
        description=payload.description,
        simulation_frequency=payload.simulationFrequency,
        simulation_type=payload.simulationType,
        risk_score=15,
        policies=[
            "Mandatory Multi-Factor Authentication",
            "Targeted Phishing Simulation Drills",
            "Real-time Security Telemetry"
        ]
    )
    db.add(new_group)
    db.commit()
    db.refresh(new_group)

    # Automatically add creating admin as first member
    member = GroupMember(
        organization_id=org_id,
        group_id=new_group.id,
        user_id=current_user.id
    )
    db.add(member)
    db.commit()

    return build_group_dict(new_group, db)


# ── EMPLOYEE REQUEST TO JOIN GROUP ───────────────────────────────────────────
@router.post("/{group_id}/join-request")
@training_router.post("/{group_id}/join-request")
def request_to_join_group(group_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    org_id = current_user.organization_id
    if not org_id:
        raise HTTPException(status_code=400, detail="User organization could not be confirmed in database")

    group = db.query(SecurityGroup).filter(SecurityGroup.id == group_id, SecurityGroup.organization_id == org_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Security group not found in your organization")

    # Check if already a member of any group in this organization
    existing_membership = db.query(GroupMember).filter(
        GroupMember.organization_id == org_id,
        GroupMember.user_id == current_user.id
    ).first()
    if existing_membership:
        raise HTTPException(status_code=400, detail="You are already enrolled in a security group")

    # Check if a pending join request already exists
    existing_request = db.query(GroupJoinRequest).filter(
        GroupJoinRequest.organization_id == org_id,
        GroupJoinRequest.user_id == current_user.id,
        GroupJoinRequest.status == "pending"
    ).first()
    if existing_request:
        raise HTTPException(status_code=400, detail="You already have a pending join request")

    # Create new join request temporarily stored in database
    new_req = GroupJoinRequest(
        organization_id=org_id,
        user_id=current_user.id,
        group_id=group.id,
        status="pending"
    )
    db.add(new_req)
    db.commit()
    db.refresh(new_req)

    return {
        "ok": True,
        "message": f"Join request created and awaiting admin approval for group {group.name}",
        "request_id": new_req.id
    }


# ── GET JOIN REQUESTS (SHOWS ONLY SAME ORGANIZATION REQUESTS) ──────────────────
@router.get("/requests")
@training_router.get("/requests")
def get_join_requests(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    org_id = current_user.organization_id
    if not org_id:
        return []

    # Retrieve pending join requests for the admin/user's organization only
    requests = db.query(GroupJoinRequest).filter(
        GroupJoinRequest.organization_id == org_id,
        GroupJoinRequest.status == "pending"
    ).order_by(GroupJoinRequest.requested_at.desc()).all()

    result = []
    for r in requests:
        u = db.query(User).filter(User.id == r.user_id).first()
        grp = db.query(SecurityGroup).filter(SecurityGroup.id == r.group_id).first()

        if u and grp:
            u_name = f"{u.first_name or ''} {u.last_name or ''}".strip() or u.email.split('@')[0]
            dept_name = u.department.name if u.department else "Engineering"
            role_name = u.role.name if u.role else ("Administrator" if u.is_admin else "Employee")

            # Formatted requested_at time
            req_time_str = r.requested_at.strftime("%b %d, %Y at %I:%M %p") if r.requested_at else "Recently"

            result.append({
                "id": str(r.id),
                "userId": str(u.id),
                "userName": u_name,
                "userEmail": u.email,
                "userDepartment": dept_name,
                "userRole": role_name,
                "groupId": str(grp.id),
                "groupName": grp.name,
                "groupTier": grp.tier,
                "requestedAt": req_time_str,
                "status": r.status
            })

    return result


# ── ADMIN APPROVES JOIN REQUEST ───────────────────────────────────────────────
@router.post("/requests/{request_id}/approve")
@training_router.post("/requests/{request_id}/approve")
def approve_join_request(request_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Only organization admins can approve join requests")

    org_id = current_user.organization_id
    req = db.query(GroupJoinRequest).filter(
        GroupJoinRequest.id == request_id,
        GroupJoinRequest.organization_id == org_id
    ).first()

    if not req:
        raise HTTPException(status_code=404, detail="Join request not found for your organization")

    # Check if member is already in group_members table
    already_member = db.query(GroupMember).filter(
        GroupMember.organization_id == org_id,
        GroupMember.group_id == req.group_id,
        GroupMember.user_id == req.user_id
    ).first()

    if not already_member:
        new_member = GroupMember(
            organization_id=org_id,
            group_id=req.group_id,
            user_id=req.user_id
        )
        db.add(new_member)

    # Move/Remove request from temporary join requests database table
    db.delete(req)
    db.commit()

    return {"ok": True, "message": "Join request approved and employee moved to organization group database"}


# ── ADMIN DENIES JOIN REQUEST ────────────────────────────────────────────────
@router.post("/requests/{request_id}/reject")
@training_router.post("/requests/{request_id}/reject")
def reject_join_request(request_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Only organization admins can reject join requests")

    org_id = current_user.organization_id
    req = db.query(GroupJoinRequest).filter(
        GroupJoinRequest.id == request_id,
        GroupJoinRequest.organization_id == org_id
    ).first()

    if not req:
        raise HTTPException(status_code=404, detail="Join request not found for your organization")

    # Delete employee join request from database
    db.delete(req)
    db.commit()

    return {"ok": True, "message": "Join request denied and removed from database"}


# ── EMPLOYEE LEAVES GROUP ─────────────────────────────────────────────────────
@router.post("/{group_id}/leave")
@training_router.post("/{group_id}/leave")
def leave_group(group_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    org_id = current_user.organization_id

    member = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == current_user.id,
        GroupMember.organization_id == org_id
    ).first()

    if not member:
        raise HTTPException(status_code=404, detail="You are not a member of this security group")

    # Remove user data from organization's group database
    db.delete(member)
    db.commit()

    return {"ok": True, "message": "Successfully left security group"}


# ── ADMIN REMOVES EMPLOYEE FROM GROUP ────────────────────────────────────────
@router.delete("/{group_id}/members/{user_id}")
@training_router.delete("/{group_id}/members/{user_id}")
def remove_member_from_group(group_id: int, user_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Only organization admins can remove members")

    org_id = current_user.organization_id

    member = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == user_id,
        GroupMember.organization_id == org_id
    ).first()

    if not member:
        raise HTTPException(status_code=404, detail="Member not found in this security group")

    # Remove employee data from organization's group database
    db.delete(member)
    db.commit()

    return {"ok": True, "message": "Employee removed from group database"}


# ── ADMIN DIRECTLY ADDS MEMBER ───────────────────────────────────────────────
@router.post("/{group_id}/members")
@training_router.post("/{group_id}/members")
def add_member_directly(group_id: int, payload: DirectAddMember, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Only organization admins can add members")

    org_id = current_user.organization_id
    group = db.query(SecurityGroup).filter(SecurityGroup.id == group_id, SecurityGroup.organization_id == org_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    # Find or create user by email
    target_user = db.query(User).filter(User.email == payload.email).first()
    if not target_user:
        # Create minimal user account
        from app.security import get_password_hash
        target_user = User(
            email=payload.email,
            hashed_password=get_password_hash("employeepassword123"),
            first_name=payload.name.split(" ")[0],
            last_name=" ".join(payload.name.split(" ")[1:]) if " " in payload.name else "",
            organization_id=org_id,
            role_id=2,  # employee role
            is_admin=False
        )
        db.add(target_user)
        db.commit()
        db.refresh(target_user)

    existing_member = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == target_user.id,
        GroupMember.organization_id == org_id
    ).first()

    if not existing_member:
        new_member = GroupMember(
            organization_id=org_id,
            group_id=group.id,
            user_id=target_user.id
        )
        db.add(new_member)
        db.commit()

    return {"ok": True, "message": f"Added {payload.name} to {group.name}"}


# ── ADMIN UPDATES GROUP POLICIES ─────────────────────────────────────────────
@router.put("/{group_id}/policies")
@training_router.put("/{group_id}/policies")
def update_group_policies(group_id: int, payload: PolicyUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Only organization admins can update policies")

    org_id = current_user.organization_id
    group = db.query(SecurityGroup).filter(SecurityGroup.id == group_id, SecurityGroup.organization_id == org_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    group.policies = payload.policies
    db.commit()

    return {"ok": True, "policies": group.policies}
