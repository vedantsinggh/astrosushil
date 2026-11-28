import { cookieAuthHeaders } from '../api-client';

/**
 * Admin file uploads: the first step of the two-step contract in
 * docs/integration/modules/uploads.md.
 *
 *   1. `uploadFile(file, { purpose })`  ->  POST /api/v1/admin/uploads?purpose=...  ->  { url, key, ... }
 *   2. send that `{ url, key }` inside the JSON body of the module's own create / update endpoint.
 *
 * The server decides the real content type from the file's bytes and enforces the size cap; the
 * checks here only save a round trip and give the user a clear message.
 */

import { API_BASE } from '../api-base';

export type UploadPurpose =
  | 'banner'
  | 'blog'
  | 'product'
  | 'category'
  | 'course'
  | 'consultation'
  | 'testimonial'
  | 'seo'
  | 'media'
  | 'report-cover'
  | 'profile'
  | 'page'
  | 'media-video'
  | 'digital-product';

/** What `POST /admin/uploads` answers. `url` is null for a private purpose (digital-product). */
export interface UploadResult {
  url: string | null;
  key: string;
  contentType: string;
  size: number;
  visibility: 'public' | 'private';
  purpose: string;
}

/** The pair a module stores. `key` may be missing on records migrated from the website. */
export interface UploadedFileRef {
  url: string | null;
  key?: string | null;
}

