/** Mongo → Postgres value readers (2026-11-27): uploaded files and people are objects in the website DB. */
import { describe, it, expect } from 'vitest';
import { fileKey, fileUrl, personName } from '../../src/scripts/migration-values';

describe('migration value readers', () => {
  it('reads a file stored as { url, key }, as a plain URL, or missing', () => {
    const f = { url: 'https://astrosushil.s3.ap-south-1.amazonaws.com/assets/a.webp', key: 'assets/a.webp' };
    expect(fileUrl(f)).toBe(f.url);
    expect(fileKey(f)).toBe('assets/a.webp');
    expect(fileUrl('https://cdn.test/b.png')).toBe('https://cdn.test/b.png');
    expect(fileKey('https://cdn.test/b.png')).toBeNull();
    for (const v of [null, undefined, '', '  ', {}, { url: '' }, 42, '[object Object]']) {
      expect(fileUrl(v)).toBeNull();
      expect(fileKey(v)).toBeNull();
    }
  });

  it('reads a person stored as { name } or as text', () => {
    expect(personName({ name: 'Rahul' })).toBe('Rahul');
    expect(personName('Astro Sushil')).toBe('Astro Sushil');
    expect(personName({})).toBeNull();
    expect(personName(null)).toBeNull();
    expect(personName('[object Object]')).toBeNull();
  });
});
