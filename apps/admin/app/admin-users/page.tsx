'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiFetch } from '../../lib/api-client';
import { useAuth } from '../../lib/auth-context';

interface AdminStaffUser {
  id: string;
  email: string;
  fullName: string | null;
  role: string;
  accountStatus: string;
  createdAt: string;
  updatedAt: string;
}

interface AdminUsersResponse {
  items: AdminStaffUser[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export default function AdminUsersPage() {
  const { user: currentAdmin, hasPermission } = useAuth();

  const [items, setItems] = useState<AdminStaffUser[]>([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 25, total: 0, totalPages: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Role mutation modal state
  const [targetUser, setTargetUser] = useState<AdminStaffUser | null>(null);
  const [selectedRole, setSelectedRole] = useState<'ADMIN' | 'SUPPORT'>('SUPPORT');
  const [isUpdating, setIsUpdating] = useState(false);

  // Create Admin Staff modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    email: '',
    fullName: '',
    password: '',
    role: 'SUPPORT' as 'ADMIN' | 'SUPPORT',
  });
  const [isCreating, setIsCreating] = useState(false);

  const fetchAdminUsers = async (page = 1) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiFetch<AdminUsersResponse>(`/api/v1/admin/admin-users?page=${page}&pageSize=25`);
      setItems(res.items);
      setPagination(res.pagination);
    } catch (err: any) {
      setError(err?.message || 'Failed to load administrative users');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminUsers(1);
  }, []);

