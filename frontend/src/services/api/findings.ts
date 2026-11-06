import { apiClient } from './client';
import { Finding, FindingStatus } from '@/types';
import { getLocalReviews, saveLocalReview, applyReplacement } from '../clientEngine';

export const findingsApi = {
  getById: async (id: string): Promise<Finding> => {
    try {
      const { data } = await apiClient.get<Finding>(`/findings/${id}`);
      return data;
    } catch (err: any) {
      if (err.code === 'ERR_NETWORK' || !err.response) {
        for (const rev of getLocalReviews()) {
          const f = rev.findings.find((item) => item.id === id);
          if (f) return f;
        }
      }
      throw err;
    }
  },

  updateStatus: async (
    id: string,
    status: FindingStatus,
    apply_to_code?: boolean
  ): Promise<Finding> => {
    try {
      const { data } = await apiClient.patch<Finding>(`/findings/${id}`, {
        status,
        apply_to_code: apply_to_code ?? false,
      });
      return data;
    } catch (err: any) {
      if (err.code === 'ERR_NETWORK' || !err.response) {
        for (const rev of getLocalReviews()) {
          const f = rev.findings.find((item) => item.id === id);
          if (f) {
            f.status = status;
            let updatedSource = rev.source_code;
            if (apply_to_code && status === 'resolved' && f.suggested_code) {
              updatedSource = applyReplacement(
                rev.source_code,
                f.start_line,
                f.end_line || f.start_line,
                f.suggested_code
              );
              rev.source_code = updatedSource;
              f.updated_source_code = updatedSource;
            }
            saveLocalReview(rev);
            return {
              ...f,
              updated_source_code: updatedSource,
            };
          }
        }
      }
      throw err;
    }
  },
};
