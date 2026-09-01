'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiFetch } from '../../lib/api-client';
import { StatusBadge } from '../../components/StatusBadge';

interface SubscriptionItem {
  id: string;
  orderId: string;
  userId: string;
  user: {
    id: string;
    email: string;
    fullName: string | null;
  };
  plan: string;
  reportType: string;
  status: string;
  startedAt: string;
  expiresAt: string | null;
  autoRenew: boolean;
  amount: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
}

interface SubscriptionsResponse {
  items: SubscriptionItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export default function SubscriptionsPage() {
  const [items, setItems] = useState<SubscriptionItem[]>([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 25, total: 0, totalPages: 1 });

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [planFilter, setPlanFilter] = useState('');
  const [pageSizeSelect, setPageSizeSelect] = useState(25);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSubscriptions = async (page = 1, size = pageSizeSelect) => {
    setIsLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams();
      queryParams.set('page', String(page));
      queryParams.set('pageSize', String(size));
      if (search.trim()) queryParams.set('search', search.trim());
      if (statusFilter !== 'ALL') queryParams.set('status', statusFilter);
      if (planFilter) queryParams.set('plan', planFilter);

      const res = await apiFetch<SubscriptionsResponse>(`/api/v1/admin/subscriptions?${queryParams.toString()}`);
      setItems(res.items);
      setPagination(res.pagination);
    } catch (err: any) {
      setError(err?.message || 'Failed to load subscriptions');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSubscriptions(1, pageSizeSelect);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, statusFilter, planFilter, pageSizeSelect]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchSubscriptions(newPage, pageSizeSelect);
    }
  };

  return (
    <div>
      {/* BREADCRUMBS */}
      <nav style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
        <Link href="/dashboard" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>
          Admin
        </Link>{' '}
        → <strong style={{ color: 'var(--text-primary)' }}>Subscriptions</strong>
      </nav>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 className="page-title">Subscription Operations</h1>
          <p className="page-subtitle">Inspect active plans, lifetime report access, and entitlement statuses</p>
        </div>
        <button onClick={() => fetchSubscriptions(pagination.page, pageSizeSelect)} className="btn btn-secondary" style={{ fontSize: '0.85rem' }}>
          🔄 Refresh
        </button>
      </div>

      {error && (
        <div className="badge badge-danger" style={{ padding: '1rem', borderRadius: 'var(--radius-md)', width: '100%', marginBottom: '1.5rem', display: 'block' }}>
          {error}
        </div>
      )}

      {/* SEARCH & FILTERS */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1.25rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
              Search Subscriptions
            </label>
            <input
              type="text"
              className="input-control"
              placeholder="Search by User Email, Name, Subscription ID, or Order ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
              Status Filter
            </label>
            <select className="input-control" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">ACTIVE (Paid)</option>
              <option value="PENDING">PENDING</option>
              <option value="EXPIRED">EXPIRED / FAILED</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
              Report Plan
            </label>
            <select className="input-control" value={planFilter} onChange={(e) => setPlanFilter(e.target.value)}>
              <option value="">All Plans</option>
              <option value="CAREER">CAREER (Career Report Pass)</option>
              <option value="KUNDLI">KUNDLI (Full Kundli Analysis)</option>
              <option value="PLANETARY_SUMMARY">PLANETARY_SUMMARY</option>
              <option value="GUPTA_NADI_DOSSIER">GUPTA_NADI_DOSSIER</option>
            </select>
          </div>
        </div>
      </div>

      {/* SUBSCRIPTIONS TABLE */}
      <div className="card">
        <div className="table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>User / Email</th>
                <th>Plan Name</th>
                <th>Status</th>
                <th>Started</th>
                <th>Expires</th>
                <th>Amount</th>
                <th>Actions</th>
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
                items.map((sub) => (
                  <tr key={sub.id}>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{sub.user?.fullName || 'Nameless User'}</div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>{sub.user?.email}</div>
                    </td>
                    <td>
                      <span className="badge badge-info">{sub.plan}</span>
                    </td>
                    <td>
                      <StatusBadge status={sub.status} />
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {new Date(sub.startedAt).toLocaleDateString()}
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {sub.expiresAt ? new Date(sub.expiresAt).toLocaleDateString() : 'Lifetime Access'}
                    </td>
                    <td style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                      ₹{sub.amount.toFixed(2)}
                    </td>
                    <td>
                      <Link href={`/subscriptions/${sub.orderId}`} className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>
                        View Details →
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                    No subscription records match your search criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION FOOTER */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Showing page <strong>{pagination.page}</strong> of <strong>{pagination.totalPages}</strong> ({pagination.total} total subscriptions)
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
