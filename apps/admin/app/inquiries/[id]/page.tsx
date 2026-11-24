'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '../../../lib/auth-context';
import { Inquiry, apiErrorMessage, formatDateTime, inquiriesApi } from '../../../lib/api/content';
import {
  ConfirmDialog,
  LoadError,
  Notice,
  PageHeader,
  PermissionGate,
  dangerText,
  labelStyle,
  useNotice,
} from '../../../components/content/ui';

const REMARKS_MAX = 2000;

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '0.75rem', padding: '0.6rem 0', borderBottom: '1px solid var(--border-color)' }}>
      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </span>
      <span style={{ fontSize: '0.9rem', minWidth: 0, wordBreak: 'break-word' }}>{children}</span>
    </div>
  );
}

function InquiryDetailScreen() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { hasPermission } = useAuth();
  const canUpdate = hasPermission('contacts:update');
  const canDelete = hasPermission('contacts:delete');

  const [inquiry, setInquiry] = useState<Inquiry | null>(null);
  const [remarks, setRemarks] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const { notice, showSuccess, showError, clear } = useNotice();

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await inquiriesApi.get(id);
      setInquiry(data);
      setRemarks(data.remarks || '');
    } catch (err) {
      setLoadError(apiErrorMessage(err, 'Failed to load the inquiry.'));
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const remarksTooLong = remarks.trim().length > REMARKS_MAX;
  const remarksChanged = inquiry !== null && remarks.trim() !== (inquiry.remarks || '');

  const saveRemarks = async () => {
    if (!inquiry || remarksTooLong) return;
    setIsSaving(true);
    try {
      const updated = await inquiriesApi.updateRemarks(inquiry.id, remarks.trim());
      setInquiry(updated);
      setRemarks(updated.remarks || '');
      showSuccess('Remarks saved.');
    } catch (err) {
      showError(apiErrorMessage(err, 'Could not save the remarks.'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!inquiry) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await inquiriesApi.remove(inquiry.id);
      router.push('/inquiries');
    } catch (err) {
      setDeleteError(apiErrorMessage(err, 'Could not delete the inquiry.'));
      setIsDeleting(false);
    }
  };

  return (
    <div>
      <PageHeader
        crumbs={[{ label: 'Contact Inquiries', href: '/inquiries' }, { label: inquiry ? inquiry.name : 'Inquiry' }]}
        title="Contact Inquiry"
        subtitle={inquiry ? `Received ${formatDateTime(inquiry.createdAt)} (IST)` : undefined}
        actions={
          <>
            <Link href="/inquiries" className="btn btn-secondary">
              ← Back to list
            </Link>
            {canDelete && inquiry && (
              <button
                type="button"
                className="btn btn-secondary"
                style={dangerText}
                onClick={() => {
                  setDeleteError(null);
                  setConfirmDelete(true);
                }}
              >
                Delete
              </button>
            )}
          </>
        }
      />

      <Notice notice={notice} onClose={clear} />
      {loadError && <LoadError message={loadError} onRetry={load} />}

      {isLoading ? (
        <div className="card">
          <div className="skeleton" style={{ height: '24px', width: '40%', marginBottom: '1rem' }} />
          <div className="skeleton" style={{ height: '120px', width: '100%' }} />
        </div>
      ) : inquiry ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem', alignItems: 'start' }}>
          <div className="card">
            <h2 className="card-title">Inquiry</h2>
            <Row label="Name">{inquiry.name}</Row>
            <Row label="Email">
              {inquiry.email ? <a href={`mailto:${inquiry.email}`}>{inquiry.email}</a> : <span style={{ color: 'var(--text-muted)' }}>Not given</span>}
            </Row>
            <Row label="Phone">
              {inquiry.phone ? <a href={`tel:${inquiry.phone}`}>{inquiry.phone}</a> : <span style={{ color: 'var(--text-muted)' }}>Not given</span>}
            </Row>
            <Row label="Subject">{inquiry.subject || <span style={{ color: 'var(--text-muted)' }}>None</span>}</Row>
            <Row label="Received">{formatDateTime(inquiry.createdAt)}</Row>
            <Row label="Last updated">{formatDateTime(inquiry.updatedAt)}</Row>
            <div style={{ marginTop: '1rem' }}>
              <span style={labelStyle}>Message</span>
              <div
                style={{
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  background: 'var(--bg-subtle)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '0.75rem',
                  fontSize: '0.9rem',
                }}
              >
                {inquiry.message}
              </div>
            </div>
          </div>

          <div className="card">
            <h2 className="card-title">Internal remarks</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
              Visible to staff only. The customer never sees these.
            </p>
            {canUpdate ? (
              <>
                <textarea
                  className="input-control"
                  rows={8}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Follow-up notes, call outcome…"
                  disabled={isSaving}
                  style={{ borderColor: remarksTooLong ? 'var(--badge-danger-text)' : undefined }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                  <span style={{ fontSize: '0.75rem', color: remarksTooLong ? 'var(--badge-danger-text)' : 'var(--text-muted)', fontWeight: remarksTooLong ? 600 : 400 }}>
                    {remarks.trim().length} / {REMARKS_MAX}
                    {remarksTooLong ? ' — remarks must be under 2000 characters' : ''}
                  </span>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {remarksChanged && (
                      <button type="button" className="btn btn-secondary" onClick={() => setRemarks(inquiry.remarks || '')} disabled={isSaving}>
                        Reset
                      </button>
                    )}
                    <button type="button" className="btn btn-primary" onClick={saveRemarks} disabled={isSaving || !remarksChanged || remarksTooLong}>
                      {isSaving ? 'Saving…' : 'Save remarks'}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div style={{ whiteSpace: 'pre-wrap', fontSize: '0.9rem', color: inquiry.remarks ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                {inquiry.remarks || 'No remarks.'}
              </div>
            )}
          </div>
        </div>
      ) : (
        !loadError && (
          <div className="card" style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            Inquiry not found.
          </div>
        )
      )}

      {confirmDelete && inquiry && (
        <ConfirmDialog
          title="Delete inquiry"
          message={
            <>
              Permanently delete the inquiry from <strong>{inquiry.name}</strong>, including its remarks? This cannot be undone.
            </>
          }
          busy={isDeleting}
          error={deleteError}
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </div>
  );
}

export default function InquiryDetailPage() {
  return (
    <PermissionGate permission="contacts:read" area="Contact Inquiries">
      <InquiryDetailScreen />
    </PermissionGate>
  );
}
