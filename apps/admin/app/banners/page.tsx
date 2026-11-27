'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../lib/auth-context';
import {
  BANNER_PAGES,
  BANNER_TYPES,
  Banner,
  BannerButton,
  BannerInput,
  BannerPage,
  BannerType,
  apiErrorMessage,
  bannersApi,
  isSafeLink,
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
  PermissionGate,
  SkeletonRows,
  Thumb,
  dangerText,
  labelStyle,
  parseInteger,
  smallButton,
  useNotice,
} from '../../components/content/ui';

interface BannerFormState {
  type: BannerType | '';
  page: BannerPage;
  title: string;
  subtitle: string;
  description: string;
  buttons: BannerButton[];
  order: string;
  isActive: boolean;
  image: UploadedFileRef | null;
}

type FormErrors = Partial<Record<'type' | 'title' | 'subtitle' | 'description' | 'order' | 'buttons', string>>;

const MAX_BUTTONS = 6;

function emptyForm(): BannerFormState {
  return { type: '', page: 'Homepage', title: '', subtitle: '', description: '', buttons: [], order: '0', isActive: true, image: null };
}

function formFromBanner(banner: Banner): BannerFormState {
  return {
    type: (BANNER_TYPES as readonly string[]).includes(banner.type) ? (banner.type as BannerType) : '',
    page: (BANNER_PAGES as readonly string[]).includes(banner.page) ? (banner.page as BannerPage) : 'Homepage',
    title: banner.title || '',
    subtitle: banner.subtitle || '',
    description: banner.description || '',
    buttons: banner.buttons.map((b) => ({ text: b.text, link: b.link })),
    order: String(banner.order),
    isActive: banner.isActive,
    image: banner.image,
  };
}

function validate(form: BannerFormState): FormErrors {
  const errors: FormErrors = {};
  if (!form.type) errors.type = 'Please select a banner type.';
  if (form.title.trim().length > 300) errors.title = 'At most 300 characters.';
  if (form.subtitle.trim().length > 300) errors.subtitle = 'At most 300 characters.';
  if (form.description.trim().length > 2000) errors.description = 'At most 2000 characters.';
  if (parseInteger(form.order, ORDER_MIN, ORDER_MAX) === null) errors.order = 'Enter a whole number.';
  for (const button of form.buttons) {
    if (!button.text.trim()) {
      errors.buttons = 'Every button needs a text.';
      break;
    }
    if (button.text.trim().length > 100) {
      errors.buttons = 'Button text: at most 100 characters.';
      break;
    }
    if (!isSafeLink(button.link)) {
      errors.buttons = 'Every button link must be an http(s) URL or a path starting with "/".';
      break;
    }
  }
  return errors;
}

