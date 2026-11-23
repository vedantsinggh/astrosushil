import * as crypto from 'crypto';
import type { ObjectVisibility } from '../storage.service';

/**
 * What may be uploaded, for which purpose, how large, and under which object key.
 * Pure rules, no I/O. The website accepted anything up to 50 MB for every field, trusted the
 * browser's MIME type and built keys from the client's filename; none of that is reproduced here.
 */

const MB = 1024 * 1024;

export const PUBLIC_KEY_PREFIX = 'assets/';
export const PRIVATE_KEY_PREFIX = 'private/';

/** Largest file any purpose accepts; the multipart plugin is registered with this ceiling. */
export const MAX_UPLOAD_BYTES = 50 * MB;

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const;
const DOCUMENT_TYPES = [
  'application/pdf',
  'application/zip',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
] as const;

export type UploadContentType = (typeof IMAGE_TYPES)[number] | (typeof DOCUMENT_TYPES)[number] | 'video/mp4';

export interface UploadPolicy {
  visibility: ObjectVisibility;
  allowedTypes: readonly UploadContentType[];
  maxBytes: number;
}

const publicImage: UploadPolicy = { visibility: 'public', allowedTypes: IMAGE_TYPES, maxBytes: 10 * MB };

/**
 * One entry per kind of file the website admin uploads. The purpose is part of the object key, so
 * a consumer can check that a submitted key was uploaded for the field it is being attached to.
 */
export const UPLOAD_POLICIES = {
  banner: publicImage,
  blog: publicImage,
  product: publicImage,
  category: publicImage,
  course: publicImage,
  consultation: publicImage,
  testimonial: publicImage,
  seo: publicImage,
  media: publicImage,
  'report-cover': publicImage,
  profile: publicImage,
  page: publicImage,
  // Celebrity videos of the website's Media module (its 50 MB multer cap).
  'media-video': { visibility: 'public', allowedTypes: ['video/mp4'], maxBytes: 50 * MB },
  // The sold file of a digital product variant: what the website admin form accepts
  // (.pdf,.png,.jpg,.jpeg,.webp,.gif,.doc,.docx,.xls,.xlsx,.zip). Never public.
  'digital-product': { visibility: 'private', allowedTypes: [...DOCUMENT_TYPES, ...IMAGE_TYPES], maxBytes: 50 * MB },
} as const satisfies Record<string, UploadPolicy>;

export type UploadPurpose = keyof typeof UPLOAD_POLICIES;

export const UPLOAD_PURPOSES = Object.keys(UPLOAD_POLICIES) as [UploadPurpose, ...UploadPurpose[]];

export function isUploadPurpose(value: string): value is UploadPurpose {
  return Object.prototype.hasOwnProperty.call(UPLOAD_POLICIES, value);
}

export function getUploadPolicy(purpose: UploadPurpose): UploadPolicy {
  return UPLOAD_POLICIES[purpose];
}

const EXTENSIONS: Record<UploadContentType, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'video/mp4': 'mp4',
  'application/pdf': 'pdf',
  'application/zip': 'zip',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.ms-excel': 'xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
};

export function extensionForContentType(contentType: UploadContentType): string {
  return EXTENSIONS[contentType];
}

function startsWith(buffer: Buffer, bytes: number[], offset = 0): boolean {
  if (buffer.length < offset + bytes.length) return false;
  return bytes.every((b, i) => buffer[offset + i] === b);
}

function clientExtension(filename: string | undefined): string {
  const match = /\.([A-Za-z0-9]{1,8})$/.exec(filename || '');
  return match ? match[1].toLowerCase() : '';
}

/**
 * Decides the content type from the file's own leading bytes. The MIME type and filename sent by
 * the client are only used to tell apart formats that share a container (docx / xlsx / zip are all
 * ZIP archives; doc / xls are both OLE files). Returns null for anything unrecognised, including
 * SVG and HTML, which are never accepted.
 */
