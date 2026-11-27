'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../../lib/api-client';
import { useAuth } from '../../lib/auth-context';
import { CustomerOption } from '../../lib/api/sales';
import { CustomerSearch } from '../../components/sales/CustomerSearch';
import { ErrorBanner, InfoBox, PageHeader, SectionTitle, SuccessBanner } from '../../components/sales/ui';
import { formatDateTime } from '../../components/sales/format';

type Channel = 'PUSH' | 'IN_APP' | 'EMAIL' | 'SMS' | 'WHATSAPP';
type Segment = 'ALL_CUSTOMERS' | 'APP_USERS' | 'REPORT_BUYERS' | 'CONSULTATION_BUYERS' | 'PRODUCT_BUYERS' | 'JOINED_BETWEEN';
type Availability = Record<Channel, { available: boolean; note: string | null }>;

interface Campaign {
  id: string;
  kind: 'IMPORTANT' | 'PROMOTION';
  title: string;
  body: string;
  channels: Channel[];
  status: string;
  recipients: number;
  skippedNoConsent: number;
  inApp: number;
  pushSent: number;
  pushFailed: number;
  noDevice: number;
  emailQueued: number;
  smsQueued: number;
  whatsappQueued: number;
  error: string | null;
  createdByName: string | null;
  createdAt: string;
}

interface Preview {
  matched: number;
  willReceive: number;
  skippedNoConsent: number;
  withApp: number;
  withEmail: number;
  withPhone: number;
  unmatched: string[];
}

const SEGMENTS: Array<{ value: Segment; label: string }> = [
  { value: 'ALL_CUSTOMERS', label: 'All customers' },
  { value: 'APP_USERS', label: 'Customers who have the mobile app' },
  { value: 'REPORT_BUYERS', label: 'Bought a report' },
  { value: 'CONSULTATION_BUYERS', label: 'Booked a consultation' },
  { value: 'PRODUCT_BUYERS', label: 'Bought a product' },
  { value: 'JOINED_BETWEEN', label: 'Joined between two dates' },
];

const CHANNELS: Array<{ value: Channel; label: string; hint: string }> = [
  { value: 'PUSH', label: 'Mobile app push', hint: 'Banner on the phone, and saved in the app inbox' },
  { value: 'IN_APP', label: 'App inbox only', hint: 'Saved in the app’s notification list, no banner' },
  { value: 'EMAIL', label: 'E-mail', hint: 'Free text, branded e-mail' },
  { value: 'SMS', label: 'SMS', hint: 'Approved DLT template only' },
  { value: 'WHATSAPP', label: 'WhatsApp', hint: 'Approved WhatsApp template only' },
];

