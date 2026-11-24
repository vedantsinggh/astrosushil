'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { BLOG_STATUSES, Blog, BlogInput, BlogStatus, StoredFile, apiErrorMessage, blogsApi, slugify, toFileSlot } from '../../lib/api/content';
import { UploadField, UploadedFileRef } from '../uploads/UploadField';
import { RichHtmlEditor } from './RichHtmlEditor';
import { TagInput } from './TagInput';
import { Checkbox, Field, Notice, dangerText, labelStyle, smallButton } from './ui';

const MAX_IMAGES = 10;
const MAX_CONTENT_LENGTH = 5_000_000;

interface BlogFormState {
  title: string;
  slug: string;
  shortDescription: string;
  content: string;
  category: string;
  tags: string[];
  authorName: string;
  authorAvatar: UploadedFileRef | null;
  seoMetaTitle: string;
  seoMetaDescription: string;
  seoKeywords: string[];
  status: BlogStatus;
  isFeatured: boolean;
  /** Value of a datetime-local input (browser local time), or '' for none. */
  publishedAt: string;
  thumbnail: UploadedFileRef | null;
  images: StoredFile[];
}

type FormErrors = Partial<
  Record<'title' | 'slug' | 'shortDescription' | 'content' | 'category' | 'authorName' | 'seoMetaTitle' | 'seoMetaDescription' | 'publishedAt', string>
>;

