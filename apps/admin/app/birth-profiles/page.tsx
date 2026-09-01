'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiFetch } from '../../lib/api-client';

interface BirthProfileListItem {
  id: string;
  name: string;
  dateOfBirth: string;
  timeOfBirth: string;
  latitude: number;
  longitude: number;
  timezone: string;
  placeName: string | null;
  reportsCount: number;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    email: string;
    fullName: string | null;
  };
}

interface BirthProfilesResponse {
  items: BirthProfileListItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export default function BirthProfilesPage() {
  const [items, setItems] = useState<BirthProfileListItem[]>([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 25, total: 0, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [pageSizeSelect, setPageSizeSelect] = useState(25);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfiles = async (page = 1, size = pageSizeSelect) => {
    setIsLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams();
      queryParams.set('page', String(page));
      queryParams.set('pageSize', String(size));
      if (search.trim()) queryParams.set('search', search.trim());

      const res = await apiFetch<BirthProfilesResponse>(`/api/v1/admin/birth-profiles?${queryParams.toString()}`);
      setItems(res.items);
      setPagination(res.pagination);
    } catch (err: any) {
      setError(err?.message || 'Failed to load birth profiles');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProfiles(1, pageSizeSelect);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, pageSizeSelect]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchProfiles(newPage, pageSizeSelect);
    }
  };

  return (
    <div>
      {/* BREADCRUMBS */}
      <nav style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
        <Link href="/dashboard" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>
          Admin
        </Link>{' '}
        → <strong style={{ color: 'var(--text-primary)' }}>Birth Profiles</strong>
      </nav>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 className="page-title">Birth Profiles & Charts</h1>
          <p className="page-subtitle">Inspect client birth metadata, calculation parameters, and generated charts</p>
        </div>
        <button onClick={() => fetchProfiles(pagination.page, pageSizeSelect)} className="btn btn-secondary" style={{ fontSize: '0.85rem' }}>
          🔄 Refresh
        </button>
      </div>

      {error && (
        <div className="badge badge-danger" style={{ padding: '1rem', borderRadius: 'var(--radius-md)', width: '100%', marginBottom: '1.5rem', display: 'block' }}>
          {error}
        </div>
      )}

      {/* FILTER & SEARCH BAR */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1.25rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
              Search Profiles
            </label>
            <input
              type="text"
              className="input-control"
              placeholder="Search by Profile Name, User Name, Email, or Profile ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
              Profiles Per Page
            </label>
            <select
              className="input-control"
              value={pageSizeSelect}
              onChange={(e) => setPageSizeSelect(Number(e.target.value))}
            >
              <option value={25}>25 profiles/page</option>
              <option value={50}>50 profiles/page</option>
              <option value={100}>100 profiles/page</option>
            </select>
          </div>
        </div>
      </div>

      {/* BIRTH PROFILES TABLE */}
      <div className="card">
        <div className="table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Profile Name</th>
                <th>User / Email</th>
                <th>Date of Birth</th>
                <th>Time of Birth</th>
                <th>Place</th>
                <th>Reports Generated</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                [1, 2, 3, 4, 5].map((i) => (
                  <tr key={i}>
                    <td colSpan={8}>
                      <div className="skeleton" style={{ height: '24px', width: '100%' }} />
                    </td>
                  </tr>
                ))
              ) : items.length > 0 ? (
                items.map((p) => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 600, fontSize: '0.85rem' }}>{p.name}</td>
                    <td>
                      <div style={{ fontSize: '0.85rem' }}>{p.user?.fullName || 'Nameless User'}</div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>{p.user?.email}</div>
                    </td>
                    <td style={{ fontSize: '0.85rem' }}>{p.dateOfBirth}</td>
                    <td style={{ fontSize: '0.85rem' }}>{p.timeOfBirth}</td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                      {p.placeName || `${p.latitude}°, ${p.longitude}°`}
                    </td>
                    <td style={{ fontWeight: 600, fontSize: '0.85rem' }}>{p.reportsCount}</td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                      {new Date(p.createdAt).toLocaleDateString()}
                    </td>
                    <td>
                      <Link href={`/birth-profiles/${p.id}`} className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>
                        Inspect Chart →
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                    No birth profiles found matching your search criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION FOOTER */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Showing page <strong>{pagination.page}</strong> of <strong>{pagination.totalPages}</strong> ({pagination.total} total birth profiles)
          </span>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page <= 1 || isLoading}
              className="btn btn-secondary"
              style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
            >
              Previous
            </button>
            <button
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages || isLoading}
              className="btn btn-secondary"
              style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
