'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../lib/auth-context';

/** Shared building blocks of the content and settings screens, in the admin's existing look. */

export const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.75rem',
  fontWeight: 600,
  color: 'var(--text-secondary)',
  marginBottom: '0.25rem',
};

export const smallButton: React.CSSProperties = { fontSize: '0.75rem', padding: '0.25rem 0.6rem' };
export const dangerText: React.CSSProperties = { color: 'var(--badge-danger-text)' };

// ---------------------------------------------------------------------------
// Route guard
// ---------------------------------------------------------------------------

/** Renders the page only for staff holding `permission` (the server checks it again on every call). */
export function PermissionGate({ permission, area, children }: { permission: string; area: string; children: React.ReactNode }) {
  const { hasPermission } = useAuth();
  if (!hasPermission(permission)) {
    return (
      <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--badge-danger-text)', marginBottom: '0.5rem' }}>Access Denied</h2>
        <p style={{ color: 'var(--text-secondary)' }}>You do not have permission to access {area}.</p>
      </div>
    );
  }
  return <>{children}</>;
}

// ---------------------------------------------------------------------------
// Page header
// ---------------------------------------------------------------------------

export interface Crumb {
  label: string;
  href?: string;
}

export function PageHeader({
  crumbs,
  title,
  subtitle,
  actions,
}: {
  crumbs: Crumb[];
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <>
      <nav style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
        <Link href="/dashboard" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>
          Admin
        </Link>
        {crumbs.map((crumb, index) => (
          <React.Fragment key={`${crumb.label}-${index}`}>
            {' → '}
            {crumb.href ? (
              <Link href={crumb.href} style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>
                {crumb.label}
              </Link>
            ) : (
              <strong style={{ color: 'var(--text-primary)' }}>{crumb.label}</strong>
            )}
          </React.Fragment>
        ))}
      </nav>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        <div>
          <h1 className="page-title">{title}</h1>
          {subtitle && (
            <p className="page-subtitle" style={{ marginBottom: 0 }}>
              {subtitle}
            </p>
          )}
        </div>
        {actions && <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>{actions}</div>}
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Feedback
// ---------------------------------------------------------------------------

export interface NoticeState {
  kind: 'success' | 'error';
  text: string;
}

/** Success messages disappear after a few seconds; errors stay until dismissed or replaced. */
export function useNotice() {
  const [notice, setNotice] = useState<NoticeState | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clear = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setNotice(null);
  }, []);

  const showSuccess = useCallback((text: string) => {
    if (timer.current) clearTimeout(timer.current);
    setNotice({ kind: 'success', text });
    timer.current = setTimeout(() => setNotice(null), 4000);
  }, []);

  const showError = useCallback((text: string) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setNotice({ kind: 'error', text });
  }, []);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  return { notice, showSuccess, showError, clear };
}

export function Notice({ notice, onClose }: { notice: NoticeState | null; onClose?: () => void }) {
  if (!notice) return null;
  const isError = notice.kind === 'error';
  return (
    <div
      role={isError ? 'alert' : 'status'}
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: '1rem',
        padding: '0.75rem 1rem',
        marginBottom: '1.25rem',
        borderRadius: 'var(--radius-md)',
        fontSize: '0.875rem',
        fontWeight: 600,
        background: isError ? 'var(--badge-danger-bg)' : 'var(--badge-success-bg)',
        color: isError ? 'var(--badge-danger-text)' : 'var(--badge-success-text)',
      }}
    >
      <span style={{ whiteSpace: 'pre-wrap' }}>{notice.text}</span>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Dismiss"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontWeight: 700 }}
        >
          ✕
        </button>
      )}
    </div>
  );
}

/** A load failure with a retry button. */
export function LoadError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div
      role="alert"
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '1rem',
        padding: '0.75rem 1rem',
        marginBottom: '1.25rem',
        borderRadius: 'var(--radius-md)',
        background: 'var(--badge-danger-bg)',
        color: 'var(--badge-danger-text)',
        fontSize: '0.875rem',
        fontWeight: 600,
      }}
    >
      <span>{message}</span>
      {onRetry && (
        <button type="button" className="btn btn-secondary" style={smallButton} onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Form pieces
// ---------------------------------------------------------------------------

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
    <div style={style}>
      <label style={labelStyle}>
        {label}
        {required && <span style={{ color: 'var(--badge-danger-text)' }}> *</span>}
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
  description,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', cursor: disabled ? 'default' : 'pointer' }}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        style={{ marginTop: '0.2rem', width: '16px', height: '16px' }}
      />
      <span>
        <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>{label}</span>
        {description && <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)' }}>{description}</span>}
      </span>
    </label>
  );
}

