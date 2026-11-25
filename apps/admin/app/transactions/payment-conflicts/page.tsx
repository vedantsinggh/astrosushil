'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../../lib/auth-context';
import {
  assignPaymentConflictSlot,
  Booking,
  listPaymentConflicts,
  MODE_LABELS,
  refundPaymentConflict,
} from '../../../lib/api/bookings';
import { errorMessage } from '../../../lib/api/sales';
import { formatDateTime, formatDay, formatPaise, titleCase } from '../../../components/sales/format';
import { StatusPill } from '../../../components/sales/badges';
import { TransactionsTabs } from '../../../components/sales/TransactionParts';
import {
  ConfirmDialog,
  dangerButton,
  EmptyRow,
  ErrorBanner,
  Field,
  InfoBox,
  PageHeader,
  RequirePermission,
  SkeletonRows,
  smallButton,
  SuccessBanner,
  tinyButton,
} from '../../../components/sales/ui';

function PaymentConflictsScreen() {
  const { hasPermission } = useAuth();
  const canAssignSlot = hasPermission('bookings:update');
  const canRefund = hasPermission('bookings:update') && hasPermission('payments:refund');

  const [rows, setRows] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [slotTarget, setSlotTarget] = useState<Booking | null>(null);
  const [slotDate, setSlotDate] = useState('');
  const [slotTime, setSlotTime] = useState('');
  const [slotNote, setSlotNote] = useState('');

  const [refundTarget, setRefundTarget] = useState<Booking | null>(null);
  const [refundReason, setRefundReason] = useState('');
  const [refundNote, setRefundNote] = useState('');

  const [busy, setBusy] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

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

  const openAssignSlot = (booking: Booking) => {
    setSlotTarget(booking);
    setSlotDate(booking.date || '');
    setSlotTime(booking.slot || '');
    setSlotNote('');
    setModalError(null);
  };

  const openRefund = (booking: Booking) => {
    setRefundTarget(booking);
    setRefundReason('');
    setRefundNote('');
    setModalError(null);
  };

  const handleAssignSlot = async () => {
    if (!slotTarget) return;
    if (!slotDate.trim() || !slotTime.trim()) {
      setModalError('Date (YYYY-MM-DD) and slot (HH:mm-HH:mm) are required.');
      return;
    }
    setBusy(true);
    setModalError(null);
    try {
      await assignPaymentConflictSlot(slotTarget.id, {
        date: slotDate.trim(),
        slot: slotTime.trim(),
        ...(slotNote.trim() ? { adminNote: slotNote.trim() } : {}),
      });
      setSlotTarget(null);
      setNotice(`Booking confirmed at ${slotDate.trim()} ${slotTime.trim()} IST against the captured payment.`);
      await load();
    } catch (err) {
      setModalError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const handleRefund = async () => {
    if (!refundTarget) return;
    if (refundReason.trim().length < 3) {
      setModalError('A refund reason (minimum 3 characters) is required.');
      return;
    }
    setBusy(true);
    setModalError(null);
    try {
      const result = await refundPaymentConflict(refundTarget.id, {
        reason: refundReason.trim(),
        ...(refundNote.trim() ? { adminNote: refundNote.trim() } : {}),
      });
      setRefundTarget(null);
      setNotice(
        result.fullyRefunded
          ? 'Payment refunded and booking marked refunded.'
          : `Refund recorded (${result.refund.status}).`
      );
      await load();
    } catch (err) {
      setModalError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

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
          <strong>What to do:</strong> contact the customer and either assign an agreed new slot against the captured payment (no new charge is made) or issue a
          staff refund directly from the actions below.
        </p>
      </InfoBox>

      <ErrorBanner message={error} />
      <SuccessBanner message={notice} onClose={() => setNotice(null)} />

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
                      <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                        {canAssignSlot && (
                          <button type="button" className="btn btn-primary" style={tinyButton} onClick={() => openAssignSlot(b)}>
                            Assign slot
                          </button>
                        )}
                        {canRefund && (
                          <button type="button" className="btn" style={{ ...tinyButton, ...dangerButton }} onClick={() => openRefund(b)}>
                            Refund
                          </button>
                        )}
                        <Link href={`/bookings/${b.id}`} className="btn btn-secondary" style={tinyButton}>
                          Open →
                        </Link>
                      </div>
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

      {slotTarget && (
        <ConfirmDialog
          title="Assign new slot to paid booking"
          confirmLabel="Confirm slot"
          busy={busy}
          error={modalError}
          onConfirm={handleAssignSlot}
          onCancel={() => setSlotTarget(null)}
        >
          <p style={{ marginBottom: '0.75rem' }}>
            Confirm <strong>{slotTarget.consultation.title}</strong> for{' '}
            <strong>{slotTarget.customer?.fullName || slotTarget.customerName}</strong> against the payment already captured (no new charge).
          </p>
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            <Field label="Date (IST)">
              <input type="date" className="input-control" value={slotDate} onChange={(e) => setSlotDate(e.target.value)} />
            </Field>
            <Field label="Slot (HH:mm-HH:mm)" hint="Example: 14:00-14:30">
              <input type="text" className="input-control" placeholder="14:00-14:30" value={slotTime} onChange={(e) => setSlotTime(e.target.value)} />
            </Field>
            <Field label="Admin note (optional)">
              <input type="text" className="input-control" placeholder="Agreed with customer over phone" value={slotNote} onChange={(e) => setSlotNote(e.target.value)} />
            </Field>
          </div>
        </ConfirmDialog>
      )}

      {refundTarget && (
        <ConfirmDialog
          title="Refund payment conflict"
          confirmLabel="Issue refund"
          danger
          busy={busy}
          error={modalError}
          onConfirm={handleRefund}
          onCancel={() => setRefundTarget(null)}
        >
          <p style={{ marginBottom: '0.75rem' }}>
            Issue a full refundable-balance refund of{' '}
            <strong>{formatPaise(refundTarget.amountPaise ?? refundTarget.order?.amount ?? null)}</strong> for{' '}
            <strong>{refundTarget.customer?.fullName || refundTarget.customerName}</strong> and mark the booking refunded.
          </p>
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            <Field label="Refund reason (required, min 3 chars)">
              <input
                type="text"
                className="input-control"
                placeholder="e.g. Slot unavailable after payment capture; customer requested refund"
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
              />
            </Field>
            <Field label="Admin note (optional)">
              <input
                type="text"
                className="input-control"
                placeholder="Internal note for booking record"
                value={refundNote}
                onChange={(e) => setRefundNote(e.target.value)}
              />
            </Field>
          </div>
        </ConfirmDialog>
      )}
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
