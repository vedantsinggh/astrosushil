import React from 'react';
import { titleCase } from './format';

type Tone = 'success' | 'warning' | 'danger' | 'info';

const TONES: Record<string, Tone> = {
  // shop order
  payment_pending: 'warning',
  placed: 'info',
  confirmed: 'info',
  processing: 'warning',
  shipped: 'info',
  delivered: 'success',
  cancelled: 'danger',
  payment_failed: 'danger',
  // payment / ledger
  paid: 'success',
  success: 'success',
  pending: 'warning',
  failed: 'danger',
  // booking
  pending_payment: 'warning',
  rescheduled: 'info',
  completed: 'success',
  no_show: 'danger',
  refunded: 'danger',
  // misc
  active: 'success',
  inactive: 'danger',
  allocated: 'success',
  not_required: 'info',
  available: 'success',
  booked: 'info',
  held: 'warning',
  blocked: 'danger',
};

/** A status in the admin's badge colours. The text is the server's value, made readable. */
export function StatusPill({ status, label }: { status: string | null | undefined; label?: string }) {
  if (!status) return <span className="badge badge-info">—</span>;
  const tone = TONES[status.toLowerCase()] ?? 'info';
  return <span className={`badge badge-${tone}`}>{label ?? titleCase(status)}</span>;
}
