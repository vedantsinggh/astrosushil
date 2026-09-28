'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiFetch } from '../../lib/api-client';
import { StatusBadge } from '../../components/StatusBadge';
import { useAuth } from '../../lib/auth-context';

interface UserListItem {
  id: string;
  email: string;
  fullName: string | null;
  role: string;
  accountStatus: string;
  isSuspended: boolean;
  createdAt: string;
  birthProfileCount?: number;
}

interface UsersResponse {
  users: UserListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface BirthProfile {
  id: string;
  name: string;
  dateOfBirth: string;
  timeOfBirth: string;
  placeName: string | null;
}

interface SessionListItem {
  id: string;
  status: string;
  startedAt: string;
  endedAt: string | null;
  durationSeconds: number | null;
  clientName: string;
  clientEmail: string | null;
  birthProfileId: string;
  notesCount: number;
  observationsCount: number;
}

interface SessionsResponse {
  sessions: SessionListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return '—';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function LiveSessionsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { hasPermission } = useAuth();

  const [view, setView] = useState<'sessions' | 'new'>('sessions');
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [sessionsError, setSessionsError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('');

  // New session wizard
  const [step, setStep] = useState<1 | 2>(1);
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserListItem | null>(null);
  const [profiles, setProfiles] = useState<BirthProfile[]>([]);
  const [profilesLoading, setProfilesLoading] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<BirthProfile | null>(null);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const initialUserId = searchParams.get('userId');
  const initialProfileId = searchParams.get('profileId');

  useEffect(() => {
    if (initialUserId) {
      setView('new');
      (async () => {
        try {
          const userData = await apiFetch<any>(`/api/v1/admin/users/${initialUserId}`);
          if (userData?.user) {
            setSelectedUser({
              id: userData.user.id,
              email: userData.user.email,
              fullName: userData.user.fullName,
              role: userData.user.role,
              accountStatus: userData.user.accountStatus,
              isSuspended: userData.user.isSuspended,
              createdAt: userData.user.createdAt,
            });
            setProfiles(userData.birthProfiles || []);
            setStep(2);
            if (initialProfileId && userData.birthProfiles) {
              const matched = userData.birthProfiles.find((p: any) => p.id === initialProfileId);
              if (matched) setSelectedProfile(matched);
            }
          }
        } catch {
          // ignore error
        }
      })();
    }
  }, [initialUserId, initialProfileId]);

  const fetchSessions = useCallback(async () => {
    setSessionsLoading(true);
    setSessionsError(null);
    try {
      const params = new URLSearchParams({ limit: '20' });
      if (statusFilter) params.set('status', statusFilter);
      const data = await apiFetch<SessionsResponse>(
        `/api/v1/admin/live-sessions?${params.toString()}`
      );
      setSessions(data.sessions || []);
    } catch (err: any) {
      setSessionsError(err?.message || 'Failed to load sessions');
    } finally {
      setSessionsLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const searchUsers = useCallback(async (query: string) => {
    setUsersLoading(true);
    try {
      const params = new URLSearchParams({ limit: '20', role: 'USER' });
      if (query) params.set('search', query);
      const data = await apiFetch<UsersResponse>(`/api/v1/admin/users?${params.toString()}`);
      setUsers(data.users || []);
    } catch {
      setUsers([]);
    } finally {
      setUsersLoading(false);
    }
  }, []);

  useEffect(() => {
    if (view === 'new' && step === 1) {
      const timer = setTimeout(() => searchUsers(userSearch), 300);
      return () => clearTimeout(timer);
    }
  }, [userSearch, view, step, searchUsers]);

  const handleSelectUser = async (user: UserListItem) => {
    setSelectedUser(user);
    setSelectedProfile(null);
    setProfilesLoading(true);
    setStep(2);
    try {
      const data = await apiFetch<any>(`/api/v1/admin/users/${user.id}`);
      setProfiles(data.birthProfiles || []);
    } catch {
      setProfiles([]);
    } finally {
      setProfilesLoading(false);
    }
  };

  const handleStartSession = async () => {
    if (!selectedUser || !selectedProfile) return;
    setCreating(true);
    setCreateError(null);
    try {
      const result = await apiFetch<any>('/api/v1/admin/live-sessions', {
        method: 'POST',
        body: JSON.stringify({
          userId: selectedUser.id,
          birthProfileId: selectedProfile.id,
        }),
      });
      router.push(`/live-sessions/${result.session.id}`);
    } catch (err: any) {
      setCreateError(err?.message || 'Failed to create session');
      setCreating(false);
    }
  };

  if (!hasPermission('live_sessions:read')) {
    return (
      <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--badge-danger-text)', marginBottom: '0.5rem' }}>Access Denied</h2>
        <p style={{ color: 'var(--text-secondary)' }}>
          You do not have permission to access Live Sessions.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 className="page-title">🕒 Live Consultation Sessions</h1>
          <p className="page-subtitle">
            Conduct one-on-one astrology consultations with access to the full birth chart workspace.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button
            onClick={fetchSessions}
            className="btn btn-secondary"
            style={{ fontSize: '0.8rem' }}
          >
            🔄 Refresh
          </button>
          <button
            onClick={() => { setView('new'); setStep(1); setSelectedUser(null); setSelectedProfile(null); setCreateError(null); searchUsers(''); }}
            className="btn btn-primary"
            style={{ fontSize: '0.85rem' }}
          >
            + New Consultation
          </button>
        </div>
      </div>

      {/* Tab toggle */}
      <div style={{ display: 'flex', gap: '0', marginBottom: '1.5rem', borderBottom: '2px solid var(--border-color)' }}>
        {(['sessions', 'new'] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            style={{
              padding: '0.65rem 1.25rem',
              border: 'none',
              background: 'none',
              fontWeight: 600,
              fontSize: '0.875rem',
              cursor: 'pointer',
              borderBottom: view === v ? '3px solid var(--accent-primary)' : '3px solid transparent',
              color: view === v ? 'var(--accent-primary)' : 'var(--text-secondary)',
            }}
          >
            {v === 'sessions' ? 'Session History' : '+ New Consultation'}
          </button>
        ))}
      </div>

      {/* ---- SESSION HISTORY ---- */}
      {view === 'sessions' && (
        <div>
          {/* Status filter */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            {['', 'ACTIVE', 'COMPLETED', 'ABANDONED'].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                style={{
                  padding: '0.3rem 0.75rem',
                  borderRadius: '9999px',
                  border: `1px solid ${statusFilter === s ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                  background: statusFilter === s ? 'var(--accent-primary)' : 'var(--bg-surface)',
                  color: statusFilter === s ? '#FFF' : 'var(--text-secondary)',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  fontWeight: statusFilter === s ? 600 : 400,
                }}
              >
                {s || 'All'}
              </button>
            ))}
          </div>

          {sessionsError && (
            <div className="badge badge-danger" style={{ display: 'block', padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem', fontSize: '0.85rem' }}>
              ⚠️ {sessionsError}
            </div>
          )}

          <div className="table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Status</th>
                  <th>Started</th>
                  <th>Duration</th>
                  <th>Notes</th>
                  <th>Observations</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sessionsLoading ? (
                  [1, 2, 3].map((i) => (
                    <tr key={i}>
                      <td colSpan={7}>
                        <div className="skeleton" style={{ height: '20px', width: '100%' }} />
                      </td>
                    </tr>
                  ))
                ) : sessions.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                      No sessions found. Click <strong>+ New Consultation</strong> to begin.
                    </td>
                  </tr>
                ) : (
                  sessions.map((s) => (
                    <tr key={s.id}>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{s.clientName}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{s.clientEmail}</div>
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            s.status === 'ACTIVE'
                              ? 'badge-success'
                              : s.status === 'COMPLETED'
                              ? 'badge-info'
                              : 'badge-warning'
                          }`}
                        >
                          {s.status}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {new Date(s.startedAt).toLocaleString()}
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>{formatDuration(s.durationSeconds)}</td>
                      <td style={{ fontSize: '0.85rem' }}>{s.notesCount}</td>
                      <td style={{ fontSize: '0.85rem' }}>{s.observationsCount}</td>
                      <td>
                        <Link
                          href={`/live-sessions/${s.id}`}
                          className="btn btn-secondary"
                          style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
                        >
                          {s.status === 'ACTIVE' ? 'Resume →' : 'View →'}
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ---- NEW SESSION WIZARD ---- */}
      {view === 'new' && (
        <div className="card" style={{ padding: '1.5rem', maxWidth: '700px' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem', color: 'var(--text-primary)' }}>
            New Consultation
          </h2>

          {/* Step indicator */}
          <div style={{ display: 'flex', gap: '0', marginBottom: '1.5rem', alignItems: 'center' }}>
            {[1, 2].map((n) => (
              <React.Fragment key={n}>
                <div style={{
                  width: '28px', height: '28px', borderRadius: '50%',
                  background: step >= n ? 'var(--accent-primary)' : 'var(--border-color)',
                  color: step >= n ? '#FFF' : 'var(--text-muted)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.8rem', fontWeight: 700,
                }}>
                  {n}
                </div>
                <span style={{ fontSize: '0.8rem', marginLeft: '0.4rem', color: step >= n ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: step >= n ? 600 : 400 }}>
                  {n === 1 ? 'Select Client' : 'Choose Birth Profile'}
                </span>
                {n < 2 && <div style={{ flex: 1, height: '2px', background: step > n ? 'var(--accent-primary)' : 'var(--border-color)', margin: '0 0.75rem' }} />}
              </React.Fragment>
            ))}
          </div>

          {createError && (
            <div className="badge badge-danger" style={{ display: 'block', padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem', fontSize: '0.85rem' }}>
              ⚠️ {createError}
            </div>
          )}

          {/* Step 1: Client selection */}
          {step === 1 && (
            <div>
              <div style={{ marginBottom: '0.75rem' }}>
                <input
                  id="user-search-input"
                  type="text"
                  className="input-control"
                  placeholder="Search client by name or email..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  autoFocus
                />
              </div>
              <div style={{ maxHeight: '320px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                {usersLoading ? (
                  <div style={{ padding: '1rem', color: 'var(--text-muted)', textAlign: 'center', fontSize: '0.85rem' }}>
                    Loading clients...
                  </div>
                ) : users.length === 0 ? (
                  <div style={{ padding: '1.5rem', color: 'var(--text-muted)', textAlign: 'center', fontSize: '0.85rem' }}>
                    No clients found. Try a different search.
                  </div>
                ) : (
                  users.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => handleSelectUser(u)}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: '1rem',
                        padding: '0.85rem 1rem', border: 'none', background: 'var(--bg-surface)',
                        borderBottom: '1px solid var(--border-color)', cursor: 'pointer',
                        textAlign: 'left',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-subtle)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--bg-surface)')}
                    >
                      <div
                        style={{
                          width: '36px', height: '36px', borderRadius: '50%',
                          background: 'linear-gradient(135deg, var(--accent-primary), #8B5CF6)',
                          color: '#FFF', display: 'flex', alignItems: 'center',
                          justifyContent: 'center', fontSize: '1rem', fontWeight: 700, flexShrink: 0,
                        }}
                      >
                        {(u.fullName || u.email).charAt(0).toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                          {u.fullName || '—'}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {u.email}
                        </div>
                      </div>
                      {u.isSuspended && (
                        <span className="badge badge-danger" style={{ fontSize: '0.7rem' }}>Suspended</span>
                      )}
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Step 2: Birth profile selection */}
          {step === 2 && selectedUser && (
            <div>
              <div style={{
                background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)',
                padding: '0.75rem 1rem', marginBottom: '1.25rem',
                display: 'flex', alignItems: 'center', gap: '0.75rem',
              }}>
                <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                  Client: {selectedUser.fullName || selectedUser.email}
                </div>
                <button
                  onClick={() => { setStep(1); setSelectedUser(null); setProfiles([]); }}
                  style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', fontSize: '0.8rem' }}
                >
                  Change
                </button>
              </div>

              <div style={{ marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Select birth profile for this consultation:
              </div>

              {profilesLoading ? (
                <div style={{ color: 'var(--text-muted)', padding: '1rem', textAlign: 'center', fontSize: '0.85rem' }}>
                  Loading profiles...
                </div>
              ) : profiles.length === 0 ? (
                <div style={{ color: 'var(--badge-danger-text)', padding: '1rem', background: 'var(--badge-danger-bg)', borderRadius: 'var(--radius-md)', fontSize: '0.85rem' }}>
                  ⚠️ This client has no birth profiles yet. Ask them to add one in the mobile app.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '260px', overflowY: 'auto' }}>
                  {profiles.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setSelectedProfile(p)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '1rem',
                        padding: '0.85rem 1rem', border: `2px solid ${selectedProfile?.id === p.id ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                        borderRadius: 'var(--radius-md)',
                        background: selectedProfile?.id === p.id ? 'var(--badge-info-bg)' : 'var(--bg-surface)',
                        cursor: 'pointer', textAlign: 'left',
                      }}
                    >
                      <span style={{ fontSize: '1.25rem' }}>🔮</span>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)' }}>{p.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {p.dateOfBirth} · {p.timeOfBirth.slice(0, 5)} · {p.placeName || 'No location'}
                        </div>
                      </div>
                      {selectedProfile?.id === p.id && (
                        <span style={{ marginLeft: 'auto', color: 'var(--accent-primary)', fontSize: '1.1rem' }}>✓</span>
                      )}
                    </button>
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button onClick={() => setView('sessions')} className="btn btn-secondary" disabled={creating}>
                  Cancel
                </button>
                <button
                  onClick={handleStartSession}
                  className="btn btn-primary"
                  disabled={!selectedProfile || creating}
                >
                  {creating ? 'Starting...' : '🚀 Start Consultation'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function LiveSessionsPage() {
  return (
    <Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading Live Sessions...</div>}>
      <LiveSessionsContent />
    </Suspense>
  );
}
