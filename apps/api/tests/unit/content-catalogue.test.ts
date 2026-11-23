import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/services/prisma.service', async () => {
  const { fakePrisma } = await import('./content-test-helpers');
  return { prisma: fakePrisma };
});
vi.mock('../../src/modules/admin/admin.service', () => ({ adminService: { logAction: vi.fn() } }));
vi.mock('../../src/services/storage/storage-refs', () => ({
  validateUploadedRef: vi.fn(),
  deleteUploadedObject: vi.fn(),
}));
vi.mock('../../src/services/redis-client', () => ({
  nativeRedisClient: { isConfigured: false, get: vi.fn(), del: vi.fn(), eval: vi.fn() },
}));

import { adminService } from '../../src/modules/admin/admin.service';
import { deleteUploadedObject, validateUploadedRef } from '../../src/services/storage/storage-refs';
import { ContentCache, seoCacheKey } from '../../src/modules/content/content.cache';
import { FaqsService } from '../../src/modules/content/faqs.service';
import { MediaService, resolveMediaFiles, youtubeThumbnailUrl } from '../../src/modules/content/media.service';
import { SeoService } from '../../src/modules/content/seo.service';
import { TestimonialsService } from '../../src/modules/content/testimonials.service';
import {
  createFaqSchema,
  createMediaSchema,
  createSeoSchema,
  createTestimonialSchema,
  publicTestimonialQuerySchema,
  seoNameParamSchema,
  updateFaqSchema,
  updateMediaSchema,
  updateSeoSchema,
  updateTestimonialSchema,
} from '../../src/modules/content/content.schemas';
import { ConflictError, NotFoundError, ValidationError } from '../../src/errors/app-error';
import { FakeKeyValueStore, fakePrisma, resetFakePrisma, testActor } from './content-test-helpers';

const logAction = vi.mocked(adminService.logAction);
const validateRef = vi.mocked(validateUploadedRef);
const deleteObject = vi.mocked(deleteUploadedObject);
const deleted: string[] = [];

const file = (name: string) => ({ url: `https://cdn.example.test/assets/${name}`, key: `assets/${name}` });
const lastAudit = () => logAction.mock.calls[logAction.mock.calls.length - 1][0];
const YT = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
const YT_THUMB = 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg';

beforeEach(() => {
  resetFakePrisma();
  logAction.mockClear();
  deleted.length = 0;
  validateRef.mockReset();
  validateRef.mockImplementation((ref) => ({ url: ref.url ?? null, key: ref.key ?? 'derived-key' }));
  deleteObject.mockReset();
  deleteObject.mockImplementation(async (key) => {
    deleted.push(String(key));
    return true;
  });
});

// ---------------------------------------------------------------------------
// FAQs
// ---------------------------------------------------------------------------

describe('FaqsService', () => {
  const service = new FaqsService();
  const faq = (overrides: Record<string, unknown> = {}) =>
    createFaqSchema.parse({ question: 'How do I book?', answer: 'Pick a slot and pay.', page: 'consultation', ...overrides });

  it('validates the website rules', () => {
    expect(createFaqSchema.safeParse({ question: 'Hi?', answer: 'Pick a slot', page: 'home' }).success).toBe(false);
    expect(createFaqSchema.safeParse({ question: 'How do I book?', answer: 'No', page: 'home' }).success).toBe(false);
    expect(createFaqSchema.safeParse({ question: 'How do I book?', answer: 'Pick a slot', page: '' }).success).toBe(false);
    expect(faq()).toMatchObject({ isActive: true, order: 0 });
  });

  it('shows the public only active FAQs, by page, in display order', async () => {
    await service.create(faq({ question: 'Second question', order: 2 }), testActor);
    await service.create(faq({ question: 'First question', order: 1 }), testActor);
    await service.create(faq({ question: 'Hidden question', isActive: false }), testActor);
    await service.create(faq({ question: 'Home question', page: 'home' }), testActor);

    expect((await service.listPublic('consultation')).map((f) => f.question)).toEqual(['First question', 'Second question']);
    expect(await service.listPublic()).toHaveLength(3);
    expect(Object.keys((await service.listPublic())[0]).sort()).toEqual(['answer', 'id', 'order', 'page', 'question']);
  });

  it('shows the admin every FAQ and records who created and updated it', async () => {
    const created = await service.create(faq({ isActive: false }), testActor);
    expect(created.createdById).toBe('admin-1');
    expect(await service.list({})).toHaveLength(1);
    expect(await service.list({ isActive: true })).toHaveLength(0);

    const updated = await service.update(created.id, updateFaqSchema.parse({ isActive: true, order: 4 }), { ...testActor, id: 'admin-2' });
    expect(updated).toMatchObject({ isActive: true, order: 4, updatedById: 'admin-2', createdById: 'admin-1' });
    expect(lastAudit()).toMatchObject({ action: 'FAQ_UPDATE', details: 'Changed: isActive, order', adminId: 'admin-2' });
  });

  it('hard-deletes and audits', async () => {
    const created = await service.create(faq(), testActor);
    await service.remove(created.id, testActor);
    expect(fakePrisma.faq.rows).toHaveLength(0);
    expect(lastAudit()).toMatchObject({ action: 'FAQ_DELETE', resource: `Faq:${created.id}` });
    await expect(service.update(created.id, {}, testActor)).rejects.toBeInstanceOf(NotFoundError);
    await expect(service.remove(created.id, testActor)).rejects.toBeInstanceOf(NotFoundError);
  });
});

