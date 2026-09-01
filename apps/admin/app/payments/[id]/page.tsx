'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { apiFetch } from '../../../lib/api-client';
import { StatusBadge } from '../../../components/StatusBadge';

interface PaymentDetailsResponse {
  payment: {
    id: string;
    razorpayOrderId: string;
    razorpayPaymentId: string;
    user: {
      id: string;
      email: string;
      fullName: string | null;
      role: string;
      createdAt: string;
    };
    reportType: string;
    amount: number;
    currency: string;
    status: string;
    provider: string;
    createdAt: string;
    updatedAt: string;
  };
  webhookDiagnostics: {
    provider: string;
    status: string;
    lastReceivedAt: string;
  };
}

export default function PaymentDetailsPage() {
  const params = useParams();
  const paymentId = params.id as string;

  const [data, setData] = useState<PaymentDetailsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDetails = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiFetch<PaymentDetailsResponse>(`/api/v1/admin/payments/${paymentId}`);
      setData(res);
    } catch (err: any) {
      setError(err?.message || 'Failed to load payment details');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [paymentId]);

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
        <h2 style={{ color: 'var(--badge-danger-text)', marginBottom: '0.5rem' }}>Payment Not Found</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>{error || 'Unable to locate payment record'}</p>
        <Link href="/payments" className="btn btn-secondary">
          ← Back to Payments
        </Link>
      </div>
    );
  }

  const { payment, webhookDiagnostics } = data;

  return (
    <div>
      {/* BREADCRUMBS */}
      <nav style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
        <Link href="/dashboard" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>
          Admin
        </Link>{' '}
        →{' '}
        <Link href="/payments" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>
          Payments
        </Link>{' '}
        → <strong style={{ color: 'var(--text-primary)' }}>{payment.razorpayOrderId}</strong>
      </nav>

      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <h1 className="page-title" style={{ margin: 0 }}>Payment Transaction Details</h1>
            <StatusBadge status={payment.status} />
          </div>
          <p className="page-subtitle" style={{ marginTop: '0.25rem' }}>
            Order ID: <code style={{ fontFamily: 'monospace' }}>{payment.id}</code> | Razorpay Order: <code style={{ fontFamily: 'monospace' }}>{payment.razorpayOrderId}</code>
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Link href={`/users/${payment.user.id}`} className="btn btn-secondary" style={{ fontSize: '0.85rem' }}>
            👤 View User
          </Link>
        </div>
      </div>

      {/* OVERVIEW CARD */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1.5rem' }}>
        <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', color: 'var(--text-primary)' }}>Transaction Overview</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>Payer Email</span>
            <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>{payment.user.email}</strong>
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>Report Type</span>
            <span className="badge badge-info">{payment.reportType}</span>
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>Amount</span>
            <strong style={{ fontSize: '1.1rem', color: 'var(--accent-color)' }}>₹{payment.amount.toFixed(2)} INR</strong>
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>Razorpay Payment ID</span>
            <code style={{ fontSize: '0.85rem', fontFamily: 'monospace' }}>{payment.razorpayPaymentId}</code>
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>Payment Provider</span>
            <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>{payment.provider}</strong>
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>Created At</span>
            <strong style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{new Date(payment.createdAt).toLocaleString()}</strong>
          </div>
        </div>
      </div>

      {/* WEBHOOK DIAGNOSTICS CARD */}
      <div className="card" style={{ padding: '1.5rem' }}>
        <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', color: 'var(--text-primary)' }}>
          Payment Gateway Webhook Listener Status
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', fontSize: '0.85rem' }}>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>Gateway Provider</span>
            <strong>{webhookDiagnostics.provider}</strong>
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>Processing Status</span>
            <StatusBadge status={webhookDiagnostics.status} />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>Last Received Timestamp</span>
            <strong style={{ fontFamily: 'monospace' }}>{new Date(webhookDiagnostics.lastReceivedAt).toLocaleString()}</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
