'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../lib/auth-context';
import {
  Coupon,
  CouponAudience,
  CouponDiscountType,
  CouponInput,
  createCoupon,
  deleteCoupon,
  errorMessage,
  istDayEnd,
  istDayStart,
  listCoupons,
  toggleCoupon,
  updateCoupon,
} from '../../lib/api/sales';
import { formatDate, formatPaise, paiseToRupeeInput, rupeeInputToPaise } from '../../components/sales/format';
import { CustomerSearch } from '../../components/sales/CustomerSearch';
import {
  ConfirmDialog,
  EmptyRow,
  ErrorBanner,
  Field,
  Modal,
  PageHeader,
  Pagination,
  RequirePermission,
  SkeletonRows,
  smallButton,
  SuccessBanner,
  tinyButton,
  dangerButton,
  useDebounced,
} from '../../components/sales/ui';

const PAGE_SIZE = 20;

/** A stored instant as the Indian calendar day it falls on (YYYY-MM-DD), for a date input. */
function toIstDay(value: string | null | undefined): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

interface FormState {
  code: string;
  description: string;
  type: CouponDiscountType;
  discount: string;
  maxDiscount: string;
  minOrder: string;
  usageLimit: string;
  validFrom: string;
  validTill: string;
  couponType: CouponAudience;
  assignedUsers: Array<{ id: string; label: string }>;
  oneTimePerUser: boolean;
  isActive: boolean;
}

function emptyForm(): FormState {
  return {
    code: '',
    description: '',
    type: 'PERCENTAGE',
    discount: '',
    maxDiscount: '',
    minOrder: '',
    usageLimit: '',
    validFrom: '',
    validTill: '',
    couponType: 'GLOBAL',
    assignedUsers: [],
    oneTimePerUser: false,
    isActive: true,
  };
}

function formFromCoupon(coupon: Coupon): FormState {
  return {
    code: coupon.code,
    description: coupon.description || '',
    type: coupon.type,
    discount: coupon.type === 'PERCENTAGE' ? String(coupon.discount) : paiseToRupeeInput(coupon.discount),
    maxDiscount: paiseToRupeeInput(coupon.maxDiscountPaise),
    minOrder: coupon.minOrderPaise ? paiseToRupeeInput(coupon.minOrderPaise) : '',
    usageLimit: coupon.usageLimit === null ? '' : String(coupon.usageLimit),
    validFrom: toIstDay(coupon.validFrom),
    validTill: toIstDay(coupon.validTill),
    couponType: coupon.couponType,
    assignedUsers: coupon.assignedUsers.map((u) => ({ id: u.id, label: u.fullName || u.email || u.id })),
    oneTimePerUser: coupon.oneTimePerUser,
    isActive: coupon.isActive,
  };
}

type FormErrors = Partial<Record<keyof FormState, string>>;

/** Checks the form against the backend's coupon schema and builds the request body. */
function validate(form: FormState): { errors: FormErrors; body: CouponInput | null } {
  const errors: FormErrors = {};
  const code = form.code.trim().toUpperCase();
  if (code.length < 3 || code.length > 20) errors.code = 'The code must be 3 to 20 characters';

  let discount = 0;
  if (form.type === 'PERCENTAGE') {
    const percent = Number(form.discount);
    if (!form.discount.trim() || !Number.isFinite(percent) || percent <= 0 || percent > 100) errors.discount = 'Enter a percentage above 0 and up to 100';
    else if (!/^\d+(\.\d{1,2})?$/.test(form.discount.trim())) errors.discount = 'At most two decimal places';
    discount = percent;
  } else {
    const paise = rupeeInputToPaise(form.discount);
    if (paise === null || paise <= 0) errors.discount = 'Enter an amount in rupees above 0';
    discount = paise ?? 0;
  }

  let maxDiscountPaise: number | null = null;
  if (form.type === 'PERCENTAGE' && form.maxDiscount.trim()) {
    const paise = rupeeInputToPaise(form.maxDiscount);
    if (paise === null || paise <= 0) errors.maxDiscount = 'Enter an amount above 0, or leave blank for no cap';
    else maxDiscountPaise = paise;
  }

  let minOrderPaise = 0;
  if (form.minOrder.trim()) {
    const paise = rupeeInputToPaise(form.minOrder);
    if (paise === null) errors.minOrder = 'Enter an amount in rupees, or leave blank';
    else minOrderPaise = paise;
  }

  let usageLimit: number | null = null;
  if (form.usageLimit.trim()) {
    if (!/^\d+$/.test(form.usageLimit.trim()) || Number(form.usageLimit) < 1) errors.usageLimit = 'A whole number of 1 or more, or blank for unlimited';
    else usageLimit = Number(form.usageLimit);
  }

  if (!form.validTill) errors.validTill = 'Choose the last day the coupon is valid';
  if (form.validFrom && form.validTill && form.validFrom > form.validTill) errors.validTill = 'Valid till must not be before valid from';

  if (form.description.length > 1000) errors.description = 'At most 1000 characters';
  if (form.couponType === 'INDIVIDUAL' && form.assignedUsers.length === 0) errors.assignedUsers = 'Select at least one customer for a selected-customers coupon';

  if (Object.keys(errors).length > 0) return { errors, body: null };
  return {
    errors,
    body: {
      code,
      description: form.description.trim() || null,
      type: form.type,
      discount,
      maxDiscountPaise: form.type === 'PERCENTAGE' ? maxDiscountPaise : null,
      minOrderPaise,
      usageLimit,
      ...(form.validFrom ? { validFrom: istDayStart(form.validFrom) } : {}),
      validTill: istDayEnd(form.validTill),
      couponType: form.couponType,
      assignedUsers: form.couponType === 'INDIVIDUAL' ? form.assignedUsers.map((u) => u.id) : [],
      oneTimePerUser: form.oneTimePerUser,
      isActive: form.isActive,
    },
  };
}

