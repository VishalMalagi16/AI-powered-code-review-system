import { apiClient } from './client';
import { Review, ReviewListResponse } from '@/types';

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

export const reviewsApi = {
  create: async (params: CreateReviewParams): Promise<Review> => {
    const { data } = await apiClient.post<Review>('/reviews', params);
    return data;
  },

  list: async (params?: ListReviewsParams): Promise<ReviewListResponse> => {
    const { data } = await apiClient.get<ReviewListResponse>('/reviews', { params });
    return data;
  },

  getById: async (id: string): Promise<Review> => {
    const { data } = await apiClient.get<Review>(`/reviews/${id}`);
    return data;
  },

  delete: async (id: string): Promise<{ message: string }> => {
    const { data } = await apiClient.delete<{ message: string }>(`/reviews/${id}`);
    return data;
  },

  reanalyze: async (id: string): Promise<Review> => {
    const { data } = await apiClient.post<Review>(`/reviews/${id}/reanalyze`);
    return data;
  },

  updateCode: async (id: string, source_code: string): Promise<Review> => {
    const { data } = await apiClient.put<Review>(`/reviews/${id}/code`, { source_code });
    return data;
  },

  applyAllFixes: async (id: string): Promise<Review> => {
    const { data } = await apiClient.post<Review>(`/reviews/${id}/apply-all-fixes`);
    return data;
  },
};
