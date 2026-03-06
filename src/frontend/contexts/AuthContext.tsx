import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import api from '../services/api';
import type { User } from '@shared/types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; requiresDeviceVerification?: boolean }>;
  logout: () => Promise<void>;
  register: (email: string, password: string, username?: string) => Promise<{ success: boolean; error?: string }>;
  verifyDevice: (email: string, code: string) => Promise<{ success: boolean; error?: string }>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const response = await api.auth.getMe();
      if (response.success && response.user) {
        setUser(response.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (email: string, password: string) => {
    const response = await api.auth.login(email, password);

    if (response.success) {
      if (response.user) {
        setUser(response.user);
      }
      return {
        success: true,
        requiresDeviceVerification: response.requiresDeviceVerification,
      };
    }

    return { success: false, error: response.error };
  };

  const logout = async () => {
    await api.auth.logout();
    setUser(null);
  };

  const register = async (email: string, password: string, username?: string) => {
    const response = await api.auth.register(email, password, username);
    return { success: response.success, error: response.error };
  };

  const verifyDevice = async (email: string, code: string) => {
    const response = await api.auth.verifyDevice(email, code);

    if (response.success && response.user) {
      setUser(response.user);
    }

    return { success: response.success, error: response.error };
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        register,
        verifyDevice,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
