'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../lib/auth-context';
import {
  AdminSlot,
  Availability,
  blockDay,
  blockRange,
  blockSlots,
  Booking,
  ConsultationType,
  getAdminSlots,
  getAvailability,
  getBlockedDates,
  getSchedule,
  listBookingsByDate,
  listConsultationTypes,
  MODE_LABELS,
  saveAvailability,
  ScheduleDay,
  unblockDay,
  unblockRange,
  unblockSlots,
} from '../../lib/api/bookings';
import { errorMessage } from '../../lib/api/sales';
import { formatDay, todayIst } from '../../components/sales/format';
import { StatusPill } from '../../components/sales/badges';
import { CalendarMonth, MonthCalendar, monthOf } from '../../components/sales/MonthCalendar';
import { TypeBlockedDates } from '../../components/sales/TypeBlockedDates';
import {
  ConfirmDialog,
  ErrorBanner,
  Field,
  InfoBox,
  PageHeader,
  RequirePermission,
  SectionTitle,
  smallButton,
  StatCard,
  SuccessBanner,
  tinyButton,
} from '../../components/sales/ui';

const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const TIME = /^\d{1,2}:\d{2}$/;

function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

// ---------------------------------------------------------------------------
// Working hours
// ---------------------------------------------------------------------------

interface HoursForm {
  startTime: string;
  endTime: string;
  slotDuration: string;
  gap: string;
  breakStartTime: string;
  breakEndTime: string;
  blockedWeekdays: number[];
  bookingHorizonDays: string;
}

function toForm(a: Availability): HoursForm {
  return {
    startTime: a.startTime,
    endTime: a.endTime,
    slotDuration: String(a.slotDuration),
    gap: String(a.gap),
    breakStartTime: a.breakStartTime ?? '',
    breakEndTime: a.breakEndTime ?? '',
    blockedWeekdays: a.blockedWeekdays,
    bookingHorizonDays: a.bookingHorizonDays === null ? '' : String(a.bookingHorizonDays),
  };
}

/** Mirrors `setAvailabilitySchema` and the service's checks, so staff see the problem before sending. */
function validateHours(form: HoursForm): { errors: string[]; body: Availability | null } {
  const errors: string[] = [];
  if (!TIME.test(form.startTime) || !TIME.test(form.endTime)) errors.push('Give the start and end of the working day');
  else if (toMinutes(form.endTime) <= toMinutes(form.startTime)) errors.push('End time must be after start time');

  const slotDuration = Number(form.slotDuration);
  if (!/^\d+$/.test(form.slotDuration.trim()) || slotDuration < 5 || slotDuration > 480) errors.push('Slot length must be 5 to 480 minutes');
  else if (errors.length === 0 && slotDuration > toMinutes(form.endTime) - toMinutes(form.startTime)) errors.push('Slot length is longer than the working window');

  const gap = Number(form.gap);
  if (!/^\d+$/.test(form.gap.trim()) || gap > 240) errors.push('Gap must be 0 to 240 minutes');

  const hasBreakStart = Boolean(form.breakStartTime);
  const hasBreakEnd = Boolean(form.breakEndTime);
  if (hasBreakStart !== hasBreakEnd) errors.push('Give both the break start and the break end, or neither');
  else if (hasBreakStart && hasBreakEnd) {
    if (toMinutes(form.breakEndTime) <= toMinutes(form.breakStartTime)) errors.push('Break end must be after break start');
    else if (TIME.test(form.startTime) && TIME.test(form.endTime) && (toMinutes(form.breakStartTime) < toMinutes(form.startTime) || toMinutes(form.breakEndTime) > toMinutes(form.endTime))) {
      errors.push('The break must lie inside the working window');
    }
  }

  let horizon: number | null = null;
  if (form.bookingHorizonDays.trim()) {
    if (!/^\d+$/.test(form.bookingHorizonDays.trim()) || Number(form.bookingHorizonDays) < 1 || Number(form.bookingHorizonDays) > 730) errors.push('Booking horizon must be 1 to 730 days, or blank for no limit');
    else horizon = Number(form.bookingHorizonDays);
  }
  if (form.blockedWeekdays.length === 7) errors.push('At least one weekday must stay open');

  if (errors.length > 0) return { errors, body: null };
  return {
    errors,
    body: {
      startTime: form.startTime,
      endTime: form.endTime,
      slotDuration,
      gap,
      breakStartTime: hasBreakStart ? form.breakStartTime : null,
      breakEndTime: hasBreakEnd ? form.breakEndTime : null,
      blockedWeekdays: [...form.blockedWeekdays].sort(),
      bookingHorizonDays: horizon,
    },
  };
}

