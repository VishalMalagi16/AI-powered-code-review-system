from datetime import datetime, timedelta, timezone
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.review import Review
from app.models.finding import Finding
from app.models.user import User
from app.schemas.analytics import (
    AnalyticsOverview,
    AnalyticsTrends,
    SeverityCount,
    CategoryCount,
    LanguageDistributionItem,
    TrendItem
)

class AnalyticsService:
    def get_overview(self, db: Session, user: User) -> AnalyticsOverview:
        reviews = db.query(Review).filter(Review.user_id == user.id).all()
        review_ids = [r.id for r in reviews]

        if not reviews:
            return AnalyticsOverview(
                total_reviews=0,
                total_findings=0,
                critical_high_count=0,
                resolved_count=0,
                dismissed_count=0,
                average_quality_score=100.0,
                severities=SeverityCount(),
                categories=CategoryCount(),
                languages=[],
                recent_activity=[]
            )

        findings = db.query(Finding).filter(Finding.review_id.in_(review_ids)).all() if review_ids else []

        sev_counts = SeverityCount()
        cat_counts = CategoryCount()
        crit_high = 0
        resolved = 0
        dismissed = 0

        for f in findings:
            if f.severity == "critical":
                sev_counts.critical += 1
                crit_high += 1
            elif f.severity == "high":
                sev_counts.high += 1
                crit_high += 1
            elif f.severity == "medium":
                sev_counts.medium += 1
            elif f.severity == "low":
                sev_counts.low += 1
            elif f.severity == "informational":
                sev_counts.informational += 1

            if f.status == "resolved":
                resolved += 1
            elif f.status == "dismissed":
                dismissed += 1

            cat_key = f.category.lower()
            if cat_key == "security":
                cat_counts.security += 1
            elif cat_key == "bug":
                cat_counts.bug += 1
            elif cat_key == "performance":
                cat_counts.performance += 1
            elif cat_key == "style":
                cat_counts.style += 1
            elif cat_key == "maintainability":
                cat_counts.maintainability += 1
            else:
                cat_counts.best_practice += 1

        # Language distribution
        lang_counts: Dict[str, int] = {}
        for r in reviews:
            lang = r.language.capitalize()
            lang_counts[lang] = lang_counts.get(lang, 0) + 1

        lang_dist: List[LanguageDistributionItem] = []
        total_rev = len(reviews)
        for lang, count in sorted(lang_counts.items(), key=lambda x: x[1], reverse=True):
            pct = round((count / total_rev) * 100.0, 1)
            lang_dist.append(LanguageDistributionItem(language=lang, count=count, percentage=pct))

        avg_score = round(sum(r.quality_score for r in reviews) / total_rev, 1) if total_rev > 0 else 100.0

        # Recent activity (last 5 reviews)
        recent_activity = []
        for r in reviews[:6]:
            recent_activity.append({
                "id": r.id,
                "type": "review",
                "title": r.title,
                "language": r.language,
                "quality_score": r.quality_score,
                "findings_count": len(r.findings),
                "created_at": r.created_at.isoformat()
            })

        return AnalyticsOverview(
            total_reviews=total_rev,
            total_findings=len(findings),
            critical_high_count=crit_high,
            resolved_count=resolved,
            dismissed_count=dismissed,
            average_quality_score=avg_score,
            severities=sev_counts,
            categories=cat_counts,
            languages=lang_dist,
            recent_activity=recent_activity
        )

    def get_trends(self, db: Session, user: User) -> AnalyticsTrends:
        reviews = db.query(Review).filter(Review.user_id == user.id).order_by(Review.created_at.asc()).all()
        
        # Group reviews by date (YYYY-MM-DD)
        date_map: Dict[str, List[Review]] = {}
        for r in reviews:
            date_str = r.created_at.strftime("%Y-%m-%d")
            if date_str not in date_map:
                date_map[date_str] = []
            date_map[date_str].append(r)

        trend_items: List[TrendItem] = []
        for d_str, rev_list in date_map.items():
            count = len(rev_list)
            avg_score = round(sum(r.quality_score for r in rev_list) / count, 1)
            issues_found = sum(len(r.findings) for r in rev_list)
            trend_items.append(TrendItem(
                date=d_str,
                reviews_count=count,
                average_quality_score=avg_score,
                issues_found=issues_found
            ))

        return AnalyticsTrends(trends=trend_items)

analytics_service = AnalyticsService()