function CouponFormModal({ coupon, onClose, onSaved }: { coupon: Coupon | null; onClose: () => void; onSaved: (message: string) => void }) {
  const [form, setForm] = useState<FormState>(() => (coupon ? formFromCoupon(coupon) : emptyForm()));
  const [errors, setErrors] = useState<FormErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));

  const save = async () => {
    const result = validate(form);
    setErrors(result.errors);
    if (!result.body) return;
    setIsSaving(true);
    setServerError(null);
    try {
      if (coupon) {
        await updateCoupon(coupon.id, result.body);
        onSaved(`Coupon ${result.body.code} updated.`);
      } else {
        await createCoupon(result.body);
        onSaved(`Coupon ${result.body.code} created.`);
      }
    } catch (err) {
      setServerError(errorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      title={coupon ? `Edit coupon ${coupon.code}` : 'New coupon'}
      onClose={onClose}
      width={720}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSaving}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={save} disabled={isSaving}>
            {isSaving ? 'Saving…' : coupon ? 'Save changes' : 'Create coupon'}
          </button>
        </>
      }
    >
      <ErrorBanner message={serverError} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '1rem' }}>
        <Field label="Coupon code *" error={errors.code} hint="Saved in capital letters. Applies to product carts.">
          <input className="input-control" style={{ textTransform: 'uppercase' }} maxLength={20} placeholder="SAVE200" value={form.code} onChange={(e) => set('code', e.target.value)} />
        </Field>
        <Field label="Discount type *">
          <select className="input-control" value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as CouponDiscountType, discount: '', maxDiscount: '' }))}>
            <option value="PERCENTAGE">Percentage (%)</option>
            <option value="FLAT">Flat (₹)</option>
          </select>
        </Field>
        <Field label={form.type === 'PERCENTAGE' ? 'Discount (%) *' : 'Discount (₹) *'} error={errors.discount}>
          <input className="input-control" inputMode="decimal" value={form.discount} onChange={(e) => set('discount', e.target.value)} placeholder={form.type === 'PERCENTAGE' ? '10' : '200'} />
        </Field>
        {form.type === 'PERCENTAGE' ? (
          <Field label="Max discount (₹)" error={errors.maxDiscount} hint="Blank = no cap">
            <input className="input-control" inputMode="decimal" value={form.maxDiscount} onChange={(e) => set('maxDiscount', e.target.value)} />
          </Field>
        ) : (
          <div />
        )}
        <Field label="Min order (₹)" error={errors.minOrder} hint="Blank = no minimum">
          <input className="input-control" inputMode="decimal" value={form.minOrder} onChange={(e) => set('minOrder', e.target.value)} />
        </Field>
        <Field label="Usage limit" error={errors.usageLimit} hint="Blank = unlimited">
          <input className="input-control" inputMode="numeric" value={form.usageLimit} onChange={(e) => set('usageLimit', e.target.value)} />
        </Field>
        <Field label="Valid from" hint={coupon ? 'Indian date' : 'Blank = from now'}>
          <input type="date" className="input-control" value={form.validFrom} onChange={(e) => set('validFrom', e.target.value)} />
        </Field>
        <Field label="Valid till *" error={errors.validTill} hint="Valid until the end of this day, Indian time">
          <input type="date" className="input-control" value={form.validTill} min={form.validFrom || undefined} onChange={(e) => set('validTill', e.target.value)} />
        </Field>
        <Field label="Who can use it *">
          <select className="input-control" value={form.couponType} onChange={(e) => set('couponType', e.target.value as CouponAudience)}>
            <option value="GLOBAL">Everyone (global)</option>
            <option value="INDIVIDUAL">Selected customers only</option>
          </select>
        </Field>
        <div style={{ display: 'grid', gap: '0.5rem', alignContent: 'center' }}>
          <label style={{ display: 'flex', gap: '0.5rem', fontSize: '0.85rem' }}>
            <input type="checkbox" checked={form.oneTimePerUser} onChange={(e) => set('oneTimePerUser', e.target.checked)} />
            One-time per customer
          </label>
          <label style={{ display: 'flex', gap: '0.5rem', fontSize: '0.85rem' }}>
            <input type="checkbox" checked={form.isActive} onChange={(e) => set('isActive', e.target.checked)} />
            Active
          </label>
        </div>

        {form.couponType === 'INDIVIDUAL' && (
          <Field label={`Selected customers (${form.assignedUsers.length})`} error={errors.assignedUsers} span={2}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.5rem' }}>
              {form.assignedUsers.map((u) => (
                <span key={u.id} className="badge badge-info" style={{ textTransform: 'none' }}>
                  {u.label}{' '}
                  <button
                    type="button"
                    aria-label={`Remove ${u.label}`}
                    onClick={() => set('assignedUsers', form.assignedUsers.filter((x) => x.id !== u.id))}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontWeight: 700 }}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <CustomerSearch
              pickLabel="Add"
              excludeIds={form.assignedUsers.map((u) => u.id)}
              onPick={(c) => set('assignedUsers', [...form.assignedUsers, { id: c.id, label: c.fullName || c.email || c.phoneNumber || c.id }])}
            />
          </Field>
        )}

        <Field label="Description" error={errors.description} span={2}>
          <textarea className="input-control" rows={3} maxLength={1000} value={form.description} onChange={(e) => set('description', e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}

function CouponsScreen() {
  const { hasPermission } = useAuth();
  const canCreate = hasPermission('coupons:create');
  const canUpdate = hasPermission('coupons:update');
  const canDelete = hasPermission('coupons:delete');

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounced(search, 400);
  const [page, setPage] = useState(1);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Coupon | null>(null);
  const [toDelete, setToDelete] = useState<Coupon | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    const updateCurrentTime = () => setCurrentTime(Date.now());
    updateCurrentTime();
    const interval = window.setInterval(updateCurrentTime, 60_000);
    return () => window.clearInterval(interval);
  }, []);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await listCoupons(debouncedSearch, page, PAGE_SIZE);
      setCoupons(result.coupons);
      setTotal(result.pagination.total);
      setTotalPages(result.pagination.totalPages);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch, page]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const toggle = async (coupon: Coupon) => {
    setTogglingId(coupon.id);
    setError(null);
    try {
      const result = await toggleCoupon(coupon.id);
      setNotice(`Coupon ${coupon.code} ${result.isActive ? 'enabled' : 'disabled'}.`);
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setTogglingId(null);
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const result = await deleteCoupon(toDelete.id);
      setNotice(
        result.deleted
          ? `Coupon ${toDelete.code} deleted.`
          : `Coupon ${toDelete.code} has been used on orders, so it was switched off instead of deleted (its uses stay in the order history).`
      );
      setToDelete(null);
      await load();
    } catch (err) {
      setDeleteError(errorMessage(err));
    } finally {
      setIsDeleting(false);
    }
  };

  const columns = canUpdate || canDelete ? 9 : 8;

  return (
    <div>
      <PageHeader
        crumbs={[{ label: 'Coupons' }]}
        title="Coupons"
        subtitle={`Manage discount codes & promotions · ${total} coupon${total === 1 ? '' : 's'}`}
        actions={
          <>
            {canCreate && (
              <button
                type="button"
                className="btn btn-primary"
                style={smallButton}
                onClick={() => {
                  setEditing(null);
                  setFormOpen(true);
                }}
              >
                + New coupon
              </button>
            )}
            <button type="button" className="btn btn-secondary" style={smallButton} onClick={load}>
              Refresh
            </button>
          </>
        }
      />

      <ErrorBanner message={error} />
      <SuccessBanner message={notice} onClose={() => setNotice(null)} />

      <div className="card" style={{ marginBottom: '1.5rem', padding: '1.25rem' }}>
        <Field label="Search by code">
          <input type="text" className="input-control" placeholder="Search by code…" maxLength={50} value={search} onChange={(e) => setSearch(e.target.value)} />
        </Field>
      </div>

      <div className="card">
        <div className="table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Type</th>
                <th>Discount</th>
                <th>Min order</th>
                <th>Who can use it</th>
                <th>Validity</th>
                <th>Usage</th>
                <th>Status</th>
                {columns === 9 && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <SkeletonRows columns={columns} />
              ) : coupons.length > 0 ? (
                coupons.map((coupon) => {
                  const expired = currentTime !== null && new Date(coupon.validTill).getTime() < currentTime;
                  return (
                    <tr key={coupon.id}>
                      <td>
                        <div style={{ fontFamily: 'monospace', fontWeight: 700 }}>
                          {coupon.code}{' '}
                          {coupon.oneTimePerUser && (
                            <span className="badge badge-info" title="One-time per customer">
                              1×
                            </span>
                          )}
                        </div>
                        {coupon.description && <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', maxWidth: 260 }}>{coupon.description}</div>}
                      </td>
                      <td style={{ fontSize: '0.8rem' }}>{coupon.type === 'PERCENTAGE' ? 'Percentage' : 'Flat'}</td>
                      <td style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                        {coupon.type === 'PERCENTAGE' ? `${coupon.discount}%` : formatPaise(coupon.discount)}
                        {coupon.maxDiscountPaise !== null && <div style={{ color: 'var(--text-secondary)', fontSize: '0.72rem', fontWeight: 400 }}>max {formatPaise(coupon.maxDiscountPaise)}</div>}
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>{coupon.minOrderPaise ? formatPaise(coupon.minOrderPaise) : '—'}</td>
                      <td style={{ fontSize: '0.8rem' }}>
                        {coupon.couponType === 'GLOBAL' ? (
                          <span className="badge badge-info">Everyone</span>
                        ) : (
                          <span className="badge badge-warning" title={coupon.assignedUsers.map((u) => u.fullName || u.email || u.id).join(', ')}>
                            {coupon.assignedUsers.length} selected
                          </span>
                        )}
                      </td>
                      <td style={{ fontSize: '0.8rem' }}>
                        {formatDate(coupon.validFrom)} – {formatDate(coupon.validTill)}
                        {expired && <div style={{ color: 'var(--badge-danger-text)', fontSize: '0.72rem' }}>Expired</div>}
                      </td>
                      <td style={{ fontSize: '0.8rem' }}>
                        {coupon.usedCount} / {coupon.usageLimit ?? '∞'} used
                      </td>
                      <td>
                        {canUpdate ? (
                          <button
                            type="button"
                            className={`badge ${coupon.isActive ? 'badge-success' : 'badge-danger'}`}
                            style={{ border: 'none', cursor: 'pointer' }}
                            title={coupon.isActive ? 'Click to disable' : 'Click to enable'}
                            disabled={togglingId === coupon.id}
                            onClick={() => toggle(coupon)}
                          >
                            {togglingId === coupon.id ? '…' : coupon.isActive ? 'Active' : 'Inactive'}
                          </button>
                        ) : (
                          <span className={`badge ${coupon.isActive ? 'badge-success' : 'badge-danger'}`}>{coupon.isActive ? 'Active' : 'Inactive'}</span>
                        )}
                      </td>
                      {columns === 9 && (
                        <td>
                          <div style={{ display: 'flex', gap: '0.4rem' }}>
                            {canUpdate && (
                              <button
                                type="button"
                                className="btn btn-secondary"
                                style={tinyButton}
                                onClick={() => {
                                  setEditing(coupon);
                                  setFormOpen(true);
                                }}
                              >
                                Edit
                              </button>
                            )}
                            {canDelete && (
                              <button
                                type="button"
                                className="btn btn-secondary"
                                style={{ ...tinyButton, ...dangerButton }}
                                onClick={() => {
                                  setDeleteError(null);
                                  setToDelete(coupon);
                                }}
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              ) : (
                <EmptyRow columns={columns}>{debouncedSearch ? 'No coupons match this code.' : 'No coupons yet.'}</EmptyRow>
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={page} totalPages={totalPages} total={total} noun="coupons" disabled={isLoading} onChange={setPage} />
      </div>

      {formOpen && (
        <CouponFormModal
          coupon={editing}
          onClose={() => setFormOpen(false)}
          onSaved={(message) => {
            setFormOpen(false);
            setNotice(message);
            load();
          }}
        />
      )}

      {toDelete && (
        <ConfirmDialog
          title="Delete coupon?"
          confirmLabel="Delete coupon"
          danger
          busy={isDeleting}
          error={deleteError}
          onConfirm={confirmDelete}
          onCancel={() => setToDelete(null)}
        >
          Coupon <strong>{toDelete.code}</strong> will be deleted. This cannot be undone. If the coupon has already been used on an order it is switched off instead, so
          the order history stays intact.
        </ConfirmDialog>
      )}
    </div>
  );
}

export default function CouponsPage() {
  return (
    <RequirePermission permission="coupons:read">
      <CouponsScreen />
    </RequirePermission>
  );
}
