import { apiClient } from './client';
import { AuthResponse, User } from '@/types';

export const authApi = {
  login: async (email: string, password: string):Promise<AuthResponse> => {
    const { data } = await apiClient.post<AuthResponse>('/auth/login', { email, password });
    return data;
  },

  register: async (name: string, email: string, password: string): Promise<AuthResponse> => {
    const { data } = await apiClient.post<AuthResponse>('/auth/register', { name, email, password });
    return data;
  },

  getMe: async (): Promise<User> => {
    const { data } = await apiClient.get<User>('/auth/me');
    return data;
  },

  updateProfile: async (payload: { name?: string; preferences?: Record<string, any> }): Promise<User> => {
    const { data } = await apiClient.put<User>('/auth/profile', payload);
    return data;
  },

  changePassword: async (current_password: string, new_password: string) => {
    const { data } = await apiClient.post('/auth/change-password', { current_password, new_password });
    return data;
  },

  logout: async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // Ignore network errors on logout
    }
  },

  deleteAccount: async () => {
    const { data } = await apiClient.delete('/auth/account');
    return data;
  },
};
