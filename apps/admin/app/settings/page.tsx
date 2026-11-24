'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../lib/auth-context';
import {
  AdminSiteSettings,
  SettingsSection,
  SiteSettingsPatch,
  apiErrorMessage,
  formatDateTime,
  isHttpUrl,
  isSafeLink,
  settingsApi,
} from '../../lib/api/content';
import { UploadField } from '../../components/uploads/UploadField';
import { TagInput } from '../../components/content/TagInput';
import { Checkbox, Field, LoadError, Notice, PageHeader, PermissionGate, useNotice } from '../../components/content/ui';

/**
 * Site settings of the website. The tabs and fields are exactly the sections the backend accepts
 * (SETTINGS_SHAPE in apps/api/src/modules/content/content.schemas.ts); its update schema is strict,
 * so nothing else may be sent. Payment gateway, SMTP and SMS credentials are NOT settings: they
 * live in the server configuration and have no field here. The legal pages are on /settings/legal.
 */

type FieldKind = 'text' | 'textarea' | 'email' | 'url' | 'link' | 'color' | 'bool' | 'int' | 'percent' | 'rupees' | 'currency' | 'list' | 'image';

interface FieldDef {
  key: string;
  label: string;
  kind: FieldKind;
  hint?: string;
  max?: number;
  required?: boolean;
  placeholder?: string;
  /** `image` only: the sibling field that holds the storage key. */
  keyField?: string;
  /** Shown only while this boolean field of the same section is on. */
  showWhen?: string;
}

type TabSection = Exclude<SettingsSection, 'legal'>;

interface TabDef {
  section: TabSection;
  label: string;
  description: string;
  note?: string;
  fields: FieldDef[];
}

const BAR_FIELDS = (name: string): FieldDef[] => [
  { key: 'enabled', label: `Show the ${name}`, kind: 'bool' },
  { key: 'text', label: 'Announcement text', kind: 'text', max: 500 },
  { key: 'bgColor', label: 'Background colour', kind: 'color' },
  { key: 'textColor', label: 'Text colour', kind: 'color' },
  { key: 'linkEnabled', label: 'Make it a link', kind: 'bool' },
  {
    key: 'linkUrl',
    label: 'Link URL',
    kind: 'link',
    hint: 'A site path (e.g. /free-online-kundli) or a full https:// URL.',
    placeholder: '/free-online-kundli',
    showWhen: 'linkEnabled',
  },
];

