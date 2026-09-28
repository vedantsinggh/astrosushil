'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiFetch } from '../../lib/api-client';
import { StatusBadge } from '../../components/StatusBadge';
import { useAuth } from '../../lib/auth-context';

interface ReportListItem {
  id: string;
  reportType: string;
  status: string;
  originalStatus: string;
  stage: string | null;
  progress: number;
  reportVersion: string;
  fileName: string | null;
  fileSize: number | null;
  pageCount: number | null;
  errorCode: string | null;
  errorMessage: string | null;
  isStuck: boolean;
  generationDurationMs: number | null;
  createdAt: string;
  completedAt: string | null;
  failedAt: string | null;
  user: { id: string; email: string; fullName: string | null };
  birthProfile: { id: string; name: string };
}

interface ReportsResponse {
  items: ReportListItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export default function ReportsPage() {
  const { user, hasPermission } = useAuth();

  const [items, setItems] = useState<ReportListItem[]>([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10, total: 0, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [reportTypeFilter, setReportTypeFilter] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'duration' | 'status'>('newest');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const fetchReports = async (page = 1) => {
    setIsLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams();
      queryParams.set('page', String(page));
      queryParams.set('pageSize', '10');
      queryParams.set('sortBy', sortBy);
      if (search.trim()) queryParams.set('search', search.trim());
      if (statusFilter) queryParams.set('status', statusFilter);
      if (reportTypeFilter) queryParams.set('reportType', reportTypeFilter);
      if (startDate) queryParams.set('startDate', startDate);
      if (endDate) queryParams.set('endDate', endDate);

      const res = await apiFetch<ReportsResponse>(`/api/v1/admin/reports?${queryParams.toString()}`);
      setItems(res.items);
      setPagination(res.pagination);
    } catch (err: any) {
      setError(err?.message || 'Failed to load reports');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchReports(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, statusFilter, reportTypeFilter, sortBy, startDate, endDate]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchReports(newPage);
    }
  };

  const handleClearCache = async () => {
    if (!window.confirm('Clear report cache?\n\nThis removes cached report responses. Existing stored reports will not be deleted.')) {
      return;
    }

    try {
      const res = await apiFetch<{ message: string }>('/api/v1/admin/reports/cache/clear', {
        method: 'POST',
      });
      setActionMessage(res.message);
      setTimeout(() => setActionMessage(null), 5000);
    } catch (err: any) {
      setError(err?.message || 'Failed to clear server report cache');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 className="page-title">Career & Astrology Reports</h1>
          <p className="page-subtitle">Inspect report compilation pipelines, debug failures, and monitor operations</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {hasPermission('reports:clear_cache') && (
            <button onClick={handleClearCache} className="btn btn-secondary" style={{ fontSize: '0.85rem' }}>
              🗑️ Clear Server Report Cache
            </button>
          )}
          <button onClick={() => fetchReports(pagination.page)} className="btn btn-primary" style={{ fontSize: '0.85rem' }}>
            🔄 Refresh List
          </button>
        </div>
      </div>

      {actionMessage && (
        <div className="badge badge-success" style={{ padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', width: '100%', marginBottom: '1.5rem', display: 'block', fontSize: '0.85rem' }}>
          {actionMessage}
        </div>
      )}

      {error && (
        <div className="badge badge-danger" style={{ padding: '1rem', borderRadius: 'var(--radius-md)', width: '100%', marginBottom: '1.5rem', display: 'block' }}>
          {error}
        </div>
      )}

      {/* FILTER & SEARCH BAR */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1.25rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
              Search
            </label>
            <input
              type="text"
              className="input-control"
              placeholder="Search by Report ID, user email, or profile name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
              Status Filter
            </label>
            <select className="input-control" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All Statuses</option>
              <option value="FAILED">🚨 FAILED (Errors Only)</option>
              <option value="STUCK">⏳ STUCK (&gt;5m Pending)</option>
              <option value="COMPLETED">COMPLETED</option>
              <option value="QUEUED">QUEUED</option>
              <option value="CALCULATING">CALCULATING</option>
              <option value="ANALYZING">ANALYZING</option>
              <option value="RENDERING">RENDERING</option>
              <option value="COMPILING">COMPILING</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
              Report Type
            </label>
            <select className="input-control" value={reportTypeFilter} onChange={(e) => setReportTypeFilter(e.target.value)}>
              <option value="">All Types</option>
              <option value="CAREER">CAREER</option>
              <option value="KUNDLI">KUNDLI</option>
              <option value="PLANETARY_SUMMARY">PLANETARY_SUMMARY</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
              Sort By
            </label>
            <select className="input-control" value={sortBy} onChange={(e) => setSortBy(e.target.value as any)}>
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="duration">Longest Duration</option>
              <option value="status">Status</option>
            </select>
          </div>
        </div>

        {/* QUICK STATUS SHORTCUTS */}
        <div style={{ display: 'flex', gap: '0.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Quick Debug Filters:</span>
          <button
            onClick={() => setStatusFilter('FAILED')}
            className={`btn ${statusFilter === 'FAILED' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', background: statusFilter === 'FAILED' ? '#EF4444' : undefined, color: statusFilter === 'FAILED' ? '#FFF' : undefined }}
          >
            Failed Reports ({items.filter((i) => i.status === 'FAILED').length})
          </button>
          <button
            onClick={() => setStatusFilter('STUCK')}
            className={`btn ${statusFilter === 'STUCK' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', background: statusFilter === 'STUCK' ? '#F59E0B' : undefined, color: statusFilter === 'STUCK' ? '#FFF' : undefined }}
          >
            Stuck Reports
          </button>
          <button
            onClick={() => {
              setStatusFilter('');
              setReportTypeFilter('');
              setSearch('');
            }}
            className="btn btn-secondary"
            style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* REPORTS TABLE */}
      <div className="card">
        <div className="table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Report ID</th>
                <th>User / Profile</th>
                <th>Type</th>
                <th>Status</th>
                <th>Stage & Progress</th>
                <th>Duration</th>
                <th>Requested At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                [1, 2, 3, 4, 5].map((i) => (
                  <tr key={i}>
                    <td colSpan={8}>
                      <div className="skeleton" style={{ height: '24px', width: '100%' }} />
                    </td>
                  </tr>
                ))
              ) : items.length > 0 ? (
                items.map((r) => (
                  <tr key={r.id} style={{ backgroundColor: r.status === 'FAILED' ? '#FEF2F2' : r.isStuck ? '#FFFBEB' : undefined }}>
                    <td style={{ fontSize: '0.8rem', fontFamily: 'monospace', fontWeight: 600 }}>
                      {r.id.slice(0, 8)}...
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{r.birthProfile?.name || 'Profile'}</div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>{r.user?.email}</div>
                    </td>
                    <td>
                      <span className="badge badge-info">{r.reportType}</span>
                    </td>
                    <td>
                      {r.isStuck ? (
                        <span className="badge badge-warning">⏳ STUCK</span>
                      ) : (
                        <StatusBadge status={r.status} />
                      )}
                      {r.errorCode && (
                        <div style={{ fontSize: '0.7rem', color: 'var(--badge-danger-text)', fontWeight: 600, marginTop: '0.2rem' }}>
                          Code: {r.errorCode}
                        </div>
                      )}
                    </td>
                    <td>
                      <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>{r.stage || 'QUEUED'}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{r.progress}%</div>
                    </td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                      {r.generationDurationMs ? `${(r.generationDurationMs / 1000).toFixed(1)}s` : '-'}
                    </td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                      {new Date(r.createdAt).toLocaleString()}
                    </td>
                    <td>
                      <Link href={`/reports/${r.id}`} className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>
                        Debug Pipeline →
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                    No Career Reports found matching your search criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION FOOTER */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Showing page <strong>{pagination.page}</strong> of <strong>{pagination.totalPages}</strong> ({pagination.total} total reports)
          </span>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page <= 1 || isLoading}
              className="btn btn-secondary"
              style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
            >
              Previous
            </button>
            <button
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages || isLoading}
              className="btn btn-secondary"
              style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
