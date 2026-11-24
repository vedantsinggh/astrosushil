'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../lib/auth-context';
import { apiErrorMessage } from '../../lib/api/uploads';
import { AdminRole, PagePagination, RoleStatus, deleteRole, fetchOwnProfile, fetchRoles, updateRoleStatus } from '../../lib/api/staff';
import {
  Breadcrumbs,
  ConfirmDialog,
  EmptyRow,
  Notice,
  PageHeader,
  Pagination,
  PermissionGate,
  SkeletonRows,
  formatDate,
  labelStyle,
  smallButton,
} from '../../components/catalogue/ui';

/** Why the server would refuse to delete this role, or null when a delete can be attempted. */
function deleteBlocker(role: AdminRole, ownRoleId: string | null): string | null {
  if (role.isSuperAdmin || role.isSystem) return 'System roles cannot be deleted.';
  if (ownRoleId && role.id === ownRoleId) return 'You cannot delete your own role.';
  if ((role.staffCount ?? 0) > 0) return `Assigned to ${role.staffCount} staff account(s). Reassign them first.`;
  return null;
}

function statusBlocker(role: AdminRole, ownRoleId: string | null): string | null {
  if (role.isSuperAdmin) return 'The Super Admin role cannot be modified.';
  if (ownRoleId && role.id === ownRoleId && role.status === 'ACTIVE') return 'You cannot deactivate your own role.';
  return null;
}

