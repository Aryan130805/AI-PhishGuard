from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from datetime import datetime, timezone, timedelta, date
from typing import Optional, List

from app.database import get_db
from app.rbac import require_role
from app.models.user import User
from app.models.risk import UserMetrics, RiskScore
from app.models.department import Department
from app.models.campaign import EmailEvent, EmailEventType, CampaignTarget, CampaignStatus

router = APIRouter(prefix="/analytics", tags=["analytics"])

@router.post("/recompute")
def trigger_recompute(
    current_user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db)
):
    from app.tasks.campaigns import recompute_all_user_metrics
    count = recompute_all_user_metrics()
    return {"message": "Recomputation complete", "recomputed_users": count}

@router.get("/summary")
def get_org_summary(
    current_user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db)
):
    metrics_list = db.query(UserMetrics).all()
    if not metrics_list:
        avg_click = 0.0
        avg_report = 0.0
        avg_open = 0.0
    else:
        avg_click = sum(m.click_rate for m in metrics_list) / len(metrics_list)
        avg_report = sum(m.report_rate for m in metrics_list) / len(metrics_list)
        avg_open = sum(m.open_rate for m in metrics_list) / len(metrics_list)
        
    risk_entries = db.query(RiskScore).all()
    if not risk_entries:
        avg_risk = 15.0
    else:
        # Get the latest risk score per user
        latest_risks = {}
        for r in risk_entries:
            if r.user_id not in latest_risks or r.computed_at > latest_risks[r.user_id].computed_at:
                latest_risks[r.user_id] = r
        avg_risk = sum(r.score for r in latest_risks.values()) / len(latest_risks) if latest_risks else 15.0
        
    return {
        "click_rate": avg_click,
        "report_rate": avg_report,
        "open_rate": avg_open,
        "avg_risk_score": avg_risk,
        "total_users": len(metrics_list)
    }

@router.get("/user/me")
def get_my_analytics(
    current_user: User = Depends(require_role(["admin", "employee"])),
    db: Session = Depends(get_db)
):
    """Employee-accessible self-analytics endpoint."""
    metrics = db.query(UserMetrics).filter(UserMetrics.user_id == current_user.id).first()
    risk_history = db.query(RiskScore).filter(RiskScore.user_id == current_user.id).order_by(RiskScore.computed_at.asc()).all()
    latest_score = risk_history[-1].score if risk_history else None

    return {
        "user_id": current_user.id,
        "click_rate": round(metrics.click_rate if metrics else 0.0, 4),
        "report_rate": round(metrics.report_rate if metrics else 0.0, 4),
        "open_rate": round(metrics.open_rate if metrics else 0.0, 4),
        "avg_time_to_click": round(metrics.avg_time_to_click if metrics else 0.0, 2),
        "latest_risk_score": latest_score,
        "risk_history": [
            {"score": r.score, "computed_at": r.computed_at.isoformat()}
            for r in risk_history[-30:]  # last 30 data points
        ]
    }

@router.get("/user/{id}")
def get_user_analytics(
    id: int,
    current_user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db)
):
    metrics = db.query(UserMetrics).filter(UserMetrics.user_id == id).first()
    risk_history = db.query(RiskScore).filter(RiskScore.user_id == id).order_by(RiskScore.computed_at.asc()).all()
    
    return {
        "user_id": id,
        "click_rate": metrics.click_rate if metrics else 0.0,
        "report_rate": metrics.report_rate if metrics else 0.0,
        "open_rate": metrics.open_rate if metrics else 0.0,
        "avg_time_to_click": metrics.avg_time_to_click if metrics else 0.0,
        "risk_history": [
            {
                "score": r.score,
                "computed_at": r.computed_at
            }
            for r in risk_history
        ]
    }

@router.get("/department/{id}")
def get_department_analytics(
    id: int,
    current_user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db)
):
    users = db.query(User).filter(User.department_id == id).all()
    if not users:
        return {
            "department_id": id,
            "click_rate": 0.0,
            "report_rate": 0.0,
            "open_rate": 0.0,
            "avg_time_to_click": 0.0
        }
        
    user_ids = [u.id for u in users]
    metrics_list = db.query(UserMetrics).filter(UserMetrics.user_id.in_(user_ids)).all()
    
    if not metrics_list:
        return {
            "department_id": id,
            "click_rate": 0.0,
            "report_rate": 0.0,
            "open_rate": 0.0,
            "avg_time_to_click": 0.0
        }
        
    click_rate = sum(m.click_rate for m in metrics_list) / len(metrics_list)
    report_rate = sum(m.report_rate for m in metrics_list) / len(metrics_list)
    open_rate = sum(m.open_rate for m in metrics_list) / len(metrics_list)
    avg_time_to_click = sum(m.avg_time_to_click for m in metrics_list) / len(metrics_list)
    
    return {
        "department_id": id,
        "click_rate": click_rate,
        "report_rate": report_rate,
        "open_rate": open_rate,
        "avg_time_to_click": avg_time_to_click
    }

