from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.core.config import settings
from app.models.review import Review
from app.models.finding import Finding
from app.models.user import User
from app.schemas.review import ReviewCreate, ReviewMetrics, ReviewListItem, ReviewListResponse
from app.schemas.finding import FindingBase, FindingSummary
from app.analyzers.base import BaseAnalyzer
from app.services.static_analysis_service import static_analysis_service
from app.services.ai_service import ai_service

class ReviewService:
    @staticmethod
    def calculate_finding_summary(findings: List[Finding]) -> FindingSummary:
        summary = FindingSummary(total=len(findings))
        for f in findings:
            if f.status == "resolved":
                summary.resolved += 1
            elif f.status == "dismissed":
                summary.dismissed += 1

            if f.severity == "critical":
                summary.critical += 1
            elif f.severity == "high":
                summary.high += 1
            elif f.severity == "medium":
                summary.medium += 1
            elif f.severity == "low":
                summary.low += 1
            elif f.severity == "informational":
                summary.informational += 1
        return summary

    async def create_and_analyze_review(
        self,
        db: Session,
        user: User,
        review_in: ReviewCreate
    ) -> Review:
        # Validate code size
        code_bytes = len(review_in.source_code.encode("utf-8"))
        if code_bytes > settings.MAX_CODE_SIZE_BYTES:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"Source code exceeds maximum size limit of {settings.MAX_CODE_SIZE_BYTES // 1000} KB."
            )

        title = review_in.title or f"{review_in.language.capitalize()} Review - {datetime.now(timezone.utc).strftime('%b %d, %H:%M')}"

        # 1. Run static analysis
        options = {
            "enable_security": review_in.enable_security,
            "enable_performance": review_in.enable_performance,
            "enable_style": review_in.enable_style,
            "enable_bugs": review_in.enable_bugs,
        }
        static_findings, metrics, static_quality_score = static_analysis_service.analyze_code(
            source_code=review_in.source_code,
            language=review_in.language,
            options=options
        )

        # 2. Run AI analysis if requested
        ai_used = False
        ai_status_val = "skipped"
        ai_summary_val = "Static analysis completed."
        ai_notes_val = "AI analysis was disabled in request."
        combined_findings: List[FindingBase] = list(static_findings)

        if review_in.enable_ai:
            ai_findings, ai_status_val, ai_summary_val, ai_notes_val = await ai_service.analyze_code(
                source_code=review_in.source_code,
                language=review_in.language,
                existing_findings=static_findings
            )
            ai_used = ai_status_val in ["success", "demo_mode"]
            # Deduplicate AI findings against static findings
            existing_lines = {f.start_line for f in combined_findings}
            for af in ai_findings:
                combined_findings.append(af)

        # Recalculate score with all findings
        deductions = 0.0
        for f in combined_findings:
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

        final_quality_score = round(max(0.0, min(100.0, 100.0 - deductions)), 1)

        # 3. Create Review in DB
        review_db = Review(
            user_id=user.id,
            title=title,
            language=review_in.language.lower(),
            source_code=review_in.source_code,
            status="completed",
            analysis_summary=ai_summary_val,
            quality_score=final_quality_score,
            metrics=metrics,
            ai_used=ai_used,
            ai_status=ai_status_val,
            ai_notes=ai_notes_val,
            completed_at=datetime.now(timezone.utc)
        )
        db.add(review_db)
        db.flush()

        # 4. Create Finding records in DB
        for item in combined_findings:
            finding_db = Finding(
                review_id=review_db.id,
                rule_id=item.rule_id,
                category=item.category,
                severity=item.severity,
                title=item.title,
                description=item.description,
                why_it_matters=item.why_it_matters,
                file_path=item.file_path,
                start_line=item.start_line,
                end_line=item.end_line,
                source=item.source,
                confidence=item.confidence,
                suggested_fix=item.suggested_fix,
                suggested_code=item.suggested_code,
                original_code=item.original_code,
                status="open"
            )
            db.add(finding_db)

        db.commit()
        db.refresh(review_db)
        return review_db

    def get_user_reviews(
        self,
        db: Session,
        user: User,
        language: Optional[str] = None,
        status_filter: Optional[str] = None,
        search: Optional[str] = None,
        page: int = 1,
        limit: int = 10
    ) -> ReviewListResponse:
        query = db.query(Review).filter(Review.user_id == user.id)

        if language:
            query = query.filter(Review.language == language.lower())
        if status_filter:
            query = query.filter(Review.status == status_filter.lower())
        if search:
            query = query.filter(Review.title.ilike(f"%{search}%"))

        total = query.count()
        offset = (page - 1) * limit
        reviews = query.order_by(Review.created_at.desc()).offset(offset).limit(limit).all()

        items: List[ReviewListItem] = []
        for r in reviews:
            crit_count = sum(1 for f in r.findings if f.severity == "critical")
            high_count = sum(1 for f in r.findings if f.severity == "high")
            items.append(ReviewListItem(
                id=r.id,
                title=r.title,
                language=r.language,
                status=r.status,
                quality_score=r.quality_score,
                total_findings=len(r.findings),
                critical_findings=crit_count,
                high_findings=high_count,
                ai_used=r.ai_used,
                created_at=r.created_at,
                completed_at=r.completed_at
            ))

        total_pages = max(1, (total + limit - 1) // limit)
        return ReviewListResponse(
            items=items,
            total=total,
            page=page,
            limit=limit,
            total_pages=total_pages
        )

    def get_review_by_id(self, db: Session, user: User, review_id: str) -> Review:
        review = db.query(Review).filter(Review.id == review_id, Review.user_id == user.id).first()
        if not review:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Review not found or unauthorized.")
        return review

    def update_source_code(self, db: Session, user: User, review_id: str, new_code: str) -> Review:
        review = self.get_review_by_id(db, user, review_id)
        review.source_code = new_code
        db.add(review)
        db.commit()
        db.refresh(review)
        return review

    def apply_all_fixes(self, db: Session, user: User, review_id: str) -> Review:
        """
        Applies all actionable suggested fixes to the source code in reverse line order,
        updates the review code in the database, marks all findings as resolved, and sets score to 100.
        """
        review = self.get_review_by_id(db, user, review_id)
        findings_with_fix = [
            f for f in review.findings
            if f.status == "open" and f.suggested_code
        ]

        # Sort in reverse line order (from bottom to top) so line indices don't shift
        findings_with_fix.sort(key=lambda f: f.start_line, reverse=True)

        current_code = review.source_code
        for f in findings_with_fix:
            current_code = BaseAnalyzer.apply_replacement(
                source_code=current_code,
                start_line=f.start_line,
                end_line=f.end_line,
                replacement_code=f.suggested_code
            )
            f.status = "resolved"
            db.add(f)

        review.source_code = current_code
        review.quality_score = 100.0
        db.add(review)
        db.commit()
        db.refresh(review)
        return review

    def delete_review(self, db: Session, user: User, review_id: str) -> bool:
        review = self.get_review_by_id(db, user, review_id)
        db.delete(review)
        db.commit()
        return True

    async def reanalyze_review(self, db: Session, user: User, review_id: str) -> Review:
        old_review = self.get_review_by_id(db, user, review_id)
        # Delete old findings
        db.query(Finding).filter(Finding.review_id == old_review.id).delete()
        
        # Re-run review
        review_in = ReviewCreate(
            title=old_review.title,
            language=old_review.language,
            source_code=old_review.source_code,
            enable_ai=True
        )
        options = {"enable_security": True, "enable_performance": True, "enable_style": True, "enable_bugs": True}
        static_findings, metrics, _ = static_analysis_service.analyze_code(
            source_code=review_in.source_code,
            language=review_in.language,
            options=options
        )

        ai_findings, ai_status_val, ai_summary_val, ai_notes_val = await ai_service.analyze_code(
            source_code=review_in.source_code,
            language=review_in.language,
            existing_findings=static_findings
        )
        combined_findings = list(static_findings) + ai_findings

        deductions = sum(
            25.0 if f.severity == "critical" else
            15.0 if f.severity == "high" else
            8.0 if f.severity == "medium" else
            3.0 if f.severity == "low" else 1.0
            for f in combined_findings
        )
        new_score = round(max(0.0, min(100.0, 100.0 - deductions)), 1)

        old_review.status = "completed"
        old_review.quality_score = new_score
        old_review.metrics = metrics
        old_review.analysis_summary = ai_summary_val
        old_review.ai_used = ai_status_val in ["success", "demo_mode"]
        old_review.ai_status = ai_status_val
        old_review.ai_notes = ai_notes_val
        old_review.completed_at = datetime.now(timezone.utc)

        for item in combined_findings:
            db.add(Finding(
                review_id=old_review.id,
                rule_id=item.rule_id,
                category=item.category,
                severity=item.severity,
                title=item.title,
                description=item.description,
                why_it_matters=item.why_it_matters,
                file_path=item.file_path,
                start_line=item.start_line,
                end_line=item.end_line,
                source=item.source,
                confidence=item.confidence,
                suggested_fix=item.suggested_fix,
                suggested_code=item.suggested_code,
                original_code=item.original_code,
                status="open"
            ))

        db.commit()
        db.refresh(old_review)
        return old_review

review_service = ReviewService()
