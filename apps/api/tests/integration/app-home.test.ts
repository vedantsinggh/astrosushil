/**
 * GET /api/v1/app/home (2026-11-27): the mobile home page's featured ids, section switches and
 * CMS content in one public response. Runs against the test database.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { FastifyInstance } from 'fastify';
import '@fastify/jwt';
import { buildApp } from '../../src/app';
import { prisma } from '../../src/services/prisma.service';
import { SITE_SETTINGS_ID, settingsService } from '../../src/modules/content/settings.service';
import { adminService } from '../../src/modules/admin/admin.service';
import { appHomeService } from '../../src/modules/app-home/app-home.service';

const tag = `apphome${Date.now()}`;
let app: FastifyInstance;
let previousSettings: unknown = undefined;
const mediaIds: string[] = [];
const blogIds: string[] = [];
let testimonialId = '';

beforeAll(async () => {
  app = buildApp();
  await app.ready();
  const row = await prisma.siteSetting.findUnique({ where: { id: SITE_SETTINGS_ID } });
  previousSettings = row?.data;
  const data = { ...((row?.data as Record<string, unknown>) ?? {}), appHome: { featuredReportIds: ['KUNDLI'], showTestimonials: false } };
  await prisma.siteSetting.upsert({ where: { id: SITE_SETTINGS_ID }, update: { data }, create: { id: SITE_SETTINGS_ID, data } });

  const future = Date.now() + 365 * 24 * 3600 * 1000;
  mediaIds.push(
    (await prisma.mediaItem.create({ data: { title: `${tag} star`, section: 'celebrity', type: 'video', mediaUrl: 'https://cdn.test/star.mp4', thumbnailUrl: 'https://cdn.test/star.webp', personName: 'A Star', createdById: null } })).id,
    (await prisma.mediaItem.create({ data: { title: `${tag} yt`, section: 'podcast', type: 'video', mediaUrl: 'https://www.youtube.com/watch?v=_jmCNWLZT0s' } })).id,
    (await prisma.mediaItem.create({ data: { title: `${tag} hidden`, section: 'podcast', type: 'video', mediaUrl: 'https://www.youtube.com/watch?v=hidden00000', isActive: false } })).id,
  );
  testimonialId = (await prisma.testimonial.create({ data: { name: `${tag} client`, message: 'Very helpful.' } })).id;
  for (let i = 0; i < 7; i++) {
    blogIds.push(
      (await prisma.blogPost.create({
        data: { title: `${tag} post ${i}`, slug: `${tag}-post-${i}`, shortDescription: 'Short', content: '<p>Body</p>', category: 'Vedic', status: 'published', publishedAt: new Date(future + i * 1000), createdAt: new Date(future + i * 1000) },
      })).id,
    );
  }
  appHomeService.clearCache();
});

afterAll(async () => {
  await prisma.blogPost.deleteMany({ where: { id: { in: blogIds } } });
  await prisma.mediaItem.deleteMany({ where: { id: { in: mediaIds } } });
  await prisma.testimonial.deleteMany({ where: { id: testimonialId } });
  if (previousSettings === undefined) await prisma.siteSetting.deleteMany({ where: { id: SITE_SETTINGS_ID } });
  else await prisma.siteSetting.update({ where: { id: SITE_SETTINGS_ID }, data: { data: previousSettings as object } });
  appHomeService.clearCache();
  await app.close();
});

describe('GET /api/v1/app/home', () => {
  it('returns featured ids, switches and content without personal or staff fields', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/app/home' });
    expect(res.statusCode).toBe(200);
    const body = res.json().data;

    expect(body.featured).toEqual({ consultationSkus: [], reportIds: ['KUNDLI'], productIds: [] });
    expect(body.show).toEqual({ starVideos: true, youtube: true, testimonials: false, blogs: true });

    expect(body.testimonials).toEqual([]);
    expect(body.blogs).toHaveLength(6);
    expect(body.blogs.map((b: { title: string }) => b.title)).toEqual([6, 5, 4, 3, 2, 1].map((i) => `${tag} post ${i}`));
    expect(body.blogs[0]).toMatchObject({ slug: `${tag}-post-6`, category: 'Vedic', shortDescription: 'Short' });
    expect(body.blogs[0]).not.toHaveProperty('content');

    expect(body.celebrityVideos).toEqual(
      expect.arrayContaining([expect.objectContaining({ title: `${tag} star`, personName: 'A Star', videoUrl: 'https://cdn.test/star.mp4', thumbnailUrl: 'https://cdn.test/star.webp' })]),
    );
    const titles = body.youtubeVideos.map((v: { title: string }) => v.title);
    expect(titles).not.toContain(`${tag} hidden`);
    expect(body.youtubeVideos.length).toBeLessThanOrEqual(10);

    const json = res.body;
    for (const field of ['"email"', '"phone"', '"createdById"', '"updatedById"', '"mediaKey"']) expect(json).not.toContain(field);
  });

  it('a staff save shows at once (the 60 s cache is cleared)', async () => {
    await app.inject({ method: 'GET', url: '/api/v1/app/home' });
    const spy = vi.spyOn(adminService, 'logAction').mockResolvedValue(undefined as never);
    await settingsService.update({ appHome: { featuredProductIds: ['p-1', 'p-2'] } }, { id: 'staff-test', email: 'staff@test.com' });
    spy.mockRestore();
    const body = (await app.inject({ method: 'GET', url: '/api/v1/app/home' })).json().data;
    expect(body.featured.productIds).toEqual(['p-1', 'p-2']);
  });
});
