'use client';

import { GstBreakdown } from '../GstBreakdown';

import React, { useState } from 'react';
import {
  CONSULTATION_MODES,
  ConsultationMode,
  ConsultationModeInput,
  ConsultationType,
  ConsultationTypeInput,
  GstType,
  MODE_LABELS,
} from '../../lib/api/bookings';
import { paiseToRupeeInput, percentInputToBasisPoints, rupeeInputToPaise } from './format';
import { ErrorBanner, Field, SectionTitle, tinyButton } from './ui';

interface ModeState {
  enabled: boolean;
  price: string;
  gstEnabled: boolean;
  gstRate: string;
  gstType: GstType;
}

interface FormState {
  title: string;
  type: 'normal' | 'special';
  description: string;
  durationMinutes: string;
  responseDays: string;
  priceLabel: string;
  note: string;
  isActive: boolean;
  includes: string[];
  modes: Record<ConsultationMode, ModeState>;
}

const GST_RATES = ['0', '5', '12', '18', '28'];

function blankMode(): ModeState {
  return { enabled: false, price: '', gstEnabled: true, gstRate: '0', gstType: 'INCLUSIVE' };
}

function initialState(existing: ConsultationType | null): FormState {
  const modes: Record<ConsultationMode, ModeState> = { AUDIO: blankMode(), VIDEO: blankMode(), IN_PERSON: blankMode(), MESSAGE: blankMode() };
  for (const mode of existing?.modes ?? []) {
    const percent = mode.gst.rateBasisPoints / 100;
    modes[mode.mode] = {
      enabled: true,
      price: paiseToRupeeInput(mode.pricePaise),
      gstEnabled: mode.gst.enabled,
      gstRate: Number.isInteger(percent) ? String(percent) : percent.toFixed(2),
      gstType: mode.gst.type,
    };
  }
  return {
    title: existing?.title ?? '',
    type: existing?.type ?? 'normal',
    description: existing?.description ?? '',
    durationMinutes: String(existing?.durationMinutes ?? 30),
    responseDays: existing ? String(existing.responseDays) : '',
    priceLabel: existing?.priceLabel ?? '',
    note: existing?.note ?? '',
    isActive: existing?.isActive ?? true,
    includes: existing?.includes ?? [],
    modes,
  };
}

/** Checks the form against the backend schema (`consultation-types.schemas.ts`) and builds the request body. */
function buildBody(form: FormState, existing: ConsultationType | null): { errors: string[]; body: ConsultationTypeInput | null } {
  const errors: string[] = [];
  const title = form.title.trim();
  if (title.length < 2) errors.push('Title: min 2 characters required');
  if (title.length > 200) errors.push('Title: at most 200 characters');
  if (form.description.length > 10000) errors.push('Description: at most 10000 characters');
  if (form.priceLabel.length > 200) errors.push('Price label: at most 200 characters');
  if (form.note.length > 2000) errors.push('Note: at most 2000 characters');

  // Website rules: a call or visit needs a duration; a WhatsApp message consultation needs response days.
  const scheduled = CONSULTATION_MODES.some((mode) => mode !== 'MESSAGE' && form.modes[mode].enabled);
  const messageOn = form.modes.MESSAGE.enabled;
  const duration = Number(form.durationMinutes);
  if (scheduled) {
    if (!/^\d+$/.test(form.durationMinutes.trim()) || duration < 5) errors.push('Duration: min 5 minutes required');
    else if (duration > 480) errors.push('Duration: at most 480 minutes');
  }
  if (messageOn && !(Number(form.responseDays) >= 1)) errors.push('WhatsApp message: give the response time in days (at least 1)');

  let responseDays: number | undefined;
  if (form.responseDays.trim()) {
    if (!/^\d+$/.test(form.responseDays.trim()) || Number(form.responseDays) > 365) errors.push('Notice days: a whole number from 0 to 365');
    else responseDays = Number(form.responseDays);
  }

  const modes: ConsultationModeInput[] = [];
  const enabled = CONSULTATION_MODES.filter((mode) => form.modes[mode].enabled);
  if (enabled.length === 0) errors.push('Select at least one consultation mode');
  for (const mode of enabled) {
    const state = form.modes[mode];
    const pricePaise = rupeeInputToPaise(state.price);
    if (pricePaise === null || pricePaise < 100) {
      errors.push(`Enter a valid price for ${MODE_LABELS[mode]} (min ₹1)`);
      continue;
    }
    const rateBasisPoints = percentInputToBasisPoints(state.gstRate || '0');
    if (state.gstEnabled && (rateBasisPoints === null || rateBasisPoints > 10000)) {
      errors.push(`GST rate for ${MODE_LABELS[mode]}: a percentage from 0 to 100`);
      continue;
    }
    modes.push({
      mode,
      pricePaise,
      gst: state.gstEnabled ? { enabled: true, rateBasisPoints: rateBasisPoints ?? 0, type: state.gstType } : { enabled: false },
    });
  }
  // On update the server merges modes by mode, so a mode that was switched off is removed explicitly.
  for (const previous of existing?.modes ?? []) {
    if (!form.modes[previous.mode].enabled) modes.push({ mode: previous.mode, _delete: true });
  }

  if (errors.length > 0) return { errors, body: null };
  return {
    errors,
    body: {
      title,
      type: form.type,
      description: form.description.trim() ? form.description : null,
      ...(scheduled ? { durationMinutes: duration } : {}),
      ...(responseDays !== undefined ? { responseDays } : existing ? { responseDays: 0 } : {}),
      includes: form.includes,
      priceLabel: form.priceLabel.trim() || null,
      note: form.note.trim() ? form.note : null,
      isActive: form.isActive,
      modes,
    },
  };
}

