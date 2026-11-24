'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '../../../lib/auth-context';
import { ConsultationType, deleteConsultationType, getConsultationType, MODE_LABELS } from '../../../lib/api/bookings';
import { errorMessage } from '../../../lib/api/sales';
import { basisPointsToPercent, formatDateTime, formatPaise } from '../../../components/sales/format';
import { TypeBlockedDates } from '../../../components/sales/TypeBlockedDates';
import { ConfirmDialog, dangerButton, KeyValue, PageHeader, RequirePermission, SectionTitle, smallButton, SuccessBanner } from '../../../components/sales/ui';

function DetailScreen() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { hasPermission } = useAuth();

  const [type, setType] = useState<ConsultationType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setType(await getConsultationType(id));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const saved = new URLSearchParams(window.location.search).get('saved');
    if (saved === 'created') setNotice('Consultation created.');
    if (saved === 'updated') setNotice('Consultation updated successfully.');
  }, []);

  const confirmDelete = async () => {
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteConsultationType(id);
      router.push('/consultation-types');
    } catch (err) {
      setDeleteError(errorMessage(err));
      setIsDeleting(false);
    }
  };

  if (isLoading) return <div className="skeleton" style={{ height: '320px', width: '100%' }} />;
  if (error || !type) {
    return (
      <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--badge-danger-text)', marginBottom: '0.5rem' }}>Consultation not available</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>{error || 'Unable to load this consultation'}</p>
        <Link href="/consultation-types" className="btn btn-secondary">
          ← Back to Consultation Types
        </Link>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        crumbs={[{ label: 'Consultation Types', href: '/consultation-types' }, { label: type.title }]}
        title={type.title}
        subtitle={
          <>
            <span className={`badge ${type.type === 'special' ? 'badge-warning' : 'badge-info'}`}>{type.type === 'special' ? 'Special' : 'Normal'}</span>{' '}
            <span className={`badge ${type.isActive ? 'badge-success' : 'badge-danger'}`}>{type.isActive ? 'Active' : 'Inactive'}</span>
          </>
        }
        actions={
          <>
            {hasPermission('consultations:update') && (
              <Link href={`/consultation-types/${type.id}/edit`} className="btn btn-primary" style={smallButton}>
                Edit
              </Link>
            )}
            {hasPermission('consultations:delete') && (
              <button
                type="button"
                className="btn btn-secondary"
                style={{ ...smallButton, ...dangerButton }}
                onClick={() => {
                  setDeleteError(null);
                  setDeleteOpen(true);
                }}
              >
                Delete
              </button>
            )}
          </>
        }
      />

      <SuccessBanner message={notice} onClose={() => setNotice(null)} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
        <div className="card">
          <SectionTitle>Details</SectionTitle>
          <KeyValue label="Duration">{type.durationMinutes} min</KeyValue>
          <KeyValue label="Notice days">{type.responseDays} day(s)</KeyValue>
          <KeyValue label="Price label">{type.priceLabel || '—'}</KeyValue>
          <KeyValue label="Created">{formatDateTime(type.createdAt)}</KeyValue>
          <KeyValue label="Updated">{formatDateTime(type.updatedAt)}</KeyValue>
          {type.description && (
            <div style={{ marginTop: '0.75rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Description</div>
              <p style={{ fontSize: '0.85rem', whiteSpace: 'pre-wrap' }}>{type.description}</p>
            </div>
          )}
          {type.note && (
            <div style={{ marginTop: '0.75rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Note</div>
              <p style={{ fontSize: '0.85rem', whiteSpace: 'pre-wrap' }}>{type.note}</p>
            </div>
          )}
        </div>

        <div className="card">
          <SectionTitle>Includes</SectionTitle>
          {type.includes.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Nothing listed.</p>
          ) : (
            <ul style={{ margin: '0 0 0 1.25rem', fontSize: '0.85rem', lineHeight: 1.7 }}>
              {type.includes.map((item, index) => (
                <li key={`${item}-${index}`}>{item}</li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <SectionTitle>Pricing per mode</SectionTitle>
        <div className="table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Mode</th>
                <th>Price entered</th>
                <th>GST</th>
                <th>Taxable value</th>
                <th>GST amount</th>
                <th>Customer pays</th>
                <th>Catalogue ID</th>
              </tr>
            </thead>
            <tbody>
              {type.modes.map((mode) => (
                <tr key={mode.mode}>
                  <td style={{ fontWeight: 600 }}>{MODE_LABELS[mode.mode]}</td>
                  <td>{formatPaise(mode.pricePaise)}</td>
                  <td style={{ fontSize: '0.8rem' }}>{mode.gst.enabled ? `${basisPointsToPercent(mode.gst.rateBasisPoints)} ${mode.gst.type.toLowerCase()}` : 'Not charged'}</td>
                  <td>{formatPaise(mode.taxablePaise)}</td>
                  <td>{formatPaise(mode.gstPaise)}</td>
                  <td style={{ fontWeight: 700 }}>{formatPaise(mode.priceWithGstPaise)}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{mode.catalogId}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <SectionTitle>Blocked dates for this consultation</SectionTitle>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '0.75rem' }}>
          Customers cannot book this consultation on these dates; other consultations stay bookable. To close a day for everything, use Availability.
        </p>
        <TypeBlockedDates typeId={type.id} dates={type.unavailableDates} onChange={(dates) => setType({ ...type, unavailableDates: dates })} />
      </div>

      {deleteOpen && (
        <ConfirmDialog
          title="Delete consultation"
          confirmLabel="Delete consultation"
          danger
          busy={isDeleting}
          error={deleteError}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteOpen(false)}
        >
          <strong>{type.title}</strong> will be removed and can no longer be booked or bought, in the app as well as on the website. This cannot be undone from this
          panel. Bookings and orders already made for it are kept.
        </ConfirmDialog>
      )}
    </div>
  );
}

export default function ConsultationTypeDetailPage() {
  return (
    <RequirePermission permission="consultations:read">
      <DetailScreen />
    </RequirePermission>
  );
}
