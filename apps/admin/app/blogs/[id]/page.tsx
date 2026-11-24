'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '../../../lib/auth-context';
import { Blog, apiErrorMessage, blogsApi, formatDateTime } from '../../../lib/api/content';
import { HtmlPreview } from '../../../components/content/RichHtmlEditor';
import { ConfirmDialog, LoadError, Notice, PageHeader, PermissionGate, Thumb, dangerText, useNotice } from '../../../components/content/ui';

function Meta({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ padding: '0.5rem 0', borderBottom: '1px solid var(--border-color)' }}>
      <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </div>
      <div style={{ fontSize: '0.875rem', wordBreak: 'break-word' }}>{children}</div>
    </div>
  );
}

const none = <span style={{ color: 'var(--text-muted)' }}>—</span>;

function BlogViewScreen() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { hasPermission } = useAuth();
  const canUpdate = hasPermission('blogs:update');
  const canDelete = hasPermission('blogs:delete');

  const [blog, setBlog] = useState<Blog | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isChangingStatus, setIsChangingStatus] = useState(false);
  const { notice, showSuccess, showError, clear } = useNotice();

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      setBlog(await blogsApi.get(id));
    } catch (err) {
      setLoadError(apiErrorMessage(err, 'Failed to load the blog post.'));
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  // The add / edit forms land here with ?saved=created|updated.
  useEffect(() => {
    const saved = new URLSearchParams(window.location.search).get('saved');
    if (saved === 'created') showSuccess('Blog post created.');
    else if (saved === 'updated') showSuccess('Blog post updated.');
    if (saved) window.history.replaceState(null, '', window.location.pathname);
  }, [showSuccess]);

  const changeStatus = async () => {
    if (!blog) return;
    const next = blog.status === 'published' ? 'draft' : 'published';
    setIsChangingStatus(true);
    try {
      setBlog(await blogsApi.update(blog.id, { status: next }));
      showSuccess(next === 'published' ? 'Post published.' : 'Post moved back to draft.');
    } catch (err) {
      showError(apiErrorMessage(err, 'Could not change the post status.'));
    } finally {
      setIsChangingStatus(false);
    }
  };

  const handleDelete = async () => {
    if (!blog) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await blogsApi.remove(blog.id);
      router.push('/blogs');
    } catch (err) {
      setDeleteError(apiErrorMessage(err, 'Could not delete the blog post.'));
      setIsDeleting(false);
    }
  };

  return (
    <div>
      <PageHeader
        crumbs={[{ label: 'Blogs', href: '/blogs' }, { label: blog ? blog.title : 'Post' }]}
        title={blog ? blog.title : 'Blog Post'}
        subtitle={blog ? blog.shortDescription : undefined}
        actions={
          <>
            <Link href="/blogs" className="btn btn-secondary">
              ← Back to list
            </Link>
            {blog && canUpdate && (
              <>
                <button type="button" className="btn btn-secondary" onClick={changeStatus} disabled={isChangingStatus}>
                  {isChangingStatus ? 'Working…' : blog.status === 'published' ? 'Unpublish' : 'Publish'}
                </button>
                <Link href={`/blogs/${blog.id}/edit`} className="btn btn-primary">
                  Edit
                </Link>
              </>
            )}
            {blog && canDelete && (
              <button
                type="button"
                className="btn btn-secondary"
                style={dangerText}
                onClick={() => {
                  setDeleteError(null);
                  setConfirmDelete(true);
                }}
              >
                Delete
              </button>
            )}
          </>
        }
      />

      <Notice notice={notice} onClose={clear} />
      {loadError && <LoadError message={loadError} onRetry={load} />}

      {isLoading ? (
        <div className="card">
          <div className="skeleton" style={{ height: '28px', width: '50%', marginBottom: '1rem' }} />
          <div className="skeleton" style={{ height: '320px', width: '100%' }} />
        </div>
      ) : blog ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(260px, 1fr)', gap: '1.5rem', alignItems: 'start' }}>
          <div className="card">
            <h2 className="card-title">Content</h2>
            <HtmlPreview html={blog.content} height={640} title="Blog content" />
            {blog.images.length > 0 && (
              <div style={{ marginTop: '1.25rem' }}>
                <h3 className="card-title">Images kept with the post</h3>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {blog.images.map((image) => (
                    <a key={image.url} href={image.url} target="_blank" rel="noopener noreferrer">
                      <Thumb url={image.url} alt="Post image" size={64} />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gap: '1.5rem' }}>
            <div className="card">
              <h2 className="card-title">Details</h2>
              {blog.thumbnail?.url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={blog.thumbnail.url}
                  alt={`${blog.title} thumbnail`}
                  style={{ width: '100%', maxHeight: '200px', objectFit: 'cover', borderRadius: 'var(--radius-sm)', marginBottom: '0.5rem' }}
                />
              )}
              <Meta label="Status">
                <span className={`badge ${blog.status === 'published' ? 'badge-success' : 'badge-warning'}`}>{blog.status}</span>{' '}
                {blog.isFeatured && <span className="badge badge-info">Featured</span>}
              </Meta>
              <Meta label="Slug">
                <span style={{ fontFamily: 'monospace' }}>{blog.slug}</span>
              </Meta>
              <Meta label="Category">{blog.category || none}</Meta>
              <Meta label="Tags">
                {blog.tags.length > 0
                  ? blog.tags.map((tag) => (
                      <span key={tag} className="badge badge-info" style={{ textTransform: 'none', marginRight: '0.3rem' }}>
                        {tag}
                      </span>
                    ))
                  : none}
              </Meta>
              <Meta label="Author">{blog.author.name || none}</Meta>
              <Meta label="Views">{blog.views}</Meta>
              <Meta label="Published">{formatDateTime(blog.publishedAt)}</Meta>
              <Meta label="Created">{formatDateTime(blog.createdAt)}</Meta>
              <Meta label="Last updated">{formatDateTime(blog.updatedAt)}</Meta>
            </div>

            <div className="card">
              <h2 className="card-title">Search engine (SEO)</h2>
              <Meta label="Meta title">{blog.seo.metaTitle || none}</Meta>
              <Meta label="Meta description">{blog.seo.metaDescription || none}</Meta>
              <Meta label="Keywords">{blog.seo.keywords.length > 0 ? blog.seo.keywords.join(', ') : none}</Meta>
            </div>
          </div>
        </div>
      ) : (
        !loadError && (
          <div className="card" style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            Blog post not found.
          </div>
        )
      )}

      {confirmDelete && blog && (
        <ConfirmDialog
          title="Delete blog post"
          message={
            <>
              Permanently delete <strong>{blog.title}</strong>
              {blog.status === 'published' ? ' (currently published on the website)' : ''}? Its images are removed from storage. This cannot
              be undone.
            </>
          }
          busy={isDeleting}
          error={deleteError}
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </div>
  );
}

export default function BlogViewPage() {
  return (
    <PermissionGate permission="blogs:read" area="Blogs">
      <BlogViewScreen />
    </PermissionGate>
  );
}
