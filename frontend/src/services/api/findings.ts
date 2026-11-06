import { apiClient, isClientOnlyMode } from './client';
import { Finding, FindingStatus } from '@/types';
import { getLocalReviews, saveLocalReview, applyReplacement } from '../clientEngine';

const getClientFindingById = (id: string): Finding | null => {
  for (const rev of getLocalReviews()) {
    const f = rev.findings.find((item) => item.id === id);
    if (f) return f;
  }
  return null;
};

const updateClientFindingStatus = (
  id: string,
  status: FindingStatus,
  apply_to_code?: boolean
): Finding | null => {
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
  return null;
};

export const findingsApi = {
  getById: async (id: string): Promise<Finding> => {
    if (isClientOnlyMode) {
      const f = getClientFindingById(id);
      if (f) return f;
    }

    try {
      const { data } = await apiClient.get<Finding>(`/findings/${id}`);
      return data;
    } catch (err: any) {
      if (isClientOnlyMode || err.code === 'ERR_NETWORK' || !err.response || err.message?.includes('Network')) {
        const f = getClientFindingById(id);
        if (f) return f;
      }
      throw err;
    }
  },

  updateStatus: async (
    id: string,
    status: FindingStatus,
    apply_to_code?: boolean
  ): Promise<Finding> => {
    if (isClientOnlyMode) {
      const updated = updateClientFindingStatus(id, status, apply_to_code);
      if (updated) return updated;
    }

    try {
      const { data } = await apiClient.patch<Finding>(`/findings/${id}`, {
        status,
        apply_to_code: apply_to_code ?? false,
      });
      return data;
    } catch (err: any) {
      if (isClientOnlyMode || err.code === 'ERR_NETWORK' || !err.response || err.message?.includes('Network')) {
        const updated = updateClientFindingStatus(id, status, apply_to_code);
        if (updated) return updated;
      }
      throw err;
    }
  },
};
