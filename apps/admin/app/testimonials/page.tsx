'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../lib/auth-context';
import {
  TESTIMONIAL_TYPES,
  Testimonial,
  TestimonialInput,
  TestimonialType,
  apiErrorMessage,
  formatDate,
  isHttpUrl,
  testimonialsApi,
  changedFileSlot,
} from '../../lib/api/content';
import { UploadField, UploadedFileRef } from '../../components/uploads/UploadField';
import {
  ActiveBadge,
  Checkbox,
  ConfirmDialog,
  EmptyRow,
  Field,
  LoadError,
  Modal,
  Notice,
  ORDER_MAX,
  ORDER_MIN,
  PageHeader,
  Pager,
  PermissionGate,
  SkeletonRows,
  Thumb,
  dangerText,
  labelStyle,
  parseInteger,
  smallButton,
  useNotice,
} from '../../components/content/ui';

const PAGE_SIZE = 25;

interface TestimonialFormState {
  name: string;
  designation: string;
  message: string;
  rating: number;
  serviceName: string;
  tagline: string;
  type: TestimonialType;
  videoUrl: string;
  page: string;
  order: string;
  isActive: boolean;
  image: UploadedFileRef | null;
}

type FormErrors = Partial<Record<'name' | 'designation' | 'message' | 'serviceName' | 'tagline' | 'videoUrl' | 'page' | 'order', string>>;

function formFrom(item: Testimonial | null): TestimonialFormState {
  if (!item) {
    return {
      name: '',
      designation: '',
      message: '',
      rating: 5,
      serviceName: '',
      tagline: '',
      type: 'text',
      videoUrl: '',
      page: 'home',
      order: '0',
      isActive: true,
      image: null,
    };
  }
  return {
    name: item.name,
    designation: item.designation || '',
    message: item.message,
    rating: Math.min(5, Math.max(1, Math.round(item.rating))),
    serviceName: item.serviceName || '',
    tagline: item.tagline || '',
    type: item.type === 'video' ? 'video' : 'text',
    videoUrl: item.videoUrl || '',
    page: item.page,
    order: String(item.order),
    isActive: item.isActive,
    image: item.image,
  };
}

function validate(form: TestimonialFormState): FormErrors {
  const errors: FormErrors = {};
  const name = form.name.trim();
  const message = form.message.trim();
  if (!name) errors.name = 'The name is required.';
  else if (name.length > 150) errors.name = 'At most 150 characters.';
  if (form.designation.trim().length > 150) errors.designation = 'At most 150 characters.';
  if (!message) errors.message = 'The message is required.';
  else if (message.length > 5000) errors.message = 'At most 5000 characters.';
  if (form.serviceName.trim().length > 150) errors.serviceName = 'At most 150 characters.';
  if (form.tagline.trim().length > 300) errors.tagline = 'At most 300 characters.';
  if (form.videoUrl.trim() && !isHttpUrl(form.videoUrl)) errors.videoUrl = 'Must be a valid http(s) URL.';
  if (!form.page.trim()) errors.page = 'The page is required.';
  else if (form.page.trim().length > 100) errors.page = 'At most 100 characters.';
  if (parseInteger(form.order, ORDER_MIN, ORDER_MAX) === null) errors.order = 'Enter a whole number.';
  return errors;
}

function Stars({ rating }: { rating: number }) {
  const full = Math.min(5, Math.max(0, Math.round(rating)));
  return (
    <span aria-label={`${full} of 5`} style={{ color: 'var(--accent-gold)', letterSpacing: '1px', whiteSpace: 'nowrap' }}>
      {'★'.repeat(full)}
      <span style={{ color: 'var(--border-color)' }}>{'★'.repeat(5 - full)}</span>
    </span>
  );
}

