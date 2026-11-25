'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiFetch, setBrowserCsrfToken } from './api-client';

export interface StaffRoleSummary {
  id: string | null;
  name: string;
  slug: string;
  isSuperAdmin: boolean;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface AdminUser {
  id: string;
  email: string;
  fullName?: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'SUPPORT';
  isSuperAdmin?: boolean;
  staffRole?: StaffRoleSummary | null;
  permissions: string[];
}

interface AuthContextType {
  user: AdminUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    localStorage.removeItem('admin_access_token');
    localStorage.removeItem('admin_user_data');
    void (async () => {
      try {
        const csrf = await apiFetch<{ csrfToken: string }>('/api/v1/auth/csrf');
        setBrowserCsrfToken(csrf.csrfToken);
        const profile = await apiFetch<AdminUser>('/api/v1/admin/auth/me');
        if (active) setUser(profile);
      } catch {
        if (active) setUser(null);
      } finally {
        if (active) setIsLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await apiFetch<{
        user: {
          id: string;
          email: string;
          fullName?: string;
          role: 'SUPER_ADMIN' | 'ADMIN' | 'SUPPORT';
          isSuperAdmin?: boolean;
          staffRole?: StaffRoleSummary | null;
        };
        permissions: string[];
        csrfToken: string;
      }>('/api/v1/admin/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      const adminUser: AdminUser = {
        ...res.user,
        isSuperAdmin: res.user.isSuperAdmin,
        staffRole: res.user.staffRole ?? null,
        permissions: res.permissions || [],
      };

      setBrowserCsrfToken(res.csrfToken);
      setUser(adminUser);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    apiFetch('/api/v1/admin/auth/logout', { method: 'POST', body: JSON.stringify({}) }).catch(() => {});
    setBrowserCsrfToken(null);
    setUser(null);
  };

  const hasPermissionCheck = (permission: string) => {
    if (!user) return false;
    if (user.isSuperAdmin || user.role === 'SUPER_ADMIN') return true;
    return user.permissions ? user.permissions.includes(permission) : false;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
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
