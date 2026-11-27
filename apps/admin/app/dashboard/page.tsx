'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '../../lib/api-client';
import { useAuth } from '../../lib/auth-context';
import { formatDateTime, formatPaise } from '../../components/sales/format';
import { Icon } from '../../components/icons';

interface KindBlock {
  thisMonth: number;
  lastMonth: number;
  total: number;
  growth: number;
}

interface BusinessDashboard {
  generatedAt: string;
  revenue: { totalPaise: number; thisMonthPaise: number; lastMonthPaise: number; growth: number };
  orders: KindBlock;
  bookings: KindBlock;
  reportOrders: KindBlock;
  customers: { total: number; newThisMonth: number; newLastMonth: number; growth: number };
  monthly: Array<{ month: string; revenuePaise: number; order: number; consultation: number; report: number }>;
  yearly: Array<{ financialYear: string; revenuePaise: number }>;
  topProducts: Array<{ catalogId: string; title: string; quantity: number; revenuePaise: number }>;
  recentSales: Array<{ id: string; orderId: string | null; type: 'order' | 'consultation' | 'report'; customerName: string | null; amountPaise: number; currency: string; amountMinor: number; createdAt: string }>;
  attention: { bookingsToday: number; bookingsNext7Days: number; paymentConflicts: number; invoicesPending: number; inquiriesLast7Days: number };
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const TYPE_LABEL = { order: 'Product', consultation: 'Booking', report: 'Report' } as const;

function monthLabel(key: string, withYear = false): string {
  const [y, m] = key.split('-');
  return `${MONTHS[Number(m) - 1]}${withYear ? ` ${y}` : ''}`;
}

/** Compact rupees for chart labels: ₹1.2L, ₹3.4Cr, ₹950. */
function shortRupees(paise: number): string {
  const r = paise / 100;
  if (r >= 1e7) return `₹${(r / 1e7).toFixed(1)}Cr`;
  if (r >= 1e5) return `₹${(r / 1e5).toFixed(1)}L`;
  if (r >= 1e3) return `₹${(r / 1e3).toFixed(1)}K`;
  return `₹${Math.round(r)}`;
}

function Delta({ value, suffix = 'vs last month' }: { value: number; suffix?: string }) {
  const up = value >= 0;
  return (
    <span style={{ fontSize: '0.76rem' }}>
      <span className={up ? 'stat-delta-up' : 'stat-delta-down'} style={{ fontWeight: 600 }}>
        {up ? '▲' : '▼'} {Math.abs(value)}%
      </span>{' '}
      <span style={{ color: 'var(--text-muted)' }}>{suffix}</span>
    </span>
  );
}

function Kpi({ title, value, children, href }: { title: string; value: React.ReactNode; children?: React.ReactNode; href?: string }) {
  const body = (
    <div className="card" style={{ height: '100%' }}>
      <div className="card-title">{title}</div>
      <div className="card-value">{value}</div>
      <div style={{ marginTop: '0.3rem' }}>{children}</div>
    </div>
  );
  return href ? (
    <Link href={href} style={{ textDecoration: 'none', color: 'inherit' }}>
      {body}
    </Link>
  ) : (
    body
  );
}

/** Revenue per month: one series, one hue; hover a bar for the exact figure. */
function RevenueChart({ points }: { points: BusinessDashboard['monthly'] }) {
  const [hover, setHover] = useState<number | null>(null);
  const width = 720;
  const height = 220;
  const pad = { top: 16, right: 8, bottom: 26, left: 52 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;
  const max = Math.max(1, ...points.map((p) => p.revenuePaise));
  const step = plotW / points.length;
  const barW = Math.min(36, step - 8);
  const ticks = [0, 0.5, 1].map((f) => f * max);

  return (
    <div style={{ position: 'relative' }}>
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" role="img" aria-label="Revenue per month for the last twelve months">
        {ticks.map((t) => {
          const y = pad.top + plotH - (t / max) * plotH;
          return (
            <g key={t}>
              <line x1={pad.left} x2={width - pad.right} y1={y} y2={y} stroke="var(--border-color)" strokeWidth={1} />
              <text x={pad.left - 8} y={y + 4} textAnchor="end" fontSize="11" fill="var(--text-muted)">
                {shortRupees(t)}
              </text>
            </g>
          );
        })}
        {points.map((p, i) => {
          const h = Math.max(p.revenuePaise > 0 ? 2 : 0, (p.revenuePaise / max) * plotH);
          const x = pad.left + i * step + (step - barW) / 2;
          const y = pad.top + plotH - h;
          const r = Math.min(4, h / 2, barW / 2);
          const d = h <= 0 ? '' : `M${x},${y + h} V${y + r} Q${x},${y} ${x + r},${y} H${x + barW - r} Q${x + barW},${y} ${x + barW},${y + r} V${y + h} Z`;
          return (
            <g key={p.month} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <rect x={pad.left + i * step} y={pad.top} width={step} height={plotH} fill="transparent" />
              {d && <path d={d} fill="var(--accent-primary)" opacity={hover === null || hover === i ? 1 : 0.45} />}
              <text x={pad.left + i * step + step / 2} y={height - 8} textAnchor="middle" fontSize="11" fill="var(--text-muted)">
                {monthLabel(p.month)}
              </text>
            </g>
          );
        })}
      </svg>
      {hover !== null && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: `${((pad.left + hover * step + step / 2) / width) * 100}%`,
            transform: 'translateX(-50%)',
            background: 'var(--text-primary)',
            color: '#FFF',
            padding: '0.4rem 0.6rem',
            borderRadius: 6,
            fontSize: '0.75rem',
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          <strong>{monthLabel(points[hover].month, true)}</strong>: {formatPaise(points[hover].revenuePaise)}
          <div style={{ opacity: 0.8 }}>
            {points[hover].order} product · {points[hover].consultation} booking · {points[hover].report} report
          </div>
        </div>
      )}
    </div>
  );
}

function AttentionItem({ label, count, href, tone }: { label: string; count: number; href: string; tone: 'warning' | 'info' }) {
  return (
    <Link
      href={href}
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0.6rem 0.75rem',
        borderBottom: '1px solid var(--border-color)',
        color: 'var(--text-primary)',
        textDecoration: 'none',
      }}
    >
      <span style={{ fontSize: '0.85rem' }}>{label}</span>
      <span className={`badge ${count > 0 ? (tone === 'warning' ? 'badge-warning' : 'badge-info') : 'badge-success'}`}>{count}</span>
    </Link>
  );
}

