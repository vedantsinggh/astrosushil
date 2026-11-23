import { describe, it, expect } from 'vitest';
import {
  hasVisibleContent,
  isSafeHttpUrl,
  isSafeLink,
  isYoutubeUrl,
  richTextToPlainText,
  sanitizeRichText,
  slugify,
  youtubeVideoId,
} from '../../src/modules/content/content.sanitizer';

describe('content sanitizer: rich text', () => {
  it('keeps what the admin editor produces', () => {
    const html =
      '<h2 style="text-align: center">Title</h2><p>Some <strong>bold</strong> and <em>italic</em> text.</p>' +
      '<ul><li>One</li><li>Two</li></ul><blockquote>Quote</blockquote>' +
      '<table><tbody><tr><th colspan="2">Head</th></tr><tr><td>A</td><td>B</td></tr></tbody></table>' +
      '<p><a href="https://example.com/page">link</a></p><img src="https://cdn.example.com/a.png" alt="A">';
    const clean = sanitizeRichText(html);
    expect(clean).toContain('<h2 style="text-align:center">Title</h2>');
    expect(clean).toContain('<strong>bold</strong>');
    expect(clean).toContain('<li>One</li>');
    expect(clean).toContain('<th colspan="2">Head</th>');
    expect(clean).toContain('<a href="https://example.com/page">link</a>');
    expect(clean).toContain('<img src="https://cdn.example.com/a.png" alt="A" />');
  });

  it('removes script elements together with their code', () => {
    const clean = sanitizeRichText('<p>Hello</p><script>alert(document.cookie)</script><p>World</p>');
    expect(clean).toBe('<p>Hello</p><p>World</p>');
  });

  it('removes style, iframe, object, embed and form elements', () => {
    const clean = sanitizeRichText(
      '<style>body{display:none}</style><iframe src="https://evil.example"></iframe>' +
        '<object data="x.swf"></object><embed src="x.swf"><form action="https://evil.example"><input name="q"></form><p>ok</p>'
    );
    expect(clean).not.toMatch(/<(style|iframe|object|embed|form|input)/i);
    expect(clean).toContain('<p>ok</p>');
  });

  it('removes every event-handler attribute', () => {
    const clean = sanitizeRichText('<p onclick="steal()" onmouseover="steal()">text</p><img src="https://a.example/x.png" onerror="steal()">');
    expect(clean).not.toMatch(/on\w+=/i);
    expect(clean).toContain('<p>text</p>');
  });

  it.each([
    ['javascript:alert(1)'],
    ['JaVaScRiPt:alert(1)'],
    ['java\tscript:alert(1)'],
    ['&#106;avascript:alert(1)'],
    ['vbscript:msgbox(1)'],
    ['data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg=='],
    ['//evil.example/x'],
  ])('drops the unsafe link target %s', (href) => {
    const clean = sanitizeRichText(`<a href="${href}">click</a>`);
    expect(clean).toBe('<a>click</a>');
  });

  it('keeps mailto, tel and relative links', () => {
    expect(sanitizeRichText('<a href="mailto:hi@example.com">m</a>')).toContain('href="mailto:hi@example.com"');
    expect(sanitizeRichText('<a href="tel:+911234567890">t</a>')).toContain('href="tel:+911234567890"');
    expect(sanitizeRichText('<a href="/contact">c</a>')).toContain('href="/contact"');
  });

  it('forces rel="noopener noreferrer" on links that open a new tab and drops a stray rel otherwise', () => {
    expect(sanitizeRichText('<a href="https://example.com" target="_blank">x</a>')).toBe(
      '<a href="https://example.com" target="_blank" rel="noopener noreferrer">x</a>'
    );
    expect(sanitizeRichText('<a href="https://example.com" target="evil" rel="opener">x</a>')).toBe(
      '<a href="https://example.com" target="_blank" rel="noopener noreferrer">x</a>'
    );
    expect(sanitizeRichText('<a href="https://example.com" rel="opener">x</a>')).toBe('<a href="https://example.com">x</a>');
  });

  it('accepts base64 raster images (the website editor embeds them) but not SVG or HTML data URIs', () => {
    const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    expect(sanitizeRichText(`<img src="${png}">`)).toContain(`src="${png}"`);
    expect(sanitizeRichText('<img src="data:image/svg+xml;base64,PHN2ZyBvbmxvYWQ9YWxlcnQoMSk+">')).toBe('');
    expect(sanitizeRichText('<img src="data:text/html,<script>alert(1)</script>">')).not.toContain('<img');
    expect(sanitizeRichText('<img src="javascript:alert(1)">')).toBe('');
    expect(sanitizeRichText('<img alt="no source">')).toBe('');
  });

  it('removes inline styles other than the allow-listed ones', () => {
    const clean = sanitizeRichText('<p style="text-align:right;position:fixed;background:url(javascript:alert(1))">x</p>');
    expect(clean).toBe('<p style="text-align:right">x</p>');
    expect(sanitizeRichText('<span style="color:red" class="x" id="y">x</span>')).toBe('<span>x</span>');
  });

  it('removes SVG and MathML payloads', () => {
    const clean = sanitizeRichText('<svg onload="alert(1)"><script>alert(1)</script></svg><math><mi xlink:href="javascript:alert(1)">x</mi></math>');
    expect(clean).not.toMatch(/<svg|<math|script|alert\(1\)<\/script>|xlink/i);
  });

  it('is stable: sanitising sanitised output changes nothing', () => {
    const once = sanitizeRichText('<p onclick="x()">a <b>b</b> <a href="javascript:x" target="_blank">c</a></p><script>x</script>');
    expect(sanitizeRichText(once)).toBe(once);
  });

  it('tells empty rich text from visible content', () => {
    expect(hasVisibleContent(sanitizeRichText('<p>  </p><script>alert(1)</script>'))).toBe(false);
    expect(hasVisibleContent(sanitizeRichText('<p>text</p>'))).toBe(true);
    expect(hasVisibleContent(sanitizeRichText('<img src="https://cdn.example.com/a.png">'))).toBe(true);
    expect(richTextToPlainText('<p>Hello <b>world</b></p>')).toBe('Hello world');
  });
});

