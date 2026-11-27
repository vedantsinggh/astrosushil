'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../lib/auth-context';
import { apiErrorMessage } from '../../lib/api/uploads';
import { settingsApi, SiteSettings } from '../../lib/api/content';
import { listConsultationOptions, ConsultationOption } from '../../lib/api/bookings';
import { fetchShopProducts, formatPaise, listReportCatalog, ReportCatalogEntry, ShopProduct } from '../../lib/api/catalogue';
import { Notice, PageHeader, PermissionGate } from '../../components/catalogue/ui';

type AppHome = SiteSettings['appHome'];

const MODE_LABEL: Record<string, string> = { CALL: 'Call', VIDEO: 'Video', IN_PERSON: 'In person', MESSAGE: 'WhatsApp message' };
const MAX_ITEMS = 20;

interface PickOption {
  id: string;
  label: string;
  note?: string;
}

/**
 * Mobile app home page (owner decision 2026-11-27): which consultations, reports and products the
 * app features, in order, and which content sections it shows. An empty list lets the app show
 * the first few automatically.
 */
function AppHomeScreen() {
  const { hasPermission } = useAuth();
  const canEdit = hasPermission('settings:update');
  const [value, setValue] = useState<AppHome | null>(null);
  const [consultations, setConsultations] = useState<ConsultationOption[]>([]);
  const [reports, setReports] = useState<ReportCatalogEntry[]>([]);
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [settings, consultationList, reportList, productPage] = await Promise.all([
        settingsApi.get(),
        listConsultationOptions(),
        listReportCatalog(),
        fetchShopProducts({ page: 1, limit: 200 }),
      ]);
      setValue(settings.appHome);
      setConsultations(consultationList);
      setReports(reportList);
      setProducts(productPage.products);
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to load the app home settings'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const consultationOptions = useMemo<PickOption[]>(
    () =>
      consultations.map((c) => ({
        id: c.catalogId,
        label: `${c.title} · ${MODE_LABEL[c.mode] ?? c.mode}`,
        note: formatPaise(c.priceWithGstPaise),
      })),
    [consultations],
  );
  const reportOptions = useMemo<PickOption[]>(
    () =>
      [...reports]
        .sort((a, b) => Number(!!b.websiteProduct) - Number(!!a.websiteProduct) || a.effective.name.localeCompare(b.effective.name))
        .map((r) => ({
          id: r.catalogId,
          label: r.effective.name,
          note: r.effective.isActive ? formatPaise(r.effective.priceWithGstPaise) : 'off sale',
        })),
    [reports],
  );
  const productOptions = useMemo<PickOption[]>(
    () => products.map((p) => ({ id: p.id, label: p.name, note: p.isPublished ? undefined : 'not published' })),
    [products],
  );

  const set = <K extends keyof AppHome>(key: K, next: AppHome[K]) => setValue((current) => (current ? { ...current, [key]: next } : current));

  const save = async () => {
    if (!value) return;
    setIsSaving(true);
    setError(null);
    setNotice(null);
    try {
      const saved = await settingsApi.update({ appHome: value });
      setValue(saved.appHome);
      setNotice('Saved. The app shows the change within a minute.');
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not save'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="App Home"
        subtitle="What the mobile app home page features, below today's horoscope and the free tools. Leave a list empty to show the first few automatically."
        actions={
          <button className="btn btn-primary" onClick={save} disabled={!canEdit || !value || isSaving}>
            {isSaving ? 'Saving…' : 'Save'}
          </button>
        }
      />
      <Notice kind="error" onDismiss={() => setError(null)}>{error}</Notice>
      <Notice kind="success" onDismiss={() => setNotice(null)}>{notice}</Notice>

      {isLoading || !value ? (
        <div className="card" style={{ padding: '1.5rem', color: 'var(--text-muted)' }}>{isLoading ? 'Loading…' : 'Nothing to show.'}</div>
      ) : (
        <div style={{ display: 'grid', gap: '1.25rem' }}>
          <PickList
            title="Consultations"
            hint="Shown first, under “Consult Astro Sushil”. Each line is one consultation and mode."
            options={consultationOptions}
            chosen={value.featuredConsultationSkus}
            onChange={(ids) => set('featuredConsultationSkus', ids)}
            disabled={!canEdit}
          />
          <PickList
            title="Reports"
            hint="Shown under “Popular reports”. Reports that are off sale are skipped in the app."
            options={reportOptions}
            chosen={value.featuredReportIds}
            onChange={(ids) => set('featuredReportIds', ids)}
            disabled={!canEdit}
          />
          <PickList
            title="Shop products"
            hint="Shown under “From the shop”. Unpublished products are skipped in the app."
            options={productOptions}
            chosen={value.featuredProductIds}
            onChange={(ids) => set('featuredProductIds', ids)}
            disabled={!canEdit}
          />
          <div className="card" style={{ padding: '1.25rem' }}>
            <h3 style={{ margin: '0 0 0.75rem' }}>Other sections</h3>
            <div style={{ display: 'grid', gap: '0.6rem' }}>
              <Switch label="Stars who rely on Astro Sushil (celebrity videos)" checked={value.showStarVideos} onChange={(v) => set('showStarVideos', v)} disabled={!canEdit} />
              <Switch label="Watch on YouTube (podcast videos)" checked={value.showYoutube} onChange={(v) => set('showYoutube', v)} disabled={!canEdit} />
              <Switch label="What clients say (testimonials)" checked={value.showTestimonials} onChange={(v) => set('showTestimonials', v)} disabled={!canEdit} />
              <Switch label="From the blog (latest posts)" checked={value.showBlogs} onChange={(v) => set('showBlogs', v)} disabled={!canEdit} />
            </div>
            <p style={{ margin: '0.75rem 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Videos, testimonials and blogs come from the Media, Testimonials and Blogs screens.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function PickList({
  title,
  hint,
  options,
  chosen,
  onChange,
  disabled,
}: {
  title: string;
  hint: string;
  options: PickOption[];
  chosen: string[];
  onChange: (ids: string[]) => void;
  disabled: boolean;
}) {
  const byId = useMemo(() => new Map(options.map((o) => [o.id, o])), [options]);
  const available = options.filter((o) => !chosen.includes(o.id));
  const move = (index: number, delta: number) => {
    const next = [...chosen];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  return (
    <div className="card" style={{ padding: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '1rem', flexWrap: 'wrap' }}>
        <h3 style={{ margin: 0 }}>{title}</h3>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          {chosen.length === 0 ? 'Automatic' : `${chosen.length} of ${MAX_ITEMS}`}
        </span>
      </div>
      <p style={{ margin: '0.35rem 0 0.9rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>{hint}</p>

      {chosen.length > 0 && (
        <ol style={{ listStyle: 'none', margin: '0 0 0.9rem', padding: 0, display: 'grid', gap: '0.4rem' }}>
          {chosen.map((id, index) => {
            const option = byId.get(id);
            return (
              <li key={id} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.5rem 0.75rem', border: '1px solid var(--border-color)', borderRadius: 8 }}>
                <span style={{ width: 22, color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>{index + 1}.</span>
                <span style={{ flex: 1, minWidth: 0, overflowWrap: 'anywhere' }}>
                  {option ? option.label : <span style={{ color: 'var(--text-muted)' }}>No longer available ({id})</span>}
                  {option?.note && <span style={{ marginLeft: 8, fontSize: '0.8rem', color: 'var(--text-muted)' }}>{option.note}</span>}
                </span>
                <button type="button" className="btn btn-secondary" style={{ padding: '0.15rem 0.5rem' }} disabled={disabled || index === 0} onClick={() => move(index, -1)} aria-label="Move up">
                  Up
                </button>
                <button type="button" className="btn btn-secondary" style={{ padding: '0.15rem 0.5rem' }} disabled={disabled || index === chosen.length - 1} onClick={() => move(index, 1)} aria-label="Move down">
                  Down
                </button>
                <button type="button" className="btn btn-secondary" style={{ padding: '0.15rem 0.5rem' }} disabled={disabled} onClick={() => onChange(chosen.filter((c) => c !== id))}>
                  Remove
                </button>
              </li>
            );
          })}
        </ol>
      )}

      <select
        className="input-control"
        value=""
        disabled={disabled || chosen.length >= MAX_ITEMS || available.length === 0}
        onChange={(e) => {
          if (e.target.value) onChange([...chosen, e.target.value]);
        }}
      >
        <option value="">{chosen.length >= MAX_ITEMS ? `Limit of ${MAX_ITEMS} reached` : 'Add…'}</option>
        {available.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
            {o.note ? ` (${o.note})` : ''}
          </option>
        ))}
      </select>
    </div>
  );
}

function Switch({ label, checked, onChange, disabled }: { label: string; checked: boolean; onChange: (value: boolean) => void; disabled: boolean }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: disabled ? 'default' : 'pointer' }}>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

export default function AppHomePage() {
  return (
    <PermissionGate permission="settings:read">
      <AppHomeScreen />
    </PermissionGate>
  );
}
