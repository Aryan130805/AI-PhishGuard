from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from typing import Optional, List
from pydantic import BaseModel

from app.database import get_db
from app.rbac import require_role
from app.models.user import User
from app.models.report import Report

router = APIRouter(prefix="/reports", tags=["reports"])


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class GenerateReportRequest(BaseModel):
    type: str = "executive_summary"
    date_from: Optional[str] = None   # "YYYY-MM-DD"
    date_to: Optional[str] = None     # "YYYY-MM-DD"
    department_id: Optional[int] = None
    formats: List[str] = ["pdf", "excel", "csv"]


class ReportStatusResponse(BaseModel):
    report_id: int
    job_id: Optional[str]
    status: str
    type: str
    generated_at: str
    date_from: Optional[str]
    date_to: Optional[str]
    department_id: Optional[int]
    formats: Optional[List[str]]
    file_paths: Optional[dict]
    error_message: Optional[str]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _serialize_report(r: Report) -> dict:
    return {
        "report_id": r.id,
        "job_id": r.job_id,
        "status": r.status,
        "type": r.type,
        "generated_at": r.generated_at.isoformat() if r.generated_at else None,
        "date_from": r.date_from.date().isoformat() if r.date_from else None,
        "date_to": r.date_to.date().isoformat() if r.date_to else None,
        "department_id": r.department_id,
        "formats": r.formats,
        "file_paths": r.file_paths,
        "error_message": r.error_message,
    }


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/generate", status_code=status.HTTP_202_ACCEPTED)
def generate_report(
    payload: GenerateReportRequest,
    current_user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db),
):
    """
    Enqueue an executive report generation job.
    Returns immediately with report_id + job_id for status polling.
    """
    if payload.type != "executive_summary":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only 'executive_summary' report type is currently supported.",
        )

    valid_formats = {"pdf", "excel", "csv"}
    requested = set(payload.formats or [])
    invalid = requested - valid_formats
    if invalid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid formats: {invalid}. Allowed: pdf, excel, csv",
        )
    if not requested:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one format must be requested.",
        )

    # Parse dates
    dt_from = dt_to = None
    if payload.date_from:
        try:
            dt_from = datetime.strptime(payload.date_from, "%Y-%m-%d").replace(tzinfo=timezone.utc)
        except ValueError:
            raise HTTPException(status_code=400, detail="date_from must be YYYY-MM-DD")
    if payload.date_to:
        try:
            dt_to = datetime.strptime(payload.date_to, "%Y-%m-%d").replace(
                hour=23, minute=59, second=59, tzinfo=timezone.utc
            )
        except ValueError:
            raise HTTPException(status_code=400, detail="date_to must be YYYY-MM-DD")

    # Create pending report row
    report = Report(
        org_id=current_user.organization_id,
        type=payload.type,
        generated_by=current_user.id,
        status="pending",
        date_from=dt_from,
        date_to=dt_to,
        department_id=payload.department_id,
        formats=list(requested),
    )
    db.add(report)
    db.commit()
    db.refresh(report)

    # Enqueue Celery task
    from app.tasks.reports import generate_executive_report
    task = generate_executive_report.delay(
        report_id=report.id,
        org_id=current_user.organization_id,
        date_from_iso=payload.date_from,
        date_to_iso=payload.date_to,
        department_id=payload.department_id,
        formats=list(requested),
    )

    # Store job_id for status polling
    report.job_id = task.id
    db.commit()

    return {
        "report_id": report.id,
        "job_id": task.id,
        "status": "pending",
        "message": "Report generation queued. Poll GET /reports/{report_id}/status for progress.",
    }


@router.get("/{report_id}/status")
def get_report_status(
    report_id: int,
    current_user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db),
):
    """Poll the status of a report generation job."""
    report = db.query(Report).filter(
        Report.id == report_id,
        Report.org_id == current_user.organization_id,
    ).first()
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")

    return _serialize_report(report)


@router.get("/download/{report_id}/{fmt}")
def download_report(
    report_id: int,
    fmt: str,
    current_user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db),
):
    """Download a generated report file by format (pdf | excel | csv)."""
    report = db.query(Report).filter(
        Report.id == report_id,
        Report.org_id == current_user.organization_id,
    ).first()
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")
    if report.status != "completed":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Report is not completed (status: {report.status})")

    file_paths = report.file_paths or {}
    if fmt not in file_paths:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Format '{fmt}' not available for this report")

    file_path = file_paths[fmt]

    import os
    if not os.path.exists(file_path):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report file not found on disk")

    media_types = {
        "pdf": "application/pdf",
        "excel": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "csv": "application/zip",
    }
    filename_map = {
        "pdf": f"phishguard_report_{report_id}.pdf",
        "excel": f"phishguard_report_{report_id}.xlsx",
        "csv": f"phishguard_report_{report_id}_csv.zip",
    }

    return FileResponse(
        path=file_path,
        media_type=media_types.get(fmt, "application/octet-stream"),
        filename=filename_map.get(fmt, f"report_{report_id}.{fmt}"),
    )


@router.get("/")
def list_reports(
    skip: int = 0,
    limit: int = 20,
    current_user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db),
):
    """Return paginated list of all reports for this organisation."""
    reports = (
        db.query(Report)
        .filter(Report.org_id == current_user.organization_id)
        .order_by(Report.generated_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return [_serialize_report(r) for r in reports]