const label: React.CSSProperties = { display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.3rem' };

export default function NotificationsPage() {
  const { hasPermission } = useAuth();
  const canSend = hasPermission('notifications:send');

  const [kind, setKind] = useState<'IMPORTANT' | 'PROMOTION'>('IMPORTANT');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [link, setLink] = useState('');
  const [channels, setChannels] = useState<Channel[]>(['PUSH']);
  const [audienceType, setAudienceType] = useState<'users' | 'segment' | 'list'>('users');
  const [picked, setPicked] = useState<CustomerOption[]>([]);
  const [segment, setSegment] = useState<Segment>('ALL_CUSTOMERS');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [listText, setListText] = useState('');

  const [availability, setAvailability] = useState<Availability | null>(null);
  const [history, setHistory] = useState<Campaign[]>([]);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState<'preview' | 'send' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    try {
      const res = await apiFetch<{ items: Campaign[]; channels: Availability }>('/api/v1/admin/notifications/campaigns?limit=30');
      setHistory(res.items);
      setAvailability(res.channels);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load the sent messages');
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // Refresh while a send is still running.
  useEffect(() => {
    if (!history.some((c) => c.status === 'QUEUED' || c.status === 'SENDING')) return;
    const t = setTimeout(loadHistory, 3000);
    return () => clearTimeout(t);
  }, [history, loadHistory]);

  const audience = useMemo(() => {
    if (audienceType === 'users') return { type: 'users' as const, userIds: picked.map((c) => c.id) };
    if (audienceType === 'list') {
      const entries = listText.split(/[\s,;]+/).map((x) => x.trim()).filter(Boolean);
      return { type: 'list' as const, entries };
    }
    return { type: 'segment' as const, segment, ...(segment === 'JOINED_BETWEEN' ? { ...(from ? { from } : {}), ...(to ? { to } : {}) } : {}) };
  }, [audienceType, picked, listText, segment, from, to]);

  // Any change makes an earlier preview stale.
  useEffect(() => setPreview(null), [audience, kind]);

  const audienceProblem =
    audienceType === 'users' && picked.length === 0
      ? 'Pick at least one customer.'
      : audienceType === 'list' && audience.type === 'list' && audience.entries.length === 0
        ? 'Paste at least one phone number or e-mail.'
        : audienceType === 'segment' && segment === 'JOINED_BETWEEN' && !from && !to
          ? 'Choose the joining dates.'
          : null;

  const toggleChannel = (c: Channel) => setChannels((cur) => (cur.includes(c) ? cur.filter((x) => x !== c) : [...cur, c]));

  const runPreview = async () => {
    if (audienceProblem) return setError(audienceProblem);
    setBusy('preview');
    setError(null);
    try {
      setPreview(await apiFetch<Preview>('/api/v1/admin/notifications/campaigns/preview', { method: 'POST', body: JSON.stringify({ kind, audience }) }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Preview failed');
    } finally {
      setBusy(null);
    }
  };

  const send = async () => {
    if (!title.trim() || !body.trim()) return setError('Write a title and a message.');
    if (channels.length === 0) return setError('Choose at least one way to send.');
    if (audienceProblem) return setError(audienceProblem);
    if (!preview) return setError('Check the audience first ("Preview audience").');
    if (!window.confirm(`Send "${title.trim()}" to ${preview.willReceive} customer(s)? This cannot be undone.`)) return;
    setBusy('send');
    setError(null);
    try {
      await apiFetch('/api/v1/admin/notifications/campaigns', {
        method: 'POST',
        body: JSON.stringify({ kind, title: title.trim(), body: body.trim(), ...(link.trim() ? { link: link.trim() } : {}), channels, audience }),
      });
      setNotice('Sending started. Progress and counts appear in "Sent messages" below.');
      setTitle('');
      setBody('');
      setLink('');
      setPreview(null);
      await loadHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sending failed');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      <PageHeader
        crumbs={[{ label: 'Notifications' }]}
        title="Send notifications"
        subtitle="Message one customer, a list or a group by mobile app push, the app inbox, e-mail, SMS or WhatsApp"
      />
      <ErrorBanner message={error} />
      <SuccessBanner message={notice} onClose={() => setNotice(null)} />

      {canSend ? (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <SectionTitle>1. Message</SectionTitle>
          <div style={{ display: 'grid', gap: '0.9rem', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', marginBottom: '1rem' }}>
            <div>
              <span style={label}>Kind of message</span>
              <select className="input-control" value={kind} onChange={(e) => setKind(e.target.value as 'IMPORTANT' | 'PROMOTION')}>
                <option value="IMPORTANT">Important update (service, booking, policy) — goes to everyone chosen</option>
                <option value="PROMOTION">Promotion / offer — only customers who allowed offers</option>
              </select>
            </div>
            <div>
              <span style={label}>Link (optional)</span>
              <input className="input-control" placeholder="https://astrosushil.com/..." value={link} onChange={(e) => setLink(e.target.value)} />
            </div>
          </div>
          <div style={{ marginBottom: '0.9rem' }}>
            <span style={label}>Title</span>
            <input className="input-control" maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Diwali offer: 20% off all reports" />
          </div>
          <div style={{ marginBottom: '1.25rem' }}>
            <span style={label}>Message</span>
            <textarea className="input-control" rows={4} maxLength={1000} value={body} onChange={(e) => setBody(e.target.value)} />
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'right' }}>{body.length} / 1000 · a phone banner shows about the first 240 characters</div>
          </div>

          <SectionTitle>2. Send by</SectionTitle>
          <div style={{ display: 'grid', gap: '0.5rem', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', marginBottom: '1.25rem' }}>
            {CHANNELS.map((c) => {
              const a = availability?.[c.value];
              const disabled = a ? !a.available : false;
              return (
                <label
                  key={c.value}
                  style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', padding: '0.6rem 0.7rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', opacity: disabled ? 0.55 : 1, cursor: disabled ? 'not-allowed' : 'pointer' }}
                  title={a?.note ?? ''}
                >
                  <input type="checkbox" disabled={disabled} checked={channels.includes(c.value) && !disabled} onChange={() => toggleChannel(c.value)} style={{ marginTop: 3 }} />
                  <span>
                    <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{c.label}</span>
                    <span style={{ display: 'block', fontSize: '0.74rem', color: 'var(--text-muted)', overflowWrap: 'anywhere' }}>{a?.note ?? c.hint}</span>
                  </span>
                </label>
              );
            })}
          </div>

          <SectionTitle>3. To</SectionTitle>
          <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
            {(
              [
                ['users', 'Chosen customers'],
                ['segment', 'A group'],
                ['list', 'Paste phone / e-mail list'],
              ] as const
            ).map(([value, text]) => (
              <button key={value} type="button" className={`btn ${audienceType === value ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setAudienceType(value)}>
                {text}
              </button>
            ))}
          </div>

          {audienceType === 'users' && (
            <div style={{ marginBottom: '1rem' }}>
              <CustomerSearch onPick={(c) => setPicked((cur) => (cur.some((x) => x.id === c.id) ? cur : [...cur, c]))} excludeIds={picked.map((c) => c.id)} pickLabel="Add" />
              {picked.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.6rem' }}>
                  {picked.map((c) => (
                    <span key={c.id} className="badge badge-info" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0.25rem 0.5rem' }}>
                      {c.fullName || c.phoneNumber || c.email}
                      <button type="button" onClick={() => setPicked((cur) => cur.filter((x) => x.id !== c.id))} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'inherit' }} aria-label="Remove">
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
          {audienceType === 'segment' && (
            <div style={{ display: 'grid', gap: '0.75rem', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', marginBottom: '1rem' }}>
              <select className="input-control" value={segment} onChange={(e) => setSegment(e.target.value as Segment)}>
                {SEGMENTS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
              {segment === 'JOINED_BETWEEN' && (
                <>
                  <input type="date" className="input-control" value={from} onChange={(e) => setFrom(e.target.value)} />
                  <input type="date" className="input-control" value={to} onChange={(e) => setTo(e.target.value)} />
                </>
              )}
            </div>
          )}
          {audienceType === 'list' && (
            <div style={{ marginBottom: '1rem' }}>
              <textarea className="input-control" rows={5} value={listText} onChange={(e) => setListText(e.target.value)} placeholder={'One per line, or separated by commas:\n9876543210\n+919812345678\nname@example.com'} />
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Only numbers and e-mails of existing customers are messaged; the rest are listed in the preview.</div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-secondary" onClick={runPreview} disabled={busy !== null}>
              {busy === 'preview' ? 'Checking…' : 'Preview audience'}
            </button>
            <button type="button" className="btn btn-primary" onClick={send} disabled={busy !== null || !preview || preview.willReceive === 0}>
              {busy === 'send' ? 'Sending…' : preview ? `Send to ${preview.willReceive} customer(s)` : 'Send'}
            </button>
          </div>

          {preview && (
            <div style={{ marginTop: '1rem', fontSize: '0.85rem', background: 'var(--bg-subtle)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '0.75rem 0.9rem' }}>
              <strong>{preview.willReceive}</strong> of {preview.matched} matched customer(s) will get it
              {preview.skippedNoConsent > 0 && ` (${preview.skippedNoConsent} skipped: they have not allowed offers)`}. Of them {preview.withApp} have the app, {preview.withEmail} have an e-mail, {preview.withPhone} have a phone number.
              {preview.unmatched.length > 0 && (
                <div style={{ marginTop: '0.4rem', color: 'var(--badge-warning-text)' }}>
                  Not found ({preview.unmatched.length}): {preview.unmatched.slice(0, 20).join(', ')}
                  {preview.unmatched.length > 20 ? '…' : ''}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <InfoBox>Sending needs the “Send Notifications to Customers” permission.</InfoBox>
      )}

      <div className="card">
        <SectionTitle>Sent messages</SectionTitle>
        <div className="table-container" style={{ border: 'none', boxShadow: 'none' }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>When</th>
                <th>Message</th>
                <th>Kind</th>
                <th>By</th>
                <th style={{ textAlign: 'right' }}>Customers</th>
                <th>Delivery</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                    Nothing sent yet.
                  </td>
                </tr>
              )}
              {history.map((c) => (
                <tr key={c.id}>
                  <td style={{ whiteSpace: 'nowrap', fontSize: '0.8rem' }}>{formatDateTime(c.createdAt)}</td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{c.title}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', maxWidth: 360, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.body}</div>
                  </td>
                  <td>
                    <span className={`badge ${c.kind === 'PROMOTION' ? 'badge-warning' : 'badge-info'}`}>{c.kind === 'PROMOTION' ? 'Promotion' : 'Important'}</span>
                  </td>
                  <td style={{ fontSize: '0.8rem' }}>{c.createdByName || '—'}</td>
                  <td style={{ textAlign: 'right' }}>{c.recipients}</td>
                  <td style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                    {[
                      c.inApp ? `inbox ${c.inApp}` : '',
                      c.pushSent || c.pushFailed ? `push ${c.pushSent}${c.pushFailed ? ` (${c.pushFailed} failed)` : ''}` : '',
                      c.noDevice ? `no app ${c.noDevice}` : '',
                      c.emailQueued ? `e-mail ${c.emailQueued}` : '',
                      c.smsQueued ? `SMS ${c.smsQueued}` : '',
                      c.whatsappQueued ? `WhatsApp ${c.whatsappQueued}` : '',
                      c.skippedNoConsent ? `no consent ${c.skippedNoConsent}` : '',
                    ]
                      .filter(Boolean)
                      .join(' · ') || '—'}
                  </td>
                  <td>
                    <span className={`badge ${c.status === 'SENT' ? 'badge-success' : c.status === 'FAILED' ? 'badge-danger' : 'badge-info'}`} title={c.error ?? ''}>
                      {c.status === 'SENT' ? 'Sent' : c.status === 'FAILED' ? 'Failed' : 'Sending…'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
