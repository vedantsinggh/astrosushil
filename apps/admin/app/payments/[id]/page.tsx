'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { apiFetch } from '../../../lib/api-client';
import { useAuth } from '../../../lib/auth-context';
import { errorMessage, refundOrder } from '../../../lib/api/sales';
import { StatusBadge } from '../../../components/StatusBadge';
import { ConfirmDialog, dangerButton, Field, SuccessBanner } from '../../../components/sales/ui';

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
  const { hasPermission } = useAuth();
  const canRefund = hasPermission('payments:refund');

  const [data, setData] = useState<PaymentDetailsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [refundOpen, setRefundOpen] = useState(false);
  const [refundReason, setRefundReason] = useState('');
  const [partialAmountInr, setPartialAmountInr] = useState('');
  const [refundBusy, setRefundBusy] = useState(false);
  const [refundError, setRefundError] = useState<string | null>(null);

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
  const normalizedStatus = payment.status.toUpperCase();
  const isRefundable = normalizedStatus !== 'REFUNDED' && normalizedStatus !== 'FAILED' && normalizedStatus !== 'PENDING';

  const handleRefund = async () => {
    if (refundReason.trim().length < 3) {
      setRefundError('A refund reason (minimum 3 characters) is required.');
      return;
    }
    let amountPaise: number | undefined;
    if (partialAmountInr.trim()) {
      const parsed = Number(partialAmountInr.trim());
      if (!Number.isFinite(parsed) || parsed <= 0) {
        setRefundError('Partial refund amount must be a positive number.');
        return;
      }
      amountPaise = Math.round(parsed * 100);
    }

    setRefundBusy(true);
    setRefundError(null);
    try {
      const result = await refundOrder(payment.id, {
        reason: refundReason.trim(),
        ...(amountPaise ? { amountPaise } : {}),
      });
      setRefundOpen(false);
      setNotice(`Refund ${result.refund.id} issued (${result.refund.status}). Order status is now ${result.order.status}.`);
      await fetchDetails();
    } catch (err) {
      setRefundError(errorMessage(err));
    } finally {
      setRefundBusy(false);
    }
  };

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
          {canRefund && isRefundable && (
            <button
              type="button"
              className="btn"
              style={{ ...dangerButton, fontSize: '0.85rem' }}
              onClick={() => {
                setRefundReason('');
                setPartialAmountInr('');
                setRefundError(null);
                setRefundOpen(true);
              }}
            >
              Issue Refund
            </button>
          )}
          <Link href={`/users/${payment.user.id}`} className="btn btn-secondary" style={{ fontSize: '0.85rem' }}>
            View User
          </Link>
        </div>
      </div>

      <SuccessBanner message={notice} onClose={() => setNotice(null)} />

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

      {refundOpen && (
        <ConfirmDialog
          title="Issue Staff Refund"
          confirmLabel="Issue Refund"
          danger
          busy={refundBusy}
          error={refundError}
          onConfirm={handleRefund}
          onCancel={() => setRefundOpen(false)}
        >
          <p style={{ marginBottom: '0.75rem' }}>
            Issue a refund for order <code>{payment.razorpayOrderId}</code> (paid ₹{payment.amount.toFixed(2)} INR).
          </p>
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            <Field label="Reason (required, min 3 chars)">
              <input
                type="text"
                className="input-control"
                placeholder="e.g. Customer requested cancellation"
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
              />
            </Field>
            <Field label="Partial amount in INR (optional)" hint="Leave blank to refund the full refundable balance.">
              <input
                type="number"
                step="0.01"
                min="0.01"
                className="input-control"
                placeholder={`Max ${payment.amount.toFixed(2)}`}
                value={partialAmountInr}
                onChange={(e) => setPartialAmountInr(e.target.value)}
              />
            </Field>
          </div>
        </ConfirmDialog>
      )}
    </div>
  );
}
