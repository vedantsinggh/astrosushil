'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { apiFetch } from '../../../lib/api-client';
import { StatusBadge } from '../../../components/StatusBadge';

interface SubscriptionDetailsResponse {
  subscription: {
    id: string;
    orderId: string;
    razorpayOrderId: string;
    razorpayPaymentId: string | null;
    user: {
      id: string;
      email: string;
      fullName: string | null;
      role: string;
      isEmailVerified: boolean;
      createdAt: string;
    };
    plan: string;
    reportType: string;
    status: string;
    amount: number;
    currency: string;
    startedAt: string;
    expiresAt: string | null;
    autoRenew: boolean;
    createdAt: string;
    updatedAt: string;
  };
  entitlements: Array<{
    feature: string;
    name: string;
    allowed: boolean;
    status: string;
    source: string;
    expiresAt: string | null;
  }>;
  featureAccessDiagnostics: Array<{
    feature: string;
    featureName: string;
    allowed: boolean;
    reason: string;
    source: string;
    details?: any;
  }>;
}

export default function SubscriptionDetailsPage() {
  const params = useParams();
  const subscriptionId = params.id as string;

  const [data, setData] = useState<SubscriptionDetailsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDetails = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiFetch<SubscriptionDetailsResponse>(`/api/v1/admin/subscriptions/${subscriptionId}`);
      setData(res);
    } catch (err: any) {
      setError(err?.message || 'Failed to load subscription details');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [subscriptionId]);

  if (isLoading) {
    return (
      <div>
        <div className="skeleton" style={{ height: '30px', width: '250px', marginBottom: '1rem' }} />
        <div className="skeleton" style={{ height: '180px', width: '100%', marginBottom: '1.5rem' }} />
        <div className="skeleton" style={{ height: '300px', width: '100%' }} />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--badge-danger-text)', marginBottom: '0.5rem' }}>Subscription Not Found</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>{error || 'Unable to locate subscription record'}</p>
        <Link href="/subscriptions" className="btn btn-secondary">
          ← Back to Subscriptions List
        </Link>
      </div>
    );
  }

  const { subscription, entitlements, featureAccessDiagnostics } = data;

  return (
    <div>
      {/* BREADCRUMBS */}
      <nav style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
        <Link href="/dashboard" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>
          Admin
        </Link>{' '}
        →{' '}
        <Link href="/subscriptions" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>
          Subscriptions
        </Link>{' '}
        → <strong style={{ color: 'var(--text-primary)' }}>{subscription.plan}</strong>
      </nav>

      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <h1 className="page-title" style={{ margin: 0 }}>Subscription Details</h1>
            <StatusBadge status={subscription.status} />
          </div>
          <p className="page-subtitle" style={{ marginTop: '0.25rem' }}>
            Subscription ID: <code style={{ fontFamily: 'monospace' }}>{subscription.id}</code> | Razorpay Order ID: <code style={{ fontFamily: 'monospace' }}>{subscription.razorpayOrderId}</code>
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Link href={`/users/${subscription.user.id}`} className="btn btn-secondary" style={{ fontSize: '0.85rem' }}>
            👤 View User
          </Link>
          <Link href={`/payments?search=${encodeURIComponent(subscription.razorpayOrderId)}`} className="btn btn-secondary" style={{ fontSize: '0.85rem' }}>
            💳 View Transaction
          </Link>
        </div>
      </div>

      {/* SUBSCRIPTION OVERVIEW CARD */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1.5rem' }}>
        <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', color: 'var(--text-primary)' }}>Subscription Overview</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>Subscriber Email</span>
            <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>{subscription.user.email}</strong>
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>Plan Code</span>
            <span className="badge badge-info">{subscription.plan}</span>
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>Amount Paid</span>
            <strong style={{ fontSize: '1rem', color: 'var(--accent-color)' }}>₹{subscription.amount.toFixed(2)} INR</strong>
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>Started At</span>
            <strong style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>{new Date(subscription.startedAt).toLocaleString()}</strong>
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>Access Expiry</span>
            <strong style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>
              {subscription.expiresAt ? new Date(subscription.expiresAt).toLocaleDateString() : 'Lifetime Report Access'}
            </strong>
          </div>
        </div>
      </div>

      {/* EFFECTIVE ENTITLEMENTS CARD */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1.5rem' }}>
        <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', color: 'var(--text-primary)' }}>Effective Entitlements</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
          {entitlements.map((item) => (
            <div
              key={item.feature}
              style={{
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-sm)',
                border: item.allowed ? '1px solid #A7F3D0' : '1px solid var(--border-color)',
                background: item.allowed ? '#ECFDF5' : '#F9FAFB',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: item.allowed ? '#065F46' : 'var(--text-secondary)' }}>
                  {item.name}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Source: {item.source}</div>
              </div>
              <span style={{ fontSize: '1.1rem' }}>{item.allowed ? '✓' : '✗'}</span>
            </div>
          ))}
        </div>
      </div>

      {/* FEATURE ACCESS DIAGNOSTICS TABLE */}
      <div className="card" style={{ padding: '1.5rem' }}>
        <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', color: 'var(--text-primary)' }}>
          Authoritative Backend Feature Access Diagnostics
        </h3>
        <div className="table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Feature Name</th>
                <th>Access Evaluation</th>
                <th>Diagnostic Source</th>
                <th>Reason / Message</th>
              </tr>
            </thead>
            <tbody>
              {featureAccessDiagnostics.map((diag) => (
                <tr key={diag.feature}>
                  <td style={{ fontWeight: 600, fontSize: '0.85rem' }}>{diag.featureName}</td>
                  <td>
                    {diag.allowed ? (
                      <span className="badge badge-success">✓ Allowed</span>
                    ) : (
                      <span className="badge badge-danger">✗ Denied</span>
                    )}
                  </td>
                  <td style={{ fontSize: '0.8rem', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{diag.source}</td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{diag.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