export function detectContentType(buffer: Buffer, declaredMimeType?: string, filename?: string): UploadContentType | null {
  const declared = (declaredMimeType || '').toLowerCase();
  const ext = clientExtension(filename);

  if (startsWith(buffer, [0xff, 0xd8, 0xff])) return 'image/jpeg';
  if (startsWith(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png';
  if (startsWith(buffer, [0x47, 0x49, 0x46, 0x38, 0x37, 0x61]) || startsWith(buffer, [0x47, 0x49, 0x46, 0x38, 0x39, 0x61])) return 'image/gif';
  if (startsWith(buffer, [0x52, 0x49, 0x46, 0x46]) && startsWith(buffer, [0x57, 0x45, 0x42, 0x50], 8)) return 'image/webp';
  if (startsWith(buffer, [0x25, 0x50, 0x44, 0x46, 0x2d])) return 'application/pdf';
  if (startsWith(buffer, [0x66, 0x74, 0x79, 0x70], 4)) {
    // ISO base media file: only MP4 brands count (HEIC, AVIF and QuickTime share the container).
    const brand = buffer.subarray(8, 12).toString('latin1');
    return MP4_BRANDS.includes(brand) ? 'video/mp4' : null;
  }

  if (startsWith(buffer, [0x50, 0x4b, 0x03, 0x04])) {
    if (declared === EXTENSIONS_TO_TYPE.docx || ext === 'docx') return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    if (declared === EXTENSIONS_TO_TYPE.xlsx || ext === 'xlsx') return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    return 'application/zip';
  }

  if (startsWith(buffer, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])) {
    if (declared === 'application/msword' || ext === 'doc') return 'application/msword';
    if (declared === 'application/vnd.ms-excel' || ext === 'xls') return 'application/vnd.ms-excel';
    return null;
  }

  return null;
}

const MP4_BRANDS = ['isom', 'iso2', 'iso4', 'iso5', 'iso6', 'mp41', 'mp42', 'avc1', 'M4V ', 'mmp4', 'dash', 'MSNV'];

const EXTENSIONS_TO_TYPE = {
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
} as const;

/**
 * Object key for a new upload: `<assets|private>/<purpose>/<yyyy>/<mm>/<uuid>.<ext>`.
 * Nothing from the client (filename, ids) ever enters the key.
 */
export function generateObjectKey(
  purpose: UploadPurpose,
  contentType: UploadContentType,
  now: Date = new Date(),
  id: string = crypto.randomUUID()
): string {
  const prefix = UPLOAD_POLICIES[purpose].visibility === 'public' ? PUBLIC_KEY_PREFIX : PRIVATE_KEY_PREFIX;
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  return `${prefix}${purpose}/${year}/${month}/${id}.${EXTENSIONS[contentType]}`;
}

export interface KeyClassification {
  /** null = not an upload-managed key (for example a report PDF under `reports/`). */
  visibility: ObjectVisibility | null;
  /** The purpose encoded in a key generated by this backend. */
  purpose: UploadPurpose | null;
  /**
   * true for keys written by the website backend (`assets/<timestamp>-<name>.<ext>` or
   * `assets/<staffId>/...`): under the public prefix but without one of our purposes.
   */
  legacy: boolean;
}

export function classifyObjectKey(key: string): KeyClassification {
  const isPublic = key.startsWith(PUBLIC_KEY_PREFIX);
  const isPrivate = key.startsWith(PRIVATE_KEY_PREFIX);
  if (!isPublic && !isPrivate) return { visibility: null, purpose: null, legacy: false };

  const visibility: ObjectVisibility = isPublic ? 'public' : 'private';
  const segments = key.split('/');
  const candidate = segments.length >= 3 ? segments[1] : '';
  const purpose = isUploadPurpose(candidate) && UPLOAD_POLICIES[candidate].visibility === visibility ? candidate : null;
  return { visibility, purpose, legacy: isPublic && purpose === null };
}
