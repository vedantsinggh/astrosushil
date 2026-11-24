'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../../lib/auth-context';
import { AdminSiteSettings, SiteSettings, apiErrorMessage, formatDateTime, settingsApi } from '../../../lib/api/content';
import { HtmlPreview, RichHtmlEditor } from '../../../components/content/RichHtmlEditor';
import { LoadError, Notice, PageHeader, PermissionGate, useNotice } from '../../../components/content/ui';

/**
 * The legal policy pages of the website. Each is one rich-text (HTML) field of the `legal`
 * settings section, sanitised by the backend on save and rendered as HTML on the website.
 */

type LegalField = keyof SiteSettings['legal'];

interface LegalDoc {
  field: LegalField;
  label: string;
  description: string;
}

const DOCS: LegalDoc[] = [
  { field: 'privacyPolicy', label: 'Privacy Policy', description: 'The website’s privacy policy page.' },
  { field: 'termsConditions', label: 'Terms & Conditions', description: 'The website’s terms and conditions page.' },
  { field: 'cancellationRefundPolicy', label: 'Cancellation & Refund', description: 'The website’s cancellation and refund policy page.' },
  { field: 'shippingDeliveryPolicy', label: 'Shipping & Delivery', description: 'The website’s shipping and delivery policy page.' },
  {
    field: 'returnPolicyText',
    label: 'Return Policy Text',
    description: 'Stored with the settings. The website does not show this text on any page at present.',
  },
];

const MAX_LENGTH = 5_000_000;

function LegalScreen() {
  const { hasPermission } = useAuth();
  const canUpdate = hasPermission('settings:update');

  const [settings, setSettings] = useState<AdminSiteSettings | null>(null);
  const [drafts, setDrafts] = useState<Record<LegalField, string> | null>(null);
  const [active, setActive] = useState<LegalField>('privacyPolicy');
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
      setDrafts({ ...data.legal });
    } catch (err) {
      setLoadError(apiErrorMessage(err, 'Failed to load the legal pages.'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const dirty = useMemo(() => {
    const set = new Set<LegalField>();
    if (settings && drafts) {
      DOCS.forEach((doc) => {
        if (drafts[doc.field] !== settings.legal[doc.field]) set.add(doc.field);
      });
    }
    return set;
  }, [settings, drafts]);

  // Warn before leaving the page with unsaved changes.
  useEffect(() => {
    if (dirty.size === 0) return undefined;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  const doc = DOCS.find((d) => d.field === active) || DOCS[0];
  const value = drafts ? drafts[doc.field] : '';
  const isDocDirty = dirty.has(doc.field);
  const tooLong = value.length > MAX_LENGTH;

  const save = async () => {
    if (!settings || !drafts || tooLong) return;
    const sent = drafts[doc.field];
    setIsSaving(true);
    clear();
    try {
      const updated = await settingsApi.update({ legal: { [doc.field]: sent } });
      setSettings(updated);
      // Show what was actually stored: the server sanitises the HTML.
      setDrafts((prev) => (prev ? { ...prev, [doc.field]: updated.legal[doc.field] } : prev));
      showSuccess(
        updated.legal[doc.field] === sent
          ? `${doc.label} saved.`
          : `${doc.label} saved. The server removed markup that is not allowed on the website; the editor now shows the stored version.`
      );
    } catch (err) {
      const status = (err as { status?: number } | null)?.status;
      if (status === 409) {
        setConflict(true);
        showError('The settings were changed by someone else while you were editing. Copy your text, reload, and make your change again.');
      } else if (status === 413) {
        showError('The page is too large to save (limit 8 MB). Remove images pasted into the text and link to uploaded images instead.');
      } else {
        showError(apiErrorMessage(err, `Could not save ${doc.label}.`));
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        crumbs={[{ label: 'Site Settings', href: '/settings' }, { label: 'Legal pages' }]}
        title="Legal Pages"
        subtitle={
          settings?.updatedAt
            ? `Policy pages of the website · settings last saved ${formatDateTime(settings.updatedAt)} (IST)`
            : 'Policy pages of the website'
        }
        actions={
          <>
            <button type="button" className="btn btn-secondary" style={{ fontSize: '0.85rem' }} onClick={load} disabled={isSaving}>
              🔄 Reload
            </button>
            <Link href="/settings" className="btn btn-secondary">
              ← Site settings
            </Link>
          </>
        }
      />

      <Notice notice={notice} onClose={clear} />
      {loadError && <LoadError message={loadError} onRetry={load} />}
      {conflict && <LoadError message="Your copy of the settings is out of date. Reloading discards the unsaved text on this page." onRetry={load} />}

      {isLoading ? (
        <div className="card">
          <div className="skeleton" style={{ height: '32px', width: '100%', marginBottom: '1rem' }} />
          <div className="skeleton" style={{ height: '360px', width: '100%' }} />
        </div>
      ) : settings && drafts ? (
        <>
          <div role="tablist" style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
            {DOCS.map((d) => (
              <button
                key={d.field}
                type="button"
                role="tab"
                aria-selected={d.field === doc.field}
                className={`btn ${d.field === doc.field ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
                onClick={() => setActive(d.field)}
              >
                {d.label}
                {dirty.has(d.field) && (
                  <span title="Unsaved changes" style={{ marginLeft: '0.35rem', color: d.field === doc.field ? '#FFF' : 'var(--accent-gold)' }}>
                    ●
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="card">
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700 }}>{doc.label}</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>{doc.description}</p>

            {canUpdate ? (
              <RichHtmlEditor
                key={doc.field}
                value={value}
                onChange={(html) => setDrafts((prev) => (prev ? { ...prev, [doc.field]: html } : prev))}
                rows={24}
                disabled={isSaving}
                invalid={tooLong}
                placeholder={'<h2>Heading</h2>\n<p>Policy text…</p>'}
              />
            ) : value ? (
              <HtmlPreview html={value} height={560} title={doc.label} />
            ) : (
              <p style={{ color: 'var(--text-muted)' }}>This page is empty.</p>
            )}

            {tooLong && (
              <p role="alert" style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--badge-danger-text)', marginTop: '0.5rem' }}>
                The text is too long.
              </p>
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
                {isDocDirty && <span style={{ fontSize: '0.8rem', color: 'var(--badge-warning-text)', marginRight: 'auto' }}>Unsaved changes</span>}
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={isSaving || !isDocDirty}
                  onClick={() => setDrafts((prev) => (prev ? { ...prev, [doc.field]: settings.legal[doc.field] } : prev))}
                >
                  Discard changes
                </button>
                <button type="button" className="btn btn-primary" onClick={save} disabled={isSaving || !isDocDirty || tooLong || conflict}>
                  {isSaving ? 'Saving…' : `Save ${doc.label}`}
                </button>
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}

export default function LegalPagesPage() {
  return (
    <PermissionGate permission="settings:read" area="the legal pages">
      <LegalScreen />
    </PermissionGate>
  );
}
