'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { apiFetch } from '../../../lib/api-client';
import { StatusBadge } from '../../../components/StatusBadge';
import { useAuth } from '../../../lib/auth-context';

interface UserDetailsResponse {
  user: {
    id: string;
    email: string;
    fullName: string | null;
    phoneNumber: string | null;
    role: string;
    accountStatus: string;
    isSuspended: boolean;
    isEmailVerified: boolean;
    emailVerifiedAt: string | null;
    isGuestUser: boolean;
    lastActiveAt: string;
    createdAt: string;
    updatedAt: string;
  };
  birthProfiles: Array<{
    id: string;
    name: string;
    dateOfBirth: string;
    timeOfBirth: string;
    placeName: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
  reports: Array<{
    id: string;
    reportType: string;
    status: string;
    createdAt: string;
    completedAt: string | null;
    failedAt: string | null;
    errorCode: string | null;
  }>;
  orders: Array<{
    id: string;
    razorpayOrderId: string;
    amount: number;
    currency: string;
    status: string;
    reportType: string;
    createdAt: string;
  }>;
  subscription: {
    currentPlan: string;
    status: string;
    totalOrders: number;
    paidOrders: number;
  };
  entitlements: Array<{
    feature: string;
    name: string;
    allowed: boolean;
    status: string;
    source: string;
    expiresAt: string | null;
  }>;
  featureAccessDiagnostics: Array<{
    feature: string;
    featureName: string;
    allowed: boolean;
    reason: string;
    source: string;
    details?: any;
  }>;
  sessions: Array<{
    id: string;
    createdAt: string;
    expiresAt: string;
    status: string;
  }>;
  adminActionHistory: Array<{
    id: string;
    action: string;
    adminEmail: string;
    details: string | null;
    timestamp: string;
  }>;
  jyotiActivity: {
    totalConversations: number;
    totalMessages: number;
    lastUsedAt: string;
  };
  activityTimeline: Array<{ event: string; timestamp: string }>;
}

export default function UserDetailsPage() {
  const params = useParams();
  const userId = params.id as string;
  const { user: currentAdmin, hasPermission } = useAuth();

  const [data, setData] = useState<UserDetailsResponse | null>(null);
  const [activeTab, setActiveTab] = useState<'access' | 'profiles' | 'reports' | 'subscription' | 'sessions' | 'history'>('access');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Modals state
  const [activeModal, setActiveModal] = useState<'suspend' | 'activate' | 'grant' | 'revoke_ent' | 'revoke_sessions' | 'reset_password' | null>(null);
  const [reasonInput, setReasonInput] = useState('');
  const [selectedFeature, setSelectedFeature] = useState('CAREER_REPORT');
  const [expiresInDays, setExpiresInDays] = useState(30);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchUserDetails = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiFetch<UserDetailsResponse>(`/api/v1/admin/users/${userId}`);
      setData(res);
    } catch (err: any) {
      setError(err?.message || 'Failed to load user details');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUserDetails();
  }, [userId]);

  const closeModal = () => {
    setActiveModal(null);
    setReasonInput('');
    setIsSubmitting(false);
  };

  const handleSuspendUser = async () => {
    if (!reasonInput.trim() || reasonInput.trim().length < 3) {
      alert('A valid reason (minimum 3 characters) is required for user suspension.');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await apiFetch<{ message: string }>(`/api/v1/admin/users/${userId}/suspend`, {
        method: 'POST',
        body: JSON.stringify({ reason: reasonInput.trim() }),
      });
      setActionMessage(res.message);
      closeModal();
      fetchUserDetails();
    } catch (err: any) {
      setError(err?.message || 'Failed to suspend user');
      setIsSubmitting(false);
    }
  };

  const handleActivateUser = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await apiFetch<{ message: string }>(`/api/v1/admin/users/${userId}/activate`, {
        method: 'POST',
        body: JSON.stringify({ reason: reasonInput.trim() || undefined }),
      });
      setActionMessage(res.message);
      closeModal();
      fetchUserDetails();
    } catch (err: any) {
      setError(err?.message || 'Failed to activate user');
      setIsSubmitting(false);
    }
  };

  const handleGrantEntitlement = async () => {
    if (!reasonInput.trim() || reasonInput.trim().length < 3) {
      alert('A valid reason is required to grant manual support entitlement.');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await apiFetch<{ message: string }>(`/api/v1/admin/users/${userId}/entitlements`, {
        method: 'POST',
        body: JSON.stringify({
          feature: selectedFeature,
          expiresInDays: Number(expiresInDays),
          reason: reasonInput.trim(),
        }),
      });
      setActionMessage(res.message);
      closeModal();
      fetchUserDetails();
    } catch (err: any) {
      setError(err?.message || 'Failed to grant entitlement');
      setIsSubmitting(false);
    }
  };

  const handleRevokeEntitlement = async () => {
    if (!reasonInput.trim() || reasonInput.trim().length < 3) {
      alert('A valid reason is required to revoke manual entitlement.');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await apiFetch<{ message: string }>(`/api/v1/admin/users/${userId}/entitlements/${selectedFeature}`, {
        method: 'DELETE',
        body: JSON.stringify({ reason: reasonInput.trim() }),
      });
      setActionMessage(res.message);
      closeModal();
      fetchUserDetails();
    } catch (err: any) {
      setError(err?.message || 'Failed to revoke entitlement');
      setIsSubmitting(false);
    }
  };

  const handleRevokeSessions = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await apiFetch<{ message: string }>(`/api/v1/admin/users/${userId}/sessions/revoke`, {
        method: 'POST',
      });
      setActionMessage(res.message);
      closeModal();
      fetchUserDetails();
    } catch (err: any) {
      setError(err?.message || 'Failed to revoke sessions');
      setIsSubmitting(false);
    }
  };

  const handlePasswordReset = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await apiFetch<{ message: string }>(`/api/v1/admin/users/${userId}/password-reset`, {
        method: 'POST',
      });
      setActionMessage(res.message);
      closeModal();
      fetchUserDetails();
    } catch (err: any) {
      setError(err?.message || 'Failed to initiate password reset');
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div>
        <div className="skeleton" style={{ height: '30px', width: '250px', marginBottom: '1rem' }} />
        <div className="skeleton" style={{ height: '180px', width: '100%', marginBottom: '1.5rem' }} />
        <div className="skeleton" style={{ height: '300px', width: '100%' }} />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--badge-danger-text)', marginBottom: '0.5rem' }}>User Not Found</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>{error || 'Unable to locate user record'}</p>
        <Link href="/users" className="btn btn-secondary">
          ← Back to Users List
        </Link>
      </div>
    );
  }

  const { user, birthProfiles, reports, orders, subscription, entitlements, featureAccessDiagnostics, sessions, adminActionHistory } = data;
  const initial = user.fullName ? user.fullName.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase();

  return (
    <div>
      {/* BREADCRUMBS */}
      <nav style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
        <Link href="/dashboard" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>
          Admin
        </Link>{' '}
        →{' '}
        <Link href="/users" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>
          Users
        </Link>{' '}
        → <strong style={{ color: 'var(--text-primary)' }}>{user.fullName || user.email}</strong>
      </nav>

      {actionMessage && (
        <div className="badge badge-success" style={{ padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', width: '100%', marginBottom: '1.5rem', display: 'block', fontSize: '0.85rem' }}>
          {actionMessage}
        </div>
      )}

      {error && (
        <div className="badge badge-danger" style={{ padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', width: '100%', marginBottom: '1.5rem', display: 'block', fontSize: '0.85rem' }}>
          {error}
        </div>
      )}

      {/* USER OVERVIEW CARD */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: user.isSuspended ? 'var(--badge-danger-bg)' : 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                color: user.isSuspended ? 'var(--badge-danger-text)' : '#FFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.75rem',
                fontWeight: 700,
              }}
            >
              {initial}
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <h1 className="page-title" style={{ margin: 0, fontSize: '1.35rem' }}>
                  {user.fullName || 'Nameless User'}
                </h1>
                <StatusBadge status={user.isSuspended ? 'SUSPENDED' : user.accountStatus} />
                <span className="badge badge-info">{user.role}</span>
              </div>
              <p className="page-subtitle" style={{ margin: '0.2rem 0 0 0' }}>{user.email}</p>
            </div>
          </div>

          {/* ACTION BUTTONS (PERMISSION CHECKED) */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {hasPermission('users:suspend') && !user.isSuspended && user.id !== currentAdmin?.id && user.role !== 'SUPER_ADMIN' && (
              <button onClick={() => setActiveModal('suspend')} className="btn btn-secondary" style={{ color: 'var(--badge-danger-text)', fontSize: '0.8rem' }}>
                🚫 Suspend User
              </button>
            )}

            {hasPermission('users:activate') && user.isSuspended && (
              <button onClick={() => setActiveModal('activate')} className="btn btn-secondary" style={{ color: '#059669', fontSize: '0.8rem' }}>
                ✅ Activate User
              </button>
            )}

            {hasPermission('entitlements:grant') && (
              <button onClick={() => setActiveModal('grant')} className="btn btn-secondary" style={{ fontSize: '0.8rem' }}>
                🎁 Grant Entitlement
              </button>
            )}

            {hasPermission('sessions:revoke') && (
              <button onClick={() => setActiveModal('revoke_sessions')} className="btn btn-secondary" style={{ fontSize: '0.8rem' }}>
                🔐 Revoke Sessions ({sessions.length})
              </button>
            )}

            {hasPermission('users:password_reset') && (
              <button onClick={() => setActiveModal('reset_password')} className="btn btn-secondary" style={{ fontSize: '0.8rem' }}>
                🔑 Send Password Reset
              </button>
            )}
          </div>
        </div>

        {/* DETAILS GRID */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-color)' }}>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>Account Status</span>
            <strong style={{ fontSize: '0.9rem', color: user.isSuspended ? 'var(--badge-danger-text)' : 'var(--text-primary)' }}>
              {user.accountStatus}
            </strong>
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>Email Verification</span>
            <strong style={{ fontSize: '0.9rem', color: user.isEmailVerified ? '#059669' : '#D97706' }}>
              {user.isEmailVerified ? 'Verified' : 'Unverified'}
            </strong>
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>User ID</span>
            <code style={{ fontSize: '0.8rem', fontFamily: 'monospace' }}>{user.id}</code>
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>Active Sessions</span>
            <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>{sessions.length} sessions</strong>
          </div>
        </div>
      </div>

      {/* SUSPEND MODAL */}
      {activeModal === 'suspend' && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ maxWidth: '450px', padding: '1.5rem', width: '90%' }}>
            <h3 style={{ marginTop: 0, color: 'var(--badge-danger-text)' }}>Suspend User Account</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              The user <strong>{user.email}</strong> will be suspended and logged out from all active sessions.
            </p>
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>
                Suspension Reason (Required) *
              </label>
              <textarea
                className="input-control"
                rows={3}
                placeholder="Specify administrative reason for account suspension..."
                value={reasonInput}
                onChange={(e) => setReasonInput(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button onClick={closeModal} className="btn btn-secondary" disabled={isSubmitting}>Cancel</button>
              <button onClick={handleSuspendUser} className="btn btn-danger" disabled={isSubmitting}>
                {isSubmitting ? 'Processing...' : 'Confirm Suspension'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ACTIVATE MODAL */}
      {activeModal === 'activate' && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ maxWidth: '450px', padding: '1.5rem', width: '90%' }}>
            <h3 style={{ marginTop: 0, color: '#059669' }}>Activate User Account</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Re-activate <strong>{user.email}</strong> to restore feature access.
            </p>
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>
                Activation Notes (Optional)
              </label>
              <input
                type="text"
                className="input-control"
                placeholder="Reason or support reference..."
                value={reasonInput}
                onChange={(e) => setReasonInput(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button onClick={closeModal} className="btn btn-secondary" disabled={isSubmitting}>Cancel</button>
              <button onClick={handleActivateUser} className="btn btn-primary" disabled={isSubmitting}>
                {isSubmitting ? 'Processing...' : 'Activate User'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GRANT ENTITLEMENT MODAL */}
      {activeModal === 'grant' && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ maxWidth: '480px', padding: '1.5rem', width: '90%' }}>
            <h3 style={{ marginTop: 0, color: 'var(--text-primary)' }}>Grant Manual Support Entitlement</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Grant manual feature access to <strong>{user.email}</strong>. Does not mutate billing orders.
            </p>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>Feature</label>
              <select className="input-control" value={selectedFeature} onChange={(e) => setSelectedFeature(e.target.value)}>
                <option value="CAREER_REPORT">Career Report Generation (CAREER_REPORT)</option>
                <option value="KUNDLI_REPORT">Full Kundli Analysis (KUNDLI_REPORT)</option>
                <option value="GUPTA_NADI_DOSSIER">Gupta Nadi Dossier (GUPTA_NADI_DOSSIER)</option>
                <option value="JYOTI_AI">Jyoti AI Assistant (JYOTI_AI)</option>
              </select>
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>Duration (Days)</label>
              <input type="number" className="input-control" value={expiresInDays} onChange={(e) => setExpiresInDays(Number(e.target.value))} min={1} max={365} />
            </div>
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>Support Reason *</label>
              <input type="text" className="input-control" placeholder="e.g. Customer support compensation ticket #123" value={reasonInput} onChange={(e) => setReasonInput(e.target.value)} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button onClick={closeModal} className="btn btn-secondary" disabled={isSubmitting}>Cancel</button>
              <button onClick={handleGrantEntitlement} className="btn btn-primary" disabled={isSubmitting}>
                {isSubmitting ? 'Granting...' : 'Grant Entitlement'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REVOKE SESSIONS MODAL */}
      {activeModal === 'revoke_sessions' && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ maxWidth: '450px', padding: '1.5rem', width: '90%' }}>
            <h3 style={{ marginTop: 0, color: 'var(--badge-danger-text)' }}>Revoke All User Sessions</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              Are you sure you want to sign out <strong>{user.email}</strong> from all devices? {sessions.length} active sessions will be invalidated.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button onClick={closeModal} className="btn btn-secondary" disabled={isSubmitting}>Cancel</button>
              <button onClick={handleRevokeSessions} className="btn btn-danger" disabled={isSubmitting}>
                {isSubmitting ? 'Revoking...' : 'Revoke All Sessions'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PASSWORD RESET MODAL */}
      {activeModal === 'reset_password' && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ maxWidth: '450px', padding: '1.5rem', width: '90%' }}>
            <h3 style={{ marginTop: 0, color: 'var(--text-primary)' }}>Trigger Password Reset</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              Initiate a secure password reset request for <strong>{user.email}</strong>. No passwords will be exposed or created manually.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button onClick={closeModal} className="btn btn-secondary" disabled={isSubmitting}>Cancel</button>
              <button onClick={handlePasswordReset} className="btn btn-primary" disabled={isSubmitting}>
                {isSubmitting ? 'Sending...' : 'Confirm Reset Request'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TABS HEADER */}
      <div style={{ display: 'flex', borderBottom: '2px solid var(--border-color)', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <button
          onClick={() => setActiveTab('access')}
          style={{
            padding: '0.75rem 1.25rem',
            border: 'none',
            background: 'none',
            fontWeight: 600,
            fontSize: '0.9rem',
            cursor: 'pointer',
            borderBottom: activeTab === 'access' ? '3px solid var(--accent-color)' : '3px solid transparent',
            color: activeTab === 'access' ? 'var(--accent-color)' : 'var(--text-secondary)',
          }}
        >
          Access & Entitlements
        </button>
        <button
          onClick={() => setActiveTab('profiles')}
          style={{
            padding: '0.75rem 1.25rem',
            border: 'none',
            background: 'none',
            fontWeight: 600,
            fontSize: '0.9rem',
            cursor: 'pointer',
            borderBottom: activeTab === 'profiles' ? '3px solid var(--accent-color)' : '3px solid transparent',
            color: activeTab === 'profiles' ? 'var(--accent-color)' : 'var(--text-secondary)',
          }}
        >
          Birth Profiles ({birthProfiles.length})
        </button>
        <button
          onClick={() => setActiveTab('reports')}
          style={{
            padding: '0.75rem 1.25rem',
            border: 'none',
            background: 'none',
            fontWeight: 600,
            fontSize: '0.9rem',
            cursor: 'pointer',
            borderBottom: activeTab === 'reports' ? '3px solid var(--accent-color)' : '3px solid transparent',
            color: activeTab === 'reports' ? 'var(--accent-color)' : 'var(--text-secondary)',
          }}
        >
          Reports ({reports.length})
        </button>
        <button
          onClick={() => setActiveTab('subscription')}
          style={{
            padding: '0.75rem 1.25rem',
            border: 'none',
            background: 'none',
            fontWeight: 600,
            fontSize: '0.9rem',
            cursor: 'pointer',
            borderBottom: activeTab === 'subscription' ? '3px solid var(--accent-color)' : '3px solid transparent',
            color: activeTab === 'subscription' ? 'var(--accent-color)' : 'var(--text-secondary)',
          }}
        >
          Orders ({orders.length})
        </button>
        <button
          onClick={() => setActiveTab('sessions')}
          style={{
            padding: '0.75rem 1.25rem',
            border: 'none',
            background: 'none',
            fontWeight: 600,
            fontSize: '0.9rem',
            cursor: 'pointer',
            borderBottom: activeTab === 'sessions' ? '3px solid var(--accent-color)' : '3px solid transparent',
            color: activeTab === 'sessions' ? 'var(--accent-color)' : 'var(--text-secondary)',
          }}
        >
          Sessions ({sessions.length})
        </button>
        <button
          onClick={() => setActiveTab('history')}
          style={{
            padding: '0.75rem 1.25rem',
            border: 'none',
            background: 'none',
            fontWeight: 600,
            fontSize: '0.9rem',
            cursor: 'pointer',
            borderBottom: activeTab === 'history' ? '3px solid var(--accent-color)' : '3px solid transparent',
            color: activeTab === 'history' ? 'var(--accent-color)' : 'var(--text-secondary)',
          }}
        >
          Admin Action History ({adminActionHistory.length})
        </button>
      </div>

      {/* TAB: DIAGNOSTICS & ENTITLEMENTS */}
      {activeTab === 'access' && (
        <div className="card" style={{ padding: '1.5rem' }}>
          <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', color: 'var(--text-primary)' }}>
            Real-Time Feature Access Diagnostics
          </h3>
          <div className="table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Feature Code</th>
                  <th>Feature Name</th>
                  <th>Status</th>
                  <th>Evaluation Reason</th>
                  <th>Entitlement Source</th>
                  <th>Expires At</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {featureAccessDiagnostics.map((diag) => (
                  <tr key={diag.feature}>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.8rem', fontWeight: 600 }}>{diag.feature}</td>
                    <td>{diag.featureName}</td>
                    <td><StatusBadge status={diag.allowed ? 'ACTIVE' : 'INACTIVE'} /></td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{diag.reason}</td>
                    <td style={{ fontSize: '0.8rem', fontFamily: 'monospace' }}>{diag.source}</td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {diag.details?.expiresAt ? new Date(diag.details.expiresAt).toLocaleDateString() : 'N/A'}
                    </td>
                    <td>
                      {diag.source === 'SUPPORT_ENTITLEMENT_GRANT' && hasPermission('entitlements:revoke') && (
                        <button
                          onClick={() => {
                            setSelectedFeature(diag.feature);
                            setActiveModal('revoke_ent');
                          }}
                          className="btn btn-secondary"
                          style={{ padding: '0.2rem 0.4rem', fontSize: '0.75rem', color: 'var(--badge-danger-text)' }}
                        >
                          Revoke
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* REVOKE ENTITLEMENT MODAL */}
      {activeModal === 'revoke_ent' && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ maxWidth: '450px', padding: '1.5rem', width: '90%' }}>
            <h3 style={{ marginTop: 0, color: 'var(--badge-danger-text)' }}>Revoke Entitlement</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Revoke manual entitlement <strong>{selectedFeature}</strong> for <strong>{user.email}</strong>.
            </p>
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>
                Revocation Reason *
              </label>
              <input
                type="text"
                className="input-control"
                placeholder="Reason for revoking entitlement..."
                value={reasonInput}
                onChange={(e) => setReasonInput(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button onClick={closeModal} className="btn btn-secondary" disabled={isSubmitting}>Cancel</button>
              <button onClick={handleRevokeEntitlement} className="btn btn-danger" disabled={isSubmitting}>
                {isSubmitting ? 'Revoking...' : 'Revoke Entitlement'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB: SESSIONS */}
      {activeTab === 'sessions' && (
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-primary)' }}>Active Refresh Token Sessions</h3>
            {hasPermission('sessions:revoke') && sessions.length > 0 && (
              <button onClick={() => setActiveModal('revoke_sessions')} className="btn btn-secondary" style={{ color: 'var(--badge-danger-text)', fontSize: '0.8rem' }}>
                Sign Out All Devices
              </button>
            )}
          </div>
          <div className="table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Session ID</th>
                  <th>Created At</th>
                  <th>Expires At</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {sessions.length > 0 ? (
                  sessions.map((s) => (
                    <tr key={s.id}>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{s.id}</td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{new Date(s.createdAt).toLocaleString()}</td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{new Date(s.expiresAt).toLocaleString()}</td>
                      <td><StatusBadge status={s.status} /></td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                      No active sessions found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB: HISTORY */}
      {activeTab === 'history' && (
        <div className="card" style={{ padding: '1.5rem' }}>
          <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', color: 'var(--text-primary)' }}>
            Administrative Audit Log for User
          </h3>
          <div className="table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Action</th>
                  <th>Admin Email</th>
                  <th>Details</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {adminActionHistory.length > 0 ? (
                  adminActionHistory.map((h) => (
                    <tr key={h.id}>
                      <td><span className="badge badge-info">{h.action}</span></td>
                      <td style={{ fontSize: '0.85rem' }}>{h.adminEmail}</td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', maxWidth: '300px' }}>{h.details || '-'}</td>
                      <td style={{ fontSize: '0.8rem', fontFamily: 'monospace' }}>{new Date(h.timestamp).toLocaleString()}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                      No administrative actions recorded for this user yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT: BIRTH PROFILES */}
      {activeTab === 'profiles' && (
        <div className="card">
          <div className="table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Profile Name</th>
                  <th>Date of Birth</th>
                  <th>Time of Birth</th>
                  <th>Place</th>
                  <th>Created</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {birthProfiles.length > 0 ? (
                  birthProfiles.map((p) => (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 600 }}>{p.name}</td>
                      <td>{p.dateOfBirth}</td>
                      <td>{p.timeOfBirth}</td>
                      <td style={{ color: 'var(--text-secondary)' }}>{p.placeName || 'Coordinates Only'}</td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{new Date(p.createdAt).toLocaleDateString()}</td>
                      <td>
                        <Link href={`/birth-profiles/${p.id}`} className="btn btn-secondary" style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}>
                          Inspect Chart →
                        </Link>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                      No birth profiles created by this user yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT: REPORTS */}
      {activeTab === 'reports' && (
        <div className="card">
          <div className="table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Report ID</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Requested</th>
                  <th>Completed</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {reports.length > 0 ? (
                  reports.map((r) => (
                    <tr key={r.id}>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.8rem', fontWeight: 600 }}>{r.id.slice(0, 8)}...</td>
                      <td><span className="badge badge-info">{r.reportType}</span></td>
                      <td><StatusBadge status={r.status} /></td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{new Date(r.createdAt).toLocaleString()}</td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{r.completedAt ? new Date(r.completedAt).toLocaleString() : '-'}</td>
                      <td>
                        <Link href={`/reports/${r.id}`} className="btn btn-secondary" style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}>
                          Debug Pipeline →
                        </Link>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                      No reports generated for this user yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT: SUBSCRIPTION / ORDERS */}
      {activeTab === 'subscription' && (
        <div className="card" style={{ padding: '1.5rem' }}>
          <div className="table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Report Type</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {orders.length > 0 ? (
                  orders.map((o) => (
                    <tr key={o.id}>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{o.razorpayOrderId}</td>
                      <td>{o.reportType}</td>
                      <td>₹{(o.amount / 100).toFixed(2)}</td>
                      <td><StatusBadge status={o.status} /></td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{new Date(o.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)' }}>
                      No order records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
