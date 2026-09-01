'use client';

import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../lib/api-client';
import { StatusBadge } from '../../components/StatusBadge';

interface DashboardData {
  stats: {
    totalUsers: number;
    activeUsers: number;
    totalProfiles: number;
    totalReports: number;
    failedReports: number;
    jyotiConversations: number;
  };
  recentActivity: Array<{
    id: string;
    timestamp: string;
    event: string;
    user: string;
    status: 'SUCCESS' | 'FAILED' | 'PENDING' | 'INFO';
  }>;
}

interface HealthData {
  timestamp: string;
  services: {
    api: { status: string; latencyMs: number };
    database: { status: string; latencyMs: number };
    astrologyEngine: { status: string; latencyMs: number };
    gemini: { status: string; provider: string; latencyMs: number };
    storage: { status: string; type: string };
  };
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [health, setHealth] = useState<HealthData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [dashRes, healthRes] = await Promise.all([
        apiFetch<DashboardData>('/api/v1/admin/dashboard'),
        apiFetch<HealthData>('/api/v1/admin/system/health'),
      ]);
      setData(dashRes);
      setHealth(healthRes);
    } catch (err: any) {
      setError(err?.message || 'Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 className="page-title">Operations Dashboard</h1>
          <p className="page-subtitle">Real-time metrics, system health, and operational activities</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <a href="/analytics" className="btn btn-primary" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', textDecoration: 'none' }}>
            <span>📈</span> View Product Analytics
          </a>
          <button onClick={fetchDashboardData} className="btn btn-secondary" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <span>🔄</span> Refresh Stats
          </button>
        </div>
      </div>

      {error && (
        <div className="badge badge-danger" style={{ padding: '1rem', borderRadius: 'var(--radius-md)', width: '100%', marginBottom: '1.5rem', display: 'block' }}>
          {error}
        </div>
      )}

      {/* METRIC CARDS */}
      <div className="card-grid">
        <div className="card">
          <div className="card-title">Total Users</div>
          <div className="card-value">{isLoading ? <div className="skeleton" style={{ height: '32px', width: '80px' }} /> : data?.stats?.totalUsers || 0}</div>
          <div className="card-subtext">Registered customer accounts</div>
        </div>

        <div className="card">
          <div className="card-title">Active Users</div>
          <div className="card-value" style={{ color: 'var(--badge-success-text)' }}>
            {isLoading ? <div className="skeleton" style={{ height: '32px', width: '80px' }} /> : data?.stats?.activeUsers || 0}
          </div>
          <div className="card-subtext">Verified email accounts</div>
        </div>

        <div className="card">
          <div className="card-title">Birth Profiles</div>
          <div className="card-value">{isLoading ? <div className="skeleton" style={{ height: '32px', width: '80px' }} /> : data?.stats?.totalProfiles || 0}</div>
          <div className="card-subtext">Calculated birth charts</div>
        </div>

        <div className="card">
          <div className="card-title">Career Reports</div>
          <div className="card-value">{isLoading ? <div className="skeleton" style={{ height: '32px', width: '80px' }} /> : data?.stats?.totalReports || 0}</div>
          <div className="card-subtext">Total report jobs</div>
        </div>

        <div className="card" style={{ borderColor: (data?.stats?.failedReports || 0) > 0 ? '#FCA5A5' : 'var(--border-color)' }}>
          <div className="card-title">Failed Reports</div>
          <div className="card-value" style={{ color: (data?.stats?.failedReports || 0) > 0 ? 'var(--badge-danger-text)' : 'var(--text-primary)' }}>
            {isLoading ? <div className="skeleton" style={{ height: '32px', width: '80px' }} /> : data?.stats?.failedReports || 0}
          </div>
          <div className="card-subtext">Compilation/pipeline errors</div>
        </div>

        <div className="card">
          <div className="card-title">Jyoti AI Queries</div>
          <div className="card-value">{isLoading ? <div className="skeleton" style={{ height: '32px', width: '80px' }} /> : data?.stats?.jyotiConversations || 0}</div>
          <div className="card-subtext">Conversational queries</div>
        </div>
      </div>

      {/* SYSTEM HEALTH STATUS */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>⚡</span> System Health Indicators
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
          <div style={{ padding: '0.85rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-subtle)' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>API Server</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.4rem' }}>
              <StatusBadge status={health?.services.api.status || 'UNKNOWN'} />
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{health?.services.api.latencyMs || 1}ms</span>
            </div>
          </div>

          <div style={{ padding: '0.85rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-subtle)' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Database (PostgreSQL)</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.4rem' }}>
              <StatusBadge status={health?.services.database.status || 'UNKNOWN'} />
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{health?.services.database.latencyMs || 0}ms</span>
            </div>
          </div>

          <div style={{ padding: '0.85rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-subtle)' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Astrology Engine</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.4rem' }}>
              <StatusBadge status={health?.services.astrologyEngine.status || 'UNKNOWN'} />
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{health?.services.astrologyEngine.latencyMs || 0}ms</span>
            </div>
          </div>

          <div style={{ padding: '0.85rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-subtle)' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Gemini AI</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.4rem' }}>
              <StatusBadge status={health?.services.gemini.status || 'UNKNOWN'} />
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{health?.services.gemini.latencyMs || 0}ms</span>
            </div>
          </div>

          <div style={{ padding: '0.85rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-subtle)' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Report Storage</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.4rem' }}>
              <StatusBadge status={health?.services.storage.status || 'UNKNOWN'} />
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Active</span>
            </div>
          </div>
        </div>
      </div>

      {/* RECENT ACTIVITY TABLE */}
      <div className="card">
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-primary)' }}>Recent System Activity</h2>
        <div className="table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Event</th>
                <th>User / Subject</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                [1, 2, 3, 4, 5].map((i) => (
                  <tr key={i}>
                    <td colSpan={4}>
                      <div className="skeleton" style={{ height: '20px', width: '100%' }} />
                    </td>
                  </tr>
                ))
              ) : data?.recentActivity && data.recentActivity.length > 0 ? (
                data.recentActivity.map((act) => (
                  <tr key={act.id}>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                      {new Date(act.timestamp).toLocaleString()}
                    </td>
                    <td style={{ fontWeight: 600 }}>{act.event}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{act.user}</td>
                    <td>
                      <StatusBadge status={act.status} />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                    No recent activity records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
