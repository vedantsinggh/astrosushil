import { deleteUploadedObject, validateUploadedRef } from '../../services/storage/storage-refs';
import type { UploadPurpose } from '../../services/storage/upload-policy';
import { logger } from '../../utils/logger';

/**
 * The content module's two links to other modules:
 *
 *   Uploaded files   checked and deleted through the uploads module's helpers
 *                    (services/storage/storage-refs.ts, docs/integration/modules/uploads.md).
 *   Inquiry emails   sent through the ContactInquiryNotifier interface below. The email module
 *                    provides the implementation with setContactInquiryNotifier(...); until then
 *                    the default only logs the inquiry id and sends nothing.
 */

// ---------------------------------------------------------------------------
// Uploaded files
// ---------------------------------------------------------------------------

/**
 * A file reference as sent in a create/update payload: the `{ url, key }` pair returned by
 * `POST /admin/uploads`. `key` may be left out; the storage implementation then derives it from
 * the URL (or rejects the reference when the URL is not one of our files).
 */
export interface FileRefInput {
  url: string;
  key?: string | null;
}

/** A file reference as stored and as returned by the admin endpoints. `key` is null for a file we do not manage. */
export interface StoredFile {
  url: string;
  key: string | null;
}

export type FileView = StoredFile;

export function toFileView(url: string | null, key: string | null): FileView | null {
  return url ? { url, key: key || null } : null;
}

/** What a file was uploaded for: purposes of the uploads module (services/storage/upload-policy.ts). */
export type ContentFilePurpose = Extract<UploadPurpose, 'banner' | 'blog' | 'testimonial' | 'seo' | 'media' | 'media-video' | 'page'>;

/**
 * Resolves a file slot of a create/update payload: undefined stays undefined (leave as is), null
 * stays null (remove the file), and a `{ url, key }` pair is checked with `validateUploadedRef`:
 * it must be a public object of OUR bucket uploaded for `purpose` (files the website uploaded are
 * accepted). Throws a ValidationError otherwise, so a record can never reference, and later
 * delete, a file that belongs to something else.
 */
export function acceptFile(
  ref: FileRefInput | null | undefined,
  purpose: ContentFilePurpose,
  field: string
): StoredFile | null | undefined {
  if (ref === undefined || ref === null) return ref;
  const checked = validateUploadedRef({ url: ref.url, key: ref.key }, { visibility: 'public', purposes: [purpose], field });
  return { url: checked.url ?? ref.url, key: checked.key };
}

/**
 * Deletes files that a record no longer references (record deleted, or image replaced), with
 * `deleteUploadedObject`. Runs after the database change has been committed and never fails the
 * request: a file that could not be deleted is only an orphan in storage, which is logged.
 */
export async function deleteStoredFiles(keys: Array<string | null | undefined>): Promise<void> {
  const unique = [...new Set(keys.filter((key): key is string => typeof key === 'string' && key.length > 0))];
  for (const key of unique) {
    try {
      await deleteUploadedObject(key);
    } catch (err) {
      logger.warn({ err: err instanceof Error ? err.message : String(err) }, '[content] could not delete an unused uploaded file');
    }
  }
}

/** The key to delete when a file slot changes from `previousKey` to `nextKey` (null when unchanged or empty). */
export function replacedKey(previousKey: string | null | undefined, nextKey: string | null | undefined): string | null {
  if (!previousKey) return null;
  return previousKey === nextKey ? null : previousKey;
}

// ---------------------------------------------------------------------------
// Contact inquiry notifications
// ---------------------------------------------------------------------------

export interface ContactInquiryNotice {
  id: string;
  name: string;
  /** Empty string when the customer left no email address. */
  email: string;
  phone: string | null;
  subject: string | null;
  message: string;
  createdAt: Date;
}

export interface ContactInquiryNotifier {
  /**
   * Called once after an inquiry has been saved. The implementation sends the website's two emails:
   * CONTACT_ADMIN (name, email, phone, subject, message) to the configured admin address, and
   * CONTACT_USER (name, message) to the customer when `email` is not empty.
   */
  notifyInquiryReceived(inquiry: ContactInquiryNotice): Promise<void>;
}

const loggingNotifier: ContactInquiryNotifier = {
  async notifyInquiryReceived(inquiry: ContactInquiryNotice): Promise<void> {
    // Identifier only: names, emails, phone numbers and messages are never logged.
    logger.info({ inquiryId: inquiry.id }, '[content] contact inquiry received; no email notifier wired, nothing sent');
  },
};

let notifier: ContactInquiryNotifier = loggingNotifier;

export function setContactInquiryNotifier(implementation: ContactInquiryNotifier): void {
  notifier = implementation;
}

export function resetContactInquiryNotifier(): void {
  notifier = loggingNotifier;
}

/** Notifies without failing the caller: the inquiry is already saved when this runs. */
export async function notifyContactInquiry(inquiry: ContactInquiryNotice): Promise<void> {
  try {
    await notifier.notifyInquiryReceived(inquiry);
  } catch (err) {
    logger.error(
      { inquiryId: inquiry.id, err: err instanceof Error ? err.message : String(err) },
      '[content] contact inquiry notification failed'
    );
  }
}
