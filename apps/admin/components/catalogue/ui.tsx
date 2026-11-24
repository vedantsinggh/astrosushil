'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../lib/auth-context';

/**
 * Small building blocks shared by the catalogue, people and administration screens. They only
 * compose the admin's existing classes (card, btn, badge, input-control, admin-table).
 */

export const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.75rem',
  fontWeight: 600,
  color: 'var(--text-secondary)',
  marginBottom: '0.25rem',
};

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString();
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString();
}

export function Breadcrumbs({ items }: { items: Array<{ label: string; href?: string }> }) {
  return (
    <nav style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
      <Link href="/dashboard" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>
        Admin
      </Link>
      {items.map((item, index) => (
        <React.Fragment key={`${item.label}-${index}`}>
          {' → '}
          {item.href ? (
            <Link href={item.href} style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>
              {item.label}
            </Link>
          ) : (
            <strong style={{ color: 'var(--text-primary)' }}>{item.label}</strong>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
      <div>
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="page-subtitle" style={{ marginBottom: 0 }}>{subtitle}</p>}
      </div>
      {actions && <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>{actions}</div>}
    </div>
  );
}

export function Notice({ kind, children, onDismiss }: { kind: 'success' | 'error' | 'warning' | 'info'; children: React.ReactNode; onDismiss?: () => void }) {
  if (!children) return null;
  const badge = kind === 'success' ? 'badge-success' : kind === 'error' ? 'badge-danger' : kind === 'warning' ? 'badge-warning' : 'badge-info';
  return (
    <div
      role={kind === 'error' ? 'alert' : 'status'}
      className={`badge ${badge}`}
      style={{
        padding: '0.85rem 1rem',
        borderRadius: 'var(--radius-md)',
        width: '100%',
        marginBottom: '1.5rem',
        display: 'flex',
        justifyContent: 'space-between',
        gap: '1rem',
        fontSize: '0.85rem',
        textTransform: 'none',
        letterSpacing: 'normal',
        textAlign: 'left',
      }}
    >
      <span>{children}</span>
      {onDismiss && (
        <button type="button" onClick={onDismiss} aria-label="Dismiss" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontWeight: 700 }}>
          ×
        </button>
      )}
    </div>
  );
}

/** Route guard: renders the page only for a user who holds the permission (the API enforces it as well). */
export function PermissionGate({ permission, children }: { permission: string | string[]; children: React.ReactNode }) {
  const { hasPermission } = useAuth();
  const keys = Array.isArray(permission) ? permission : [permission];
  if (!keys.some((key) => hasPermission(key))) {
    return (
      <div className="card" style={{ maxWidth: '560px' }}>
        <h1 className="page-title">Access denied</h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
          Your role does not include the permission needed for this page ({keys.join(' or ')}). Ask an administrator to
          add it to your role, then sign in again.
        </p>
        <Link href="/dashboard" className="btn btn-secondary" style={{ marginTop: '1rem' }}>
          Back to dashboard
        </Link>
      </div>
    );
  }
  return <>{children}</>;
}

export function Field({
  label,
  required,
  hint,
  error,
  children,
  style,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string | null;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div style={{ marginBottom: '1rem', ...style }}>
      <label style={labelStyle}>
        {label}
        {required ? ' *' : ''}
      </label>
      {children}
      {hint && !error && <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{hint}</p>}
      {error && (
        <p role="alert" style={{ fontSize: '0.75rem', color: 'var(--badge-danger-text)', marginTop: '0.25rem', fontWeight: 600 }}>
          {error}
        </p>
      )}
    </div>
  );
}

export function Checkbox({
  label,
  checked,
  onChange,
  disabled,
  hint,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  hint?: string;
}) {
  return (
    <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.875rem', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.6 : 1 }}>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} style={{ marginTop: '0.2rem' }} />
      <span>
        {label}
        {hint && <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)' }}>{hint}</span>}
      </span>
    </label>
  );
}

export function Modal({
  title,
  onClose,
  children,
  width = 520,
  busy,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  width?: number;
  busy?: boolean;
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, busy]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}
    >
      <div className="card" style={{ maxWidth: `${width}px`, width: '100%', padding: '1.5rem', maxHeight: '90vh', overflowY: 'auto' }}>
        <h3 style={{ marginTop: 0, marginBottom: '1rem', color: 'var(--text-primary)', fontSize: '1.1rem' }}>{title}</h3>
        {children}
      </div>
    </div>
  );
}

