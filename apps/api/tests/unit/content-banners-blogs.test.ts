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
import { BannersService } from '../../src/modules/content/banners.service';
import { BlogsService } from '../../src/modules/content/blogs.service';
import { bannerCacheKey, ContentCache } from '../../src/modules/content/content.cache';
import { deleteUploadedObject, validateUploadedRef } from '../../src/services/storage/storage-refs';
import { createBannerSchema, createBlogSchema, updateBannerSchema, updateBlogSchema } from '../../src/modules/content/content.schemas';
import { ConflictError, NotFoundError, ValidationError } from '../../src/errors/app-error';
import { FakeKeyValueStore, fakePrisma, resetFakePrisma, testActor } from './content-test-helpers';

const logAction = vi.mocked(adminService.logAction);
const validateRef = vi.mocked(validateUploadedRef);
const deleteObject = vi.mocked(deleteUploadedObject);
const deleted: string[] = [];

function file(name: string) {
  return { url: `https://cdn.example.test/assets/${name}`, key: `assets/${name}` };
}

function lastAudit() {
  return logAction.mock.calls[logAction.mock.calls.length - 1][0];
}

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
// Banners
// ---------------------------------------------------------------------------

describe('BannersService', () => {
  let store: FakeKeyValueStore;
  let service: BannersService;

  beforeEach(() => {
    store = new FakeKeyValueStore();
    service = new BannersService(new ContentCache(store));
  });

  const slider = (overrides: Record<string, unknown> = {}) =>
    createBannerSchema.parse({ type: 'Slider', title: 'Slide', image: file('slide.png'), ...overrides });

  it('validates the type, page, buttons and file reference', () => {
    expect(createBannerSchema.safeParse({ title: 'no type' }).success).toBe(false);
    expect(createBannerSchema.safeParse({ type: 'hero' }).success).toBe(false);
    expect(createBannerSchema.safeParse({ type: 'Page', page: 'Pricing' }).success).toBe(false);
    expect(createBannerSchema.safeParse({ type: 'Slider', buttons: [{ text: 'Go', link: 'javascript:alert(1)' }] }).success).toBe(false);
    expect(createBannerSchema.safeParse({ type: 'Slider', buttons: [{ text: '', link: '/x' }] }).success).toBe(false);
    expect(createBannerSchema.safeParse({ type: 'Slider', image: { url: 'data:image/png;base64,AAAA', key: 'k' } }).success).toBe(false);
    expect(createBannerSchema.safeParse({ type: 'Slider', unknownField: 1 }).success).toBe(false);

    const parsed = createBannerSchema.parse({ type: 'Slider', buttons: [{ text: 'Book', link: '/consultation' }] });
    expect(parsed).toMatchObject({ page: 'Homepage', order: 0, isActive: true });
    expect(updateBannerSchema.parse({})).toEqual({});
  });

  it('returns the home sliders in display order, active ones only, without storage keys', async () => {
    await service.create(slider({ title: 'Second', order: 2 }), testActor);
    await service.create(slider({ title: 'First', order: 1, buttons: [{ text: 'Book', link: '/consultation' }] }), testActor);
    await service.create(slider({ title: 'Hidden', order: 0, isActive: false }), testActor);
    await service.create(createBannerSchema.parse({ type: 'Page', page: 'Homepage', title: 'Not a slider' }), testActor);

    const result = await service.getPublicBanners('home');
    expect(result).toEqual({
      sliders: [
        expect.objectContaining({ title: 'First', order: 1, image: 'https://cdn.example.test/assets/slide.png', buttons: [{ text: 'Book', link: '/consultation' }] }),
        expect.objectContaining({ title: 'Second', order: 2 }),
      ],
    });
    expect(Object.keys((result as { sliders: object[] }).sliders[0]).sort()).toEqual(
      ['buttons', 'description', 'id', 'image', 'order', 'subtitle', 'title'].sort()
    );
  });

  it('returns the single page banner of the other pages, or null', async () => {
    await service.create(createBannerSchema.parse({ type: 'Page', page: 'About', title: 'About us', image: file('about.png') }), testActor);
    await service.create(createBannerSchema.parse({ type: 'Slider', page: 'Contact', title: 'Slider on contact' }), testActor);

    expect(await service.getPublicBanners('about')).toEqual({
      banner: expect.objectContaining({ title: 'About us', image: 'https://cdn.example.test/assets/about.png' }),
    });
    expect(await service.getPublicBanners('About')).toEqual({ banner: expect.objectContaining({ title: 'About us' }) });
    expect(await service.getPublicBanners('contact')).toEqual({ banner: null });
  });

  it('answers an unknown page without a query or a cache entry', async () => {
    const findFirst = vi.spyOn(fakePrisma.banner, 'findFirst');
    expect(await service.getPublicBanners('<script>')).toEqual({ banner: null });
    expect(await service.getPublicBanners('pricing')).toEqual({ banner: null });
    expect(findFirst).not.toHaveBeenCalled();
    expect(store.data.size).toBe(0);
    findFirst.mockRestore();
  });

  it('serves the cached page for 24 hours without reading the database again', async () => {
    await service.create(slider(), testActor);
    const findMany = vi.spyOn(fakePrisma.banner, 'findMany');

    await service.getPublicBanners('home');
    await service.getPublicBanners('home');
    expect(findMany).toHaveBeenCalledTimes(1);
    const entry = store.data.get(bannerCacheKey('Homepage'));
    expect(entry).toBeDefined();
    expect((entry?.expiresAt ?? 0) - Date.now()).toBeGreaterThan(23 * 60 * 60 * 1000);
    findMany.mockRestore();
  });

  it.each(['create', 'update', 'toggle', 'remove'] as const)('invalidates every page after %s', async (action) => {
    const about = await service.create(createBannerSchema.parse({ type: 'Page', page: 'About', title: 'Old' }), testActor);
    await service.getPublicBanners('home');
    await service.getPublicBanners('about');
    expect(store.data.size).toBe(2);

    if (action === 'create') await service.create(slider(), testActor);
    if (action === 'update') await service.update(about.id, updateBannerSchema.parse({ title: 'New' }), testActor);
    if (action === 'toggle') await service.toggle(about.id, testActor);
    if (action === 'remove') await service.remove(about.id, testActor);

    expect(store.data.size).toBe(0);
    const fresh = await service.getPublicBanners('about');
    if (action === 'update') expect(fresh).toEqual({ banner: expect.objectContaining({ title: 'New' }) });
    if (action === 'toggle' || action === 'remove') expect(fresh).toEqual({ banner: null });
  });

  it('filters the admin list by page, type and active flag', async () => {
    await service.create(slider({ order: 2 }), testActor);
    await service.create(slider({ order: 1, isActive: false }), testActor);
    await service.create(createBannerSchema.parse({ type: 'Page', page: 'About' }), testActor);

    expect(await service.list({})).toHaveLength(3);
    expect((await service.list({ type: 'Slider' })).map((b) => b.order)).toEqual([1, 2]);
    expect(await service.list({ page: 'About' })).toHaveLength(1);
    expect(await service.list({ isActive: false })).toHaveLength(1);
    expect((await service.list({ type: 'Slider' }))[0].image).toEqual({ url: expect.any(String), key: 'assets/slide.png' });
    expect(validateRef).toHaveBeenCalledWith(
      { url: 'https://cdn.example.test/assets/slide.png', key: 'assets/slide.png' },
      { visibility: 'public', purposes: ['banner'], field: 'image' }
    );
  });

  it('deletes the replaced image, keeps an unchanged one, and removes it on request', async () => {
    const banner = await service.create(slider(), testActor);

    await service.update(banner.id, updateBannerSchema.parse({ title: 'Renamed' }), testActor);
    await service.update(banner.id, updateBannerSchema.parse({ image: file('slide.png') }), testActor);
    expect(deleted).toEqual([]);

    await service.update(banner.id, updateBannerSchema.parse({ image: file('new.png') }), testActor);
    expect(deleted).toEqual(['assets/slide.png']);

    const cleared = await service.update(banner.id, updateBannerSchema.parse({ image: null }), testActor);
    expect(cleared.image).toBeNull();
    expect(deleted).toEqual(['assets/slide.png', 'assets/new.png']);
  });

  it('hard-deletes the banner and its image', async () => {
    const banner = await service.create(slider(), testActor);
    await service.remove(banner.id, testActor);

    expect(fakePrisma.banner.rows).toHaveLength(0);
    expect(deleted).toEqual(['assets/slide.png']);
    await expect(service.getById(banner.id)).rejects.toBeInstanceOf(NotFoundError);
    await expect(service.remove(banner.id, testActor)).rejects.toBeInstanceOf(NotFoundError);
  });

  it('refuses a file reference the storage module rejects, before writing anything', async () => {
    validateRef.mockImplementation(() => {
      throw new ValidationError('The file was not uploaded through the upload endpoint');
    });
    await expect(service.create(slider(), testActor)).rejects.toBeInstanceOf(ValidationError);
    expect(fakePrisma.banner.rows).toHaveLength(0);
    expect(logAction).not.toHaveBeenCalled();
  });

  it('does not fail the request when the storage delete fails', async () => {
    const banner = await service.create(slider(), testActor);
    deleteObject.mockRejectedValue(new Error('S3 unavailable'));
    await expect(service.remove(banner.id, testActor)).resolves.toBeUndefined();
    expect(fakePrisma.banner.rows).toHaveLength(0);
  });

  it('audits every state-changing action with the acting admin', async () => {
    const banner = await service.create(slider(), testActor);
    expect(lastAudit()).toMatchObject({
      adminId: 'admin-1',
      adminEmail: 'admin@example.test',
      action: 'BANNER_CREATE',
      resource: `Banner:${banner.id}`,
      ipAddress: '203.0.113.9',
      userAgent: 'vitest',
    });

    await service.update(banner.id, updateBannerSchema.parse({ title: 'x', order: 3 }), testActor);
    expect(lastAudit()).toMatchObject({ action: 'BANNER_UPDATE', details: 'Changed: title, order' });
    await service.toggle(banner.id, testActor);
    expect(lastAudit()).toMatchObject({ action: 'BANNER_TOGGLE', details: 'Deactivated' });
    await service.remove(banner.id, testActor);
    expect(lastAudit()).toMatchObject({ action: 'BANNER_DELETE' });
    expect(logAction).toHaveBeenCalledTimes(4);

    await service.list({});
    await service.getPublicBanners('home');
    expect(logAction).toHaveBeenCalledTimes(4);
  });
});