function BannerFormModal({
  banner,
  onClose,
  onSaved,
}: {
  banner: Banner | null;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const [form, setForm] = useState<BannerFormState>(() => (banner ? formFromBanner(banner) : emptyForm()));
  const [errors, setErrors] = useState<FormErrors>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const set = <K extends keyof BannerFormState>(key: K, value: BannerFormState[K]) => setForm((prev) => ({ ...prev, [key]: value }));

  const setButton = (index: number, patch: Partial<BannerButton>) =>
    set(
      'buttons',
      form.buttons.map((b, i) => (i === index ? { ...b, ...patch } : b))
    );

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length > 0 || !form.type) return;

    const input: BannerInput = {
      type: form.type,
      page: form.page,
      title: form.title.trim() || null,
      subtitle: form.subtitle.trim() || null,
      description: form.description.trim() || null,
      buttons: form.buttons.map((b) => ({ text: b.text.trim(), link: b.link.trim() })),
      order: parseInteger(form.order, ORDER_MIN, ORDER_MAX) ?? 0,
      isActive: form.isActive,
      image: changedFileSlot(form.image, banner?.image),
    };

    setIsSaving(true);
    setSaveError(null);
    try {
      if (banner) {
        await bannersApi.update(banner.id, input);
        onSaved('Banner updated.');
      } else {
        await bannersApi.create(input);
        onSaved('Banner created.');
      }
    } catch (err) {
      setSaveError(apiErrorMessage(err, 'Could not save the banner.'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      title={banner ? 'Edit banner' : 'Add banner'}
      onClose={isSaving ? () => undefined : onClose}
      width={720}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSaving}>
            Cancel
          </button>
          <button type="submit" form="banner-form" className="btn btn-primary" disabled={isSaving}>
            {isSaving ? 'Saving…' : banner ? 'Save changes' : 'Create banner'}
          </button>
        </>
      }
    >
      <form id="banner-form" onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem' }}>
        {saveError && <Notice notice={{ kind: 'error', text: saveError }} />}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
          <Field label="Type" required error={errors.type} hint="Slider: homepage carousel. Page: the header banner of a page.">
            <select className="input-control" value={form.type} onChange={(e) => set('type', e.target.value as BannerType | '')}>
              <option value="">Select…</option>
              {BANNER_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Page" required>
            <select className="input-control" value={form.page} onChange={(e) => set('page', e.target.value as BannerPage)}>
              {BANNER_PAGES.map((page) => (
                <option key={page} value={page}>
                  {page}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Order" error={errors.order} hint="Lower numbers show first.">
            <input type="number" step={1} className="input-control" value={form.order} onChange={(e) => set('order', e.target.value)} />
          </Field>
        </div>

        <Field label="Title" error={errors.title}>
          <input type="text" className="input-control" maxLength={300} value={form.title} onChange={(e) => set('title', e.target.value)} />
        </Field>
        <Field label="Subtitle" error={errors.subtitle}>
          <input type="text" className="input-control" maxLength={300} value={form.subtitle} onChange={(e) => set('subtitle', e.target.value)} />
        </Field>
        <Field label="Description" error={errors.description}>
          <textarea
            className="input-control"
            rows={3}
            maxLength={2000}
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
          />
        </Field>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={labelStyle}>Buttons (up to {MAX_BUTTONS})</span>
            <button
              type="button"
              className="btn btn-secondary"
              style={smallButton}
              disabled={form.buttons.length >= MAX_BUTTONS}
              onClick={() => set('buttons', [...form.buttons, { text: '', link: '' }])}
            >
              + Add button
            </button>
          </div>
          {form.buttons.length === 0 && <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No buttons.</p>}
          {form.buttons.map((button, index) => (
            <div key={index} style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr auto', gap: '0.5rem', marginTop: '0.5rem' }}>
              <input
                type="text"
                className="input-control"
                placeholder="Button text"
                maxLength={100}
                value={button.text}
                onChange={(e) => setButton(index, { text: e.target.value })}
              />
              <input
                type="text"
                className="input-control"
                placeholder="/services or https://…"
                maxLength={2048}
                value={button.link}
                onChange={(e) => setButton(index, { link: e.target.value })}
              />
              <button
                type="button"
                className="btn btn-secondary"
                style={{ ...smallButton, ...dangerText }}
                onClick={() =>
                  set(
                    'buttons',
                    form.buttons.filter((_, i) => i !== index)
                  )
                }
              >
                Remove
              </button>
            </div>
          ))}
          {errors.buttons && (
            <p role="alert" style={{ fontSize: '0.75rem', fontWeight: 600, marginTop: '0.35rem', ...dangerText }}>
              {errors.buttons}
            </p>
          )}
        </div>

        <UploadField
          label="Banner image"
          purpose="banner"
          value={form.image}
          onChange={(value) => set('image', value)}
          hint="Recommended 665 × 665 px."
          disabled={isSaving}
        />

        <Checkbox label="Active" description="Only active banners are shown on the website." checked={form.isActive} onChange={(v) => set('isActive', v)} />
      </form>
    </Modal>
  );
}

function BannersScreen() {
  const { hasPermission } = useAuth();
  const canCreate = hasPermission('banners:create');
  const canUpdate = hasPermission('banners:update');
  const canDelete = hasPermission('banners:delete');

  const [banners, setBanners] = useState<Banner[]>([]);
  const [typeFilter, setTypeFilter] = useState('');
  const [pageFilter, setPageFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const { notice, showSuccess, showError, clear } = useNotice();

  const [editing, setEditing] = useState<Banner | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Banner | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      setBanners(await bannersApi.list({ type: typeFilter, page: pageFilter, isActive: activeFilter }));
    } catch (err) {
      setLoadError(apiErrorMessage(err, 'Failed to load banners.'));
    } finally {
      setIsLoading(false);
    }
  }, [typeFilter, pageFilter, activeFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const handleToggle = async (banner: Banner) => {
    setBusyId(banner.id);
    try {
      const updated = await bannersApi.toggle(banner.id);
      showSuccess(`Banner ${updated.isActive ? 'activated' : 'deactivated'}.`);
      await load();
    } catch (err) {
      showError(apiErrorMessage(err, 'Could not change the banner status.'));
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setBusyId(deleting.id);
    setDeleteError(null);
    try {
      await bannersApi.remove(deleting.id);
      setDeleting(null);
      showSuccess('Banner deleted.');
      await load();
    } catch (err) {
      setDeleteError(apiErrorMessage(err, 'Could not delete the banner.'));
    } finally {
      setBusyId(null);
    }
  };

  const columns = 8;

  return (
    <div>
      <PageHeader
        crumbs={[{ label: 'Banners' }]}
        title="Banners"
        subtitle="Homepage slider and page header banners of the website"
        actions={
          <>
            <button type="button" className="btn btn-secondary" style={{ fontSize: '0.85rem' }} onClick={load}>
              Refresh
            </button>
            {canCreate && (
              <button type="button" className="btn btn-primary" onClick={() => setEditing('new')}>
                + Add banner
              </button>
            )}
          </>
        }
      />

      <Notice notice={notice} onClose={clear} />
      {loadError && <LoadError message={loadError} onRetry={load} />}

      <div className="card" style={{ marginBottom: '1.5rem', padding: '1.25rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
          <div>
            <label style={labelStyle}>Type</label>
            <select className="input-control" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="">All types</option>
              {BANNER_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Page</label>
            <select className="input-control" value={pageFilter} onChange={(e) => setPageFilter(e.target.value)}>
              <option value="">All pages</option>
              {BANNER_PAGES.map((page) => (
                <option key={page} value={page}>
                  {page}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Status</label>
            <select className="input-control" value={activeFilter} onChange={(e) => setActiveFilter(e.target.value)}>
              <option value="">Active and inactive</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Image</th>
                <th>Title</th>
                <th>Type</th>
                <th>Page</th>
                <th>Order</th>
                <th>Buttons</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <SkeletonRows columns={columns} />
              ) : banners.length === 0 ? (
                <EmptyRow columns={columns}>{loadError ? 'Banners could not be loaded.' : 'No banners match these filters.'}</EmptyRow>
              ) : (
                banners.map((banner) => (
                  <tr key={banner.id}>
                    <td>
                      <Thumb url={banner.image?.url} alt={banner.title || 'Banner'} />
                    </td>
                    <td style={{ maxWidth: '320px' }}>
                      <div style={{ fontWeight: 600 }}>{banner.title || <span style={{ color: 'var(--text-muted)' }}>Untitled</span>}</div>
                      {banner.subtitle && <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{banner.subtitle}</div>}
                    </td>
                    <td>
                      <span className="badge badge-info">{banner.type}</span>
                    </td>
                    <td>{banner.page}</td>
                    <td>{banner.order}</td>
                    <td>{banner.buttons.length}</td>
                    <td>
                      <ActiveBadge active={banner.isActive} />
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                        {canUpdate && (
                          <>
                            <button type="button" className="btn btn-secondary" style={smallButton} onClick={() => setEditing(banner)}>
                              Edit
                            </button>
                            <button
                              type="button"
                              className="btn btn-secondary"
                              style={smallButton}
                              disabled={busyId === banner.id}
                              onClick={() => handleToggle(banner)}
                            >
                              {banner.isActive ? 'Deactivate' : 'Activate'}
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
                              setDeleting(banner);
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
        {!isLoading && banners.length > 0 && (
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.75rem' }}>{banners.length} banner(s)</p>
        )}
      </div>

      {editing && (
        <BannerFormModal
          banner={editing === 'new' ? null : editing}
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
          title="Delete banner"
          message={
            <>
              Delete the banner <strong>{deleting.title || 'Untitled'}</strong>? Its image is removed from storage. This cannot be undone.
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

export default function BannersPage() {
  return (
    <PermissionGate permission="banners:read" area="Banners">
      <BannersScreen />
    </PermissionGate>
  );
}
