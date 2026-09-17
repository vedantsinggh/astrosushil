'use client';

import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../lib/api-client';
import { StatusBadge } from '../../components/StatusBadge';

interface ServiceHealthItem {
  status: string;
  latencyMs?: number;
  provider?: string;
  model?: string;
  type?: string;
}

interface SystemHealthResponse {
  timestamp: string;
  services: {
    api?: ServiceHealthItem;
    database?: ServiceHealthItem;
    astrologyEngine?: ServiceHealthItem;
    gemini?: ServiceHealthItem;
    openrouter?: ServiceHealthItem;
    storage?: ServiceHealthItem;
  };
}

export default function SystemHealthPage() {
  const [health, setHealth] = useState<SystemHealthResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHealth = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiFetch<SystemHealthResponse>('/api/v1/admin/system/health');
      setHealth(res);
    } catch (err: any) {
      setError(err?.message || 'Failed to perform system health check');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  const aiHealth = health?.services?.openrouter || health?.services?.gemini;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 className="page-title">System Infrastructure & Health</h1>
          <p className="page-subtitle">Real-time health verification for database, calculation engines, AI, and storage</p>
        </div>
        <button onClick={fetchHealth} className="btn btn-primary" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span>⚡</span> Run Health Checks
        </button>
      </div>

      {error && (
        <div className="badge badge-danger" style={{ padding: '1rem', borderRadius: 'var(--radius-md)', width: '100%', marginBottom: '1.5rem', display: 'block' }}>
          {error}
        </div>
      )}

      {/* HEALTH CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
        {/* API CARD */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Fastify API Backend</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Node.js Fastify Rest Server</p>
            </div>
            <StatusBadge status={health?.services?.api?.status || 'UNKNOWN'} />
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Measured Latency: <strong>{health?.services?.api?.latencyMs || 1} ms</strong>
          </div>
        </div>

        {/* DATABASE CARD */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>PostgreSQL Database</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Prisma ORM Connection Pool</p>
            </div>
            <StatusBadge status={health?.services?.database?.status || 'UNKNOWN'} />
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Query Latency: <strong>{health?.services?.database?.latencyMs || 0} ms</strong>
          </div>
        </div>

        {/* ASTROLOGY ENGINE CARD */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Astrology Calculation Engine</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>@astro/astrology-engine (Sidereal/Lahiri)</p>
            </div>
            <StatusBadge status={health?.services?.astrologyEngine?.status || 'UNKNOWN'} />
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Execution Latency: <strong>{health?.services?.astrologyEngine?.latencyMs || 0} ms</strong>
          </div>
        </div>

        {/* AI PROVIDER CARD */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>
                {health?.services?.openrouter ? 'OpenRouter AI Provider' : 'Gemini AI Provider'}
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                {aiHealth?.provider || aiHealth?.model || (health?.services?.openrouter ? 'OpenRouter LLM' : 'Google Gemini AI')}
              </p>
            </div>
            <StatusBadge status={aiHealth?.status || 'UNKNOWN'} />
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            API Status: <strong>{aiHealth?.status === 'HEALTHY' ? 'Key Configured & Active' : 'Configuration Check Failed'}</strong>
          </div>
        </div>

        {/* REPORT STORAGE CARD */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>PDF & Report Storage</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Local & AWS S3 PDF Bucket</p>
            </div>
            <StatusBadge status={health?.services?.storage?.status || 'UNKNOWN'} />
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Storage Type: <strong>{health?.services?.storage?.type || 'Local/S3'}</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