// ---------------------------------------------------------------------------
// Blogs
// ---------------------------------------------------------------------------

describe('BlogsService', () => {
  const service = new BlogsService();

  const post = (overrides: Record<string, unknown> = {}) =>
    createBlogSchema.parse({
      title: 'Sade Sati explained',
      shortDescription: 'What the seven and a half years mean.',
      content: '<p>Saturn moves slowly through the signs.</p>',
      category: 'Astrology',
      ...overrides,
    });

  it('validates the website rules', () => {
    expect(createBlogSchema.safeParse({ title: 'ab', shortDescription: 'long enough text', content: 'x'.repeat(20), category: 'A' }).success).toBe(false);
    expect(createBlogSchema.safeParse({ title: 'abc', shortDescription: 'short', content: 'x'.repeat(20), category: 'A' }).success).toBe(false);
    expect(createBlogSchema.safeParse({ title: 'abc', shortDescription: 'long enough text', content: 'short', category: 'A' }).success).toBe(false);
    expect(createBlogSchema.safeParse({ title: 'abc', shortDescription: 'long enough text', content: 'x'.repeat(20), category: 'A', status: 'archived' }).success).toBe(false);
    expect(post()).toMatchObject({ status: 'draft', isFeatured: false, tags: [], images: [] });
    expect(updateBlogSchema.parse({ isFeatured: true })).toEqual({ isFeatured: true });
  });

  it('stores sanitised HTML, never the script an admin pasted', async () => {
    const blog = await service.create(
      post({
        content:
          '<p onclick="steal()">Saturn <a href="javascript:steal()">moves</a> slowly.</p><script>steal()</script><img src="x" onerror="steal()">',
        status: 'published',
      }),
      testActor
    );
    expect(blog.content).toBe('<p>Saturn <a>moves</a> slowly.</p><img src="x" />');
    expect(String(fakePrisma.blogPost.rows[0].content)).not.toMatch(/script|onclick|onerror|javascript:/i);

    const updated = await service.update(blog.id, updateBlogSchema.parse({ content: '<p>Fine now.</p><iframe src="https://evil.example"></iframe>' }), testActor);
    expect(updated.content).toBe('<p>Fine now.</p>');
  });

  it('rejects content that is empty once sanitised', async () => {
    await expect(service.create(post({ content: '<script>alert("only a script here")</script>' }), testActor)).rejects.toBeInstanceOf(ValidationError);
    expect(fakePrisma.blogPost.rows).toHaveLength(0);
  });

  it('derives a unique slug from the title', async () => {
    const first = await service.create(post(), testActor);
    const second = await service.create(post(), testActor);
    const third = await service.create(post(), testActor);
    expect([first.slug, second.slug, third.slug]).toEqual(['sade-sati-explained', 'sade-sati-explained-1', 'sade-sati-explained-2']);
  });

  it('normalises a slug typed by the admin and refuses one that is taken', async () => {
    const blog = await service.create(post({ slug: 'My Custom Slug!' }), testActor);
    expect(blog.slug).toBe('my-custom-slug');

    await expect(service.create(post({ slug: 'my-custom-slug' }), testActor)).rejects.toBeInstanceOf(ConflictError);
    await expect(service.create(post({ slug: '!!!' }), testActor)).rejects.toBeInstanceOf(ValidationError);
    await expect(service.create(post({ title: 'शनि की साढ़े साती' }), testActor)).rejects.toBeInstanceOf(ValidationError);
    expect((await service.create(post({ title: 'शनि की साढ़े साती', slug: 'shani-sade-sati' }), testActor)).slug).toBe('shani-sade-sati');
  });

  it('keeps the slug when only the title changes, and changes it only on request', async () => {
    const blog = await service.create(post(), testActor);
    const other = await service.create(post({ title: 'Another post' }), testActor);

    expect((await service.update(blog.id, updateBlogSchema.parse({ title: 'A new title' }), testActor)).slug).toBe('sade-sati-explained');
    expect((await service.update(blog.id, updateBlogSchema.parse({ slug: 'sade-sati-explained' }), testActor)).slug).toBe('sade-sati-explained');
    expect((await service.update(blog.id, updateBlogSchema.parse({ slug: 'saturn-transit' }), testActor)).slug).toBe('saturn-transit');
    await expect(service.update(blog.id, updateBlogSchema.parse({ slug: other.slug }), testActor)).rejects.toBeInstanceOf(ConflictError);
  });

  it('sets publishedAt when a post is first published and keeps it afterwards', async () => {
    const draft = await service.create(post(), testActor);
    expect(draft.publishedAt).toBeNull();

    const published = await service.update(draft.id, updateBlogSchema.parse({ status: 'published' }), testActor);
    expect(published.publishedAt).toBeInstanceOf(Date);

    const unpublished = await service.update(draft.id, updateBlogSchema.parse({ status: 'draft' }), testActor);
    expect(unpublished.publishedAt).toEqual(published.publishedAt);
    const again = await service.update(draft.id, updateBlogSchema.parse({ status: 'published' }), testActor);
    expect(again.publishedAt).toEqual(published.publishedAt);

    const dated = await service.create(post({ status: 'published', publishedAt: '2026-01-15T00:00:00.000Z' }), testActor);
    expect(dated.publishedAt?.toISOString()).toBe('2026-01-15T00:00:00.000Z');
    expect((await service.create(post({ publishedAt: '2026-01-15T00:00:00.000Z' }), testActor)).publishedAt).toBeNull();
  });

  describe('public reads', () => {
    it('lists published posts only (the website also returned drafts)', async () => {
      await service.create(post({ title: 'Published one', status: 'published' }), testActor);
      await service.create(post({ title: 'Draft one' }), testActor);
      await service.create(post({ title: 'Published two', status: 'published', category: 'Vastu', tags: ['home'], isFeatured: true }), testActor);

      const all = await service.listPublished({ page: 1, limit: 10, search: '' });
      expect(all.total).toBe(2);
      expect(all.blogs.map((b) => b.title)).toEqual(['Published two', 'Published one']);
      expect(all.blogs.every((b) => b.status === 'published')).toBe(true);

      expect((await service.listPublished({ page: 1, limit: 10, search: 'draft' })).total).toBe(0);
      expect((await service.listPublished({ page: 1, limit: 10, search: 'PUBLISHED' })).total).toBe(2);
      expect((await service.listPublished({ page: 1, limit: 10, search: '', category: 'Vastu' })).total).toBe(1);
      expect((await service.listPublished({ page: 1, limit: 10, search: '', tag: 'home' })).total).toBe(1);
      expect((await service.listPublished({ page: 1, limit: 10, search: '', isFeatured: true })).total).toBe(1);

      const paged = await service.listPublished({ page: 2, limit: 1, search: '' });
      expect(paged.blogs.map((b) => b.title)).toEqual(['Published one']);
      expect(paged.total).toBe(2);
    });

    it('never returns a draft by slug or by id, and does not count a view for it', async () => {
      const draft = await service.create(post(), testActor);
      await expect(service.getPublishedBySlug(draft.slug)).rejects.toBeInstanceOf(NotFoundError);
      await expect(service.getPublishedById(draft.id)).rejects.toBeInstanceOf(NotFoundError);
      expect(fakePrisma.blogPost.rows[0].views).toBe(0);
    });

    it('counts a view per public read, and none for the admin read', async () => {
      const blog = await service.create(post({ status: 'published' }), testActor);

      expect((await service.getPublishedBySlug(blog.slug)).views).toBe(1);
      expect((await service.getPublishedBySlug(blog.slug.toUpperCase())).views).toBe(2);
      expect((await service.getPublishedById(blog.id)).views).toBe(3);

      expect((await service.getById(blog.id)).views).toBe(3);
      expect((await service.getById(blog.id)).views).toBe(3);
    });

    it('does not expose storage keys publicly', async () => {
      const blog = await service.create(
        post({ status: 'published', thumbnail: file('thumb.png'), images: [file('a.png')], author: { name: 'Sushil', avatar: file('me.png') } }),
        testActor
      );
      const view = await service.getPublishedBySlug(blog.slug);
      expect(view.thumbnail).toEqual({ url: 'https://cdn.example.test/assets/thumb.png' });
      expect(view.images).toEqual([{ url: 'https://cdn.example.test/assets/a.png' }]);
      expect(view.author).toEqual({ name: 'Sushil', avatar: { url: 'https://cdn.example.test/assets/me.png' } });
      expect(JSON.stringify(view)).not.toContain('"key"');
    });
  });

  it('lists every status for the admin, with a status filter', async () => {
    await service.create(post({ status: 'published' }), testActor);
    await service.create(post({ title: 'Draft one' }), testActor);

    expect(await service.list({ page: 1, limit: 10, search: '' })).toMatchObject({ total: 2, page: 1, limit: 10 });
    expect((await service.list({ page: 1, limit: 10, search: '', status: 'draft' })).blogs.map((b) => b.title)).toEqual(['Draft one']);
  });

  it('merges author and SEO fields instead of replacing them', async () => {
    const blog = await service.create(
      post({ author: { name: 'Sushil', avatar: file('me.png') }, seo: { metaTitle: 'T', metaDescription: 'D', keywords: ['a'] } }),
      testActor
    );
    const updated = await service.update(blog.id, updateBlogSchema.parse({ author: { name: 'Astro Sushil' }, seo: { keywords: ['b', 'c'] } }), testActor);
    expect(updated.author).toEqual({ name: 'Astro Sushil', avatar: { url: expect.any(String), key: 'assets/me.png' } });
    expect(updated.seo).toEqual({ metaTitle: 'T', metaDescription: 'D', keywords: ['b', 'c'] });
    expect(deleted).toEqual([]);
  });

  it('deletes replaced and removed files on update', async () => {
    const blog = await service.create(
      post({ thumbnail: file('thumb.png'), images: [file('a.png'), file('b.png')], author: { avatar: file('me.png') } }),
      testActor
    );

    await service.update(blog.id, updateBlogSchema.parse({ images: [file('b.png'), file('c.png')] }), testActor);
    expect(deleted).toEqual(['assets/a.png']);

    await service.update(blog.id, updateBlogSchema.parse({ thumbnail: file('thumb2.png'), author: { avatar: null } }), testActor);
    expect(deleted).toEqual(['assets/a.png', 'assets/thumb.png', 'assets/me.png']);
  });

  it('hard-deletes the post with all its files and audits it', async () => {
    const blog = await service.create(
      post({ thumbnail: file('thumb.png'), images: [file('a.png'), file('b.png')], author: { avatar: file('me.png') } }),
      testActor
    );
    await service.remove(blog.id, testActor);

    expect(fakePrisma.blogPost.rows).toHaveLength(0);
    expect(deleted.sort()).toEqual(['assets/a.png', 'assets/b.png', 'assets/me.png', 'assets/thumb.png']);
    expect(lastAudit()).toMatchObject({ action: 'BLOG_DELETE', resource: `BlogPost:${blog.id}`, adminId: 'admin-1' });
    await expect(service.getById(blog.id)).rejects.toBeInstanceOf(NotFoundError);
  });

  it('audits create and update without copying the article body into the log', async () => {
    const blog = await service.create(post({ content: '<p>A very secret draft body text.</p>' }), testActor);
    expect(lastAudit()).toMatchObject({ action: 'BLOG_CREATE', details: 'Created "sade-sati-explained" as draft' });

    await service.update(blog.id, updateBlogSchema.parse({ content: '<p>Another secret body text here.</p>', status: 'published' }), testActor);
    expect(lastAudit()).toMatchObject({ action: 'BLOG_UPDATE', details: 'Changed: content, status' });
    expect(JSON.stringify(logAction.mock.calls)).not.toContain('secret');
  });
});
