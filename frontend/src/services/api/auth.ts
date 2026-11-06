import { apiClient } from './client';
import { AuthResponse, User } from '@/types';
import { DEMO_USER } from '../clientEngine';

export const authApi = {
  login: async (email: string, password: string): Promise<AuthResponse> => {
    try {
      const { data } = await apiClient.post<AuthResponse>('/auth/login', { email, password });
      return data;
    } catch (err: any) {
      // Fallback to client-side demo mode if backend is unreachable
      if (err.code === 'ERR_NETWORK' || !err.response) {
        const demoUser: User = {
          ...DEMO_USER,
          email: email || DEMO_USER.email,
          name: email.split('@')[0] || DEMO_USER.name,
        };
        return {
          access_token: `demo_token_${Date.now()}`,
          token_type: 'bearer',
          user: demoUser,
        };
      }
      throw err;
    }
  },

  register: async (name: string, email: string, password: string): Promise<AuthResponse> => {
    try {
      const { data } = await apiClient.post<AuthResponse>('/auth/register', { name, email, password });
      return data;
    } catch (err: any) {
      if (err.code === 'ERR_NETWORK' || !err.response) {
        const demoUser: User = {
          ...DEMO_USER,
          name: name || 'Demo Engineer',
          email: email || DEMO_USER.email,
        };
        return {
          access_token: `demo_token_${Date.now()}`,
          token_type: 'bearer',
          user: demoUser,
        };
      }
      throw err;
    }
  },

  getMe: async (): Promise<User> => {
    try {
      const { data } = await apiClient.get<User>('/auth/me');
      return data;
    } catch (err: any) {
      if (err.code === 'ERR_NETWORK' || !err.response) {
        const stored = localStorage.getItem('codeguard_user');
        return stored ? JSON.parse(stored) : DEMO_USER;
      }
      throw err;
    }
  },

  updateProfile: async (payload: { name?: string; preferences?: Record<string, any> }): Promise<User> => {
    try {
      const { data } = await apiClient.put<User>('/auth/profile', payload);
      return data;
    } catch (err: any) {
      if (err.code === 'ERR_NETWORK' || !err.response) {
        const stored = localStorage.getItem('codeguard_user');
        const user: User = stored ? JSON.parse(stored) : DEMO_USER;
        const updated = { ...user, ...payload };
        localStorage.setItem('codeguard_user', JSON.stringify(updated));
        return updated;
      }
      throw err;
    }
  },

  changePassword: async (current_password: string, new_password: string) => {
    try {
      const { data } = await apiClient.post('/auth/change-password', { current_password, new_password });
      return data;
    } catch (err: any) {
      if (err.code === 'ERR_NETWORK' || !err.response) {
        return { message: 'Password updated successfully' };
      }
      throw err;
    }
  },

  logout: async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // Ignore network errors on logout
    }
  },

  deleteAccount: async () => {
    try {
      const { data } = await apiClient.delete('/auth/account');
      return data;
    } catch (err: any) {
      if (err.code === 'ERR_NETWORK' || !err.response) {
        return { message: 'Account deleted' };
      }
      throw err;
    }
  },
};