// ---------------------------------------------------------------------------
// Testimonials
// ---------------------------------------------------------------------------

describe('TestimonialsService', () => {
  const service = new TestimonialsService();
  const item = (overrides: Record<string, unknown> = {}) =>
    createTestimonialSchema.parse({ name: 'Asha', message: 'Very accurate reading.', ...overrides });
  const publicQuery = (query: Record<string, unknown> = {}) => publicTestimonialQuerySchema.parse(query);

  it('validates rating, type and video URL', () => {
    expect(createTestimonialSchema.safeParse({ name: 'A', message: 'm', rating: 0 }).success).toBe(false);
    expect(createTestimonialSchema.safeParse({ name: 'A', message: 'm', rating: 6 }).success).toBe(false);
    expect(createTestimonialSchema.safeParse({ name: 'A', message: 'm', rating: 4.5 }).success).toBe(false);
    expect(createTestimonialSchema.safeParse({ name: 'A', message: 'm', type: 'audio' }).success).toBe(false);
    expect(createTestimonialSchema.safeParse({ name: 'A', message: 'm', videoUrl: 'javascript:alert(1)' }).success).toBe(false);
    expect(createTestimonialSchema.safeParse({ name: '', message: 'm' }).success).toBe(false);
    expect(item()).toMatchObject({ rating: 5, type: 'text', page: 'home', order: 0, isActive: true });
  });

  it('shows the public only active testimonials, whatever the query asks for', async () => {
    await service.create(item({ name: 'Active' }), testActor);
    await service.create(item({ name: 'Inactive', isActive: false }), testActor);

    // The website honoured ?isActive=false on its public endpoint; ours ignores it.
    const result = await service.listPublic(publicQuery({ isActive: 'false' }));
    expect(result.items.map((t) => t.name)).toEqual(['Active']);
    expect(result.total).toBe(1);

    const inactive = fakePrisma.testimonial.rows.find((row) => row.name === 'Inactive');
    await expect(service.getPublicById(String(inactive?.id))).rejects.toBeInstanceOf(NotFoundError);
  });

  it('filters by page, service and minimum rating, in display order, with a limit', async () => {
    await service.create(item({ name: 'B', order: 2, rating: 5, serviceName: 'Kundli' }), testActor);
    await service.create(item({ name: 'A', order: 1, rating: 3 }), testActor);
    await service.create(item({ name: 'C', order: 3, rating: 4, page: 'consultation', image: file('c.png') }), testActor);

    expect((await service.listPublic(publicQuery())).items.map((t) => t.name)).toEqual(['A', 'B', 'C']);
    expect((await service.listPublic(publicQuery({ rating: '4' }))).items.map((t) => t.name)).toEqual(['B', 'C']);
    expect((await service.listPublic(publicQuery({ page: 'consultation' }))).items.map((t) => t.name)).toEqual(['C']);
    expect((await service.listPublic(publicQuery({ serviceName: 'Kundli' }))).items.map((t) => t.name)).toEqual(['B']);

    const limited = await service.listPublic(publicQuery({ limit: '2' }));
    expect(limited.items).toHaveLength(2);
    expect(limited.total).toBe(3);
    expect(publicQuery().limit).toBe(10);

    const withImage = (await service.listPublic(publicQuery({ page: 'consultation' }))).items[0];
    expect(withImage.image).toBe('https://cdn.example.test/assets/c.png');
    expect(Object.keys(withImage)).not.toContain('imageKey');
    expect(Object.keys(withImage)).not.toContain('isActive');
  });

  it('lets the admin see inactive testimonials and toggle them', async () => {
    const created = await service.create(item(), testActor);
    const off = await service.toggle(created.id, testActor);
    expect(off.isActive).toBe(false);
    expect(lastAudit()).toMatchObject({ action: 'TESTIMONIAL_TOGGLE', details: 'Deactivated' });

    expect((await service.list({ limit: 100, offset: 0 })).total).toBe(1);
    expect((await service.list({ limit: 100, offset: 0, isActive: true })).total).toBe(0);
    expect((await service.toggle(created.id, testActor)).isActive).toBe(true);
  });

  it('replaces and deletes the image file', async () => {
    const created = await service.create(item({ image: file('a.png') }), testActor);
    expect(validateRef).toHaveBeenCalledWith(expect.anything(), { visibility: 'public', purposes: ['testimonial'], field: 'image' });

    await service.update(created.id, updateTestimonialSchema.parse({ image: file('b.png'), rating: 4 }), testActor);
    expect(deleted).toEqual(['assets/a.png']);

    await service.remove(created.id, testActor);
    expect(deleted).toEqual(['assets/a.png', 'assets/b.png']);
    expect(fakePrisma.testimonial.rows).toHaveLength(0);
    expect(lastAudit()).toMatchObject({ action: 'TESTIMONIAL_DELETE' });
  });
});

