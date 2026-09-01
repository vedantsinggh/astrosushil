'use client';

import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../lib/api-client';

interface AuditLogItem {
  id: string;
  adminId: string;
  adminEmail: string;
  action: string;
  resource: string | null;
  details: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

interface AuditLogResponse {
  items: AuditLogItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export default function AuditLogPage() {
  const [items, setItems] = useState<AuditLogItem[]>([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 25, total: 0, totalPages: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters state
  const [adminEmailFilter, setAdminEmailFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [resourceFilter, setResourceFilter] = useState('');

  // Selected Log Modal
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);

  const fetchLogs = async (page = 1) => {
    setIsLoading(true);
    setError(null);

    const queryParams = new URLSearchParams({
      page: String(page),
      pageSize: '25',
    });

    if (adminEmailFilter) queryParams.set('adminEmail', adminEmailFilter);
    if (actionFilter) queryParams.set('action', actionFilter);
    if (resourceFilter) queryParams.set('resource', resourceFilter);

    try {
      const res = await apiFetch<AuditLogResponse>(`/api/v1/admin/audit-log?${queryParams.toString()}`);
      setItems(res.items);
      setPagination(res.pagination);
    } catch (err: any) {
      setError(err?.message || 'Failed to load audit logs');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(1);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLogs(1);
  };

  const handleReset = () => {
    setAdminEmailFilter('');
    setActionFilter('');
    setResourceFilter('');
    fetchLogs(1);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchLogs(newPage);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">Administrative Audit Log</h1>
          <p className="page-subtitle">Immutable log of operator actions, status mutations, user entitlement updates, and security events</p>
        </div>
        <button onClick={() => fetchLogs(pagination.page)} className="btn btn-secondary" style={{ fontSize: '0.85rem' }}>
          🔄 Refresh
        </button>
      </div>

      {/* FILTER BAR */}
      <form onSubmit={handleSearch} className="card" style={{ marginBottom: '1.5rem', padding: '1rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', alignItems: 'end' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>
              Admin Email
            </label>
            <input
              type="text"
              className="input-control"
              placeholder="e.g. operator@astrosushil.com"
              value={adminEmailFilter}
              onChange={(e) => setAdminEmailFilter(e.target.value)}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>
              Action Type
            </label>
            <input
              type="text"
              className="input-control"
              placeholder="e.g. USER_SUSPENDED, ENTITLEMENT_GRANTED"
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>
              Target Resource / User ID
            </label>
            <input
              type="text"
              className="input-control"
              placeholder="e.g. User:usr_123"
              value={resourceFilter}
              onChange={(e) => setResourceFilter(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="submit" className="btn btn-primary" style={{ flex: 1, fontSize: '0.85rem' }}>
              Filter
            </button>
            <button type="button" onClick={handleReset} className="btn btn-secondary" style={{ fontSize: '0.85rem' }}>
              Reset
            </button>
          </div>
        </div>
      </form>

      {error && (
        <div className="badge badge-danger" style={{ padding: '1rem', borderRadius: 'var(--radius-md)', width: '100%', marginBottom: '1.5rem', display: 'block' }}>
          {error}
        </div>
      )}

      {/* AUDIT LOG TABLE */}
      <div className="card">
        <div className="table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Administrator</th>
                <th>Action</th>
                <th>Target Resource</th>
                <th>Summary / Details</th>
                <th>IP Address</th>
                <th>Inspect</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                [1, 2, 3, 4, 5].map((i) => (
                  <tr key={i}>
                    <td colSpan={7}>
                      <div className="skeleton" style={{ height: '24px', width: '100%' }} />
                    </td>
                  </tr>
                ))
              ) : items.length > 0 ? (
                items.map((log) => (
                  <tr key={log.id}>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontFamily: 'monospace' }}>
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td style={{ fontWeight: 600, fontSize: '0.85rem' }}>{log.adminEmail}</td>
                    <td>
                      <span className="badge badge-info" style={{ fontSize: '0.75rem' }}>{log.action}</span>
                    </td>
                    <td style={{ fontSize: '0.8rem', fontFamily: 'monospace' }}>{log.resource || '-'}</td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {log.details || '-'}
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{log.ipAddress || '127.0.0.1'}</td>
                    <td>
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="btn btn-secondary"
                        style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                    No administrative audit logs match criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION FOOTER */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Showing page <strong>{pagination.page}</strong> of <strong>{pagination.totalPages}</strong> ({pagination.total} total logs)
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

      {/* INSPECTION MODAL */}
      {selectedLog && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ maxWidth: '550px', padding: '1.5rem', width: '90%' }}>
            <h3 style={{ marginTop: 0, color: 'var(--text-primary)' }}>Audit Log Inspection</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem' }}>
              <div>
                <span style={{ color: 'var(--text-secondary)', display: 'block' }}>Log Entry ID</span>
                <code style={{ fontFamily: 'monospace' }}>{selectedLog.id}</code>
              </div>
              <div>
                <span style={{ color: 'var(--text-secondary)', display: 'block' }}>Action Type</span>
                <strong className="badge badge-info">{selectedLog.action}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-secondary)', display: 'block' }}>Administrator Email</span>
                <strong>{selectedLog.adminEmail}</strong> (ID: {selectedLog.adminId})
              </div>
              <div>
                <span style={{ color: 'var(--text-secondary)', display: 'block' }}>Target Resource</span>
                <code>{selectedLog.resource || 'N/A'}</code>
              </div>
              <div>
                <span style={{ color: 'var(--text-secondary)', display: 'block' }}>Timestamp</span>
                <strong>{new Date(selectedLog.createdAt).toLocaleString()}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-secondary)', display: 'block' }}>Client IP & User Agent</span>
                <div>IP: <code>{selectedLog.ipAddress || 'Unknown'}</code></div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>{selectedLog.userAgent || 'N/A'}</div>
              </div>
              <div>
                <span style={{ color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Log Payload / Details</span>
                <pre style={{ background: '#1F2937', color: '#F9FAFB', padding: '0.75rem', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', overflowX: 'auto', whiteSpace: 'pre-wrap' }}>
                  {selectedLog.details || 'No additional metadata logged'}
                </pre>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <button onClick={() => setSelectedLog(null)} className="btn btn-primary">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
