'use client';

import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../lib/api-client';
import { StatusBadge } from '../../components/StatusBadge';

type Period = 'today' | '7d' | '30d' | '90d' | '12m' | 'custom';
type ActiveTab = 'overview' | 'users' | 'reports' | 'jyoti' | 'revenue' | 'system';

interface OverviewData {
  period: string;
  startDate: string;
  endDate: string;
  metrics: {
    totalUsers: { value: number; change: null };
    newUsers: { value: number; changePercent: number | null; text: string };
    birthProfilesCreated: { value: number; changePercent: number | null; text: string };
    reportsCompleted: { value: number; changePercent: number | null; text: string };
    reportsFailed: { value: number; changePercent: number | null; text: string };
    jyotiConversations: { value: number; text: string; note: string };
    paidOrdersCount: { value: number; changePercent: number | null; text: string };
    revenueRupees: { value: number; rawPaise: number; changePercent: number | null; text: string };
  };
}

interface UserAnalyticsData {
  period: string;
  metrics: {
    totalUsers: number;
    newRegistrations: number;
    verifiedUsers: number;
    unverifiedUsers: number;
    usersWithBirthProfiles: number;
    paidUsers: number;
    retentionNote: string;
  };
  dailyTrend: Array<{ date: string; newUsers: number; verifiedUsers: number }>;
}

interface ReportAnalyticsData {
  period: string;
  metrics: {
    reportsRequested: number;
    reportsCompleted: number;
    reportsFailed: number;
    reportsProcessing: number;
    avgDurationSeconds: number;
    successRate: number;
    failureRate: number;
  };
  breakdownByType: Array<{ reportType: string; total: number; completed: number; failed: number }>;
  recentFailures: Array<{
    id: string;
    userEmail: string;
    reportType: string;
    errorCode: string;
    errorMessage: string;
    failedAt: string;
  }>;
}

interface JyotiAnalyticsData {
  note: string;
  conversations: number;
  messages: number;
  activeUsers: number;
}

interface RevenueAnalyticsData {
  period: string;
  metrics: {
    totalRevenueRupees: number;
    successfulPayments: number;
    failedPayments: number;
    pendingPayments: number;
    refundedPayments: number;
  };
  revenueByReportType: Array<{ reportType: string; paidCount: number; revenueRupees: number }>;
  dailyRevenue: Array<{ date: string; revenueRupees: number; count: number }>;
}

