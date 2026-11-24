'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '../../lib/auth-context';

/** Small building blocks shared by the sales and booking screens. They use the admin's existing classes. */

export const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.75rem',
  fontWeight: 600,
  color: 'var(--text-secondary)',
  marginBottom: '0.25rem',
};

export const smallButton: React.CSSProperties = { fontSize: '0.8rem', padding: '0.35rem 0.75rem' };
export const tinyButton: React.CSSProperties = { fontSize: '0.75rem', padding: '0.25rem 0.5rem' };
export const dangerButton: React.CSSProperties = { background: 'var(--badge-danger-text)', color: '#FFF', border: 'none' };
export const mono: React.CSSProperties = { fontFamily: 'monospace', fontSize: '0.8rem' };
export const filterGrid: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' };

/** Renders its children only for staff who hold the permission; otherwise an explanation. The server enforces the same key. */
export function RequirePermission({ permission, children }: { permission: string; children: React.ReactNode }) {
  const { hasPermission } = useAuth();
  if (!hasPermission(permission)) {
    return (
      <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--badge-danger-text)', marginBottom: '0.5rem' }}>No access</h2>
        <p style={{ color: 'var(--text-secondary)' }}>
          Your account does not have the <code>{permission}</code> permission needed for this screen. Ask a Super Admin if you need it.
        </p>
      </div>
    );
  }
  return <>{children}</>;
}

export function PageHeader({
  crumbs,
  title,
  subtitle,
  actions,
}: {
  crumbs: Array<{ label: string; href?: string }>;
  title: string;
  subtitle?: React.ReactNode;
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        <div>
          <h1 className="page-title">{title}</h1>
          {subtitle && <p className="page-subtitle">{subtitle}</p>}
        </div>
        {actions && <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>{actions}</div>}
      </div>
    </>
  );
}

export function ErrorBanner({ message }: { message: string | null | undefined }) {
  if (!message) return null;
  return (
    <div role="alert" className="badge badge-danger" style={{ padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', width: '100%', marginBottom: '1rem', display: 'block', whiteSpace: 'normal', textTransform: 'none' }}>
      {message}
    </div>
  );
}

export function SuccessBanner({ message, onClose }: { message: string | null | undefined; onClose?: () => void }) {
  if (!message) return null;
  return (
    <div role="status" className="badge badge-success" style={{ padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', width: '100%', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', gap: '1rem', whiteSpace: 'normal', textTransform: 'none' }}>
      <span>{message}</span>
      {onClose && (
        <button type="button" onClick={onClose} aria-label="Dismiss" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontWeight: 700 }}>
          ×
        </button>
      )}
    </div>
  );
}

/** An explanation for staff: what a list is and what to do about it. */
export function InfoBox({ title, children, tone = 'info' }: { title?: string; children: React.ReactNode; tone?: 'info' | 'warning' }) {
  const colors =
    tone === 'warning'
      ? { background: 'var(--badge-warning-bg)', color: 'var(--badge-warning-text)' }
      : { background: 'var(--badge-info-bg)', color: 'var(--badge-info-text)' };
  return (
    <div style={{ ...colors, padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem', fontSize: '0.85rem', lineHeight: 1.5 }}>
      {title && <div style={{ fontWeight: 700, marginBottom: '0.25rem' }}>{title}</div>}
      {children}
    </div>
  );
}

export function Field({ label, hint, error, children, span }: { label: string; hint?: React.ReactNode; error?: string | null; children: React.ReactNode; span?: number }) {
  return (
    <div style={span ? { gridColumn: `span ${span}` } : undefined}>
      <label style={labelStyle}>{label}</label>
      {children}
      {hint && !error && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>{hint}</div>}
      {error && <div style={{ fontSize: '0.72rem', color: 'var(--badge-danger-text)', marginTop: '0.2rem' }}>{error}</div>}
    </div>
  );
}

export function StatCard({ title, value, sub }: { title: string; value: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div className="card">
      <div className="card-title">{title}</div>
      <div className="card-value">{value}</div>
      {sub && <div className="card-subtext">{sub}</div>}
    </div>
  );
}

export function KeyValue({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', padding: '0.4rem 0', borderBottom: '1px solid var(--border-color)', fontSize: '0.85rem' }}>
      <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
      <span style={{ fontWeight: 600, textAlign: 'right', wordBreak: 'break-word' }}>{children}</span>
    </div>
  );
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem' }}>{children}</h2>;
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

export function Pagination({
  page,
  totalPages,
  total,
  noun,
  disabled,
  onChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  noun: string;
  disabled?: boolean;
  onChange: (page: number) => void;
}) {
  const pages = Math.max(1, totalPages);
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
      <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
        Showing page <strong>{page}</strong> of <strong>{pages}</strong> ({total} total {noun})
      </span>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button type="button" onClick={() => onChange(page - 1)} disabled={page <= 1 || disabled} className="btn btn-secondary" style={smallButton}>
          Previous
        </button>
        <button type="button" onClick={() => onChange(page + 1)} disabled={page >= pages || disabled} className="btn btn-secondary" style={smallButton}>
          Next
        </button>
      </div>
    </div>
  );
}

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
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.55)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '4vh 1rem', zIndex: 1000, overflowY: 'auto' }}
    >
      <div className="card" style={{ width: '100%', maxWidth: `${width}px`, padding: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-color)' }}>
          <h2 style={{ fontSize: '1.05rem', fontWeight: 700 }}>{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="btn btn-secondary" style={tinyButton}>
            ×
          </button>
        </div>
        <div style={{ padding: '1.25rem' }}>{children}</div>
        {footer && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', padding: '1rem 1.25rem', borderTop: '1px solid var(--border-color)' }}>{footer}</div>
        )}
      </div>
    </div>
  );
}

export function ConfirmDialog({
  title,
  children,
  confirmLabel,
  danger,
  busy,
  error,
  confirmDisabled,
  onConfirm,
  onCancel,
}: {
  title: string;
  children: React.ReactNode;
  confirmLabel: string;
  danger?: boolean;
  busy?: boolean;
  error?: string | null;
  confirmDisabled?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal
      title={title}
      onClose={onCancel}
      width={480}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" style={danger ? dangerButton : undefined} onClick={onConfirm} disabled={busy || confirmDisabled}>
            {busy ? 'Working…' : confirmLabel}
          </button>
        </>
      }
    >
      <ErrorBanner message={error} />
      <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{children}</div>
    </Modal>
  );
}

/** Tabs that are links (each tab is its own route). */
export function LinkTabs({ tabs, active }: { tabs: Array<{ href: string; label: string; show?: boolean }>; active: string }) {
  return (
    <div style={{ display: 'flex', gap: '0.25rem', borderBottom: '1px solid var(--border-color)', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
      {tabs
        .filter((tab) => tab.show !== false)
        .map((tab) => {
          const isActive = tab.href === active;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              style={{
                padding: '0.6rem 1rem',
                fontSize: '0.85rem',
                fontWeight: isActive ? 700 : 500,
                textDecoration: 'none',
                color: isActive ? 'var(--accent-primary)' : 'var(--text-secondary)',
                borderBottom: isActive ? '2px solid var(--accent-primary)' : '2px solid transparent',
              }}
            >
              {tab.label}
            </Link>
          );
        })}
    </div>
  );
}

export function Badge({ tone, children }: { tone: 'success' | 'warning' | 'danger' | 'info'; children: React.ReactNode }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

/** Runs `effect` a short while after the values stop changing (search boxes). */
export function useDebounced<T>(value: T, delayMs: number = 350): T {
  const [debounced, setDebounced] = React.useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}
