'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/auth-context';
import { apiFetch } from '../../lib/api-client';

type Mode = 'login' | 'forgot' | 'reset';

const labelStyle: React.CSSProperties = { display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.35rem' };

function Message({ kind, children }: { kind: 'error' | 'success'; children: React.ReactNode }) {
  return (
    <div
      role={kind === 'error' ? 'alert' : 'status'}
      style={{
        padding: '0.65rem 0.8rem',
        borderRadius: 'var(--radius-sm)',
        marginBottom: '1rem',
        fontSize: '0.84rem',
        background: kind === 'error' ? 'var(--badge-danger-bg)' : 'var(--badge-success-bg)',
        color: kind === 'error' ? 'var(--badge-danger-text)' : 'var(--badge-success-text)',
      }}
    >
      {children}
    </div>
  );
}

/**
 * Staff sign-in, and the website admin's "forgot password": a 6-digit code is e-mailed to a
 * staff address (`POST /auth/forgot-password`) and the new password is set with it
 * (`POST /auth/reset-password`).
 */
export default function AdminLoginPage() {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();
  const router = useRouter();

  const switchTo = (next: Mode) => {
    setMode(next);
    setError(null);
    setNotice(null);
  };

  const run = async (action: () => Promise<void>) => {
    setError(null);
    setIsSubmitting(true);
    try {
      await action();
    } catch (err: unknown) {
      setError(err instanceof Error && err.message ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    run(async () => {
      await login(email, password);
      router.push('/dashboard');
    });
  };

  const handleForgot = (e: React.FormEvent) => {
    e.preventDefault();
    run(async () => {
      await apiFetch('/api/v1/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) });
      setMode('reset');
      setNotice('If this is a staff e-mail address, a 6-digit code has been sent to it. It is valid for a few minutes.');
    });
  };

  const handleReset = (e: React.FormEvent) => {
    e.preventDefault();
    run(async () => {
      await apiFetch('/api/v1/auth/reset-password', { method: 'POST', body: JSON.stringify({ email, otp: code, newPassword }) });
      setPassword('');
      setCode('');
      setNewPassword('');
      setMode('login');
      setNotice('Your password has been changed. Sign in with the new password.');
    });
  };

  const title = mode === 'login' ? 'Sign in' : mode === 'forgot' ? 'Reset your password' : 'Set a new password';

  return (
    <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-main)', padding: '1rem' }}>
      <div className="card" style={{ width: '100%', maxWidth: '400px', padding: '2rem', boxShadow: 'var(--shadow-md)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', marginBottom: '1.75rem' }}>
          <span
            style={{
              width: 38,
              height: 38,
              borderRadius: 8,
              background: 'var(--accent-primary)',
              color: '#FFF',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
            }}
          >
            AS
          </span>
          <div>
            <div style={{ fontWeight: 650, fontSize: '1.05rem' }}>Astro Sushil Admin</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{title}</div>
          </div>
        </div>

        {error && <Message kind="error">{error}</Message>}
        {notice && <Message kind="success">{notice}</Message>}

        {mode === 'login' && (
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={labelStyle} htmlFor="email">E-mail</label>
              <input id="email" type="email" className="input-control" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" required autoFocus />
            </div>
            <div style={{ marginBottom: '0.5rem' }}>
              <label style={labelStyle} htmlFor="password">Password</label>
              <input id="password" type="password" className="input-control" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
            </div>
            <div style={{ textAlign: 'right', marginBottom: '1.25rem' }}>
              <button type="button" onClick={() => switchTo('forgot')} style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', fontSize: '0.8rem' }}>
                Forgot password?
              </button>
            </div>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting} style={{ width: '100%', padding: '0.65rem' }}>
              {isSubmitting ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        )}

        {mode === 'forgot' && (
          <form onSubmit={handleForgot}>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Enter your staff e-mail address. We will send you a 6-digit code to set a new password.
            </p>
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={labelStyle} htmlFor="forgot-email">E-mail</label>
              <input id="forgot-email" type="email" className="input-control" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
            </div>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting} style={{ width: '100%', padding: '0.65rem' }}>
              {isSubmitting ? 'Sending…' : 'Send code'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => switchTo('login')} style={{ width: '100%', marginTop: '0.5rem' }}>
              Back to sign in
            </button>
          </form>
        )}

        {mode === 'reset' && (
          <form onSubmit={handleReset}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={labelStyle} htmlFor="code">6-digit code</label>
              <input id="code" inputMode="numeric" pattern="\d{6}" maxLength={6} className="input-control" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} required autoFocus />
            </div>
            <div style={{ marginBottom: '0.4rem' }}>
              <label style={labelStyle} htmlFor="new-password">New password</label>
              <input id="new-password" type="password" className="input-control" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoComplete="new-password" minLength={8} required />
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
              At least 8 characters with an upper-case letter, a lower-case letter, and a number or a symbol.
            </p>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting} style={{ width: '100%', padding: '0.65rem' }}>
              {isSubmitting ? 'Saving…' : 'Set new password'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => switchTo('forgot')} style={{ width: '100%', marginTop: '0.5rem' }}>
              Send a new code
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
