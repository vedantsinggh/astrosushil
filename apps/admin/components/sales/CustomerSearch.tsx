'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '../../lib/auth-context';
import { CustomerOption, errorMessage, searchCustomers } from '../../lib/api/sales';
import { tinyButton, useDebounced } from './ui';

/**
 * Search box over the customers list (`GET /admin/customers`, permission `customers:read`).
 * Calls `onPick` with the chosen customer; `excludeIds` hides customers already chosen.
 */
export function CustomerSearch({ onPick, excludeIds = [], pickLabel = 'Select' }: { onPick: (customer: CustomerOption) => void; excludeIds?: string[]; pickLabel?: string }) {
  const { hasPermission } = useAuth();
  const allowed = hasPermission('customers:read');
  const [term, setTerm] = useState('');
  const debounced = useDebounced(term, 350);
  const [results, setResults] = useState<CustomerOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!allowed) return;
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    searchCustomers(debounced, 10)
      .then((rows) => {
        if (!cancelled) setResults(rows);
      })
      .catch((err) => {
        if (!cancelled) setError(errorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debounced, allowed]);

  if (!allowed) {
    return (
      <div style={{ fontSize: '0.8rem', color: 'var(--badge-warning-text)' }}>
        Looking up customers needs the <code>customers:read</code> permission, which your account does not have.
      </div>
    );
  }

  const visible = results.filter((c) => !excludeIds.includes(c.id));

  return (
    <div>
      <input type="text" className="input-control" placeholder="Search customers by name, phone or e-mail" value={term} onChange={(e) => setTerm(e.target.value)} />
      <div style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', marginTop: '0.4rem', maxHeight: '220px', overflowY: 'auto' }}>
        {error ? (
          <div style={{ padding: '0.6rem', fontSize: '0.8rem', color: 'var(--badge-danger-text)' }}>{error}</div>
        ) : isLoading ? (
          <div style={{ padding: '0.6rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Searching…</div>
        ) : visible.length === 0 ? (
          <div style={{ padding: '0.6rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>No customers found.</div>
        ) : (
          visible.map((c) => (
            <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', padding: '0.45rem 0.6rem', borderBottom: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '0.82rem', minWidth: 0 }}>
                <div style={{ fontWeight: 600 }}>
                  {c.fullName || 'No name'}
                  {c.status === 'BLOCKED' && (
                    <span className="badge badge-danger" style={{ marginLeft: '0.4rem' }}>
                      Blocked
                    </span>
                  )}
                </div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>{[c.phoneNumber, c.email].filter(Boolean).join(' · ') || '—'}</div>
              </div>
              <button type="button" className="btn btn-secondary" style={tinyButton} onClick={() => onPick(c)}>
                {pickLabel}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
