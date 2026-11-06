import { apiClient } from './client';
import { SupportedLanguage, SystemHealth } from '@/types';
import { CLIENT_SUPPORTED_LANGUAGES } from '../clientEngine';

export const systemApi = {
  getHealth: async (): Promise<SystemHealth> => {
    try {
      const { data } = await apiClient.get<SystemHealth>('/health');
      return data;
    } catch {
      return {
        status: 'healthy',
        version: '1.0.0 (Client Demo Mode)',
        database_connected: true,
        ai_status: {
          configured: true,
          provider: 'client_heuristic',
          fallback_enabled: true,
        },
      };
    }
  },

  getLanguages: async (): Promise<SupportedLanguage[]> => {
    try {
      const { data } = await apiClient.get<SupportedLanguage[]>('/languages');
      return data;
    } catch {
      return CLIENT_SUPPORTED_LANGUAGES;
    }
  },
};
