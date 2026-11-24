'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Booking, listPaymentConflicts, MODE_LABELS } from '../../../lib/api/bookings';
import { errorMessage } from '../../../lib/api/sales';
import { formatDateTime, formatDay, formatPaise, titleCase } from '../../../components/sales/format';
import { StatusPill } from '../../../components/sales/badges';
import { TransactionsTabs } from '../../../components/sales/TransactionParts';
import { EmptyRow, ErrorBanner, InfoBox, PageHeader, RequirePermission, SkeletonRows, smallButton, tinyButton } from '../../../components/sales/ui';

function PaymentConflictsScreen() {
  const [rows, setRows] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setRows(await listPaymentConflicts());
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <PageHeader
        crumbs={[{ label: 'Transactions', href: '/transactions' }, { label: 'Booking payment conflicts' }]}
        title="Booking payment conflicts"
        subtitle="Consultations that were paid for but hold no time on the calendar"
        actions={
          <button type="button" className="btn btn-secondary" style={smallButton} onClick={load}>
            Refresh
          </button>
        }
      />

      <TransactionsTabs active="/transactions/payment-conflicts" />

      <InfoBox tone="warning" title="What this list is">
        <p>
          A customer&rsquo;s slot is held for 15 minutes while they pay. Each row here is a booking whose payment was captured after that hold had run out and
          someone else had taken the time, or after the booking was cancelled. The customer has paid, but the booking is not confirmed and has no slot.
        </p>
        <p style={{ marginTop: '0.4rem' }}>
          <strong>What to do:</strong> contact the customer (they are not messaged automatically) and either refund the payment from the Razorpay dashboard or agree
          a new time with them. This panel cannot finish either step yet: refunds are not issued here, a booking in this state cannot be rescheduled (only confirmed
          bookings can), and a new manual booking would record a second payment and a second invoice for the same money. Raise each case with the owner.
        </p>
      </InfoBox>

      <ErrorBanner message={error} />

      <div className="card">
        <div className="table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Consultation</th>
                <th>Requested time</th>
                <th>Paid</th>
                <th>Booking status</th>
                <th>Booked on</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <SkeletonRows columns={7} />
              ) : rows.length > 0 ? (
                rows.map((b) => (
                  <tr key={b.id}>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{b.customer?.fullName || b.customerName}</div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>{b.customer?.email || b.customerEmail || ''}</div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>{b.customer?.phoneNumber || b.customerPhone || ''}</div>
                    </td>
                    <td style={{ fontSize: '0.85rem' }}>
                      {b.consultation.title}
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>{MODE_LABELS[b.mode] ?? b.mode}</div>
                    </td>
                    <td style={{ fontSize: '0.8rem' }}>
                      {formatDay(b.date)}
                      <div style={{ color: 'var(--text-secondary)' }}>{b.slot} IST</div>
                    </td>
                    <td style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                      {formatPaise(b.amountPaise ?? b.order?.amount ?? null)}
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.72rem', fontWeight: 400 }}>Order payment: {titleCase(b.order?.paymentStatus)}</div>
                    </td>
                    <td>
                      <StatusPill status={b.status} />
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{formatDateTime(b.createdAt)}</td>
                    <td>
                      <Link href={`/bookings/${b.id}`} className="btn btn-secondary" style={tinyButton}>
                        Open booking →
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <EmptyRow columns={7}>No payment conflicts. Every paid consultation holds its slot.</EmptyRow>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function PaymentConflictsPage() {
  return (
    <RequirePermission permission="bookings:read">
      <PaymentConflictsScreen />
    </RequirePermission>
  );
}
