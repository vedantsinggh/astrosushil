'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiFetch } from './api-client';

export interface AdminUser {
  id: string;
  email: string;
  fullName?: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'SUPPORT';
  permissions: string[];
}

interface AuthContextType {
  user: AdminUser | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem('admin_access_token');
    const savedUser = localStorage.getItem('admin_user_data');

    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      } catch (err) {
        localStorage.removeItem('admin_access_token');
        localStorage.removeItem('admin_user_data');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await apiFetch<{
        user: { id: string; email: string; fullName?: string; role: 'SUPER_ADMIN' | 'ADMIN' | 'SUPPORT' };
        permissions: string[];
        tokens: { accessToken: string; refreshToken: string };
      }>('/api/v1/admin/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      const adminUser: AdminUser = {
        ...res.user,
        permissions: res.permissions || [],
      };

      setToken(res.tokens.accessToken);
      setUser(adminUser);

      localStorage.setItem('admin_access_token', res.tokens.accessToken);
      localStorage.setItem('admin_user_data', JSON.stringify(adminUser));
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    if (token) {
      apiFetch('/api/v1/admin/auth/logout', {
        method: 'POST',
        token,
      }).catch(() => {});
    }
    setToken(null);
    setUser(null);
    localStorage.removeItem('admin_access_token');
    localStorage.removeItem('admin_user_data');
  };

  const hasPermissionCheck = (permission: string) => {
    if (!user) return false;
    if (user.role === 'SUPER_ADMIN') return true;
    return user.permissions ? user.permissions.includes(permission) : false;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        logout,
        hasPermission: hasPermissionCheck,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
