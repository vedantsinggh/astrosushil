'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../lib/auth-context';
import { apiErrorMessage } from '../../lib/api/uploads';
import {
  CreateStaffInput,
  PagePagination,
  RoleOption,
  StaffMember,
  StaffProfileInput,
  StaffStatus,
  createStaff,
  deleteStaff,
  fetchRoleOptions,
  fetchStaff,
  passwordProblem,
  resetStaffPassword,
  staffProfileChanges,
  updateStaff,
  updateStaffRole,
  updateStaffStatus,
} from '../../lib/api/staff';
import {
  Breadcrumbs,
  ConfirmDialog,
  EmptyRow,
  Field,
  Modal,
  Notice,
  PageHeader,
  Pagination,
  PermissionGate,
  SkeletonRows,
  formatDate,
  formatDateTime,
  gridTwo,
  labelStyle,
  smallButton,
} from '../../components/catalogue/ui';

const PASSWORD_HINT = '8 to 100 characters with an uppercase letter, a lowercase letter and a number or symbol.';

type ProfileForm = Record<keyof StaffProfileInput, string>;

function profileForm(staff: StaffMember): ProfileForm {
  return {
    fullName: staff.fullName ?? '',
    phoneNumber: staff.phoneNumber ?? '',
    designation: staff.designation ?? '',
    website: staff.website ?? '',
    portfolioLink: staff.portfolioLink ?? '',
    address: staff.address ?? '',
    city: staff.city ?? '',
    state: staff.state ?? '',
    postalCode: staff.postalCode ?? '',
  };
}

const EMPTY_CREATE = { fullName: '', email: '', username: '', password: '', phoneNumber: '', designation: '', roleId: '', status: 'ACTIVE' as StaffStatus };

type Dialog =
  | { kind: 'create' }
  | { kind: 'edit'; staff: StaffMember }
  | { kind: 'role'; staff: StaffMember }
  | { kind: 'password'; staff: StaffMember }
  | { kind: 'status'; staff: StaffMember }
  | { kind: 'delete'; staff: StaffMember };