export function ConsultationTypeForm({
  existing,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  existing: ConsultationType | null;
  submitLabel: string;
  onSubmit: (body: ConsultationTypeInput) => Promise<void>;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<FormState>(() => initialState(existing));
  const [includeDraft, setIncludeDraft] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));
  const setMode = (mode: ConsultationMode, patch: Partial<ModeState>) => setForm((f) => ({ ...f, modes: { ...f.modes, [mode]: { ...f.modes[mode], ...patch } } }));

  const addInclude = () => {
    const item = includeDraft.trim();
    if (!item) return;
    if (item.length > 500) {
      setErrors(['An "includes" item can be at most 500 characters']);
      return;
    }
    if (form.includes.length >= 50) {
      setErrors(['At most 50 "includes" items']);
      return;
    }
    set('includes', [...form.includes, item]);
    setIncludeDraft('');
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const result = buildBody(form, existing);
    setErrors(result.errors);
    setServerError(null);
    if (!result.body) return;
    setIsSaving(true);
    try {
      await onSubmit(result.body);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Could not save the consultation');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={submit}>
      <ErrorBanner message={serverError} />
      {errors.length > 0 && (
        <div role="alert" className="badge badge-danger" style={{ display: 'block', padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem', whiteSpace: 'normal', textTransform: 'none' }}>
          <div style={{ fontWeight: 700 }}>Please fix the following:</div>
          <ul style={{ margin: '0.25rem 0 0 1.25rem' }}>
            {errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <SectionTitle>Details</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
          <Field label="Title *" span={2}>
            <input className="input-control" maxLength={200} value={form.title} onChange={(e) => set('title', e.target.value)} />
          </Field>
          <Field label="Type">
            <select className="input-control" value={form.type} onChange={(e) => set('type', e.target.value as 'normal' | 'special')}>
              <option value="normal">Normal</option>
              <option value="special">Special</option>
            </select>
          </Field>
          <Field label="Duration (minutes)" hint="5 to 480, for audio, video and in-person. Not needed for a WhatsApp message consultation.">
            <input className="input-control" inputMode="numeric" value={form.durationMinutes} onChange={(e) => set('durationMinutes', e.target.value)} />
          </Field>
          <Field label="Notice days" hint="How many days ahead a customer must book (0 = same day). Staff bookings ignore it.">
            <input className="input-control" inputMode="numeric" placeholder="2" value={form.responseDays} onChange={(e) => set('responseDays', e.target.value)} />
          </Field>
          <Field label="Price label" hint="For example “Per session”">
            <input className="input-control" maxLength={200} value={form.priceLabel} onChange={(e) => set('priceLabel', e.target.value)} />
          </Field>
          <Field label="Description" span={2}>
            <textarea className="input-control" rows={4} maxLength={10000} value={form.description} onChange={(e) => set('description', e.target.value)} />
          </Field>
          <Field label="Note" span={2}>
            <textarea className="input-control" rows={2} maxLength={2000} value={form.note} onChange={(e) => set('note', e.target.value)} />
          </Field>
          <label style={{ display: 'flex', gap: '0.5rem', fontSize: '0.85rem', alignItems: 'center' }}>
            <input type="checkbox" checked={form.isActive} onChange={(e) => set('isActive', e.target.checked)} />
            Active (offered to customers)
          </label>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <SectionTitle>Modes and prices *</SectionTitle>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '0.75rem' }}>
          Switch on each way this consultation is offered and give its price. With inclusive GST the customer pays the price shown; with exclusive GST the tax is added
          on top. The amount the customer pays is calculated by the server and shown on the consultation&rsquo;s page after saving.
        </p>
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {CONSULTATION_MODES.map((mode) => {
            const state = form.modes[mode];
            const rateOptions = GST_RATES.includes(state.gstRate) ? GST_RATES : [...GST_RATES, state.gstRate];
            return (
              <div key={mode} style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.85rem' }}>
                <label style={{ display: 'flex', gap: '0.5rem', fontWeight: 600, fontSize: '0.9rem', alignItems: 'center' }}>
                  <input type="checkbox" checked={state.enabled} onChange={(e) => setMode(mode, { enabled: e.target.checked })} />
                  {MODE_LABELS[mode]}
                </label>
                {state.enabled && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem', marginTop: '0.75rem' }}>
                    <Field label="Price (₹) *">
                      <input className="input-control" inputMode="decimal" value={state.price} onChange={(e) => setMode(mode, { price: e.target.value })} />
                    </Field>
                    <Field label="GST">
                      <select className="input-control" value={state.gstEnabled ? 'yes' : 'no'} onChange={(e) => setMode(mode, { gstEnabled: e.target.value === 'yes' })}>
                        <option value="yes">Charged</option>
                        <option value="no">Not charged</option>
                      </select>
                    </Field>
                    {state.gstEnabled && (
                      <>
                        <Field label="GST rate">
                          <select className="input-control" value={state.gstRate} onChange={(e) => setMode(mode, { gstRate: e.target.value })}>
                            {rateOptions.map((rate) => (
                              <option key={rate} value={rate}>
                                {rate}%
                              </option>
                            ))}
                          </select>
                        </Field>
                        <Field label="This price is">
                          <select className="input-control" value={state.gstType} onChange={(e) => setMode(mode, { gstType: e.target.value as GstType })}>
                            <option value="INCLUSIVE">Inclusive of GST</option>
                            <option value="EXCLUSIVE">Exclusive of GST</option>
                          </select>
                        </Field>
                      </>
                    )}
                    <div style={{ gridColumn: '1 / -1' }}>
                      <GstBreakdown amountText={state.price} ratePercentText={state.gstRate} inclusive={state.gstType === 'INCLUSIVE'} gstEnabled={state.gstEnabled} />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {existing && (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.75rem' }}>
            Switching a mode off removes it from sale; bookings already made for it are not affected. A new price applies to bookings made from now on.
          </p>
        )}
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <SectionTitle>What is included</SectionTitle>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            className="input-control"
            placeholder="Type an item and press Enter"
            maxLength={500}
            value={includeDraft}
            onChange={(e) => setIncludeDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addInclude();
              }
            }}
          />
          <button type="button" className="btn btn-secondary" onClick={addInclude}>
            + Add
          </button>
        </div>
        <div style={{ display: 'grid', gap: '0.4rem', marginTop: '0.75rem' }}>
          {form.includes.length === 0 && <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Nothing listed yet.</span>}
          {form.includes.map((item, index) => (
            <div key={`${item}-${index}`} style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', alignItems: 'center', background: 'var(--bg-subtle)', padding: '0.4rem 0.6rem', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem' }}>
              <span>{item}</span>
              <button type="button" className="btn btn-secondary" style={tinyButton} aria-label={`Remove ${item}`} onClick={() => set('includes', form.includes.filter((_, i) => i !== index))}>
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
        <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={isSaving}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={isSaving}>
          {isSaving ? 'Saving…' : submitLabel}
        </button>
      </div>
    </form>
  );
}