@router.get("/departments")
def get_all_departments_analytics(
    current_user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db)
):
    depts = db.query(Department).all()
    results = []
    for dept in depts:
        users = db.query(User).filter(User.department_id == dept.id).all()
        if not users:
            results.append({
                "department_id": dept.id,
                "department_name": dept.name,
                "click_rate": 0.0,
                "report_rate": 0.0,
                "open_rate": 0.0,
                "avg_time_to_click": 0.0
            })
            continue
            
        user_ids = [u.id for u in users]
        metrics_list = db.query(UserMetrics).filter(UserMetrics.user_id.in_(user_ids)).all()
        
        if not metrics_list:
            results.append({
                "department_id": dept.id,
                "department_name": dept.name,
                "click_rate": 0.0,
                "report_rate": 0.0,
                "open_rate": 0.0,
                "avg_time_to_click": 0.0
            })
            continue
            
        click_rate = sum(m.click_rate for m in metrics_list) / len(metrics_list)
        report_rate = sum(m.report_rate for m in metrics_list) / len(metrics_list)
        open_rate = sum(m.open_rate for m in metrics_list) / len(metrics_list)
        avg_time_to_click = sum(m.avg_time_to_click for m in metrics_list) / len(metrics_list)
        
        results.append({
            "department_id": dept.id,
            "department_name": dept.name,
            "click_rate": click_rate,
            "report_rate": report_rate,
            "open_rate": open_rate,
            "avg_time_to_click": avg_time_to_click
        })
        
    return results

@router.get("/trends")
def get_trends(
    range_filter: str = Query("30d", alias="range", pattern="^(30d|90d|1y)$"),
    current_user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db)
):
    if range_filter == "30d":
        num_days = 30
    elif range_filter == "90d":
        num_days = 90
    else:
        num_days = 365
        
    start_date = datetime.now(timezone.utc) - timedelta(days=num_days)
    
    events = db.query(EmailEvent).filter(EmailEvent.occurred_at >= start_date).all()
    
    # Fill in all dates to prevent gaps in charts
    daily_data = {}
    curr = datetime.now(timezone.utc) - timedelta(days=num_days - 1)
    for i in range(num_days):
        date_str = curr.strftime("%Y-%m-%d")
        daily_data[date_str] = {"sent": 0, "clicked": 0, "reported": 0}
        curr += timedelta(days=1)
        
    for event in events:
        date_str = event.occurred_at.strftime("%Y-%m-%d")
        if date_str in daily_data:
            if event.event_type == EmailEventType.sent:
                daily_data[date_str]["sent"] += 1
            elif event.event_type == EmailEventType.clicked:
                daily_data[date_str]["clicked"] += 1
            elif event.event_type == EmailEventType.reported:
                daily_data[date_str]["reported"] += 1
                
    trends = []
    for date_str, counts in sorted(daily_data.items()):
        sent = counts["sent"]
        clicked = counts["clicked"]
        reported = counts["reported"]
        
        trends.append({
            "date": date_str,
            "sent": sent,
            "clicks": clicked,
            "reports": reported,
            "click_rate": clicked / sent if sent > 0 else 0.0,
            "report_rate": reported / sent if sent > 0 else 0.0
        })
        
    return trends

