'use client';

import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../lib/api-client';

interface NotificationStatsData {
  stats: {
    totalNotifications: number;
    totalUnread: number;
    activeDeviceTokens: number;
  };
  byType: Array<{ type: string; count: number }>;
  recentNotifications: Array<{
    id: string;
    userEmail: string;
    type: string;
    title: string;
    body: string;
    isRead: boolean;
    createdAt: string;
  }>;
}

export default function NotificationsPage() {
  const [data, setData] = useState<NotificationStatsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Test Notification form state
  const [testTitle, setTestTitle] = useState('🧪 Admin Test Notification');
  const [testBody, setTestBody] = useState('Testing push notification delivery from Admin Panel.');
  const [isSending, setIsSending] = useState(false);
  const [sendFeedback, setSendFeedback] = useState<string | null>(null);

  const fetchStats = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiFetch<NotificationStatsData>('/api/v1/admin/notifications');
      setData(res);
    } catch (err: any) {
      setError(err?.message || 'Failed to load notification metrics');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleSendTest = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSending(true);
    setSendFeedback(null);
    try {
      await apiFetch('/api/v1/admin/notifications/test-send', {
        method: 'POST',
        body: JSON.stringify({ title: testTitle, body: testBody }),
      });
      setSendFeedback('✅ Test notification successfully queued and dispatched to admin account.');
      fetchStats();
    } catch (err: any) {
      setSendFeedback(`❌ Failed to send test notification: ${err?.message || 'Unknown error'}`);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 className="page-title">Notification Infrastructure & Operations</h1>
          <p className="page-subtitle">Centralized FCM push messaging, in-app notifications, and delivery stats</p>
        </div>
        <button onClick={fetchStats} className="btn btn-secondary" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span>🔄</span> Refresh Metrics
        </button>
      </div>

      {error && (
        <div className="badge badge-danger" style={{ padding: '1rem', width: '100%', marginBottom: '1.5rem', display: 'block' }}>
          ⚠️ {error}
        </div>
      )}

      {/* STATS CARDS */}
      <div className="card-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="card">
          <div className="card-title">Total In-App Notifications</div>
          <div className="card-value">{isLoading ? <div className="skeleton" style={{ height: '32px', width: '80px' }} /> : data?.stats.totalNotifications || 0}</div>
          <div className="card-subtext">Persistent in-app notification records</div>
        </div>

        <div className="card">
          <div className="card-title">Unread Notifications</div>
          <div className="card-value" style={{ color: 'var(--accent-gold)' }}>
            {isLoading ? <div className="skeleton" style={{ height: '32px', width: '80px' }} /> : data?.stats.totalUnread || 0}
          </div>
          <div className="card-subtext">Awaiting user interaction</div>
        </div>

        <div className="card">
          <div className="card-title">Active FCM Device Tokens</div>
          <div className="card-value" style={{ color: '#4ADE80' }}>
            {isLoading ? <div className="skeleton" style={{ height: '32px', width: '80px' }} /> : data?.stats.activeDeviceTokens || 0}
          </div>
          <div className="card-subtext">Registered mobile devices for push</div>
        </div>
      </div>

      {/* ADMIN TEST NOTIFICATION TOOL */}
      <div className="card" style={{ marginBottom: '1.5rem', borderColor: 'var(--accent-primary)' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem', color: '#FFF', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>🧪</span> Dev / Admin Push Notification Test Tool
        </h2>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
          Safely dispatch a test push and in-app notification to your currently authenticated admin user account for delivery verification.
        </p>

        {sendFeedback && (
          <div
            style={{
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-sm)',
              marginBottom: '1rem',
              fontSize: '0.85rem',
              backgroundColor: sendFeedback.startsWith('✅') ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
              color: sendFeedback.startsWith('✅') ? '#4ADE80' : '#F87171',
            }}
          >
            {sendFeedback}
          </div>
        )}

        <form onSubmit={handleSendTest} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '1rem', alignItems: 'end' }}>
          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Notification Title</label>
            <input
              type="text"
              value={testTitle}
              onChange={(e) => setTestTitle(e.target.value)}
              className="input-field"
              style={{ width: '100%', fontSize: '0.85rem' }}
              required
            />
          </div>
          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Notification Body</label>
            <input
              type="text"
              value={testBody}
              onChange={(e) => setTestBody(e.target.value)}
              className="input-field"
              style={{ width: '100%', fontSize: '0.85rem' }}
              required
            />
          </div>
          <button type="submit" disabled={isSending} className="btn btn-primary" style={{ fontSize: '0.85rem' }}>
            {isSending ? 'Sending...' : '🚀 Dispatch Test Push'}
          </button>
        </form>
      </div>

      {/* NOTIFICATION TYPE BREAKDOWN */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>Volume by Notification Type</h2>
        <div className="table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Notification Type</th>
                <th>Total Volume</th>
              </tr>
            </thead>
            <tbody>
              {data?.byType.map((t) => (
                <tr key={t.type}>
                  <td style={{ fontWeight: 600 }}>{t.type}</td>
                  <td style={{ fontWeight: 700, color: 'var(--accent-gold)' }}>{t.count.toLocaleString()}</td>
                </tr>
              ))}
              {(!data?.byType || data.byType.length === 0) && (
                <tr><td colSpan={2} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No notification records created yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* RECENT NOTIFICATIONS LOG */}
      <div className="card">
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>Recent Notifications Log</h2>
        <div className="table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Created At</th>
                <th>Recipient Email</th>
                <th>Type</th>
                <th>Title</th>
                <th>Read Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                [1, 2, 3, 4].map((i) => (
                  <tr key={i}><td colSpan={5}><div className="skeleton" style={{ height: '20px' }} /></td></tr>
                ))
              ) : data?.recentNotifications && data.recentNotifications.length > 0 ? (
                data.recentNotifications.map((n) => (
                  <tr key={n.id}>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{new Date(n.createdAt).toLocaleString()}</td>
                    <td>{n.userEmail}</td>
                    <td><span className="badge badge-info">{n.type}</span></td>
                    <td style={{ fontWeight: 600 }}>{n.title}</td>
                    <td>
                      <span className={`badge ${n.isRead ? 'badge-success' : 'badge-warning'}`}>
                        {n.isRead ? 'READ' : 'UNREAD'}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No recent notification activity.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
