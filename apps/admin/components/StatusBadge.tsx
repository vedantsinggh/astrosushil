import React from 'react';

export function StatusBadge({ status }: { status?: string }) {
  if (!status) return <span className="badge badge-info">UNKNOWN</span>;

  const s = status.toUpperCase();
  let badgeClass = 'badge-info';

  if (['COMPLETED', 'HEALTHY', 'PAID', 'SUCCESS', 'VERIFIED'].includes(s)) {
    badgeClass = 'badge-success';
  } else if (['FAILED', 'UNAVAILABLE', 'ERROR', 'REFUNDED'].includes(s)) {
    badgeClass = 'badge-danger';
  } else if (['QUEUED', 'CALCULATING', 'ANALYZING', 'RENDERING', 'COMPILING', 'PENDING', 'DEGRADED', 'CONFIGURATION_ERROR'].includes(s)) {
    badgeClass = 'badge-warning';
  }

  return <span className={`badge ${badgeClass}`}>{status}</span>;
}
