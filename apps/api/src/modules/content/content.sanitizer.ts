import sanitizeHtml from 'sanitize-html';

/**
 * Sanitising of admin-entered HTML and links for the website CMS.
 *
 * Blog content and the legal policy pages are written in the admin's rich-text editor (TipTap:
 * headings, lists, alignment, images, tables) and rendered as raw HTML on the public site. They are
 * sanitised ON WRITE with an allow-list (sanitize-html, MIT): no script/style/iframe/form elements,
 * no event-handler attributes, no javascript:/vbscript:/data: links. The stored value is therefore
 * always safe to render, whichever client renders it.
 */

const RASTER_DATA_IMAGE = /^data:image\/(?:png|jpe?g|gif|webp);base64,[a-z0-9+/=\s]+$/i;

const TEXT_ALIGN = [/^(?:left|right|center|justify)$/];
const CSS_LENGTH = [/^\d{1,4}(?:\.\d{1,2})?(?:px|%|em|rem)$/];

const RICH_TEXT_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'p', 'br', 'hr', 'blockquote', 'pre', 'code',
    'strong', 'b', 'em', 'i', 'u', 's', 'strike', 'sub', 'sup', 'mark', 'span', 'div',
    'ul', 'ol', 'li',
    'a', 'img', 'figure', 'figcaption',
    'table', 'colgroup', 'col', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
  ],
  allowedAttributes: {
    a: ['href', 'title', 'target', 'rel'],
    img: ['src', 'alt', 'title', 'width', 'height'],
    ol: ['start'],
    th: ['colspan', 'rowspan', 'style'],
    td: ['colspan', 'rowspan', 'style'],
    col: ['span', 'style'],
    table: ['style'],
    p: ['style'],
    h1: ['style'],
    h2: ['style'],
    h3: ['style'],
    h4: ['style'],
    h5: ['style'],
    h6: ['style'],
    div: ['style'],
  },
  allowedStyles: {
    '*': { 'text-align': TEXT_ALIGN },
    table: { width: CSS_LENGTH, 'min-width': CSS_LENGTH },
    col: { width: CSS_LENGTH, 'min-width': CSS_LENGTH },
    th: { width: CSS_LENGTH, 'min-width': CSS_LENGTH },
    td: { width: CSS_LENGTH, 'min-width': CSS_LENGTH },
  },
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  // The website admin's editor embeds pasted images as base64 data: URIs, so existing content
  // carries them. data: is accepted for <img src> only, and only for raster formats (see below).
  allowedSchemesByTag: { img: ['http', 'https', 'data'] },
  allowedSchemesAppliedToAttributes: ['href', 'src', 'cite'],
  allowProtocolRelative: false,
  // Dropped elements that carry code or styling lose their content too.
  nonTextTags: ['script', 'style', 'textarea', 'option', 'noscript', 'iframe', 'object', 'embed', 'template'],
  disallowedTagsMode: 'discard',
  enforceHtmlBoundary: false,
  transformTags: {
    a: (tagName, attribs) => {
      const next: sanitizeHtml.Attributes = { ...attribs };
      if (next.target) {
        // Any target opens a new tab; never let the opened page reach back into ours.
        next.target = '_blank';
        next.rel = 'noopener noreferrer';
      } else {
        delete next.rel;
      }
      return { tagName, attribs: next };
    },
  },
  exclusiveFilter: (frame) => {
    if (frame.tag !== 'img') return false;
    const src = frame.attribs.src ?? '';
    if (!src) return true;
    if (/^data:/i.test(src)) return !RASTER_DATA_IMAGE.test(src);
    return false;
  },
};

/** Sanitises rich-text HTML with the CMS allow-list. Always returns a string safe to render. */
export function sanitizeRichText(html: string): string {
  return sanitizeHtml(html, RICH_TEXT_OPTIONS).trim();
}

/** The visible text of an HTML fragment (all tags removed, entities kept encoded). */
export function richTextToPlainText(html: string): string {
  return sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} }).replace(/\s+/g, ' ').trim();
}

/** True when a sanitised rich text still shows something (text or an image). */
export function hasVisibleContent(sanitizedHtml: string): boolean {
  return richTextToPlainText(sanitizedHtml).length > 0 || /<img\s/i.test(sanitizedHtml);
}

/** An absolute http(s) URL with a host. Rejects javascript:, data:, protocol-relative and credentials. */
export function isSafeHttpUrl(value: string): boolean {
  if (/[\u0000-\u001f\u007f\s]/.test(value)) return false;
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return false;
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return false;
  if (!parsed.hostname || parsed.username || parsed.password) return false;
  return true;
}

/** A site-relative path such as "/free-online-kundli" (never "//host" or "/\host"). */
export function isSiteRelativePath(value: string): boolean {
  if (/[\u0000-\u001f\u007f\s]/.test(value)) return false;
  return value.startsWith('/') && !value.startsWith('//') && !value.startsWith('/\\');
}

/** A link an admin may point a button or bar at: an absolute http(s) URL or a site-relative path. */
export function isSafeLink(value: string): boolean {
  return isSafeHttpUrl(value) || isSiteRelativePath(value);
}

const YOUTUBE_HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be', 'www.youtube-nocookie.com']);
const YOUTUBE_ID = /^[0-9A-Za-z_-]{11}$/;

/**
 * The 11-character video id of a YouTube link (watch, youtu.be, embed, shorts, live), or null when
 * the URL is not a YouTube link. Unlike the website's prefix regex this parses the URL, so
 * "https://youtu.be.evil.example/x" is rejected.
 */
export function youtubeVideoId(value: string): string | null {
  if (!isSafeHttpUrl(value)) return null;
  const url = new URL(value);
  const host = url.hostname.toLowerCase();
  if (!YOUTUBE_HOSTS.has(host)) return null;
  const segments = url.pathname.split('/').filter((s) => s.length > 0);
  let id: string | undefined;
  if (host === 'youtu.be') {
    id = segments[0];
  } else if (segments[0] === 'watch') {
    id = url.searchParams.get('v') ?? undefined;
  } else if (segments[0] === 'embed' || segments[0] === 'shorts' || segments[0] === 'live' || segments[0] === 'v') {
    id = segments[1];
  }
  return id && YOUTUBE_ID.test(id) ? id : null;
}

/** True for any link on a YouTube host (channel and playlist links have no video id). */
export function isYoutubeUrl(value: string): boolean {
  if (!isSafeHttpUrl(value)) return false;
  return YOUTUBE_HOSTS.has(new URL(value).hostname.toLowerCase());
}

/**
 * URL slug: lower-case ASCII letters, digits and single hyphens. Accents are folded; anything else
 * becomes a hyphen. Returns "" when nothing usable is left (for example a title written in Devanagari).
 */
export function slugify(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120)
    .replace(/-+$/g, '');
}
