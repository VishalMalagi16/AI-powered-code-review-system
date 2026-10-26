import { apiClient } from './client';
import { SupportedLanguage, SystemHealth } from '@/types';

export const systemApi = {
  getHealth: async (): Promise<SystemHealth> => {
    const { data } = await apiClient.get<SystemHealth>('/health');
    return data;
  },

  getLanguages: async (): Promise<SupportedLanguage[]> => {
    const { data } = await apiClient.get<SupportedLanguage[]>('/languages');
    return data;
  },
};