function toLocalInput(iso: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function fromLocalInput(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function formFrom(blog: Blog | null): BlogFormState {
  if (!blog) {
    return {
      title: '',
      slug: '',
      shortDescription: '',
      content: '',
      category: '',
      tags: [],
      authorName: '',
      authorAvatar: null,
      seoMetaTitle: '',
      seoMetaDescription: '',
      seoKeywords: [],
      status: 'draft',
      isFeatured: false,
      publishedAt: '',
      thumbnail: null,
      images: [],
    };
  }
  return {
    title: blog.title,
    slug: blog.slug,
    shortDescription: blog.shortDescription,
    content: blog.content,
    category: blog.category,
    tags: blog.tags,
    authorName: blog.author.name || '',
    authorAvatar: blog.author.avatar,
    seoMetaTitle: blog.seo.metaTitle || '',
    seoMetaDescription: blog.seo.metaDescription || '',
    seoKeywords: blog.seo.keywords,
    status: blog.status === 'published' ? 'published' : 'draft',
    isFeatured: blog.isFeatured,
    publishedAt: toLocalInput(blog.publishedAt),
    thumbnail: blog.thumbnail,
    images: blog.images,
  };
}

function sameFile(a: UploadedFileRef | null, b: UploadedFileRef | null): boolean {
  return (a?.url || null) === (b?.url || null) && (a?.key || null) === (b?.key || null);
}

function sameFiles(a: StoredFile[], b: StoredFile[]): boolean {
  return a.length === b.length && a.every((file, index) => sameFile(file, b[index]));
}

function visibleTextLength(html: string): number {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .trim().length;
}

function validate(form: BlogFormState, isEdit: boolean, initialSlug: string): FormErrors {
  const errors: FormErrors = {};
  const title = form.title.trim();
  const slug = form.slug.trim();
  const short = form.shortDescription.trim();
  const category = form.category.trim();

  if (title.length < 3) errors.title = 'The title needs at least 3 characters.';
  else if (title.length > 300) errors.title = 'At most 300 characters.';

  if (isEdit && slug === initialSlug) {
    // Unchanged: it is not sent, so a slug migrated from the website is left exactly as it is.
  } else if (isEdit || slug) {
    if (slug.length < 3) errors.slug = 'The slug needs at least 3 characters.';
    else if (slug.length > 150) errors.slug = 'At most 150 characters.';
    else if (slugify(slug) !== slug) errors.slug = 'Use lower-case letters, digits and hyphens only.';
  } else if (slugify(title).length < 3 && title.length >= 3) {
    errors.slug = 'No slug can be made from this title. Type one (letters, digits, hyphens).';
  }

  if (short.length < 10) errors.shortDescription = 'The short description needs at least 10 characters.';
  else if (short.length > 1000) errors.shortDescription = 'At most 1000 characters.';

  if (form.content.length < 20) errors.content = 'The content needs at least 20 characters.';
  else if (form.content.length > MAX_CONTENT_LENGTH) errors.content = 'The content is too long.';
  else if (visibleTextLength(form.content) === 0 && !/<img\b/i.test(form.content)) errors.content = 'The content has no visible text.';

  if (!category) errors.category = 'The category is required.';
  else if (category.length > 100) errors.category = 'At most 100 characters.';

  if (form.authorName.trim().length > 150) errors.authorName = 'At most 150 characters.';
  if (form.seoMetaTitle.trim().length > 300) errors.seoMetaTitle = 'At most 300 characters.';
  if (form.seoMetaDescription.trim().length > 1000) errors.seoMetaDescription = 'At most 1000 characters.';
  if (form.publishedAt && fromLocalInput(form.publishedAt) === null) errors.publishedAt = 'Enter a valid date and time.';
  return errors;
}

export interface BlogFormProps {
  /** The post being edited, or null for a new post. */
  blog: Blog | null;
  onSaved: (blog: Blog) => void;
}

/** The add / edit form of a blog post. */
export function BlogForm({ blog, onSaved }: BlogFormProps) {
  const isEdit = blog !== null;
  const [initial] = useState<BlogFormState>(() => formFrom(blog));
  const [form, setForm] = useState<BlogFormState>(initial);
  const [errors, setErrors] = useState<FormErrors>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [galleryDraft, setGalleryDraft] = useState<UploadedFileRef | null>(null);

  const set = <K extends keyof BlogFormState>(key: K, value: BlogFormState[K]) => setForm((prev) => ({ ...prev, [key]: value }));

  const generatedSlug = slugify(form.title);

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(text);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      setCopied(null);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const found = validate(form, isEdit, initial.slug);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      setSaveError('Please correct the highlighted fields.');
      return;
    }

    const input: Partial<BlogInput> = {
      title: form.title.trim(),
      shortDescription: form.shortDescription.trim(),
      content: form.content,
      category: form.category.trim(),
      tags: form.tags,
      seo: {
        metaTitle: form.seoMetaTitle.trim() || null,
        metaDescription: form.seoMetaDescription.trim() || null,
        keywords: form.seoKeywords,
      },
      status: form.status,
      isFeatured: form.isFeatured,
    };

    // The slug is the post's public address. New post: sent only when typed (the server builds
    // one from the title otherwise). Existing post: sent only when changed.
    const slug = form.slug.trim();
    if (slug && (!isEdit || slug !== initial.slug)) input.slug = slug;

    // File slots: omitted = unchanged, null = remove, object = set or replace.
    const author: BlogInput['author'] = { name: form.authorName.trim() || null };
    if (!sameFile(form.authorAvatar, initial.authorAvatar)) author.avatar = toFileSlot(form.authorAvatar);
    input.author = author;
    if (!sameFile(form.thumbnail, initial.thumbnail)) input.thumbnail = toFileSlot(form.thumbnail);
    if (!isEdit || !sameFiles(form.images, initial.images)) input.images = form.images;

    if (form.publishedAt !== initial.publishedAt || (!isEdit && form.publishedAt)) {
      input.publishedAt = fromLocalInput(form.publishedAt);
    }

    setIsSaving(true);
    setSaveError(null);
    try {
      const saved = blog ? await blogsApi.update(blog.id, input) : await blogsApi.create(input as BlogInput);
      onSaved(saved);
    } catch (err) {
      const status = (err as { status?: number } | null)?.status;
      if (status === 409) {
        setErrors((prev) => ({ ...prev, slug: 'Another post already uses this slug.' }));
        setSaveError('Another post already uses this slug. Choose a different one.');
      } else if (status === 413) {
        setSaveError('The post is too large to save (limit 8 MB). Upload images instead of pasting them into the content.');
      } else {
        setSaveError(apiErrorMessage(err, 'Could not save the blog post.'));
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {saveError && <Notice notice={{ kind: 'error', text: saveError }} onClose={() => setSaveError(null)} />}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(280px, 1fr)', gap: '1.5rem', alignItems: 'start' }}>
        {/* MAIN COLUMN */}
        <div style={{ display: 'grid', gap: '1.5rem' }}>
          <div className="card" style={{ display: 'grid', gap: '1rem' }}>
            <h2 className="card-title">Post</h2>
            <Field label="Title" required error={errors.title}>
              <input type="text" className="input-control" maxLength={300} value={form.title} onChange={(e) => set('title', e.target.value)} />
            </Field>
            <Field
              label="Slug"
              required={isEdit}
              error={errors.slug}
              hint={
                isEdit
                  ? 'The post’s public address on the website. Changing it breaks existing links to the post.'
                  : `Leave empty to generate it from the title${generatedSlug ? `: ${generatedSlug}` : ''}. It does not change when the title is edited later.`
              }
            >
              <input
                type="text"
                className="input-control"
                maxLength={150}
                placeholder={isEdit ? '' : generatedSlug || 'generated-from-title'}
                value={form.slug}
                onChange={(e) => set('slug', e.target.value)}
                onBlur={() => {
                  if (form.slug.trim() !== initial.slug) set('slug', slugify(form.slug));
                }}
              />
            </Field>
            <Field label="Short description" required error={errors.shortDescription} hint="Shown in the blog list. 10 to 1000 characters.">
              <textarea
                className="input-control"
                rows={3}
                maxLength={1000}
                value={form.shortDescription}
                onChange={(e) => set('shortDescription', e.target.value)}
              />
            </Field>
            <Field label="Content" required error={errors.content}>
              <RichHtmlEditor
                value={form.content}
                onChange={(html) => set('content', html)}
                invalid={Boolean(errors.content)}
                disabled={isSaving}
                placeholder="<p>Write the post here…</p>"
              />
            </Field>
          </div>

          <div className="card" style={{ display: 'grid', gap: '1rem' }}>
            <h2 className="card-title">Images for the content</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Upload an image, copy its tag and paste it into the content. Up to {MAX_IMAGES} images are kept with the post; an image removed
              here is deleted from storage when the post is saved.
            </p>
            {form.images.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: '0.75rem' }}>
                {form.images.map((image) => {
                  const tag = `<img src="${image.url}" alt="" />`;
                  return (
                    <div key={image.url} style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '0.5rem' }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={image.url} alt="" style={{ width: '100%', height: '100px', objectFit: 'cover', borderRadius: 'var(--radius-sm)' }} />
                      <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.5rem' }}>
                        <button type="button" className="btn btn-secondary" style={smallButton} onClick={() => copy(tag)}>
                          {copied === tag ? 'Copied ✓' : 'Copy tag'}
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ ...smallButton, ...dangerText }}
                          onClick={() =>
                            set(
                              'images',
                              form.images.filter((i) => i.url !== image.url)
                            )
                          }
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {form.images.length < MAX_IMAGES ? (
              <UploadField
                label={`Add image (${form.images.length} of ${MAX_IMAGES})`}
                purpose="blog"
                value={galleryDraft}
                onChange={(value) => {
                  const slot = toFileSlot(value);
                  if (slot) set('images', [...form.images, slot]);
                  setGalleryDraft(null);
                }}
                disabled={isSaving}
              />
            ) : (
              <p style={{ fontSize: '0.8rem', color: 'var(--badge-warning-text)' }}>The limit of {MAX_IMAGES} images is reached.</p>
            )}
          </div>

          <div className="card" style={{ display: 'grid', gap: '1rem' }}>
            <h2 className="card-title">Search engine (SEO)</h2>
            <Field label="Meta title" error={errors.seoMetaTitle} hint="Defaults to the post title when empty.">
              <input
                type="text"
                className="input-control"
                maxLength={300}
                value={form.seoMetaTitle}
                onChange={(e) => set('seoMetaTitle', e.target.value)}
              />
            </Field>
            <Field label="Meta description" error={errors.seoMetaDescription}>
              <textarea
                className="input-control"
                rows={3}
                maxLength={1000}
                value={form.seoMetaDescription}
                onChange={(e) => set('seoMetaDescription', e.target.value)}
              />
            </Field>
            <div>
              <span style={labelStyle}>Keywords</span>
              <TagInput value={form.seoKeywords} onChange={(v) => set('seoKeywords', v)} placeholder="Type a keyword and press Enter" disabled={isSaving} />
            </div>
          </div>
        </div>

        {/* SIDE COLUMN */}
        <div style={{ display: 'grid', gap: '1.5rem' }}>
          <div className="card" style={{ display: 'grid', gap: '1rem' }}>
            <h2 className="card-title">Publishing</h2>
            <Field label="Status" required hint="Only published posts are visible on the website.">
              <select className="input-control" value={form.status} onChange={(e) => set('status', e.target.value as BlogStatus)}>
                {BLOG_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status === 'draft' ? 'Draft' : 'Published'}
                  </option>
                ))}
              </select>
            </Field>
            <Field
              label="Published date"
              error={errors.publishedAt}
              hint="In your computer’s time zone. Left empty, a post gets the time it is first published."
            >
              <input
                type="datetime-local"
                className="input-control"
                value={form.publishedAt}
                onChange={(e) => set('publishedAt', e.target.value)}
              />
            </Field>
            <Checkbox label="Featured" description="Marked as a featured post for the website." checked={form.isFeatured} onChange={(v) => set('isFeatured', v)} />
          </div>

          <div className="card" style={{ display: 'grid', gap: '1rem' }}>
            <h2 className="card-title">Organisation</h2>
            <Field label="Category" required error={errors.category} hint="e.g. Astrology, Vastu">
              <input type="text" className="input-control" maxLength={100} value={form.category} onChange={(e) => set('category', e.target.value)} />
            </Field>
            <div>
              <span style={labelStyle}>Tags</span>
              <TagInput value={form.tags} onChange={(v) => set('tags', v)} placeholder="Type a tag and press Enter" disabled={isSaving} />
            </div>
          </div>

          <div className="card" style={{ display: 'grid', gap: '1rem' }}>
            <h2 className="card-title">Thumbnail</h2>
            <UploadField purpose="blog" value={form.thumbnail} onChange={(value) => set('thumbnail', value)} disabled={isSaving} />
          </div>

          <div className="card" style={{ display: 'grid', gap: '1rem' }}>
            <h2 className="card-title">Author</h2>
            <Field label="Author name" error={errors.authorName}>
              <input
                type="text"
                className="input-control"
                maxLength={150}
                value={form.authorName}
                onChange={(e) => set('authorName', e.target.value)}
              />
            </Field>
            <UploadField
              label="Author photo"
              purpose="blog"
              value={form.authorAvatar}
              onChange={(value) => set('authorAvatar', value)}
              disabled={isSaving}
            />
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '0.5rem',
          marginTop: '1.5rem',
          paddingTop: '1rem',
          borderTop: '1px solid var(--border-color)',
        }}
      >
        <Link href={blog ? `/blogs/${blog.id}` : '/blogs'} className="btn btn-secondary">
          Cancel
        </Link>
        <button type="submit" className="btn btn-primary" disabled={isSaving}>
          {isSaving ? 'Saving…' : isEdit ? 'Save changes' : form.status === 'published' ? 'Create and publish' : 'Create draft'}
        </button>
      </div>
    </form>
  );
}
