import { apiClient } from './client';
import { AnalyticsOverview, AnalyticsTrends } from '@/types';

export const analyticsApi = {
  getOverview: async (): Promise<AnalyticsOverview> => {
    const { data } = await apiClient.get<AnalyticsOverview>('/analytics/overview');
    return data;
  },

  getTrends: async (): Promise<AnalyticsTrends> => {
    const { data } = await apiClient.get<AnalyticsTrends>('/analytics/trends');
    return data;
  },
};
