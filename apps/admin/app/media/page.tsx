'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../lib/auth-context';
import {
  MEDIA_SECTIONS,
  MediaInput,
  MediaItem,
  MediaSection,
  apiErrorMessage,
  isYoutubeUrl,
  mediaApi,
  toFileSlot,
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

const SECTION_LABELS: Record<MediaSection, string> = { podcast: 'Podcast', celebrity: 'Celebrity', wishes: 'Wishes' };

const SECTION_HELP: Record<MediaSection, string> = {
  podcast: 'A YouTube video. The thumbnail is optional: without one, YouTube’s own thumbnail is used.',
  celebrity: 'An uploaded MP4 video with an uploaded thumbnail. Both are required.',
  wishes: 'An uploaded image with the name of the person. Both are required.',
};

function asSection(value: string): MediaSection {
  return (MEDIA_SECTIONS as readonly string[]).includes(value) ? (value as MediaSection) : 'podcast';
}

interface MediaFormState {
  section: MediaSection;
  title: string;
  description: string;
  mediaUrl: string;
  media: UploadedFileRef | null;
  thumbnail: UploadedFileRef | null;
  tag: string;
  personName: string;
  background: string;
  order: string;
  isActive: boolean;
}

type FormErrors = Partial<
  Record<'title' | 'description' | 'mediaUrl' | 'media' | 'thumbnail' | 'tag' | 'personName' | 'background' | 'order', string>
>;

/** Only a file we uploaded (it has a storage key) is an editable slot; a YouTube thumbnail is not. */
function uploadedOnly(file: { url: string; key: string | null } | null): UploadedFileRef | null {
  return file && file.key ? file : null;
}

function formFrom(item: MediaItem | null, defaultSection: MediaSection): MediaFormState {
  if (!item) {
    return {
      section: defaultSection,
      title: '',
      description: '',
      mediaUrl: '',
      media: null,
      thumbnail: null,
      tag: '',
      personName: '',
      background: '',
      order: '0',
      isActive: true,
    };
  }
  const section = asSection(item.section);
  return {
    section,
    title: item.title,
    description: item.description,
    mediaUrl: section === 'podcast' ? item.mediaUrl || '' : '',
    media: item.media,
    // Records migrated from the website may hold a file without a key; keep showing those.
    thumbnail: section === 'podcast' ? uploadedOnly(item.thumbnail) : item.thumbnail,
    tag: item.tag,
    personName: item.personName,
    background: item.background,
    order: String(item.order),
    isActive: item.isActive,
  };
}

function MediaFormModal({
  item,
  defaultSection,
  onClose,
  onSaved,
}: {
  item: MediaItem | null;
  defaultSection: MediaSection;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const [form, setForm] = useState<MediaFormState>(() => formFrom(item, defaultSection));
  const [mediaChanged, setMediaChanged] = useState(false);
  const [thumbnailChanged, setThumbnailChanged] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // On create and when the section changes, the section's required files must be given again:
  // the backend does not carry the files of one section into another.
  const isFresh = !item || item.section !== form.section;
  const isPodcast = form.section === 'podcast';
  const isCelebrity = form.section === 'celebrity';
  const isWishes = form.section === 'wishes';

  const set = <K extends keyof MediaFormState>(key: K, value: MediaFormState[K]) => setForm((prev) => ({ ...prev, [key]: value }));

  const changeSection = (section: MediaSection) => {
    if (section === form.section) return;
    if (item && section === item.section) {
      // Back to the saved section: restore the saved files.
      const original = formFrom(item, defaultSection);
      setForm((prev) => ({ ...prev, section, mediaUrl: original.mediaUrl, media: original.media, thumbnail: original.thumbnail }));
    } else {
      setForm((prev) => ({ ...prev, section, mediaUrl: '', media: null, thumbnail: null }));
    }
    setMediaChanged(false);
    setThumbnailChanged(false);
    setErrors({});
  };

  const validate = (): FormErrors => {
    const found: FormErrors = {};
    const title = form.title.trim();
    if (title.length < 2) found.title = 'The title needs at least 2 characters.';
    else if (title.length > 300) found.title = 'At most 300 characters.';
    if (form.description.trim().length > 5000) found.description = 'At most 5000 characters.';
    if (form.tag.trim().length > 100) found.tag = 'At most 100 characters.';
    if (form.personName.trim().length > 150) found.personName = 'At most 150 characters.';
    if (form.background.trim().length > 300) found.background = 'At most 300 characters.';
    if (parseInteger(form.order, ORDER_MIN, ORDER_MAX) === null) found.order = 'Enter a whole number.';

    if (isPodcast) {
      if (!form.mediaUrl.trim()) found.mediaUrl = 'The YouTube URL is required.';
      else if (!isYoutubeUrl(form.mediaUrl)) found.mediaUrl = 'Only a YouTube link is allowed.';
    }
    if (isCelebrity) {
      if (!form.media?.url && (isFresh || mediaChanged)) found.media = 'The video is required.';
      if (!form.thumbnail?.url && (isFresh || thumbnailChanged)) found.thumbnail = 'The thumbnail is required.';
    }
    if (isWishes) {
      if (!form.thumbnail?.url && (isFresh || thumbnailChanged)) found.thumbnail = 'The image is required.';
      if (!form.personName.trim()) found.personName = 'The person name is required.';
    }
    return found;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    const input: MediaInput = {
      section: form.section,
      title: form.title.trim(),
      description: form.description.trim(),
      tag: form.tag.trim(),
      personName: form.personName.trim(),
      background: form.background.trim(),
      order: parseInteger(form.order, ORDER_MIN, ORDER_MAX) ?? 0,
      isActive: form.isActive,
    };

    // File slots: omitted = unchanged, null = remove, object = set or replace. An unchanged file
    // is never re-sent (a podcast's YouTube thumbnail is not one of our files and would be refused).
    const sendThumbnail = isFresh || thumbnailChanged;
    if (isPodcast) {
      input.mediaUrl = form.mediaUrl.trim();
      if (sendThumbnail) {
        const slot = toFileSlot(form.thumbnail);
        // On an existing podcast, null asks the server to go back to YouTube's thumbnail.
        if (slot) input.thumbnail = slot;
        else if (!isFresh) input.thumbnail = null;
      }
    } else if (isCelebrity) {
      if (isFresh || mediaChanged) input.media = toFileSlot(form.media);
      if (sendThumbnail) input.thumbnail = toFileSlot(form.thumbnail);
    } else if (sendThumbnail) {
      input.thumbnail = toFileSlot(form.thumbnail);
    }

    setIsSaving(true);
    setSaveError(null);
    try {
      if (item) {
        await mediaApi.update(item.id, input);
        onSaved('Media item updated.');
      } else {
        await mediaApi.create(input);
        onSaved('Media item created.');
      }
    } catch (err) {
      setSaveError(apiErrorMessage(err, 'Could not save the media item.'));
    } finally {
      setIsSaving(false);
    }
  };

  const youtubeThumbnail = item && item.section === 'podcast' && item.thumbnail && !item.thumbnail.key ? item.thumbnail.url : null;

  return (
    <Modal
      title={item ? 'Edit media item' : 'Add media item'}
      onClose={isSaving ? () => undefined : onClose}
      width={720}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSaving}>
            Cancel
          </button>
          <button type="submit" form="media-form" className="btn btn-primary" disabled={isSaving}>
            {isSaving ? 'Saving…' : item ? 'Save changes' : 'Create media item'}
          </button>
        </>
      }
    >
      <form id="media-form" onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem' }}>
        {saveError && <Notice notice={{ kind: 'error', text: saveError }} />}

        <Field label="Section" required hint={SECTION_HELP[form.section]}>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {MEDIA_SECTIONS.map((section) => (
              <button
                key={section}
                type="button"
                className={`btn ${form.section === section ? 'btn-primary' : 'btn-secondary'}`}
                aria-pressed={form.section === section}
                onClick={() => changeSection(section)}
              >
                {SECTION_LABELS[section]}
              </button>
            ))}
          </div>
        </Field>
        {item && isFresh && (
          <p style={{ fontSize: '0.8rem', color: 'var(--badge-warning-text)' }}>
            Changing the section replaces this item’s files: provide the files of the new section. The old ones are deleted on save.
          </p>
        )}

        <Field label="Title" required error={errors.title}>
          <input type="text" className="input-control" maxLength={300} value={form.title} onChange={(e) => set('title', e.target.value)} />
        </Field>
        <Field label="Description" error={errors.description}>
          <textarea
            className="input-control"
            rows={3}
            maxLength={5000}
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
          />
        </Field>

        {isPodcast && (
          <>
            <Field label="YouTube URL" required error={errors.mediaUrl}>
              <input
                type="url"
                className="input-control"
                maxLength={2048}
                placeholder="https://www.youtube.com/watch?v=…"
                value={form.mediaUrl}
                onChange={(e) => set('mediaUrl', e.target.value)}
              />
            </Field>
            <UploadField
              label="Thumbnail (optional)"
              purpose="media"
              value={form.thumbnail}
              onChange={(value) => {
                set('thumbnail', value);
                setThumbnailChanged(true);
              }}
              hint={
                form.thumbnail
                  ? 'Remove it to use YouTube’s thumbnail.'
                  : youtubeThumbnail && !thumbnailChanged
                  ? 'Currently using YouTube’s thumbnail.'
                  : 'Leave empty to use YouTube’s thumbnail.'
              }
              error={errors.thumbnail}
              disabled={isSaving}
            />
          </>
        )}

        {isCelebrity && (
          <>
            <UploadField
              label="Video file *"
              purpose="media-video"
              value={form.media}
              onChange={(value) => {
                set('media', value);
                setMediaChanged(true);
              }}
              required
              error={errors.media}
              disabled={isSaving}
            />
            <UploadField
              label="Thumbnail *"
              purpose="media"
              value={form.thumbnail}
              onChange={(value) => {
                set('thumbnail', value);
                setThumbnailChanged(true);
              }}
              required
              error={errors.thumbnail}
              disabled={isSaving}
            />
          </>
        )}

        {isWishes && (
          <UploadField
            label="Image *"
            purpose="media"
            value={form.thumbnail}
            onChange={(value) => {
              set('thumbnail', value);
              setThumbnailChanged(true);
            }}
            required
            error={errors.thumbnail}
            disabled={isSaving}
          />
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem' }}>
          <Field label="Person name" required={isWishes} error={errors.personName}>
            <input
              type="text"
              className="input-control"
              maxLength={150}
              value={form.personName}
              onChange={(e) => set('personName', e.target.value)}
            />
          </Field>
          <Field label="Tag" error={errors.tag} hint="e.g. Actor, Student">
            <input type="text" className="input-control" maxLength={100} value={form.tag} onChange={(e) => set('tag', e.target.value)} />
          </Field>
          <Field label="Order" error={errors.order} hint="Lower numbers show first.">
            <input type="number" step={1} className="input-control" value={form.order} onChange={(e) => set('order', e.target.value)} />
          </Field>
        </div>

        <Field label="Background colour / CSS" error={errors.background} hint="#f5f5f5 or any CSS background value.">
          <input
            type="text"
            className="input-control"
            maxLength={300}
            value={form.background}
            onChange={(e) => set('background', e.target.value)}
          />
        </Field>

        <Checkbox label="Active" description="Only active items are shown on the website." checked={form.isActive} onChange={(v) => set('isActive', v)} />
      </form>
    </Modal>
  );
}

function MediaScreen() {
  const { hasPermission } = useAuth();
  const canCreate = hasPermission('media:create');
  const canUpdate = hasPermission('media:update');
  const canDelete = hasPermission('media:delete');

  const [items, setItems] = useState<MediaItem[]>([]);
  const [sectionFilter, setSectionFilter] = useState<MediaSection | ''>('');
  const [activeFilter, setActiveFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const { notice, showSuccess, showError, clear } = useNotice();

  const [editing, setEditing] = useState<MediaItem | 'new' | null>(null);
  const [deleting, setDeleting] = useState<MediaItem | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      setItems(await mediaApi.list({ section: sectionFilter, isActive: activeFilter }));
    } catch (err) {
      setLoadError(apiErrorMessage(err, 'Failed to load media.'));
    } finally {
      setIsLoading(false);
    }
  }, [sectionFilter, activeFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const handleToggle = async (item: MediaItem) => {
    setBusyId(item.id);
    try {
      const updated = await mediaApi.toggle(item.id);
      showSuccess(`Media item ${updated.isActive ? 'activated' : 'deactivated'}.`);
      await load();
    } catch (err) {
      showError(apiErrorMessage(err, 'Could not change the media status.'));
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setBusyId(deleting.id);
    setDeleteError(null);
    try {
      await mediaApi.remove(deleting.id);
      setDeleting(null);
      showSuccess('Media item deleted.');
      await load();
    } catch (err) {
      setDeleteError(apiErrorMessage(err, 'Could not delete the media item.'));
    } finally {
      setBusyId(null);
    }
  };

  const columns = 8;

  return (
    <div>
      <PageHeader
        crumbs={[{ label: 'Media' }]}
        title="Media"
        subtitle="Podcast videos, celebrity videos and wishes shown on the website"
        actions={
          <>
            <button type="button" className="btn btn-secondary" style={{ fontSize: '0.85rem' }} onClick={load}>
              Refresh
            </button>
            {canCreate && (
              <button type="button" className="btn btn-primary" onClick={() => setEditing('new')}>
                + Add media
              </button>
            )}
          </>
        }
      />

      <Notice notice={notice} onClose={clear} />
      {loadError && <LoadError message={loadError} onRetry={load} />}

      <div className="card" style={{ marginBottom: '1.5rem', padding: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <span style={labelStyle}>Section</span>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                className={`btn ${sectionFilter === '' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setSectionFilter('')}
              >
                All
              </button>
              {MEDIA_SECTIONS.map((section) => (
                <button
                  key={section}
                  type="button"
                  className={`btn ${sectionFilter === section ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setSectionFilter(section)}
                >
                  {SECTION_LABELS[section]}
                </button>
              ))}
            </div>
          </div>
          <div style={{ minWidth: '200px' }}>
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
                <th>Preview</th>
                <th>Title</th>
                <th>Section</th>
                <th>Media</th>
                <th>Person / Tag</th>
                <th>Order</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <SkeletonRows columns={columns} />
              ) : items.length === 0 ? (
                <EmptyRow columns={columns}>{loadError ? 'Media could not be loaded.' : 'No media items match these filters.'}</EmptyRow>
              ) : (
                items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <Thumb url={item.thumbnail?.url} alt={item.title} />
                    </td>
                    <td style={{ maxWidth: '300px' }}>
                      <div style={{ fontWeight: 600 }}>{item.title}</div>
                      {item.description && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          {item.description.length > 100 ? `${item.description.slice(0, 100)}…` : item.description}
                        </div>
                      )}
                    </td>
                    <td>
                      <span className="badge badge-info">{SECTION_LABELS[asSection(item.section)] || item.section}</span>
                    </td>
                    <td style={{ fontSize: '0.8rem' }}>
                      {item.mediaUrl ? (
                        <a href={item.mediaUrl} target="_blank" rel="noopener noreferrer">
                          {item.section === 'podcast' ? 'YouTube' : 'Video'}
                        </a>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>{item.type === 'image' ? 'Image' : '—'}</span>
                      )}
                    </td>
                    <td style={{ fontSize: '0.8rem' }}>
                      {item.personName || <span style={{ color: 'var(--text-muted)' }}>—</span>}
                      {item.tag && <div style={{ color: 'var(--text-muted)' }}>{item.tag}</div>}
                    </td>
                    <td>{item.order}</td>
                    <td>
                      <ActiveBadge active={item.isActive} />
                    </td>
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
        {!isLoading && items.length > 0 && (
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.75rem' }}>{items.length} item(s)</p>
        )}
      </div>

      {editing && (
        <MediaFormModal
          item={editing === 'new' ? null : editing}
          defaultSection={sectionFilter || 'podcast'}
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
          title="Delete media item"
          message={
            <>
              Delete <strong>{deleting.title}</strong>? Its uploaded files are removed from storage. This cannot be undone.
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

export default function MediaPage() {
  return (
    <PermissionGate permission="media:read" area="Media">
      <MediaScreen />
    </PermissionGate>
  );
}
