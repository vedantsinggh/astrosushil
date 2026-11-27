'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAuth } from '../../../lib/auth-context';
import { apiErrorMessage } from '../../../lib/api/uploads';
import type { UploadedFileRef } from '../../../lib/api/uploads';
import {
  formatPaise,
  getReportCatalogEntry,
  ReportCatalogEntry,
  ReportCatalogUpdate,
  ReportContentBlock,
  ReportFaq,
  resetReportCatalogEntry,
  updateReportCatalogEntry,
} from '../../../lib/api/catalogue';
import { Breadcrumbs, Checkbox, ConfirmDialog, Field, gridTwo, Notice, PageHeader, PermissionGate, SectionCard } from '../../../components/catalogue/ui';
import { UploadField } from '../../../components/uploads/UploadField';
import { GstBreakdown } from '../../../components/GstBreakdown';

interface FormState {
  name: string;
  slug: string;
  shortDescription: string;
  description: string;
  cover: UploadedFileRef | null;
  salePrice: string;
  /** The typed price already contains GST (customer pays exactly this). */
  includesGst: boolean;
  originalPrice: string;
  gstPercent: string;
  isActive: boolean;
  isPremium: boolean;
  hsnSac: string;
  benefits: ReportContentBlock[];
  features: ReportContentBlock[];
  faqs: ReportFaq[];
}

const rupees = (paise: number | null | undefined) => (paise === null || paise === undefined ? '' : (paise / 100).toFixed(2).replace(/\.00$/, ''));
const toPaise = (text: string): number | null => {
  const value = text.trim();
  if (!value) return null;
  if (!/^\d+(\.\d{1,2})?$/.test(value)) return NaN;
  return Math.round(Number(value) * 100);
};

function toForm(entry: ReportCatalogEntry): FormState {
  const e = entry.edits;
  return {
    name: entry.effective.name,
    slug: entry.effective.slug ?? '',
    shortDescription: e?.shortDescription ?? '',
    description: e?.description ?? entry.effective.description,
    cover: e?.coverImageUrl ? { url: e.coverImageUrl, key: e.coverImageKey ?? '' } as UploadedFileRef : null,
    // Show the price the way it was entered: the final amount for a GST-inclusive entry.
    salePrice: rupees(e?.priceIncludesGst ? entry.effective.priceWithGstPaise : entry.effective.salePricePaise),
    includesGst: e?.priceIncludesGst ?? false,
    originalPrice: rupees(entry.effective.originalPricePaise),
    gstPercent: String(entry.effective.gstRateBp / 100),
    isActive: entry.effective.isActive,
    isPremium: e?.isPremium ?? true,
    hsnSac: e?.hsnSac ?? '',
    benefits: e?.benefits ?? [],
    features: e?.features ?? [],
    faqs: e?.faqs ?? [],
  };
}

function BlockList({
  title,
  items,
  onChange,
  disabled,
}: {
  title: string;
  items: ReportContentBlock[];
  onChange: (items: ReportContentBlock[]) => void;
  disabled: boolean;
}) {
  const update = (index: number, patch: Partial<ReportContentBlock>) => onChange(items.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  return (
    <SectionCard title={title}>
      {items.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: '0.84rem', marginBottom: '0.75rem' }}>None yet.</p>}
      {items.map((item, index) => (
        <div key={index} style={{ display: 'grid', gridTemplateColumns: '1fr 2fr auto', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'start' }}>
          <input className="input-control" placeholder="Title" value={item.title} maxLength={200} disabled={disabled} onChange={(e) => update(index, { title: e.target.value })} />
          <textarea className="input-control" rows={2} placeholder="Description" value={item.description} maxLength={2000} disabled={disabled} onChange={(e) => update(index, { description: e.target.value })} />
          <button type="button" className="btn btn-danger" disabled={disabled} onClick={() => onChange(items.filter((_, i) => i !== index))}>
            Remove
          </button>
        </div>
      ))}
      <button type="button" className="btn btn-secondary" disabled={disabled || items.length >= 30} onClick={() => onChange([...items, { title: '', description: '' }])}>
        Add
      </button>
    </SectionCard>
  );
}

