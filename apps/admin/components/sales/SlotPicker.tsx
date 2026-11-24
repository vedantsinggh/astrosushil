'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '../../lib/auth-context';
import { AdminSlot, getAdminSlots } from '../../lib/api/bookings';
import { errorMessage } from '../../lib/api/sales';
import { Field } from './ui';

/**
 * Slots of a date from the admin slots endpoint (`GET /admin/availability/slots`, permission
 * `availability:read`), with the slot length of the chosen consultation. Booked and held slots
 * cannot be chosen; blocked ones can (staff may book over a block). Without the permission the
 * picker falls back to a start-time box; the server works out the end from the duration.
 */
export function SlotPicker({
  date,
  consultationId,
  value,
  onChange,
  currentSlot,
}: {
  date: string;
  consultationId?: string;
  value: string;
  onChange: (slot: string) => void;
  /** The booking's present slot on this date (shown as "current", not selectable). */
  currentSlot?: string;
}) {
  const { hasPermission } = useAuth();
  const allowed = hasPermission('availability:read');
  const [slots, setSlots] = useState<AdminSlot[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!allowed || !date) {
      setSlots([]);
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    getAdminSlots(date, consultationId)
      .then((rows) => {
        if (!cancelled) setSlots(rows);
      })
      .catch((err) => {
        if (!cancelled) {
          setSlots([]);
          setError(errorMessage(err));
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [allowed, date, consultationId]);

  if (!allowed) {
    return (
      <Field label="Start time (IST) *" hint="Your account cannot list slots (needs availability:read), so type the start time. The server refuses a time that overlaps another booking.">
        <input type="time" className="input-control" style={{ maxWidth: 180 }} value={value} onChange={(e) => onChange(e.target.value)} />
      </Field>
    );
  }

  if (!date) return <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Choose a date to see its slots.</p>;
  if (isLoading) return <div className="skeleton" style={{ height: '80px', width: '100%' }} />;
  if (error) return <div style={{ color: 'var(--badge-danger-text)', fontSize: '0.85rem' }}>Slots could not be loaded: {error}</div>;
  if (slots.length === 0) return <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No slots available for this date.</p>;

  return (
    <div>
      <div role="radiogroup" aria-label="Slot" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.4rem' }}>
        {slots.map((slot) => {
          const isCurrent = currentSlot === slot.slot;
          const taken = slot.status !== 'available' || isCurrent;
          const isSelected = value === slot.slot;
          return (
            <button
              key={slot.slot}
              type="button"
              role="radio"
              aria-checked={isSelected}
              disabled={taken}
              onClick={() => onChange(slot.slot)}
              style={{
                border: isSelected ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
                background: isSelected ? 'var(--badge-info-bg)' : taken ? 'var(--bg-subtle)' : 'var(--bg-surface)',
                color: taken ? 'var(--text-muted)' : 'var(--text-primary)',
                borderRadius: 'var(--radius-sm)',
                padding: '0.4rem 0.5rem',
                fontSize: '0.8rem',
                cursor: taken ? 'not-allowed' : 'pointer',
                textAlign: 'left',
              }}
            >
              <div style={{ fontWeight: 600 }}>{slot.slot}</div>
              <div style={{ fontSize: '0.7rem' }}>
                {isCurrent ? 'Current time' : slot.status === 'booked' ? 'Booked' : slot.status === 'held' ? 'Held (customer paying)' : slot.blocked ? 'Blocked for customers' : 'Free'}
              </div>
            </button>
          );
        })}
      </div>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.72rem', marginTop: '0.5rem' }}>
        Times are Indian Standard Time. A slot blocked for customers can still be used by staff; a booked or held one cannot.
      </p>
    </div>
  );
}
