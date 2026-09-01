'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { apiFetch } from '../../../lib/api-client';
import { StatusBadge } from '../../../components/StatusBadge';
import { useAuth } from '../../../lib/auth-context';

interface PipelineStage {
  id: string;
  name: string;
  key: string;
  status: 'COMPLETED' | 'RUNNING' | 'FAILED' | 'PENDING' | 'SKIPPED';
  description: string;
  details: Record<string, any>;
}

interface ReportDetailsResponse {
  report: {
    id: string;
    userId: string;
    birthProfileId: string;
    reportType: string;
    status: string;
    originalStatus: string;
    stage: string | null;
    progress: number;
    reportVersion: string;
    templateVersion: string;
    generatorVersion: string;
    calculationVersion: string;
    s3Url: string | null;
    storageKey: string | null;
    fileName: string | null;
    fileSize: number | null;
    pageCount: number | null;
    errorCode: string | null;
    errorMessage: string | null;
    isStuck: boolean;
    pdfAvailableOnDisk: boolean;
    createdAt: string;
    updatedAt: string;
    completedAt: string | null;
    failedAt: string | null;
    totalDurationMs: number | null;
  };
  user: { id: string; email: string; fullName: string | null };
  birthProfileSnapshot: {
    id: string;
    name: string;
    dateOfBirth: string;
    timeOfBirth: string;
    placeName: string | null;
    latitude: number;
    longitude: number;
    timezone: string;
    profileVersionAtGeneration: string;
    isProfileModifiedSinceReport: boolean;
  };
  cacheInfo: {
    source: string;
    cacheKey: string;
    serverCacheEnabled: boolean;
    message: string;
  };
  duplicateActiveJobs: {
    activeJobCount: number;
    jobs: Array<{ id: string; status: string; stage: string; createdAt: string }>;
  };
  errorDiagnostics: {
    errorCode: string;
    errorMessage: string;
    failedStage: string;
    failedAt: string;
    technicalDetails: string;
  } | null;
  pipelineStages: PipelineStage[];
  timeline: Array<{ event: string; timestamp: string }>;
}

