'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '../lib/auth-context';
import { Icon } from './icons';

function initialsOf(name: string): string {
  const parts = name.trim().split(/[\s@._-]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || 'A';
}

export function Header({ onMenuToggle }: { onMenuToggle?: () => void }) {
  const { user, logout } = useAuth();
  const env = process.env.NEXT_PUBLIC_APP_ENV || process.env.NODE_ENV || '';
  const showEnv = env !== '' && env !== 'production';
  const name = user?.fullName || user?.email || '';

  return (
    <header className="admin-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {onMenuToggle && (
          <button type="button" className="admin-menu-toggle" onClick={onMenuToggle} aria-label="Open the menu">
            <Icon name="menu" size={18} />
          </button>
        )}
        {showEnv && (
          <span className="badge badge-warning" title="This is not the live system">
            {env.toUpperCase()}
          </span>
        )}
      </div>

      {user && (
        <div className="user-chip">
          <Link href="/profile" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', textDecoration: 'none' }} title="My profile and password">
            <span className="avatar">{initialsOf(name)}</span>
            <span style={{ lineHeight: 1.15 }}>
              <span style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-primary)' }}>{name}</span>
              <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)' }}>{user.staffRole?.name || user.role}</span>
            </span>
          </Link>
          <button type="button" className="btn btn-secondary" onClick={logout} style={{ padding: '0.35rem 0.6rem' }} title="Sign out">
            <Icon name="logout" size={15} />
            <span>Sign out</span>
          </button>
        </div>
      )}
    </header>
  );
}
