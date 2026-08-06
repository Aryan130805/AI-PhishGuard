from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel

from app.database import get_db
from app.rbac import get_current_user
from app.models.user import User
from app.models.department import Department, DepartmentRequest
from app.models.risk import RiskScore

router = APIRouter(prefix="/departments", tags=["departments"])

class DepartmentCreate(BaseModel):
    name: str
    description: Optional[str] = ""

class AddMemberToDept(BaseModel):
    name: Optional[str] = None
    email: str
    role_name: Optional[str] = "Specialist"

class SelectDepartmentPayload(BaseModel):
    department_id: int


def seed_default_departments(db: Session, org_id: int):
    existing = db.query(Department).filter(Department.organization_id == org_id).all()
    if existing:
        return existing

    defaults = [
        {"name": "Engineering", "description": "Software development, infrastructure, and technical operations team."},
        {"name": "Sales & Business Development", "description": "Client acquisition, key account management, and business revenue teams."},
        {"name": "Marketing & Communications", "description": "Brand strategy, social media campaigns, and public relations."},
        {"name": "Cybersecurity & IT Operations", "description": "Information security, network defenses, threat monitoring, and IT helpdesk."},
        {"name": "Executive & Management", "description": "Corporate leadership, executive board, and strategic planning unit."},
        {"name": "Human Resources & People Ops", "description": "Talent acquisition, employee onboarding, corporate policy, and training."}
    ]
    created = []
    for item in defaults:
        dept = Department(name=item["name"], organization_id=org_id)
        db.add(dept)
        created.append(dept)
    db.commit()
    for d in created:
        db.refresh(d)
    return created


