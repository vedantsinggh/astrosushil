'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../lib/auth-context';
import { SeoInput, SeoPage, apiErrorMessage, changedFileSlot, formatDate, seoApi } from '../../lib/api/content';
import { UploadField, UploadedFileRef } from '../../components/uploads/UploadField';
import {
  ConfirmDialog,
  EmptyRow,
  Field,
  LoadError,
  Modal,
  Notice,
  PageHeader,
  PermissionGate,
  SkeletonRows,
  Thumb,
  dangerText,
  labelStyle,
  smallButton,
  useNotice,
} from '../../components/content/ui';

interface SeoFormState {
  name: string;
  metaTitle: string;
  metaDescription: string;
  image: UploadedFileRef | null;
}

type FormErrors = Partial<Record<'name' | 'metaTitle' | 'metaDescription', string>>;

function validate(form: SeoFormState): FormErrors {
  const errors: FormErrors = {};
  const name = form.name.trim();
  const title = form.metaTitle.trim();
  const description = form.metaDescription.trim();
  if (!name) errors.name = 'The page name is required.';
  else if (name.length > 150) errors.name = 'At most 150 characters.';
  if (!title) errors.metaTitle = 'The meta title is required.';
  else if (title.length > 300) errors.metaTitle = 'At most 300 characters.';
  if (!description) errors.metaDescription = 'The meta description is required.';
  else if (description.length > 1000) errors.metaDescription = 'At most 1000 characters.';
  return errors;
}

function SeoFormModal({ seo, onClose, onSaved }: { seo: SeoPage | null; onClose: () => void; onSaved: (message: string) => void }) {
  const [form, setForm] = useState<SeoFormState>(() =>
    seo
      ? { name: seo.name, metaTitle: seo.metaTitle, metaDescription: seo.metaDescription, image: seo.image }
      : { name: '', metaTitle: '', metaDescription: '', image: null }
  );
  const [errors, setErrors] = useState<FormErrors>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const set = <K extends keyof SeoFormState>(key: K, value: SeoFormState[K]) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    const input: SeoInput = {
      name: form.name.trim().toLowerCase(),
      metaTitle: form.metaTitle.trim(),
      metaDescription: form.metaDescription.trim(),
      image: changedFileSlot(form.image, seo?.image),
    };

    setIsSaving(true);
    setSaveError(null);
    try {
      if (seo) {
        await seoApi.update(seo.id, input);
        onSaved('SEO entry updated.');
      } else {
        await seoApi.create(input);
        onSaved('SEO entry created.');
      }
    } catch (err) {
      const status = (err as { status?: number } | null)?.status;
      setSaveError(
        status === 409 ? 'An SEO entry for this page name already exists.' : apiErrorMessage(err, 'Could not save the SEO entry.')
      );
    } finally {
      setIsSaving(false);
    }
  };

  const titleLength = form.metaTitle.trim().length;
  const descriptionLength = form.metaDescription.trim().length;

  return (
    <Modal
      title={seo ? 'Edit page SEO' : 'Add page SEO'}
      onClose={isSaving ? () => undefined : onClose}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSaving}>
            Cancel
          </button>
          <button type="submit" form="seo-form" className="btn btn-primary" disabled={isSaving}>
            {isSaving ? 'Saving…' : seo ? 'Save changes' : 'Create entry'}
          </button>
        </>
      }
    >
      <form id="seo-form" onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem' }}>
        {saveError && <Notice notice={{ kind: 'error', text: saveError }} />}

        <Field
          label="Page name"
          required
          error={errors.name}
          hint="The name the website asks for, e.g. home, about, services. Stored in lower case; one entry per page."
        >
          <input type="text" className="input-control" maxLength={150} value={form.name} onChange={(e) => set('name', e.target.value)} />
        </Field>
        <Field label="Meta title" required error={errors.metaTitle} hint={`${titleLength} characters. Search engines show about 60.`}>
          <input
            type="text"
            className="input-control"
            maxLength={300}
            placeholder="Page Title | Astro Sushil"
            value={form.metaTitle}
            onChange={(e) => set('metaTitle', e.target.value)}
          />
        </Field>
        <Field
          label="Meta description"
          required
          error={errors.metaDescription}
          hint={`${descriptionLength} characters. Search engines show about 160.`}
        >
          <textarea
            className="input-control"
            rows={4}
            maxLength={1000}
            value={form.metaDescription}
            onChange={(e) => set('metaDescription', e.target.value)}
          />
        </Field>
        <UploadField
          label="Social sharing image (Open Graph)"
          purpose="seo"
          value={form.image}
          onChange={(value) => set('image', value)}
          hint="Recommended 1200 × 630 px."
          disabled={isSaving}
        />
      </form>
    </Modal>
  );
}

