from typing import Optional, Tuple
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.finding import Finding
from app.models.review import Review
from app.models.user import User
from app.schemas.finding import FindingUpdate
from app.analyzers.base import BaseAnalyzer

class FindingService:
    def update_finding_status(
        self,
        db: Session,
        user: User,
        finding_id: str,
        update_in: FindingUpdate
    ) -> Tuple[Finding, str]:
        """
        Updates finding status. If update_in.apply_to_code is True and status is 'resolved',
        actually updates the parent review's source code in place!
        Returns (finding, updated_source_code).
        """
        finding = db.query(Finding).join(Review).filter(
            Finding.id == finding_id,
            Review.user_id == user.id
        ).first()

        if not finding:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Finding not found or unauthorized.")

        old_status = finding.status
        finding.status = update_in.status
        review = finding.review

        # If applying fix directly to the code:
        if update_in.status == "resolved" and update_in.apply_to_code and finding.suggested_code:
            updated_code = BaseAnalyzer.apply_replacement(
                source_code=review.source_code,
                start_line=finding.start_line,
                end_line=finding.end_line,
                replacement_code=finding.suggested_code
            )
            review.source_code = updated_code
            db.add(review)

        # Recalculate parent review's quality score
        if old_status != update_in.status:
            all_findings = db.query(Finding).filter(Finding.review_id == review.id).all()
            
            # Recalculate: only active 'open' findings deduct from the score
            deductions = 0.0
            for f in all_findings:
                effective_status = update_in.status if f.id == finding.id else f.status
                if effective_status == "open":
                    if f.severity == "critical":
                        deductions += 25.0
                    elif f.severity == "high":
                        deductions += 15.0
                    elif f.severity == "medium":
                        deductions += 8.0
                    elif f.severity == "low":
                        deductions += 3.0
                    elif f.severity == "informational":
                        deductions += 1.0

            review.quality_score = round(max(0.0, min(100.0, 100.0 - deductions)), 1)
            db.add(review)

        db.commit()
        db.refresh(finding)
        db.refresh(review)
        return finding, review.source_code

    def get_finding_by_id(self, db: Session, user: User, finding_id: str) -> Finding:
        finding = db.query(Finding).join(Review).filter(
            Finding.id == finding_id,
            Review.user_id == user.id
        ).first()

        if not finding:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Finding not found or unauthorized.")
        return finding

finding_service = FindingService()