function TestimonialFormModal({
  item,
  onClose,
  onSaved,
}: {
  item: Testimonial | null;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const [form, setForm] = useState<TestimonialFormState>(() => formFrom(item));
  const [errors, setErrors] = useState<FormErrors>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const set = <K extends keyof TestimonialFormState>(key: K, value: TestimonialFormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    const input: TestimonialInput = {
      name: form.name.trim(),
      designation: form.designation.trim() || null,
      message: form.message.trim(),
      rating: form.rating,
      serviceName: form.serviceName.trim() || null,
      tagline: form.tagline.trim() || null,
      type: form.type,
      videoUrl: form.videoUrl.trim() || null,
      page: form.page.trim(),
      order: parseInteger(form.order, ORDER_MIN, ORDER_MAX) ?? 0,
      isActive: form.isActive,
      image: changedFileSlot(form.image, item?.image),
    };

    setIsSaving(true);
    setSaveError(null);
    try {
      if (item) {
        await testimonialsApi.update(item.id, input);
        onSaved('Testimonial updated.');
      } else {
        await testimonialsApi.create(input);
        onSaved('Testimonial created.');
      }
    } catch (err) {
      setSaveError(apiErrorMessage(err, 'Could not save the testimonial.'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      title={item ? 'Edit testimonial' : 'Add testimonial'}
      onClose={isSaving ? () => undefined : onClose}
      width={720}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSaving}>
            Cancel
          </button>
          <button type="submit" form="testimonial-form" className="btn btn-primary" disabled={isSaving}>
            {isSaving ? 'Saving…' : item ? 'Save changes' : 'Create testimonial'}
          </button>
        </>
      }
    >
      <form id="testimonial-form" onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem' }}>
        {saveError && <Notice notice={{ kind: 'error', text: saveError }} />}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <Field label="Name" required error={errors.name}>
            <input type="text" className="input-control" maxLength={150} value={form.name} onChange={(e) => set('name', e.target.value)} />
          </Field>
          <Field label="Designation" error={errors.designation}>
            <input
              type="text"
              className="input-control"
              maxLength={150}
              value={form.designation}
              onChange={(e) => set('designation', e.target.value)}
            />
          </Field>
        </div>

        <Field label="Rating" required>
          <div style={{ display: 'flex', gap: '0.25rem' }}>
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                aria-label={`${star} star${star > 1 ? 's' : ''}`}
                aria-pressed={form.rating === star}
                onClick={() => set('rating', star)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '1.5rem',
                  lineHeight: 1,
                  color: star <= form.rating ? 'var(--accent-gold)' : 'var(--border-color)',
                }}
              >
                ★
              </button>
            ))}
            <span style={{ alignSelf: 'center', fontSize: '0.8rem', color: 'var(--text-secondary)', marginLeft: '0.5rem' }}>{form.rating} / 5</span>
          </div>
        </Field>

        <Field label="Message" required error={errors.message}>
          <textarea className="input-control" rows={4} maxLength={5000} value={form.message} onChange={(e) => set('message', e.target.value)} />
        </Field>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <Field label="Service name" error={errors.serviceName}>
            <input
              type="text"
              className="input-control"
              maxLength={150}
              value={form.serviceName}
              onChange={(e) => set('serviceName', e.target.value)}
            />
          </Field>
          <Field label="Tagline" error={errors.tagline}>
            <input type="text" className="input-control" maxLength={300} value={form.tagline} onChange={(e) => set('tagline', e.target.value)} />
          </Field>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem' }}>
          <Field label="Type" required>
            <select className="input-control" value={form.type} onChange={(e) => set('type', e.target.value as TestimonialType)}>
              {TESTIMONIAL_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type === 'text' ? 'Text' : 'Video'}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Video URL" error={errors.videoUrl} hint="For a video testimonial: a full http(s) link to the video.">
            <input
              type="url"
              className="input-control"
              maxLength={2048}
              placeholder="https://…"
              value={form.videoUrl}
              onChange={(e) => set('videoUrl', e.target.value)}
            />
          </Field>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
          <Field label="Page" required error={errors.page} hint="Where it is shown, e.g. home, product, about.">
            <input type="text" className="input-control" maxLength={100} value={form.page} onChange={(e) => set('page', e.target.value)} />
          </Field>
          <Field label="Order" error={errors.order} hint="Lower numbers show first.">
            <input type="number" step={1} className="input-control" value={form.order} onChange={(e) => set('order', e.target.value)} />
          </Field>
        </div>

        <UploadField label="Photo" purpose="testimonial" value={form.image} onChange={(value) => set('image', value)} disabled={isSaving} />

        <Checkbox
          label="Active"
          description="Only active testimonials are shown on the website."
          checked={form.isActive}
          onChange={(v) => set('isActive', v)}
        />
      </form>
    </Modal>
  );
}