export function ActiveBadge({ active }: { active: boolean }) {
  return <span className={`badge ${active ? 'badge-success' : 'badge-warning'}`}>{active ? 'Active' : 'Inactive'}</span>;
}

/** Parses the text of a whole-number input. Returns null when it is not an integer in range. */
export function parseInteger(text: string, min: number, max: number): number | null {
  const trimmed = text.trim();
  if (!/^-?\d+$/.test(trimmed)) return null;
  const value = Number(trimmed);
  if (!Number.isSafeInteger(value) || value < min || value > max) return null;
  return value;
}

export const ORDER_MIN = -100000;
export const ORDER_MAX = 100000;

// ---------------------------------------------------------------------------
// Dialogs
// ---------------------------------------------------------------------------

export function Modal({
  title,
  onClose,
  children,
  footer,
  width = 640,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: number;
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'rgba(15, 23, 42, 0.55)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '3rem 1rem',
        overflowY: 'auto',
      }}
    >
      <div className="card" style={{ width: '100%', maxWidth: `${width}px`, padding: 0, boxShadow: 'var(--shadow-md)' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '1rem 1.25rem',
            borderBottom: '1px solid var(--border-color)',
          }}
        >
          <h2 style={{ fontSize: '1.05rem', fontWeight: 700 }}>{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', color: 'var(--text-secondary)' }}
          >
            ✕
          </button>
        </div>
        <div style={{ padding: '1.25rem' }}>{children}</div>
        {footer && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '0.5rem',
              padding: '0.9rem 1.25rem',
              borderTop: '1px solid var(--border-color)',
              background: 'var(--bg-subtle)',
              borderRadius: '0 0 var(--radius-md) var(--radius-md)',
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Delete',
  busy,
  error,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  busy?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal
      title={title}
      onClose={busy ? () => undefined : onCancel}
      width={460}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button
            type="button"
            className="btn"
            onClick={onConfirm}
            disabled={busy}
            style={{ background: 'var(--badge-danger-text)', color: '#FFF', opacity: busy ? 0.7 : 1 }}
          >
            {busy ? 'Working…' : confirmLabel}
          </button>
        </>
      }
    >
      <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>{message}</div>
      {error && (
        <p role="alert" style={{ marginTop: '0.75rem', fontSize: '0.8rem', fontWeight: 600, color: 'var(--badge-danger-text)' }}>
          {error}
        </p>
      )}
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Tables
// ---------------------------------------------------------------------------

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

export function Pager({
  page,
  totalPages,
  total,
  noun,
  disabled,
  onPage,
}: {
  page: number;
  totalPages: number;
  total: number;
  noun: string;
  disabled?: boolean;
  onPage: (page: number) => void;
}) {
  const pages = Math.max(1, totalPages);
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: '1rem',
        paddingTop: '1rem',
        borderTop: '1px solid var(--border-color)',
      }}
    >
      <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
        Page <strong>{page}</strong> of <strong>{pages}</strong> ({total} {noun})
      </span>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button
          type="button"
          className="btn btn-secondary"
          style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
          disabled={disabled || page <= 1}
          onClick={() => onPage(page - 1)}
        >
          Previous
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
          disabled={disabled || page >= pages}
          onClick={() => onPage(page + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}

export function Thumb({ url, alt, size = 48 }: { url: string | null | undefined; alt: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [url]);
  if (!url || failed) {
    return (
      <div
        style={{
          width: `${size * 1.5}px`,
          height: `${size}px`,
          borderRadius: 'var(--radius-sm)',
          background: 'var(--bg-subtle)',
          border: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '0.65rem',
          color: 'var(--text-muted)',
        }}
      >
        No image
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={alt}
      onError={() => setFailed(true)}
      style={{
        width: `${size * 1.5}px`,
        height: `${size}px`,
        objectFit: 'cover',
        borderRadius: 'var(--radius-sm)',
        border: '1px solid var(--border-color)',
      }}
    />
  );
}