function ReportEditor({ catalogId }: { catalogId: string }) {
  const { hasPermission } = useAuth();
  const canEdit = hasPermission('pdf_reports:update');
  const [entry, setEntry] = useState<ReportCatalogEntry | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const loaded = await getReportCatalogEntry(catalogId);
      setEntry(loaded);
      setForm(toForm(loaded));
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to load the report'));
    }
  }, [catalogId]);

  useEffect(() => {
    load();
  }, [load]);

  if (!form || !entry) {
    return error ? <Notice kind="error">{error}</Notice> : <div className="skeleton" style={{ height: 300 }} />;
  }

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((current) => (current ? { ...current, [key]: value } : current));

  const sale = toPaise(form.salePrice);
  const gstBp = form.gstPercent.trim() === '' ? NaN : Math.round(Number(form.gstPercent) * 100);

  const save = async () => {
    setError(null);
    setNotice(null);
    const original = toPaise(form.originalPrice);
    if (!form.name.trim()) return setError('Enter a name.');
    if (sale === null || Number.isNaN(sale)) return setError('Enter the price in rupees, e.g. 999 or 299.50.');
    if (original !== null && Number.isNaN(original)) return setError('The original price must be in rupees, e.g. 799.');
    if (Number.isNaN(gstBp) || gstBp < 0 || gstBp > 2800) return setError('GST must be a percentage between 0 and 28.');
    if (form.hsnSac && !/^(\d{4}|\d{6}|\d{8})$/.test(form.hsnSac)) return setError('The SAC code must be 4, 6 or 8 digits.');
    if (form.faqs.some((f) => !f.question.trim() || !f.answer.trim())) return setError('Every FAQ needs a question and an answer.');

    const body: ReportCatalogUpdate = {
      name: form.name.trim(),
      shortDescription: form.shortDescription.trim() || null,
      description: form.description.trim() || null,
      coverImageUrl: form.cover?.url || null,
      coverImageKey: form.cover?.key || null,
      salePricePaise: sale,
      priceIncludesGst: form.includesGst,
      originalPricePaise: original,
      gstRateBp: gstBp,
      isActive: form.isActive,
      isPremium: form.isPremium,
      hsnSac: form.hsnSac || null,
      benefits: form.benefits.filter((b) => b.title.trim()),
      features: form.features.filter((b) => b.title.trim()),
      faqs: form.faqs,
    };
    if (entry.websiteProduct) body.slug = form.slug.trim() || null;

    setIsSaving(true);
    try {
      const updated = await updateReportCatalogEntry(catalogId, body);
      setEntry(updated);
      setForm(toForm(updated));
      setNotice('Saved. The website and the app use the new details from now on; orders already placed keep their price.');
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not save'));
    } finally {
      setIsSaving(false);
    }
  };

  const reset = async () => {
    setConfirmReset(false);
    setIsSaving(true);
    try {
      const updated = await resetReportCatalogEntry(catalogId);
      setEntry(updated);
      setForm(toForm(updated));
      setNotice('All edits removed; the original values apply again.');
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not reset'));
    } finally {
      setIsSaving(false);
    }
  };

  const disabled = !canEdit || isSaving;

  return (
    <div>
      <Breadcrumbs items={[{ label: 'PDF Reports', href: '/report-catalogue' }, { label: entry.effective.name }]} />
      <PageHeader
        title={entry.effective.name}
        subtitle={`Generated as ${entry.reportType ?? '—'} · ${entry.websiteProduct ? 'sold on the website and in the app' : 'sold in the app'}`}
        actions={
          canEdit ? (
            <>
              {entry.edits && (
                <button className="btn btn-secondary" onClick={() => setConfirmReset(true)} disabled={isSaving}>
                  Reset to original
                </button>
              )}
              <button className="btn btn-primary" onClick={save} disabled={isSaving}>
                {isSaving ? 'Saving…' : 'Save changes'}
              </button>
            </>
          ) : undefined
        }
      />

      {error && <Notice kind="error">{error}</Notice>}
      {notice && (
        <Notice kind="success" onDismiss={() => setNotice(null)}>
          {notice}
        </Notice>
      )}

      <SectionCard title="Product">
        <div style={gridTwo}>
          <Field label="Name" required>
            <input className="input-control" value={form.name} maxLength={200} disabled={disabled} onChange={(e) => set('name', e.target.value)} />
          </Field>
          {entry.websiteProduct && (
            <Field label="Website URL slug" hint={`Page: /personalized-astrology-reports/${form.slug || entry.websiteProduct.slug}. The original slug "${entry.websiteProduct.slug}" keeps working.`}>
              <input className="input-control" value={form.slug} maxLength={120} disabled={disabled} onChange={(e) => set('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))} />
            </Field>
          )}
        </div>
        <Field label="Short description">
          <input className="input-control" value={form.shortDescription} maxLength={500} disabled={disabled} onChange={(e) => set('shortDescription', e.target.value)} />
        </Field>
        <Field label="Description">
          <textarea className="input-control" rows={5} value={form.description} maxLength={20000} disabled={disabled} onChange={(e) => set('description', e.target.value)} />
        </Field>
        <UploadField purpose="report-cover" label="Cover image" value={form.cover} onChange={(value) => set('cover', value)} disabled={disabled} />
        <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.75rem' }}>
          <Checkbox label="On sale" checked={form.isActive} onChange={(checked) => set('isActive', checked)} disabled={disabled} />
          <Checkbox label="Premium badge" checked={form.isPremium} onChange={(checked) => set('isPremium', checked)} disabled={disabled} />
        </div>
      </SectionCard>

      <SectionCard title="Price & GST">
        <div style={gridTwo}>
          <Field label="Price (₹)" required hint={`Original: ${formatPaise(entry.defaults.salePricePaise)} + GST`}>
            <input className="input-control" inputMode="decimal" value={form.salePrice} disabled={disabled} onChange={(e) => set('salePrice', e.target.value)} />
            <GstBreakdown amountText={form.salePrice} ratePercentText={form.gstPercent} inclusive={form.includesGst} />
          </Field>
          <Field label="This price is" required>
            <select className="input-control" value={form.includesGst ? 'inclusive' : 'exclusive'} disabled={disabled} onChange={(e) => set('includesGst', e.target.value === 'inclusive')}>
              <option value="exclusive">Exclusive of GST</option>
              <option value="inclusive">Inclusive of GST</option>
            </select>
          </Field>
          <Field label="GST %" required hint={`Original: ${entry.defaults.gstRateBp / 100}%`}>
            <input className="input-control" inputMode="decimal" value={form.gstPercent} disabled={disabled} onChange={(e) => set('gstPercent', e.target.value)} />
          </Field>
          <Field label="Struck-through price (₹)" hint="Shown crossed out next to the price. Leave blank for none.">
            <input className="input-control" inputMode="decimal" value={form.originalPrice} disabled={disabled} onChange={(e) => set('originalPrice', e.target.value)} />
          </Field>
          <Field label="SAC code (GST invoice)" hint="Blank = the default for reports in Website Settings → GST Invoice.">
            <input className="input-control" inputMode="numeric" maxLength={8} value={form.hsnSac} disabled={disabled} onChange={(e) => set('hsnSac', e.target.value.replace(/\D/g, ''))} />
          </Field>
        </div>
      </SectionCard>

      <BlockList title="Benefits" items={form.benefits} onChange={(items) => set('benefits', items)} disabled={disabled} />
      <BlockList title="What the report contains" items={form.features} onChange={(items) => set('features', items)} disabled={disabled} />

      <SectionCard title="FAQs">
        {form.faqs.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: '0.84rem', marginBottom: '0.75rem' }}>None yet.</p>}
        {form.faqs.map((faq, index) => (
          <div key={index} style={{ display: 'grid', gridTemplateColumns: '1fr 2fr auto', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'start' }}>
            <input className="input-control" placeholder="Question" value={faq.question} maxLength={500} disabled={disabled} onChange={(e) => set('faqs', form.faqs.map((f, i) => (i === index ? { ...f, question: e.target.value } : f)))} />
            <textarea className="input-control" rows={2} placeholder="Answer" value={faq.answer} maxLength={5000} disabled={disabled} onChange={(e) => set('faqs', form.faqs.map((f, i) => (i === index ? { ...f, answer: e.target.value } : f)))} />
            <button type="button" className="btn btn-danger" disabled={disabled} onClick={() => set('faqs', form.faqs.filter((_, i) => i !== index))}>
              Remove
            </button>
          </div>
        ))}
        <button type="button" className="btn btn-secondary" disabled={disabled || form.faqs.length >= 50} onClick={() => set('faqs', [...form.faqs, { question: '', answer: '' }])}>
          Add FAQ
        </button>
      </SectionCard>

      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
        <Link href="/report-catalogue">Back to PDF Reports</Link>
      </p>

      {confirmReset && (
        <ConfirmDialog title="Reset to original?" confirmLabel="Reset" onConfirm={reset} onCancel={() => setConfirmReset(false)} danger>
          All edits of this report (name, texts, cover, prices, FAQs) are removed and the original values apply again.
        </ConfirmDialog>
      )}
    </div>
  );
}

export default function ReportCatalogueEditPage() {
  const params = useParams<{ catalogId: string }>();
  const catalogId = decodeURIComponent(String(params?.catalogId ?? ''));
  return (
    <PermissionGate permission="pdf_reports:read">
      <ReportEditor catalogId={catalogId} />
    </PermissionGate>
  );
}
