"""
aggregation.py — Shared database aggregation functions.

These functions are the single source of truth for all numeric values used in:
  - analytics API endpoints
  - executive report generation

IMPORTANT: All numeric values embedded in reports MUST come from these functions.
The AI narrative layer only receives the scalar outputs of these functions and
is explicitly prohibited from generating or modifying numbers.
"""
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Optional, List, Dict
from sqlalchemy.orm import Session

from app.models.user import User
from app.models.risk import UserMetrics, RiskScore
from app.models.department import Department
from app.models.campaign import Campaign, EmailEvent, EmailEventType, CampaignTarget


@dataclass
class DeptSummary:
    department_id: int
    department_name: str
    avg_risk_score: float
    click_rate: float
    report_rate: float
    open_rate: float
    user_count: int


@dataclass
class OrgSummary:
    total_users: int
    avg_risk_score: float
    click_rate: float
    report_rate: float
    open_rate: float
    total_emails_sent: int
    total_clicks: int
    total_reports: int
    highest_risk_dept: Optional[DeptSummary]
    lowest_risk_dept: Optional[DeptSummary]
    departments: List[DeptSummary] = field(default_factory=list)


@dataclass
class ThemeBreakdown:
    theme: str
    total_sent: int
    total_clicked: int
    click_rate: float


@dataclass
class MonthlyTrend:
    month: str          # "YYYY-MM"
    avg_risk_score: Optional[float]
    emails_sent: int
    emails_clicked: int
    emails_reported: int


def _latest_risk_per_user(
    db: Session,
    user_ids: List[int],
    dt_from: Optional[datetime] = None,
    dt_to: Optional[datetime] = None,
) -> Dict[int, float]:
    """Return {user_id: latest_risk_score} for the given user list and optional date window."""
    q = db.query(RiskScore).filter(RiskScore.user_id.in_(user_ids))
    if dt_from:
        q = q.filter(RiskScore.computed_at >= dt_from)
    if dt_to:
        q = q.filter(RiskScore.computed_at <= dt_to)

    latest: Dict[int, RiskScore] = {}
    for r in q.all():
        if r.user_id not in latest or r.computed_at > latest[r.user_id].computed_at:
            latest[r.user_id] = r
    return {uid: rs.score for uid, rs in latest.items()}


def compute_dept_summary(
    db: Session,
    dept: Department,
    campaign_user_ids: Optional[List[int]] = None,
    dt_from: Optional[datetime] = None,
    dt_to: Optional[datetime] = None,
) -> DeptSummary:
    """Aggregate risk + metrics for a single department."""
    uq = db.query(User).filter(User.department_id == dept.id)
    if campaign_user_ids is not None:
        uq = uq.filter(User.id.in_(campaign_user_ids))
    users = uq.all()

    user_ids = [u.id for u in users]
    if not user_ids:
        return DeptSummary(
            department_id=dept.id,
            department_name=dept.name,
            avg_risk_score=50.0,
            click_rate=0.0,
            report_rate=0.0,
            open_rate=0.0,
            user_count=0,
        )

    risk_map = _latest_risk_per_user(db, user_ids, dt_from, dt_to)
    avg_risk = round(sum(risk_map.values()) / len(risk_map), 2) if risk_map else 50.0

    metrics_list = db.query(UserMetrics).filter(UserMetrics.user_id.in_(user_ids)).all()
    if metrics_list:
        click_rate = round(sum(m.click_rate for m in metrics_list) / len(metrics_list), 4)
        report_rate = round(sum(m.report_rate for m in metrics_list) / len(metrics_list), 4)
        open_rate = round(sum(m.open_rate for m in metrics_list) / len(metrics_list), 4)
    else:
        click_rate = report_rate = open_rate = 0.0

    return DeptSummary(
        department_id=dept.id,
        department_name=dept.name,
        avg_risk_score=avg_risk,
        click_rate=click_rate,
        report_rate=report_rate,
        open_rate=open_rate,
        user_count=len(users),
    )