# ── 1. GET DEPARTMENTS ────────────────────────────────────────────────────────
@router.get("", response_model=List[dict])
def get_departments(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    org_id = current_user.organization_id
    if not org_id:
        raise HTTPException(status_code=400, detail="User does not belong to an organization")

    depts = db.query(Department).filter(Department.organization_id == org_id).all()
    if not depts:
        depts = seed_default_departments(db, org_id)

    result = []
    for d in depts:
        dept_users = db.query(User).filter(User.organization_id == org_id, User.department_id == d.id).all()
        members_list = []
        for u in dept_users:
            r_score_obj = db.query(RiskScore).filter(RiskScore.user_id == u.id).order_by(RiskScore.computed_at.desc()).first()
            user_risk = int(r_score_obj.score) if r_score_obj else 90

            members_list.append({
                "id": str(u.id),
                "first_name": u.first_name or u.email.split('@')[0],
                "last_name": u.last_name or "",
                "email": u.email,
                "role_name": u.role.name if u.role else ("Administrator" if u.is_admin else "Employee"),
                "risk_score": user_risk
            })

        result.append({
            "id": str(d.id),
            "name": d.name,
            "description": f"Department unit for {d.name}",
            "employee_count": len(members_list),
            "risk_score": 90,
            "click_rate": 5,
            "report_rate": 92,
            "members": members_list
        })

    return result


# ── 2. CREATE DEPARTMENT (ADMIN ONLY) ──────────────────────────────────────────
@router.post("", status_code=status.HTTP_201_CREATED)
def create_department(payload: DepartmentCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Only organization admins can add departments")

    org_id = current_user.organization_id
    existing = db.query(Department).filter(
        Department.organization_id == org_id,
        Department.name.ilike(payload.name.strip())
    ).first()

    if existing:
        raise HTTPException(status_code=400, detail=f"Department '{payload.name}' already exists in your organization")

    new_dept = Department(
        name=payload.name.strip(),
        organization_id=org_id
    )
    db.add(new_dept)
    db.commit()
    db.refresh(new_dept)

    return {
        "id": str(new_dept.id),
        "name": new_dept.name,
        "description": payload.description or f"Department unit for {new_dept.name}",
        "employee_count": 0,
        "risk_score": 95,
        "click_rate": 2,
        "report_rate": 98,
        "members": []
    }


# ── 3. DELETE DEPARTMENT (ADMIN ONLY) ──────────────────────────────────────────
@router.delete("/{dept_id}")
def delete_department(dept_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Only organization admins can delete departments")

    org_id = current_user.organization_id
    dept = db.query(Department).filter(Department.id == dept_id, Department.organization_id == org_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")

    # Unassign all users from this department in the database
    db.query(User).filter(User.department_id == dept.id).update({"department_id": None}, synchronize_session=False)

    # Delete department data from database
    db.delete(dept)
    db.commit()

    return {"ok": True, "message": f"Department '{dept.name}' deleted and assigned employees unassigned"}


# ── GET UNASSIGNED EMPLOYEES (ADMIN ONLY) ───────────────────────────────────
@router.get("/unassigned-employees")
def get_unassigned_employees(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Only organization admins can view unassigned employees")

    org_id = current_user.organization_id
    if not org_id:
        return []

    unassigned_users = db.query(User).filter(
        User.organization_id == org_id,
        User.department_id.is_(None)
    ).all()

    result = []
    for u in unassigned_users:
        u_name = f"{u.first_name or ''} {u.last_name or ''}".strip() or u.email.split('@')[0]
        result.append({
            "id": str(u.id),
            "name": u_name,
            "email": u.email,
            "role": u.role.name if u.role else ("Administrator" if u.is_admin else "Employee")
        })

    return result


# ── 4. ADD EMPLOYEE TO DEPARTMENT (ADMIN ONLY) ────────────────────────────────
@router.post("/{dept_id}/members")
def add_member_to_department(dept_id: int, payload: AddMemberToDept, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Only organization admins can assign employees")

    org_id = current_user.organization_id
    dept = db.query(Department).filter(Department.id == dept_id, Department.organization_id == org_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")

    u = db.query(User).filter(User.email.ilike(payload.email.strip())).first()
    if not u:
        from app.security import get_password_hash
        name_parts = (payload.name or payload.email.split('@')[0]).split(" ")
        u = User(
            email=payload.email.strip(),
            hashed_password=get_password_hash("employeepassword123"),
            first_name=name_parts[0],
            last_name=" ".join(name_parts[1:]) if len(name_parts) > 1 else "",
            organization_id=org_id,
            department_id=dept.id,
            role_id=2
        )
        db.add(u)
        db.commit()
        db.refresh(u)
    else:
        u.department_id = dept.id
        db.commit()

    return {"ok": True, "message": f"Assigned {u.email} to {dept.name}"}


# ── 5. REMOVE EMPLOYEE FROM DEPARTMENT (ADMIN ONLY) ───────────────────────────
@router.delete("/{dept_id}/members/{user_id}")
def remove_member_from_department(dept_id: int, user_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Only organization admins can remove employees from department")

    org_id = current_user.organization_id

    user_query = db.query(User).filter(User.organization_id == org_id)
    try:
        uid = int(user_id)
        u = user_query.filter(User.id == uid).first()
    except ValueError:
        u = user_query.filter(User.email.ilike(user_id)).first()

    if not u:
        raise HTTPException(status_code=404, detail="Employee not found")

    # Remove employee from department in database
    u.department_id = None
    db.commit()

    return {"ok": True, "message": f"Removed {u.email} from department in database"}


# ── 6. EMPLOYEE LEAVES DEPARTMENT ─────────────────────────────────────────────
@router.post("/leave")
def leave_department(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not current_user.department_id:
        raise HTTPException(status_code=400, detail="You are not currently in any department")

    dept_name = current_user.department.name if current_user.department else "department"
    current_user.department_id = None
    db.commit()

    return {"ok": True, "message": f"Left {dept_name}. You can now request to join another department."}


# ── 7. EMPLOYEE REQUESTS TO JOIN / SWITCH DEPARTMENT ──────────────────────────
@router.post("/{dept_id}/join-request")
def request_join_or_switch_department(dept_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    org_id = current_user.organization_id
    if not org_id:
        raise HTTPException(status_code=400, detail="User organization not found")

    target_dept = db.query(Department).filter(Department.id == dept_id, Department.organization_id == org_id).first()
    if not target_dept:
        raise HTTPException(status_code=404, detail="Department not found in your organization")

    if current_user.department_id == dept_id:
        raise HTTPException(status_code=400, detail="You are already in this department")

    # Check if a pending request already exists
    existing_req = db.query(DepartmentRequest).filter(
        DepartmentRequest.organization_id == org_id,
        DepartmentRequest.user_id == current_user.id,
        DepartmentRequest.status == "pending"
    ).first()

    if existing_req:
        raise HTTPException(status_code=400, detail="You already have a pending department request awaiting admin approval")

    req_type = "switch" if current_user.department_id else "join"
    new_req = DepartmentRequest(
        organization_id=org_id,
        user_id=current_user.id,
        department_id=dept_id,
        request_type=req_type,
        status="pending"
    )
    db.add(new_req)
    db.commit()
    db.refresh(new_req)

    return {
        "ok": True,
        "message": f"Department {req_type} request submitted for {target_dept.name}. Awaiting admin approval.",
        "request_id": new_req.id
    }


# ── 8. GET PENDING DEPARTMENT REQUESTS (ADMIN ONLY) ───────────────────────────
@router.get("/requests")
def get_department_requests(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Only organization admins can view department requests")

    org_id = current_user.organization_id
    if not org_id:
        return []

    reqs = db.query(DepartmentRequest).filter(
        DepartmentRequest.organization_id == org_id,
        DepartmentRequest.status == "pending"
    ).order_by(DepartmentRequest.requested_at.desc()).all()

    result = []
    for r in reqs:
        u = db.query(User).filter(User.id == r.user_id).first()
        dept = db.query(Department).filter(Department.id == r.department_id).first()
        if u and dept:
            u_name = f"{u.first_name or ''} {u.last_name or ''}".strip() or u.email.split('@')[0]
            curr_dept_name = u.department.name if u.department else "None (Unassigned)"
            req_time_str = r.requested_at.strftime("%b %d, %Y at %I:%M %p") if r.requested_at else "Recently"

            result.append({
                "id": str(r.id),
                "userId": str(u.id),
                "userName": u_name,
                "userEmail": u.email,
                "currentDepartmentName": curr_dept_name,
                "requestedDepartmentId": str(dept.id),
                "requestedDepartmentName": dept.name,
                "requestType": r.request_type,
                "requestedAt": req_time_str,
                "status": r.status
            })

    return result


# ── 9. ADMIN APPROVES DEPARTMENT REQUEST ───────────────────────────────────────
@router.post("/requests/{request_id}/approve")
def approve_department_request(request_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Only organization admins can approve requests")

    org_id = current_user.organization_id
    req = db.query(DepartmentRequest).filter(
        DepartmentRequest.id == request_id,
        DepartmentRequest.organization_id == org_id
    ).first()

    if not req:
        raise HTTPException(status_code=404, detail="Department request not found")

    target_user = db.query(User).filter(User.id == req.user_id).first()
    target_dept = db.query(Department).filter(Department.id == req.department_id).first()

    if target_user and target_dept:
        # Move employee details to the requested department in the database
        target_user.department_id = target_dept.id

    # Delete request from temporary database table upon approval
    db.delete(req)
    db.commit()

    return {"ok": True, "message": "Approved department request and updated employee department in database"}


# ── 10. ADMIN REJECTS DEPARTMENT REQUEST ──────────────────────────────────────
@router.post("/requests/{request_id}/reject")
def reject_department_request(request_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Only organization admins can reject requests")

    org_id = current_user.organization_id
    req = db.query(DepartmentRequest).filter(
        DepartmentRequest.id == request_id,
        DepartmentRequest.organization_id == org_id
    ).first()

    if not req:
        raise HTTPException(status_code=404, detail="Department request not found")

    # Delete request from temporary database table upon rejection
    db.delete(req)
    db.commit()

    return {"ok": True, "message": "Rejected department request and deleted from database"}


# ── 11. EMPLOYEE GETS MY PENDING REQUESTS ─────────────────────────────────────
@router.get("/my-requests")
def get_my_department_requests(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    reqs = db.query(DepartmentRequest).filter(
        DepartmentRequest.user_id == current_user.id,
        DepartmentRequest.status == "pending"
    ).all()

    result = []
    for r in reqs:
        dept = db.query(Department).filter(Department.id == r.department_id).first()
        if dept:
            result.append({
                "id": str(r.id),
                "requestedDepartmentId": str(dept.id),
                "requestedDepartmentName": dept.name,
                "requestType": r.request_type,
                "status": r.status
            })

    return result
