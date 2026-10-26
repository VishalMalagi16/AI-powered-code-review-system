import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '@/types';
import { authApi } from '@/services/api/auth';
import { useToast } from './ToastContext';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (updated: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { success, error: toastError } = useToast();

  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem('codeguard_token');
      if (token) {
        try {
          const profile = await authApi.getMe();
          setUser(profile);
          localStorage.setItem('codeguard_user', JSON.stringify(profile));
        } catch {
          localStorage.removeItem('codeguard_token');
          localStorage.removeItem('codeguard_user');
          setUser(null);
        }
      }
      setIsLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const resp = await authApi.login(email, password);
      localStorage.setItem('codeguard_token', resp.access_token);
      localStorage.setItem('codeguard_user', JSON.stringify(resp.user));
      setUser(resp.user);
      success(`Welcome back, ${resp.user.name}!`, 'Signed In');
    } catch (err: any) {
      const msg = err.response?.data?.detail 
        || (err.code === 'ERR_NETWORK' || !err.response 
            ? 'Cannot connect to backend server. Please verify the FastAPI backend is running on http://127.0.0.1:8000.' 
            : 'Authentication failed. Please check credentials.');
      toastError(msg, 'Login Error');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (name: string, email: string, password: string) => {
    setIsLoading(true);
    try {
      const resp = await authApi.register(name, email, password);
      localStorage.setItem('codeguard_token', resp.access_token);
      localStorage.setItem('codeguard_user', JSON.stringify(resp.user));
      setUser(resp.user);
      success('Account created successfully!', 'Registration Complete');
    } catch (err: any) {
      const msg = err.response?.data?.detail 
        || (err.code === 'ERR_NETWORK' || !err.response 
            ? 'Cannot connect to backend server. Please verify the FastAPI backend is running on http://127.0.0.1:8000.' 
            : 'Registration failed.');
      toastError(msg, 'Registration Error');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } finally {
      localStorage.removeItem('codeguard_token');
      localStorage.removeItem('codeguard_user');
      setUser(null);
      success('You have been logged out securely.', 'Signed Out');
    }
  };

  const updateUser = (updated: Partial<User>) => {
    setUser((prev) => (prev ? { ...prev, ...updated } : null));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