function RolesScreen() {
  const { hasPermission } = useAuth();
  const canCreate = hasPermission('roles:create');
  const canUpdate = hasPermission('roles:update');
  const canDelete = hasPermission('roles:delete');

  const [items, setItems] = useState<AdminRole[]>([]);
  const [pagination, setPagination] = useState<PagePagination>({ page: 1, pageSize: 10, total: 0, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<RoleStatus | ''>('');
  const [ownRoleId, setOwnRoleId] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [statusTarget, setStatusTarget] = useState<AdminRole | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<AdminRole | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    const saved = new URLSearchParams(window.location.search).get('saved');
    if (saved === 'created') setMessage('Role created.');
    if (saved === 'updated') setMessage('Role updated. Staff see a changed menu after their next sign-in; the server applies the change within seconds.');
    fetchOwnProfile()
      .then((profile) => setOwnRoleId(profile.role?.id ?? null))
      .catch(() => undefined);
  }, []);

  const load = useCallback(
    async (page: number) => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetchRoles({ page, pageSize: 10, search: search.trim(), status: statusFilter });
        setItems(res.items);
        setPagination(res.pagination);
      } catch (err) {
        setError(apiErrorMessage(err, 'Failed to load roles'));
      } finally {
        setIsLoading(false);
      }
    },
    [search, statusFilter]
  );

  useEffect(() => {
    const timer = setTimeout(() => load(1), 300);
    return () => clearTimeout(timer);
  }, [load]);

  const handleStatus = async () => {
    if (!statusTarget) return;
    const next: RoleStatus = statusTarget.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    setBusyId(statusTarget.id);
    setStatusError(null);
    try {
      await updateRoleStatus(statusTarget.id, next);
      setMessage(`Role "${statusTarget.name}" is now ${next === 'ACTIVE' ? 'active' : 'inactive'}.`);
      setStatusTarget(null);
      await load(pagination.page);
    } catch (err) {
      setStatusError(apiErrorMessage(err, 'Failed to change the role status'));
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setBusyId(deleting.id);
    setDeleteError(null);
    try {
      await deleteRole(deleting.id);
      setMessage(`Role "${deleting.name}" deleted.`);
      setDeleting(null);
      await load(pagination.page);
    } catch (err) {
      setDeleteError(apiErrorMessage(err, 'Failed to delete the role'));
    } finally {
      setBusyId(null);
    }
  };

  const columns = 7;

  return (
    <div>
      <Breadcrumbs items={[{ label: 'Roles' }]} />
      <PageHeader
        title="Roles & Permissions"
        subtitle="What each group of staff may see and do in the admin"
        actions={
          <>
            {canCreate && (
              <Link href="/roles/new" className="btn btn-primary" style={{ fontSize: '0.85rem' }}>
                Create Role
              </Link>
            )}
            <button onClick={() => load(pagination.page)} className="btn btn-secondary" style={{ fontSize: '0.85rem' }}>
              Refresh
            </button>
          </>
        }
      />

      {message && <Notice kind="success" onDismiss={() => setMessage(null)}>{message}</Notice>}
      {error && <Notice kind="error">{error}</Notice>}

      <div className="card" style={{ marginBottom: '1.5rem', padding: '1.25rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
          <div style={{ gridColumn: 'span 2' }}>
            <label style={labelStyle}>Search</label>
            <input type="text" className="input-control" placeholder="Search roles…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Status</label>
            <select className="input-control" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as RoleStatus | '')}>
              <option value="">All statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Role</th>
                <th>Type</th>
                <th>Permissions</th>
                <th>Staff</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <SkeletonRows columns={columns} rows={3} />
              ) : items.length > 0 ? (
                items.map((role) => {
                  const isOwn = Boolean(ownRoleId && role.id === ownRoleId);
                  const cannotDelete = deleteBlocker(role, ownRoleId);
                  const cannotToggle = statusBlocker(role, ownRoleId);
                  return (
                    <tr key={role.id}>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                          {role.name} {isOwn && <span style={{ color: 'var(--accent-primary)', fontSize: '0.75rem' }}>(Your role)</span>}
                        </div>
                        {role.description && <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>{role.description}</div>}
                      </td>
                      <td>
                        {role.isSuperAdmin ? (
                          <span className="badge badge-danger">Super Admin</span>
                        ) : role.isSystem ? (
                          <span className="badge badge-warning">System</span>
                        ) : (
                          <span className="badge badge-info">Custom</span>
                        )}
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>{role.isSuperAdmin ? 'All' : role.permissionCount}</td>
                      <td style={{ fontSize: '0.85rem' }}>{role.staffCount ?? 0}</td>
                      <td>
                        <span className={`badge ${role.status === 'ACTIVE' ? 'badge-success' : 'badge-warning'}`}>{role.status}</span>
                      </td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{formatDate(role.createdAt)}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                          <Link href={`/roles/${role.id}`} className="btn btn-secondary" style={smallButton}>
                            {canUpdate && !role.isSuperAdmin ? 'Edit' : 'View'}
                          </Link>
                          {canUpdate && (
                            <button
                              onClick={() => {
                                setStatusError(null);
                                setStatusTarget(role);
                              }}
                              disabled={Boolean(cannotToggle) || busyId === role.id}
                              title={cannotToggle || undefined}
                              className="btn btn-secondary"
                              style={{ ...smallButton, opacity: cannotToggle ? 0.5 : 1 }}
                            >
                              {role.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                            </button>
                          )}
                          {canDelete && (
                            <button
                              onClick={() => {
                                setDeleteError(null);
                                setDeleting(role);
                              }}
                              disabled={Boolean(cannotDelete) || busyId === role.id}
                              title={cannotDelete || undefined}
                              className="btn btn-secondary"
                              style={{ ...smallButton, color: 'var(--badge-danger-text)', opacity: cannotDelete ? 0.5 : 1 }}
                            >
                              Delete
                            </button>
                          )}
                        </div>
                        {(canDelete || canUpdate) && (cannotDelete || cannotToggle) && (
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem', maxWidth: '260px' }}>
                            {[canUpdate ? cannotToggle : null, canDelete ? cannotDelete : null].filter(Boolean).join(' ')}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <EmptyRow columns={columns}>No roles found.</EmptyRow>
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={pagination.page} totalPages={pagination.totalPages} total={pagination.total} noun="roles" onPage={load} disabled={isLoading} />
      </div>

      {statusTarget && (
        <ConfirmDialog
          title={`${statusTarget.status === 'ACTIVE' ? 'Deactivate' : 'Activate'} role "${statusTarget.name}"?`}
          confirmLabel={statusTarget.status === 'ACTIVE' ? 'Deactivate Role' : 'Activate Role'}
          onConfirm={handleStatus}
          onCancel={() => setStatusTarget(null)}
          busy={busyId === statusTarget.id}
          error={statusError}
          danger={statusTarget.status === 'ACTIVE'}
        >
          {statusTarget.status === 'ACTIVE'
            ? `The ${statusTarget.staffCount ?? 0} staff account(s) on this role will not be able to sign in to the admin until the role is active again.`
            : 'Staff on this role will be able to sign in again with the permissions of the role.'}
        </ConfirmDialog>
      )}

      {deleting && (
        <ConfirmDialog
          title={`Delete role "${deleting.name}"?`}
          confirmLabel="Delete Role"
          onConfirm={handleDelete}
          onCancel={() => setDeleting(null)}
          busy={busyId === deleting.id}
          error={deleteError}
        >
          The role is removed permanently. A role that still has staff, a system role and your own role cannot be
          deleted.
        </ConfirmDialog>
      )}
    </div>
  );
}

export default function RolesPage() {
  return (
    <PermissionGate permission="roles:read">
      <RolesScreen />
    </PermissionGate>
  );
}