function WorkingHoursCard({ availability, canEdit, onSaved }: { availability: Availability; canEdit: boolean; onSaved: (saved: Availability) => void }) {
  const [form, setForm] = useState<HoursForm>(() => toForm(availability));
  const [errors, setErrors] = useState<string[]>([]);
  const [serverError, setServerError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const set = <K extends keyof HoursForm>(key: K, value: HoursForm[K]) => setForm((f) => ({ ...f, [key]: value }));

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    const result = validateHours(form);
    setErrors(result.errors);
    setServerError(null);
    setNotice(null);
    if (!result.body) return;
    setIsSaving(true);
    try {
      const saved = await saveAvailability(result.body);
      setForm(toForm(saved));
      setNotice('Availability settings saved! Slots offered from now on follow them; existing bookings are not moved.');
      onSaved(saved);
    } catch (err) {
      setServerError(errorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form className="card" style={{ marginBottom: '1.5rem' }} onSubmit={save}>
      <SectionTitle>Working hours (Indian Standard Time)</SectionTitle>
      <ErrorBanner message={serverError} />
      <SuccessBanner message={notice} onClose={() => setNotice(null)} />
      {errors.length > 0 && <ErrorBanner message={errors.join(' · ')} />}
      <fieldset disabled={!canEdit} style={{ border: 'none', padding: 0, margin: 0 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '1rem' }}>
          <Field label="Day starts *">
            <input type="time" className="input-control" value={form.startTime} onChange={(e) => set('startTime', e.target.value)} />
          </Field>
          <Field label="Day ends *">
            <input type="time" className="input-control" value={form.endTime} onChange={(e) => set('endTime', e.target.value)} />
          </Field>
          <Field label="Slot length (minutes) *" hint="Used when a consultation has no duration of its own, and for this page's slot list">
            <input className="input-control" inputMode="numeric" value={form.slotDuration} onChange={(e) => set('slotDuration', e.target.value)} />
          </Field>
          <Field label="Gap between slots (minutes) *">
            <input className="input-control" inputMode="numeric" value={form.gap} onChange={(e) => set('gap', e.target.value)} />
          </Field>
          <Field label="Break starts" hint="Leave both blank for no break">
            <input type="time" className="input-control" value={form.breakStartTime} onChange={(e) => set('breakStartTime', e.target.value)} />
          </Field>
          <Field label="Break ends">
            <input type="time" className="input-control" value={form.breakEndTime} onChange={(e) => set('breakEndTime', e.target.value)} />
          </Field>
          <Field label="Booking horizon (days)" hint="How far ahead customers can book. Blank = no limit">
            <input className="input-control" inputMode="numeric" value={form.bookingHorizonDays} onChange={(e) => set('bookingHorizonDays', e.target.value)} />
          </Field>
        </div>
        <div style={{ marginTop: '1rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>Weekly days off</div>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            {WEEKDAY_NAMES.map((name, index) => (
              <label key={name} style={{ display: 'flex', gap: '0.35rem', fontSize: '0.85rem' }}>
                <input
                  type="checkbox"
                  checked={form.blockedWeekdays.includes(index)}
                  onChange={(e) => set('blockedWeekdays', e.target.checked ? [...form.blockedWeekdays, index] : form.blockedWeekdays.filter((d) => d !== index))}
                />
                {name}
              </label>
            ))}
          </div>
        </div>
        {canEdit && (
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
            <button type="submit" className="btn btn-primary" disabled={isSaving}>
              {isSaving ? 'Saving…' : 'Save settings'}
            </button>
            <button type="button" className="btn btn-secondary" disabled={isSaving} onClick={() => setForm(toForm(availability))}>
              Reset
            </button>
          </div>
        )}
      </fieldset>
      {!canEdit && <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.75rem' }}>You can view these settings; changing them needs the availability:update permission.</p>}
    </form>
  );
}

// ---------------------------------------------------------------------------
// One day: block state, slots, bookings
// ---------------------------------------------------------------------------

function DayPanel({ day, canEdit, isWeeklyOff, onChanged }: { day: string; canEdit: boolean; isWeeklyOff: boolean; onChanged: () => void }) {
  const { hasPermission } = useAuth();
  const canSeeBookings = hasPermission('bookings:read');

  const [schedule, setSchedule] = useState<ScheduleDay | null>(null);
  const [slots, setSlots] = useState<AdminSlot[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [scheduleData, slotData, bookingData] = await Promise.all([getSchedule(day), getAdminSlots(day), canSeeBookings ? listBookingsByDate(day) : Promise.resolve([])]);
      setSchedule(scheduleData);
      setSlots(slotData);
      setBookings(bookingData);
      setSelectedSlots([]);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [day, canSeeBookings]);

  useEffect(() => {
    setNotice(null);
    load();
  }, [load]);

  const run = async (action: () => Promise<unknown>, message: string) => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await action();
      setNotice(message);
      await load();
      onChanged();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const toggleSlot = (slot: string) => setSelectedSlots((current) => (current.includes(slot) ? current.filter((s) => s !== slot) : [...current, slot]));

  return (
    <div className="card">
      <SectionTitle>{formatDay(day)}</SectionTitle>
      <ErrorBanner message={error} />
      <SuccessBanner message={notice} onClose={() => setNotice(null)} />
      {isLoading || !schedule ? (
        <div className="skeleton" style={{ height: '180px', width: '100%' }} />
      ) : (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            <div>
              <div style={{ fontWeight: 700, color: schedule.isBlocked ? 'var(--badge-danger-text)' : 'var(--badge-success-text)' }}>{schedule.isBlocked ? 'Day is blocked' : 'Day is available'}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                {schedule.isBlocked ? 'No bookings accepted from customers' : isWeeklyOff ? 'A weekly day off: customers are not offered slots' : 'Accepting bookings'}
              </div>
            </div>
            {canEdit &&
              (schedule.isBlocked ? (
                <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => run(() => unblockDay(day), 'Day unblocked.')}>
                  Unblock day
                </button>
              ) : (
                <button type="button" className="btn btn-primary" disabled={busy} onClick={() => run(() => blockDay(day), 'Day blocked. Existing bookings on it are kept.')}>
                  Block full day
                </button>
              ))}
          </div>

          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>Blocked slots</div>
          {schedule.blockedSlots.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: '1rem' }}>No individual slots blocked.</p>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '1rem' }}>
              {schedule.blockedSlots.map((slot) => (
                <span key={slot} className="badge badge-danger" style={{ textTransform: 'none' }}>
                  {slot}
                  {canEdit && (
                    <button type="button" className="btn btn-secondary" style={{ ...tinyButton, marginLeft: '0.4rem', padding: '0 0.35rem' }} disabled={busy} aria-label={`Unblock ${slot}`} onClick={() => run(() => unblockSlots(day, [slot]), `Slot ${slot} unblocked.`)}>
                    ×
                  </button>
                  )}
                </span>
              ))}
            </div>
          )}

          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
            Slots of this day ({slots.length}){canEdit && !schedule.isBlocked ? ' · tick the ones to block' : ''}
          </div>
          {slots.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>The working hours produce no slots.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '0.4rem' }}>
              {slots.map((slot) => {
                const selectable = canEdit && !schedule.isBlocked && !slot.blocked;
                const checked = selectedSlots.includes(slot.slot);
                return (
                  <label
                    key={slot.slot}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '0.35rem 0.5rem',
                      fontSize: '0.8rem',
                      background: checked ? 'var(--badge-info-bg)' : 'var(--bg-surface)',
                      textDecoration: slot.blocked ? 'line-through' : 'none',
                      color: slot.blocked ? 'var(--text-muted)' : 'var(--text-primary)',
                    }}
                  >
                    {selectable && <input type="checkbox" checked={checked} onChange={() => toggleSlot(slot.slot)} />}
                    <span style={{ flex: 1 }}>{slot.slot}</span>
                    {slot.status !== 'available' ? <StatusPill status={slot.status} /> : slot.blocked ? <StatusPill status="blocked" /> : null}
                  </label>
                );
              })}
            </div>
          )}
          {canEdit && selectedSlots.length > 0 && (
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
              <button type="button" className="btn btn-primary" disabled={busy} onClick={() => run(() => blockSlots(day, selectedSlots), `${selectedSlots.length} slot(s) blocked.`)}>
                Block {selectedSlots.length} slot(s)
              </button>
              <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => setSelectedSlots([])}>
                Clear selection
              </button>
            </div>
          )}
          <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.75rem' }}>
            Booked = a confirmed booking is in that time. Held = a customer is paying for it right now (up to 15 minutes). Blocking stops customers from booking; staff can
            still place a manual booking on a blocked day or slot.
          </p>

          {canSeeBookings && (
            <div style={{ marginTop: '1.25rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>Bookings on this day ({bookings.length})</div>
              {bookings.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>No bookings.</p>
              ) : (
                bookings.map((b) => (
                  <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', alignItems: 'center', padding: '0.4rem 0', borderBottom: '1px solid var(--border-color)', fontSize: '0.82rem' }}>
                    <span>
                      <strong>{b.slot}</strong> · {b.customer?.fullName || b.customerName} · {b.consultation.title} ({MODE_LABELS[b.mode] ?? b.mode})
                    </span>
                    <span style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                      <StatusPill status={b.status} />
                      <Link href={`/bookings/${b.id}`} className="btn btn-secondary" style={tinyButton}>
                        Open
                      </Link>
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Date range
// ---------------------------------------------------------------------------

function RangeCard({ onChanged }: { onChanged: () => void }) {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [pending, setPending] = useState<'block' | 'unblock' | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const valid = Boolean(from && to && from <= to);

  const confirm = async () => {
    if (!pending) return;
    setBusy(true);
    setError(null);
    try {
      const days = pending === 'block' ? await blockRange(from, to) : await unblockRange(from, to);
      setNotice(`${days.length} day(s) ${pending === 'block' ? 'blocked' : 'unblocked'}: ${formatDay(from)} to ${formatDay(to)}.`);
      setPending(null);
      onChanged();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card" style={{ marginBottom: '1.5rem' }}>
      <SectionTitle>Block a date range</SectionTitle>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '0.75rem' }}>Marks every day from the first to the last date as unavailable for all consultations (or opens them again).</p>
      <SuccessBanner message={notice} onClose={() => setNotice(null)} />
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <Field label="From">
          <input type="date" className="input-control" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} />
        </Field>
        <Field label="To">
          <input type="date" className="input-control" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} />
        </Field>
        <button type="button" className="btn btn-primary" disabled={!valid} onClick={() => { setError(null); setPending('block'); }}>
          Block range
        </button>
        <button type="button" className="btn btn-secondary" disabled={!valid} onClick={() => { setError(null); setPending('unblock'); }}>
          Unblock range
        </button>
      </div>
      {pending && (
        <ConfirmDialog
          title={pending === 'block' ? 'Block these days?' : 'Unblock these days?'}
          confirmLabel={pending === 'block' ? 'Block range' : 'Unblock range'}
          danger={pending === 'block'}
          busy={busy}
          error={error}
          onConfirm={confirm}
          onCancel={() => setPending(null)}
        >
          {pending === 'block' ? (
            <>
              Customers will not be able to book any consultation from <strong>{formatDay(from)}</strong> to <strong>{formatDay(to)}</strong>. Bookings already made on
              those days are kept; reschedule them yourself if needed.
            </>
          ) : (
            <>
              Every day from <strong>{formatDay(from)}</strong> to <strong>{formatDay(to)}</strong> becomes bookable again (weekly days off still apply).
            </>
          )}
        </ConfirmDialog>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

function AvailabilityScreen() {
  const { hasPermission } = useAuth();
  const canEdit = hasPermission('availability:update');
  const canSeeTypes = hasPermission('consultations:read');
  const today = todayIst();

  const [availability, setAvailability] = useState<Availability | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [month, setMonth] = useState<CalendarMonth>(() => monthOf(today));
  const [blocked, setBlocked] = useState<string[]>([]);
  const [calendarError, setCalendarError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(today);

  const [types, setTypes] = useState<ConsultationType[]>([]);
  const [typeId, setTypeId] = useState('');
  const [typesError, setTypesError] = useState<string | null>(null);

  useEffect(() => {
    getAvailability()
      .then(setAvailability)
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setIsLoading(false));
  }, []);

  const loadBlocked = useCallback(async () => {
    setCalendarError(null);
    try {
      setBlocked(await getBlockedDates(month.month, month.year));
    } catch (err) {
      setCalendarError(errorMessage(err));
    }
  }, [month]);

  useEffect(() => {
    loadBlocked();
  }, [loadBlocked]);

  useEffect(() => {
    if (!canSeeTypes) return;
    listConsultationTypes()
      .then(setTypes)
      .catch((err) => setTypesError(errorMessage(err)));
  }, [canSeeTypes]);

  const chosenType = types.find((t) => t.id === typeId) ?? null;
  const selectedWeekday = selected ? new Date(`${selected}T00:00:00Z`).getUTCDay() : -1;

  return (
    <div>
      <PageHeader crumbs={[{ label: 'Availability' }]} title="Availability" subtitle="Manage the global schedule and date-level controls. One calendar is shared by the app, the website and staff bookings." />

      <ErrorBanner message={error} />

      {isLoading ? (
        <div className="skeleton" style={{ height: '240px', width: '100%', marginBottom: '1.5rem' }} />
      ) : availability ? (
        <WorkingHoursCard availability={availability} canEdit={canEdit} onSaved={setAvailability} />
      ) : null}

      <div className="card-grid">
        <StatCard title="Blocked days" value={blocked.length} sub="In the month shown" />
        <StatCard title="Weekly days off" value={availability ? availability.blockedWeekdays.map((d) => WEEKDAY_NAMES[d].slice(0, 3)).join(', ') || 'None' : '—'} />
        <StatCard title="Booking horizon" value={availability ? (availability.bookingHorizonDays === null ? 'No limit' : `${availability.bookingHorizonDays} days`) : '—'} sub="How far ahead customers can book" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem', alignItems: 'start', marginBottom: '1.5rem' }}>
        <div className="card">
          <SectionTitle>Calendar</SectionTitle>
          <ErrorBanner message={calendarError} />
          <MonthCalendar
            value={month}
            onChange={setMonth}
            today={today}
            selected={selected}
            blocked={blocked}
            weeklyOff={availability?.blockedWeekdays ?? []}
            typeBlocked={chosenType?.unavailableDates ?? []}
            onSelect={(day) => setSelected((current) => (current === day ? null : day))}
          />
          <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.75rem' }}>Click a day to see and change its schedule. Click it again to deselect.</p>
        </div>

        {selected ? (
          <DayPanel key={selected} day={selected} canEdit={canEdit} isWeeklyOff={availability?.blockedWeekdays.includes(selectedWeekday) ?? false} onChanged={loadBlocked} />
        ) : (
          <div className="card">
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center', padding: '2rem 0' }}>Select a day on the calendar.</p>
          </div>
        )}
      </div>

      {canEdit && <RangeCard onChanged={loadBlocked} />}

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <SectionTitle>Blocked days in the month shown · all consultations</SectionTitle>
        {blocked.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No dates blocked.</p>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
            {blocked.map((day) => (
              <button key={day} type="button" className="badge badge-danger" style={{ border: 'none', cursor: 'pointer', textTransform: 'none' }} onClick={() => setSelected(day)} title="Open this day">
                {formatDay(day)}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <SectionTitle>Blocked dates for one consultation</SectionTitle>
        {!canSeeTypes ? (
          <InfoBox>Per-consultation dates need the consultations:read permission.</InfoBox>
        ) : (
          <>
            <ErrorBanner message={typesError} />
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '0.75rem' }}>
              Close single dates for one consultation while the others stay bookable. The chosen consultation&rsquo;s dates are dotted on the calendar above.
            </p>
            <div style={{ maxWidth: 360, marginBottom: '0.75rem' }}>
              <Field label="Consultation">
                <select className="input-control" value={typeId} onChange={(e) => setTypeId(e.target.value)}>
                  <option value="">Choose a consultation…</option>
                  {types.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                      {t.isActive ? '' : ' (inactive)'}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            {chosenType && (
              <TypeBlockedDates
                typeId={chosenType.id}
                dates={chosenType.unavailableDates}
                onChange={(dates) => setTypes((all) => all.map((t) => (t.id === chosenType.id ? { ...t, unavailableDates: dates } : t)))}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function AvailabilityPage() {
  return (
    <RequirePermission permission="availability:read">
      <AvailabilityScreen />
    </RequirePermission>
  );
}
