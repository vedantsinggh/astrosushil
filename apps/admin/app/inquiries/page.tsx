'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../lib/auth-context';
import { Inquiry, apiErrorMessage, formatDateTime, inquiriesApi } from '../../lib/api/content';
import {
  ConfirmDialog,
  EmptyRow,
  LoadError,
  Notice,
  PageHeader,
  Pager,
  PermissionGate,
  SkeletonRows,
  dangerText,
  labelStyle,
  smallButton,
  useNotice,
} from '../../components/content/ui';

function clip(text: string | null | undefined, length: number): string {
  if (!text) return '';
  return text.length > length ? `${text.slice(0, length)}…` : text;
}

function InquiriesScreen() {
  const { hasPermission } = useAuth();
  const canDelete = hasPermission('contacts:delete');

  const [items, setItems] = useState<Inquiry[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const { notice, showSuccess, clear } = useNotice();

  const [deleting, setDeleting] = useState<Inquiry | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const dateRangeInvalid = Boolean(fromDate && toDate && fromDate > toDate);

  const load = useCallback(async () => {
    if (dateRangeInvalid) return;
    setIsLoading(true);
    setLoadError(null);
    try {
      const res = await inquiriesApi.list({ page, limit: pageSize, search, fromDate, toDate });
      setItems(res.contacts);
      setTotal(res.total);
      setTotalPages(Math.max(1, res.pages));
      // A delete on the last page can leave it empty: step back.
      if (res.contacts.length === 0 && res.total > 0 && page > 1) setPage(Math.max(1, res.pages));
    } catch (err) {
      setLoadError(apiErrorMessage(err, 'Failed to load contact inquiries.'));
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, search, fromDate, toDate, dateRangeInvalid]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async () => {
    if (!deleting) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await inquiriesApi.remove(deleting.id);
      setDeleting(null);
      showSuccess('Inquiry deleted.');
      await load();
    } catch (err) {
      setDeleteError(apiErrorMessage(err, 'Could not delete the inquiry.'));
    } finally {
      setIsDeleting(false);
    }
  };

  const hasFilters = Boolean(searchInput || fromDate || toDate);
  const columns = 8;

  return (
    <div>
      <PageHeader
        crumbs={[{ label: 'Contact Inquiries' }]}
        title="Contact Inquiries"
        subtitle="Messages sent through the website’s contact form"
        actions={
          <button type="button" className="btn btn-secondary" style={{ fontSize: '0.85rem' }} onClick={load}>
            🔄 Refresh
          </button>
        }
      />

      <Notice notice={notice} onClose={clear} />
      {loadError && <LoadError message={loadError} onRetry={load} />}

      <div className="card" style={{ marginBottom: '1.5rem', padding: '1.25rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '1rem', alignItems: 'end' }}>
          <div style={{ gridColumn: 'span 2' }}>
            <label style={labelStyle}>Search</label>
            <input
              type="text"
              className="input-control"
              placeholder="Name, email or message…"
              maxLength={200}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
          <div>
            <label style={labelStyle}>From date (IST)</label>
            <input
              type="date"
              className="input-control"
              value={fromDate}
              max={toDate || undefined}
              onChange={(e) => {
                setFromDate(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div>
            <label style={labelStyle}>To date (IST)</label>
            <input
              type="date"
              className="input-control"
              value={toDate}
              min={fromDate || undefined}
              onChange={(e) => {
                setToDate(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div>
            <label style={labelStyle}>Per page</label>
            <select
              className="input-control"
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
            >
              {[10, 25, 50, 100].map((size) => (
                <option key={size} value={size}>
                  {size} per page
                </option>
              ))}
            </select>
          </div>
          {hasFilters && (
            <div>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setSearchInput('');
                  setFromDate('');
                  setToDate('');
                  setPage(1);
                }}
              >
                Clear filters
              </button>
            </div>
          )}
        </div>
        {dateRangeInvalid && (
          <p role="alert" style={{ fontSize: '0.8rem', fontWeight: 600, marginTop: '0.75rem', ...dangerText }}>
            The “from” date is after the “to” date.
          </p>
        )}
      </div>

      <div className="card">
        <div className="table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Subject</th>
                <th>Message</th>
                <th>Remarks</th>
                <th>Received</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <SkeletonRows columns={columns} />
              ) : items.length === 0 ? (
                <EmptyRow columns={columns}>
                  {loadError ? 'Inquiries could not be loaded.' : hasFilters ? 'No inquiries match these filters.' : 'No contact inquiries yet.'}
                </EmptyRow>
              ) : (
                items.map((item) => (
                  <tr key={item.id}>
                    <td style={{ fontWeight: 600 }}>{item.name}</td>
                    <td style={{ fontSize: '0.8rem' }}>{item.email || <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                    <td style={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>{item.phone || <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                    <td style={{ fontSize: '0.8rem', maxWidth: '160px' }}>{clip(item.subject, 60) || <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                    <td style={{ fontSize: '0.8rem', maxWidth: '280px', color: 'var(--text-secondary)' }}>{clip(item.message, 120)}</td>
                    <td style={{ fontSize: '0.8rem', maxWidth: '200px' }}>
                      {item.remarks ? clip(item.remarks, 80) : <span style={{ color: 'var(--text-muted)' }}>No remarks</span>}
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{formatDateTime(item.createdAt)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                        <Link href={`/inquiries/${item.id}`} className="btn btn-secondary" style={smallButton}>
                          View →
                        </Link>
                        {canDelete && (
                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ ...smallButton, ...dangerText }}
                            onClick={() => {
                              setDeleteError(null);
                              setDeleting(item);
                            }}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pager page={page} totalPages={totalPages} total={total} noun="inquiries" disabled={isLoading} onPage={setPage} />
      </div>

      {deleting && (
        <ConfirmDialog
          title="Delete inquiry"
          message={
            <>
              Permanently delete the inquiry from <strong>{deleting.name}</strong>, including its remarks? This cannot be undone.
            </>
          }
          busy={isDeleting}
          error={deleteError}
          onConfirm={handleDelete}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  );
}

export default function InquiriesPage() {
  return (
    <PermissionGate permission="contacts:read" area="Contact Inquiries">
      <InquiriesScreen />
    </PermissionGate>
  );
}