describe('content sanitizer: links', () => {
  it('accepts only absolute http(s) URLs as URLs', () => {
    expect(isSafeHttpUrl('https://example.com/a?b=c')).toBe(true);
    expect(isSafeHttpUrl('http://example.com')).toBe(true);
    expect(isSafeHttpUrl('javascript:alert(1)')).toBe(false);
    expect(isSafeHttpUrl('data:text/html,x')).toBe(false);
    expect(isSafeHttpUrl('ftp://example.com')).toBe(false);
    expect(isSafeHttpUrl('//example.com')).toBe(false);
    expect(isSafeHttpUrl('https://user:pass@example.com')).toBe(false);
    expect(isSafeHttpUrl('https://exa mple.com')).toBe(false);
    expect(isSafeHttpUrl('not a url')).toBe(false);
  });

  it('accepts site-relative paths as links but not protocol-relative ones', () => {
    expect(isSafeLink('/free-online-kundli')).toBe(true);
    expect(isSafeLink('https://example.com')).toBe(true);
    expect(isSafeLink('//evil.example')).toBe(false);
    expect(isSafeLink('/\\evil.example')).toBe(false);
    expect(isSafeLink('javascript:alert(1)')).toBe(false);
    expect(isSafeLink('relative/path')).toBe(false);
  });

  it('extracts YouTube video ids from every link form', () => {
    expect(youtubeVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(youtubeVideoId('https://youtu.be/dQw4w9WgXcQ?t=10')).toBe('dQw4w9WgXcQ');
    expect(youtubeVideoId('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(youtubeVideoId('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(youtubeVideoId('https://m.youtube.com/watch?v=dQw4w9WgXcQ&list=x')).toBe('dQw4w9WgXcQ');
    expect(youtubeVideoId('https://www.youtube.com/@channel')).toBeNull();
  });

  it('rejects look-alike hosts that the website prefix check let through', () => {
    expect(isYoutubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(true);
    expect(isYoutubeUrl('https://youtu.be/dQw4w9WgXcQ')).toBe(true);
    expect(isYoutubeUrl('https://youtu.be.evil.example/dQw4w9WgXcQ')).toBe(false);
    expect(isYoutubeUrl('https://evil.example/www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(false);
    expect(isYoutubeUrl('youtu.be/dQw4w9WgXcQ')).toBe(false);
    expect(youtubeVideoId('https://vimeo.com/123456')).toBeNull();
  });
});

describe('content sanitizer: slugify', () => {
  it('produces lower-case hyphenated ASCII slugs', () => {
    expect(slugify('  Shani Sade Sati: What It Means!  ')).toBe('shani-sade-sati-what-it-means');
    expect(slugify('Café & Crème')).toBe('cafe-creme');
    expect(slugify('already-a-slug')).toBe('already-a-slug');
    expect(slugify('--a--b--')).toBe('a-b');
  });

  it('returns an empty slug when nothing usable is left', () => {
    expect(slugify('कुंडली')).toBe('');
    expect(slugify('!!!')).toBe('');
  });
});