function StaffScreen() {
  const { user, hasPermission } = useAuth();
  const canCreate = hasPermission('staff:create');
  const canUpdate = hasPermission('staff:update');
  const canDelete = hasPermission('staff:delete');
  const actorIsSuperAdmin = user?.role === 'SUPER_ADMIN';

  const [items, setItems] = useState<StaffMember[]>([]);
  const [pagination, setPagination] = useState<PagePagination>({ page: 1, pageSize: 10, total: 0, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<StaffStatus | ''>('');
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [rolesError, setRolesError] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const [createForm, setCreateForm] = useState(EMPTY_CREATE);
  const [editForm, setEditForm] = useState<ProfileForm | null>(null);
  const [roleChoice, setRoleChoice] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const load = useCallback(
    async (page: number) => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetchStaff({ page, pageSize: 10, search: search.trim(), role: roleFilter, status: statusFilter });
        setItems(res.items);
        setPagination(res.pagination);
      } catch (err) {
        setError(apiErrorMessage(err, 'Failed to load staff'));
      } finally {
        setIsLoading(false);
      }
    },
    [search, roleFilter, statusFilter]
  );

  useEffect(() => {
    const timer = setTimeout(() => load(1), 300);
    return () => clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    // The role list needs roles:read, staff:create or staff:update. Without it the list still works.
    fetchRoleOptions()
      .then(setRoles)
      .catch((err) => setRolesError(apiErrorMessage(err, 'Roles could not be loaded')));
  }, []);

  /** Only a Super Admin can assign the Super Admin role. */
  const assignableRoles = roles.filter((role) => actorIsSuperAdmin || !role.isSuperAdmin);

  /** Why the server would refuse changes to this account by the signed-in user, or null. */
  const guard = (staff: StaffMember, action: 'profile' | 'own-blocked'): string | null => {
    if (staff.role?.isSuperAdmin && !actorIsSuperAdmin) return "Only a Super Admin can modify a Super Admin's account.";
    if (action === 'own-blocked' && staff.id === user?.id) return 'You cannot do this to your own account.';
    return null;
  };

  const open = (next: Dialog) => {
    setDialogError(null);
    setNewPassword('');
    setConfirmPassword('');
    if (next.kind === 'create') setCreateForm(EMPTY_CREATE);
    if (next.kind === 'edit') setEditForm(profileForm(next.staff));
    if (next.kind === 'role') setRoleChoice(next.staff.role?.id ?? '');
    setDialog(next);
  };

  const run = async (action: () => Promise<string>) => {
    setIsBusy(true);
    setDialogError(null);
    try {
      const done = await action();
      setMessage(done);
      setDialog(null);
      await load(pagination.page);
    } catch (err) {
      setDialogError(apiErrorMessage(err, 'The action failed'));
    } finally {
      setIsBusy(false);
    }
  };

  const handleCreate = (event: React.FormEvent) => {
    event.preventDefault();
    const fullName = createForm.fullName.trim();
    const email = createForm.email.trim().toLowerCase();
    const username = createForm.username.trim();
    const phoneNumber = createForm.phoneNumber.trim();
    const designation = createForm.designation.trim();

    if (fullName.length < 2 || fullName.length > 80) return setDialogError('Full name must be 2 to 80 characters');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setDialogError('Enter a valid email address');
    if (username && !/^[a-zA-Z0-9._-]{3,30}$/.test(username)) {
      return setDialogError('Username must be 3 to 30 characters: letters, numbers, dots, underscores and hyphens');
    }
    if (phoneNumber && (phoneNumber.length < 10 || phoneNumber.length > 15)) return setDialogError('Phone must be 10 to 15 characters');
    if (designation.length > 80) return setDialogError('Designation must be at most 80 characters');
    const problem = passwordProblem(createForm.password);
    if (problem) return setDialogError(problem);
    if (!createForm.roleId) return setDialogError('Choose a role');

    const body: CreateStaffInput = { fullName, email, password: createForm.password, roleId: createForm.roleId, status: createForm.status };
    if (username) body.username = username;
    if (phoneNumber) body.phoneNumber = phoneNumber;
    if (designation) body.designation = designation;

    run(async () => {
      const created = await createStaff(body);
      return `Staff account for ${created.email} created. Give them the password yourself: it is not emailed.`;
    });
  };

  const handleEdit = (event: React.FormEvent) => {
    event.preventDefault();
    if (dialog?.kind !== 'edit' || !editForm) return;
    const { changes, cannotClear, problem } = staffProfileChanges(dialog.staff, editForm);
    if (problem) return setDialogError(problem);
    if (cannotClear.length > 0) {
      return setDialogError(`${cannotClear.join(', ')} cannot be emptied: the server only accepts a new value for it. Enter a value or restore the old one.`);
    }
    if (Object.keys(changes).length === 0) return setDialog(null);
    const staff = dialog.staff;
    run(async () => {
      await updateStaff(staff.id, changes);
      return `Profile of ${staff.email} updated.`;
    });
  };

  const handleRole = (event: React.FormEvent) => {
    event.preventDefault();
    if (dialog?.kind !== 'role') return;
    if (!roleChoice) return setDialogError('Choose a role');
    if (roleChoice === dialog.staff.role?.id) return setDialog(null);
    const staff = dialog.staff;
    run(async () => {
      const updated = await updateStaffRole(staff.id, roleChoice);
      return `${staff.email} is now on the role "${updated.role?.name ?? 'unknown'}". The server applies the new permissions within seconds; their menu updates after their next sign-in.`;
    });
  };

  const handlePassword = (event: React.FormEvent) => {
    event.preventDefault();
    if (dialog?.kind !== 'password') return;
    const problem = passwordProblem(newPassword);
    if (problem) return setDialogError(problem);
    if (newPassword !== confirmPassword) return setDialogError('The two passwords do not match');
    const staff = dialog.staff;
    run(async () => {
      await resetStaffPassword(staff.id, newPassword);
      return `Password of ${staff.email} was reset and they were signed out everywhere. Give them the new password yourself: it is not emailed.`;
    });
  };

  const handleStatus = () => {
    if (dialog?.kind !== 'status') return;
    const staff = dialog.staff;
    const next: StaffStatus = staff.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    run(async () => {
      await updateStaffStatus(staff.id, next);
      return next === 'SUSPENDED' ? `${staff.email} was suspended and can no longer use the admin.` : `${staff.email} was activated.`;
    });
  };

  const handleDelete = () => {
    if (dialog?.kind !== 'delete') return;
    const staff = dialog.staff;
    run(async () => {
      await deleteStaff(staff.id);
      return `Staff account ${staff.email} was removed.`;
    });
  };

  const showActions = canUpdate || canDelete;
  const columns = showActions ? 7 : 6;

  return (
    <div>
      <Breadcrumbs items={[{ label: 'Staff' }]} />
      <PageHeader
        title="Staff"
        subtitle="Admin accounts, their roles and their access"
        actions={
          <>
            {canCreate && (
              <button onClick={() => open({ kind: 'create' })} className="btn btn-primary" style={{ fontSize: '0.85rem' }}>
                Add Staff
              </button>
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
            <input type="text" className="input-control" placeholder="Search by name, email, username…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Role</label>
            <select className="input-control" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} disabled={roles.length === 0}>
              <option value="">All roles</option>
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Status</label>
            <select className="input-control" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as StaffStatus | '')}>
              <option value="">All statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="SUSPENDED">Suspended</option>
            </select>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Staff Member</th>
                <th>Role</th>
                <th>Designation / Phone</th>
                <th>Status</th>
                <th>Last Login</th>
                <th>Created</th>
                {showActions && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <SkeletonRows columns={columns} rows={3} />
              ) : items.length > 0 ? (
                items.map((staff) => {
                  const isSelf = staff.id === user?.id;
                  const profileBlocked = guard(staff, 'profile');
                  const ownBlocked = guard(staff, 'own-blocked');
                  return (
                    <tr key={staff.id}>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                          {staff.fullName || 'No name'} {isSelf && <span style={{ color: 'var(--accent-primary)', fontSize: '0.75rem' }}>(You)</span>}
                        </div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                          {staff.email}
                          {staff.username ? ` · @${staff.username}` : ''}
                        </div>
                      </td>
                      <td>
                        {staff.role ? (
                          <>
                            <span className={`badge ${staff.role.isSuperAdmin ? 'badge-danger' : 'badge-info'}`}>{staff.role.name}</span>
                            {staff.role.status !== 'ACTIVE' && (
                              <div style={{ fontSize: '0.7rem', color: 'var(--badge-warning-text)', marginTop: '0.2rem' }}>Role inactive: cannot sign in</div>
                            )}
                          </>
                        ) : (
                          <span className="badge badge-warning">No role: no access</span>
                        )}
                      </td>
                      <td>
                        <div style={{ fontSize: '0.85rem' }}>{staff.designation || '—'}</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{staff.phoneNumber || ''}</div>
                      </td>
                      <td>
                        <span className={`badge ${staff.status === 'ACTIVE' ? 'badge-success' : 'badge-danger'}`}>{staff.status}</span>
                      </td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{staff.lastLoginAt ? formatDateTime(staff.lastLoginAt) : 'Never'}</td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{formatDate(staff.createdAt)}</td>
                      {showActions && (
                        <td>
                          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', maxWidth: '300px' }}>
                            {canUpdate && (
                              <>
                                <button onClick={() => open({ kind: 'edit', staff })} disabled={Boolean(profileBlocked)} title={profileBlocked || undefined} className="btn btn-secondary" style={{ ...smallButton, opacity: profileBlocked ? 0.5 : 1 }}>
                                  Edit
                                </button>
                                <button onClick={() => open({ kind: 'role', staff })} disabled={Boolean(ownBlocked)} title={ownBlocked || undefined} className="btn btn-secondary" style={{ ...smallButton, opacity: ownBlocked ? 0.5 : 1 }}>
                                  Change Role
                                </button>
                                <button onClick={() => open({ kind: 'status', staff })} disabled={Boolean(ownBlocked)} title={ownBlocked || undefined} className="btn btn-secondary" style={{ ...smallButton, opacity: ownBlocked ? 0.5 : 1 }}>
                                  {staff.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                                </button>
                                <button onClick={() => open({ kind: 'password', staff })} disabled={Boolean(profileBlocked)} title={profileBlocked || undefined} className="btn btn-secondary" style={{ ...smallButton, opacity: profileBlocked ? 0.5 : 1 }}>
                                  Reset Password
                                </button>
                              </>
                            )}
                            {canDelete && (
                              <button onClick={() => open({ kind: 'delete', staff })} disabled={Boolean(ownBlocked)} title={ownBlocked || undefined} className="btn btn-secondary" style={{ ...smallButton, color: 'var(--badge-danger-text)', opacity: ownBlocked ? 0.5 : 1 }}>
                                Remove
                              </button>
                            )}
                          </div>
                          {ownBlocked && (
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem', maxWidth: '300px' }}>
                              {isSelf && !profileBlocked ? (
                                <>
                                  You cannot change the role or status of, or remove, your own account. Use <Link href="/profile">My Profile</Link> for your details and password.
                                </>
                              ) : (
                                ownBlocked
                              )}
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })
              ) : (
                <EmptyRow columns={columns}>No staff accounts found.</EmptyRow>
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={pagination.page} totalPages={pagination.totalPages} total={pagination.total} noun="staff accounts" onPage={load} disabled={isLoading} />
      </div>

      {dialog?.kind === 'create' && (
        <Modal title="Add Staff Account" onClose={() => setDialog(null)} busy={isBusy} width={600}>
          <form onSubmit={handleCreate}>
            <div style={gridTwo}>
              <Field label="Full Name" required>
                <input type="text" className="input-control" required minLength={2} maxLength={80} placeholder="e.g. Priya Sharma" value={createForm.fullName} onChange={(e) => setCreateForm({ ...createForm, fullName: e.target.value })} />
              </Field>
              <Field label="Email" required hint="Staff sign in with their email.">
                <input type="email" className="input-control" required placeholder="name@company.com" value={createForm.email} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })} />
              </Field>
              <Field label="Username" hint="Optional; kept for the record, not used to sign in.">
                <input type="text" className="input-control" maxLength={30} placeholder="e.g. priya.sharma" value={createForm.username} onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })} />
              </Field>
              <Field label="Phone">
                <input type="tel" className="input-control" maxLength={15} placeholder="10-digit number" value={createForm.phoneNumber} onChange={(e) => setCreateForm({ ...createForm, phoneNumber: e.target.value })} />
              </Field>
              <Field label="Designation">
                <input type="text" className="input-control" maxLength={80} placeholder="e.g. Sales Manager" value={createForm.designation} onChange={(e) => setCreateForm({ ...createForm, designation: e.target.value })} />
              </Field>
              <Field label="Role" required error={rolesError} hint="Only active roles can be assigned.">
                <select className="input-control" required value={createForm.roleId} onChange={(e) => setCreateForm({ ...createForm, roleId: e.target.value })}>
                  <option value="">Select role</option>
                  {assignableRoles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Password" required hint={PASSWORD_HINT}>
                <input type="password" className="input-control" required autoComplete="new-password" maxLength={100} value={createForm.password} onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })} />
              </Field>
              <Field label="Status">
                <select className="input-control" value={createForm.status} onChange={(e) => setCreateForm({ ...createForm, status: e.target.value as StaffStatus })}>
                  <option value="ACTIVE">Active</option>
                  <option value="SUSPENDED">Suspended</option>
                </select>
              </Field>
            </div>
            {dialogError && <Notice kind="error">{dialogError}</Notice>}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button type="button" onClick={() => setDialog(null)} disabled={isBusy} className="btn btn-secondary">
                Cancel
              </button>
              <button type="submit" disabled={isBusy} className="btn btn-primary">
                {isBusy ? 'Creating…' : 'Create Account'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {dialog?.kind === 'edit' && editForm && (
        <Modal title={`Edit Profile: ${dialog.staff.email}`} onClose={() => setDialog(null)} busy={isBusy} width={600}>
          <form onSubmit={handleEdit}>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              Email and username cannot be changed here. Use the other actions for role, status and password.
            </p>
            <div style={gridTwo}>
              <Field label="Full Name" required>
                <input type="text" className="input-control" maxLength={80} value={editForm.fullName} onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })} />
              </Field>
              <Field label="Phone">
                <input type="tel" className="input-control" maxLength={15} value={editForm.phoneNumber} onChange={(e) => setEditForm({ ...editForm, phoneNumber: e.target.value })} />
              </Field>
              <Field label="Designation">
                <input type="text" className="input-control" maxLength={80} value={editForm.designation} onChange={(e) => setEditForm({ ...editForm, designation: e.target.value })} />
              </Field>
              <Field label="Website">
                <input type="url" className="input-control" maxLength={300} placeholder="https://" value={editForm.website} onChange={(e) => setEditForm({ ...editForm, website: e.target.value })} />
              </Field>
              <Field label="Portfolio Link">
                <input type="url" className="input-control" maxLength={300} placeholder="https://" value={editForm.portfolioLink} onChange={(e) => setEditForm({ ...editForm, portfolioLink: e.target.value })} />
              </Field>
              <Field label="City">
                <input type="text" className="input-control" maxLength={80} value={editForm.city} onChange={(e) => setEditForm({ ...editForm, city: e.target.value })} />
              </Field>
              <Field label="State">
                <input type="text" className="input-control" maxLength={80} value={editForm.state} onChange={(e) => setEditForm({ ...editForm, state: e.target.value })} />
              </Field>
              <Field label="Postal Code">
                <input type="text" className="input-control" maxLength={20} value={editForm.postalCode} onChange={(e) => setEditForm({ ...editForm, postalCode: e.target.value })} />
              </Field>
            </div>
            <Field label="Address">
              <textarea className="input-control" rows={2} maxLength={300} value={editForm.address} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} />
            </Field>
            {dialogError && <Notice kind="error">{dialogError}</Notice>}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button type="button" onClick={() => setDialog(null)} disabled={isBusy} className="btn btn-secondary">
                Cancel
              </button>
              <button type="submit" disabled={isBusy} className="btn btn-primary">
                {isBusy ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {dialog?.kind === 'role' && (
        <Modal title={`Change Role: ${dialog.staff.email}`} onClose={() => setDialog(null)} busy={isBusy} width={460}>
          <form onSubmit={handleRole}>
            <Field label="Role" required error={rolesError} hint="Only active roles are listed. Only a Super Admin can assign the Super Admin role. The last Super Admin cannot be moved to another role.">
              <select className="input-control" value={roleChoice} onChange={(e) => setRoleChoice(e.target.value)}>
                <option value="">Select role</option>
                {assignableRoles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
            </Field>
            {dialogError && <Notice kind="error">{dialogError}</Notice>}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button type="button" onClick={() => setDialog(null)} disabled={isBusy} className="btn btn-secondary">
                Cancel
              </button>
              <button type="submit" disabled={isBusy} className="btn btn-primary">
                {isBusy ? 'Saving…' : 'Change Role'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {dialog?.kind === 'password' && (
        <Modal title={`Reset Password: ${dialog.staff.email}`} onClose={() => setDialog(null)} busy={isBusy} width={460}>
          <form onSubmit={handlePassword}>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              The account is signed out everywhere. The new password is not emailed or shown again: pass it to the staff
              member yourself.
            </p>
            <Field label="New Password" required hint={PASSWORD_HINT}>
              <input type="password" className="input-control" required autoComplete="new-password" maxLength={100} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            </Field>
            <Field label="Confirm New Password" required>
              <input type="password" className="input-control" required autoComplete="new-password" maxLength={100} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
            </Field>
            {dialogError && <Notice kind="error">{dialogError}</Notice>}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button type="button" onClick={() => setDialog(null)} disabled={isBusy} className="btn btn-secondary">
                Cancel
              </button>
              <button type="submit" disabled={isBusy} className="btn btn-primary">
                {isBusy ? 'Resetting…' : 'Reset Password'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {dialog?.kind === 'status' && (
        <ConfirmDialog
          title={`${dialog.staff.status === 'ACTIVE' ? 'Suspend' : 'Activate'} ${dialog.staff.email}?`}
          confirmLabel={dialog.staff.status === 'ACTIVE' ? 'Suspend Account' : 'Activate Account'}
          onConfirm={handleStatus}
          onCancel={() => setDialog(null)}
          busy={isBusy}
          error={dialogError}
          danger={dialog.staff.status === 'ACTIVE'}
        >
          {dialog.staff.status === 'ACTIVE'
            ? 'The staff member is signed out and cannot use the admin until the account is activated again. The last Super Admin cannot be suspended.'
            : 'The staff member will be able to sign in again with the permissions of their role.'}
        </ConfirmDialog>
      )}

      {dialog?.kind === 'delete' && (
        <ConfirmDialog
          title={`Remove staff account ${dialog.staff.email}?`}
          confirmLabel="Remove Account"
          onConfirm={handleDelete}
          onCancel={() => setDialog(null)}
          busy={isBusy}
          error={dialogError}
        >
          The account loses all admin access and no longer appears in this list. Its history in the audit log is kept.
          The last Super Admin cannot be removed.
        </ConfirmDialog>
      )}
    </div>
  );
}

export default function StaffPage() {
  return (
    <PermissionGate permission="staff:read">
      <StaffScreen />
    </PermissionGate>
  );
}
