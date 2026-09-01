'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiFetch } from '../../lib/api-client';
import { StatusBadge } from '../../components/StatusBadge';

interface PaymentItem {
  id: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  userId: string;
  user: {
    id: string;
    email: string;
    fullName: string | null;
  };
  reportType: string;
  amount: number;
  currency: string;
  status: string;
  provider: string;
  createdAt: string;
  updatedAt: string;
}

interface PaymentsResponse {
  items: PaymentItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export default function PaymentsPage() {
  const [items, setItems] = useState<PaymentItem[]>([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 25, total: 0, totalPages: 1 });

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [reportTypeFilter, setReportTypeFilter] = useState('');
  const [pageSizeSelect, setPageSizeSelect] = useState(25);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPayments = async (page = 1, size = pageSizeSelect) => {
    setIsLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams();
      queryParams.set('page', String(page));
      queryParams.set('pageSize', String(size));
      if (search.trim()) queryParams.set('search', search.trim());
      if (statusFilter !== 'ALL') queryParams.set('status', statusFilter);
      if (reportTypeFilter) queryParams.set('reportType', reportTypeFilter);

      const res = await apiFetch<PaymentsResponse>(`/api/v1/admin/payments?${queryParams.toString()}`);
      setItems(res.items);
      setPagination(res.pagination);
    } catch (err: any) {
      setError(err?.message || 'Failed to load payments');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPayments(1, pageSizeSelect);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, statusFilter, reportTypeFilter, pageSizeSelect]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchPayments(newPage, pageSizeSelect);
    }
  };

  return (
    <div>
      {/* BREADCRUMBS */}
      <nav style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
        <Link href="/dashboard" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>
          Admin
        </Link>{' '}
        → <strong style={{ color: 'var(--text-primary)' }}>Payments & Transactions</strong>
      </nav>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 className="page-title">Payment Transactions & Gateway Logs</h1>
          <p className="page-subtitle">Inspect Razorpay payment records, amounts, status, and transaction history</p>
        </div>
        <button onClick={() => fetchPayments(pagination.page, pageSizeSelect)} className="btn btn-secondary" style={{ fontSize: '0.85rem' }}>
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
              Search Transactions
            </label>
            <input
              type="text"
              className="input-control"
              placeholder="Search by Razorpay Order ID, Payment ID, User Email, or Name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
              Payment Status
            </label>
            <select className="input-control" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="ALL">All Statuses</option>
              <option value="PAID">PAID</option>
              <option value="PENDING">PENDING</option>
              <option value="FAILED">FAILED</option>
              <option value="REFUNDED">REFUNDED</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
              Report Offering
            </label>
            <select className="input-control" value={reportTypeFilter} onChange={(e) => setReportTypeFilter(e.target.value)}>
              <option value="">All Offerings</option>
              <option value="CAREER">CAREER</option>
              <option value="KUNDLI">KUNDLI</option>
              <option value="PLANETARY_SUMMARY">PLANETARY_SUMMARY</option>
            </select>
          </div>
        </div>
      </div>

      {/* PAYMENTS TABLE */}
      <div className="card">
        <div className="table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>User / Email</th>
                <th>Razorpay Order ID</th>
                <th>Payment ID</th>
                <th>Report Type</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Created</th>
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
                items.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{p.user?.fullName || 'Nameless User'}</div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>{p.user?.email}</div>
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.8rem', fontWeight: 600 }}>{p.razorpayOrderId}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{p.razorpayPaymentId}</td>
                    <td><span className="badge badge-info">{p.reportType}</span></td>
                    <td style={{ fontWeight: 600, fontSize: '0.85rem' }}>₹{p.amount.toFixed(2)}</td>
                    <td><StatusBadge status={p.status} /></td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{new Date(p.createdAt).toLocaleString()}</td>
                    <td>
                      <Link href={`/payments/${p.id}`} className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>
                        Details →
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                    No payment transaction records found matching your search criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION FOOTER */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Showing page <strong>{pagination.page}</strong> of <strong>{pagination.totalPages}</strong> ({pagination.total} total transactions)
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
