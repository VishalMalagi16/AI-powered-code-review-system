import { apiClient, isClientOnlyMode } from './client';
import { Review, ReviewListResponse } from '@/types';
import {
  analyzeCodeClient,
  computeMetricsClient,
  getLocalReviews,
  saveLocalReview,
  applyReplacement,
  DEMO_USER,
} from '../clientEngine';

export interface CreateReviewParams {
  title?: string;
  language: string;
  source_code: string;
  enable_ai?: boolean;
  enable_security?: boolean;
  enable_performance?: boolean;
  enable_style?: boolean;
  enable_bugs?: boolean;
}

export interface ListReviewsParams {
  language?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

const performClientAnalysis = (params: CreateReviewParams): Review => {
  const findings = analyzeCodeClient(params.source_code, params.language);
  const metrics = computeMetricsClient(params.source_code);

  let deductions = 0;
  findings.forEach((f) => {
    if (f.severity === 'critical') deductions += 25;
    else if (f.severity === 'high') deductions += 15;
    else if (f.severity === 'medium') deductions += 8;
    else if (f.severity === 'low') deductions += 3;
    else deductions += 1;
  });
  const quality_score = Math.max(0, Math.min(100, Math.round((100 - deductions) * 10) / 10));

  const review: Review = {
    id: `rev_${Date.now()}`,
    user_id: DEMO_USER.id,
    title: params.title || `${params.language.toUpperCase()} Audit - ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
    language: params.language,
    source_code: params.source_code,
    status: 'completed',
    analysis_summary: `Audit completed: ${findings.length} findings identified.`,
    quality_score,
    metrics,
    ai_used: params.enable_ai ?? true,
    ai_status: 'demo_mode',
    ai_notes: 'Executed in high-performance browser analysis mode.',
    created_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
    findings,
  };

  saveLocalReview(review);
  return review;
};

const getClientReviewList = (params?: ListReviewsParams): ReviewListResponse => {
  let items = getLocalReviews();
  if (params?.language && params.language !== 'all') {
    items = items.filter((r) => r.language.toLowerCase() === params.language?.toLowerCase());
  }
  if (params?.search) {
    const q = params.search.toLowerCase();
    items = items.filter((r) => r.title.toLowerCase().includes(q));
  }
  return {
    items: items.map((r) => ({
      id: r.id,
      title: r.title,
      language: r.language,
      status: r.status,
      quality_score: r.quality_score,
      total_findings: r.findings.length,
      critical_findings: r.findings.filter((f) => f.severity === 'critical').length,
      high_findings: r.findings.filter((f) => f.severity === 'high').length,
      ai_used: r.ai_used,
      created_at: r.created_at,
      completed_at: r.completed_at,
    })),
    total: items.length,
    page: 1,
    limit: 20,
    total_pages: 1,
  };
};

export const reviewsApi = {
  create: async (params: CreateReviewParams): Promise<Review> => {
    if (isClientOnlyMode) {
      return performClientAnalysis(params);
    }

    try {
      const { data } = await apiClient.post<Review>('/reviews', params);
      return data;
    } catch (err: any) {
      if (isClientOnlyMode || err.code === 'ERR_NETWORK' || !err.response || err.message?.includes('Network')) {
        return performClientAnalysis(params);
      }
      throw err;
    }
  },

  list: async (params?: ListReviewsParams): Promise<ReviewListResponse> => {
    if (isClientOnlyMode) {
      return getClientReviewList(params);
    }

    try {
      const { data } = await apiClient.get<ReviewListResponse>('/reviews', { params });
      return data;
    } catch (err: any) {
      if (isClientOnlyMode || err.code === 'ERR_NETWORK' || !err.response || err.message?.includes('Network')) {
        return getClientReviewList(params);
      }
      throw err;
    }
  },

  getById: async (id: string): Promise<Review> => {
    if (isClientOnlyMode) {
      const found = getLocalReviews().find((r) => r.id === id);
      if (found) return found;
    }

    try {
      const { data } = await apiClient.get<Review>(`/reviews/${id}`);
      return data;
    } catch (err: any) {
      if (isClientOnlyMode || err.code === 'ERR_NETWORK' || !err.response || err.message?.includes('Network')) {
        const found = getLocalReviews().find((r) => r.id === id);
        if (found) return found;
      }
      throw err;
    }
  },

  delete: async (id: string): Promise<{ message: string }> => {
    if (isClientOnlyMode) {
      const list = getLocalReviews().filter((r) => r.id !== id);
      localStorage.setItem('codeguard_local_reviews', JSON.stringify(list));
      return { message: 'Review deleted successfully' };
    }

    try {
      const { data } = await apiClient.delete<{ message: string }>(`/reviews/${id}`);
      return data;
    } catch (err: any) {
      if (isClientOnlyMode || err.code === 'ERR_NETWORK' || !err.response || err.message?.includes('Network')) {
        const list = getLocalReviews().filter((r) => r.id !== id);
        localStorage.setItem('codeguard_local_reviews', JSON.stringify(list));
        return { message: 'Review deleted successfully' };
      }
      throw err;
    }
  },

  reanalyze: async (id: string): Promise<Review> => {
    if (isClientOnlyMode) {
      const review = getLocalReviews().find((r) => r.id === id);
      if (review) {
        const findings = analyzeCodeClient(review.source_code, review.language);
        review.findings = findings;
        saveLocalReview(review);
        return review;
      }
    }

    try {
      const { data } = await apiClient.post<Review>(`/reviews/${id}/reanalyze`);
      return data;
    } catch (err: any) {
      if (isClientOnlyMode || err.code === 'ERR_NETWORK' || !err.response || err.message?.includes('Network')) {
        const review = getLocalReviews().find((r) => r.id === id);
        if (review) {
          const findings = analyzeCodeClient(review.source_code, review.language);
          review.findings = findings;
          saveLocalReview(review);
          return review;
        }
      }
      throw err;
    }
  },

  updateCode: async (id: string, source_code: string): Promise<Review> => {
    if (isClientOnlyMode) {
      const review = getLocalReviews().find((r) => r.id === id);
      if (review) {
        review.source_code = source_code;
        saveLocalReview(review);
        return review;
      }
    }

    try {
      const { data } = await apiClient.put<Review>(`/reviews/${id}/code`, { source_code });
      return data;
    } catch (err: any) {
      if (isClientOnlyMode || err.code === 'ERR_NETWORK' || !err.response || err.message?.includes('Network')) {
        const review = getLocalReviews().find((r) => r.id === id);
        if (review) {
          review.source_code = source_code;
          saveLocalReview(review);
          return review;
        }
      }
      throw err;
    }
  },

  applyAllFixes: async (id: string): Promise<Review> => {
    if (isClientOnlyMode) {
      const review = getLocalReviews().find((r) => r.id === id);
      if (review) {
        const fixable = review.findings
          .filter((f) => f.status === 'open' && !!f.suggested_code)
          .sort((a, b) => b.start_line - a.start_line);

        let updatedCode = review.source_code;
        for (const f of fixable) {
          updatedCode = applyReplacement(
            updatedCode,
            f.start_line,
            f.end_line || f.start_line,
            f.suggested_code!
          );
          f.status = 'resolved';
        }

        review.source_code = updatedCode;
        review.quality_score = 100;
        saveLocalReview(review);
        return review;
      }
    }

    try {
      const { data } = await apiClient.post<Review>(`/reviews/${id}/apply-all-fixes`);
      return data;
    } catch (err: any) {
      if (isClientOnlyMode || err.code === 'ERR_NETWORK' || !err.response || err.message?.includes('Network')) {
        const review = getLocalReviews().find((r) => r.id === id);
        if (review) {
          const fixable = review.findings
            .filter((f) => f.status === 'open' && !!f.suggested_code)
            .sort((a, b) => b.start_line - a.start_line);

          let updatedCode = review.source_code;
          for (const f of fixable) {
            updatedCode = applyReplacement(
              updatedCode,
              f.start_line,
              f.end_line || f.start_line,
              f.suggested_code!
            );
            f.status = 'resolved';
          }

          review.source_code = updatedCode;
          review.quality_score = 100;
          saveLocalReview(review);
          return review;
        }
      }
      throw err;
    }
  },
};