// ---------------------------------------------------------------------------
// Media
// ---------------------------------------------------------------------------

describe('Media rules (resolveMediaFiles)', () => {
  it('podcast: needs a YouTube link, takes no upload, and defaults the thumbnail to YouTube', () => {
    expect(resolveMediaFiles('podcast', { mediaUrl: YT }, null)).toEqual({
      type: 'video', mediaUrl: YT, mediaKey: null, thumbnailUrl: YT_THUMB, thumbnailKey: null,
    });
    expect(youtubeThumbnailUrl('https://youtu.be/dQw4w9WgXcQ')).toBe(YT_THUMB);

    expect(() => resolveMediaFiles('podcast', {}, null)).toThrow('Youtube URL is required');
    expect(() => resolveMediaFiles('podcast', { mediaUrl: 'https://vimeo.com/1' }, null)).toThrow('Only Youtube URL allowed');
    expect(() => resolveMediaFiles('podcast', { mediaUrl: 'https://youtu.be.evil.example/x' }, null)).toThrow('Only Youtube URL allowed');
    expect(() => resolveMediaFiles('podcast', { mediaUrl: YT, media: file('v.mp4') }, null)).toThrow('Podcast only supports Youtube URL');
  });

  it('podcast: an uploaded thumbnail wins and survives later edits', () => {
    const created = resolveMediaFiles('podcast', { mediaUrl: YT, thumbnail: file('t.png') }, null);
    expect(created).toMatchObject({ thumbnailUrl: 'https://cdn.example.test/assets/t.png', thumbnailKey: 'assets/t.png' });

    const existing = { section: 'podcast', personName: '', ...created };
    // The website reset an uploaded thumbnail to YouTube's on every later save.
    expect(resolveMediaFiles('podcast', {}, existing)).toMatchObject({ thumbnailKey: 'assets/t.png' });
    expect(resolveMediaFiles('podcast', { mediaUrl: 'https://youtu.be/aaaaaaaaaaa' }, existing)).toMatchObject({
      mediaUrl: 'https://youtu.be/aaaaaaaaaaa', thumbnailKey: 'assets/t.png',
    });
    expect(resolveMediaFiles('podcast', { thumbnail: null }, existing)).toMatchObject({ thumbnailUrl: YT_THUMB, thumbnailKey: null });
  });

  it('podcast: a YouTube-derived thumbnail follows the video', () => {
    const existing = { section: 'podcast', personName: '', mediaUrl: YT, mediaKey: null, thumbnailUrl: YT_THUMB, thumbnailKey: null };
    expect(resolveMediaFiles('podcast', { mediaUrl: 'https://youtu.be/aaaaaaaaaaa' }, existing).thumbnailUrl).toBe(
      'https://img.youtube.com/vi/aaaaaaaaaaa/hqdefault.jpg'
    );
  });

  it('celebrity: needs an uploaded video and a thumbnail', () => {
    expect(resolveMediaFiles('celebrity', { media: file('v.mp4'), thumbnail: file('t.png') }, null)).toEqual({
      type: 'video',
      mediaUrl: 'https://cdn.example.test/assets/v.mp4',
      mediaKey: 'assets/v.mp4',
      thumbnailUrl: 'https://cdn.example.test/assets/t.png',
      thumbnailKey: 'assets/t.png',
    });
    expect(validateRef).toHaveBeenCalledWith(expect.anything(), { visibility: 'public', purposes: ['media-video'], field: 'media' });
    expect(validateRef).toHaveBeenCalledWith(expect.anything(), { visibility: 'public', purposes: ['media'], field: 'thumbnail' });

    expect(() => resolveMediaFiles('celebrity', { thumbnail: file('t.png') }, null)).toThrow('Video upload is required');
    expect(() => resolveMediaFiles('celebrity', { media: file('v.mp4') }, null)).toThrow('Thumbnail is required');
    expect(() => resolveMediaFiles('celebrity', { mediaUrl: YT, media: file('v.mp4'), thumbnail: file('t.png') }, null)).toThrow();
  });

  it('wishes: the image is the thumbnail and a person name is required', () => {
    expect(resolveMediaFiles('wishes', { thumbnail: file('w.png'), personName: 'Ravi' }, null)).toEqual({
      type: 'image', mediaUrl: null, mediaKey: null, thumbnailUrl: 'https://cdn.example.test/assets/w.png', thumbnailKey: 'assets/w.png',
    });
    expect(() => resolveMediaFiles('wishes', { personName: 'Ravi' }, null)).toThrow('Image is required for wishes');
    expect(() => resolveMediaFiles('wishes', { thumbnail: file('w.png'), personName: '' }, null)).toThrow('Person name is required');
    expect(() => resolveMediaFiles('wishes', { thumbnail: file('w.png'), personName: 'R', media: file('v.mp4') }, null)).toThrow();
  });

  it('applies the full rules again when the section changes, and drops the old files', () => {
    const celebrity = { section: 'celebrity', personName: '', mediaUrl: 'u', mediaKey: 'assets/v.mp4', thumbnailUrl: 't', thumbnailKey: 'assets/t.png' };
    expect(() => resolveMediaFiles('podcast', {}, celebrity)).toThrow('Youtube URL is required');
    expect(resolveMediaFiles('podcast', { mediaUrl: YT }, celebrity)).toEqual({
      type: 'video', mediaUrl: YT, mediaKey: null, thumbnailUrl: YT_THUMB, thumbnailKey: null,
    });
    expect(() => resolveMediaFiles('wishes', {}, celebrity)).toThrow('Image is required for wishes');
  });

  it('lets an ordinary update of an old, incomplete record through', () => {
    const legacy = { section: 'celebrity', personName: '', mediaUrl: 'https://old.example/v.mp4', mediaKey: null, thumbnailUrl: null, thumbnailKey: null };
    expect(resolveMediaFiles('celebrity', {}, legacy)).toEqual({
      type: 'video', mediaUrl: 'https://old.example/v.mp4', mediaKey: null, thumbnailUrl: null, thumbnailKey: null,
    });
  });
});