def compute_org_summary(
    db: Session,
    org_id: int,
    dt_from: Optional[datetime] = None,
    dt_to: Optional[datetime] = None,
    department_id: Optional[int] = None,
) -> OrgSummary:
    """
    Compute organisation-wide aggregated metrics from the database.

    All values are derived exclusively from DB queries — this is the single source
    of truth for numeric content in generated reports.
    """
    # --- Scoped users ---
    uq = db.query(User).filter(User.organization_id == org_id, User.is_active == True)
    if department_id:
        uq = uq.filter(User.department_id == department_id)
    users = uq.all()
    user_ids = [u.id for u in users]

    if not user_ids:
        return OrgSummary(
            total_users=0, avg_risk_score=0.0, click_rate=0.0,
            report_rate=0.0, open_rate=0.0, total_emails_sent=0,
            total_clicks=0, total_reports=0,
            highest_risk_dept=None, lowest_risk_dept=None,
        )

    # --- Risk scores ---
    risk_map = _latest_risk_per_user(db, user_ids, dt_from, dt_to)
    avg_risk = round(sum(risk_map.values()) / len(risk_map), 2) if risk_map else 0.0

    # --- UserMetrics aggregation ---
    metrics_list = db.query(UserMetrics).filter(UserMetrics.user_id.in_(user_ids)).all()
    if metrics_list:
        click_rate = round(sum(m.click_rate for m in metrics_list) / len(metrics_list), 4)
        report_rate = round(sum(m.report_rate for m in metrics_list) / len(metrics_list), 4)
        open_rate = round(sum(m.open_rate for m in metrics_list) / len(metrics_list), 4)
    else:
        click_rate = report_rate = open_rate = 0.0

    # --- Raw event counts ---
    eq = db.query(EmailEvent).filter(EmailEvent.user_id.in_(user_ids))
    if dt_from:
        eq = eq.filter(EmailEvent.occurred_at >= dt_from)
    if dt_to:
        eq = eq.filter(EmailEvent.occurred_at <= dt_to)
    events = eq.all()
    total_sent = sum(1 for e in events if e.event_type == EmailEventType.sent)
    total_clicks = sum(1 for e in events if e.event_type == EmailEventType.clicked)
    total_reports = sum(1 for e in events if e.event_type == EmailEventType.reported)

    # --- Department breakdowns ---
    dept_q = db.query(Department).filter(Department.organization_id == org_id)
    if department_id:
        dept_q = dept_q.filter(Department.id == department_id)
    depts = dept_q.all()

    dept_summaries: List[DeptSummary] = []
    for d in depts:
        ds = compute_dept_summary(db, d, user_ids if department_id else None, dt_from, dt_to)
        dept_summaries.append(ds)

    dept_summaries.sort(key=lambda d: d.avg_risk_score)
    highest_risk = dept_summaries[0] if dept_summaries else None   # lowest score = highest risk
    lowest_risk = dept_summaries[-1] if dept_summaries else None   # highest score = lowest risk

    return OrgSummary(
        total_users=len(users),
        avg_risk_score=avg_risk,
        click_rate=click_rate,
        report_rate=report_rate,
        open_rate=open_rate,
        total_emails_sent=total_sent,
        total_clicks=total_clicks,
        total_reports=total_reports,
        highest_risk_dept=highest_risk,
        lowest_risk_dept=lowest_risk,
        departments=dept_summaries,
    )


def compute_theme_breakdown(
    db: Session,
    org_id: int,
    dt_from: Optional[datetime] = None,
    dt_to: Optional[datetime] = None,
) -> List[ThemeBreakdown]:
    """Return click statistics grouped by campaign theme."""
    camps = db.query(Campaign).filter(Campaign.org_id == org_id).all()
    theme_data: Dict[str, Dict] = {}

    for camp in camps:
        eq = db.query(EmailEvent).filter(EmailEvent.campaign_id == camp.id)
        if dt_from:
            eq = eq.filter(EmailEvent.occurred_at >= dt_from)
        if dt_to:
            eq = eq.filter(EmailEvent.occurred_at <= dt_to)
        events = eq.all()

        sent = sum(1 for e in events if e.event_type == EmailEventType.sent)
        clicked = sum(1 for e in events if e.event_type == EmailEventType.clicked)

        if camp.theme not in theme_data:
            theme_data[camp.theme] = {"sent": 0, "clicked": 0}
        theme_data[camp.theme]["sent"] += sent
        theme_data[camp.theme]["clicked"] += clicked

    results = []
    for theme, counts in theme_data.items():
        s = counts["sent"]
        c = counts["clicked"]
        results.append(ThemeBreakdown(
            theme=theme,
            total_sent=s,
            total_clicked=c,
            click_rate=round(c / s, 4) if s > 0 else 0.0,
        ))
    results.sort(key=lambda t: t.click_rate, reverse=True)
    return results


def compute_monthly_trend(
    db: Session,
    org_id: int,
    num_months: int = 6,
) -> List[MonthlyTrend]:
    """Return the last N calendar months of org-wide email events and avg risk scores."""
    from datetime import timedelta
    now = datetime.now(timezone.utc)
    results: List[MonthlyTrend] = []

    # Get all org user IDs
    user_ids = [u.id for u in db.query(User).filter(User.organization_id == org_id).all()]

    for months_back in range(num_months - 1, -1, -1):
        # Compute month_start accurately without calendar module
        total_months = now.year * 12 + now.month - 1 - months_back
        year = total_months // 12
        month = total_months % 12 + 1
        month_start = datetime(year, month, 1, tzinfo=timezone.utc)

        # First day of next month
        if month == 12:
            month_end = datetime(year + 1, 1, 1, tzinfo=timezone.utc)
        else:
            month_end = datetime(year, month + 1, 1, tzinfo=timezone.utc)

        events = db.query(EmailEvent).filter(
            EmailEvent.occurred_at >= month_start,
            EmailEvent.occurred_at < month_end,
        ).all()

        sent = sum(1 for e in events if e.event_type == EmailEventType.sent)
        clicked = sum(1 for e in events if e.event_type == EmailEventType.clicked)
        reported = sum(1 for e in events if e.event_type == EmailEventType.reported)

        # Risk scores for this month
        scores_in_month = [
            r.score for r in db.query(RiskScore).filter(
                RiskScore.user_id.in_(user_ids),
                RiskScore.computed_at >= month_start,
                RiskScore.computed_at < month_end,
            ).all()
        ]
        avg_risk = round(sum(scores_in_month) / len(scores_in_month), 2) if scores_in_month else None

        results.append(MonthlyTrend(
            month=month_start.strftime("%Y-%m"),
            avg_risk_score=avg_risk,
            emails_sent=sent,
            emails_clicked=clicked,
            emails_reported=reported,
        ))

    return results
