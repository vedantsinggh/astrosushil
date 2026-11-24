'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../lib/auth-context';
import { apiErrorMessage } from '../../lib/api/uploads';
import { ShopOrdersSummary, fetchShopOrdersSummary, formatPaise } from '../../lib/api/catalogue';
import { StatusBadge } from '../StatusBadge';
import { formatDateTime } from './ui';

function monthLabel(key: string): string {
  const [year, month] = key.split('-').map(Number);
  if (!year || !month) return key;
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString(undefined, { month: 'short', year: 'numeric', timeZone: 'UTC' });
}

/** Change of this month against last month, from the two real monthly figures. Null when last month was zero. */
function growthPercent(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

function Growth({ current, previous }: { current: number; previous: number }) {
  const change = growthPercent(current, previous);
  if (change === null) return <span>No sales last month to compare</span>;
  return (
    <span style={{ color: change >= 0 ? 'var(--badge-success-text)' : 'var(--badge-danger-text)', fontWeight: 600 }}>
      {change >= 0 ? '+' : ''}
      {change}% vs last month
    </span>
  );
}

/**
 * Product-order figures for the dashboard, from `GET /admin/shop-orders/reports`.
 * Shown only to staff who hold `orders:export`, the permission of that endpoint. Every number is
 * what the endpoint returns (paid product orders, INR); nothing is estimated here.
 */
export function ShopSalesPanel() {
  const { hasPermission } = useAuth();
  const allowed = hasPermission('orders:export');
  const [summary, setSummary] = useState<ShopOrdersSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(allowed);

  useEffect(() => {
    if (!allowed) return;
    let cancelled = false;
    setIsLoading(true);
    fetchShopOrdersSummary()
      .then((result) => {
        if (!cancelled) setSummary(result);
      })
      .catch((err) => {
        if (!cancelled) setError(apiErrorMessage(err, 'Failed to load product sales'));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [allowed]);

  if (!allowed) return null;

  const months = summary?.monthlyRevenue ?? [];
  const thisMonth = months[months.length - 1];
  const lastMonth = months[months.length - 2];
  const skeleton = <div className="skeleton" style={{ height: '32px', width: '80px' }} />;

  return (
    <div className="card" style={{ marginBottom: '1.5rem' }}>
      <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.25rem', color: 'var(--text-primary)' }}>Shop Product Sales</h2>
      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
        Product orders only (reports, consultations and courses are not included). Revenue counts paid orders, in INR.
      </p>

      {error && (
        <div className="badge badge-danger" style={{ padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', width: '100%', marginBottom: '1rem', display: 'block', textTransform: 'none' }}>
          {error}
        </div>
      )}

      <div className="card-grid">
        <div className="card">
          <div className="card-title">Revenue This Month</div>
          <div className="card-value">{isLoading ? skeleton : formatPaise(thisMonth?.revenue ?? 0)}</div>
          <div className="card-subtext">{thisMonth && lastMonth ? <Growth current={thisMonth.revenue} previous={lastMonth.revenue} /> : thisMonth ? monthLabel(thisMonth.month) : ''}</div>
        </div>
        <div className="card">
          <div className="card-title">Paid Orders This Month</div>
          <div className="card-value">{isLoading ? skeleton : thisMonth?.orders ?? 0}</div>
          <div className="card-subtext">{thisMonth && lastMonth ? <Growth current={thisMonth.orders} previous={lastMonth.orders} /> : ''}</div>
        </div>
        <div className="card">
          <div className="card-title">Total Revenue</div>
          <div className="card-value">{isLoading ? skeleton : formatPaise(summary?.totalSales ?? 0)}</div>
          <div className="card-subtext">All paid product orders</div>
        </div>
        <div className="card">
          <div className="card-title">Total Orders</div>
          <div className="card-value">{isLoading ? skeleton : summary?.totalOrders ?? 0}</div>
          <div className="card-subtext">Every product order, paid or not</div>
        </div>
        <div className="card">
          <div className="card-title">Average Order Value</div>
          <div className="card-value">{isLoading ? skeleton : formatPaise(summary?.avgOrderValue ?? 0)}</div>
          <div className="card-subtext">Paid product orders</div>
        </div>
      </div>

      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
          <div>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.5rem' }}>Revenue by Month (last {months.length} months)</h3>
            <div className="table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Month</th>
                    <th>Paid Orders</th>
                    <th>Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {months.map((m) => (
                    <tr key={m.month}>
                      <td>{monthLabel(m.month)}</td>
                      <td>{m.orders}</td>
                      <td style={{ fontWeight: 600 }}>{formatPaise(m.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.5rem' }}>
              Recent Product Orders{' '}
              {hasPermission('orders:read') && (
                <Link href="/shop-orders" style={{ fontSize: '0.75rem', fontWeight: 400 }}>
                  View all
                </Link>
              )}
            </h3>
            <div className="table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Items</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th>Placed</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.recentOrders.length > 0 ? (
                    summary.recentOrders.map((order) => (
                      <tr key={order.id}>
                        <td style={{ fontSize: '0.8rem' }}>{order.user?.fullName || order.user?.email || order.user?.phoneNumber || '—'}</td>
                        <td style={{ fontSize: '0.8rem' }}>{order.items.map((item) => `${item.name} × ${item.quantity}`).join(', ') || '—'}</td>
                        <td style={{ fontWeight: 600, fontSize: '0.8rem' }}>{formatPaise(order.totalAmount)}</td>
                        <td>
                          <StatusBadge status={order.orderStatus || order.payment.status} />
                        </td>
                        <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{formatDateTime(order.createdAt)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)' }}>
                        No product orders yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
