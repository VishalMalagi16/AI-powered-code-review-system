from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.review import (
    ReviewCreate,
    ReviewResponse,
    ReviewListResponse,
    ReviewUpdateCode
)
from app.services.review_service import review_service

router = APIRouter(prefix="/reviews", tags=["Code Reviews"])

@router.post("", response_model=ReviewResponse, status_code=status.HTTP_201_CREATED)
async def create_review(
    review_in: ReviewCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Submit source code for automated review and bug detection.
    Runs static analysis and optional AI remediation.
    """
    review = await review_service.create_and_analyze_review(db, current_user, review_in)
    
    # Calculate summary
    summary = review_service.calculate_finding_summary(review.findings)
    resp = ReviewResponse.model_validate(review)
    resp.finding_summary = summary
    return resp

@router.get("", response_model=ReviewListResponse)
def list_reviews(
    language: Optional[str] = Query(None, description="Filter by language"),
    status: Optional[str] = Query(None, description="Filter by review status"),
    search: Optional[str] = Query(None, description="Search review titles"),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve paginated review history for the authenticated user."""
    return review_service.get_user_reviews(
        db=db,
        user=current_user,
        language=language,
        status_filter=status,
        search=search,
        page=page,
        limit=limit
    )

@router.get("/{review_id}", response_model=ReviewResponse)
def get_review(
    review_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve full details, code, and findings for a specific review."""
    review = review_service.get_review_by_id(db, current_user, review_id)
    summary = review_service.calculate_finding_summary(review.findings)
    resp = ReviewResponse.model_validate(review)
    resp.finding_summary = summary
    return resp

@router.put("/{review_id}/code", response_model=ReviewResponse)
def update_review_code(
    review_id: str,
    payload: ReviewUpdateCode,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update the review's source code in the database."""
    review = review_service.update_source_code(db, current_user, review_id, payload.source_code)
    summary = review_service.calculate_finding_summary(review.findings)
    resp = ReviewResponse.model_validate(review)
    resp.finding_summary = summary
    return resp

@router.post("/{review_id}/apply-all-fixes", response_model=ReviewResponse)
def apply_all_fixes(
    review_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Batch-apply all actionable suggested fixes to the source code and mark findings resolved."""
    review = review_service.apply_all_fixes(db, current_user, review_id)
    summary = review_service.calculate_finding_summary(review.findings)
    resp = ReviewResponse.model_validate(review)
    resp.finding_summary = summary
    return resp

@router.delete("/{review_id}", status_code=status.HTTP_200_OK)
def delete_review(
    review_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a review and its findings."""
    review_service.delete_review(db, current_user, review_id)
    return {"message": "Review deleted successfully."}

@router.post("/{review_id}/reanalyze", response_model=ReviewResponse)
async def reanalyze_review(
    review_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Re-run static analysis and AI audit on saved code."""
    review = await review_service.reanalyze_review(db, current_user, review_id)
    summary = review_service.calculate_finding_summary(review.findings)
    resp = ReviewResponse.model_validate(review)
    resp.finding_summary = summary
    return resp
