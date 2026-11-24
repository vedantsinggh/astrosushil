'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../lib/auth-context';
import { apiErrorMessage } from '../../lib/api/uploads';
import {
  Customer,
  CustomerInput,
  CustomerStatus,
  deleteCustomer,
  downloadCustomersCsv,
  fetchCustomers,
  updateCustomer,
} from '../../lib/api/catalogue';
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
  gridTwo,
  labelStyle,
  smallButton,
} from '../../components/catalogue/ui';

interface EditForm {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  username: string;
  dob: string;
  gender: string;
  birthPlace: string;
  birthTime: string;
  bio: string;
  status: CustomerStatus;
  reason: string;
}

function toForm(customer: Customer): EditForm {
  return {
    firstName: customer.firstName || '',
    lastName: customer.lastName || '',
    email: customer.email || '',
    phoneNumber: customer.phoneNumber || '',
    username: customer.username || '',
    dob: customer.dob || '',
    gender: customer.gender || '',
    birthPlace: customer.birthPlace || '',
    birthTime: customer.birthTime || '',
    bio: customer.bio || '',
    status: customer.status,
    reason: '',
  };
}

const PROFILE_KEYS = ['firstName', 'lastName', 'email', 'phoneNumber', 'username', 'dob', 'gender', 'birthPlace', 'birthTime', 'bio'] as const;

