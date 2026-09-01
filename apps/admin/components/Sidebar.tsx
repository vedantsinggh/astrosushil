'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../lib/auth-context';

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout, hasPermission } = useAuth();

  const navItems = [
    { label: 'Dashboard', href: '/dashboard', perm: 'dashboard:read', icon: '📊' },
    { label: 'Analytics', href: '/analytics', perm: 'analytics:read', icon: '📈' },
    { label: 'Users', href: '/users', perm: 'users:read', icon: '👥' },
    { label: 'Birth Profiles', href: '/birth-profiles', perm: 'birth_profiles:read', icon: '🔮' },
    { label: 'Career Reports', href: '/reports', perm: 'reports:read', icon: '📜' },
    { label: 'Subscriptions', href: '/subscriptions', perm: 'subscriptions:read', icon: '💳' },
    { label: 'Payments', href: '/payments', perm: 'payments:read', icon: '💰' },
    { label: 'Notifications', href: '/notifications', perm: 'notifications:read', icon: '🔔' },
    { label: 'Astrology Intelligence', href: '/astrology-diagnostics', perm: 'birth_profiles:read', icon: '✨' },
    { label: 'Product Plans', href: '/plans', perm: 'plans:read', icon: '🏷️' },
    { label: 'Admin Staff', href: '/admin-users', perm: 'users:read', icon: '🛡️' },
    { label: 'Jyoti AI', href: '/jyoti', perm: 'jyoti:read', icon: '💬' },
    { label: 'System Health', href: '/system', perm: 'system:read', icon: '⚡' },
    { label: 'Audit Log', href: '/audit-log', perm: 'audit_log:read', icon: '📋' },
  ];

  return (
    <aside className="admin-sidebar">
      <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border-color-dark)' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#FFF', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>✨</span> Astro Sushil Admin
        </h2>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>Ops & Support Console</p>
      </div>

      <nav style={{ padding: '1rem 0.5rem', flex: 1, overflowY: 'auto' }}>
        {navItems.map((item) => {
          if (!hasPermission(item.perm)) return null;
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.65rem 0.85rem',
                borderRadius: 'var(--radius-sm)',
                marginBottom: '0.25rem',
                color: isActive ? '#FFF' : 'var(--text-sidebar)',
                backgroundColor: isActive ? 'var(--accent-primary)' : 'transparent',
                fontWeight: isActive ? 600 : 400,
                textDecoration: 'none',
              }}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {user && (
        <div style={{ padding: '1rem', borderTop: '1px solid var(--border-color-dark)', background: 'rgba(0,0,0,0.2)' }}>
          <div style={{ marginBottom: '0.5rem' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#FFF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user.fullName || user.email}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--accent-gold)', fontWeight: 600, marginTop: '0.1rem' }}>
              {user.role}
            </div>
          </div>
          <button
            onClick={logout}
            className="btn btn-secondary"
            style={{ width: '100%', fontSize: '0.75rem', padding: '0.35rem 0.5rem', background: '#334155', color: '#FFF', border: 'none' }}
          >
            Sign Out
          </button>
        </div>
      )}
    </aside>
  );
}
