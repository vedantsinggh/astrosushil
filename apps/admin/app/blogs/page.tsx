'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../lib/auth-context';
import { Blog, apiErrorMessage, blogsApi, formatDate } from '../../lib/api/content';
import {
  ConfirmDialog,
  EmptyRow,
  LoadError,
  Notice,
  PageHeader,
  Pager,
  PermissionGate,
  SkeletonRows,
  Thumb,
  dangerText,
  labelStyle,
  smallButton,
  useNotice,
} from '../../components/content/ui';

function BlogStatusBadge({ status }: { status: string }) {
  return <span className={`badge ${status === 'published' ? 'badge-success' : 'badge-warning'}`}>{status}</span>;
}

function BlogsScreen() {
  const { hasPermission } = useAuth();
  const canCreate = hasPermission('blogs:create');
  const canUpdate = hasPermission('blogs:update');
  const canDelete = hasPermission('blogs:delete');

  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const [searchInput, setSearchInput] = useState('');
  const [categoryInput, setCategoryInput] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [tag, setTag] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [featuredFilter, setFeaturedFilter] = useState('');

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const { notice, showSuccess, showError, clear } = useNotice();

  const [deleting, setDeleting] = useState<Blog | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setCategory(categoryInput.trim());
      setTag(tagInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput, categoryInput, tagInput]);

  const load = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const res = await blogsApi.list({ page, limit: pageSize, search, status: statusFilter, category, tag, isFeatured: featuredFilter });
      setBlogs(res.blogs);
      setTotal(res.total);
      // A delete on the last page can leave it empty: step back.
      if (res.blogs.length === 0 && res.total > 0 && page > 1) setPage(Math.max(1, Math.ceil(res.total / pageSize)));
    } catch (err) {
      setLoadError(apiErrorMessage(err, 'Failed to load blog posts.'));
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, search, statusFilter, category, tag, featuredFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const handlePublishToggle = async (blog: Blog) => {
    const next = blog.status === 'published' ? 'draft' : 'published';
    setBusyId(blog.id);
    try {
      await blogsApi.update(blog.id, { status: next });
      showSuccess(next === 'published' ? 'Post published.' : 'Post moved back to draft.');
      await load();
    } catch (err) {
      showError(apiErrorMessage(err, 'Could not change the post status.'));
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setBusyId(deleting.id);
    setDeleteError(null);
    try {
      await blogsApi.remove(deleting.id);
      setDeleting(null);
      showSuccess('Blog post deleted.');
      await load();
    } catch (err) {
      setDeleteError(apiErrorMessage(err, 'Could not delete the blog post.'));
    } finally {
      setBusyId(null);
    }
  };

  const hasFilters = Boolean(searchInput || categoryInput || tagInput || statusFilter || featuredFilter);
  const columns = 8;

  return (
    <div>
      <PageHeader
        crumbs={[{ label: 'Blogs' }]}
        title="Blogs"
        subtitle="Articles of the website: drafts and published posts"
        actions={
          <>
            <button type="button" className="btn btn-secondary" style={{ fontSize: '0.85rem' }} onClick={load}>
              Refresh
            </button>
            {canCreate && (
              <Link href="/blogs/new" className="btn btn-primary">
                + Add blog post
              </Link>
            )}
          </>
        }
      />

      <Notice notice={notice} onClose={clear} />
      {loadError && <LoadError message={loadError} onRetry={load} />}

      <div className="card" style={{ marginBottom: '1.5rem', padding: '1.25rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', alignItems: 'end' }}>
          <div style={{ gridColumn: 'span 2' }}>
            <label style={labelStyle}>Search</label>
            <input
              type="text"
              className="input-control"
              placeholder="Search by title…"
              maxLength={200}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
          <div>
            <label style={labelStyle}>Status</label>
            <select
              className="input-control"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All statuses</option>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Featured</label>
            <select
              className="input-control"
              value={featuredFilter}
              onChange={(e) => {
                setFeaturedFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All posts</option>
              <option value="true">Featured only</option>
              <option value="false">Not featured</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Category (exact)</label>
            <input type="text" className="input-control" maxLength={100} value={categoryInput} onChange={(e) => setCategoryInput(e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Tag (exact)</label>
            <input type="text" className="input-control" maxLength={100} value={tagInput} onChange={(e) => setTagInput(e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Per page</label>
            <select
              className="input-control"
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
            >
              {[10, 25, 50, 100].map((size) => (
                <option key={size} value={size}>
                  {size} per page
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Thumbnail</th>
                <th>Title</th>
                <th>Category</th>
                <th>Status</th>
                <th>Featured</th>
                <th>Views</th>
                <th>Published</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <SkeletonRows columns={columns} />
              ) : blogs.length === 0 ? (
                <EmptyRow columns={columns}>
                  {loadError ? 'Blog posts could not be loaded.' : hasFilters ? 'No blog posts match these filters.' : 'No blog posts yet.'}
                </EmptyRow>
              ) : (
                blogs.map((blog) => (
                  <tr key={blog.id}>
                    <td>
                      <Thumb url={blog.thumbnail?.url} alt={blog.title} />
                    </td>
                    <td style={{ maxWidth: '340px' }}>
                      <Link href={`/blogs/${blog.id}`} style={{ fontWeight: 600 }}>
                        {blog.title}
                      </Link>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{blog.slug}</div>
                    </td>
                    <td>{blog.category}</td>
                    <td>
                      <BlogStatusBadge status={blog.status} />
                    </td>
                    <td>{blog.isFeatured ? <span className="badge badge-info">Featured</span> : <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                    <td>{blog.views}</td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{formatDate(blog.publishedAt)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                        <Link href={`/blogs/${blog.id}`} className="btn btn-secondary" style={smallButton}>
                          View
                        </Link>
                        {canUpdate && (
                          <>
                            <Link href={`/blogs/${blog.id}/edit`} className="btn btn-secondary" style={smallButton}>
                              Edit
                            </Link>
                            <button
                              type="button"
                              className="btn btn-secondary"
                              style={smallButton}
                              disabled={busyId === blog.id}
                              onClick={() => handlePublishToggle(blog)}
                            >
                              {blog.status === 'published' ? 'Unpublish' : 'Publish'}
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
                              setDeleting(blog);
                            }}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pager page={page} totalPages={Math.ceil(total / pageSize)} total={total} noun="posts" disabled={isLoading} onPage={setPage} />
      </div>

      {deleting && (
        <ConfirmDialog
          title="Delete blog post"
          message={
            <>
              Permanently delete <strong>{deleting.title}</strong>
              {deleting.status === 'published' ? ' (currently published on the website)' : ''}? Its images are removed from storage. This
              cannot be undone.
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

export default function BlogsPage() {
  return (
    <PermissionGate permission="blogs:read" area="Blogs">
      <BlogsScreen />
    </PermissionGate>
  );
}
