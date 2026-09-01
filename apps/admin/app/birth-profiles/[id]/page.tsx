'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { apiFetch } from '../../../lib/api-client';
import { StatusBadge } from '../../../components/StatusBadge';

interface BirthProfileDetailsResponse {
  profile: {
    id: string;
    name: string;
    dateOfBirth: string;
    timeOfBirth: string;
    latitude: number;
    longitude: number;
    timezone: string;
    placeName: string | null;
    createdAt: string;
    updatedAt: string;
    user: {
      id: string;
      email: string;
      fullName: string | null;
    };
  };
  chartMetadata: {
    provider: string;
    providerVersion: string;
    calculationVersion: string;
    zodiacType: string;
    ayanamsa: string;
    houseSystem: string;
    nodeCalculation: string;
    calculationMode: string;
    calculationStatus: string;
    errorMessage: string | null;
    isChartStale: boolean;
    lastCalculatedTime: string;
  };
  planetaryPositions: Record<
    string,
    {
      sign: string;
      degree: string;
      nakshatra: string;
      house: number | string;
    }
  > | null;
  reports: Array<{
    id: string;
    reportType: string;
    status: string;
    createdAt: string;
    completedAt: string | null;
  }>;
}

export default function BirthProfileDetailsPage() {
  const params = useParams();
  const profileId = params.id as string;

  const [data, setData] = useState<BirthProfileDetailsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfileDetails = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiFetch<BirthProfileDetailsResponse>(`/api/v1/admin/birth-profiles/${profileId}`);
      setData(res);
    } catch (err: any) {
      setError(err?.message || 'Failed to load birth profile details');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileDetails();
  }, [profileId]);

  if (isLoading) {
    return (
      <div>
        <div className="skeleton" style={{ height: '30px', width: '250px', marginBottom: '1rem' }} />
        <div className="skeleton" style={{ height: '180px', width: '100%', marginBottom: '1.5rem' }} />
        <div className="skeleton" style={{ height: '300px', width: '100%' }} />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--badge-danger-text)', marginBottom: '0.5rem' }}>Birth Profile Not Found</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>{error || 'Unable to locate birth profile record'}</p>
        <Link href="/birth-profiles" className="btn btn-secondary">
          ← Back to Birth Profiles
        </Link>
      </div>
    );
  }

  const { profile, chartMetadata, planetaryPositions, reports } = data;

  return (
    <div>
      {/* BREADCRUMBS */}
      <nav style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
        <Link href="/dashboard" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>
          Admin
        </Link>{' '}
        →{' '}
        <Link href="/birth-profiles" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>
          Birth Profiles
        </Link>{' '}
        → <strong style={{ color: 'var(--text-primary)' }}>{profile.name}&apos;s Profile</strong>
      </nav>

      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <h1 className="page-title" style={{ margin: 0 }}>{profile.name}&apos;s Birth Profile</h1>
            {chartMetadata.calculationStatus === 'CALCULATED' ? (
              <span className="badge badge-success">✓ Chart Calculated</span>
            ) : (
              <span className="badge badge-danger">⚠️ {chartMetadata.calculationStatus}</span>
            )}
            {chartMetadata.isChartStale && (
              <span className="badge badge-warning">⚠️ Chart May Be Outdated</span>
            )}
          </div>
          <p className="page-subtitle" style={{ marginTop: '0.25rem' }}>
            Profile ID: <code style={{ fontFamily: 'monospace' }}>{profile.id}</code> | User: <strong>{profile.user?.email}</strong> ({profile.user?.fullName || 'N/A'})
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Link href={`/users/${profile.user?.id}`} className="btn btn-secondary" style={{ fontSize: '0.85rem' }}>
            👤 View User Details
          </Link>
        </div>
      </div>

      {/* STALE CHART ALERT */}
      {chartMetadata.isChartStale && (
        <div className="card" style={{ background: '#FFFBEB', borderColor: '#F59E0B', marginBottom: '1.5rem', padding: '1rem 1.25rem' }}>
          <strong style={{ color: '#92400E', fontSize: '0.9rem' }}>⚠️ Chart Data Warning</strong>
          <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: '#B45309' }}>
            This profile was updated by the user after existing reports were generated. Future report regenerations will use updated coordinates.
          </p>
        </div>
      )}

      {/* PROFILE OVERVIEW CARD */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1.5rem' }}>
        <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', color: 'var(--text-primary)' }}>Birth Parameters</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>Date of Birth</span>
            <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>{profile.dateOfBirth}</strong>
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>Time of Birth</span>
            <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>{profile.timeOfBirth}</strong>
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>Place Name</span>
            <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>{profile.placeName || 'N/A'}</strong>
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>Latitude / Longitude</span>
            <code style={{ fontSize: '0.85rem', fontFamily: 'monospace' }}>{profile.latitude}°, {profile.longitude}°</code>
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>Timezone</span>
            <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>{profile.timezone}</strong>
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>Created At</span>
            <strong style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{new Date(profile.createdAt).toLocaleString()}</strong>
          </div>
        </div>
      </div>

      {/* CHART CALCULATION METADATA CARD */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1.5rem' }}>
        <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', color: 'var(--text-primary)' }}>Calculation System Configuration</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', fontSize: '0.85rem' }}>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>Calculation Engine</span>
            <strong>{chartMetadata.provider} (v{chartMetadata.providerVersion})</strong>
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>Zodiac System</span>
            <strong>{chartMetadata.zodiacType}</strong>
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>Ayanamsa</span>
            <strong>{chartMetadata.ayanamsa}</strong>
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>House System</span>
            <strong>{chartMetadata.houseSystem}</strong>
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>Node Calculation</span>
            <strong>{chartMetadata.nodeCalculation}</strong>
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>Calculation Mode</span>
            <strong>{chartMetadata.calculationMode}</strong>
          </div>
        </div>
      </div>

      {/* PLANETARY POSITIONS TABLE */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1.5rem' }}>
        <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', color: 'var(--text-primary)' }}>Planetary & Ascendant Positions</h3>

        {chartMetadata.calculationStatus !== 'CALCULATED' ? (
          <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', padding: '1rem', borderRadius: 'var(--radius-sm)' }}>
            <strong style={{ color: '#991B1B', fontSize: '0.9rem' }}>Calculation Failed / Incomplete</strong>
            <p style={{ color: '#B91C1C', fontSize: '0.85rem', margin: '0.2rem 0 0 0' }}>
              {chartMetadata.errorMessage || 'Unable to compute planetary chart positions.'}
            </p>
          </div>
        ) : planetaryPositions ? (
          <div className="table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Graha / Body</th>
                  <th>Zodiac Sign</th>
                  <th>Longitude Degree</th>
                  <th>Nakshatra</th>
                  <th>House Position</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(planetaryPositions).map(([graha, pos]) => (
                  <tr key={graha}>
                    <td style={{ fontWeight: 600, fontSize: '0.85rem' }}>{graha}</td>
                    <td><span className="badge badge-info">{pos.sign || 'N/A'}</span></td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{pos.degree !== 'N/A' ? pos.degree : 'Not Available'}</td>
                    <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{pos.nakshatra || 'N/A'}</td>
                    <td style={{ fontWeight: 600, fontSize: '0.85rem' }}>{pos.house !== 'N/A' ? `House ${pos.house}` : 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            Incomplete Chart Data
          </div>
        )}
      </div>

      {/* REPORTS GENERATED FROM THIS PROFILE */}
      <div className="card" style={{ padding: '1.5rem' }}>
        <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', color: 'var(--text-primary)' }}>
          Reports Generated From Profile ({reports.length})
        </h3>
        <div className="table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Report ID</th>
                <th>Type</th>
                <th>Status</th>
                <th>Created At</th>
                <th>Completed At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {reports.length > 0 ? (
                reports.map((r) => (
                  <tr key={r.id}>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.8rem', fontWeight: 600 }}>{r.id.slice(0, 8)}...</td>
                    <td><span className="badge badge-info">{r.reportType}</span></td>
                    <td><StatusBadge status={r.status} /></td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{new Date(r.createdAt).toLocaleString()}</td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{r.completedAt ? new Date(r.completedAt).toLocaleString() : '-'}</td>
                    <td>
                      <Link href={`/reports/${r.id}`} className="btn btn-secondary" style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}>
                        Debug Pipeline →
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    No reports generated from this birth profile yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
