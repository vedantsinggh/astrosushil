'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../lib/auth-context';
import { apiErrorMessage } from '../../lib/api/uploads';
import {
  CourseLink,
  CourseLinkStatus,
  ShopPagination,
  deleteCourseLink,
  fetchCourseLinks,
  formatPaise,
} from '../../lib/api/catalogue';
import {
  Breadcrumbs,
  ConfirmDialog,
  EmptyRow,
  Notice,
  PageHeader,
  Pagination,
  PermissionGate,
  SkeletonRows,
  labelStyle,
  smallButton,
} from '../../components/catalogue/ui';

function durationText(minutes: number | null): string {
  if (minutes === null || minutes === undefined) return '—';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
}

function CourseLinksScreen() {
  const { hasPermission } = useAuth();
  const canCreate = hasPermission('courses:create');
  const canUpdate = hasPermission('courses:update');
  const canDelete = hasPermission('courses:delete');
  const showActions = canUpdate || canDelete;

  const [items, setItems] = useState<CourseLink[]>([]);
  const [pagination, setPagination] = useState<ShopPagination>({ total: 0, page: 1, limit: 20, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<CourseLinkStatus | ''>('');
  const [featuredFilter, setFeaturedFilter] = useState<'true' | 'false' | ''>('');

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [deleting, setDeleting] = useState<CourseLink | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const saved = new URLSearchParams(window.location.search).get('saved');
    if (saved === 'created') setMessage('Course link created.');
    if (saved === 'updated') setMessage('Course link updated.');
  }, []);

  const load = useCallback(
    async (page: number) => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetchCourseLinks({ page, limit: 20, search: search.trim(), status: statusFilter, featured: featuredFilter });
        setItems(res.courses);
        setPagination(res.pagination);
      } catch (err) {
        setError(apiErrorMessage(err, 'Failed to load course links'));
      } finally {
        setIsLoading(false);
      }
    },
    [search, statusFilter, featuredFilter]
  );

  useEffect(() => {
    const timer = setTimeout(() => load(1), 300);
    return () => clearTimeout(timer);
  }, [load]);

  const handleDelete = async () => {
    if (!deleting) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteCourseLink(deleting.id);
      setMessage(`Course link "${deleting.title}" deleted.`);
      setDeleting(null);
      await load(pagination.page);
    } catch (err) {
      setDeleteError(apiErrorMessage(err, 'Failed to delete the course link'));
    } finally {
      setIsDeleting(false);
    }
  };

  const columns = showActions ? 8 : 7;

  return (
    <div>
      <Breadcrumbs items={[{ label: 'Course Links' }]} />
      <PageHeader
        title="Course Links"
        subtitle="Courses shown on the website that link to an outside platform. In-app courses with lessons are managed separately."
        actions={
          <>
            {canCreate && (
              <Link href="/course-links/new" className="btn btn-primary" style={{ fontSize: '0.85rem' }}>
                Add Course Link
              </Link>
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
            <input type="text" className="input-control" placeholder="Search by title..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Status</label>
            <select className="input-control" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as CourseLinkStatus | '')}>
              <option value="">All statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Featured</label>
            <select className="input-control" value={featuredFilter} onChange={(e) => setFeaturedFilter(e.target.value as 'true' | 'false' | '')}>
              <option value="">All</option>
              <option value="true">Featured</option>
              <option value="false">Not featured</option>
            </select>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Course</th>
                <th>Category</th>
                <th>Instructor / Level</th>
                <th>Price</th>
                <th>Platform</th>
                <th>Clicks</th>
                <th>Status</th>
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
                      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                        {c.thumbnail ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={c.thumbnail} alt="" style={{ width: '64px', height: '40px', objectFit: 'cover', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', flexShrink: 0 }} />
                        ) : (
                          <div style={{ width: '64px', height: '40px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', background: 'var(--bg-subtle)', flexShrink: 0 }} />
                        )}
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{c.title}</div>
                          <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                            {[c.language, durationText(c.totalDurationMinutes) !== '—' ? durationText(c.totalDurationMinutes) : null, c.rating ? `★ ${c.rating}` : null]
                              .filter(Boolean)
                              .join(' · ') || c.slug}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ fontSize: '0.85rem' }}>{c.category || <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                    <td>
                      <div style={{ fontSize: '0.85rem' }}>{c.instructorName || '—'}</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{c.level || ''}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{c.isFree ? 'Free' : formatPaise(c.pricePaise, c.currency)}</div>
                      {c.originalPricePaise !== null && c.originalPricePaise > c.pricePaise && (
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                          <span style={{ textDecoration: 'line-through' }}>{formatPaise(c.originalPricePaise, c.currency)}</span>
                          {c.discountPercentage ? ` · ${c.discountPercentage}% off` : ''}
                        </div>
                      )}
                    </td>
                    <td>
                      <div style={{ fontSize: '0.85rem' }}>{c.platformName || '—'}</div>
                      <a href={c.redirectUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.75rem' }}>
                        Open link
                      </a>
                    </td>
                    <td style={{ fontWeight: 600, fontSize: '0.85rem' }}>{c.clickCount}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                        <span className={`badge ${c.status === 'ACTIVE' ? 'badge-success' : 'badge-warning'}`}>{c.status}</span>
                        {c.isFeatured && <span className="badge badge-info">Featured</span>}
                      </div>
                    </td>
                    {showActions && (
                      <td>
                        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                          {canUpdate && (
                            <Link href={`/course-links/${c.id}`} className="btn btn-secondary" style={smallButton}>
                              Edit
                            </Link>
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
                <EmptyRow columns={columns}>No course links found matching your filters.</EmptyRow>
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={pagination.page} totalPages={pagination.totalPages} total={pagination.total} noun="course links" onPage={load} disabled={isLoading} />
      </div>

      {deleting && (
        <ConfirmDialog
          title={`Delete course link "${deleting.title}"?`}
          confirmLabel="Delete Course Link"
          onConfirm={handleDelete}
          onCancel={() => setDeleting(null)}
          busy={isDeleting}
          error={deleteError}
        >
          The course card, its thumbnail and its click count ({deleting.clickCount}) are removed permanently. Nothing on
          the outside platform changes.
        </ConfirmDialog>
      )}
    </div>
  );
}

export default function CourseLinksPage() {
  return (
    <PermissionGate permission="courses:read">
      <CourseLinksScreen />
    </PermissionGate>
  );
}
