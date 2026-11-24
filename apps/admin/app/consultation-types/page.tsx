'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../lib/auth-context';
import { ConsultationType, deleteConsultationType, listConsultationTypes, MODE_LABELS } from '../../lib/api/bookings';
import { errorMessage } from '../../lib/api/sales';
import { formatPaise } from '../../components/sales/format';
import {
  ConfirmDialog,
  dangerButton,
  EmptyRow,
  ErrorBanner,
  Field,
  PageHeader,
  RequirePermission,
  SkeletonRows,
  smallButton,
  SuccessBanner,
  tinyButton,
} from '../../components/sales/ui';

/** The price a customer pays (GST included), as one figure or the range across modes. */
function priceText(type: ConsultationType): string {
  const prices = type.modes.map((m) => m.priceWithGstPaise);
  if (prices.length === 0) return '—';
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  return min === max ? formatPaise(min) : `${formatPaise(min)} – ${formatPaise(max)}`;
}

function ConsultationTypesScreen() {
  const { hasPermission } = useAuth();
  const canCreate = hasPermission('consultations:create');
  const canUpdate = hasPermission('consultations:update');
  const canDelete = hasPermission('consultations:delete');

  const [types, setTypes] = useState<ConsultationType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [toDelete, setToDelete] = useState<ConsultationType | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setTypes(await listConsultationTypes());
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // The endpoint returns every type at once (no paging or search), so the title filter runs here.
  const shown = useMemo(() => {
    const term = search.trim().toLowerCase();
    return term ? types.filter((t) => t.title.toLowerCase().includes(term)) : types;
  }, [types, search]);

  const confirmDelete = async () => {
    if (!toDelete) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteConsultationType(toDelete.id);
      setNotice(`“${toDelete.title}” deleted.`);
      setToDelete(null);
      await load();
    } catch (err) {
      setDeleteError(errorMessage(err));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div>
      <PageHeader
        crumbs={[{ label: 'Consultation Types' }]}
        title="Consultation Types"
        subtitle={`${types.length} service${types.length === 1 ? '' : 's'} configured`}
        actions={
          <>
            {canCreate && (
              <Link href="/consultation-types/new" className="btn btn-primary" style={smallButton}>
                + Add consultation
              </Link>
            )}
            <button type="button" className="btn btn-secondary" style={smallButton} onClick={load}>
              Refresh
            </button>
          </>
        }
      />

      <ErrorBanner message={error} />
      <SuccessBanner message={notice} onClose={() => setNotice(null)} />

      <div className="card" style={{ marginBottom: '1.5rem', padding: '1.25rem' }}>
        <Field label="Search">
          <input type="text" className="input-control" placeholder="Search consultations by title…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </Field>
      </div>

      <div className="card">
        <div className="table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Type</th>
                <th>Modes</th>
                <th>Duration</th>
                <th>Notice</th>
                <th>Customer pays</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <SkeletonRows columns={8} />
              ) : shown.length > 0 ? (
                shown.map((type) => (
                  <tr key={type.id}>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{type.title}</div>
                      {type.description && (
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{type.description}</div>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${type.type === 'special' ? 'badge-warning' : 'badge-info'}`}>{type.type === 'special' ? 'Special' : 'Normal'}</span>
                    </td>
                    <td style={{ fontSize: '0.8rem' }}>{type.modes.map((m) => MODE_LABELS[m.mode]).join(', ') || '—'}</td>
                    <td style={{ fontSize: '0.85rem' }}>{type.durationMinutes} min</td>
                    <td style={{ fontSize: '0.85rem' }}>{type.responseDays} day(s)</td>
                    <td style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                      {priceText(type)}
                      {type.priceLabel && <div style={{ color: 'var(--text-secondary)', fontSize: '0.72rem', fontWeight: 400 }}>{type.priceLabel}</div>}
                    </td>
                    <td>
                      <span className={`badge ${type.isActive ? 'badge-success' : 'badge-danger'}`}>{type.isActive ? 'Active' : 'Inactive'}</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <Link href={`/consultation-types/${type.id}`} className="btn btn-secondary" style={tinyButton}>
                          Details
                        </Link>
                        {canUpdate && (
                          <Link href={`/consultation-types/${type.id}/edit`} className="btn btn-secondary" style={tinyButton}>
                            Edit
                          </Link>
                        )}
                        {canDelete && (
                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ ...tinyButton, ...dangerButton }}
                            onClick={() => {
                              setDeleteError(null);
                              setToDelete(type);
                            }}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <EmptyRow columns={8}>{search ? 'No consultations match this title.' : 'No consultations configured yet.'}</EmptyRow>
              )}
            </tbody>
          </table>
        </div>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '1rem' }}>
          Showing {shown.length} of {types.length} consultations
        </div>
      </div>

      {toDelete && (
        <ConfirmDialog
          title="Delete consultation"
          confirmLabel="Delete consultation"
          danger
          busy={isDeleting}
          error={deleteError}
          onConfirm={confirmDelete}
          onCancel={() => setToDelete(null)}
        >
          <strong>{toDelete.title}</strong> will be removed from this list and can no longer be booked or bought, in the app as well as on the website. This cannot be
          undone from this panel. Bookings and orders already made for it are kept.
        </ConfirmDialog>
      )}
    </div>
  );
}

export default function ConsultationTypesPage() {
  return (
    <RequirePermission permission="consultations:read">
      <ConsultationTypesScreen />
    </RequirePermission>
  );
}
