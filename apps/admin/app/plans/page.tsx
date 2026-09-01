'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiFetch } from '../../lib/api-client';

interface PlanItem {
  id: string;
  name: string;
  code: string;
  description: string;
  price: number;
  currency: string;
  duration: string;
  status: string;
  entitlements: string[];
}

interface PlansResponse {
  plans: PlanItem[];
}

export default function PlansPage() {
  const [plans, setPlans] = useState<PlanItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPlans = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiFetch<PlansResponse>('/api/v1/admin/plans');
      setPlans(res.plans);
    } catch (err: any) {
      setError(err?.message || 'Failed to load plans catalog');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  return (
    <div>
      {/* BREADCRUMBS */}
      <nav style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
        <Link href="/dashboard" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>
          Admin
        </Link>{' '}
        → <strong style={{ color: 'var(--text-primary)' }}>Plans Catalog</strong>
      </nav>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 className="page-title">Product Plans & Entitlements Catalog</h1>
          <p className="page-subtitle">Inspect product offerings, pricing tiers, and associated entitlement bundles</p>
        </div>
        <button onClick={fetchPlans} className="btn btn-secondary" style={{ fontSize: '0.85rem' }}>
          🔄 Refresh
        </button>
      </div>

      {error && (
        <div className="badge badge-danger" style={{ padding: '1rem', borderRadius: 'var(--radius-md)', width: '100%', marginBottom: '1.5rem', display: 'block' }}>
          {error}
        </div>
      )}

      {/* PLANS CARDS GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
        {isLoading ? (
          [1, 2, 3, 4].map((i) => (
            <div key={i} className="card" style={{ padding: '1.5rem' }}>
              <div className="skeleton" style={{ height: '30px', width: '70%', marginBottom: '1rem' }} />
              <div className="skeleton" style={{ height: '20px', width: '50%', marginBottom: '1rem' }} />
              <div className="skeleton" style={{ height: '60px', width: '100%' }} />
            </div>
          ))
        ) : plans.length > 0 ? (
          plans.map((plan) => (
            <div key={plan.id} className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)' }}>{plan.name}</h3>
                  <span className="badge badge-success">{plan.status}</span>
                </div>
                <div style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--accent-color)', marginBottom: '0.5rem' }}>
                  ₹{plan.price} <span style={{ fontSize: '0.8rem', fontWeight: 400, color: 'var(--text-muted)' }}>{plan.currency}</span>
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>{plan.description}</p>

                <h4 style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                  Granted Entitlements
                </h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '1.5rem' }}>
                  {plan.entitlements.map((ent) => (
                    <span key={ent} className="badge badge-info" style={{ fontSize: '0.7rem' }}>
                      ✓ {ent}
                    </span>
                  ))}
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Duration: <strong>{plan.duration}</strong>
              </div>
            </div>
          ))
        ) : (
          <div className="card" style={{ padding: '2.5rem', textAlign: 'center', gridColumn: '1 / -1' }}>
            No product plans configured.
          </div>
        )}
      </div>
    </div>
  );
}