const TABS: TabDef[] = [
  { section: 'topBar', label: 'Top Bar', description: 'The announcement line above the website’s navigation.', fields: BAR_FIELDS('top bar') },
  {
    section: 'highlightsBar',
    label: 'Highlights Bar',
    description: 'The second announcement bar of the website’s navigation.',
    fields: BAR_FIELDS('highlights bar'),
  },
  {
    section: 'branding',
    label: 'Branding',
    description: 'Site name, logo and favicon.',
    fields: [
      { key: 'siteName', label: 'Site name', kind: 'text', max: 150, required: true },
      { key: 'logoUrl', keyField: 'logoKey', label: 'Logo', kind: 'image', hint: 'Recommended 200 × 60 px PNG.' },
      { key: 'faviconUrl', keyField: 'faviconKey', label: 'Favicon', kind: 'image', hint: 'Recommended 32 × 32 px PNG.' },
    ],
  },
  {
    section: 'contact',
    label: 'Contact',
    description: 'How customers reach you; shown on the contact page and in the footer.',
    fields: [
      { key: 'email', label: 'Email', kind: 'email', max: 254 },
      { key: 'phone', label: 'Phone', kind: 'text', max: 50 },
      { key: 'whatsapp', label: 'WhatsApp', kind: 'text', max: 50 },
      { key: 'address', label: 'Address', kind: 'textarea', max: 1000 },
    ],
  },
  {
    section: 'socialLinks',
    label: 'Social',
    description: 'Links to the social media profiles.',
    fields: [
      { key: 'facebook', label: 'Facebook', kind: 'url', placeholder: 'https://facebook.com/…' },
      { key: 'instagram', label: 'Instagram', kind: 'url', placeholder: 'https://instagram.com/…' },
      { key: 'twitter', label: 'Twitter / X', kind: 'url', placeholder: 'https://x.com/…' },
      { key: 'youtube', label: 'YouTube', kind: 'url', placeholder: 'https://youtube.com/…' },
      { key: 'linkedin', label: 'LinkedIn', kind: 'url', placeholder: 'https://linkedin.com/…' },
    ],
  },
  {
    section: 'business',
    label: 'Business',
    description: 'Legal and tax registration details.',
    note: 'The GST and PAN numbers are kept for staff only; they are not sent to the public website.',
    fields: [
      { key: 'companyName', label: 'Company name', kind: 'text', max: 300 },
      { key: 'gstNumber', label: 'GST number', kind: 'text', max: 50 },
      { key: 'panNumber', label: 'PAN number', kind: 'text', max: 50 },
    ],
  },
  {
    section: 'payment',
    label: 'Payment',
    description: 'Currency, tax and cash on delivery.',
    note: 'Payment gateway keys are not managed here: they are part of the server configuration.',
    fields: [
      { key: 'currency', label: 'Currency', kind: 'currency', hint: 'Three-letter code, e.g. INR.' },
      { key: 'taxPercent', label: 'Tax percent', kind: 'percent' },
      { key: 'codEnabled', label: 'Cash on delivery (COD)', kind: 'bool', hint: 'The website checkout shows a COD option while this is on.' },
    ],
  },
  {
    section: 'shipping',
    label: 'Shipping',
    description: 'Rates, thresholds and service areas.',
    note: 'These values are displayed on the website (shipping policy page). Delivery charges are not calculated from them.',
    fields: [
      { key: 'freeShippingThresholdPaise', label: 'Free shipping above (₹)', kind: 'rupees' },
      { key: 'baseDeliveryChargePaise', label: 'Base delivery charge (₹)', kind: 'rupees' },
      { key: 'deliveryChargePerKmPaise', label: 'Charge per km (₹)', kind: 'rupees' },
      { key: 'maxCodLimitPaise', label: 'Maximum COD order value (₹)', kind: 'rupees' },
      { key: 'supportedAreas', label: 'Supported areas', kind: 'list', hint: 'PIN codes or city names. Enter or a comma adds one.', max: 150 },
    ],
  },
  {
    section: 'product',
    label: 'Products',
    description: 'Stock and cart rules.',
    fields: [
      { key: 'lowStockWarning', label: 'Low stock warning', kind: 'int', hint: 'Alert when stock falls below this number.' },
      { key: 'maxQuantityInCart', label: 'Maximum quantity in cart', kind: 'int', hint: 'Per-product cart limit.' },
    ],
  },
  {
    section: 'offers',
    label: 'Offers',
    description: 'Referrals, coupons and flash sales.',
    fields: [
      { key: 'referralRewardPercent', label: 'Referral reward percent', kind: 'percent' },
      { key: 'enableCoupons', label: 'Enable coupons', kind: 'bool' },
      { key: 'flashSaleEnabled', label: 'Flash sale mode', kind: 'bool' },
    ],
  },
  {
    section: 'order',
    label: 'Orders',
    description: 'Auto-cancel, returns and limits.',
    fields: [
      { key: 'autoCancelUnpaidMinutes', label: 'Auto-cancel unpaid orders after (minutes)', kind: 'int' },
      { key: 'returnPolicyDays', label: 'Return policy (days)', kind: 'int', hint: 'Displayed on the shipping policy page.' },
      { key: 'maxOrderValuePaise', label: 'Maximum order value (₹)', kind: 'rupees' },
    ],
  },
  {
    section: 'communication',
    label: 'Notifications',
    description: 'Order alerts by email, SMS and push.',
    note: 'Mail and SMS provider credentials are not managed here: they are part of the server configuration.',
    fields: [
      { key: 'enableOrderEmails', label: 'Order email notifications', kind: 'bool' },
      { key: 'enableOrderSMS', label: 'Order SMS notifications', kind: 'bool' },
      { key: 'enablePushNotifications', label: 'Push notifications', kind: 'bool' },
    ],
  },
  {
    section: 'otp',
    label: 'OTP',
    description: 'One-time password expiry and resend rules.',
    fields: [
      { key: 'expiryMinutes', label: 'OTP expiry (minutes)', kind: 'int' },
      { key: 'resendTimeoutSec', label: 'Resend timeout (seconds)', kind: 'int' },
    ],
  },
  {
    section: 'system',
    label: 'System',
    description: 'Website-wide switches.',
    note: 'This flag is published to the website. The API’s own maintenance switch is a server setting and is not changed from here.',
    fields: [{ key: 'maintenanceMode', label: 'Maintenance mode', kind: 'bool' }],
  },
];

