import { storageService, ObjectVisibility, SignedDownloadOptions } from '../storage.service';
import { ValidationError } from '../../errors/app-error';
import { logger } from '../../utils/logger';
import { classifyObjectKey, UploadPurpose } from './upload-policy';

/**
 * Helpers for modules that keep a reference to an uploaded file on one of their records
 * (banners, blogs, products, media, testimonials, SEO images, digital product files).
 *
 * Contract (docs/integration/modules/uploads.md): the admin uploads the file first through
 * POST /api/v1/admin/uploads and gets `{ url, key }`; the module's create/update payload then
 * carries that pair, and the module calls `validateUploadedRef` before saving it and
 * `deleteUploadedObject` when the record is deleted or its file replaced.
 */

export interface UploadedFileRefInput {
  url?: string | null;
  key?: string | null;
}

export interface UploadedFileRef {
  key: string;
  /** Plain public URL for a public object; null for a private one (it has no public URL). */
  url: string | null;
}

export interface ValidateRefOptions {
  /** What the field holds: `public` for images shown on the site, `private` for sold/personal files. */
  visibility: ObjectVisibility;
  /** Purposes the file may have been uploaded for. Omit to accept any purpose of that visibility. */
  purposes?: readonly UploadPurpose[];
  /**
   * Only meaningful with `visibility: 'private'`: also accept a file the WEBSITE uploaded (those
   * all live under the public `assets/` prefix, paid files included), so a migrated record can be
   * saved again unchanged. Website files are always accepted for public fields.
   */
  allowLegacy?: boolean;
  /** Field name used in the validation error. */
  field?: string;
}

const MAX_SIGNED_URL_SECONDS = 3600;

function fail(field: string, message: string): never {
  throw new ValidationError(message, [{ field, message }]);
}

/**
 * Checks that `{ url, key }` from a request body points at a file in OUR bucket that was uploaded
 * for this kind of field, and returns the normalised pair to store. Throws ValidationError
 * otherwise. A key outside the upload prefixes (a customer's report PDF, for instance) is always
 * refused, so a record can never be made to reference, expose or later delete someone else's file.
 */
export function validateUploadedRef(input: UploadedFileRefInput, options: ValidateRefOptions): UploadedFileRef {
  const field = options.field || 'file';
  const fromKey = input.key ? storageService.resolveKey(input.key) : null;
  const fromUrl = input.url ? storageService.resolveKey(input.url) : null;

  if (input.key && !fromKey) fail(field, 'The file key is not a valid key of our storage');
  if (input.url && !fromUrl) fail(field, 'The file URL does not point to our storage');
  const key = fromKey || fromUrl;
  if (!key) fail(field, 'An uploaded file reference (url or key) is required');
  if (fromKey && fromUrl && fromKey !== fromUrl) fail(field, 'The file URL and key refer to different files');

  const info = classifyObjectKey(key);
  if (info.visibility === null) fail(field, 'The file was not uploaded through the upload endpoint');

  if (options.visibility === 'public') {
    if (info.visibility !== 'public') fail(field, 'A private file cannot be used where a public file is expected');
  } else if (info.visibility === 'public') {
    if (!(info.legacy && options.allowLegacy)) fail(field, 'A public file cannot be used where a private file is expected');
  }

  if (options.purposes && !info.legacy && (info.purpose === null || !options.purposes.includes(info.purpose))) {
    fail(field, `The file was not uploaded for this purpose (expected: ${options.purposes.join(', ')})`);
  }

  return { key, url: options.visibility === 'public' ? storageService.getPublicUrl(key) : null };
}

/** Key of one of our upload-managed objects for a stored url or key; null when it is not ours. */
export function resolveManagedKey(urlOrKey: string | null | undefined): string | null {
  const key = storageService.resolveKey(urlOrKey);
  if (!key || classifyObjectKey(key).visibility === null) return null;
  return key;
}

/**
 * Deletes the object behind a stored url or key when a record is deleted or its file replaced.
 * Never throws: a failed or refused delete is logged and reported as `false`, so it cannot break
 * the record change that triggered it. References outside the upload prefixes or outside our
 * bucket are ignored.
 */
export async function deleteUploadedObject(urlOrKey: string | null | undefined): Promise<boolean> {
  if (!urlOrKey) return false;
  const key = resolveManagedKey(urlOrKey);
  if (!key) {
    logger.warn('Skipped deleting a file reference that is not an upload-managed object of our storage');
    return false;
  }
  try {
    await storageService.delete(key);
    return true;
  } catch (err) {
    logger.error({ storageKey: key, err }, 'Failed to delete an uploaded object');
    return false;
  }
}

/**
 * Short-lived signed download URL for an upload-managed object (use for every private file, after
 * the caller has checked ownership / purchase). Works for website-era files stored as an absolute
 * URL. `expiresInSeconds` is capped at one hour.
 */
export async function getUploadedFileSignedUrl(
  urlOrKey: string,
  expiresInSeconds: number = 300,
  options: SignedDownloadOptions = {}
): Promise<string> {
  const key = resolveManagedKey(urlOrKey);
  if (!key) throw new ValidationError('The file reference does not point to an uploaded file of our storage');
  const ttl = Math.min(MAX_SIGNED_URL_SECONDS, Math.max(1, Math.floor(expiresInSeconds)));
  return storageService.getSignedDownloadUrl(key, ttl, options);
}
