import { apiClient } from './client';
import { Finding, FindingStatus } from '@/types';

export const findingsApi = {
  getById: async (id: string): Promise<Finding> => {
    const { data } = await apiClient.get<Finding>(`/findings/${id}`);
    return data;
  },

  updateStatus: async (
    id: string,
    status: FindingStatus,
    apply_to_code?: boolean
  ): Promise<Finding> => {
    const { data } = await apiClient.patch<Finding>(`/findings/${id}`, {
      status,
      apply_to_code: apply_to_code ?? false,
    });
    return data;
  },
};