const MB = 1024 * 1024;

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const DOCUMENT_TYPES = [
  'application/pdf',
  'application/zip',
  'application/x-zip-compressed',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

export interface UploadRule {
  /** MIME types the server accepts for the purpose. */
  types: string[];
  maxBytes: number;
  /** Default `accept` attribute of the file picker. */
  accept: string;
  /** Human description of the allowed types. */
  label: string;
}

const IMAGE_RULE: UploadRule = {
  types: IMAGE_TYPES,
  maxBytes: 10 * MB,
  accept: 'image/jpeg,image/png,image/webp,image/gif',
  label: 'JPEG, PNG, WebP or GIF',
};

/** Mirrors UPLOAD_POLICIES in apps/api/src/services/storage/upload-policy.ts. */
export function getUploadRule(purpose: UploadPurpose): UploadRule {
  if (purpose === 'media-video') {
    return { types: ['video/mp4'], maxBytes: 50 * MB, accept: 'video/mp4', label: 'MP4 video' };
  }
  if (purpose === 'digital-product') {
    return {
      types: [...DOCUMENT_TYPES, ...IMAGE_TYPES],
      maxBytes: 50 * MB,
      accept: '.pdf,.zip,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.webp,.gif',
      label: 'PDF, ZIP, DOC, DOCX, XLS, XLSX or an image',
    };
  }
  return IMAGE_RULE;
}

export function formatBytes(bytes: number): string {
  if (bytes >= MB) return `${(bytes / MB).toFixed(bytes % MB === 0 ? 0 : 1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

/**
 * Checks a picked file against the purpose before it is sent. Returns an error message, or null
 * when the file may be uploaded. A browser that reports no MIME type is let through: the server
 * sniffs the bytes anyway.
 */
export function validateUploadFile(file: File, purpose: UploadPurpose): string | null {
  const rule = getUploadRule(purpose);
  if (file.size === 0) return 'The selected file is empty.';
  if (file.size > rule.maxBytes) {
    return `The file is ${formatBytes(file.size)}; the limit is ${formatBytes(rule.maxBytes)}.`;
  }
  if (file.type && !rule.types.includes(file.type.toLowerCase())) {
    return `This file type is not allowed here. Allowed: ${rule.label}.`;
  }
  return null;
}

interface ApiErrorBody {
  error?: { code?: string; message?: string; details?: Array<{ field?: string; message?: string }> } | string;
  message?: string;
}

/**
 * Turns anything thrown by `apiFetch` / `uploadFile` into a sentence for the user. The API's error
 * shape is `{ error: { code, message, details?, requestId } }`; field errors are appended.
 */
export function apiErrorMessage(err: unknown, fallback = 'Something went wrong. Please try again.'): string {
  const carrier = err as { data?: ApiErrorBody; message?: unknown; status?: number } | null | undefined;
  const body = carrier?.data;
  const apiError = body && typeof body.error === 'object' && body.error !== null ? body.error : null;

  if (apiError?.message) {
    const details = Array.isArray(apiError.details)
      ? apiError.details
          .filter((d) => d && d.message && d.message !== apiError.message)
          .map((d) => (d.field ? `${d.field}: ${d.message}` : String(d.message)))
      : [];
    return details.length > 0 ? `${apiError.message} (${details.join('; ')})` : apiError.message;
  }
  if (body && typeof body.error === 'string' && body.error) return body.error;
  if (body && typeof body.message === 'string' && body.message) return body.message;
  if (typeof carrier?.message === 'string' && carrier.message && carrier.message !== '[object Object]') {
    return carrier.message;
  }
  return fallback;
}

export class UploadError extends Error {
  public readonly status: number;
  public readonly code: string | undefined;
  public readonly data: unknown;

  constructor(message: string, status: number, code?: string, data?: unknown) {
    super(message);
    this.name = 'UploadError';
    this.status = status;
    this.code = code;
    this.data = data;
  }
}

function uploadFailureMessage(status: number, code: string | undefined, purpose: UploadPurpose, body: ApiErrorBody): string {
  const rule = getUploadRule(purpose);
  if (status === 413 || code === 'FILE_TOO_LARGE') return `The file is too large. The limit is ${formatBytes(rule.maxBytes)}.`;
  if (status === 415 || code === 'UNSUPPORTED_FILE_TYPE') return `This file type is not allowed here. Allowed: ${rule.label}.`;
  if (status === 501 || code === 'IMAGE_PROCESSING_UNAVAILABLE') {
    return 'Watermarking is not available on the server yet, so this preview image cannot be uploaded.';
  }
  if (status === 403) return 'You do not have permission to upload files.';
  if (status === 401) return 'Your session has expired. Please sign in again.';
  return apiErrorMessage({ data: body }, `Upload failed (HTTP ${status}).`);
}

export interface UploadOptions {
  purpose: UploadPurpose;
  /** Only for the preview images / thumbnail of a DIGITAL product (`purpose: 'product'`). */
  watermark?: boolean;
  signal?: AbortSignal;
}

/** Uploads one file and returns its `{ url, key, ... }`. Throws `UploadError` with a user-facing message. */
export async function uploadFile(file: File, options: UploadOptions): Promise<UploadResult> {
  const invalid = validateUploadFile(file, options.purpose);
  if (invalid) throw new UploadError(invalid, 0, 'CLIENT_VALIDATION');

  const query = new URLSearchParams({ purpose: options.purpose });
  if (options.watermark) query.set('watermark', 'true');

  const form = new FormData();
  form.append('file', file);

  const headers = await cookieAuthHeaders('POST');

  let response: Response;
  try {
    // No Content-Type header: the browser sets the multipart boundary itself.
    response = await fetch(`${API_BASE}/api/v1/admin/uploads?${query.toString()}`, {
      method: 'POST',
      credentials: 'include',
      headers,
      body: form,
      signal: options.signal,
    });
  } catch (err) {
    if ((err as { name?: string } | null)?.name === 'AbortError') throw err;
    throw new UploadError('Could not reach the server. Check your connection and try again.', 0, 'NETWORK_ERROR');
  }

  const body = (await response.json().catch(() => ({}))) as ApiErrorBody & Partial<UploadResult>;

  if (!response.ok) {
    const code = typeof body.error === 'object' && body.error !== null ? body.error.code : undefined;
    throw new UploadError(uploadFailureMessage(response.status, code, options.purpose, body), response.status, code, body);
  }
  if (typeof body.key !== 'string' || !body.key) {
    throw new UploadError('The server did not return the uploaded file.', response.status, 'BAD_RESPONSE', body);
  }
  return body as UploadResult;
}
