'use client';

import React, { useState } from 'react';
import { useAuth } from '../../lib/auth-context';

export default function AstrologyDiagnosticsPage() {
  const { fetchWithAuth } = useAuth();
  const [profileId, setProfileId] = useState('');
  const [domain, setDomain] = useState('CAREER');
  const [loading, setLoading] = useState(false);
  const [evidenceData, setEvidenceData] = useState<any>(null);
  const [predictionsData, setPredictionsData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRunDiagnostics = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileId.trim()) return;
    setLoading(true);
    setError(null);
    setEvidenceData(null);
    setPredictionsData(null);

    try {
      const [evRes, predRes] = await Promise.all([
        fetchWithAuth('/api/v1/astrology/evidence', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ birthProfileId: profileId.trim(), domain }),
        }),
        fetchWithAuth('/api/v1/astrology/predictions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ birthProfileId: profileId.trim(), category: domain }),
        }),
      ]);

      if (evRes.ok) {
        const evJson = await evRes.json();
        setEvidenceData(evJson.data);
      } else {
        const errJson = await evRes.json().catch(() => ({}));
        setError(errJson.error?.message || 'Failed to fetch astrology evidence');
      }

      if (predRes.ok) {
        const predJson = await predRes.json();
        setPredictionsData(predJson.data);
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#FFF' }}>
          🔮 Astrology Intelligence & Diagnostics
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          Inspect deterministic chart evidence, extracted facts, triggered rules, and explanation traces for any birth profile.
        </p>
      </div>

      <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem', background: '#1E293B', borderRadius: '8px' }}>
        <form onSubmit={handleRunDiagnostics} style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '250px' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', color: '#94A3B8', marginBottom: '0.25rem' }}>
              Birth Profile UUID
            </label>
            <input
              type="text"
              placeholder="e.g. 33333333-3333-3333-3333-333333333333"
              value={profileId}
              onChange={(e) => setProfileId(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem',
                borderRadius: '4px',
                border: '1px solid #334155',
                background: '#0F172A',
                color: '#FFF',
              }}
              required
            />
          </div>

          <div style={{ width: '180px' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', color: '#94A3B8', marginBottom: '0.25rem' }}>
              Domain Category
            </label>
            <select
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem',
                borderRadius: '4px',
                border: '1px solid #334155',
                background: '#0F172A',
                color: '#FFF',
              }}
            >
              <option value="CAREER">CAREER</option>
              <option value="MONEY">MONEY</option>
              <option value="EDUCATION">EDUCATION</option>
              <option value="RELATIONSHIPS">RELATIONSHIPS</option>
              <option value="HEALTH_GENERAL">HEALTH_GENERAL</option>
              <option value="PERSONALITY">PERSONALITY</option>
              <option value="TIMING">TIMING</option>
            </select>
          </div>

          <div style={{ alignSelf: 'flex-end' }}>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '0.5rem 1.25rem',
                borderRadius: '4px',
                background: '#3B82F6',
                color: '#FFF',
                fontWeight: 600,
                border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? 'Inspecting...' : 'Run Diagnostics'}
            </button>
          </div>
        </form>
      </div>

      {error && (
        <div style={{ padding: '1rem', background: '#450A0A', color: '#FCA5A5', borderRadius: '6px', marginBottom: '1.5rem' }}>
          ⚠️ {error}
        </div>
      )}

      {evidenceData && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          {/* Evidence Facts */}
          <div className="card" style={{ padding: '1.25rem', background: '#1E293B', borderRadius: '8px' }}>
            <h3 style={{ color: '#FFF', fontSize: '1.1rem', marginBottom: '1rem', borderBottom: '1px solid #334155', paddingBottom: '0.5rem' }}>
              🎯 Deterministic Evidence Facts ({evidenceData.evidence?.supportingFacts?.length || 0})
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#94A3B8', marginBottom: '0.75rem' }}>
              Overall Strength: <strong>{evidenceData.evidence?.overallStrength}</strong> | Confidence: <strong>{evidenceData.evidence?.confidence}</strong>
            </p>
            <ul style={{ paddingLeft: '1.2rem', color: '#E2E8F0', fontSize: '0.85rem' }}>
              {evidenceData.evidence?.supportingFacts?.map((fact: any, idx: number) => (
                <li key={idx} style={{ marginBottom: '0.5rem' }}>
                  <span style={{ color: '#38BDF8', fontWeight: 600 }}>[{fact.source}]</span> {fact.factText}
                </li>
              ))}
            </ul>
          </div>

          {/* Predictions & Triggered Rules */}
          <div className="card" style={{ padding: '1.25rem', background: '#1E293B', borderRadius: '8px' }}>
            <h3 style={{ color: '#FFF', fontSize: '1.1rem', marginBottom: '1rem', borderBottom: '1px solid #334155', paddingBottom: '0.5rem' }}>
              ⚡ Deterministic Predictions & Rules
            </h3>
            {predictionsData?.trace?.triggeredRules && (
              <div style={{ marginBottom: '1rem' }}>
                <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>Triggered Rules: </span>
                {predictionsData.trace.triggeredRules.map((rule: string, i: number) => (
                  <span key={i} style={{ background: '#334155', color: '#F1F5F9', padding: '0.15rem 0.4rem', borderRadius: '4px', fontSize: '0.7rem', marginRight: '0.3rem' }}>
                    {rule}
                  </span>
                ))}
              </div>
            )}
            {predictionsData?.predictions?.map((pred: any, idx: number) => (
              <div key={idx} style={{ background: '#0F172A', padding: '0.75rem', borderRadius: '6px', marginBottom: '0.75rem' }}>
                <div style={{ fontWeight: 'bold', color: '#FFF', fontSize: '0.9rem' }}>{pred.title}</div>
                <div style={{ fontSize: '0.75rem', color: '#A855F7', margin: '0.2rem 0' }}>Confidence: {pred.confidence} | Rule: {pred.ruleCode}</div>
                <div style={{ fontSize: '0.8rem', color: '#CBD5E1' }}>{pred.interpretationText}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