@router.get("/heatmap")
def get_heatmap(
    department_id: Optional[int] = Query(None, description="Filter by a specific department"),
    campaign_id: Optional[int] = Query(None, description="Filter by a specific campaign"),
    date_from: Optional[str] = Query(None, description="ISO date string (YYYY-MM-DD) for risk score window start"),
    date_to: Optional[str] = Query(None, description="ISO date string (YYYY-MM-DD) for risk score window end"),
    current_user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db),
):
    """
    Return per-department aggregated risk data for the heatmap visualization.

    Returns:
      - departments: list with avg_risk_score, click_rate, report_rate, user_count per dept
      - monthly_trend: last 6 months of org-wide avg risk score (ignores date_from/date_to)
      - campaign_stats: sent/clicked/reported counts per campaign (scoped by campaign_id if given)
    """
    # --- Parse date bounds ---
    dt_from: Optional[datetime] = None
    dt_to: Optional[datetime] = None
    if date_from:
        try:
            dt_from = datetime.strptime(date_from, "%Y-%m-%d").replace(tzinfo=timezone.utc)
        except ValueError:
            raise HTTPException(status_code=400, detail="date_from must be YYYY-MM-DD")
    if date_to:
        try:
            # Make end-of-day inclusive
            dt_to = datetime.strptime(date_to, "%Y-%m-%d").replace(
                hour=23, minute=59, second=59, tzinfo=timezone.utc
            )
        except ValueError:
            raise HTTPException(status_code=400, detail="date_to must be YYYY-MM-DD")

    # --- Determine which user IDs are in scope (campaign filter) ---
    campaign_user_ids: Optional[List[int]] = None
    if campaign_id is not None:
        targets = db.query(CampaignTarget).filter(CampaignTarget.campaign_id == campaign_id).all()
        campaign_user_ids = [t.user_id for t in targets]

    # --- Collect all departments (optionally filtered) ---
    dept_query = db.query(Department)
    if department_id is not None:
        dept_query = dept_query.filter(Department.id == department_id)
    depts = dept_query.all()

    dept_results = []
    for dept in depts:
        # Users in this department
        user_q = db.query(User).filter(User.department_id == dept.id)
        if campaign_user_ids is not None:
            user_q = user_q.filter(User.id.in_(campaign_user_ids))
        users = user_q.all()

        if not users:
            dept_results.append({
                "department_id": dept.id,
                "department_name": dept.name,
                "avg_risk_score": 50.0,
                "click_rate": 0.0,
                "report_rate": 0.0,
                "user_count": 0,
            })
            continue

        user_ids = [u.id for u in users]

        # Latest risk score per user within optional date bounds
        risk_q = db.query(RiskScore).filter(RiskScore.user_id.in_(user_ids))
        if dt_from:
            risk_q = risk_q.filter(RiskScore.computed_at >= dt_from)
        if dt_to:
            risk_q = risk_q.filter(RiskScore.computed_at <= dt_to)
        all_risks = risk_q.order_by(RiskScore.computed_at.asc()).all()

        latest_risks: dict = {}
        for r in all_risks:
            if r.user_id not in latest_risks or r.computed_at > latest_risks[r.user_id].computed_at:
                latest_risks[r.user_id] = r

        avg_risk = (
            round(sum(r.score for r in latest_risks.values()) / len(latest_risks), 2)
            if latest_risks else 50.0
        )

        # Aggregate UserMetrics for click/report rates
        metrics_list = db.query(UserMetrics).filter(UserMetrics.user_id.in_(user_ids)).all()
        if metrics_list:
            click_rate = round(sum(m.click_rate for m in metrics_list) / len(metrics_list), 4)
            report_rate = round(sum(m.report_rate for m in metrics_list) / len(metrics_list), 4)
        else:
            click_rate = 0.0
            report_rate = 0.0

        dept_results.append({
            "department_id": dept.id,
            "department_name": dept.name,
            "avg_risk_score": avg_risk,
            "click_rate": click_rate,
            "report_rate": report_rate,
            "user_count": len(users),
        })

    # --- Monthly trend: last 6 calendar months, org-wide avg risk score ---
    now = datetime.now(timezone.utc)
    monthly_trend = []
    for months_back in range(5, -1, -1):
        # First day of month
        month_start = (now.replace(day=1) - timedelta(days=months_back * 28)).replace(
            day=1, hour=0, minute=0, second=0, microsecond=0
        )
        # First day of next month
        if month_start.month == 12:
            month_end = month_start.replace(year=month_start.year + 1, month=1)
        else:
            month_end = month_start.replace(month=month_start.month + 1)

        month_risks = db.query(RiskScore).filter(
            RiskScore.computed_at >= month_start,
            RiskScore.computed_at < month_end,
        )
        if campaign_user_ids is not None:
            month_risks = month_risks.filter(RiskScore.user_id.in_(campaign_user_ids))

        scores = [r.score for r in month_risks.all()]
        avg = round(sum(scores) / len(scores), 2) if scores else None

        monthly_trend.append({
            "month": month_start.strftime("%Y-%m"),
            "avg_risk_score": avg,
        })

    # --- Campaign stats ---
    from app.models.campaign import Campaign
    camp_q = db.query(Campaign)
    if campaign_id is not None:
        camp_q = camp_q.filter(Campaign.id == campaign_id)
    campaigns = camp_q.order_by(Campaign.created_at.desc()).limit(10).all()

    campaign_stats = []
    for camp in campaigns:
        events = db.query(EmailEvent).filter(EmailEvent.campaign_id == camp.id)
        if campaign_user_ids is not None and campaign_id is None:
            events = events.filter(EmailEvent.user_id.in_(campaign_user_ids))
        event_list = events.all()

        sent = sum(1 for e in event_list if e.event_type == EmailEventType.sent)
        clicked = sum(1 for e in event_list if e.event_type == EmailEventType.clicked)
        reported = sum(1 for e in event_list if e.event_type == EmailEventType.reported)

        campaign_stats.append({
            "campaign_id": camp.id,
            "campaign_name": camp.name,
            "sent": sent,
            "clicked": clicked,
            "reported": reported,
        })

    return {
        "departments": dept_results,
        "monthly_trend": monthly_trend,
        "campaign_stats": campaign_stats,
    }