type DraftValue = string | boolean | string[];
type SectionDraft = Record<string, DraftValue>;
type Drafts = Record<TabSection, SectionDraft>;

const MAX_PAISE = 100_000_000_000;
const MAX_COUNT = 1_000_000;

function toDraft(def: FieldDef, raw: unknown): DraftValue {
  switch (def.kind) {
    case 'bool':
      return Boolean(raw);
    case 'list':
      return Array.isArray(raw) ? raw.map(String) : [];
    case 'rupees': {
      const paise = typeof raw === 'number' ? raw : 0;
      return paise % 100 === 0 ? String(paise / 100) : (paise / 100).toFixed(2);
    }
    case 'int':
    case 'percent':
      return typeof raw === 'number' ? String(raw) : '0';
    default:
      return typeof raw === 'string' ? raw : '';
  }
}

function sectionDraft(tab: TabDef, settings: AdminSiteSettings): SectionDraft {
  const source = settings[tab.section] as unknown as Record<string, unknown>;
  const draft: SectionDraft = {};
  tab.fields.forEach((def) => {
    draft[def.key] = toDraft(def, source[def.key]);
    if (def.keyField) draft[def.keyField] = typeof source[def.keyField] === 'string' ? (source[def.keyField] as string) : '';
  });
  return draft;
}

function buildDrafts(settings: AdminSiteSettings): Drafts {
  const drafts = {} as Drafts;
  TABS.forEach((tab) => {
    drafts[tab.section] = sectionDraft(tab, settings);
  });
  return drafts;
}

function sameValue(a: DraftValue, b: DraftValue): boolean {
  if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((v, i) => v === b[i]);
  return a === b;
}

function isDirty(draft: SectionDraft, saved: SectionDraft): boolean {
  return Object.keys(draft).some((key) => !sameValue(draft[key], saved[key]));
}

/** Returns the error of one field, or null. */
function fieldError(def: FieldDef, value: DraftValue): string | null {
  if (def.kind === 'bool') return null;
  if (def.kind === 'list') {
    const list = value as string[];
    if (list.length > 500) return 'At most 500 entries.';
    return null;
  }
  const text = String(value).trim();
  if (def.required && !text) return `${def.label} is required.`;
  if (def.max && text.length > def.max) return `At most ${def.max} characters.`;

  switch (def.kind) {
    case 'email':
      return text && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text) ? 'Enter a valid email address.' : null;
    case 'url':
    case 'image':
      if (text.length > 2048) return 'At most 2048 characters.';
      return text && !isHttpUrl(text) ? 'Must be a valid http(s) URL.' : null;
    case 'link':
      if (text.length > 2048) return 'At most 2048 characters.';
      return text && !isSafeLink(text) ? 'Must be an http(s) URL or a path starting with "/".' : null;
    case 'color':
      return text && !/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(text) ? 'Must be a hex colour such as #121045.' : null;
    case 'currency':
      return /^[A-Za-z]{3}$/.test(text) ? null : 'Must be a 3-letter currency code.';
    case 'int': {
      if (!/^\d+$/.test(text)) return 'Enter a whole number, 0 or more.';
      return Number(text) > MAX_COUNT ? `At most ${MAX_COUNT.toLocaleString('en-IN')}.` : null;
    }
    case 'percent': {
      if (!/^\d+(\.\d+)?$/.test(text)) return 'Enter a number between 0 and 100.';
      return Number(text) > 100 ? 'Enter a number between 0 and 100.' : null;
    }
    case 'rupees': {
      if (!/^\d+(\.\d{1,2})?$/.test(text)) return 'Enter an amount in rupees, with at most 2 decimals.';
      return Math.round(Number(text) * 100) > MAX_PAISE ? 'The amount is too large.' : null;
    }
    default:
      return null;
  }
}

