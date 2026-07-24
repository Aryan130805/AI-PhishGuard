from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.organization import Organization
from app.schemas import OrganizationPublic

router = APIRouter(prefix="/organizations", tags=["organizations"])


@router.get("", response_model=List[OrganizationPublic])
def list_organizations(db: Session = Depends(get_db)):
    """Return all verified organizations sorted alphabetically — used by employee signup dropdown."""
    orgs = (
        db.query(Organization)
        .filter((Organization.is_verified == True) | (Organization.is_verified.is_(None)))
        .order_by(Organization.name)
        .all()
    )
    return orgs


@router.get("/search", response_model=List[OrganizationPublic])
def search_organizations(
    q: str = Query(default="", max_length=100),
    limit: int = Query(default=50, le=100),
    db: Session = Depends(get_db),
):
    """
    Debounce-friendly fuzzy search over verified organization names.
    Returns up to `limit` results sorted alphabetically.
    """
    query = db.query(Organization).filter(
        (Organization.is_verified == True) | (Organization.is_verified.is_(None))
    )
    if q.strip():
        query = query.filter(Organization.name.ilike(f"%{q.strip()}%"))
    orgs = query.order_by(Organization.name).limit(limit).all()
    return orgs

