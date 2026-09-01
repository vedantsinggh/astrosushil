'use client';

import React from 'react';
import { useAuth } from '../lib/auth-context';

export function Header() {
  const { user } = useAuth();

  return (
    <header className="admin-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span className="badge badge-info">Internal System</span>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          Environment: <strong>Production Ready</strong>
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Logged in as</span>
            <strong style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>{user.email}</strong>
            <span
              className={`badge ${
                user.role === 'SUPER_ADMIN'
                  ? 'badge-warning'
                  : user.role === 'ADMIN'
                  ? 'badge-info'
                  : 'badge-success'
              }`}
            >
              {user.role}
            </span>
          </div>
        )}
      </div>
    </header>
  );
}