function toPayloadValue(def: FieldDef, value: DraftValue): string | number | boolean | string[] {
  switch (def.kind) {
    case 'bool':
      return Boolean(value);
    case 'list':
      return value as string[];
    case 'int':
    case 'percent':
      return Number(String(value).trim());
    case 'rupees':
      return Math.round(Number(String(value).trim()) * 100);
    case 'currency':
      return String(value).trim().toUpperCase();
    default:
      return String(value).trim();
  }
}

function SettingsScreen() {
  const { hasPermission } = useAuth();
  const canUpdate = hasPermission('settings:update');

  const [settings, setSettings] = useState<AdminSiteSettings | null>(null);
  const [drafts, setDrafts] = useState<Drafts | null>(null);
  const [activeSection, setActiveSection] = useState<TabSection>('topBar');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [conflict, setConflict] = useState(false);
  const { notice, showSuccess, showError, clear } = useNotice();

  const load = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    setConflict(false);
    try {
      const data = await settingsApi.get();
      setSettings(data);
      setDrafts(buildDrafts(data));
      setErrors({});
    } catch (err) {
      setLoadError(apiErrorMessage(err, 'Failed to load the site settings.'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const savedDrafts = useMemo(() => (settings ? buildDrafts(settings) : null), [settings]);

  const dirtySections = useMemo(() => {
    const dirty = new Set<TabSection>();
    if (drafts && savedDrafts) {
      TABS.forEach((tab) => {
        if (isDirty(drafts[tab.section], savedDrafts[tab.section])) dirty.add(tab.section);
      });
    }
    return dirty;
  }, [drafts, savedDrafts]);

  // Warn before leaving the page with unsaved changes.
  useEffect(() => {
    if (dirtySections.size === 0) return undefined;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirtySections]);

  const tab = TABS.find((t) => t.section === activeSection) || TABS[0];
  const draft = drafts ? drafts[tab.section] : null;
  const readOnly = !canUpdate || isSaving;

  const setValue = (key: string, value: DraftValue, extra?: Record<string, DraftValue>) => {
    setDrafts((prev) => (prev ? { ...prev, [tab.section]: { ...prev[tab.section], [key]: value, ...(extra || {}) } } : prev));
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const resetTab = () => {
    if (!savedDrafts) return;
    setDrafts((prev) => (prev ? { ...prev, [tab.section]: savedDrafts[tab.section] } : prev));
    setErrors({});
  };

  const save = async () => {
    if (!draft || !savedDrafts) return;
    // Only the fields that changed are checked and sent; the server merges them into the stored
    // document, so a value saved earlier is never blocked or rewritten by an unrelated change.
    const saved = savedDrafts[tab.section];
    const changedFields = tab.fields.filter(
      (def) => !sameValue(draft[def.key], saved[def.key]) || (def.keyField ? !sameValue(draft[def.keyField], saved[def.keyField]) : false)
    );

    const found: Record<string, string> = {};
    changedFields.forEach((def) => {
      const message = fieldError(def, draft[def.key]);
      if (message) found[def.key] = message;
    });
    setErrors(found);
    if (Object.keys(found).length > 0) {
      showError('Please correct the highlighted fields.');
      return;
    }

    const values: Record<string, string | number | boolean | string[]> = {};
    changedFields.forEach((def) => {
      values[def.key] = toPayloadValue(def, draft[def.key]);
      // A logo / favicon is a { url, key } pair spread over two fields: always sent together.
      if (def.keyField) values[def.keyField] = String(draft[def.keyField] || '');
    });
    if (Object.keys(values).length === 0) return;

    setIsSaving(true);
    clear();
    try {
      const patch = { [tab.section]: values } as SiteSettingsPatch;
      const updated = await settingsApi.update(patch);
      setSettings(updated);
      setDrafts((prev) => (prev ? { ...prev, [tab.section]: sectionDraft(tab, updated) } : prev));
      showSuccess(`${tab.label} settings saved.`);
    } catch (err) {
      if ((err as { status?: number } | null)?.status === 409) {
        setConflict(true);
        showError('The settings were changed by someone else while you were editing. Reload to see the current values, then make your change again.');
      } else {
        showError(apiErrorMessage(err, 'Could not save the settings.'));
      }
    } finally {
      setIsSaving(false);
    }
  };

  const renderField = (def: FieldDef) => {
    if (!draft) return null;
    if (def.showWhen && !draft[def.showWhen] && !errors[def.key]) return null;
    const value = draft[def.key];
    const error = errors[def.key] || null;

    if (def.kind === 'bool') {
      return (
        <Checkbox
          key={def.key}
          label={def.label}
          description={def.hint}
          checked={Boolean(value)}
          disabled={readOnly}
          onChange={(checked) => setValue(def.key, checked)}
        />
      );
    }

    if (def.kind === 'list') {
      return (
        <Field key={def.key} label={def.label} hint={def.hint} error={error}>
          <TagInput value={value as string[]} onChange={(list) => setValue(def.key, list)} max={500} maxLength={def.max || 150} disabled={readOnly} />
        </Field>
      );
    }

    if (def.kind === 'image' && def.keyField) {
      const url = String(value || '');
      const key = String(draft[def.keyField] || '');
      const keyField = def.keyField;
      return (
        <div key={def.key} style={{ display: 'grid', gap: '0.5rem' }}>
          <UploadField
            label={def.label}
            purpose="page"
            value={url ? { url, key: key || null } : null}
            onChange={(file) => setValue(def.key, file?.url || '', { [keyField]: file?.key || '' })}
            hint={def.hint}
            disabled={readOnly}
          />
          <Field label={`${def.label} URL`} error={error} hint="Filled in by an upload. An image hosted elsewhere can be given by its https:// URL instead.">
            <input
              type="url"
              className="input-control"
              maxLength={2048}
              placeholder="https://…"
              value={url}
              disabled={readOnly}
              // A typed URL is an external image: it has no storage key.
              onChange={(e) => setValue(def.key, e.target.value, { [keyField]: '' })}
            />
          </Field>
        </div>
      );
    }

    if (def.kind === 'color') {
      const text = String(value);
      const swatch = /^#[0-9A-Fa-f]{6}$/.test(text) ? text : '#ffffff';
      return (
        <Field key={def.key} label={def.label} hint={def.hint} error={error}>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="color"
              aria-label={`${def.label} picker`}
              value={swatch}
              disabled={readOnly}
              onChange={(e) => setValue(def.key, e.target.value)}
              style={{ width: '44px', height: '36px', padding: 0, border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }}
            />
            <input
              type="text"
              className="input-control"
              maxLength={7}
              placeholder="#121045"
              value={text}
              disabled={readOnly}
              onChange={(e) => setValue(def.key, e.target.value)}
            />
          </div>
        </Field>
      );
    }

    if (def.kind === 'textarea') {
      return (
        <Field key={def.key} label={def.label} hint={def.hint} error={error}>
          <textarea
            className="input-control"
            rows={3}
            maxLength={def.max}
            value={String(value)}
            disabled={readOnly}
            onChange={(e) => setValue(def.key, e.target.value)}
          />
        </Field>
      );
    }

    const numeric = def.kind === 'int' || def.kind === 'percent' || def.kind === 'rupees';
    return (
      <Field key={def.key} label={def.label} required={def.required} hint={def.hint} error={error}>
        <input
          type={def.kind === 'email' ? 'email' : def.kind === 'url' ? 'url' : 'text'}
          inputMode={numeric ? 'decimal' : undefined}
          className="input-control"
          maxLength={def.kind === 'currency' ? 3 : def.max}
          placeholder={def.placeholder}
          value={String(value)}
          disabled={readOnly}
          onChange={(e) => setValue(def.key, e.target.value)}
        />
      </Field>
    );
  };

  const tabDirty = dirtySections.has(tab.section);

  return (
    <div>
      <PageHeader
        crumbs={[{ label: 'Site Settings' }]}
        title="Site Settings"
        subtitle={
          settings?.updatedAt ? `Website settings · last saved ${formatDateTime(settings.updatedAt)} (IST)` : 'Website settings'
        }
        actions={
          <>
            <button type="button" className="btn btn-secondary" style={{ fontSize: '0.85rem' }} onClick={load} disabled={isSaving}>
              🔄 Reload
            </button>
            <Link href="/settings/legal" className="btn btn-secondary">
              Legal pages →
            </Link>
          </>
        }
      />

      <Notice notice={notice} onClose={clear} />
      {loadError && <LoadError message={loadError} onRetry={load} />}
      {conflict && <LoadError message="Your copy of the settings is out of date." onRetry={load} />}
      {!canUpdate && settings && (
        <Notice notice={{ kind: 'error', text: 'You can view the settings but do not have permission to change them.' }} />
      )}

      {isLoading ? (
        <div className="card">
          <div className="skeleton" style={{ height: '32px', width: '100%', marginBottom: '1rem' }} />
          <div className="skeleton" style={{ height: '240px', width: '100%' }} />
        </div>
      ) : settings && draft ? (
        <>
          <div role="tablist" style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
            {TABS.map((t) => (
              <button
                key={t.section}
                type="button"
                role="tab"
                aria-selected={t.section === tab.section}
                className={`btn ${t.section === tab.section ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
                onClick={() => {
                  setActiveSection(t.section);
                  setErrors({});
                }}
              >
                {t.label}
                {dirtySections.has(t.section) && (
                  <span title="Unsaved changes" style={{ marginLeft: '0.35rem', color: t.section === tab.section ? '#FFF' : 'var(--accent-gold)' }}>
                    ●
                  </span>
                )}
              </button>
            ))}
          </div>

          <form
            className="card"
            onSubmit={(event) => {
              event.preventDefault();
              save();
            }}
          >
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700 }}>{tab.label}</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: tab.note ? '0.5rem' : '1.25rem' }}>{tab.description}</p>
            {tab.note && (
              <p
                style={{
                  fontSize: '0.8rem',
                  color: 'var(--badge-info-text)',
                  background: 'var(--badge-info-bg)',
                  padding: '0.5rem 0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  marginBottom: '1.25rem',
                }}
              >
                {tab.note}
              </p>
            )}

            <div style={{ display: 'grid', gap: '1rem', maxWidth: '720px' }}>{tab.fields.map(renderField)}</div>

            {(tab.section === 'topBar' || tab.section === 'highlightsBar') && (
              <div style={{ marginTop: '1.25rem', maxWidth: '720px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Preview</span>
                <div
                  style={{
                    marginTop: '0.25rem',
                    padding: '0.5rem 1rem',
                    textAlign: 'center',
                    fontSize: '0.85rem',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-color)',
                    background: /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(String(draft.bgColor)) ? String(draft.bgColor) : '#ffffff',
                    color: /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(String(draft.textColor)) ? String(draft.textColor) : '#000000',
                    opacity: draft.enabled ? 1 : 0.45,
                  }}
                >
                  {String(draft.text) || 'Announcement text'}
                  {!draft.enabled && ' (hidden)'}
                </div>
              </div>
            )}

            {canUpdate && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginTop: '1.5rem',
                  paddingTop: '1rem',
                  borderTop: '1px solid var(--border-color)',
                }}
              >
                {tabDirty && <span style={{ fontSize: '0.8rem', color: 'var(--badge-warning-text)', marginRight: 'auto' }}>Unsaved changes</span>}
                <button type="button" className="btn btn-secondary" onClick={resetTab} disabled={isSaving || !tabDirty}>
                  Discard changes
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSaving || !tabDirty || conflict}>
                  {isSaving ? 'Saving…' : `Save ${tab.label}`}
                </button>
              </div>
            )}
          </form>
        </>
      ) : null}
    </div>
  );
}

export default function SettingsPage() {
  return (
    <PermissionGate permission="settings:read" area="Site Settings">
      <SettingsScreen />
    </PermissionGate>
  );
}