/** Confirmation before a destructive action. An error from the action stays visible inside the dialog. */
export function ConfirmDialog({
  title,
  children,
  confirmLabel,
  onConfirm,
  onCancel,
  busy,
  error,
  danger = true,
}: {
  title: string;
  children: React.ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  busy?: boolean;
  error?: string | null;
  danger?: boolean;
}) {
  return (
    <Modal title={title} onClose={onCancel} busy={busy} width={480}>
      <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>{children}</div>
      {error && <Notice kind="error">{error}</Notice>}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
        <button type="button" onClick={onCancel} disabled={busy} className="btn btn-secondary">
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={busy}
          className="btn btn-primary"
          style={danger ? { backgroundColor: 'var(--badge-danger-text)' } : undefined}
        >
          {busy ? 'Working…' : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

export function Pagination({
  page,
  totalPages,
  total,
  noun,
  onPage,
  disabled,
}: {
  page: number;
  totalPages: number;
  total: number;
  noun: string;
  onPage: (page: number) => void;
  disabled?: boolean;
}) {
  const pages = Math.max(1, totalPages);
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)', flexWrap: 'wrap', gap: '0.5rem' }}>
      <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
        Showing page <strong>{page}</strong> of <strong>{pages}</strong> ({total} {noun})
      </span>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button onClick={() => onPage(page - 1)} disabled={page <= 1 || disabled} className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}>
          Previous
        </button>
        <button onClick={() => onPage(page + 1)} disabled={page >= pages || disabled} className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}>
          Next
        </button>
      </div>
    </div>
  );
}

export function SkeletonRows({ columns, rows = 5 }: { columns: number; rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }, (_, i) => (
        <tr key={i}>
          <td colSpan={columns}>
            <div className="skeleton" style={{ height: '24px', width: '100%' }} />
          </td>
        </tr>
      ))}
    </>
  );
}

export function EmptyRow({ columns, children }: { columns: number; children: React.ReactNode }) {
  return (
    <tr>
      <td colSpan={columns} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
        {children}
      </td>
    </tr>
  );
}

export const smallButton: React.CSSProperties = { padding: '0.25rem 0.5rem', fontSize: '0.75rem' };

/** Free-text list (keywords, tags): Enter or comma adds, × removes. */
export function TagInput({
  value,
  onChange,
  placeholder,
  max = 50,
  maxLength = 100,
}: {
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  max?: number;
  maxLength?: number;
}) {
  const [draft, setDraft] = useState('');

  const add = () => {
    const tag = draft.trim().slice(0, maxLength);
    if (!tag) return;
    if (!value.some((v) => v.toLowerCase() === tag.toLowerCase()) && value.length < max) onChange([...value, tag]);
    setDraft('');
  };

  return (
    <div>
      {value.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '0.5rem' }}>
          {value.map((tag) => (
            <span key={tag} className="badge badge-info" style={{ textTransform: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
              {tag}
              <button
                type="button"
                aria-label={`Remove ${tag}`}
                onClick={() => onChange(value.filter((v) => v !== tag))}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontWeight: 700, padding: 0 }}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      <input
        type="text"
        className="input-control"
        value={draft}
        placeholder={placeholder}
        disabled={value.length >= max}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={add}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            add();
          }
        }}
      />
    </div>
  );
}

export function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card" style={{ marginBottom: '1.5rem' }}>
      <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-primary)' }}>{title}</h2>
      {children}
    </div>
  );
}

export const gridTwo: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0 1rem' };
