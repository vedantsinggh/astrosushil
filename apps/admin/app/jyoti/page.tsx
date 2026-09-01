'use client';

import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../lib/api-client';
import { StatusBadge } from '../../components/StatusBadge';

interface JyotiMonitoringData {
  stats: {
    totalQueries: number;
    activeConversations: number;
    errorCount: number;
    provider: string;
    providerStatus: string;
  };
  recentFailures: Array<{
    timestamp: string;
    user: string;
    errorCode: string;
    provider: string;
    requestStatus: string;
  }>;
}

export default function JyotiPage() {
  const [data, setData] = useState<JyotiMonitoringData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchJyotiData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiFetch<JyotiMonitoringData>('/api/v1/admin/jyoti');
      setData(res);
    } catch (err: any) {
      setError(err?.message || 'Failed to load Jyoti monitoring stats');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchJyotiData();
  }, []);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 className="page-title">Jyoti AI Assistant Monitoring</h1>
          <p className="page-subtitle">Track conversational AI requests, rate limits, and Gemini provider status</p>
        </div>
        <button onClick={fetchJyotiData} className="btn btn-secondary">
          <span>🔄</span> Refresh Status
        </button>
      </div>

      {error && (
        <div className="badge badge-danger" style={{ padding: '1rem', borderRadius: 'var(--radius-md)', width: '100%', marginBottom: '1.5rem', display: 'block' }}>
          {error}
        </div>
      )}

      {/* METRICS */}
      <div className="card-grid">
        <div className="card">
          <div className="card-title">LLM Provider</div>
          <div className="card-value" style={{ fontSize: '1.25rem' }}>
            {isLoading ? <div className="skeleton" style={{ height: '24px', width: '100px' }} /> : data?.stats.provider || 'Gemini Pro'}
          </div>
          <div className="card-subtext" style={{ marginTop: '0.4rem' }}>
            <StatusBadge status={data?.stats.providerStatus || 'UNKNOWN'} />
          </div>
        </div>

        <div className="card">
          <div className="card-title">Total AI Queries</div>
          <div className="card-value">{isLoading ? <div className="skeleton" style={{ height: '32px', width: '60px' }} /> : data?.stats.totalQueries || 0}</div>
          <div className="card-subtext">Processed chat messages</div>
        </div>

        <div className="card">
          <div className="card-title">Active Conversations</div>
          <div className="card-value">{isLoading ? <div className="skeleton" style={{ height: '32px', width: '60px' }} /> : data?.stats.activeConversations || 0}</div>
          <div className="card-subtext">Recent user threads</div>
        </div>

        <div className="card">
          <div className="card-title">Error Count</div>
          <div className="card-value" style={{ color: (data?.stats.errorCount || 0) > 0 ? 'var(--badge-danger-text)' : 'var(--text-primary)' }}>
            {isLoading ? <div className="skeleton" style={{ height: '32px', width: '60px' }} /> : data?.stats.errorCount || 0}
          </div>
          <div className="card-subtext">Failed LLM requests</div>
        </div>
      </div>

      {/* RECENT JYOTI FAILURES */}
      <div className="card">
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-primary)' }}>
          Recent Jyoti Failures & Rate Limits
        </h2>
        <div className="table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>User</th>
                <th>Error Code</th>
                <th>Provider</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                [1, 2].map((i) => (
                  <tr key={i}>
                    <td colSpan={5}>
                      <div className="skeleton" style={{ height: '20px', width: '100%' }} />
                    </td>
                  </tr>
                ))
              ) : data?.recentFailures && data.recentFailures.length > 0 ? (
                data.recentFailures.map((f, idx) => (
                  <tr key={idx}>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{new Date(f.timestamp).toLocaleString()}</td>
                    <td>{f.user}</td>
                    <td style={{ color: 'var(--badge-danger-text)', fontWeight: 600 }}>{f.errorCode}</td>
                    <td>{f.provider}</td>
                    <td>
                      <StatusBadge status={f.requestStatus} />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                    No recent Jyoti errors recorded. Provider is operational.
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
