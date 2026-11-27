'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAuth } from '../../../lib/auth-context';
import {
  addBookingNote,
  Booking,
  BookingAdminNote,
  BookingInvoiceData,
  changeBookingPlan,
  ConsultationMode,
  ConsultationOption,
  deleteBooking,
  getBooking,
  getBookingInvoice,
  listConsultationOptions,
  MODE_LABELS,
  rescheduleBooking,
  respondToMessageBooking,
} from '../../../lib/api/bookings';
import { errorMessage } from '../../../lib/api/sales';
import { basisPointsToPercent, formatDateTime, formatDay, formatMinor, formatPaise, titleCase, todayIst } from '../../../components/sales/format';
import { StatusPill } from '../../../components/sales/badges';
import { SlotPicker } from '../../../components/sales/SlotPicker';
import {
  ConfirmDialog,
  dangerButton,
  ErrorBanner,
  Field,
  InfoBox,
  KeyValue,
  Modal,
  PageHeader,
  RequirePermission,
  SectionTitle,
  smallButton,
  SuccessBanner,
} from '../../../components/sales/ui';

const NOTE_ACTION_LABELS: Record<string, string> = {
  RESCHEDULE: 'Reschedule',
  PLAN_CHANGE: 'Plan change',
  NOTE: 'Note',
  MANUAL_BOOKING: 'Manual booking',
  DELETE: 'Deleted',
};
const RESCHEDULABLE = ['CONFIRMED', 'RESCHEDULED'];
const PLAN_CHANGEABLE = ['CONFIRMED', 'RESCHEDULED'];

/** A history entry's recorded change, printed as "key: value" lines whatever its shape. */
function describeChanges(changes: unknown): string[] {
  if (!changes || typeof changes !== 'object') return [];
  const lines: string[] = [];
  const walk = (value: unknown, path: string) => {
    if (value === null || value === undefined) return;
    if (typeof value === 'object' && !Array.isArray(value)) {
      for (const [key, inner] of Object.entries(value as Record<string, unknown>)) walk(inner, path ? `${path} ${key}` : key);
    } else {
      lines.push(`${titleCase(path.replace(/([a-z])([A-Z])/g, '$1 $2'))}: ${Array.isArray(value) ? value.join(', ') : String(value)}`);
    }
  };
  walk(changes, '');
  return lines;
}