function SeoScreen() {
  const { hasPermission } = useAuth();
  const canCreate = hasPermission('seo:create');
  const canUpdate = hasPermission('seo:update');
  const canDelete = hasPermission('seo:delete');

  const [entries, setEntries] = useState<SeoPage[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const { notice, showSuccess, clear } = useNotice();

  const [editing, setEditing] = useState<SeoPage | 'new' | null>(null);
  const [deleting, setDeleting] = useState<SeoPage | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      setEntries(await seoApi.list());
    } catch (err) {
      setLoadError(apiErrorMessage(err, 'Failed to load SEO entries.'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // The endpoint returns every page (one row per site page), so the search runs on the loaded list.
  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return entries;
    return entries.filter(
      (e) => e.name.toLowerCase().includes(term) || e.metaTitle.toLowerCase().includes(term) || e.metaDescription.toLowerCase().includes(term)
    );
  }, [entries, search]);

  const handleDelete = async () => {
    if (!deleting) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await seoApi.remove(deleting.id);
      setDeleting(null);
      showSuccess('SEO entry deleted.');
      await load();
    } catch (err) {
      setDeleteError(apiErrorMessage(err, 'Could not delete the SEO entry.'));
    } finally {
      setIsDeleting(false);
    }
  };

  const columns = 6;

  return (
    <div>
      <PageHeader
        crumbs={[{ label: 'SEO' }]}
        title="SEO per Page"
        subtitle="Meta title, description and sharing image of each website page"
        actions={
          <>
            <button type="button" className="btn btn-secondary" style={{ fontSize: '0.85rem' }} onClick={load}>
              Refresh
            </button>
            {canCreate && (
              <button type="button" className="btn btn-primary" onClick={() => setEditing('new')}>
                + Add page SEO
              </button>
            )}
          </>
        }
      />

      <Notice notice={notice} onClose={clear} />
      {loadError && <LoadError message={loadError} onRetry={load} />}

      <div className="card" style={{ marginBottom: '1.5rem', padding: '1.25rem' }}>
        <label style={labelStyle}>Search</label>
        <input
          type="text"
          className="input-control"
          placeholder="Page name, title or description…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: '420px' }}
        />
      </div>

      <div className="card">
        <div className="table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Page</th>
                <th>Meta title</th>
                <th>Meta description</th>
                <th>Image</th>
                <th>Updated</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <SkeletonRows columns={columns} />
              ) : visible.length === 0 ? (
                <EmptyRow columns={columns}>
                  {loadError ? 'SEO entries could not be loaded.' : entries.length === 0 ? 'No SEO entries yet.' : 'No entries match this search.'}
                </EmptyRow>
              ) : (
                visible.map((entry) => (
                  <tr key={entry.id}>
                    <td>
                      <span className="badge badge-info" style={{ textTransform: 'none' }}>
                        {entry.name}
                      </span>
                    </td>
                    <td style={{ maxWidth: '260px', fontWeight: 600 }}>{entry.metaTitle}</td>
                    <td style={{ maxWidth: '360px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {entry.metaDescription.length > 160 ? `${entry.metaDescription.slice(0, 160)}…` : entry.metaDescription}
                    </td>
                    <td>
                      <Thumb url={entry.image?.url} alt={`${entry.name} sharing image`} size={40} />
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{formatDate(entry.updatedAt)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                        {canUpdate && (
                          <button type="button" className="btn btn-secondary" style={smallButton} onClick={() => setEditing(entry)}>
                            Edit
                          </button>
                        )}
                        {canDelete && (
                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ ...smallButton, ...dangerText }}
                            onClick={() => {
                              setDeleteError(null);
                              setDeleting(entry);
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
        {!isLoading && entries.length > 0 && (
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.75rem' }}>
            {visible.length} of {entries.length} page(s)
          </p>
        )}
      </div>

      {editing && (
        <SeoFormModal
          seo={editing === 'new' ? null : editing}
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
          title="Delete SEO entry"
          message={
            <>
              Delete the SEO entry of the page <strong>{deleting.name}</strong>? Its sharing image is removed from storage. This cannot be
              undone.
            </>
          }
          busy={isDeleting}
          error={deleteError}
          onConfirm={handleDelete}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  );
}

export default function SeoPageRoute() {
  return (
    <PermissionGate permission="seo:read" area="SEO">
      <SeoScreen />
    </PermissionGate>
  );
}
