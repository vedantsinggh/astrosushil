'use client';

import React from 'react';
import { smallButton } from './ui';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export interface CalendarMonth {
  year: number;
  /** 1 to 12. */
  month: number;
}

export function monthOf(day: string): CalendarMonth {
  const [year, month] = day.split('-').map(Number);
  return { year, month };
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

export function shiftMonth(value: CalendarMonth, delta: number): CalendarMonth {
  const index = value.year * 12 + (value.month - 1) + delta;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

/**
 * A month grid of calendar days (YYYY-MM-DD strings, no timezone arithmetic).
 * `blocked`: dates closed for every consultation. `weeklyOff`: weekdays (0 = Sunday) that are never open.
 */
export function MonthCalendar({
  value,
  onChange,
  today,
  selected,
  blocked,
  weeklyOff = [],
  typeBlocked = [],
  onSelect,
}: {
  value: CalendarMonth;
  onChange: (next: CalendarMonth) => void;
  today: string;
  selected: string | null;
  blocked: string[];
  weeklyOff?: number[];
  typeBlocked?: string[];
  onSelect: (day: string) => void;
}) {
  const firstWeekday = new Date(Date.UTC(value.year, value.month - 1, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(value.year, value.month, 0)).getUTCDate();
  const title = new Date(Date.UTC(value.year, value.month - 1, 1)).toLocaleDateString('en-IN', { timeZone: 'UTC', month: 'long', year: 'numeric' });

  const cells: Array<string | null> = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(`${value.year}-${pad(value.month)}-${pad(d)}`);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <button type="button" className="btn btn-secondary" style={smallButton} onClick={() => onChange(shiftMonth(value, -1))} aria-label="Previous month">
          ←
        </button>
        <strong>{title}</strong>
        <button type="button" className="btn btn-secondary" style={smallButton} onClick={() => onChange(shiftMonth(value, 1))} aria-label="Next month">
          →
        </button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: '4px' }}>
        {WEEKDAYS.map((name, index) => (
          <div key={name} style={{ textAlign: 'center', fontSize: '0.72rem', fontWeight: 600, color: weeklyOff.includes(index) ? 'var(--badge-danger-text)' : 'var(--text-secondary)', padding: '0.25rem 0' }}>
            {name}
          </div>
        ))}
        {cells.map((day, index) => {
          if (!day) return <div key={`blank-${index}`} />;
          const weekday = index % 7;
          const isBlocked = blocked.includes(day);
          const isWeeklyOff = weeklyOff.includes(weekday);
          const isTypeBlocked = typeBlocked.includes(day);
          const isSelected = selected === day;
          const isToday = today === day;
          const isPast = day < today;
          const background = isSelected ? 'var(--accent-primary)' : isBlocked ? 'var(--badge-danger-bg)' : isWeeklyOff ? 'var(--bg-subtle)' : 'var(--bg-surface)';
          const color = isSelected ? '#FFF' : isBlocked ? 'var(--badge-danger-text)' : isPast || isWeeklyOff ? 'var(--text-muted)' : 'var(--text-primary)';
          const label = [day, isBlocked ? 'blocked' : '', isWeeklyOff ? 'weekly day off' : '', isTypeBlocked ? 'blocked for the chosen consultation' : '', isToday ? 'today' : ''].filter(Boolean).join(', ');
          return (
            <button
              key={day}
              type="button"
              onClick={() => onSelect(day)}
              aria-label={label}
              aria-pressed={isSelected}
              title={label}
              style={{
                background,
                color,
                border: isToday ? '2px solid var(--accent-gold)' : '1px solid var(--border-color)',
                borderRadius: 'var(--radius-sm)',
                padding: '0.5rem 0',
                cursor: 'pointer',
                fontSize: '0.85rem',
                fontWeight: isToday || isSelected ? 700 : 500,
                textDecoration: isBlocked ? 'line-through' : 'none',
                position: 'relative',
              }}
            >
              {Number(day.slice(8))}
              {isTypeBlocked && <span aria-hidden style={{ position: 'absolute', top: 3, right: 4, width: 6, height: 6, borderRadius: '50%', background: 'var(--badge-warning-text)' }} />}
            </button>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.75rem' }}>
        <span>
          <span style={{ display: 'inline-block', width: 10, height: 10, background: 'var(--accent-primary)', borderRadius: 2, marginRight: 4 }} />
          Selected
        </span>
        <span>
          <span style={{ display: 'inline-block', width: 10, height: 10, border: '2px solid var(--accent-gold)', borderRadius: 2, marginRight: 4 }} />
          Today
        </span>
        <span>
          <span style={{ display: 'inline-block', width: 10, height: 10, background: 'var(--badge-danger-bg)', border: '1px solid var(--badge-danger-text)', borderRadius: 2, marginRight: 4 }} />
          Blocked day
        </span>
        <span>
          <span style={{ display: 'inline-block', width: 10, height: 10, background: 'var(--bg-subtle)', border: '1px solid var(--border-color)', borderRadius: 2, marginRight: 4 }} />
          Weekly day off
        </span>
        {typeBlocked.length > 0 && (
          <span>
            <span style={{ display: 'inline-block', width: 6, height: 6, background: 'var(--badge-warning-text)', borderRadius: '50%', marginRight: 4 }} />
            Blocked for the chosen consultation
          </span>
        )}
      </div>
    </div>
  );
}
