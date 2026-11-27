/**
 * Readers for website (Mongo) values that are objects, not text. The website stores an uploaded
 * file as `{ url, key }` and a blog author as `{ name }`; `String()` on those gave the text
 * "[object Object]" (blog images, blog authors and SEO images were migrated that way).
 */

function text(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const t = value.trim();
  return t && t !== '[object Object]' ? t : null;
}

function record(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

/** URL of a file stored as `{ url, key }` or as a plain URL; null when missing. */
export function fileUrl(value: unknown): string | null {
  return text(value) ?? text(record(value)?.url);
}

/** Storage key of a file stored as `{ url, key }`; null for a plain URL or when missing. */
export function fileKey(value: unknown): string | null {
  return text(record(value)?.key);
}

/** Name of a person stored as `{ name }` or as text; null when missing. */
export function personName(value: unknown): string | null {
  return text(value) ?? text(record(value)?.name);
}