function TestimonialsScreen() {
  const { hasPermission } = useAuth();
  const canCreate = hasPermission('testimonials:create');
  const canUpdate = hasPermission('testimonials:update');
  const canDelete = hasPermission('testimonials:delete');

  const [items, setItems] = useState<Testimonial[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  const [typeFilter, setTypeFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const [ratingFilter, setRatingFilter] = useState('');
  const [serviceInput, setServiceInput] = useState('');
  const [pageInput, setPageInput] = useState('');
  const [serviceFilter, setServiceFilter] = useState('');
  const [sitePageFilter, setSitePageFilter] = useState('');

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const { notice, showSuccess, showError, clear } = useNotice();

  const [editing, setEditing] = useState<Testimonial | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Testimonial | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  // The two text filters match exactly on the server; apply them after a pause in typing.
  useEffect(() => {
    const timer = setTimeout(() => {
      setServiceFilter(serviceInput.trim());
      setSitePageFilter(pageInput.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [serviceInput, pageInput]);

  const load = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const res = await testimonialsApi.list({
        type: typeFilter,
        isActive: activeFilter,
        rating: ratingFilter,
        serviceName: serviceFilter,
        page: sitePageFilter,
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
      });
      setItems(res.items);
      setTotal(res.total);
      // A delete on the last page can leave it empty: step back.
      if (res.items.length === 0 && res.total > 0 && page > 1) setPage(Math.max(1, Math.ceil(res.total / PAGE_SIZE)));
    } catch (err) {
      setLoadError(apiErrorMessage(err, 'Failed to load testimonials.'));
    } finally {
      setIsLoading(false);
    }
  }, [typeFilter, activeFilter, ratingFilter, serviceFilter, sitePageFilter, page]);

  useEffect(() => {
    load();
  }, [load]);

  const handleToggle = async (item: Testimonial) => {
    setBusyId(item.id);
    try {
      const updated = await testimonialsApi.toggle(item.id);
      showSuccess(`Testimonial ${updated.isActive ? 'activated' : 'deactivated'}.`);
      await load();
    } catch (err) {
      showError(apiErrorMessage(err, 'Could not change the testimonial status.'));
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setBusyId(deleting.id);
    setDeleteError(null);
    try {
      await testimonialsApi.remove(deleting.id);
      setDeleting(null);
      showSuccess('Testimonial deleted.');
      await load();
    } catch (err) {
      setDeleteError(apiErrorMessage(err, 'Could not delete the testimonial.'));
    } finally {
      setBusyId(null);
    }
  };

  const columns = 9;

  return (
    <div>
      <PageHeader
        crumbs={[{ label: 'Testimonials' }]}
        title="Testimonials"
        subtitle="Customer testimonials shown on the website, active and inactive"
        actions={
          <>
            <button type="button" className="btn btn-secondary" style={{ fontSize: '0.85rem' }} onClick={load}>
              🔄 Refresh
            </button>
            {canCreate && (
              <button type="button" className="btn btn-primary" onClick={() => setEditing('new')}>
                + Add testimonial
              </button>
            )}
          </>
        }
      />

      <Notice notice={notice} onClose={clear} />
      {loadError && <LoadError message={loadError} onRetry={load} />}

      <div className="card" style={{ marginBottom: '1.5rem', padding: '1.25rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem' }}>
          <div>
            <label style={labelStyle}>Status</label>
            <select
              className="input-control"
              value={activeFilter}
              onChange={(e) => {
                setActiveFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Active and inactive</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Type</label>
            <select
              className="input-control"
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All types</option>
              <option value="text">Text</option>
              <option value="video">Video</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Minimum rating</label>
            <select
              className="input-control"
              value={ratingFilter}
              onChange={(e) => {
                setRatingFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Any rating</option>
              {[5, 4, 3, 2].map((r) => (
                <option key={r} value={r}>
                  {r}
                  {r < 5 ? ' and above' : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Service name (exact)</label>
            <input type="text" className="input-control" maxLength={150} value={serviceInput} onChange={(e) => setServiceInput(e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Page (exact)</label>
            <input
              type="text"
              className="input-control"
              maxLength={100}
              placeholder="e.g. home"
              value={pageInput}
              onChange={(e) => setPageInput(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="card">
        <div className="table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Photo</th>
                <th>Name</th>
                <th>Rating</th>
                <th>Message</th>
                <th>Type</th>
                <th>Page / Order</th>
                <th>Status</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <SkeletonRows columns={columns} />
              ) : items.length === 0 ? (
                <EmptyRow columns={columns}>{loadError ? 'Testimonials could not be loaded.' : 'No testimonials match these filters.'}</EmptyRow>
              ) : (
                items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <Thumb url={item.image?.url} alt={item.name} size={40} />
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{item.name}</div>
                      {item.designation && <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{item.designation}</div>}
                      {item.serviceName && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.serviceName}</div>}
                    </td>
                    <td>
                      <Stars rating={item.rating} />
                    </td>
                    <td style={{ maxWidth: '320px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {item.message.length > 140 ? `${item.message.slice(0, 140)}…` : item.message}
                    </td>
                    <td>
                      <span className="badge badge-info">{item.type}</span>
                      {item.videoUrl && (
                        <div>
                          <a href={item.videoUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.75rem' }}>
                            Video
                          </a>
                        </div>
                      )}
                    </td>
                    <td>
                      {item.page} <span style={{ color: 'var(--text-muted)' }}>· {item.order}</span>
                    </td>
                    <td>
                      <ActiveBadge active={item.isActive} />
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{formatDate(item.createdAt)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                        {canUpdate && (
                          <>
                            <button type="button" className="btn btn-secondary" style={smallButton} onClick={() => setEditing(item)}>
                              Edit
                            </button>
                            <button
                              type="button"
                              className="btn btn-secondary"
                              style={smallButton}
                              disabled={busyId === item.id}
                              onClick={() => handleToggle(item)}
                            >
                              {item.isActive ? 'Deactivate' : 'Activate'}
                            </button>
                          </>
                        )}
                        {canDelete && (
                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ ...smallButton, ...dangerText }}
                            onClick={() => {
                              setDeleteError(null);
                              setDeleting(item);
                            }}
                          >
                            Delete
                          </button>
                        )}
                        {!canUpdate && !canDelete && <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>View only</span>}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pager
          page={page}
          totalPages={Math.ceil(total / PAGE_SIZE)}
          total={total}
          noun="testimonials"
          disabled={isLoading}
          onPage={setPage}
        />
      </div>

      {editing && (
        <TestimonialFormModal
          item={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={(message) => {
            setEditing(null);
            showSuccess(message);
            load();
          }}
        />
      )}

      {deleting && (
        <ConfirmDialog
          title="Delete testimonial"
          message={
            <>
              Delete the testimonial of <strong>{deleting.name}</strong>? Its photo is removed from storage. This cannot be undone.
            </>
          }
          busy={busyId === deleting.id}
          error={deleteError}
          onConfirm={handleDelete}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  );
}

export default function TestimonialsPage() {
  return (
    <PermissionGate permission="testimonials:read" area="Testimonials">
      <TestimonialsScreen />
    </PermissionGate>
  );
}
