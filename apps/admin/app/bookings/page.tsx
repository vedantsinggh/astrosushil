'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../lib/auth-context';
import {
  Booking,
  BookingFilters,
  CONSULTATION_MODES,
  ConsultationMode,
  ConsultationType,
  exportBookingsCsv,
  listBookings,
  listConsultationTypes,
  MODE_LABELS,
} from '../../lib/api/bookings';
import { errorMessage } from '../../lib/api/sales';
import { formatDay, formatMinor, formatPaise } from '../../components/sales/format';
import { StatusPill } from '../../components/sales/badges';
import {
  EmptyRow,
  ErrorBanner,
  Field,
  filterGrid,
  PageHeader,
  Pagination,
  RequirePermission,
  SkeletonRows,
  smallButton,
  SuccessBanner,
  tinyButton,
  useDebounced,
} from '../../components/sales/ui';

const PAGE_SIZE = 25;

function amountText(b: Booking): string {
  if (b.paidCurrency && b.paidCurrency !== 'INR' && b.paidAmountMinor !== null) return formatMinor(b.paidAmountMinor, b.paidCurrency);
  return formatPaise(b.amountPaise ?? b.order?.amount ?? null);
}

function BookingsScreen() {
  const { hasPermission } = useAuth();
  const canCreate = hasPermission('bookings:create');
  const canSeeTypes = hasPermission('consultations:read');

  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');
  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [date, setDate] = useState('');
  const [consultationTypeId, setConsultationTypeId] = useState('');
  const [mode, setMode] = useState<ConsultationMode | ''>('');
  const [source, setSource] = useState<'USER' | 'ADMIN' | ''>('');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounced(search, 400);

  const [items, setItems] = useState<Booking[]>([]);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState({ upcoming: 0, past: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const [types, setTypes] = useState<ConsultationType[]>([]);

  const filters: BookingFilters = { search: debouncedSearch, fromDate, toDate, date, consultationTypeId, mode, source };
  const filterKey = JSON.stringify(filters);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await listBookings(tab, JSON.parse(filterKey) as BookingFilters, page, PAGE_SIZE);
      setItems(result.items);
      setTotal(result.total);
      setCounts(result.counts);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [tab, filterKey, page]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [tab, filterKey]);

  useEffect(() => {
    if (!canSeeTypes) return;
    listConsultationTypes()
      .then(setTypes)
      .catch(() => setTypes([]));
  }, [canSeeTypes]);

  const clearFilters = () => {
    setSearch('');
    setFromDate('');
    setToDate('');
    setDate('');
    setConsultationTypeId('');
    setMode('');
    setSource('');
  };

  const exportCsv = async () => {
    setIsExporting(true);
    setError(null);
    try {
      await exportBookingsCsv(filters);
      setNotice('The bookings CSV was downloaded: every booking matching the filters, upcoming and past together. The export is recorded in the audit log.');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setIsExporting(false);
    }
  };

  const tabButton = (value: 'upcoming' | 'past', label: string, count: number) => (
    <button
      type="button"
      onClick={() => setTab(value)}
      aria-pressed={tab === value}
      style={{
        padding: '0.6rem 1rem',
        fontSize: '0.85rem',
        fontWeight: tab === value ? 700 : 500,
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        color: tab === value ? 'var(--accent-primary)' : 'var(--text-secondary)',
        borderBottom: tab === value ? '2px solid var(--accent-primary)' : '2px solid transparent',
      }}
    >
      {label} ({count})
    </button>
  );

  return (
    <div>
      <PageHeader
        crumbs={[{ label: 'Bookings' }]}
        title="Bookings"
        subtitle={`Consultation bookings · ${counts.upcoming + counts.past} matching the filters`}
        actions={
          <>
            {canCreate && (
              <Link href="/bookings/new" className="btn btn-primary" style={smallButton}>
                + New booking
              </Link>
            )}
            <button type="button" className="btn btn-secondary" style={smallButton} onClick={exportCsv} disabled={isExporting}>
              {isExporting ? 'Exporting…' : 'Export CSV'}
            </button>
            <button type="button" className="btn btn-secondary" style={smallButton} onClick={load}>
              Refresh
            </button>
          </>
        }
      />

      <ErrorBanner message={error} />
      <SuccessBanner message={notice} onClose={() => setNotice(null)} />

      <div className="card" style={{ marginBottom: '1.5rem', padding: '1.25rem' }}>
        <div style={filterGrid}>
          <Field label="Search" span={2}>
            <input type="text" className="input-control" placeholder="Search by customer name, phone or e-mail…" maxLength={100} value={search} onChange={(e) => setSearch(e.target.value)} />
          </Field>
          <Field label="Consultation plan" hint={!canSeeTypes ? 'Needs consultations:read' : undefined}>
            <select className="input-control" value={consultationTypeId} onChange={(e) => setConsultationTypeId(e.target.value)} disabled={!canSeeTypes}>
              <option value="">All consultation plans</option>
              {types.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Mode">
            <select className="input-control" value={mode} onChange={(e) => setMode(e.target.value as ConsultationMode | '')}>
              <option value="">All modes</option>
              {CONSULTATION_MODES.map((m) => (
                <option key={m} value={m}>
                  {MODE_LABELS[m]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Booked by">
            <select className="input-control" value={source} onChange={(e) => setSource(e.target.value as 'USER' | 'ADMIN' | '')}>
              <option value="">Anyone</option>
              <option value="USER">Customer</option>
              <option value="ADMIN">Staff (manual)</option>
            </select>
          </Field>
          <Field label="Appointment date">
            <input type="date" className="input-control" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Booked on, from">
            <input type="date" className="input-control" value={fromDate} max={toDate || undefined} onChange={(e) => setFromDate(e.target.value)} />
          </Field>
          <Field label="Booked on, to">
            <input type="date" className="input-control" value={toDate} min={fromDate || undefined} onChange={(e) => setToDate(e.target.value)} />
          </Field>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button type="button" className="btn btn-secondary" style={smallButton} onClick={clearFilters}>
              Clear filters
            </button>
          </div>
        </div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', gap: '0.25rem', borderBottom: '1px solid var(--border-color)', marginBottom: '1rem' }}>
          {tabButton('upcoming', 'Upcoming', counts.upcoming)}
          {tabButton('past', 'Past', counts.past)}
        </div>
        <div className="table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Service</th>
                <th>Date &amp; time (IST) {tab === 'upcoming' ? '↑' : '↓'}</th>
                <th>Duration</th>
                <th>Amount</th>
                <th>Booked by</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <SkeletonRows columns={8} />
              ) : items.length > 0 ? (
                items.map((b) => (
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
                    <td style={{ fontSize: '0.82rem' }}>
                      {b.date ? formatDay(b.date) : 'WhatsApp message'}
                      <div style={{ color: 'var(--text-secondary)' }}>{b.slot ?? (b.respondedAt ? 'Answered' : 'Awaiting answer')}</div>
                    </td>
                    <td style={{ fontSize: '0.85rem' }}>{b.durationMinutes} min</td>
                    <td style={{ fontWeight: 600, fontSize: '0.85rem' }}>{amountText(b)}</td>
                    <td style={{ fontSize: '0.8rem' }}>{b.source === 'ADMIN' ? 'Staff' : 'Customer'}</td>
                    <td>
                      <StatusPill status={b.status} />
                      {b.adminNotes.length > 0 && <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', marginTop: '0.2rem' }}>{b.adminNotes.length} staff note(s)</div>}
                    </td>
                    <td>
                      <Link href={`/bookings/${b.id}`} className="btn btn-secondary" style={tinyButton}>
                        Open →
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <EmptyRow columns={8}>{tab === 'upcoming' ? 'No upcoming bookings match these filters.' : 'No past bookings match these filters.'}</EmptyRow>
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={page} totalPages={Math.ceil(total / PAGE_SIZE)} total={total} noun="bookings" disabled={isLoading} onChange={setPage} />
        <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.75rem' }}>
          Paid bookings are listed (confirmed, rescheduled, completed, no-show). Upcoming is sorted soonest first, Past latest first. Reschedule, change plan, notes and
          delete are on each booking&rsquo;s page.
        </p>
      </div>
    </div>
  );
}

export default function BookingsPage() {
  return (
    <RequirePermission permission="bookings:read">
      <BookingsScreen />
    </RequirePermission>
  );
}