function CustomersScreen() {
  const { hasPermission } = useAuth();
  const canUpdate = hasPermission('customers:update');
  const canDelete = hasPermission('customers:delete');
  const canOpenUser = hasPermission('users:read');

  const [items, setItems] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [statusFilter, setStatusFilter] = useState<CustomerStatus | ''>('');

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState<EditForm | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [deleting, setDeleting] = useState<Customer | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const load = useCallback(
    async (targetPage: number) => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetchCustomers({ page: targetPage, limit: pageSize, search: search.trim(), fromDate, toDate, status: statusFilter });
        setItems(res.users);
        setTotal(res.total);
        setPage(res.page);
      } catch (err) {
        setError(apiErrorMessage(err, 'Failed to load customers'));
      } finally {
        setIsLoading(false);
      }
    },
    [pageSize, search, fromDate, toDate, statusFilter]
  );

  useEffect(() => {
    const timer = setTimeout(() => load(1), 300);
    return () => clearTimeout(timer);
  }, [load]);

  const handleExport = async () => {
    setIsExporting(true);
    setError(null);
    try {
      await downloadCustomersCsv({ search: search.trim(), fromDate, toDate, status: statusFilter });
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to export customers'));
    } finally {
      setIsExporting(false);
    }
  };

  const openEdit = (customer: Customer) => {
    setEditing(customer);
    setForm(toForm(customer));
    setFormError(null);
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editing || !form) return;
    const original = toForm(editing);

    // Only changed fields are sent. The backend treats an empty value as "leave unchanged".
    const body: CustomerInput = {};
    const cannotClear: string[] = [];
    for (const key of PROFILE_KEYS) {
      const next = form[key].trim();
      if (next === original[key].trim()) continue;
      if (next === '') {
        cannotClear.push(key);
        continue;
      }
      body[key] = next;
    }
    if (cannotClear.length > 0) {
      setFormError(`A field cannot be emptied here (the server keeps the old value): ${cannotClear.join(', ')}. Enter a new value or restore the old one.`);
      return;
    }
    if (body.email !== undefined && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
      setFormError('Enter a valid email address');
      return;
    }
    if (form.status !== original.status) {
      body.status = form.status;
      const reason = form.reason.trim();
      if (reason) {
        if (reason.length < 3 || reason.length > 500) {
          setFormError('The reason must be 3 to 500 characters');
          return;
        }
        body.reason = reason;
      }
    }
    if (Object.keys(body).length === 0) {
      setEditing(null);
      return;
    }

    setIsSaving(true);
    setFormError(null);
    try {
      const updated = await updateCustomer(editing.id, body);
      setMessage(
        body.status === 'BLOCKED'
          ? `${updated.fullName || 'Customer'} was updated and blocked: they are signed out and cannot log in or use the shop.`
          : body.status === 'ACTIVE'
          ? `${updated.fullName || 'Customer'} was updated and unblocked.`
          : `${updated.fullName || 'Customer'} was updated.`
      );
      setEditing(null);
      await load(page);
    } catch (err) {
      setFormError(apiErrorMessage(err, 'Failed to update the customer'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const result = await deleteCustomer(deleting.id);
      setMessage(
        result.mode === 'anonymised'
          ? `The customer had ${result.paidOrders} paid order(s), so the account was anonymised: all personal data was removed and it is kept as "Deleted User" for its orders and invoices.`
          : 'The customer had no paid orders, so the account and everything attached to it was removed.'
      );
      setDeleting(null);
      await load(page);
    } catch (err) {
      setDeleteError(apiErrorMessage(err, 'Failed to delete the customer'));
    } finally {
      setIsDeleting(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const showActions = canUpdate || canDelete || canOpenUser;
  const columns = showActions ? 7 : 6;

  return (
    <div>
      <Breadcrumbs items={[{ label: 'Customers' }]} />
      <PageHeader
        title="Customers"
        subtitle="Customer accounts: profile, status, export and deletion. Staff accounts are on the Staff page."
        actions={
          <>
            <button onClick={handleExport} disabled={isExporting} className="btn btn-secondary" style={{ fontSize: '0.85rem' }}>
              {isExporting ? 'Exporting…' : 'Export CSV'}
            </button>
            <button onClick={() => load(page)} className="btn btn-secondary" style={{ fontSize: '0.85rem' }}>
              Refresh
            </button>
          </>
        }
      />

      {message && <Notice kind="success" onDismiss={() => setMessage(null)}>{message}</Notice>}
      {error && <Notice kind="error">{error}</Notice>}

      <div className="card" style={{ marginBottom: '1.5rem', padding: '1.25rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '1rem' }}>
          <div style={{ gridColumn: 'span 2' }}>
            <label style={labelStyle}>Search</label>
            <input type="text" className="input-control" placeholder="Search by name, email, phone or username..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Joined From</label>
            <input type="date" className="input-control" value={fromDate} max={toDate || undefined} onChange={(e) => setFromDate(e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Joined To</label>
            <input type="date" className="input-control" value={toDate} min={fromDate || undefined} onChange={(e) => setToDate(e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Status</label>
            <select className="input-control" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as CustomerStatus | '')}>
              <option value="">All statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="BLOCKED">Blocked</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Per Page</label>
            <select className="input-control" value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>
        {statusFilter && (
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.75rem' }}>
            The status filter is applied by the server to each page after it is read, so a page can show fewer rows than
            the page size and the total below counts customers of every status.
          </p>
        )}
      </div>

      <div className="card">
        <div className="table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Contact</th>
                <th>Username</th>
                <th>Verified</th>
                <th>Status</th>
                <th>Joined</th>
                {showActions && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <SkeletonRows columns={columns} />
              ) : items.length > 0 ? (
                items.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{`${c.firstName} ${c.lastName}`.trim() || c.fullName || 'No name'}</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontFamily: 'monospace' }}>{c.id.slice(0, 8)}...</div>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.85rem' }}>{c.email || <span style={{ color: 'var(--text-muted)' }}>No email</span>}</div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>{c.phoneNumber || 'No phone'}</div>
                    </td>
                    <td style={{ fontSize: '0.85rem' }}>{c.username || <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                    <td>
                      <span className={`badge ${c.isVerified ? 'badge-success' : 'badge-warning'}`}>{c.isVerified ? 'Verified' : 'Unverified'}</span>
                    </td>
                    <td>
                      <span className={`badge ${c.status === 'ACTIVE' ? 'badge-success' : 'badge-danger'}`}>{c.status}</span>
                    </td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{formatDate(c.createdAt)}</td>
                    {showActions && (
                      <td>
                        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                          {canOpenUser && (
                            <Link href={`/users/${c.id}`} className="btn btn-secondary" style={smallButton}>
                              Account
                            </Link>
                          )}
                          {canUpdate && (
                            <button onClick={() => openEdit(c)} className="btn btn-secondary" style={smallButton}>
                              Edit
                            </button>
                          )}
                          {canDelete && (
                            <button
                              onClick={() => {
                                setDeleteError(null);
                                setDeleting(c);
                              }}
                              className="btn btn-secondary"
                              style={{ ...smallButton, color: 'var(--badge-danger-text)' }}
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                <EmptyRow columns={columns}>No customers found matching your filters.</EmptyRow>
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={page} totalPages={totalPages} total={total} noun="customers" onPage={load} disabled={isLoading} />
      </div>

      {editing && form && (
        <Modal title={`Edit Customer: ${editing.fullName || editing.email || editing.phoneNumber || ''}`} onClose={() => setEditing(null)} busy={isSaving} width={640}>
          <form onSubmit={handleSave}>
            <div style={gridTwo}>
              <Field label="First Name">
                <input type="text" className="input-control" maxLength={100} value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
              </Field>
              <Field label="Last Name">
                <input type="text" className="input-control" maxLength={100} value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
              </Field>
              <Field label="Email" hint="A changed email loses its verified mark.">
                <input type="email" className="input-control" maxLength={254} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </Field>
              <Field label="Phone Number" hint="A changed phone loses its verified mark.">
                <input type="tel" className="input-control" maxLength={20} value={form.phoneNumber} onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })} />
              </Field>
              <Field label="Username">
                <input type="text" className="input-control" maxLength={60} value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
              </Field>
              <Field label="Gender">
                <select className="input-control" value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
                  <option value="">Select gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                  {form.gender && !['Male', 'Female', 'Other'].includes(form.gender) && <option value={form.gender}>{form.gender}</option>}
                </select>
              </Field>
              <Field label="Date of Birth">
                <input type="text" className="input-control" maxLength={40} placeholder="DD-MM-YYYY" value={form.dob} onChange={(e) => setForm({ ...form, dob: e.target.value })} />
              </Field>
              <Field label="Birth Time">
                <input type="text" className="input-control" maxLength={40} placeholder="HH:MM" value={form.birthTime} onChange={(e) => setForm({ ...form, birthTime: e.target.value })} />
              </Field>
            </div>
            <Field label="Birth Place">
              <input type="text" className="input-control" maxLength={200} value={form.birthPlace} onChange={(e) => setForm({ ...form, birthPlace: e.target.value })} />
            </Field>
            <Field label="Bio">
              <textarea className="input-control" rows={3} maxLength={2000} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
            </Field>
            <div style={gridTwo}>
              <Field
                label="Status"
                hint={form.status === 'BLOCKED' ? 'A blocked customer is signed out and cannot log in or use the shop.' : undefined}
              >
                <select className="input-control" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as CustomerStatus })}>
                  <option value="ACTIVE">Active</option>
                  <option value="BLOCKED">Blocked</option>
                </select>
              </Field>
              {form.status !== editing.status && (
                <Field label="Reason (kept in the audit log)">
                  <input type="text" className="input-control" maxLength={500} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
                </Field>
              )}
            </div>

            {formError && <Notice kind="error">{formError}</Notice>}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button type="button" onClick={() => setEditing(null)} disabled={isSaving} className="btn btn-secondary">
                Cancel
              </button>
              <button type="submit" disabled={isSaving} className="btn btn-primary">
                {isSaving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {deleting && (
        <ConfirmDialog
          title={`Delete customer ${deleting.fullName || deleting.email || deleting.phoneNumber || ''}?`}
          confirmLabel="Delete Customer"
          onConfirm={handleDelete}
          onCancel={() => setDeleting(null)}
          busy={isDeleting}
          error={deleteError}
        >
          <p>This cannot be undone. What happens depends on whether the customer has ever paid for an order:</p>
          <ul style={{ margin: '0.5rem 0 0.5rem 1.1rem' }}>
            <li>
              <strong>No paid orders:</strong> the account and everything attached to it (profile, birth profiles,
              reports, addresses, cart, wishlist, unpaid orders, bookings) is removed.
            </li>
            <li>
              <strong>One or more paid orders:</strong> the account is anonymised and kept. Every personal detail is
              removed (profile, birth profiles, reports, addresses, cart, wishlist, sign-in, notifications, contact
              details on bookings), active bookings are cancelled and their slots freed, downloads and course access are
              revoked. The row stays as &quot;Deleted User&quot; so paid orders, bookings, invoices and ledger entries
              still add up. The shipping address copied onto a paid order is kept for the invoice.
            </li>
          </ul>
          <p>Either way the account can never log in again, and the deletion is recorded in the audit log.</p>
        </ConfirmDialog>
      )}
    </div>
  );
}

export default function CustomersPage() {
  return (
    <PermissionGate permission="customers:read">
      <CustomersScreen />
    </PermissionGate>
  );
}