export default function DashboardPage() {
  const { hasPermission } = useAuth();
  const [data, setData] = useState<BusinessDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'chart' | 'table'>('chart');

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setData(await apiFetch<BusinessDashboard>('/api/v1/admin/dashboard/business'));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load the dashboard');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (!hasPermission('dashboard:read')) {
    return (
      <div>
        <h1 className="page-title">Welcome</h1>
        <p className="page-subtitle">Choose a screen from the menu on the left.</p>
      </div>
    );
  }

  const skeleton = <div className="skeleton" style={{ height: 28, width: 110 }} />;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle" style={{ marginBottom: 0 }}>
            Sales of the website and the app. Revenue is the INR value of successful payments, by Indian calendar month.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {hasPermission('bookings:create') && (
            <Link href="/bookings/new" className="btn btn-primary">
              <Icon name="plus" size={14} /> New booking
            </Link>
          )}
          <button className="btn btn-secondary" onClick={load} disabled={isLoading}>
            <Icon name="refresh" size={14} /> Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="card" style={{ borderColor: 'var(--badge-danger-text)', color: 'var(--badge-danger-text)', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      <div className="card-grid">
        <Kpi title="Revenue this month" value={data ? formatPaise(data.revenue.thisMonthPaise) : skeleton} href="/transactions">
          {data && <Delta value={data.revenue.growth} />}
        </Kpi>
        <Kpi title="Product orders" value={data ? data.orders.thisMonth : skeleton} href="/shop-orders">
          {data && <Delta value={data.orders.growth} />}
        </Kpi>
        <Kpi title="Bookings" value={data ? data.bookings.thisMonth : skeleton} href="/bookings">
          {data && <Delta value={data.bookings.growth} />}
        </Kpi>
        <Kpi title="Report orders" value={data ? data.reportOrders.thisMonth : skeleton} href="/reports">
          {data && <Delta value={data.reportOrders.growth} />}
        </Kpi>
        <Kpi title="New customers" value={data ? data.customers.newThisMonth : skeleton} href="/customers">
          {data && <Delta value={data.customers.growth} />}
        </Kpi>
      </div>

      <div className="dash-split">
        <div className="card" style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <div className="card-title" style={{ marginBottom: 0 }}>
              Revenue, last 12 months
            </div>
            <div style={{ display: 'flex', gap: '0.25rem' }}>
              <button className={`btn ${view === 'chart' ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '0.2rem 0.55rem', fontSize: '0.75rem' }} onClick={() => setView('chart')}>
                Chart
              </button>
              <button className={`btn ${view === 'table' ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '0.2rem 0.55rem', fontSize: '0.75rem' }} onClick={() => setView('table')}>
                Table
              </button>
            </div>
          </div>
          {!data ? (
            <div className="skeleton" style={{ height: 220 }} />
          ) : view === 'chart' ? (
            <RevenueChart points={data.monthly} />
          ) : (
            <div className="table-container" style={{ maxHeight: 260, overflowY: 'auto' }}>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Month</th>
                    <th style={{ textAlign: 'right' }}>Revenue</th>
                    <th style={{ textAlign: 'right' }}>Products</th>
                    <th style={{ textAlign: 'right' }}>Bookings</th>
                    <th style={{ textAlign: 'right' }}>Reports</th>
                  </tr>
                </thead>
                <tbody>
                  {[...data.monthly].reverse().map((m) => (
                    <tr key={m.month}>
                      <td>{monthLabel(m.month, true)}</td>
                      <td style={{ textAlign: 'right' }}>{formatPaise(m.revenuePaise)}</td>
                      <td style={{ textAlign: 'right' }}>{m.order}</td>
                      <td style={{ textAlign: 'right' }}>{m.consultation}</td>
                      <td style={{ textAlign: 'right' }}>{m.report}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {data && (
            <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', marginTop: '0.75rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              <span>
                All-time revenue: <strong style={{ color: 'var(--text-primary)' }}>{formatPaise(data.revenue.totalPaise)}</strong>
              </span>
              {data.yearly.slice(-3).map((y) => (
                <span key={y.financialYear}>
                  FY {y.financialYear}: <strong style={{ color: 'var(--text-primary)' }}>{formatPaise(y.revenuePaise)}</strong>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="card" style={{ padding: 0 }}>
          <div className="card-title" style={{ padding: '1rem 1rem 0.5rem' }}>
            Needs attention
          </div>
          {data ? (
            <>
              <AttentionItem label="Consultations today" count={data.attention.bookingsToday} href="/bookings" tone="info" />
              <AttentionItem label="Consultations in the next 7 days" count={data.attention.bookingsNext7Days} href="/bookings" tone="info" />
              <AttentionItem label="Paid bookings without a slot" count={data.attention.paymentConflicts} href="/transactions/payment-conflicts" tone="warning" />
              <AttentionItem label="Invoices waiting for a number" count={data.attention.invoicesPending} href="/invoices" tone="warning" />
              <AttentionItem label="Contact inquiries (7 days)" count={data.attention.inquiriesLast7Days} href="/inquiries" tone="info" />
            </>
          ) : (
            <div className="skeleton" style={{ height: 200, margin: '0 1rem 1rem' }} />
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
        <div className="card" style={{ minWidth: 0 }}>
          <div className="card-title">Recent sales</div>
          <div className="table-container" style={{ border: 'none', boxShadow: 'none' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Type</th>
                  <th>Customer</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {(data?.recentSales ?? []).map((sale) => (
                  <tr key={sale.id}>
                    <td style={{ whiteSpace: 'nowrap', fontSize: '0.8rem' }}>{formatDateTime(sale.createdAt)}</td>
                    <td>{TYPE_LABEL[sale.type]}</td>
                    <td>{sale.customerName || '—'}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>
                      {sale.orderId ? <Link href={`/invoices/orders/${sale.orderId}`}>{formatPaise(sale.amountPaise)}</Link> : formatPaise(sale.amountPaise)}
                    </td>
                  </tr>
                ))}
                {data && data.recentSales.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ color: 'var(--text-muted)', textAlign: 'center' }}>
                      No sales yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card" style={{ minWidth: 0 }}>
          <div className="card-title">Top products</div>
          <div className="table-container" style={{ border: 'none', boxShadow: 'none' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th style={{ textAlign: 'right' }}>Sold</th>
                  <th style={{ textAlign: 'right' }}>Revenue</th>
                </tr>
              </thead>
              <tbody>
                {(data?.topProducts ?? []).map((p) => (
                  <tr key={p.catalogId}>
                    <td>{p.title}</td>
                    <td style={{ textAlign: 'right' }}>{p.quantity}</td>
                    <td style={{ textAlign: 'right' }}>{formatPaise(p.revenuePaise)}</td>
                  </tr>
                ))}
                {data && data.topProducts.length === 0 && (
                  <tr>
                    <td colSpan={3} style={{ color: 'var(--text-muted)', textAlign: 'center' }}>
                      No product sales yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {data && (
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
              {data.orders.total} product orders · {data.bookings.total} bookings · {data.reportOrders.total} report orders · {data.customers.total} customers in total
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
