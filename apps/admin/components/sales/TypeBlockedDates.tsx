'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '../../lib/auth-context';
import { blockConsultationTypeDate, unblockConsultationTypeDate } from '../../lib/api/bookings';
import { errorMessage } from '../../lib/api/sales';
import { formatDay, todayIst } from './format';
import { ErrorBanner, tinyButton } from './ui';

/** Dates on which one consultation type cannot be booked by customers (other types stay bookable). */
export function TypeBlockedDates({ typeId, dates, onChange }: { typeId: string; dates: string[]; onChange: (dates: string[]) => void }) {
  const { hasPermission } = useAuth();
  const canEdit = hasPermission('consultations:update');
  const [date, setDate] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const today = todayIst();

  useEffect(() => {
    setDate('');
    setError(null);
  }, [typeId]);

  const run = async (action: () => Promise<string[]>) => {
    setBusy(true);
    setError(null);
    try {
      onChange(await action());
      setDate('');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const sorted = [...dates].sort();

  return (
    <div>
      <ErrorBanner message={error} />
      {canEdit && (
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
          <input type="date" className="input-control" style={{ maxWidth: 200 }} value={date} min={today} onChange={(e) => setDate(e.target.value)} />
          <button type="button" className="btn btn-primary" disabled={!date || busy || dates.includes(date)} onClick={() => run(() => blockConsultationTypeDate(typeId, date))}>
            Block this date
          </button>
        </div>
      )}
      {sorted.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No dates blocked for this consultation.</p>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
          {sorted.map((d) => (
            <span key={d} className={`badge ${d < today ? 'badge-info' : 'badge-danger'}`} style={{ textTransform: 'none' }}>
              {formatDay(d)}
              {canEdit && (
                <button type="button" className="btn btn-secondary" style={{ ...tinyButton, marginLeft: '0.4rem', padding: '0 0.35rem' }} disabled={busy} aria-label={`Unblock ${d}`} onClick={() => run(() => unblockConsultationTypeDate(typeId, d))}>
                  ×
                </button>
              )}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
