'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import { useAuth } from '../../lib/auth-context';
import {
  UploadPurpose,
  UploadedFileRef,
  formatBytes,
  getUploadRule,
  uploadFile,
  validateUploadFile,
} from '../../lib/api/uploads';

export type { UploadPurpose, UploadedFileRef } from '../../lib/api/uploads';

export interface UploadFieldProps {
  /** Upload purpose of the backend (decides allowed types, size cap and visibility). */
  purpose: UploadPurpose;
  /** The stored `{ url, key }` pair, or null when there is no file. */
  value: UploadedFileRef | null | undefined;
  /** Called with the new pair after a successful upload, or with null when the file is removed. */
  onChange: (value: UploadedFileRef | null) => void;
  /** `accept` of the file picker. Defaults to what the purpose allows. */
  accept?: string;
  /** Send `watermark=true` (preview images / thumbnail of a DIGITAL product only). */
  watermark?: boolean;
  label?: string;
  hint?: string;
  disabled?: boolean;
  /** Hide the "Remove" button for a slot that must always hold a file. */
  required?: boolean;
  /** Validation message of the surrounding form. */
  error?: string | null;
}

type PreviewKind = 'image' | 'video' | 'file';

function previewKind(purpose: UploadPurpose, value: UploadedFileRef): PreviewKind {
  const name = (value.url || value.key || '').split('?')[0].toLowerCase();
  if (/\.(mp4|webm|mov)$/.test(name)) return 'video';
  if (/\.(jpe?g|png|webp|gif|avif)$/.test(name)) return 'image';
  if (purpose === 'media-video') return 'video';
  if (purpose === 'digital-product') return 'file';
  return value.url ? 'image' : 'file';
}

function fileNameOf(value: UploadedFileRef): string {
  const source = value.key || value.url || '';
  return source.split('?')[0].split('/').pop() || source;
}

/**
 * File picker for one uploaded file. Picking a file sends it to `POST /admin/uploads` and hands
 * the returned `{ url, key }` to `onChange`; the parent form then sends that pair to its own
 * endpoint. Nothing is saved on the record until the parent form is saved.
 */
export function UploadField({
  purpose,
  value,
  onChange,
  accept,
  watermark,
  label,
  hint,
  disabled,
  required,
  error,
}: UploadFieldProps) {
  const { hasPermission } = useAuth();
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [previewFailed, setPreviewFailed] = useState(false);

  const rule = getUploadRule(purpose);
  const canUpload = hasPermission('uploads:create');
  const hasFile = Boolean(value && (value.url || value.key));

  useEffect(() => {
    setPreviewFailed(false);
  }, [value?.url]);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const handlePick = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Reset so picking the same file again fires a change event.
    event.target.value = '';
    if (!file) return;

    setUploadError(null);
    const invalid = validateUploadFile(file, purpose);
    if (invalid) {
      setUploadError(invalid);
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    setIsUploading(true);
    try {
      const uploaded = await uploadFile(file, { purpose, watermark, signal: controller.signal });
      onChange({ url: uploaded.url, key: uploaded.key });
    } catch (err) {
      if ((err as { name?: string } | null)?.name === 'AbortError') return;
      setUploadError(err instanceof Error && err.message ? err.message : 'Upload failed. Please try again.');
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      setIsUploading(false);
    }
  };

  const kind = hasFile && value ? previewKind(purpose, value) : 'file';
  const message = uploadError || error || null;
  const pickerDisabled = disabled || isUploading || !canUpload;

  return (
    <div>
      {label && (
        <label
          htmlFor={inputId}
          style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}
        >
          {label}
        </label>
      )}

      <div
        style={{
          display: 'flex',
          gap: '0.75rem',
          alignItems: 'center',
          padding: '0.75rem',
          border: `1px dashed ${message ? 'var(--badge-danger-text)' : 'var(--border-color)'}`,
          borderRadius: 'var(--radius-md)',
          background: 'var(--bg-subtle)',
        }}
      >
        {hasFile && value ? (
          <div
            style={{
              width: kind === 'file' ? 'auto' : '120px',
              height: kind === 'file' ? 'auto' : '80px',
              flexShrink: 0,
              borderRadius: 'var(--radius-sm)',
              overflow: 'hidden',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {kind === 'image' && value.url && !previewFailed ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={value.url}
                alt="Uploaded file preview"
                onError={() => setPreviewFailed(true)}
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            ) : kind === 'video' && value.url && !previewFailed ? (
              <video
                src={value.url}
                controls
                preload="metadata"
                onError={() => setPreviewFailed(true)}
                style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#000' }}
              />
            ) : (
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', padding: '0.5rem 0.75rem', wordBreak: 'break-all' }}>
                📄 {fileNameOf(value)}
              </span>
            )}
          </div>
        ) : (
          <div
            style={{
              width: '120px',
              height: '80px',
              flexShrink: 0,
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-surface)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-muted)',
              fontSize: '0.75rem',
            }}
          >
            No file
          </div>
        )}

        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem', opacity: pickerDisabled ? 0.6 : 1 }}
              disabled={pickerDisabled}
              onClick={() => inputRef.current?.click()}
            >
              {isUploading ? 'Uploading…' : hasFile ? 'Replace file' : 'Choose file'}
            </button>
            {hasFile && !required && (
              <button
                type="button"
                className="btn btn-secondary"
                style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem', color: 'var(--badge-danger-text)' }}
                disabled={disabled || isUploading}
                onClick={() => {
                  setUploadError(null);
                  onChange(null);
                }}
              >
                Remove
              </button>
            )}
            {hasFile && value?.url && (
              <a href={value.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.8rem' }}>
                Open
              </a>
            )}
          </div>

          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
            {hint ? `${hint} ` : ''}
            {rule.label}, up to {formatBytes(rule.maxBytes)}.
            {watermark ? ' A watermark is added on upload.' : ''}
          </p>
          {!canUpload && (
            <p style={{ fontSize: '0.75rem', color: 'var(--badge-warning-text)', marginTop: '0.25rem' }}>
              You do not have permission to upload files.
            </p>
          )}
          {message && (
            <p role="alert" style={{ fontSize: '0.75rem', color: 'var(--badge-danger-text)', marginTop: '0.25rem', fontWeight: 600 }}>
              {message}
            </p>
          )}
        </div>
      </div>

      <input
        id={inputId}
        ref={inputRef}
        type="file"
        accept={accept || rule.accept}
        onChange={handlePick}
        disabled={pickerDisabled}
        style={{ display: 'none' }}
      />
    </div>
  );
}

export default UploadField;
