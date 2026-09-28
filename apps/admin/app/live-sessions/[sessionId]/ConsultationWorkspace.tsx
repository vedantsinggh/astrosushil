'use client';

// apps/admin/app/live-sessions/[sessionId]/ConsultationWorkspace.tsx
// Phase 4 – Production-Quality Consultation Workspace

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLiveSession, ObservationTag, ConsultationNote, BirthProfileInfo } from '../../../lib/live-session-context';
import { apiFetch } from '../../../lib/api-client';
import { useAuth } from '../../../lib/auth-context';
import { KundliChartSvg } from '../../../components/KundliChartSvg';
import { SafeMarkdownRenderer } from '../../../components/SafeMarkdownRenderer';
import { KeyboardShortcutsModal } from '../../../components/KeyboardShortcutsModal';
import { LiveSessionSearchModal } from '../../../components/LiveSessionSearchModal';

// -----------------------------------------------------------------------
// Helper functions & constants
// -----------------------------------------------------------------------

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

function formatDate(iso: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

const SECTION_LABELS: Record<string, string> = {
  'birth-chart': 'Birth Chart (Kundli)',
  planets: 'Planetary Placements',
  houses: 'Houses & Bhavas',
  vargas: 'Vargas (Divisional Charts)',
  dashas: 'Vimshottari Dashas',
  yogas: 'Yogas & Predictions',
  panchanga: 'Panchanga (5 Pillars)',
  ashtakavarga: 'Ashtakavarga Matrix',
  shadbala: 'Shadbala Strengths',
  jaimini: 'Jaimini Karakas',
  kp: 'KP System',
  jyoti: 'Jyoti AI Assistant',
  notes: 'Consultation Notes',
  reports: 'Client Reports',
  timeline: 'Session Timeline',
  history: 'Past Consultations',
};

const OBSERVATION_TAG_COLORS: Record<ObservationTag, { bg: string; text: string; icon: string }> = {
  IMPORTANT: { bg: '#FEF2F2', text: '#B91C1C', icon: '⚠️' },
  FOLLOW_UP: { bg: '#FFFBEB', text: '#B45309', icon: '🔄' },
  DISCUSSED: { bg: '#ECFDF5', text: '#047857', icon: '✅' },
  REPORT_NEEDED: { bg: '#EEF2FF', text: '#4338CA', icon: '📄' },
};

const DIGNITY_COLORS: Record<string, { bg: string; text: string }> = {
  EXALTED: { bg: '#ECFDF5', text: '#047857' },
  MOOLATRIKONA: { bg: '#EFF6FF', text: '#1D4ED8' },
  OWN_SIGN: { bg: '#F0FDF4', text: '#15803D' },
  FRIENDLY: { bg: '#F8FAFC', text: '#334155' },
  NEUTRAL: { bg: '#F1F5F9', text: '#475569' },
  ENEMY: { bg: '#FFFBEB', text: '#B45309' },
  DEBILITATED: { bg: '#FEF2F2', text: '#B91C1C' },
};

// -----------------------------------------------------------------------
// Header Component
// -----------------------------------------------------------------------

function SessionHeader({
  onEndSession,
  onToggleSidebar,
  sidebarOpen,
  onOpenSearch,
  onOpenShortcuts,
}: {
  onEndSession: () => void;
  onToggleSidebar: () => void;
  sidebarOpen: boolean;
  onOpenSearch: () => void;
  onOpenShortcuts: () => void;
}) {
  const { session, client, birthProfile, elapsedSeconds, isAuthExpired } = useLiveSession();

  return (
    <div style={{
      background: '#0F172A',
      borderBottom: '1px solid #1E293B',
      padding: '0.5rem 1rem',
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      flexWrap: 'wrap',
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      {/* Back link */}
      <Link
        href="/live-sessions"
        style={{ color: '#94A3B8', fontSize: '0.8rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.3rem', flexShrink: 0 }}
      >
        <span>←</span>
        <span>Sessions</span>
      </Link>

      <div style={{ width: '1px', height: '1.25rem', background: '#334155', flexShrink: 0 }} />

      {/* Client summary */}
      {client && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
          <div style={{
            width: '26px', height: '26px', borderRadius: '50%',
            background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
            color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.75rem', fontWeight: 700,
          }}>
            {client.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.82rem', color: '#F1F5F9' }}>{client.name}</div>
            <div style={{ fontSize: '0.68rem', color: '#64748B' }}>{client.email}</div>
          </div>
        </div>
      )}

      {/* Birth profile details */}
      {birthProfile && (
        <>
          <div style={{ width: '1px', height: '1.25rem', background: '#334155', flexShrink: 0 }} />
          <div style={{ display: 'flex', gap: '0.4rem', fontSize: '0.72rem', color: '#94A3B8', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ color: '#A5B4FC', fontWeight: 600 }}>🔮 {birthProfile.name}</span>
            <span>·</span>
            <span>{birthProfile.dateOfBirth}</span>
            <span>·</span>
            <span>{birthProfile.timeOfBirth?.slice(0, 5)}</span>
            {birthProfile.location && (
              <>
                <span>·</span>
                <span style={{ maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  📍 {birthProfile.location}
                </span>
              </>
            )}
          </div>
        </>
      )}

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Quick Search trigger button */}
      <button
        onClick={onOpenSearch}
        className="btn"
        style={{
          background: '#1E293B',
          border: '1px solid #334155',
          color: '#CBD5E1',
          padding: '0.25rem 0.6rem',
          fontSize: '0.75rem',
          gap: '0.4rem',
        }}
        title="Search (Ctrl+K or ⌘K)"
      >
        <span>🔍</span>
        <span style={{ display: 'inline-block' }}>Search...</span>
        <kbd style={{ background: '#0F172A', padding: '0.1rem 0.3rem', borderRadius: '3px', fontSize: '0.65rem', color: '#94A3B8' }}>⌘K</kbd>
      </button>

      {/* Keyboard Shortcuts button */}
      <button
        onClick={onOpenShortcuts}
        className="btn"
        style={{
          background: '#1E293B',
          border: '1px solid #334155',
          color: '#CBD5E1',
          padding: '0.25rem 0.5rem',
          fontSize: '0.75rem',
        }}
        title="Keyboard Shortcuts (?)"
      >
        ⌨️
      </button>

      {/* Timer */}
      <div style={{
        background: session?.status === 'ACTIVE' ? '#064E3B' : '#1E293B',
        border: `1px solid ${session?.status === 'ACTIVE' ? '#059669' : '#334155'}`,
        borderRadius: '6px',
        padding: '0.25rem 0.6rem',
        fontSize: '0.8rem',
        fontFamily: 'monospace',
        fontWeight: 700,
        color: session?.status === 'ACTIVE' ? '#34D399' : '#94A3B8',
        flexShrink: 0,
      }}>
        ⏱ {formatDuration(elapsedSeconds)}
      </div>

      {/* Status badge */}
      <span style={{
        padding: '0.2rem 0.5rem', borderRadius: '9999px', fontSize: '0.68rem', fontWeight: 700,
        background: session?.status === 'ACTIVE' ? '#ECFDF5' : '#F1F5F9',
        color: session?.status === 'ACTIVE' ? '#047857' : '#64748B',
        flexShrink: 0,
      }}>
        {session?.status || 'LOADING'}
      </span>

      {/* Sidebar toggle */}
      <button
        onClick={onToggleSidebar}
        style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', fontSize: '0.9rem', flexShrink: 0 }}
        title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
      >
        {sidebarOpen ? '⊟' : '⊞'}
      </button>

      {/* End Session Button */}
      {session?.status === 'ACTIVE' && (
        <button
          onClick={onEndSession}
          style={{
            background: '#7F1D1D', border: '1px solid #991B1B', color: '#FCA5A5',
            borderRadius: '6px', padding: '0.25rem 0.65rem', fontSize: '0.75rem',
            fontWeight: 600, cursor: 'pointer', flexShrink: 0,
          }}
        >
          End Session
        </button>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------
// Quick Navigation Sidebar
// -----------------------------------------------------------------------

function QuickNav({ onNavigate }: { onNavigate: (section: string) => void }) {
  const { activeSection, recentSections, notes } = useLiveSession();

  const navGroups = [
    {
      label: 'Astrology Views',
      items: [
        { key: 'birth-chart', icon: '🔯', label: 'Birth Chart (Kundli)' },
        { key: 'planets', icon: '🪐', label: 'Planets Placements' },
        { key: 'houses', icon: '🏠', label: 'Houses & Bhavas' },
        { key: 'vargas', icon: '📐', label: 'Vargas (Divisional)' },
        { key: 'dashas', icon: '🌙', label: 'Vimshottari Dashas' },
        { key: 'yogas', icon: '✨', label: 'Yogas & Predictions' },
        { key: 'panchanga', icon: '📅', label: 'Panchanga' },
        { key: 'ashtakavarga', icon: '🔢', label: 'Ashtakavarga' },
        { key: 'shadbala', icon: '💪', label: 'Shadbala' },
        { key: 'jaimini', icon: '🔭', label: 'Jaimini' },
        { key: 'kp', icon: '⭐', label: 'KP System' },
      ],
    },
    {
      label: 'Consultation Tools',
      items: [
        { key: 'jyoti', icon: '💬', label: 'Jyoti AI Assistant' },
        { key: 'notes', icon: '📝', label: `Notes (${notes.length})` },
        { key: 'reports', icon: '📄', label: 'Reports' },
        { key: 'timeline', icon: '📋', label: 'Timeline' },
        { key: 'history', icon: '🕐', label: 'Past Sessions' },
      ],
    },
  ];

  return (
    <nav style={{ padding: '0.65rem 0.4rem', overflowY: 'auto', flex: 1 }}>
      {/* Recently visited sections */}
      {recentSections.length > 0 && (
        <div style={{ marginBottom: '0.65rem' }}>
          <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '0 0.5rem', marginBottom: '0.2rem' }}>
            Recently Viewed
          </div>
          {recentSections.slice(0, 3).map((s) => (
            <button
              key={`recent-${s.key}`}
              onClick={() => onNavigate(s.key)}
              style={{
                display: 'flex', alignItems: 'center', width: '100%',
                padding: '0.25rem 0.5rem', border: 'none',
                background: activeSection === s.key ? 'rgba(99,102,241,0.15)' : 'transparent',
                color: activeSection === s.key ? '#A5B4FC' : '#94A3B8',
                borderRadius: '4px', cursor: 'pointer',
                fontSize: '0.75rem', gap: '0.35rem',
              }}
            >
              <span style={{ color: '#6366F1', fontSize: '0.65rem' }}>↩</span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {s.label}
              </span>
            </button>
          ))}
          <div style={{ height: '1px', background: '#1E293B', margin: '0.4rem 0.5rem' }} />
        </div>
      )}

      {/* Navigation Groups */}
      {navGroups.map((group) => (
        <div key={group.label} style={{ marginBottom: '0.65rem' }}>
          <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '0 0.5rem', marginBottom: '0.2rem' }}>
            {group.label}
          </div>
          {group.items.map((item) => (
            <button
              key={item.key}
              onClick={() => onNavigate(item.key)}
              style={{
                display: 'flex', alignItems: 'center', width: '100%',
                padding: '0.35rem 0.5rem', border: 'none',
                background: activeSection === item.key ? 'rgba(99,102,241,0.15)' : 'transparent',
                color: activeSection === item.key ? '#A5B4FC' : '#94A3B8',
                borderLeft: activeSection === item.key ? '2px solid #6366F1' : '2px solid transparent',
                borderRadius: '0 4px 4px 0', cursor: 'pointer',
                fontSize: '0.78rem', gap: '0.45rem', fontWeight: activeSection === item.key ? 600 : 400,
              }}
            >
              <span>{item.icon}</span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</span>
            </button>
          ))}
        </div>
      ))}
    </nav>
  );
}

// -----------------------------------------------------------------------
// Client Context Sidebar (Right Panel)
// -----------------------------------------------------------------------

function ClientContextPanel({ onNavigate }: { onNavigate: (section: string) => void }) {
  const { client, birthProfile, otherProfiles, previousSessions, reports, observations } = useLiveSession();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    client: true,
    observations: true,
    reports: true,
    history: false,
  });

  const toggle = (key: string) => setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  const completedReports = reports.filter((r) => r.status === 'COMPLETED');
  const pendingReports = reports.filter((r) => !['COMPLETED', 'FAILED'].includes(r.status));

  return (
    <div style={{ padding: '0.65rem', overflowY: 'auto', flex: 1, fontSize: '0.78rem' }}>
      {/* Client Details */}
      <div style={{ marginBottom: '0.65rem' }}>
        <button
          onClick={() => toggle('client')}
          style={{
            display: 'flex', alignItems: 'center', width: '100%', background: 'none',
            border: 'none', cursor: 'pointer', padding: '0.2rem 0', color: '#94A3B8',
            fontWeight: 700, fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.06em',
          }}
        >
          <span>Client Details</span>
          <span style={{ marginLeft: 'auto', transform: expanded.client ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}>▶</span>
        </button>
        {expanded.client && client && (
          <div style={{ marginTop: '0.35rem', color: '#CBD5E1' }}>
            <div style={{ fontWeight: 600, fontSize: '0.82rem', color: '#F1F5F9' }}>{client.name}</div>
            <div style={{ color: '#64748B', fontSize: '0.72rem' }}>{client.email}</div>
            {birthProfile && (
              <div style={{ marginTop: '0.4rem', background: '#1E293B', borderRadius: '6px', padding: '0.45rem', border: '1px solid #334155' }}>
                <div style={{ fontWeight: 600, color: '#A5B4FC', fontSize: '0.75rem' }}>🔮 {birthProfile.name}</div>
                <div style={{ color: '#94A3B8', fontSize: '0.7rem', marginTop: '0.15rem' }}>
                  {birthProfile.dateOfBirth} · {birthProfile.timeOfBirth?.slice(0, 5)}
                </div>
                <div style={{ color: '#64748B', fontSize: '0.68rem' }}>📍 {birthProfile.location}</div>
              </div>
            )}
            {otherProfiles.length > 0 && (
              <div style={{ marginTop: '0.4rem', color: '#64748B', fontSize: '0.68rem' }}>
                Other profiles: {otherProfiles.map((p) => p.name).join(', ')}
              </div>
            )}
          </div>
        )}
      </div>

      <div style={{ height: '1px', background: '#1E293B', marginBottom: '0.65rem' }} />

      {/* Observations */}
      <div style={{ marginBottom: '0.65rem' }}>
        <button
          onClick={() => toggle('observations')}
          style={{
            display: 'flex', alignItems: 'center', width: '100%', background: 'none',
            border: 'none', cursor: 'pointer', padding: '0.2rem 0', color: '#94A3B8',
            fontWeight: 700, fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.06em',
          }}
        >
          <span>Observations ({observations.length})</span>
          <span style={{ marginLeft: 'auto', transform: expanded.observations ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}>▶</span>
        </button>
        {expanded.observations && (
          <div style={{ marginTop: '0.35rem' }}>
            {observations.length === 0 ? (
              <div style={{ color: '#475569', fontSize: '0.72rem', padding: '0.2rem 0' }}>
                No observations marked yet.
              </div>
            ) : (
              observations.map((o) => {
                const style = OBSERVATION_TAG_COLORS[o.tag as ObservationTag] || { bg: '#F1F5F9', text: '#0F172A', icon: '•' };
                return (
                  <div key={o.id} style={{ marginBottom: '0.35rem', padding: '0.35rem', background: '#1E293B', borderRadius: '4px', border: '1px solid #334155' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <span>{style.icon}</span>
                      <span style={{ fontSize: '0.68rem', fontWeight: 700, color: style.text, background: style.bg, padding: '0.05rem 0.35rem', borderRadius: '9999px' }}>
                        {o.tag.replace('_', ' ')}
                      </span>
                      {o.section && <span style={{ color: '#64748B', fontSize: '0.65rem', marginLeft: 'auto' }}>@{o.section}</span>}
                    </div>
                    {o.note && <div style={{ color: '#CBD5E1', fontSize: '0.72rem', marginTop: '0.2rem' }}>{o.note}</div>}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      <div style={{ height: '1px', background: '#1E293B', marginBottom: '0.65rem' }} />

      {/* Reports */}
      <div style={{ marginBottom: '0.65rem' }}>
        <button
          onClick={() => toggle('reports')}
          style={{
            display: 'flex', alignItems: 'center', width: '100%', background: 'none',
            border: 'none', cursor: 'pointer', padding: '0.2rem 0', color: '#94A3B8',
            fontWeight: 700, fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.06em',
          }}
        >
          <span>Reports ({reports.length})</span>
          <span style={{ marginLeft: 'auto', transform: expanded.reports ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}>▶</span>
        </button>
        {expanded.reports && (
          <div style={{ marginTop: '0.35rem' }}>
            {pendingReports.length > 0 && (
              <div style={{ marginBottom: '0.25rem', color: '#F59E0B', fontSize: '0.7rem' }}>
                ⏳ {pendingReports.length} report(s) generating...
              </div>
            )}
            {completedReports.length === 0 && pendingReports.length === 0 ? (
              <div style={{ color: '#475569', fontSize: '0.72rem' }}>No reports.</div>
            ) : (
              completedReports.slice(0, 3).map((r) => (
                <div key={r.id} style={{ color: '#94A3B8', fontSize: '0.7rem', padding: '0.2rem 0', borderBottom: '1px solid #1E293B', display: 'flex', justifyContent: 'space-between' }}>
                  <span>{r.reportType}</span>
                  <span style={{ color: '#34D399', fontWeight: 600 }}>READY</span>
                </div>
              ))
            )}
            <button
              onClick={() => onNavigate('reports')}
              style={{ color: '#6366F1', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.72rem', padding: '0.2rem 0', marginTop: '0.2rem' }}
            >
              Open Reports →
            </button>
          </div>
        )}
      </div>

      {/* Past Sessions */}
      <div>
        <button
          onClick={() => toggle('history')}
          style={{
            display: 'flex', alignItems: 'center', width: '100%', background: 'none',
            border: 'none', cursor: 'pointer', padding: '0.2rem 0', color: '#94A3B8',
            fontWeight: 700, fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.06em',
          }}
        >
          <span>Past Sessions ({previousSessions.length})</span>
          <span style={{ marginLeft: 'auto', transform: expanded.history ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}>▶</span>
        </button>
        {expanded.history && (
          <div style={{ marginTop: '0.35rem' }}>
            {previousSessions.length === 0 ? (
              <div style={{ color: '#475569', fontSize: '0.72rem' }}>First consultation.</div>
            ) : (
              previousSessions.slice(0, 3).map((s) => (
                <div key={s.id} style={{ padding: '0.3rem', background: '#1E293B', borderRadius: '4px', marginBottom: '0.3rem' }}>
                  <div style={{ color: '#CBD5E1', fontSize: '0.7rem', fontWeight: 600 }}>
                    {new Date(s.startedAt).toLocaleDateString()}
                    {s.durationSeconds ? ` (${Math.round(s.durationSeconds / 60)}m)` : ''}
                  </div>
                  <div style={{ color: '#64748B', fontSize: '0.65rem' }}>
                    {s.notesCount} notes · {s.observationsCount} obs
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------
// Astrology Section Renderers
// -----------------------------------------------------------------------

function AstrologyPanel({ sectionKey, birthProfile }: { sectionKey: string; birthProfile: BirthProfileInfo }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [vargaSelect, setVargaSelect] = useState('D9');
  const [chartViewMode, setChartViewMode] = useState<'both' | 'chart' | 'table'>('both');
  const [evidenceDomain, setEvidenceDomain] = useState('CAREER');
  const abortControllerRef = useRef<AbortController | null>(null);

  const birthProfileId = birthProfile.id;

  const loadData = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      let result: any = null;

      switch (sectionKey) {
        case 'birth-chart':
        case 'planets':
        case 'houses':
          result = await apiFetch('/api/v1/astrology/chart', {
            method: 'POST',
            body: JSON.stringify({ birthProfileId }),
            signal: controller.signal,
          });
          break;
        case 'dashas':
          result = await apiFetch('/api/v1/astrology/dasha', {
            method: 'POST',
            body: JSON.stringify({ birthProfileId, maxLevel: 3 }),
            signal: controller.signal,
          });
          break;
        case 'panchanga':
          result = await apiFetch('/api/v1/astrology/panchang', {
            method: 'POST',
            body: JSON.stringify({
              dateOfBirth: birthProfile.dateOfBirth,
              timeOfBirth: birthProfile.timeOfBirth,
              latitude: birthProfile.latitude || 28.6139,
              longitude: birthProfile.longitude || 77.209,
              timezone: birthProfile.timezone || 'Asia/Kolkata',
            }),
            signal: controller.signal,
          });
          break;
        case 'vargas':
          result = await apiFetch('/api/v1/astrology/vargas', {
            method: 'POST',
            body: JSON.stringify({ birthProfileId, vargaTypes: [vargaSelect] }),
            signal: controller.signal,
          });
          break;
        case 'yogas':
          result = await apiFetch('/api/v1/astrology/predictions', {
            method: 'POST',
            body: JSON.stringify({ birthProfileId, category: evidenceDomain }),
            signal: controller.signal,
          });
          break;
        case 'ashtakavarga':
        case 'shadbala':
        case 'jaimini':
        case 'kp':
          // Fetch evidence snapshot which holds multi-domain astrological structures
          result = await apiFetch('/api/v1/astrology/evidence', {
            method: 'POST',
            body: JSON.stringify({ birthProfileId, domain: 'CAREER' }),
            signal: controller.signal,
          });
          break;
        default:
          result = await apiFetch('/api/v1/astrology/chart', {
            method: 'POST',
            body: JSON.stringify({ birthProfileId }),
            signal: controller.signal,
          });
          break;
      }

      setData(result);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setError(err?.message || 'Failed to load astrology data');
      }
    } finally {
      setLoading(false);
    }
  }, [sectionKey, birthProfileId, birthProfile, vargaSelect, evidenceDomain]);

  useEffect(() => {
    loadData();
    return () => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, [loadData]);

  if (loading) {
    return (
      <div style={{ padding: '1.5rem' }}>
        <div className="skeleton" style={{ height: '32px', width: '220px', marginBottom: '1.25rem' }} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="skeleton" style={{ height: '320px', width: '100%', borderRadius: '12px' }} />
          <div className="skeleton" style={{ height: '320px', width: '100%', borderRadius: '12px' }} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '1.5rem' }}>
        <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', padding: '1.25rem', marginBottom: '1rem' }}>
          <strong style={{ color: '#B91C1C', fontSize: '0.95rem' }}>⚠️ Unable to load {SECTION_LABELS[sectionKey]}</strong>
          <p style={{ color: '#991B1B', fontSize: '0.85rem', marginTop: '0.35rem' }}>{error}</p>
        </div>
        <button onClick={loadData} className="btn btn-secondary" style={{ fontSize: '0.85rem' }}>
          🔄 Retry Calculation
        </button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div style={{ padding: '1.25rem' }}>
      {/* Vargas Selector bar */}
      {sectionKey === 'vargas' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Divisional Chart:</span>
          {['D1', 'D2', 'D3', 'D4', 'D7', 'D9', 'D10', 'D12', 'D16', 'D20', 'D24', 'D27', 'D30', 'D60'].map((v) => (
            <button
              key={v}
              onClick={() => setVargaSelect(v)}
              style={{
                padding: '0.2rem 0.6rem',
                borderRadius: '4px',
                border: `1px solid ${vargaSelect === v ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                background: vargaSelect === v ? 'var(--accent-primary)' : 'var(--bg-surface)',
                color: vargaSelect === v ? '#FFF' : 'var(--text-primary)',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {v}
            </button>
          ))}
        </div>
      )}

      {/* Yogas Domain selector bar */}
      {sectionKey === 'yogas' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Domain:</span>
          {['CAREER', 'MONEY', 'EDUCATION', 'RELATIONSHIPS', 'HEALTH_GENERAL', 'PERSONALITY', 'TIMING'].map((d) => (
            <button
              key={d}
              onClick={() => setEvidenceDomain(d)}
              style={{
                padding: '0.2rem 0.6rem',
                borderRadius: '4px',
                border: `1px solid ${evidenceDomain === d ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                background: evidenceDomain === d ? 'var(--accent-primary)' : 'var(--bg-surface)',
                color: evidenceDomain === d ? '#FFF' : 'var(--text-primary)',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {d.replace('_', ' ')}
            </button>
          ))}
        </div>
      )}

      {/* View mode toggle for Birth Chart & Vargas */}
      {(sectionKey === 'birth-chart' || sectionKey === 'vargas') && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.35rem', marginBottom: '0.75rem' }}>
          <button
            onClick={() => setChartViewMode('both')}
            className={`btn ${chartViewMode === 'both' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '0.2rem 0.5rem', fontSize: '0.72rem' }}
          >
            Chart + Table
          </button>
          <button
            onClick={() => setChartViewMode('chart')}
            className={`btn ${chartViewMode === 'chart' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '0.2rem 0.5rem', fontSize: '0.72rem' }}
          >
            Chart Only
          </button>
          <button
            onClick={() => setChartViewMode('table')}
            className={`btn ${chartViewMode === 'table' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '0.2rem 0.5rem', fontSize: '0.72rem' }}
          >
            Table Only
          </button>
        </div>
      )}

      {/* Render Component */}
      <AstrologyDataRenderer
        sectionKey={sectionKey}
        data={data}
        chartViewMode={chartViewMode}
        vargaCode={vargaSelect}
      />
    </div>
  );
}

// -----------------------------------------------------------------------
// Data Renderer (Handles all 11 Astrology Modules)
// -----------------------------------------------------------------------

function AstrologyDataRenderer({
  sectionKey,
  data,
  chartViewMode = 'both',
  vargaCode = 'D1',
}: {
  sectionKey: string;
  data: any;
  chartViewMode?: 'both' | 'chart' | 'table';
  vargaCode?: string;
}) {
  const chart = data?.chart || data?.data || data;

  // 1. Birth Chart (Kundli) & 2. Planets
  if (sectionKey === 'birth-chart' || sectionKey === 'planets') {
    const rawPlanets = chart?.planets || [];
    const planetsList = Array.isArray(rawPlanets)
      ? rawPlanets
      : Object.entries(rawPlanets).map(([name, p]: [string, any]) => ({ planet: name, ...p }));

    if (planetsList.length === 0) {
      return <div style={{ color: 'var(--text-muted)', padding: '1.5rem', textAlign: 'center' }}>No planetary data available for this chart.</div>;
    }

    const chartData = {
      planets: planetsList,
      houses: chart?.houses || [],
      ascendant: chart?.ascendant,
    };

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* Top/Side-by-side Kundli and Planets Table */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: chartViewMode === 'both' ? 'minmax(320px, 400px) 1fr' : '1fr',
          gap: '1.25rem',
          alignItems: 'start',
        }}>
          {(chartViewMode === 'both' || chartViewMode === 'chart') && (
            <KundliChartSvg chartData={chartData} title="North Indian Rashi Kundli (D1)" size="100%" />
          )}

          {(chartViewMode === 'both' || chartViewMode === 'table') && (
            <div className="table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Planet</th>
                    <th>Rashi (Sign)</th>
                    <th>Degree</th>
                    <th>House</th>
                    <th>Nakshatra</th>
                    <th>Pada</th>
                    <th>Lord</th>
                    <th>Dignity</th>
                  </tr>
                </thead>
                <tbody>
                  {planetsList.map((p: any) => {
                    const isRetro = !!(p.isRetrograde || p.retrograde);
                    const dignity = p.dignity || p.dignityStatus || '—';
                    const digStyle = DIGNITY_COLORS[dignity?.toUpperCase()] || { bg: 'transparent', text: 'inherit' };
                    const degVal = typeof p.degreeInRashi === 'number' ? p.degreeInRashi : (typeof p.degree === 'number' ? p.degree : null);

                    return (
                      <tr key={p.planet || p.name}>
                        <td style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <span>{p.planet || p.name}</span>
                          {isRetro && (
                            <span style={{ background: '#0284C7', color: '#FFF', padding: '0.05rem 0.35rem', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 800 }}>
                              R
                            </span>
                          )}
                          {p.combust && (
                            <span title="Combust with Sun" style={{ fontSize: '0.7rem' }}>🔥</span>
                          )}
                        </td>
                        <td>{p.rashiName || p.sign || '—'}</td>
                        <td style={{ fontFamily: 'monospace', fontSize: '0.82rem' }}>
                          {degVal !== null ? `${degVal.toFixed(2)}°` : '—'}
                        </td>
                        <td style={{ fontWeight: 600 }}>{p.house ?? '—'}</td>
                        <td>{p.nakshatraName || p.nakshatra || '—'}</td>
                        <td>{p.pada ?? '—'}</td>
                        <td style={{ color: 'var(--text-secondary)' }}>{p.nakshatraLord || '—'}</td>
                        <td>
                          <span style={{ padding: '0.1rem 0.4rem', borderRadius: '4px', background: digStyle.bg, color: digStyle.text, fontSize: '0.72rem', fontWeight: 600 }}>
                            {dignity}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 3. Houses & Bhavas
  if (sectionKey === 'houses') {
    const houses = chart?.houses || [];
    if (!Array.isArray(houses) || houses.length === 0) {
      return <div style={{ color: 'var(--text-muted)' }}>No house data available.</div>;
    }
    return (
      <div className="table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>House</th>
              <th>Vedic Name (Bhava)</th>
              <th>Sign</th>
              <th>Lord</th>
              <th>Occupants</th>
              <th>Cusp Longitude</th>
            </tr>
          </thead>
          <tbody>
            {houses.map((h: any, i: number) => {
              const hNum = h.houseNumber ?? h.number ?? i + 1;
              const occupants = Array.isArray(h.occupants) ? h.occupants : (h.occupants ? [h.occupants] : []);
              return (
                <tr key={i}>
                  <td style={{ fontWeight: 700 }}>House {hNum}</td>
                  <td style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>
                    {h.name || h.vedicName || `Bhava ${hNum}`}
                  </td>
                  <td>{h.sign || h.rashiName || '—'}</td>
                  <td style={{ fontWeight: 600 }}>{h.lord || '—'}</td>
                  <td>
                    {occupants.length > 0 ? (
                      <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                        {occupants.map((occ: string) => (
                          <span key={occ} style={{ background: '#EEF2FF', color: '#4338CA', padding: '0.1rem 0.4rem', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 600 }}>
                            {occ}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>Empty</span>
                    )}
                  </td>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {typeof h.cuspLongitude === 'number' ? `${h.cuspLongitude.toFixed(2)}°` : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  // 4. Vargas (Divisional Charts)
  if (sectionKey === 'vargas') {
    const vargas = data?.data?.vargas || data?.vargas || [];
    const currentVarga = vargas.find((v: any) => v.vargaCode === vargaCode) || vargas[0] || chart;
    const planetsList = currentVarga?.planets || [];

    const vargaChartData = {
      planets: planetsList,
      ascendant: currentVarga?.ascendant,
    };

    return (
      <div style={{
        display: 'grid',
        gridTemplateColumns: chartViewMode === 'both' ? 'minmax(320px, 400px) 1fr' : '1fr',
        gap: '1.25rem',
        alignItems: 'start',
      }}>
        {(chartViewMode === 'both' || chartViewMode === 'chart') && (
          <KundliChartSvg
            chartData={vargaChartData}
            title={`${currentVarga?.vargaName || vargaCode} Divisional Chart`}
            size="100%"
          />
        )}

        {(chartViewMode === 'both' || chartViewMode === 'table') && (
          <div className="table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Planet</th>
                  <th>Varga Sign</th>
                  <th>Varga House</th>
                  <th>Dignity</th>
                </tr>
              </thead>
              <tbody>
                {planetsList.map((p: any) => (
                  <tr key={p.planet || p.name}>
                    <td style={{ fontWeight: 600 }}>{p.planet || p.name}</td>
                    <td>{p.rashiName || p.sign || '—'}</td>
                    <td>{p.house ?? '—'}</td>
                    <td>{p.dignity || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  // 5. Dashas (Vimshottari)
  if (sectionKey === 'dashas') {
    const dashaTree = data?.data?.dashaTree?.mahadashas || data?.data?.dashaTree || data?.dashas || [];
    if (!Array.isArray(dashaTree) || dashaTree.length === 0) {
      return <div style={{ color: 'var(--text-muted)' }}>No dasha timeline available.</div>;
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
        {dashaTree.map((md: any, i: number) => (
          <div key={i} style={{ border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden', background: 'var(--bg-surface)' }}>
            <div style={{
              padding: '0.75rem 1rem', background: md.isCurrent ? '#EEF2FF' : 'var(--bg-subtle)',
              fontWeight: 700, fontSize: '0.9rem', display: 'flex', gap: '0.75rem', alignItems: 'center',
              borderBottom: '1px solid var(--border-color)',
            }}>
              <span style={{ fontSize: '1.1rem' }}>🌙</span>
              <span>{md.planet || md.lord} Mahadasha</span>
              {md.isCurrent && <span className="badge badge-success" style={{ fontSize: '0.68rem' }}>ACTIVE PERIOD</span>}
              <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 400 }}>
                {md.startDateIso ? new Date(md.startDateIso).toLocaleDateString() : (md.startDate || '—')} → {md.endDateIso ? new Date(md.endDateIso).toLocaleDateString() : (md.endDate || '—')}
              </span>
            </div>

            {/* Antardashas */}
            {(md.subPeriods || md.antardashas) && (
              <div style={{ padding: '0.5rem 1rem' }}>
                {(md.subPeriods || md.antardashas).map((ad: any, j: number) => (
                  <div
                    key={j}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.75rem',
                      padding: '0.35rem 0',
                      borderBottom: j < (md.subPeriods || md.antardashas).length - 1 ? '1px solid var(--border-color)' : 'none',
                      fontSize: '0.8rem',
                    }}
                  >
                    <span style={{ color: ad.isCurrent ? 'var(--accent-primary)' : 'var(--text-primary)', fontWeight: ad.isCurrent ? 700 : 500 }}>
                      ↳ {ad.planet || ad.lord} Antardasha
                    </span>
                    {ad.isCurrent && <span className="badge badge-info" style={{ fontSize: '0.62rem' }}>CURRENT</span>}
                    <span style={{ color: 'var(--text-muted)', marginLeft: 'auto', fontSize: '0.75rem' }}>
                      {ad.startDateIso ? new Date(ad.startDateIso).toLocaleDateString() : (ad.startDate || '—')} → {ad.endDateIso ? new Date(ad.endDateIso).toLocaleDateString() : (ad.endDate || '—')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  // 6. Yogas & Predictions
  if (sectionKey === 'yogas') {
    const predictions = data?.data?.predictions || data?.predictions || data?.data || [];
    const yogas = Array.isArray(predictions) ? predictions : (predictions?.yogas || []);

    if (yogas.length === 0) {
      return (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
          No specific yogas or rule-based conditions triggered for this domain.
        </div>
      );
    }

    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
        {yogas.map((y: any, i: number) => (
          <div key={i} className="card" style={{ padding: '1rem', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
              <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>{y.title || y.name || y.ruleName}</strong>
              {y.confidence && (
                <span className="badge badge-info" style={{ fontSize: '0.65rem' }}>
                  {Math.round(y.confidence * 100)}% Match
                </span>
              )}
            </div>
            {y.description && (
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: '0 0 0.5rem 0' }}>
                {y.description}
              </p>
            )}
            {y.remedy && (
              <div style={{ background: 'var(--bg-subtle)', padding: '0.4rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', color: '#B45309' }}>
                💡 Remedy: {y.remedy}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  // 7. Panchanga
  if (sectionKey === 'panchanga') {
    const panchang = data?.data?.panchang || data?.panchang || {};
    const items = [
      { label: 'Tithi (Lunar Day)', value: panchang?.tithi?.name || panchang?.tithi, detail: panchang?.tithi?.paksha ? `${panchang.tithi.paksha} Paksha` : undefined, icon: '🌕' },
      { label: 'Vara (Solar Day)', value: panchang?.vara?.name || panchang?.vara, detail: panchang?.vara?.lord ? `Ruled by ${panchang.vara.lord}` : undefined, icon: '☀️' },
      { label: 'Nakshatra (Constellation)', value: panchang?.nakshatra?.name || panchang?.nakshatra, detail: panchang?.nakshatra?.lord ? `Lord: ${panchang.nakshatra.lord}` : undefined, icon: '✨' },
      { label: 'Yoga (Solar-Lunar Angular)', value: panchang?.yoga?.name || panchang?.yoga, detail: panchang?.yoga?.auspiciousness, icon: '🧘' },
      { label: 'Karana (Half Tithi)', value: panchang?.karana?.name || panchang?.karana, detail: panchang?.karana?.type, icon: '⏱' },
    ];

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
          {items.map((item) => (
            <div key={item.label} className="card" style={{ padding: '1rem' }}>
              <div style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>{item.icon}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                {item.label}
              </div>
              <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.2rem' }}>
                {typeof item.value === 'object' ? JSON.stringify(item.value) : String(item.value || '—')}
              </div>
              {item.detail && <div style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', marginTop: '0.15rem' }}>{item.detail}</div>}
            </div>
          ))}
        </div>

        {/* Ephemeris Sun/Moon Timings */}
        {(panchang?.sunrise || panchang?.sunset) && (
          <div className="card" style={{ padding: '1rem' }}>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
              Solar & Lunar Ephemeris
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.5rem', fontSize: '0.8rem' }}>
              <div>🌅 Sunrise: <strong style={{ color: 'var(--text-primary)' }}>{panchang.sunrise || '—'}</strong></div>
              <div>🌇 Sunset: <strong style={{ color: 'var(--text-primary)' }}>{panchang.sunset || '—'}</strong></div>
              {panchang.moonrise && <div>🌙 Moonrise: <strong style={{ color: 'var(--text-primary)' }}>{panchang.moonrise}</strong></div>}
              {panchang.moonset && <div>🌑 Moonset: <strong style={{ color: 'var(--text-primary)' }}>{panchang.moonset}</strong></div>}
            </div>
          </div>
        )}
      </div>
    );
  }

  // 8. Ashtakavarga, 9. Shadbala, 10. Jaimini, 11. KP
  // Display clean structured views or evidence fact breakdown
  const snapshot = data?.data?.snapshot || data?.snapshot || data?.data;
  if (snapshot) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div className="card" style={{ padding: '1rem' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.5rem' }}>
            🔮 {SECTION_LABELS[sectionKey] || sectionKey} Data & Facts
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            Deterministic astronomical extraction computed from the verified birth profile.
          </p>

          <div style={{ background: '#0F172A', borderRadius: '8px', padding: '1rem', overflowX: 'auto' }}>
            <pre style={{ margin: 0, fontSize: '0.78rem', color: '#94A3B8', fontFamily: 'monospace' }}>
              {JSON.stringify(snapshot, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    );
  }

  // Fallback
  return (
    <div style={{ background: '#0F172A', borderRadius: '8px', padding: '1rem', overflowX: 'auto' }}>
      <pre style={{ fontSize: '0.75rem', color: '#CBD5E1', whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0 }}>
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}

// -----------------------------------------------------------------------
// Consultation Notes Panel
// -----------------------------------------------------------------------

function NotesPanel({ currentSection }: { currentSection: string }) {
  const { session, notes, saveNote, deleteNote, saveState, draftNote, saveDraftNote, clearDraftNote, setHasUnsavedChanges } = useLiveSession();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newContent, setNewContent] = useState(draftNote?.content || '');
  const [newSection, setNewSection] = useState(draftNote?.section || (currentSection !== 'notes' ? currentSection : ''));
  const [newSubject, setNewSubject] = useState(draftNote?.subject || '');
  const [editContent, setEditContent] = useState('');
  const [editSection, setEditSection] = useState('');
  const [editSubject, setEditSubject] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isReadOnly = session?.status !== 'ACTIVE';

  // Handle typing with draft saving
  const handleContentChange = (val: string) => {
    setNewContent(val);
    saveDraftNote({ content: val, subject: newSubject, section: newSection });
  };

  const handleCreate = async () => {
    if (!newContent.trim()) return;
    setCreating(true);
    setError(null);
    try {
      await saveNote(null, { content: newContent, section: newSection || undefined, subject: newSubject || undefined });
      setNewContent('');
      setNewSubject('');
      clearDraftNote();
    } catch (err: any) {
      setError(err?.message || 'Failed to save note');
    } finally {
      setCreating(false);
    }
  };

  const startEdit = (note: ConsultationNote) => {
    setEditingId(note.id);
    setEditContent(note.content);
    setEditSection(note.section || '');
    setEditSubject(note.subject || '');
  };

  const handleEditSave = async (noteId: string) => {
    setError(null);
    try {
      await saveNote(noteId, { content: editContent, section: editSection || undefined, subject: editSubject || undefined });
      setEditingId(null);
      setHasUnsavedChanges(false);
    } catch (err: any) {
      setError(err?.message || 'Failed to update note');
    }
  };

  const handleDelete = async (noteId: string) => {
    if (!confirm('Delete this note?')) return;
    try {
      await deleteNote(noteId);
    } catch (err: any) {
      setError(err?.message || 'Failed to delete note');
    }
  };

  const sectionOptions = Object.entries(SECTION_LABELS).filter(([k]) => !['notes', 'timeline', 'history'].includes(k));

  return (
    <div style={{ padding: '1.25rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>
          📝 Consultation Notes
          {notes.length > 0 && <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: '0.85rem', marginLeft: '0.5rem' }}>({notes.length})</span>}
        </h2>
        {saveState !== 'idle' && (
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: saveState === 'saved' ? '#047857' : saveState === 'error' ? '#B91C1C' : '#D97706' }}>
            {saveState === 'saving' ? '⏳ Saving...' : saveState === 'saved' ? '✓ Saved' : '⚠ Save error'}
          </span>
        )}
      </div>

      {error && (
        <div style={{ background: '#FEF2F2', color: '#B91C1C', padding: '0.75rem', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.85rem' }}>
          ⚠️ {error}
        </div>
      )}

      {/* Draft recovery notice */}
      {draftNote && draftNote.content && !isReadOnly && (
        <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '6px', padding: '0.5rem 0.75rem', marginBottom: '0.75rem', fontSize: '0.78rem', color: '#1E40AF', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>📄 Restored unsaved draft note from earlier session.</span>
          <button onClick={clearDraftNote} style={{ background: 'none', border: 'none', color: '#1E40AF', cursor: 'pointer', textDecoration: 'underline', fontSize: '0.75rem' }}>
            Discard Draft
          </button>
        </div>
      )}

      {/* New Note Form */}
      {!isReadOnly && (
        <div className="card" style={{ padding: '1rem', marginBottom: '1.25rem', border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
            <select
              value={newSection}
              onChange={(e) => { setNewSection(e.target.value); saveDraftNote({ content: newContent, subject: newSubject, section: e.target.value }); }}
              className="input-control"
              style={{ width: '180px', fontSize: '0.8rem' }}
            >
              <option value="">No section tag</option>
              {sectionOptions.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
            <input
              type="text"
              className="input-control"
              placeholder="Subject / Theme (optional)"
              value={newSubject}
              onChange={(e) => { setNewSubject(e.target.value); saveDraftNote({ content: newContent, subject: e.target.value, section: newSection }); }}
              style={{ flex: 1, minWidth: '140px', fontSize: '0.8rem' }}
            />
          </div>
          <textarea
            className="input-control"
            rows={4}
            placeholder="Type consultation notes, predictions, remedies, and client discussion points..."
            value={newContent}
            onChange={(e) => handleContentChange(e.target.value)}
            style={{ resize: 'vertical', fontSize: '0.875rem', marginBottom: '0.5rem' }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
            <button
              onClick={() => { setNewContent(''); clearDraftNote(); }}
              className="btn btn-secondary"
              style={{ fontSize: '0.8rem' }}
              disabled={!newContent}
            >
              Clear
            </button>
            <button
              onClick={handleCreate}
              className="btn btn-primary"
              style={{ fontSize: '0.8rem' }}
              disabled={!newContent.trim() || creating}
            >
              {creating ? 'Saving...' : '+ Add Note'}
            </button>
          </div>
        </div>
      )}

      {isReadOnly && (
        <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '6px', padding: '0.75rem', marginBottom: '1rem', fontSize: '0.8rem', color: '#B45309' }}>
          📖 This consultation session has ended. Notes are preserved in read-only mode.
        </div>
      )}

      {/* Notes list */}
      {notes.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
          No notes recorded yet. Use the editor above to document client observations.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {notes.map((note) => (
            <div
              key={note.id}
              style={{ border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden', background: 'var(--bg-surface)' }}
            >
              <div style={{ padding: '0.5rem 0.85rem', background: 'var(--bg-subtle)', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                {note.section && (
                  <span className="badge badge-info" style={{ fontSize: '0.68rem' }}>
                    {SECTION_LABELS[note.section] || note.section}
                  </span>
                )}
                {note.subject && <span style={{ fontWeight: 600, fontSize: '0.82rem' }}>{note.subject}</span>}
                <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', marginLeft: 'auto' }}>
                  {formatDate(note.createdAt)}
                  {note.version > 1 && ` · v${note.version}`}
                </span>
              </div>

              {editingId === note.id ? (
                <div style={{ padding: '0.75rem' }}>
                  <textarea
                    className="input-control"
                    rows={4}
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    style={{ resize: 'vertical', fontSize: '0.875rem', marginBottom: '0.5rem' }}
                  />
                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                    <button onClick={() => setEditingId(null)} className="btn btn-secondary" style={{ fontSize: '0.8rem' }}>Cancel</button>
                    <button onClick={() => handleEditSave(note.id)} className="btn btn-primary" style={{ fontSize: '0.8rem' }}>Save Changes</button>
                  </div>
                </div>
              ) : (
                <div style={{ padding: '0.85rem', display: 'flex', gap: '0.5rem' }}>
                  <p style={{ flex: 1, fontSize: '0.875rem', whiteSpace: 'pre-wrap', lineHeight: 1.6, color: 'var(--text-primary)', margin: 0 }}>
                    {note.content}
                  </p>
                  {!isReadOnly && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flexShrink: 0 }}>
                      <button onClick={() => startEdit(note)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.8rem' }} title="Edit">✏️</button>
                      <button onClick={() => handleDelete(note.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--badge-danger-text)', fontSize: '0.8rem' }} title="Delete">🗑</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------
// Jyoti AI Consultation Assistant
// -----------------------------------------------------------------------

function JyotiPanel({ birthProfileId }: { birthProfileId: string }) {
  const { setActiveSection, saveDraftNote } = useLiveSession();
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const PROMPT_SUGGESTIONS = [
    '✨ Summarize Key Placements',
    '🌙 Analyze Current Mahadasha',
    '💼 Career & Financial Indications',
    '💍 Relationship & Marriage Prospects',
    '🌿 Health & Remedial Guidance',
  ];

  const handleSend = async (msgText?: string) => {
    const textToSend = msgText || input.trim();
    if (!textToSend) return;
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: textToSend }]);
    setLoading(true);
    setError(null);

    try {
      const result = await apiFetch<any>('/api/v1/jyoti/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: textToSend,
          birthProfileId,
          context: 'consultation',
        }),
      });

      const reply = result?.response || result?.message || result?.reply || (typeof result === 'string' ? result : JSON.stringify(result));
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
    } catch (err: any) {
      setError(err?.message || 'Jyoti AI is currently unavailable. Please try again.');
      setMessages((prev) => [...prev, { role: 'assistant', content: '⚠️ Jyoti could not complete this request. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  const copyToNotes = (content: string) => {
    saveDraftNote({ content, subject: 'Jyoti AI Consultation Insight' });
    setActiveSection('notes');
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: '520px' }}>
      <div style={{ padding: '0.75rem 1.25rem', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-surface)' }}>
        <h2 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0 }}>💬 Jyoti AI — Consultation Co-Pilot</h2>
        <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: '0.15rem 0 0' }}>
          Real-time astrological guidance trained on classical Parashara and Gupta Nadi methodologies.
        </p>
      </div>

      {/* Suggested Quick Prompts */}
      <div style={{ padding: '0.5rem 1rem', background: 'var(--bg-subtle)', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
        {PROMPT_SUGGESTIONS.map((p) => (
          <button
            key={p}
            onClick={() => handleSend(p)}
            disabled={loading}
            style={{
              padding: '0.2rem 0.5rem',
              borderRadius: '9999px',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-surface)',
              color: 'var(--text-secondary)',
              fontSize: '0.72rem',
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Chat Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2.5rem', fontSize: '0.85rem' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔮</div>
            Ask Jyoti any astrological query regarding this chart, Dasha timeline, planetary strengths, or remedial suggestions.
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div
              style={{
                maxWidth: '82%',
                padding: '0.75rem 1rem',
                borderRadius: m.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                background: m.role === 'user' ? 'var(--accent-primary)' : 'var(--bg-surface)',
                color: m.role === 'user' ? '#FFF' : 'var(--text-primary)',
                border: m.role === 'user' ? 'none' : '1px solid var(--border-color)',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <SafeMarkdownRenderer content={m.content} />
            </div>

            {m.role === 'assistant' && (
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem', fontSize: '0.7rem' }}>
                <button
                  onClick={() => copyToNotes(m.content)}
                  style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                >
                  📝 Insert to Notes
                </button>
                <button
                  onClick={() => navigator.clipboard?.writeText(m.content)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                >
                  📋 Copy
                </button>
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{ padding: '0.5rem 0.9rem', background: 'var(--bg-subtle)', borderRadius: '12px 12px 12px 2px', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
              ⏳ Jyoti is synthesizing astrological charts...
            </div>
          </div>
        )}

        {error && (
          <div style={{ textAlign: 'center', color: 'var(--badge-danger-text)', fontSize: '0.8rem' }}>⚠️ {error}</div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Message Input */}
      <div style={{ borderTop: '1px solid var(--border-color)', padding: '0.75rem 1rem', display: 'flex', gap: '0.5rem', background: 'var(--bg-surface)' }}>
        <input
          type="text"
          className="input-control"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask Jyoti about placements, houses, dashas..."
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          disabled={loading}
          style={{ flex: 1, fontSize: '0.875rem' }}
        />
        <button
          onClick={() => handleSend()}
          className="btn btn-primary"
          style={{ fontSize: '0.82rem' }}
          disabled={loading || !input.trim()}
        >
          Send
        </button>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------
// Reports Panel
// -----------------------------------------------------------------------

function ReportsPanel({ birthProfileId }: { birthProfileId: string }) {
  const { reports, refresh } = useLiveSession();
  const { hasPermission } = useAuth();
  const [regenerating, setRegenerating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRegenerate = async (reportId: string) => {
    if (!confirm('Regenerate this report? This will queue a fresh compilation job.')) return;
    setRegenerating(reportId);
    setError(null);
    try {
      await apiFetch(`/api/v1/admin/reports/${reportId}/regenerate`, { method: 'POST' });
      await refresh();
    } catch (err: any) {
      setError(err?.message || 'Failed to regenerate report');
    } finally {
      setRegenerating(null);
    }
  };

  const statusBadgeClass = (status: string) => {
    if (status === 'COMPLETED') return 'badge-success';
    if (status === 'FAILED') return 'badge-danger';
    if (['QUEUED', 'PENDING', 'CALCULATING', 'ANALYZING', 'RENDERING', 'COMPILING'].includes(status)) return 'badge-warning';
    return 'badge-info';
  };

  return (
    <div style={{ padding: '1.25rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>📄 Comprehensive Reports</h2>
        <button onClick={refresh} className="btn btn-secondary" style={{ fontSize: '0.8rem' }}>
          🔄 Refresh
        </button>
      </div>

      {error && (
        <div style={{ background: '#FEF2F2', color: '#B91C1C', padding: '0.75rem', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.85rem' }}>
          ⚠️ {error}
        </div>
      )}

      {reports.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
          No reports generated for this birth profile yet.
        </div>
      ) : (
        <div className="table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Report Type</th>
                <th>Status</th>
                <th>Progress</th>
                <th>Created</th>
                <th>Completed</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r) => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 600 }}>{r.reportType.replace(/_/g, ' ')}</td>
                  <td>
                    <span className={`badge ${statusBadgeClass(r.status)}`} style={{ fontSize: '0.7rem' }}>
                      {r.status}
                    </span>
                    {r.stage && r.status !== 'COMPLETED' && (
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>{r.stage}</div>
                    )}
                  </td>
                  <td>
                    {r.status !== 'COMPLETED' && r.status !== 'FAILED' && (
                      <div style={{ background: '#E2E8F0', borderRadius: '9999px', height: '6px', width: '80px', overflow: 'hidden' }}>
                        <div style={{ width: `${r.progress}%`, background: 'var(--accent-primary)', height: '100%', transition: 'width 0.3s' }} />
                      </div>
                    )}
                    {r.status === 'COMPLETED' && <span style={{ color: '#047857', fontSize: '0.8rem', fontWeight: 600 }}>100%</span>}
                    {r.status === 'FAILED' && <span style={{ color: '#B91C1C', fontSize: '0.75rem' }}>{r.errorCode || 'Failed'}</span>}
                  </td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{formatDate(r.createdAt)}</td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{r.completedAt ? formatDate(r.completedAt) : '—'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.35rem' }}>
                      <Link
                        href={`/reports/${r.id}`}
                        className="btn btn-secondary"
                        style={{ padding: '0.2rem 0.5rem', fontSize: '0.72rem' }}
                      >
                        View
                      </Link>
                      {hasPermission('reports:regenerate') && r.status === 'COMPLETED' && (
                        <button
                          onClick={() => handleRegenerate(r.id)}
                          className="btn btn-secondary"
                          style={{ padding: '0.2rem 0.5rem', fontSize: '0.72rem' }}
                          disabled={regenerating === r.id}
                        >
                          {regenerating === r.id ? '...' : 'Regen'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------
// Observations Toolbar (Bottom of Main Area)
// -----------------------------------------------------------------------

function ObservationsToolbar({ currentSection }: { currentSection: string }) {
  const { session, addObservation } = useLiveSession();
  const [adding, setAdding] = useState(false);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (session?.status !== 'ACTIVE') return null;

  const TAG_OPTIONS: { tag: ObservationTag; label: string; icon: string }[] = [
    { tag: 'IMPORTANT', label: 'Important', icon: '⚠️' },
    { tag: 'FOLLOW_UP', label: 'Follow-up', icon: '🔄' },
    { tag: 'DISCUSSED', label: 'Discussed', icon: '✅' },
    { tag: 'REPORT_NEEDED', label: 'Report Needed', icon: '📄' },
  ];

  const handleAdd = async (tag: ObservationTag) => {
    setAdding(true);
    setError(null);
    try {
      await addObservation(tag, note || undefined, currentSection !== 'notes' ? currentSection : undefined);
      setNote('');
    } catch (err: any) {
      setError(err?.message || 'Failed to add observation');
    } finally {
      setAdding(false);
    }
  };

  return (
    <div style={{
      borderTop: '1px solid var(--border-color)',
      background: 'var(--bg-subtle)',
      padding: '0.45rem 1rem',
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      flexWrap: 'wrap',
    }}>
      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>Mark Observation:</span>
      {TAG_OPTIONS.map(({ tag, label, icon }) => (
        <button
          key={tag}
          onClick={() => handleAdd(tag)}
          disabled={adding}
          style={{
            padding: '0.2rem 0.55rem',
            border: '1px solid var(--border-color)',
            borderRadius: '9999px',
            background: 'var(--bg-surface)',
            color: 'var(--text-secondary)',
            fontSize: '0.72rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            fontWeight: 500,
          }}
        >
          {icon} {label}
        </button>
      ))}
      <input
        type="text"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Quick remark..."
        className="input-control"
        style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', flex: 1, minWidth: '120px', maxWidth: '220px' }}
        onKeyDown={(e) => { if (e.key === 'Enter' && note) handleAdd('IMPORTANT'); }}
      />
      {error && <span style={{ color: 'var(--badge-danger-text)', fontSize: '0.72rem' }}>⚠️ {error}</span>}
    </div>
  );
}

// -----------------------------------------------------------------------
// Timeline Panel
// -----------------------------------------------------------------------

function TimelinePanel() {
  const { session, notes, observations, reports } = useLiveSession();

  interface TimelineEvent {
    time: string;
    icon: string;
    text: string;
    color: string;
  }

  const events: TimelineEvent[] = [];

  if (session?.startedAt) {
    events.push({ time: session.startedAt, icon: '🚀', text: 'Consultation session initiated', color: '#059669' });
  }

  notes.forEach((n) => {
    events.push({
      time: n.createdAt,
      icon: '📝',
      text: `Note added${n.section ? ` (${SECTION_LABELS[n.section] || n.section})` : ''}${n.subject ? ` — ${n.subject}` : ''}`,
      color: '#4338CA',
    });
  });

  observations.forEach((o) => {
    const style = OBSERVATION_TAG_COLORS[o.tag as ObservationTag];
    events.push({
      time: o.createdAt,
      icon: style?.icon || '•',
      text: `Observation: ${o.tag.replace('_', ' ')}${o.section ? ` (@${SECTION_LABELS[o.section] || o.section})` : ''}${o.note ? ` — "${o.note}"` : ''}`,
      color: style?.text || '#0F172A',
    });
  });

  reports.forEach((r) => {
    if (r.completedAt) {
      events.push({ time: r.completedAt, icon: '✅', text: `Report ${r.reportType.replace(/_/g, ' ')} finalized`, color: '#047857' });
    }
  });

  if (session?.endedAt) {
    events.push({ time: session.endedAt, icon: '🔒', text: 'Consultation session completed', color: '#64748B' });
  }

  events.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

  return (
    <div style={{ padding: '1.25rem' }}>
      <h2 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '1.25rem' }}>📋 Session Timeline</h2>
      {events.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>No events recorded yet.</div>
      ) : (
        <div style={{ position: 'relative', paddingLeft: '2rem' }}>
          <div style={{ position: 'absolute', left: '0.75rem', top: 0, bottom: 0, width: '2px', background: 'var(--border-color)' }} />
          {events.map((ev, i) => (
            <div key={i} style={{ position: 'relative', marginBottom: '1.25rem' }}>
              <div style={{
                position: 'absolute', left: '-1.75rem',
                width: '1.25rem', height: '1.25rem',
                borderRadius: '50%', background: '#FFF',
                border: '2px solid var(--border-color)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.7rem',
              }}>
                {ev.icon}
              </div>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: ev.color }}>{ev.text}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{formatDate(ev.time)}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------
// Past Sessions History Panel
// -----------------------------------------------------------------------

function HistoryPanel() {
  const { previousSessions } = useLiveSession();

  return (
    <div style={{ padding: '1.25rem' }}>
      <h2 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '1rem' }}>🕐 Previous Consultations</h2>
      {previousSessions.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2.5rem' }}>
          No previous consultations found for this client.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {previousSessions.map((s) => (
            <div key={s.id} className="card" style={{ padding: '1rem' }}>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                    {new Date(s.startedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {s.astrologerEmail} · {s.durationSeconds ? `${Math.round(s.durationSeconds / 60)} min` : 'Completed'}
                  </div>
                </div>
                <span className={`badge ${s.status === 'COMPLETED' ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: '0.7rem' }}>
                  {s.status}
                </span>
                <div style={{ marginLeft: 'auto', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  {s.notesCount} notes · {s.observationsCount} observations
                </div>
                <Link href={`/live-sessions/${s.id}`} className="btn btn-secondary" style={{ padding: '0.25rem 0.6rem', fontSize: '0.72rem' }}>
                  Open Archive →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------
// End Session Confirmation Modal
// -----------------------------------------------------------------------

function EndSessionModal({
  onConfirm,
  onCancel,
  summary,
}: {
  onConfirm: () => void;
  onCancel: () => void;
  summary: { notesCount: number; observationsCount: number; duration: string };
}) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
    }}>
      <div className="card" style={{ maxWidth: '440px', width: '90%', padding: '1.75rem' }}>
        <h3 style={{ marginTop: 0, fontSize: '1.1rem', fontWeight: 700 }}>End Consultation?</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
          This will permanently conclude the live consultation. All notes, observations, and chart insights will be preserved for history and reporting.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <div style={{ textAlign: 'center', padding: '0.65rem', background: 'var(--bg-subtle)', borderRadius: '8px' }}>
            <div style={{ fontSize: '1.15rem', fontWeight: 700, fontFamily: 'monospace' }}>{summary.duration}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Duration</div>
          </div>
          <div style={{ textAlign: 'center', padding: '0.65rem', background: 'var(--bg-subtle)', borderRadius: '8px' }}>
            <div style={{ fontSize: '1.15rem', fontWeight: 700 }}>{summary.notesCount}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Notes</div>
          </div>
          <div style={{ textAlign: 'center', padding: '0.65rem', background: 'var(--bg-subtle)', borderRadius: '8px' }}>
            <div style={{ fontSize: '1.15rem', fontWeight: 700 }}>{summary.observationsCount}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Observations</div>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
          <button onClick={onCancel} className="btn btn-secondary">Cancel</button>
          <button
            onClick={onConfirm}
            style={{ background: '#7F1D1D', border: '1px solid #991B1B', color: '#FCA5A5', borderRadius: '4px', padding: '0.5rem 1rem', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}
          >
            🔒 Conclude Consultation
          </button>
        </div>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------
// Main ConsultationWorkspace Component
// -----------------------------------------------------------------------

export function ConsultationWorkspace() {
  const {
    session,
    birthProfile,
    client,
    loading,
    error,
    isAuthExpired,
    notes,
    observations,
    reports,
    elapsedSeconds,
    hasUnsavedChanges,
    endSession,
    activeSection,
    setActiveSection,
    recordSectionVisit,
  } = useLiveSession();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [clientPanelOpen, setClientPanelOpen] = useState(true);
  const [showEndModal, setShowEndModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);

  const navigate = useCallback(
    (section: string) => {
      if (hasUnsavedChanges && section !== activeSection && activeSection === 'notes') {
        if (!confirm('You have unsaved changes in notes. Leave without saving?')) return;
      }
      setActiveSection(section);
      recordSectionVisit(section, SECTION_LABELS[section] || section);
    },
    [hasUnsavedChanges, activeSection, setActiveSection, recordSectionVisit]
  );

  // Global Keyboard Shortcuts Handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInputFocused = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);

      // Cmd+K or Ctrl+K for search
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setShowSearchModal((v) => !v);
        return;
      }

      // If user is typing in an input, do not intercept regular keys or Alt keys
      if (isInputFocused) return;

      // ? for shortcuts
      if (e.key === '?') {
        e.preventDefault();
        setShowShortcutsModal((v) => !v);
        return;
      }

      // Alt key navigation shortcuts
      if (e.altKey) {
        switch (e.key) {
          case '1': e.preventDefault(); navigate('birth-chart'); break;
          case '2': e.preventDefault(); navigate('planets'); break;
          case '3': e.preventDefault(); navigate('houses'); break;
          case '4': e.preventDefault(); navigate('vargas'); break;
          case '5': e.preventDefault(); navigate('dashas'); break;
          case '6': e.preventDefault(); navigate('yogas'); break;
          case '7': e.preventDefault(); navigate('panchanga'); break;
          case '8': e.preventDefault(); navigate('ashtakavarga'); break;
          case '9': e.preventDefault(); navigate('shadbala'); break;
          case '0': e.preventDefault(); navigate('kp'); break;
          case 'n': case 'N': e.preventDefault(); navigate('notes'); break;
          case 'j': case 'J': e.preventDefault(); navigate('jyoti'); break;
          case 'r': case 'R': e.preventDefault(); navigate('reports'); break;
          case 't': case 'T': e.preventDefault(); navigate('timeline'); break;
          case 'h': case 'H': e.preventDefault(); navigate('history'); break;
          case 's': case 'S': e.preventDefault(); setSidebarOpen((v) => !v); break;
          case 'c': case 'C': e.preventDefault(); setClientPanelOpen((v) => !v); break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  // Unsaved changes beforeunload protection
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const handleEndSessionClick = () => {
    if (hasUnsavedChanges) {
      if (!confirm('You have unsaved changes. End consultation anyway?')) return;
    }
    setShowEndModal(true);
  };

  const handleConfirmEnd = async () => {
    try {
      await endSession();
      setShowEndModal(false);
    } catch (err: any) {
      alert(err?.message || 'Failed to end session');
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '2rem' }}>
        <div className="skeleton" style={{ height: '48px', width: '100%', marginBottom: '1.25rem' }} />
        <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr 240px', gap: '1rem', height: '500px' }}>
          <div className="skeleton" style={{ height: '100%' }} />
          <div className="skeleton" style={{ height: '100%' }} />
          <div className="skeleton" style={{ height: '100%' }} />
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <div className="card" style={{ padding: '2rem', maxWidth: '480px', margin: '0 auto' }}>
          <h2 style={{ color: 'var(--badge-danger-text)', marginBottom: '0.5rem' }}>Session Not Found</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>{error || 'This consultation session could not be loaded.'}</p>
          <Link href="/live-sessions" className="btn btn-secondary">← Back to Consultations</Link>
        </div>
      </div>
    );
  }

  const isReadOnly = session.status !== 'ACTIVE';

  return (
    <div style={{ margin: '-1.5rem', height: 'calc(100vh - 60px)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Session Header */}
      <SessionHeader
        onEndSession={handleEndSessionClick}
        onToggleSidebar={() => setSidebarOpen((v) => !v)}
        sidebarOpen={sidebarOpen}
        onOpenSearch={() => setShowSearchModal(true)}
        onOpenShortcuts={() => setShowShortcutsModal(true)}
      />

      {/* Auth Expired Warning Banner */}
      {isAuthExpired && (
        <div style={{
          background: '#FEF2F2', borderBottom: '1px solid #FECACA',
          padding: '0.5rem 1rem', fontSize: '0.8rem', color: '#991B1B', textAlign: 'center',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem',
        }}>
          <span>⚠️ Your authentication session has expired. Draft notes are safely stored in local browser cache.</span>
          <Link href="/login" style={{ color: 'var(--accent-primary)', fontWeight: 700, textDecoration: 'underline' }}>
            Re-login now →
          </Link>
        </div>
      )}

      {/* Read-Only Status Banner */}
      {isReadOnly && (
        <div style={{
          background: '#FFFBEB', borderBottom: '1px solid #FDE68A',
          padding: '0.45rem 1rem', fontSize: '0.8rem', color: '#92400E', textAlign: 'center',
        }}>
          📖 This consultation is closed. Notes and astrology charts are archived in read-only mode.
          <Link href="/live-sessions" style={{ marginLeft: '1rem', color: 'var(--accent-primary)', fontSize: '0.8rem', fontWeight: 600 }}>
            Start new consultation →
          </Link>
        </div>
      )}

      {/* Main Workspace Body */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Left Navigation Sidebar */}
        {sidebarOpen && (
          <div style={{
            width: '180px', background: '#0F172A', display: 'flex', flexDirection: 'column',
            borderRight: '1px solid #1E293B', flexShrink: 0,
          }}>
            <QuickNav onNavigate={navigate} />
          </div>
        )}

        {/* Main Content Pane */}
        <div style={{ flex: 1, overflowY: 'auto', minWidth: 0, display: 'flex', flexDirection: 'column', background: 'var(--bg-main)' }}>
          {/* Section Breadcrumbs / Title Bar */}
          <div style={{
            padding: '0.65rem 1.25rem', borderBottom: '1px solid var(--border-color)',
            background: 'var(--bg-surface)', display: 'flex', alignItems: 'center', gap: '0.75rem',
          }}>
            <h2 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
              {SECTION_LABELS[activeSection] || activeSection}
            </h2>
            {birthProfile && !['notes', 'reports', 'timeline', 'history', 'jyoti'].includes(activeSection) && (
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                — {birthProfile.name}
              </span>
            )}
            <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={() => setClientPanelOpen((v) => !v)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.75rem' }}
                title={clientPanelOpen ? 'Hide client panel' : 'Show client panel'}
              >
                {clientPanelOpen ? '⊟ Client Panel' : '⊞ Client Panel'}
              </button>
            </div>
          </div>

          {/* Section Dynamic Content */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {birthProfile && !['notes', 'reports', 'timeline', 'history', 'jyoti'].includes(activeSection) && (
              <AstrologyPanel sectionKey={activeSection} birthProfile={birthProfile} />
            )}
            {activeSection === 'notes' && <NotesPanel currentSection="notes" />}
            {activeSection === 'reports' && birthProfile && (
              <ReportsPanel birthProfileId={birthProfile.id} />
            )}
            {activeSection === 'timeline' && <TimelinePanel />}
            {activeSection === 'history' && <HistoryPanel />}
            {activeSection === 'jyoti' && birthProfile && <JyotiPanel birthProfileId={birthProfile.id} />}
          </div>

          {/* Quick Observations Toolbar (at bottom of astrology workspace) */}
          {!['notes', 'timeline', 'history'].includes(activeSection) && (
            <ObservationsToolbar currentSection={activeSection} />
          )}
        </div>

        {/* Right Client Context Sidebar */}
        {clientPanelOpen && (
          <div style={{
            width: '230px', background: '#0F172A', display: 'flex', flexDirection: 'column',
            borderLeft: '1px solid #1E293B', flexShrink: 0,
          }}>
            <ClientContextPanel onNavigate={navigate} />
          </div>
        )}
      </div>

      {/* End Consultation Modal */}
      {showEndModal && (
        <EndSessionModal
          onConfirm={handleConfirmEnd}
          onCancel={() => setShowEndModal(false)}
          summary={{
            notesCount: notes.length,
            observationsCount: observations.length,
            duration: formatDuration(elapsedSeconds),
          }}
        />
      )}

      {/* Live Session Quick Search Palette (Cmd+K) */}
      <LiveSessionSearchModal
        isOpen={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        onNavigate={navigate}
        notes={notes}
        reports={reports}
      />

      {/* Keyboard Shortcuts Cheat-Sheet Modal */}
      <KeyboardShortcutsModal
        isOpen={showShortcutsModal}
        onClose={() => setShowShortcutsModal(false)}
      />
    </div>
  );
}
