from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.finding import FindingResponse, FindingUpdate
from app.services.finding_service import finding_service

router = APIRouter(prefix="/findings", tags=["Findings"])

@router.get("/{finding_id}", response_model=FindingResponse)
def get_finding(
    finding_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve details for a single code finding."""
    finding = finding_service.get_finding_by_id(db, current_user, finding_id)
    return FindingResponse.model_validate(finding)

@router.patch("/{finding_id}", response_model=FindingResponse)
def update_finding_status(
    finding_id: str,
    update_in: FindingUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Mark a finding as resolved, dismissed, or reopened, optionally applying fix to code."""
    finding, updated_code = finding_service.update_finding_status(db, current_user, finding_id, update_in)
    resp = FindingResponse.model_validate(finding)
    if update_in.apply_to_code:
        resp.updated_source_code = updated_code
    return resp