function HistoryEntry({ entry }: { entry: BookingAdminNote }) {
  const changes = describeChanges(entry.changes);
  return (
    <div style={{ padding: '0.6rem 0', borderBottom: '1px solid var(--border-color)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
        <span>
          <span className="badge badge-info">{NOTE_ACTION_LABELS[entry.action] ?? titleCase(entry.action)}</span> by {entry.addedByName || 'staff'}
        </span>
        <span>{formatDateTime(entry.createdAt)}</span>
      </div>
      {entry.note && <p style={{ fontSize: '0.85rem', marginTop: '0.35rem', whiteSpace: 'pre-wrap' }}>{entry.note}</p>}
      {changes.length > 0 && (
        <ul style={{ margin: '0.35rem 0 0 1.25rem', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
          {changes.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * MESSAGE consultation: staff write the one answer the customer sees (website
 * `PATCH /booking/bookings/:id/message-response`). Once sent it cannot be changed.
 */
function MessageResponsePanel({ booking, canUpdate, onDone }: { booking: Booking; canUpdate: boolean; onDone: (message: string) => void }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const answerable = ['CONFIRMED', 'RESCHEDULED'].includes(booking.status) && !booking.responseText;

  const send = async () => {
    if (!text.trim()) return setError('Write the answer first.');
    if (!window.confirm('Send this answer? The customer sees it at once and it cannot be changed afterwards.')) return;
    setBusy(true);
    setError(null);
    try {
      await respondToMessageBooking(booking.id, text.trim());
      onDone('Answer sent. The consultation is now completed.');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card" style={{ marginBottom: '1.5rem' }}>
      <SectionTitle>Answer to the customer</SectionTitle>
      {booking.responseText ? (
        <>
          <p style={{ whiteSpace: 'pre-wrap', fontSize: '0.9rem' }}>{booking.responseText}</p>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            Sent {formatDateTime(booking.respondedAt)}
            {booking.respondedBy ? ` by ${booking.respondedBy}` : ''}
          </p>
        </>
      ) : answerable && canUpdate ? (
        <>
          <ErrorBanner message={error} />
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
            The customer sends their question on WhatsApp. Write the answer and remedies here; it is shown in the customer&rsquo;s bookings on the website and in the app.
          </p>
          <textarea className="input-control" rows={8} maxLength={5000} value={text} onChange={(e) => setText(e.target.value)} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{text.length} / 5000</span>
            <button type="button" className="btn btn-primary" onClick={send} disabled={busy}>
              {busy ? 'Sending…' : 'Send answer'}
            </button>
          </div>
        </>
      ) : (
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          {answerable ? 'You do not have permission to answer.' : 'This consultation can be answered once it is paid.'}
        </p>
      )}
    </div>
  );
}

function RescheduleModal({ booking, onClose, onDone }: { booking: Booking; onClose: () => void; onDone: (message: string) => void }) {
  const [date, setDate] = useState(booking.date ?? '');
  const [slot, setSlot] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (!date || !slot) {
      setError('Choose the new date and slot');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await rescheduleBooking(booking.id, { date, slot, ...(reason.trim() ? { adminNote: reason.trim() } : {}) });
      onDone(`Booking rescheduled to ${formatDay(date)}, ${slot}. The customer has been notified.`);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title="Reschedule booking"
      onClose={onClose}
      width={720}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={save} disabled={busy || !slot}>
            {busy ? 'Saving…' : 'Reschedule'}
          </button>
        </>
      }
    >
      <ErrorBanner message={error} />
      <p style={{ fontSize: '0.85rem', marginBottom: '0.75rem' }}>
        <strong>{booking.customer?.fullName || booking.customerName}</strong> — {booking.consultation.title} ({booking.durationMinutes} min session). Now on{' '}
        {formatDay(booking.date)}, {booking.slot} IST.
      </p>
      <div style={{ display: 'grid', gap: '1rem' }}>
        <Field label="New date *" hint={date && date < todayIst() ? 'This date is in the past.' : undefined}>
          <input
            type="date"
            className="input-control"
            style={{ maxWidth: 220 }}
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              setSlot('');
            }}
          />
        </Field>
        <Field label="New slot *">
          <SlotPicker date={date} consultationId={booking.consultationTypeId || booking.consultationId} value={slot} onChange={setSlot} currentSlot={date === booking.date ? booking.slot ?? undefined : undefined} />
        </Field>
        <Field label="Reason (staff only, optional)" hint="Kept in the booking history. Never shown to the customer.">
          <textarea className="input-control" rows={2} maxLength={1000} value={reason} onChange={(e) => setReason(e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}

function ChangePlanModal({ booking, onClose, onDone }: { booking: Booking; onClose: () => void; onDone: (message: string) => void }) {
  const [options, setOptions] = useState<ConsultationOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [typeId, setTypeId] = useState(booking.consultationTypeId || '');
  const [mode, setMode] = useState<ConsultationMode | ''>('');
  const [reason, setReason] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listConsultationOptions()
      .then(setOptions)
      .catch((err) => setError(`Consultations could not be loaded: ${errorMessage(err)}`))
      .finally(() => setIsLoading(false));
  }, []);

  const typeOptions = useMemo(() => {
    const seen = new Map<string, ConsultationOption>();
    for (const option of options) if (!seen.has(option.consultationTypeId)) seen.set(option.consultationTypeId, option);
    return [...seen.values()];
  }, [options]);
  const modeOptions = options.filter((o) => o.consultationTypeId === typeId);
  const chosen = modeOptions.find((o) => o.mode === mode) ?? null;
  const unchanged = Boolean(chosen && chosen.consultationTypeId === booking.consultationTypeId && chosen.mode === booking.mode);

  const save = async () => {
    if (!chosen) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await changeBookingPlan(booking.id, { consultationId: chosen.consultationTypeId, mode: chosen.mode, ...(reason.trim() ? { adminNote: reason.trim() } : {}) });
      onDone(`Plan changed to ${updated.title} (${MODE_LABELS[updated.mode] ?? updated.mode}). The booking, its order and its ledger entry now state ${formatPaise(updated.amountPaise)}.`);
    } catch (err) {
      setConfirming(false);
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title="Change plan"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          {confirming ? (
            <button type="button" className="btn btn-primary" onClick={save} disabled={busy}>
              {busy ? 'Saving…' : 'Yes, change the plan'}
            </button>
          ) : (
            <button type="button" className="btn btn-primary" onClick={() => setConfirming(true)} disabled={!chosen || unchanged}>
              Change plan…
            </button>
          )}
        </>
      }
    >
      <ErrorBanner message={error} />
      <p style={{ fontSize: '0.85rem', marginBottom: '0.75rem' }}>
        Current: <strong>{booking.consultation.title}</strong> ({MODE_LABELS[booking.mode] ?? booking.mode}), {formatPaise(booking.amountPaise ?? booking.order?.amount ?? null)}
      </p>
      {isLoading ? (
        <div className="skeleton" style={{ height: '80px', width: '100%' }} />
      ) : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          <Field label="Consultation plan *">
            <select
              className="input-control"
              value={typeId}
              onChange={(e) => {
                setTypeId(e.target.value);
                setMode('');
                setConfirming(false);
              }}
            >
              <option value="">Choose…</option>
              {typeOptions.map((o) => (
                <option key={o.consultationTypeId} value={o.consultationTypeId}>
                  {o.title} · {o.durationMinutes} min
                </option>
              ))}
            </select>
          </Field>
          <Field label="Mode *" error={unchanged ? 'This is the booking’s present plan and mode' : null}>
            <select
              className="input-control"
              value={mode}
              disabled={!typeId}
              onChange={(e) => {
                setMode(e.target.value as ConsultationMode | '');
                setConfirming(false);
              }}
            >
              <option value="">Choose…</option>
              {modeOptions.map((o) => (
                <option key={o.mode} value={o.mode}>
                  {MODE_LABELS[o.mode]} — {formatPaise(o.priceWithGstPaise)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Reason (staff only, optional)" hint="Kept in the booking history. Never shown to the customer.">
            <textarea className="input-control" rows={2} maxLength={1000} value={reason} onChange={(e) => setReason(e.target.value)} />
          </Field>
          <InfoBox tone="warning" title="What a plan change does">
            The booking, its order and its transaction are re-stated at the new plan&rsquo;s full price{chosen ? ` (${formatPaise(chosen.priceWithGstPaise)})` : ''}; any
            discount on the booking is cleared. <strong>Nothing is charged or refunded</strong>: settle the difference with the customer yourself. The start time stays
            and the end follows the new duration; the change is refused if that runs into another booking. An invoice number already issued is kept, and the invoice
            then states the new plan and amount. The customer is told about the change.
          </InfoBox>
          {confirming && chosen && (
            <p style={{ fontSize: '0.85rem', fontWeight: 600 }}>
              Change this booking to {chosen.title} ({MODE_LABELS[chosen.mode]})? Press “Yes, change the plan” to confirm.
            </p>
          )}
        </div>
      )}
    </Modal>
  );
}

function InvoiceCard({ booking }: { booking: Booking }) {
  const { hasPermission } = useAuth();
  const [data, setData] = useState<BookingInvoiceData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setIsLoading(true);
    setError(null);
    try {
      setData(await getBookingInvoice(booking.id));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="card">
      <SectionTitle>Invoice data</SectionTitle>
      <ErrorBanner message={error} />
      {!data ? (
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-secondary" style={smallButton} onClick={load} disabled={isLoading}>
            {isLoading ? 'Loading…' : 'Show invoice data'}
          </button>
          {booking.orderId && hasPermission('transactions:read') && (
            <Link href={`/invoices/orders/${booking.orderId}`} className="btn btn-secondary" style={smallButton}>
              Full invoice of the order
            </Link>
          )}
        </div>
      ) : (
        <>
          <KeyValue label="Invoice number">{data.invoiceNumber || 'Invoice being prepared'}</KeyValue>
          <KeyValue label="Invoice status">
            <StatusPill status={data.invoiceStatus} />
          </KeyValue>
          <KeyValue label="Issued">{formatDateTime(data.issuedAt)}</KeyValue>
          <KeyValue label="Payment method">{titleCase(data.paymentMethod)}</KeyValue>
          <KeyValue label="Customer">{[data.customer.name, data.customer.phone, data.customer.email].filter(Boolean).join(' · ') || '—'}</KeyValue>
          <KeyValue label="Consultation">
            {data.consultation.title} ({MODE_LABELS[data.consultation.mode] ?? data.consultation.mode}), {data.consultation.durationMinutes} min
          </KeyValue>
          <KeyValue label="Appointment">
            {formatDay(data.consultation.date)}, {data.consultation.slot} IST
          </KeyValue>
          <KeyValue label="Price">{formatPaise(data.amounts.pricePaise)}</KeyValue>
          <KeyValue label="Discount">
            − {formatPaise(data.amounts.discountPaise)}
            {data.amounts.discountType === 'PERCENTAGE' && data.amounts.discountValue !== null ? ` (${basisPointsToPercent(data.amounts.discountValue)})` : ''}
          </KeyValue>
          <KeyValue label="Taxable value">{formatPaise(data.amounts.taxablePaise)}</KeyValue>
          <KeyValue label={`GST${data.amounts.gstRateBasisPoints !== null ? ` ${basisPointsToPercent(data.amounts.gstRateBasisPoints)}` : ''}${data.amounts.gstType ? ` ${data.amounts.gstType.toLowerCase()}` : ''}`}>
            {formatPaise(data.amounts.gstPaise)}
          </KeyValue>
          <KeyValue label="Total (INR)">{formatPaise(data.amounts.totalPaise)}</KeyValue>
          {data.amounts.paidCurrency !== 'INR' && (
            <KeyValue label={`Charged (rate ${data.amounts.exchangeRate})`}>{formatMinor(data.amounts.paidAmountMinor, data.amounts.paidCurrency)}</KeyValue>
          )}
          {data.note && <KeyValue label="Note">{data.note}</KeyValue>}
          {booking.orderId && hasPermission('transactions:read') && (
            <div style={{ marginTop: '0.75rem' }}>
              <Link href={`/invoices/orders/${booking.orderId}`} className="btn btn-secondary" style={smallButton}>
                Full invoice of the order
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function BookingDetailScreen() {
  const params = useParams();
  const id = params.id as string;
  const { hasPermission } = useAuth();
  const canUpdate = hasPermission('bookings:update');
  const canDelete = hasPermission('bookings:delete');

  const [booking, setBooking] = useState<Booking | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [modal, setModal] = useState<'reschedule' | 'plan' | 'delete' | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [noteText, setNoteText] = useState('');
  const [noteError, setNoteError] = useState<string | null>(null);
  const [isAddingNote, setIsAddingNote] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setBooking(await getBooking(id));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const done = async (message: string) => {
    setModal(null);
    setNotice(message);
    await load();
  };

  const confirmDelete = async () => {
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteBooking(id);
      await done('Booking deleted. Its time is free again.');
    } catch (err) {
      setDeleteError(errorMessage(err));
    } finally {
      setIsDeleting(false);
    }
  };

  const addNote = async (event: React.FormEvent) => {
    event.preventDefault();
    const text = noteText.trim();
    if (!text) {
      setNoteError('Write the note first');
      return;
    }
    setIsAddingNote(true);
    setNoteError(null);
    try {
      await addBookingNote(id, text);
      setNoteText('');
      setNotice('Note added to the booking history.');
      await load();
    } catch (err) {
      setNoteError(errorMessage(err));
    } finally {
      setIsAddingNote(false);
    }
  };

  if (isLoading && !booking) {
    return (
      <div>
        <div className="skeleton" style={{ height: '30px', width: '250px', marginBottom: '1rem' }} />
        <div className="skeleton" style={{ height: '320px', width: '100%' }} />
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--badge-danger-text)', marginBottom: '0.5rem' }}>Booking not available</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>{error || 'Unable to load this booking'}</p>
        <Link href="/bookings" className="btn btn-secondary">
          ← Back to Bookings
        </Link>
      </div>
    );
  }

  const isDeleted = Boolean(booking.deletedAt);
  // A message consultation has no appointment: no reschedule, no plan change; staff answer it.
  const isMessage = booking.mode === 'MESSAGE';
  const canReschedule = canUpdate && !isDeleted && !isMessage && RESCHEDULABLE.includes(booking.status);
  const canChangePlan = canUpdate && !isDeleted && !isMessage && PLAN_CHANGEABLE.includes(booking.status);
  const isPaidStatus = ['CONFIRMED', 'RESCHEDULED', 'COMPLETED', 'NO_SHOW'].includes(booking.status);
  const customerName = booking.customer?.fullName || booking.customerName;

  return (
    <div>
      <PageHeader
        crumbs={[{ label: 'Bookings', href: '/bookings' }, { label: customerName }]}
        title={`${booking.consultation.title} · ${customerName}`}
        subtitle={
          <>
            {isMessage ? 'WhatsApp message consultation' : `${formatDay(booking.date)}, ${booking.slot} IST`} · <StatusPill status={booking.status} />{' '}
            <span className={`badge ${booking.timing === 'upcoming' ? 'badge-info' : 'badge-warning'}`}>{booking.timing === 'upcoming' ? 'Upcoming' : 'Past'}</span>
            {isDeleted && <span className="badge badge-danger" style={{ marginLeft: '0.35rem' }}>Deleted</span>}
          </>
        }
        actions={
          <>
            {canReschedule && (
              <button type="button" className="btn btn-primary" style={smallButton} onClick={() => setModal('reschedule')}>
                Reschedule
              </button>
            )}
            {canChangePlan && (
              <button type="button" className="btn btn-secondary" style={smallButton} onClick={() => setModal('plan')}>
                Change plan
              </button>
            )}
            {canDelete && !isDeleted && (
              <button
                type="button"
                className="btn btn-secondary"
                style={{ ...smallButton, ...dangerButton }}
                onClick={() => {
                  setDeleteError(null);
                  setModal('delete');
                }}
              >
                Delete
              </button>
            )}
            <button type="button" className="btn btn-secondary" style={smallButton} onClick={load}>
              Refresh
            </button>
          </>
        }
      />

      <SuccessBanner message={notice} onClose={() => setNotice(null)} />

      {isDeleted && (
        <InfoBox tone="warning" title="This booking was deleted">
          Deleted on {formatDateTime(booking.deletedAt)}. It is hidden from the lists and from the customer, and its time is free. It is kept here for the record and
          cannot be changed.
        </InfoBox>
      )}
      {isMessage && !isDeleted && (
        <MessageResponsePanel booking={booking} canUpdate={canUpdate} onDone={(message) => { setNotice(message); load(); }} />
      )}
      {canUpdate && !isDeleted && !isMessage && !RESCHEDULABLE.includes(booking.status) && (
        <InfoBox>
          Only a confirmed booking can be rescheduled or moved to another plan; this one is {titleCase(booking.status).toLowerCase()}.
        </InfoBox>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
        <div className="card">
          <SectionTitle>Customer</SectionTitle>
          <KeyValue label="Name">{customerName}</KeyValue>
          <KeyValue label="Phone">{booking.customer?.phoneNumber || booking.customerPhone || '—'}</KeyValue>
          <KeyValue label="E-mail">{booking.customer?.email || booking.customerEmail || '—'}</KeyValue>
          {booking.birthProfile && (
            <KeyValue label="Birth profile">
              {booking.birthProfile.name}
              {booking.birthProfile.placeName ? `, ${booking.birthProfile.placeName}` : ''}
            </KeyValue>
          )}
          {booking.primaryQuestion && (
            <div style={{ marginTop: '0.75rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Customer&rsquo;s question</div>
              <p style={{ fontSize: '0.85rem', whiteSpace: 'pre-wrap' }}>{booking.primaryQuestion}</p>
            </div>
          )}
        </div>

        <div className="card">
          <SectionTitle>Service</SectionTitle>
          <KeyValue label="Consultation">{booking.consultation.title}</KeyValue>
          <KeyValue label="Mode">{MODE_LABELS[booking.mode] ?? booking.mode}</KeyValue>
          {isMessage ? (
            <KeyValue label="Answer">{booking.respondedAt ? `Sent ${formatDateTime(booking.respondedAt)}` : 'Not answered yet'}</KeyValue>
          ) : (
            <>
              <KeyValue label="Duration">{booking.durationMinutes} min session</KeyValue>
              <KeyValue label="Date">{formatDay(booking.date)}</KeyValue>
              <KeyValue label="Slot (IST)">{booking.slot}</KeyValue>
            </>
          )}
          {booking.priceLabel && <KeyValue label="Price label">{booking.priceLabel}</KeyValue>}
          {booking.meetingLink && <KeyValue label="Meeting link">{booking.meetingLink}</KeyValue>}
          {booking.locationAddress && <KeyValue label="Address">{booking.locationAddress}</KeyValue>}
          <KeyValue label="Booked by">{booking.source === 'ADMIN' ? 'Staff (manual booking)' : 'Customer'}</KeyValue>
          <KeyValue label="Booked on">{formatDateTime(booking.createdAt)}</KeyValue>
          <KeyValue label="Reminder sent">{booking.reminderSentAt ? formatDateTime(booking.reminderSentAt) : 'Not yet'}</KeyValue>
        </div>

        <div className="card">
          <SectionTitle>Payment</SectionTitle>
          <KeyValue label="Method">{titleCase(booking.paymentMethod)}</KeyValue>
          <KeyValue label="Order payment">{titleCase(booking.order?.paymentStatus)}</KeyValue>
          <KeyValue label="Service price">{formatPaise(booking.pricePaise)}</KeyValue>
          <KeyValue label="Discount">
            − {formatPaise(booking.discountPaise)}
            {booking.discountType === 'PERCENTAGE' && booking.discountValue !== null ? ` (${basisPointsToPercent(booking.discountValue)})` : ''}
          </KeyValue>
          <KeyValue label="Taxable value">{formatPaise(booking.taxablePaise)}</KeyValue>
          <KeyValue label={`GST${booking.gstRateBasisPoints !== null ? ` ${basisPointsToPercent(booking.gstRateBasisPoints)}` : ''}${booking.gstType ? ` ${booking.gstType.toLowerCase()}` : ''}`}>
            {formatPaise(booking.gstPaise)}
          </KeyValue>
          <KeyValue label="Total amount">{formatPaise(booking.amountPaise ?? booking.order?.amount ?? null)}</KeyValue>
          {booking.paidCurrency && booking.paidCurrency !== 'INR' && <KeyValue label="Charged">{formatMinor(booking.paidAmountMinor, booking.paidCurrency)}</KeyValue>}
          <KeyValue label="Invoice number">{booking.invoiceNumber || '—'}</KeyValue>
        </div>
      </div>

      {(booking.note || booking.cancellationReason || booking.rescheduleReason) && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <SectionTitle>Notes the customer can see</SectionTitle>
          {booking.note && <KeyValue label="Booking note">{booking.note}</KeyValue>}
          {booking.rescheduleReason && <KeyValue label="Customer’s reschedule reason">{booking.rescheduleReason}</KeyValue>}
          {booking.cancellationReason && <KeyValue label="Cancellation reason">{booking.cancellationReason}</KeyValue>}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem', alignItems: 'start' }}>
        <div className="card">
          <SectionTitle>Internal notes and history · staff only</SectionTitle>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '0.75rem' }}>Never shown to the customer. Newest first.</p>
          {canUpdate && !isDeleted && (
            <form onSubmit={addNote} style={{ marginBottom: '1rem' }}>
              <textarea className="input-control" rows={2} maxLength={1000} placeholder="Add a staff note…" value={noteText} onChange={(e) => setNoteText(e.target.value)} />
              {noteError && <div style={{ fontSize: '0.75rem', color: 'var(--badge-danger-text)', marginTop: '0.2rem' }}>{noteError}</div>}
              <button type="submit" className="btn btn-primary" style={{ ...smallButton, marginTop: '0.5rem' }} disabled={isAddingNote}>
                {isAddingNote ? 'Adding…' : 'Add note'}
              </button>
            </form>
          )}
          {booking.internalNotes && (
            <div style={{ padding: '0.6rem 0', borderBottom: '1px solid var(--border-color)' }}>
              <span className="badge badge-info">Earlier note</span>
              <p style={{ fontSize: '0.85rem', marginTop: '0.35rem', whiteSpace: 'pre-wrap' }}>{booking.internalNotes}</p>
            </div>
          )}
          {booking.adminNotes.length === 0 && !booking.internalNotes ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No notes or changes recorded.</p>
          ) : (
            booking.adminNotes.map((entry) => <HistoryEntry key={entry.id} entry={entry} />)
          )}
        </div>

        {isPaidStatus && !isDeleted ? (
          <InvoiceCard booking={booking} />
        ) : (
          <div className="card">
            <SectionTitle>Invoice data</SectionTitle>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>An invoice exists only for a paid booking that has not been deleted.</p>
          </div>
        )}
      </div>

      {modal === 'reschedule' && <RescheduleModal booking={booking} onClose={() => setModal(null)} onDone={done} />}
      {modal === 'plan' && <ChangePlanModal booking={booking} onClose={() => setModal(null)} onDone={done} />}
      {modal === 'delete' && (
        <ConfirmDialog title="Delete booking" confirmLabel="Delete booking" danger busy={isDeleting} error={deleteError} onConfirm={confirmDelete} onCancel={() => setModal(null)}>
          The booking of <strong>{customerName}</strong> on {formatDay(booking.date)}, {booking.slot} will be removed from the lists and from the customer&rsquo;s
          account, and its time becomes free for others. This cannot be undone from this panel.
          {isPaidStatus ? ' The payment is not refunded, and its transaction and invoice stay in the ledger and the GST report.' : ''}
        </ConfirmDialog>
      )}
    </div>
  );
}

export default function BookingDetailPage() {
  return (
    <RequirePermission permission="bookings:read">
      <BookingDetailScreen />
    </RequirePermission>
  );
}
