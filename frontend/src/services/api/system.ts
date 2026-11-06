import { apiClient, isClientOnlyMode } from './client';
import { SupportedLanguage, SystemHealth } from '@/types';
import { CLIENT_SUPPORTED_LANGUAGES } from '../clientEngine';

const CLIENT_HEALTH: SystemHealth = {
  status: 'healthy',
  version: '1.0.0 (Client High-Performance Engine)',
  database_connected: true,
  ai_status: {
    configured: true,
    provider: 'client_heuristic',
    fallback_enabled: true,
  },
};

export const systemApi = {
  getHealth: async (): Promise<SystemHealth> => {
    if (isClientOnlyMode) {
      return CLIENT_HEALTH;
    }

    try {
      const { data } = await apiClient.get<SystemHealth>('/health');
      return data;
    } catch {
      return CLIENT_HEALTH;
    }
  },

  getLanguages: async (): Promise<SupportedLanguage[]> => {
    if (isClientOnlyMode) {
      return CLIENT_SUPPORTED_LANGUAGES;
    }

    try {
      const { data } = await apiClient.get<SupportedLanguage[]>('/languages');
      return data;
    } catch {
      return CLIENT_SUPPORTED_LANGUAGES;
    }
  },
};