describe('MediaService', () => {
  const service = new MediaService();
  const podcast = (overrides: Record<string, unknown> = {}) =>
    createMediaSchema.parse({ title: 'Episode 1', section: 'podcast', mediaUrl: YT, ...overrides });
  const celebrity = (overrides: Record<string, unknown> = {}) =>
    createMediaSchema.parse({ title: 'Star visit', section: 'celebrity', media: file('v.mp4'), thumbnail: file('t.png'), ...overrides });

  it('validates the section and title', () => {
    expect(createMediaSchema.safeParse({ title: 'x', section: 'podcast' }).success).toBe(false);
    expect(createMediaSchema.safeParse({ title: 'Episode', section: 'testimonial' }).success).toBe(false);
    expect(createMediaSchema.safeParse({ title: 'Episode', section: 'podcast', mediaUrl: 'javascript:alert(1)' }).success).toBe(false);
  });

  it('shows the public active items by section, in display order, without keys', async () => {
    await service.create(podcast({ title: 'Episode 2', order: 2 }), testActor);
    await service.create(podcast({ title: 'Episode 1', order: 1 }), testActor);
    await service.create(podcast({ title: 'Hidden', isActive: false }), testActor);
    await service.create(celebrity(), testActor);

    expect((await service.listPublic('podcast')).map((m) => m.title)).toEqual(['Episode 1', 'Episode 2']);
    expect(await service.listPublic()).toHaveLength(3);

    const star = (await service.listPublic('celebrity'))[0];
    expect(star).toMatchObject({ type: 'video', mediaUrl: 'https://cdn.example.test/assets/v.mp4', thumbnail: 'https://cdn.example.test/assets/t.png' });
    expect(JSON.stringify(star)).not.toContain('Key');

    const hidden = fakePrisma.mediaItem.rows.find((row) => row.title === 'Hidden');
    await expect(service.getPublicById(String(hidden?.id))).rejects.toBeInstanceOf(NotFoundError);
  });

  it('rejects an invalid create before writing', async () => {
    await expect(service.create(createMediaSchema.parse({ title: 'Wish', section: 'wishes', thumbnail: file('w.png') }), testActor)).rejects.toBeInstanceOf(ValidationError);
    expect(fakePrisma.mediaItem.rows).toHaveLength(0);
    expect(logAction).not.toHaveBeenCalled();
  });

  it('toggles, updates and deletes replaced files', async () => {
    const created = await service.create(celebrity(), testActor);
    expect(created).toMatchObject({ createdById: 'admin-1', media: { key: 'assets/v.mp4' }, thumbnail: { key: 'assets/t.png' } });

    expect((await service.toggle(created.id, testActor)).isActive).toBe(false);
    expect(lastAudit()).toMatchObject({ action: 'MEDIA_TOGGLE', details: 'Deactivated' });
    expect(await service.list({ isActive: false })).toHaveLength(1);

    // The website admin toggles with a PUT carrying isActive, title and section.
    const viaPut = await service.update(created.id, updateMediaSchema.parse({ isActive: true, title: 'Star visit', section: 'celebrity' }), testActor);
    expect(viaPut).toMatchObject({ isActive: true, media: { key: 'assets/v.mp4' } });
    expect(deleted).toEqual([]);

    await service.update(created.id, updateMediaSchema.parse({ thumbnail: file('t2.png') }), testActor);
    expect(deleted).toEqual(['assets/t.png']);

    const asPodcast = await service.update(created.id, updateMediaSchema.parse({ section: 'podcast', mediaUrl: YT }), testActor);
    expect(asPodcast).toMatchObject({ section: 'podcast', media: null, mediaUrl: YT, thumbnail: { url: YT_THUMB, key: null } });
    expect(deleted).toEqual(['assets/t.png', 'assets/v.mp4', 'assets/t2.png']);
  });

  it('hard-deletes the item with both files and audits it', async () => {
    const created = await service.create(celebrity(), testActor);
    await service.remove(created.id, testActor);
    expect(fakePrisma.mediaItem.rows).toHaveLength(0);
    expect(deleted.sort()).toEqual(['assets/t.png', 'assets/v.mp4']);
    expect(lastAudit()).toMatchObject({ action: 'MEDIA_DELETE', resource: `MediaItem:${created.id}` });
  });

  it('never tries to delete a YouTube thumbnail', async () => {
    const created = await service.create(podcast(), testActor);
    await service.remove(created.id, testActor);
    expect(deleted).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// SEO
// ---------------------------------------------------------------------------

describe('SeoService', () => {
  let store: FakeKeyValueStore;
  let service: SeoService;
  const seo = (overrides: Record<string, unknown> = {}) =>
    createSeoSchema.parse({ name: 'Home', metaTitle: 'Astro Sushil', metaDescription: 'Vedic astrology', ...overrides });

  beforeEach(() => {
    store = new FakeKeyValueStore();
    service = new SeoService(new ContentCache(store));
  });

  it('lower-cases the page name on write and on lookup', async () => {
    expect(seo().name).toBe('home');
    expect(seoNameParamSchema.parse({ name: ' HOME ' }).name).toBe('home');
    expect(createSeoSchema.safeParse({ name: '', metaTitle: 't', metaDescription: 'd' }).success).toBe(false);
    expect(createSeoSchema.safeParse({ name: 'home', metaTitle: '', metaDescription: 'd' }).success).toBe(false);
  });

  it('keeps one record per page name', async () => {
    await service.create(seo(), testActor);
    await expect(service.create(seo({ name: 'HOME' }), testActor)).rejects.toBeInstanceOf(ConflictError);

    const about = await service.create(seo({ name: 'about' }), testActor);
    await expect(service.update(about.id, updateSeoSchema.parse({ name: 'home' }), testActor)).rejects.toBeInstanceOf(ConflictError);
    expect((await service.update(about.id, updateSeoSchema.parse({ name: 'about' }), testActor)).name).toBe('about');
  });

  it('returns the public fields only and 404 for an unknown page, which is not cached', async () => {
    await service.create(seo({ image: file('og.png') }), testActor);
    expect(await service.getPublicByName('home')).toEqual({
      name: 'home',
      metaTitle: 'Astro Sushil',
      metaDescription: 'Vedic astrology',
      image: { url: 'https://cdn.example.test/assets/og.png' },
    });

    await expect(service.getPublicByName('nope')).rejects.toBeInstanceOf(NotFoundError);
    expect(store.data.has(seoCacheKey('nope'))).toBe(false);
  });

  it('caches a page for 10 minutes', async () => {
    await service.create(seo(), testActor);
    const findUnique = vi.spyOn(fakePrisma.seoPage, 'findUnique');

    await service.getPublicByName('home');
    await service.getPublicByName('home');
    expect(findUnique).toHaveBeenCalledTimes(1);
    const ttl = (store.data.get(seoCacheKey('home'))?.expiresAt ?? 0) - Date.now();
    expect(ttl).toBeGreaterThan(9 * 60 * 1000);
    expect(ttl).toBeLessThanOrEqual(10 * 60 * 1000);
    findUnique.mockRestore();
  });

  it('invalidates on update, on rename (old and new name) and on delete', async () => {
    const created = await service.create(seo(), testActor);
    await service.getPublicByName('home');

    await service.update(created.id, updateSeoSchema.parse({ metaTitle: 'New title' }), testActor);
    expect((await service.getPublicByName('home')).metaTitle).toBe('New title');

    await service.update(created.id, updateSeoSchema.parse({ name: 'landing' }), testActor);
    await expect(service.getPublicByName('home')).rejects.toBeInstanceOf(NotFoundError);
    expect((await service.getPublicByName('landing')).metaTitle).toBe('New title');

    await service.remove(created.id, testActor);
    await expect(service.getPublicByName('landing')).rejects.toBeInstanceOf(NotFoundError);
    expect(store.data.size).toBe(0);
  });

  it('replaces and deletes the image, and audits every write', async () => {
    const created = await service.create(seo({ image: file('og.png') }), testActor);
    expect(lastAudit()).toMatchObject({ action: 'SEO_CREATE', details: 'SEO for page "home"' });

    await service.update(created.id, updateSeoSchema.parse({ image: file('og2.png') }), testActor);
    expect(deleted).toEqual(['assets/og.png']);
    expect(lastAudit()).toMatchObject({ action: 'SEO_UPDATE', details: 'Changed: image' });

    await service.remove(created.id, testActor);
    expect(deleted).toEqual(['assets/og.png', 'assets/og2.png']);
    expect(lastAudit()).toMatchObject({ action: 'SEO_DELETE' });
    expect((await service.list())).toHaveLength(0);
  });
});
