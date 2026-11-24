'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { errorMessage, getShopOrderReports, ShopOrderReports } from '../../../lib/api/sales';
import { formatDateTime, formatDay, formatMinor, formatPaise, shortId, titleCase } from '../../../components/sales/format';
import { StatusPill } from '../../../components/sales/badges';
import { EmptyRow, ErrorBanner, PageHeader, RequirePermission, SectionTitle, smallButton, StatCard } from '../../../components/sales/ui';

function monthLabel(key: string): string {
  const [year, month] = key.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString('en-IN', { timeZone: 'UTC', month: 'short', year: 'numeric' });
}

/** Horizontal bars for one series; every row also prints its figures, so the bars are never the only reading. */
function RevenueBars({ rows }: { rows: Array<{ label: string; revenue: number; orders: number }> }) {
  const max = Math.max(1, ...rows.map((r) => r.revenue));
  return (
    <div className="table-container">
      <table className="admin-table">
        <thead>
          <tr>
            <th style={{ width: '22%' }}>Period</th>
            <th>Revenue</th>
            <th style={{ width: '18%', textAlign: 'right' }}>Amount</th>
            <th style={{ width: '12%', textAlign: 'right' }}>Paid orders</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label}>
              <td style={{ fontSize: '0.8rem' }}>{row.label}</td>
              <td>
                <div style={{ background: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)', height: 14 }}>
                  <div style={{ width: `${(row.revenue / max) * 100}%`, height: 14, borderRadius: 'var(--radius-sm)', background: 'var(--accent-primary)' }} />
                </div>
              </td>
              <td style={{ textAlign: 'right', fontWeight: 600, fontSize: '0.85rem' }}>{formatPaise(row.revenue)}</td>
              <td style={{ textAlign: 'right', fontSize: '0.85rem' }}>{row.orders}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Breakdown({ title, rows }: { title: string; rows: Array<{ label: string; count: number }> }) {
  const total = rows.reduce((sum, r) => sum + r.count, 0);
  return (
    <div className="card">
      <SectionTitle>{title}</SectionTitle>
      {rows.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No data yet.</p>
      ) : (
        rows.map((row) => {
          const share = total > 0 ? (row.count / total) * 100 : 0;
          return (
            <div key={row.label} style={{ marginBottom: '0.6rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '0.2rem' }}>
                <span>{titleCase(row.label)}</span>
                <span style={{ fontWeight: 600 }}>
                  {row.count} · {Math.round(share)}%
                </span>
              </div>
              <div style={{ background: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)', height: 8 }}>
                <div style={{ width: `${share}%`, height: 8, borderRadius: 'var(--radius-sm)', background: 'var(--accent-primary)' }} />
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

function OrderReportsScreen() {
  const [data, setData] = useState<ShopOrderReports | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'weekly' | 'monthly'>('weekly');

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setData(await getShopOrderReports());
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const paidCount = data?.paymentStatusBreakdown.find((r) => r.status === 'paid')?.count ?? 0;
  const chartRows = data
    ? view === 'weekly'
      ? data.dailyRevenue.map((r) => ({ label: formatDay(r.date), revenue: r.revenue, orders: r.orders }))
      : data.monthlyRevenue.map((r) => ({ label: monthLabel(r.month), revenue: r.revenue, orders: r.orders }))
    : [];
  const chartRevenue = chartRows.reduce((sum, r) => sum + r.revenue, 0);
  const chartOrders = chartRows.reduce((sum, r) => sum + r.orders, 0);

  return (
    <div>
      <PageHeader
        crumbs={[{ label: 'Shop Orders', href: '/shop-orders' }, { label: 'Reports' }]}
        title="Order Reports"
        subtitle="Counts and revenue of product orders. Every figure is calculated by the server; revenue is the INR value of paid orders."
        actions={
          <button type="button" className="btn btn-secondary" style={smallButton} onClick={load}>
            Refresh
          </button>
        }
      />

      <ErrorBanner message={error} />

      {isLoading ? (
        <div className="skeleton" style={{ height: '320px', width: '100%' }} />
      ) : data ? (
        <>
          <div className="card-grid">
            <StatCard title="Total orders" value={data.totalOrders} sub="Every product order, paid or not" />
            <StatCard title="Total revenue" value={formatPaise(data.totalSales)} sub="INR value of paid orders" />
            <StatCard title="Average order value" value={formatPaise(data.avgOrderValue)} sub="Per paid order" />
            <StatCard
              title="Paid orders"
              value={paidCount}
              sub={data.totalOrders > 0 ? `${Math.round((paidCount / data.totalOrders) * 100)}% of all orders` : 'No orders yet'}
            />
          </div>

          {data.paidByCurrency.some((row) => row.currency !== 'INR') && (
            <div className="card" style={{ marginBottom: '1.5rem' }}>
              <SectionTitle>Charged by currency</SectionTitle>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '0.5rem' }}>
                What customers were actually charged, per currency. These are never added across currencies; the revenue above is their INR value.
              </p>
              <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', fontSize: '0.9rem' }}>
                {data.paidByCurrency.map((row) => (
                  <div key={row.currency}>
                    <strong>{formatMinor(row.paidMinor, row.currency)}</strong> <span style={{ color: 'var(--text-secondary)' }}>in {row.orders} order(s)</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <div>
                <SectionTitle>Revenue</SectionTitle>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  {view === 'weekly' ? 'Last 7 days' : 'Last 6 months'}: <strong>{formatPaise(chartRevenue)}</strong> from <strong>{chartOrders}</strong> paid order(s)
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button type="button" className={`btn ${view === 'weekly' ? 'btn-primary' : 'btn-secondary'}`} style={smallButton} onClick={() => setView('weekly')}>
                  Weekly
                </button>
                <button type="button" className={`btn ${view === 'monthly' ? 'btn-primary' : 'btn-secondary'}`} style={smallButton} onClick={() => setView('monthly')}>
                  Monthly
                </button>
              </div>
            </div>
            <RevenueBars rows={chartRows} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
            <Breakdown title="Order status" rows={data.statusWiseOrders.map((r) => ({ label: r.status, count: r.count }))} />
            <Breakdown title="Payment status" rows={data.paymentStatusBreakdown.map((r) => ({ label: r.status, count: r.count }))} />
            <Breakdown title="Payment method" rows={data.paymentMethodBreakdown.map((r) => ({ label: r.method, count: r.count }))} />
            <Breakdown title="Order type" rows={data.orderTypeBreakdown.map((r) => ({ label: r.orderType, count: r.count }))} />
          </div>

          <div className="card">
            <SectionTitle>Recent orders · last 5</SectionTitle>
            <div className="table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Customer</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentOrders.length > 0 ? (
                    data.recentOrders.map((order) => (
                      <tr key={order.id}>
                        <td>
                          <Link href={`/shop-orders/${order.id}`} style={{ fontFamily: 'monospace', fontSize: '0.8rem', fontWeight: 600 }}>
                            {shortId(order.id)}
                          </Link>
                        </td>
                        <td style={{ fontSize: '0.85rem' }}>{order.shippingAddress?.fullName || order.user?.fullName || order.user?.email || '—'}</td>
                        <td style={{ fontWeight: 600, fontSize: '0.85rem' }}>{formatPaise(order.totalAmount)}</td>
                        <td>
                          <StatusPill status={order.orderStatus} />
                        </td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{formatDateTime(order.createdAt)}</td>
                      </tr>
                    ))
                  ) : (
                    <EmptyRow columns={5}>No orders yet.</EmptyRow>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

export default function OrderReportsPage() {
  return (
    <RequirePermission permission="orders:export">
      <OrderReportsScreen />
    </RequirePermission>
  );
}