interface SystemHealthAnalyticsData {
  period: string;
  metrics: {
    reportFailures: number;
    paymentFailures: number;
  };
  topErrors: Array<{ code: string; occurrences: number; lastOccurrence: string | null }>;
}

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<Period>('7d');
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');

  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [userData, setUserData] = useState<UserAnalyticsData | null>(null);
  const [reportData, setReportData] = useState<ReportAnalyticsData | null>(null);
  const [jyotiData, setJyotiData] = useState<JyotiAnalyticsData | null>(null);
  const [revenueData, setRevenueData] = useState<RevenueAnalyticsData | null>(null);
  const [systemData, setSystemData] = useState<SystemHealthAnalyticsData | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = async () => {
    setIsLoading(true);
    setError(null);
    try {
      let queryStr = `period=${period}`;
      if (period === 'custom' && customStart && customEnd) {
        queryStr += `&startDate=${encodeURIComponent(customStart)}&endDate=${encodeURIComponent(customEnd)}`;
      }

      if (activeTab === 'overview') {
        const res = await apiFetch<OverviewData>(`/api/v1/admin/analytics/overview?${queryStr}`);
        setOverview(res);
      } else if (activeTab === 'users') {
        const res = await apiFetch<UserAnalyticsData>(`/api/v1/admin/analytics/users?${queryStr}`);
        setUserData(res);
      } else if (activeTab === 'reports') {
        const res = await apiFetch<ReportAnalyticsData>(`/api/v1/admin/analytics/reports?${queryStr}`);
        setReportData(res);
      } else if (activeTab === 'jyoti') {
        const res = await apiFetch<JyotiAnalyticsData>(`/api/v1/admin/analytics/jyoti`);
        setJyotiData(res);
      } else if (activeTab === 'revenue') {
        const res = await apiFetch<RevenueAnalyticsData>(`/api/v1/admin/analytics/revenue?${queryStr}`);
        setRevenueData(res);
      } else if (activeTab === 'system') {
        const res = await apiFetch<SystemHealthAnalyticsData>(`/api/v1/admin/analytics/system?${queryStr}`);
        setSystemData(res);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load analytics metrics');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [period, activeTab]);

  const handleExportCsv = (type: 'users' | 'reports' | 'revenue') => {
    let url = `/api/v1/admin/analytics/export?type=${type}&period=${period}`;
    if (period === 'custom' && customStart && customEnd) {
      url += `&startDate=${encodeURIComponent(customStart)}&endDate=${encodeURIComponent(customEnd)}`;
    }
    window.open(url, '_blank');
  };

  const renderChangeBadge = (changePercent: number | null, text: string) => {
    if (changePercent === null) {
      return <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{text}</span>;
    }
    const isPositive = changePercent >= 0;
    return (
      <span
        style={{
          fontSize: '0.75rem',
          fontWeight: 700,
          padding: '0.15rem 0.4rem',
          borderRadius: '4px',
          backgroundColor: isPositive ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
          color: isPositive ? '#4ADE80' : '#F87171',
        }}
      >
        {text}
      </span>
    );
  };

  return (
    <div>
      {/* PAGE HEADER & DATE FILTER BAR */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', gap: '1rem' }}>
        <div>
          <h1 className="page-title">Admin Analytics & Product Intelligence</h1>
          <p className="page-subtitle">Deterministic database metrics, revenue, pipeline health, and product trends</p>
        </div>

        {/* DATE RANGE FILTER BUTTONS */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'var(--bg-card)', padding: '0.35rem 0.6rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
          {(['today', '7d', '30d', '90d', '12m', 'custom'] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className="btn"
              style={{
                padding: '0.3rem 0.6rem',
                fontSize: '0.75rem',
                backgroundColor: period === p ? 'var(--accent-primary)' : 'transparent',
                color: period === p ? '#FFF' : 'var(--text-secondary)',
                border: 'none',
              }}
            >
              {p === 'today' ? 'Today' : p === '7d' ? '7 Days' : p === '30d' ? '30 Days' : p === '90d' ? '90 Days' : p === '12m' ? '12 Months' : 'Custom'}
            </button>
          ))}
        </div>
      </div>

      {/* CUSTOM DATE RANGE INPUTS */}
      {period === 'custom' && (
        <div className="card" style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Start Date</label>
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="input-field"
              style={{ fontSize: '0.85rem', padding: '0.4rem' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>End Date</label>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="input-field"
              style={{ fontSize: '0.85rem', padding: '0.4rem' }}
            />
          </div>
          <button onClick={fetchAnalytics} className="btn btn-primary" style={{ marginTop: '1.25rem', fontSize: '0.8rem' }}>
            Apply Filter
          </button>
        </div>
      )}

      {/* NAVIGATION TABS */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', marginBottom: '1.5rem', overflowX: 'auto' }}>
        {[
          { key: 'overview', label: '📊 Overview' },
          { key: 'users', label: '👥 Users & Retention' },
          { key: 'reports', label: '📜 Report Pipeline' },
          { key: 'jyoti', label: '💬 Jyoti AI' },
          { key: 'revenue', label: '💰 Revenue & Payments' },
          { key: 'system', label: '⚡ System Health' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as ActiveTab)}
            style={{
              padding: '0.75rem 1.25rem',
              fontWeight: 600,
              fontSize: '0.85rem',
              color: activeTab === tab.key ? '#FFF' : 'var(--text-secondary)',
              borderBottom: activeTab === tab.key ? '2px solid var(--accent-gold)' : '2px solid transparent',
              background: 'transparent',
              borderLeft: 'none',
              borderRight: 'none',
              borderTop: 'none',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="badge badge-danger" style={{ padding: '1rem', width: '100%', marginBottom: '1.5rem', display: 'block' }}>
          ⚠️ {error}
        </div>
      )}

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div>
          <div className="card-grid">
            <div className="card">
              <div className="card-title">Total Registered Users</div>
              <div className="card-value">{isLoading ? <div className="skeleton" style={{ height: '32px', width: '80px' }} /> : overview?.metrics.totalUsers.value.toLocaleString() || 0}</div>
              <div className="card-subtext">All active customer accounts</div>
            </div>

            <div className="card">
              <div className="card-title">New Users ({overview?.period || '7 Days'})</div>
              <div className="card-value" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {isLoading ? <div className="skeleton" style={{ height: '32px', width: '80px' }} /> : overview?.metrics.newUsers.value.toLocaleString() || 0}
                {overview && renderChangeBadge(overview.metrics.newUsers.changePercent, overview.metrics.newUsers.text)}
              </div>
              <div className="card-subtext">New account registrations</div>
            </div>

            <div className="card">
              <div className="card-title">Birth Profiles Created</div>
              <div className="card-value" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {isLoading ? <div className="skeleton" style={{ height: '32px', width: '80px' }} /> : overview?.metrics.birthProfilesCreated.value.toLocaleString() || 0}
                {overview && renderChangeBadge(overview.metrics.birthProfilesCreated.changePercent, overview.metrics.birthProfilesCreated.text)}
              </div>
              <div className="card-subtext">Calculated astrological charts</div>
            </div>

            <div className="card">
              <div className="card-title">Reports Completed</div>
              <div className="card-value" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {isLoading ? <div className="skeleton" style={{ height: '32px', width: '80px' }} /> : overview?.metrics.reportsCompleted.value.toLocaleString() || 0}
                {overview && renderChangeBadge(overview.metrics.reportsCompleted.changePercent, overview.metrics.reportsCompleted.text)}
              </div>
              <div className="card-subtext">Successfully compiled reports</div>
            </div>

            <div className="card" style={{ borderColor: (overview?.metrics.reportsFailed.value || 0) > 0 ? '#FCA5A5' : 'var(--border-color)' }}>
              <div className="card-title">Reports Failed</div>
              <div className="card-value" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: (overview?.metrics.reportsFailed.value || 0) > 0 ? 'var(--badge-danger-text)' : 'var(--text-primary)' }}>
                {isLoading ? <div className="skeleton" style={{ height: '32px', width: '80px' }} /> : overview?.metrics.reportsFailed.value.toLocaleString() || 0}
                {overview && renderChangeBadge(overview.metrics.reportsFailed.changePercent, overview.metrics.reportsFailed.text)}
              </div>
              <div className="card-subtext">Compilation & LLM failures</div>
            </div>

            <div className="card">
              <div className="card-title">Revenue (₹)</div>
              <div className="card-value" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-gold)' }}>
                {isLoading ? <div className="skeleton" style={{ height: '32px', width: '80px' }} /> : `₹${(overview?.metrics.revenueRupees.value || 0).toLocaleString()}`}
                {overview && renderChangeBadge(overview.metrics.revenueRupees.changePercent, overview.metrics.revenueRupees.text)}
              </div>
              <div className="card-subtext">Verified Razorpay payments</div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: USER ANALYTICS */}
      {activeTab === 'users' && (
        <div>
          <div className="card-grid" style={{ marginBottom: '1.5rem' }}>
            <div className="card">
              <div className="card-title">Total Users</div>
              <div className="card-value">{isLoading ? <div className="skeleton" style={{ height: '32px', width: '80px' }} /> : userData?.metrics.totalUsers.toLocaleString() || 0}</div>
            </div>
            <div className="card">
              <div className="card-title">New Registrations</div>
              <div className="card-value">{isLoading ? <div className="skeleton" style={{ height: '32px', width: '80px' }} /> : userData?.metrics.newRegistrations.toLocaleString() || 0}</div>
            </div>
            <div className="card">
              <div className="card-title">Verified Email Users</div>
              <div className="card-value" style={{ color: '#4ADE80' }}>{isLoading ? <div className="skeleton" style={{ height: '32px', width: '80px' }} /> : userData?.metrics.verifiedUsers.toLocaleString() || 0}</div>
            </div>
            <div className="card">
              <div className="card-title">Unverified Email Users</div>
              <div className="card-value" style={{ color: '#F87171' }}>{isLoading ? <div className="skeleton" style={{ height: '32px', width: '80px' }} /> : userData?.metrics.unverifiedUsers.toLocaleString() || 0}</div>
            </div>
            <div className="card">
              <div className="card-title">Users with Birth Profiles</div>
              <div className="card-value">{isLoading ? <div className="skeleton" style={{ height: '32px', width: '80px' }} /> : userData?.metrics.usersWithBirthProfiles.toLocaleString() || 0}</div>
            </div>
            <div className="card">
              <div className="card-title">Paid Customers</div>
              <div className="card-value" style={{ color: 'var(--accent-gold)' }}>{isLoading ? <div className="skeleton" style={{ height: '32px', width: '80px' }} /> : userData?.metrics.paidUsers.toLocaleString() || 0}</div>
            </div>
          </div>

          {/* USER RETENTION NOTE */}
          <div className="card" style={{ marginBottom: '1.5rem', background: 'rgba(255,255,255,0.02)' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>ℹ️ User Retention Instrumentation Status</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{userData?.metrics.retentionNote}</p>
          </div>

          {/* DAILY REGISTRATION TREND */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Registration Trend Over Time</h2>
              <button onClick={() => handleExportCsv('users')} className="btn btn-secondary" style={{ fontSize: '0.75rem' }}>
                📥 Export Users CSV
              </button>
            </div>

            <div className="table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>New Registrations</th>
                    <th>Verified Accounts</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    [1, 2, 3].map((i) => (
                      <tr key={i}><td colSpan={3}><div className="skeleton" style={{ height: '20px' }} /></td></tr>
                    ))
                  ) : userData?.dailyTrend && userData.dailyTrend.length > 0 ? (
                    userData.dailyTrend.map((t) => (
                      <tr key={t.date}>
                        <td>{t.date}</td>
                        <td style={{ fontWeight: 600 }}>{t.newUsers}</td>
                        <td style={{ color: '#4ADE80' }}>{t.verifiedUsers}</td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan={3} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No registration data for selected period.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: REPORT PIPELINE */}
      {activeTab === 'reports' && (
        <div>
          <div className="card-grid" style={{ marginBottom: '1.5rem' }}>
            <div className="card">
              <div className="card-title">Reports Requested</div>
              <div className="card-value">{isLoading ? <div className="skeleton" style={{ height: '32px', width: '80px' }} /> : reportData?.metrics.reportsRequested || 0}</div>
            </div>
            <div className="card">
              <div className="card-title">Completed Successfully</div>
              <div className="card-value" style={{ color: '#4ADE80' }}>{isLoading ? <div className="skeleton" style={{ height: '32px', width: '80px' }} /> : reportData?.metrics.reportsCompleted || 0}</div>
            </div>
            <div className="card">
              <div className="card-title">Pipeline Failures</div>
              <div className="card-value" style={{ color: '#F87171' }}>{isLoading ? <div className="skeleton" style={{ height: '32px', width: '80px' }} /> : reportData?.metrics.reportsFailed || 0}</div>
            </div>
            <div className="card">
              <div className="card-title">Success Rate</div>
              <div className="card-value" style={{ color: 'var(--accent-gold)' }}>{isLoading ? <div className="skeleton" style={{ height: '32px', width: '80px' }} /> : `${reportData?.metrics.successRate || 0}%`}</div>
            </div>
            <div className="card">
              <div className="card-title">Avg Generation Speed</div>
              <div className="card-value">{isLoading ? <div className="skeleton" style={{ height: '32px', width: '80px' }} /> : `${reportData?.metrics.avgDurationSeconds || 0}s`}</div>
            </div>
          </div>

          {/* REPORT TYPES BREAKDOWN */}
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Breakdown by Report Type</h2>
              <button onClick={() => handleExportCsv('reports')} className="btn btn-secondary" style={{ fontSize: '0.75rem' }}>
                📥 Export Reports CSV
              </button>
            </div>
            <div className="table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Report Type</th>
                    <th>Total Requested</th>
                    <th>Completed</th>
                    <th>Failed</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData?.breakdownByType.map((b) => (
                    <tr key={b.reportType}>
                      <td style={{ fontWeight: 600 }}>{b.reportType}</td>
                      <td>{b.total}</td>
                      <td style={{ color: '#4ADE80' }}>{b.completed}</td>
                      <td style={{ color: b.failed > 0 ? '#F87171' : 'var(--text-muted)' }}>{b.failed}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* RECENT PIPELINE FAILURES */}
          <div className="card">
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', color: '#F87171' }}>Recent Pipeline Failures (Diagnostics Link)</h2>
            <div className="table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Failed At</th>
                    <th>Report ID</th>
                    <th>User</th>
                    <th>Report Type</th>
                    <th>Error Code</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData?.recentFailures.map((f) => (
                    <tr key={f.id}>
                      <td>{new Date(f.failedAt).toLocaleString()}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{f.id.substring(0, 8)}...</td>
                      <td>{f.userEmail}</td>
                      <td>{f.reportType}</td>
                      <td><span className="badge badge-danger">{f.errorCode}</span></td>
                      <td>
                        <a href={`/reports/${f.id}`} className="btn btn-secondary" style={{ fontSize: '0.7rem', padding: '0.2rem 0.4rem' }}>
                          Inspect Pipeline ➔
                        </a>
                      </td>
                    </tr>
                  ))}
                  {(!reportData?.recentFailures || reportData.recentFailures.length === 0) && (
                    <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No pipeline failures recorded in selected period.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: JYOTI AI */}
      {activeTab === 'jyoti' && (
        <div>
          <div className="card" style={{ marginBottom: '1.5rem', background: 'rgba(255,255,255,0.02)' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--accent-gold)' }}>💬 Jyoti AI Storage Architecture Notice</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              {jyotiData?.note || 'Jyoti usage analytics are limited because chat history is currently stored locally on client devices.'}
            </p>
          </div>

          <div className="card-grid">
            <div className="card">
              <div className="card-title">Backend Conversations</div>
              <div className="card-value">0</div>
              <div className="card-subtext">Stored locally on client device</div>
            </div>
            <div className="card">
              <div className="card-title">Backend Messages</div>
              <div className="card-value">0</div>
              <div className="card-subtext">Stored locally on client device</div>
            </div>
            <div className="card">
              <div className="card-title">Active Jyoti Users</div>
              <div className="card-value">0</div>
              <div className="card-subtext">Requires server-side session tracking</div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: REVENUE */}
      {activeTab === 'revenue' && (
        <div>
          <div className="card-grid" style={{ marginBottom: '1.5rem' }}>
            <div className="card">
              <div className="card-title">Total Revenue (INR)</div>
              <div className="card-value" style={{ color: 'var(--accent-gold)' }}>
                {isLoading ? <div className="skeleton" style={{ height: '32px', width: '80px' }} /> : `₹${(revenueData?.metrics.totalRevenueRupees || 0).toLocaleString()}`}
              </div>
              <div className="card-subtext">Verified backend payments</div>
            </div>
            <div className="card">
              <div className="card-title">Successful Payments</div>
              <div className="card-value" style={{ color: '#4ADE80' }}>
                {isLoading ? <div className="skeleton" style={{ height: '32px', width: '80px' }} /> : revenueData?.metrics.successfulPayments || 0}
              </div>
            </div>
            <div className="card">
              <div className="card-title">Failed Payments</div>
              <div className="card-value" style={{ color: '#F87171' }}>
                {isLoading ? <div className="skeleton" style={{ height: '32px', width: '80px' }} /> : revenueData?.metrics.failedPayments || 0}
              </div>
            </div>
            <div className="card">
              <div className="card-title">Pending Payments</div>
              <div className="card-value">
                {isLoading ? <div className="skeleton" style={{ height: '32px', width: '80px' }} /> : revenueData?.metrics.pendingPayments || 0}
              </div>
            </div>
          </div>

          {/* REVENUE BY PRODUCT TYPE */}
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Revenue by Product / Report Type</h2>
              <button onClick={() => handleExportCsv('revenue')} className="btn btn-secondary" style={{ fontSize: '0.75rem' }}>
                📥 Export Revenue CSV
              </button>
            </div>
            <div className="table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Product Type</th>
                    <th>Paid Orders</th>
                    <th>Total Revenue (INR)</th>
                  </tr>
                </thead>
                <tbody>
                  {revenueData?.revenueByReportType.map((r) => (
                    <tr key={r.reportType}>
                      <td style={{ fontWeight: 600 }}>{r.reportType}</td>
                      <td>{r.paidCount}</td>
                      <td style={{ color: 'var(--accent-gold)', fontWeight: 700 }}>₹{r.revenueRupees.toLocaleString()}</td>
                    </tr>
                  ))}
                  {(!revenueData?.revenueByReportType || revenueData.revenueByReportType.length === 0) && (
                    <tr><td colSpan={3} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No payment records found for selected period.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: SYSTEM HEALTH */}
      {activeTab === 'system' && (
        <div>
          <div className="card-grid" style={{ marginBottom: '1.5rem' }}>
            <div className="card">
              <div className="card-title">Report Pipeline Failures</div>
              <div className="card-value" style={{ color: '#F87171' }}>{systemData?.metrics.reportFailures || 0}</div>
            </div>
            <div className="card">
              <div className="card-title">Payment Verification Failures</div>
              <div className="card-value" style={{ color: '#F87171' }}>{systemData?.metrics.paymentFailures || 0}</div>
            </div>
          </div>

          <div className="card">
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>Top System Error Codes</h2>
            <div className="table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Error Code</th>
                    <th>Occurrences</th>
                    <th>Last Occurrence</th>
                  </tr>
                </thead>
                <tbody>
                  {systemData?.topErrors.map((err) => (
                    <tr key={err.code}>
                      <td><span className="badge badge-danger">{err.code}</span></td>
                      <td style={{ fontWeight: 700 }}>{err.occurrences}</td>
                      <td>{err.lastOccurrence ? new Date(err.lastOccurrence).toLocaleString() : 'N/A'}</td>
                    </tr>
                  ))}
                  {(!systemData?.topErrors || systemData.topErrors.length === 0) && (
                    <tr><td colSpan={3} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No system error occurrences recorded.</td></tr>
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
