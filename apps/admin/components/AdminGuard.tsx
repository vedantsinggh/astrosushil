'use client';

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '../lib/auth-context';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, token, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const isLoginPage = pathname === '/login' || pathname === '/admin/login';

  useEffect(() => {
    if (!isLoading && !token && !isLoginPage) {
      router.push('/login');
    }
  }, [token, isLoading, isLoginPage, router]);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-main)' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="skeleton" style={{ width: '120px', height: '24px', margin: '0 auto 1rem auto' }} />
          <p style={{ color: 'var(--text-secondary)' }}>Initializing Astro Sushil Admin...</p>
        </div>
      </div>
    );
  }

  if (isLoginPage) {
    return <>{children}</>;
  }

  if (!user && !isLoginPage) {
    return null;
  }

  return (
    <div className="admin-layout">
      <Sidebar />
      <div className="admin-content">
        <Header />
        <main className="admin-main">{children}</main>
      </div>
    </div>
  );
}
