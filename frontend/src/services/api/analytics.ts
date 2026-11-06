import { apiClient, isClientOnlyMode } from './client';
import { AnalyticsOverview, AnalyticsTrends } from '@/types';
import { getLocalReviews } from '../clientEngine';

const computeLocalOverview = (): AnalyticsOverview => {
  const reviews = getLocalReviews();
  const allFindings = reviews.flatMap((r) => r.findings);

  const severities = {
    critical: allFindings.filter((f) => f.severity === 'critical').length,
    high: allFindings.filter((f) => f.severity === 'high').length,
    medium: allFindings.filter((f) => f.severity === 'medium').length,
    low: allFindings.filter((f) => f.severity === 'low').length,
    informational: allFindings.filter((f) => f.severity === 'informational').length,
  };

  const categories = {
    security: allFindings.filter((f) => f.category === 'security').length,
    bug: allFindings.filter((f) => f.category === 'bug').length,
    performance: allFindings.filter((f) => f.category === 'performance').length,
    style: allFindings.filter((f) => f.category === 'style').length,
    maintainability: allFindings.filter((f) => f.category === 'maintainability').length,
    best_practice: allFindings.filter((f) => f.category === 'best_practice').length,
  };

  const langMap: Record<string, number> = {};
  reviews.forEach((r) => {
    langMap[r.language] = (langMap[r.language] || 0) + 1;
  });
  const totalRev = reviews.length || 1;
  const languages = Object.entries(langMap).map(([language, count]) => ({
    language,
    count,
    percentage: Math.round((count / totalRev) * 100),
  }));

  const avgScore = reviews.length > 0
    ? Math.round((reviews.reduce((acc, r) => acc + r.quality_score, 0) / reviews.length) * 10) / 10
    : 100;

  return {
    total_reviews: reviews.length,
    total_findings: allFindings.length,
    critical_high_count: severities.critical + severities.high,
    resolved_count: allFindings.filter((f) => f.status === 'resolved').length,
    dismissed_count: allFindings.filter((f) => f.status === 'dismissed').length,
    average_quality_score: avgScore,
    severities,
    categories,
    languages: languages.length > 0 ? languages : [{ language: 'python', count: 1, percentage: 100 }],
    recent_activity: reviews.slice(0, 5).map((r) => ({
      id: r.id,
      type: 'code_review',
      title: r.title,
      language: r.language,
      quality_score: r.quality_score,
      findings_count: r.findings.length,
      created_at: r.created_at,
    })),
  };
};

const computeLocalTrends = (): AnalyticsTrends => {
  const reviews = getLocalReviews();
  return {
    trends: [
      {
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        reviews_count: reviews.length || 1,
        average_quality_score: 92,
        issues_found: reviews.flatMap((r) => r.findings).length || 2,
      },
    ],
  };
};

export const analyticsApi = {
  getOverview: async (): Promise<AnalyticsOverview> => {
    if (isClientOnlyMode) {
      return computeLocalOverview();
    }

    try {
      const { data } = await apiClient.get<AnalyticsOverview>('/analytics/overview');
      return data;
    } catch {
      return computeLocalOverview();
    }
  },

  getTrends: async (): Promise<AnalyticsTrends> => {
    if (isClientOnlyMode) {
      return computeLocalTrends();
    }

    try {
      const { data } = await apiClient.get<AnalyticsTrends>('/analytics/trends');
      return data;
    } catch {
      return computeLocalTrends();
    }
  },
};