  const handleUpdateRole = async () => {
    if (!targetUser) return;
    setIsUpdating(true);
    setError(null);

    try {
      const res = await apiFetch<{ message: string }>(`/api/v1/admin/admin-users/${targetUser.id}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role: selectedRole }),
      });
      setActionMessage(res.message);
      setTargetUser(null);
      fetchAdminUsers(pagination.page);
    } catch (err: any) {
      setError(err?.message || 'Failed to update administrative role');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.email || !createForm.password || createForm.password.length < 8) {
      alert('Valid email and password (minimum 8 characters) are required.');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const res = await apiFetch<{ message: string; user: any }>('/api/v1/admin/admin-users', {
        method: 'POST',
        body: JSON.stringify(createForm),
      });
      setActionMessage(res.message);
      setShowCreateModal(false);
      setCreateForm({ email: '', fullName: '', password: '', role: 'SUPPORT' });
      fetchAdminUsers(1);
    } catch (err: any) {
      setError(err?.message || 'Failed to create administrative user');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div>
      {/* BREADCRUMBS */}
      <nav style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
        <Link href="/dashboard" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>
          Admin
        </Link>{' '}
        → <strong style={{ color: 'var(--text-primary)' }}>Admin Users</strong>
      </nav>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">Administrative Staff & Role Governance</h1>
          <p className="page-subtitle">Manage administrative privileges, role matrix, and operator permissions</p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {hasPermission('admin_users:manage') && currentAdmin?.role === 'SUPER_ADMIN' && (
            <button onClick={() => setShowCreateModal(true)} className="btn btn-primary" style={{ fontSize: '0.85rem' }}>
              ➕ Create Admin Account
            </button>
          )}
          <button onClick={() => fetchAdminUsers(pagination.page)} className="btn btn-secondary" style={{ fontSize: '0.85rem' }}>
            🔄 Refresh
          </button>
        </div>
      </div>

      {actionMessage && (
        <div className="badge badge-success" style={{ padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', width: '100%', marginBottom: '1.5rem', display: 'block', fontSize: '0.85rem' }}>
          {actionMessage}
        </div>
      )}

      {error && (
        <div className="badge badge-danger" style={{ padding: '1rem', borderRadius: 'var(--radius-md)', width: '100%', marginBottom: '1.5rem', display: 'block' }}>
          {error}
        </div>
      )}

      {/* ADMIN USERS TABLE */}
      <div className="card">
        <div className="table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Admin Name & Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>User ID</th>
                <th>Created At</th>
                <th>Last Active</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                [1, 2, 3].map((i) => (
                  <tr key={i}>
                    <td colSpan={7}>
                      <div className="skeleton" style={{ height: '24px', width: '100%' }} />
                    </td>
                  </tr>
                ))
              ) : items.length > 0 ? (
                items.map((u) => {
                  const isSelf = u.id === currentAdmin?.id;
                  const isSuperAdmin = u.role === 'SUPER_ADMIN';

                  return (
                    <tr key={u.id}>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                          {u.fullName || 'Nameless Administrator'}{' '}
                          {isSelf && <span style={{ color: 'var(--accent-color)', fontSize: '0.75rem' }}>(You)</span>}
                        </div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>{u.email}</div>
                      </td>
                      <td>
                        <span className={`badge ${u.role === 'SUPER_ADMIN' ? 'badge-danger' : u.role === 'ADMIN' ? 'badge-primary' : 'badge-warning'}`}>
                          {u.role}
                        </span>
                      </td>
                      <td><span className="badge badge-success">✓ Active Staff</span></td>
                      <td style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--text-muted)' }}>{u.id.slice(0, 8)}...</td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{new Date(u.createdAt).toLocaleDateString()}</td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{new Date(u.updatedAt).toLocaleDateString()}</td>
                      <td>
                        {hasPermission('admin_users:manage') && currentAdmin?.role === 'SUPER_ADMIN' && !isSelf && !isSuperAdmin ? (
                          <button
                            onClick={() => {
                              setTargetUser(u);
                              setSelectedRole(u.role === 'ADMIN' ? 'SUPPORT' : 'ADMIN');
                            }}
                            className="btn btn-secondary"
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                          >
                            🛡️ Change Role
                          </button>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {isSuperAdmin ? 'Protected' : isSelf ? 'Self' : 'Read-Only'}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                    No administrative accounts found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE ADMIN STAFF MODAL */}
      {showCreateModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <form onSubmit={handleCreateAdmin} className="card" style={{ maxWidth: '480px', padding: '1.5rem', width: '90%' }}>
            <h3 style={{ marginTop: 0, color: 'var(--text-primary)' }}>Create Administrative Staff Account</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              Create a new operator account for Astro Sushil internal management.
            </p>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>Email Address *</label>
              <input
                type="email"
                required
                className="input-control"
                placeholder="operator@astrosushil.com"
                value={createForm.email}
                onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>Full Name</label>
              <input
                type="text"
                className="input-control"
                placeholder="e.g. Anjali Sharma"
                value={createForm.fullName}
                onChange={(e) => setCreateForm({ ...createForm, fullName: e.target.value })}
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>Initial Password (min 8 chars) *</label>
              <input
                type="password"
                required
                minLength={8}
                className="input-control"
                placeholder="••••••••••••"
                value={createForm.password}
                onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>Role Assignment *</label>
              <select
                className="input-control"
                value={createForm.role}
                onChange={(e) => setCreateForm({ ...createForm, role: e.target.value as any })}
              >
                <option value="SUPPORT">SUPPORT (Read-Only Support View)</option>
                <option value="ADMIN">ADMIN (Full Operational Privileges)</option>
              </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button type="button" onClick={() => setShowCreateModal(false)} disabled={isCreating} className="btn btn-secondary">
                Cancel
              </button>
              <button type="submit" disabled={isCreating} className="btn btn-primary">
                {isCreating ? 'Creating...' : 'Create Account'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ROLE UPDATE MODAL */}
      {targetUser && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ maxWidth: '450px', padding: '1.5rem', width: '90%' }}>
            <h3 style={{ marginTop: 0, color: 'var(--text-primary)' }}>Modify Role for {targetUser.email}</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              Select new administrative role. Changing roles will be recorded in the security audit log.
            </p>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                Target Role
              </label>
              <select className="input-control" value={selectedRole} onChange={(e) => setSelectedRole(e.target.value as any)}>
                <option value="ADMIN">ADMIN (Full Operational Privileges)</option>
                <option value="SUPPORT">SUPPORT (Read-Only Support View)</option>
              </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button onClick={() => setTargetUser(null)} disabled={isUpdating} className="btn btn-secondary">
                Cancel
              </button>
              <button onClick={handleUpdateRole} disabled={isUpdating} className="btn btn-primary">
                {isUpdating ? 'Updating...' : 'Confirm Role Update'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