export default function ReportDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const reportId = params.id as string;
  const { hasPermission } = useAuth();

  const [data, setData] = useState<ReportDetailsResponse | null>(null);
  const [activeStageId, setActiveStageId] = useState<string | null>(null);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
  const [showConfirmRegenerate, setShowConfirmRegenerate] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReportDetails = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiFetch<ReportDetailsResponse>(`/api/v1/admin/reports/${reportId}`);
      setData(res);
      // Default to opening failed stage or first stage
      const failed = res.pipelineStages.find((s) => s.status === 'FAILED');
      setActiveStageId(failed ? failed.id : res.pipelineStages[0]?.id || null);
    } catch (err: any) {
      setError(err?.message || 'Failed to load report pipeline diagnostics');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReportDetails();
  }, [reportId]);

  const handleRegenerate = async () => {
    setShowConfirmRegenerate(false);
    setIsRegenerating(true);
    setError(null);

    try {
      const res = await apiFetch<{ newReportId: string; message: string }>(`/api/v1/admin/reports/${reportId}/regenerate`, {
        method: 'POST',
      });
      // Redirect to NEW report ID
      router.push(`/reports/${res.newReportId}`);
    } catch (err: any) {
      setError(err?.message || 'Failed to regenerate report');
      setIsRegenerating(false);
    }
  };

  if (isLoading) {
    return (
      <div>
        <div className="skeleton" style={{ height: '40px', width: '300px', marginBottom: '1rem' }} />
        <div className="skeleton" style={{ height: '200px', width: '100%', marginBottom: '1.5rem' }} />
        <div className="skeleton" style={{ height: '300px', width: '100%' }} />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--badge-danger-text)', marginBottom: '0.5rem' }}>Failed to Load Diagnostics</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>{error || 'Report not found'}</p>
        <Link href="/reports" className="btn btn-secondary">
          ← Back to Reports List
        </Link>
      </div>
    );
  }

  const { report, user, birthProfileSnapshot, cacheInfo, duplicateActiveJobs, errorDiagnostics, pipelineStages, timeline } = data;
  const activeStage = pipelineStages.find((s) => s.id === activeStageId);

  return (
    <div>
      {/* HEADER BAR */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <Link href="/reports" style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textDecoration: 'none', display: 'inline-block', marginBottom: '0.5rem' }}>
            ← Back to Reports
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <h1 className="page-title" style={{ margin: 0 }}>Career Report</h1>
            {report.isStuck ? (
              <span className="badge badge-warning" style={{ fontSize: '0.9rem' }}>⏳ STUCK (&gt;5m)</span>
            ) : (
              <StatusBadge status={report.status} />
            )}
            <span className="badge badge-info">{report.reportType}</span>
          </div>
          <p className="page-subtitle" style={{ marginTop: '0.25rem' }}>
            ID: <code style={{ fontFamily: 'monospace' }}>{report.id}</code> | User: <strong>{user?.email}</strong> ({user?.fullName || 'N/A'})
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          {report.status === 'COMPLETED' && (
            <a
              href={`/api/v1/reports/${report.id}/download-file`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary"
              style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              📄 View / Download PDF
            </a>
          )}

          {hasPermission('reports:regenerate') && (
            <button
              onClick={() => setShowConfirmRegenerate(true)}
              disabled={isRegenerating}
              className="btn btn-primary"
              style={{ fontSize: '0.85rem' }}
            >
              {isRegenerating ? '🔄 Creating Job...' : '⚡ Regenerate Report'}
            </button>
          )}
        </div>
      </div>

      {/* CONFIRM REGENERATE MODAL */}
      {showConfirmRegenerate && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ maxWidth: '450px', padding: '1.5rem' }}>
            <h3 style={{ marginTop: 0, color: 'var(--text-primary)' }}>Regenerate this Career Report?</h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              A new report generation job will be created. The current report record will be preserved, and you will be redirected to the new report job ID.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button onClick={() => setShowConfirmRegenerate(false)} className="btn btn-secondary">
                Cancel
              </button>
              <button onClick={handleRegenerate} className="btn btn-primary">
                Confirm & Regenerate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STUCK REPORT WARNING BANNER */}
      {report.isStuck && (
        <div className="card" style={{ background: '#FFFBEB', borderColor: '#F59E0B', marginBottom: '1.5rem', padding: '1rem 1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '1.5rem' }}>⏳</span>
            <div>
              <strong style={{ color: '#92400E', fontSize: '0.95rem' }}>Report Job Execution is STUCK</strong>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: '#B45309' }}>
                This report has remained in status <strong>{report.stage || report.status}</strong> for over 5 minutes. The worker execution may have timed out or been interrupted.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* DUPLICATE ACTIVE JOBS WARNING BANNER */}
      {duplicateActiveJobs.activeJobCount > 1 && (
        <div className="card" style={{ background: '#EFF6FF', borderColor: '#3B82F6', marginBottom: '1.5rem', padding: '1rem 1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '1.5rem' }}>⚠️</span>
            <div>
              <strong style={{ color: '#1E40AF', fontSize: '0.95rem' }}>Duplicate Overlapping Active Generation Jobs Detected ({duplicateActiveJobs.activeJobCount})</strong>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: '#1D4ED8' }}>
                Multiple active report jobs exist for the same user & birth profile. Active job IDs: {duplicateActiveJobs.jobs.map((j) => j.id.slice(0, 8)).join(', ')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ERROR PANEL */}
      {errorDiagnostics && (
        <div className="card" style={{ background: '#FEF2F2', borderColor: '#EF4444', marginBottom: '1.5rem', padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span className="badge badge-danger" style={{ marginBottom: '0.5rem', display: 'inline-block' }}>
                ERROR CODE: {errorDiagnostics.errorCode}
              </span>
              <h3 style={{ margin: '0.25rem 0', color: '#991B1B', fontSize: '1.1rem' }}>{errorDiagnostics.errorMessage}</h3>
              <div style={{ fontSize: '0.85rem', color: '#B91C1C', marginTop: '0.25rem' }}>
                Failed Stage: <strong>{errorDiagnostics.failedStage}</strong> | Failure Timestamp: {new Date(errorDiagnostics.failedAt).toLocaleString()}
              </div>
            </div>
            <button
              onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
              className="btn btn-secondary"
              style={{ fontSize: '0.75rem', background: '#FFF' }}
            >
              {showTechnicalDetails ? 'Hide Technical Details ▲' : 'Show Technical Details ▼'}
            </button>
          </div>

          {showTechnicalDetails && (
            <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #FCA5A5' }}>
              <strong style={{ fontSize: '0.8rem', color: '#7F1D1D' }}>Technical Diagnostics & Worker Logs:</strong>
              <pre
                style={{
                  background: '#1F2937',
                  color: '#F9FAFB',
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.8rem',
                  marginTop: '0.4rem',
                  overflowX: 'auto',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {errorDiagnostics.technicalDetails}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* 1. REPORT PIPELINE VIEW (7 STAGES) */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1.5rem' }}>
        <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', color: 'var(--text-primary)' }}>Report Compilation Pipeline (7 Stages)</h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.5rem', marginBottom: '1.5rem' }}>
          {pipelineStages.map((stg, idx) => {
            const isSelected = stg.id === activeStageId;
            let bgColor = '#F3F4F6';
            let borderColor = '#D1D5DB';
            let textColor = '#374151';

            if (stg.status === 'COMPLETED') {
              bgColor = '#ECFDF5';
              borderColor = '#10B981';
              textColor = '#065F46';
            } else if (stg.status === 'RUNNING') {
              bgColor = '#EFF6FF';
              borderColor = '#3B82F6';
              textColor = '#1E40AF';
            } else if (stg.status === 'FAILED') {
              bgColor = '#FEF2F2';
              borderColor = '#EF4444';
              textColor = '#991B1B';
            }

            return (
              <button
                key={stg.id}
                onClick={() => setActiveStageId(stg.id)}
                style={{
                  background: bgColor,
                  border: `2px solid ${isSelected ? 'var(--accent-color)' : borderColor}`,
                  borderRadius: 'var(--radius-md)',
                  padding: '0.75rem 0.5rem',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  position: 'relative',
                }}
              >
                <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: textColor, fontWeight: 700 }}>Stage {idx + 1}</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: textColor, margin: '0.2rem 0' }}>{stg.name}</div>
                <div style={{ fontSize: '0.7rem' }}>
                  {stg.status === 'COMPLETED' && <span style={{ color: '#059669', fontWeight: 700 }}>✓ COMPLETED</span>}
                  {stg.status === 'RUNNING' && <span style={{ color: '#2563EB', fontWeight: 700 }}>⚡ RUNNING</span>}
                  {stg.status === 'FAILED' && <span style={{ color: '#DC2626', fontWeight: 700 }}>✗ FAILED</span>}
                  {stg.status === 'PENDING' && <span style={{ color: '#9CA3AF' }}>⏳ PENDING</span>}
                </div>
              </button>
            );
          })}
        </div>

        {/* 2. STAGE DETAILS CARD */}
        {activeStage && (
          <div style={{ background: 'var(--bg-card-secondary, #F9FAFB)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h4 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                Stage Details: <strong>{activeStage.name}</strong>
              </h4>
              <span className={`badge ${activeStage.status === 'COMPLETED' ? 'badge-success' : activeStage.status === 'FAILED' ? 'badge-danger' : 'badge-info'}`}>
                {activeStage.status}
              </span>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>{activeStage.description}</p>

            {/* STAGE METADATA TABLE */}
            <div style={{ background: '#FFF', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
                {Object.entries(activeStage.details).map(([k, v]) => {
                  if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
                    return (
                      <div key={k} style={{ gridColumn: 'span 2', background: '#F3F4F6', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
                        <strong style={{ fontSize: '0.8rem', color: 'var(--text-primary)', display: 'block', marginBottom: '0.4rem' }}>
                          {k.replace(/([A-Z])/g, ' $1').trim()}:
                        </strong>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.25rem', fontSize: '0.75rem', fontFamily: 'monospace' }}>
                          {Object.entries(v).map(([subK, subV]) => (
                            <div key={subK}>
                              <span style={{ color: 'var(--text-secondary)' }}>{subK}:</span> <strong>{String(subV)} chars</strong>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }

                  if (Array.isArray(v)) {
                    return (
                      <div key={k} style={{ gridColumn: 'span 2' }}>
                        <strong style={{ fontSize: '0.8rem', color: 'var(--text-primary)', display: 'block', marginBottom: '0.4rem' }}>
                          Validation Checks ({v.length}):
                        </strong>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
                          {v.map((chk: any, idx: number) => (
                            <div key={idx} style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <span>{chk.passed ? '✓' : '✗'}</span>
                              <span style={{ color: chk.passed ? '#059669' : '#DC2626', fontWeight: 600 }}>{chk.name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={k}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>
                        {k.replace(/([A-Z])/g, ' $1').trim()}
                      </span>
                      <strong style={{ fontSize: '0.85rem', color: 'var(--text-primary)', wordBreak: 'break-all', fontFamily: typeof v === 'number' || String(v).length > 20 ? 'monospace' : 'inherit' }}>
                        {v === null ? 'N/A' : String(v)}
                      </strong>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* METADATA & DIAGNOSTICS GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {/* 3. REPORT STATUS TIMELINE */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem' }}>Report Generation Timeline</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {timeline.map((item, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.4rem' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>{item.event}</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                  {new Date(item.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))}
            <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '2px dashed var(--border-color)', display: 'flex', justifyContent: 'space-between' }}>
              <strong style={{ fontSize: '0.85rem' }}>Total Duration:</strong>
              <strong style={{ fontSize: '0.85rem', color: 'var(--accent-color)' }}>
                {report.totalDurationMs ? `${(report.totalDurationMs / 1000).toFixed(1)} seconds` : 'In Progress...'}
              </strong>
            </div>
          </div>
        </div>

        {/* 7. REPORT METADATA & BIRTH PROFILE SNAPSHOT */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem' }}>Report & Birth Profile Snapshot</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.85rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Report Version:</span>
              <strong>{report.reportVersion}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Template Version:</span>
              <strong>{report.templateVersion}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Generator Version:</span>
              <strong>{report.generatorVersion}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Calculation Version:</span>
              <strong>{report.calculationVersion}</strong>
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '0.4rem 0' }} />

            <div>
              <strong style={{ display: 'block', marginBottom: '0.2rem', color: 'var(--text-primary)' }}>
                Birth Profile Used ({birthProfileSnapshot.name})
              </strong>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                DOB: {birthProfileSnapshot.dateOfBirth} | TOB: {birthProfileSnapshot.timeOfBirth}
              </div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                Location: {birthProfileSnapshot.placeName || `${birthProfileSnapshot.latitude}, ${birthProfileSnapshot.longitude}`}
              </div>
              {birthProfileSnapshot.isProfileModifiedSinceReport && (
                <div className="badge badge-warning" style={{ fontSize: '0.7rem', marginTop: '0.4rem' }}>
                  ⚠️ User updated birth profile after report generation
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 8. CACHE & DIAGNOSTICS */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem' }}>Cache & Server Diagnostics</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.85rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Generation Source:</span>
              <strong style={{ color: 'var(--accent-color)' }}>{cacheInfo.source}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Server Cache Enabled:</span>
              <strong>{cacheInfo.serverCacheEnabled ? 'YES' : 'NO'}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-secondary)', display: 'block' }}>Safe Debug Cache Key:</span>
              <code style={{ fontSize: '0.75rem', fontFamily: 'monospace', background: '#F3F4F6', padding: '0.2rem 0.4rem', borderRadius: '4px' }}>
                {cacheInfo.cacheKey}
              </code>
            </div>
            <div style={{ marginTop: '0.5rem', background: '#F9FAFB', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
              {cacheInfo.message}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
