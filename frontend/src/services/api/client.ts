import axios, { AxiosError } from 'axios';

// Normalize VITE_API_URL so any of https://api.com, https://api.com/, or https://api.com/api/v1 works seamlessly
const rawApiUrl = (import.meta.env.VITE_API_URL as string | undefined)?.trim();

const isBrowser = typeof window !== 'undefined';
export const isCloudDeployment = isBrowser && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';

// If no custom backend URL is provided and we are running in the cloud (e.g. Vercel),
// client-only mode runs entirely in the browser using the clientEngine without needing an external server.
export const isClientOnlyMode = !rawApiUrl && isCloudDeployment;

const resolveApiBaseUrl = (): string => {
  if (!rawApiUrl) {
    return isCloudDeployment ? '/api/v1' : 'http://127.0.0.1:8000/api/v1';
  }
  const cleanUrl = rawApiUrl.replace(/\/+$/, '');
  if (cleanUrl.endsWith('/api/v1')) {
    return cleanUrl;
  }
  if (cleanUrl.endsWith('/api')) {
    return `${cleanUrl}/v1`;
  }
  return `${cleanUrl}/api/v1`;
};

export const API_BASE_URL = resolveApiBaseUrl();

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Request Interceptor: Attach JWT Bearer Token if present
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('codeguard_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Centralized error handling and 401 handling
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ detail?: string }>) => {
    if (error.response?.status === 401) {
      // Clear token if expired or unauthorized
      const currentPath = window.location.pathname;
      if (currentPath !== '/login' && currentPath !== '/register' && currentPath !== '/') {
        localStorage.removeItem('codeguard_token');
        localStorage.removeItem('codeguard_user');
        window.location.href = '/login?expired=1';
      }
    }
    return Promise.reject(error);
  }
);
