import { z } from 'zod';
import { CourseLevel, CourseLink, CourseLinkStatus, Prisma } from '@prisma/client';
import { prisma } from '../../services/prisma.service';
import { NotFoundError, ValidationError } from '../../errors/app-error';
import { AdminActor, audit, pageParams, slugify, uniqueSlug } from '../products/shop-http';
import { deleteUploadedObject, validateUploadedRef } from '../../services/storage/storage-refs';

/**
 * Course links (website `Course` module): a catalogue of courses that are sold and taught on an
 * outside platform. Each entry is a card with a redirect URL. Nothing is sold or taught here.
 *
 * This is separate from `courses.service.ts` (real enrolment with lessons, used by the mobile
 * app), which is untouched. A link may point at one of those courses through `courseId`.
 */

const httpUrl = z
  .string()
  .trim()
  .max(2048)
  .url()
  .refine((value) => /^https?:\/\//i.test(value), 'The redirect URL must start with http:// or https://');

const courseLinkFields = {
  title: z.string().trim().min(2).max(300),
  shortDescription: z.string().trim().max(5000).nullable().optional(),
  category: z.string().trim().max(200).nullable().optional(),
  tags: z.array(z.string().trim().min(1).max(100)).max(50).optional(),
  instructorName: z.string().trim().max(200).nullable().optional(),
  language: z.string().trim().max(100).nullable().optional(),
  level: z.nativeEnum(CourseLevel).nullable().optional(),
  pricePaise: z.number().int().min(0),
  originalPricePaise: z.number().int().min(0).nullable().optional(),
  currency: z.string().trim().toUpperCase().length(3).optional(),
  isFree: z.boolean().optional(),
  rating: z.number().min(0).max(5).optional(),
  totalReviews: z.number().int().min(0).optional(),
  totalLessons: z.number().int().min(0).nullable().optional(),
  totalDurationMinutes: z.number().int().min(0).nullable().optional(),
  thumbnail: z
    .object({ url: z.string().max(2048).nullable().optional(), key: z.string().max(1024).nullable().optional() })
    .nullable()
    .optional(),
  previewVideo: httpUrl.nullable().optional(),
  platformName: z.string().trim().max(200).nullable().optional(),
  redirectUrl: httpUrl,
  isFeatured: z.boolean().optional(),
  status: z.nativeEnum(CourseLinkStatus).optional(),
  metaTitle: z.string().trim().max(300).nullable().optional(),
  metaDescription: z.string().trim().max(1000).nullable().optional(),
  /** Optional tie to an in-app course (`courses.id`). */
  courseId: z.string().uuid().nullable().optional(),
};

export const createCourseLinkSchema = z.object(courseLinkFields);
export const updateCourseLinkSchema = z.object(courseLinkFields).partial();
export const listCourseLinksQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
  search: z.string().trim().max(200).optional(),
  status: z.nativeEnum(CourseLinkStatus).optional(),
  category: z.string().trim().max(200).optional(),
  featured: z.enum(['true', 'false']).transform((v) => v === 'true').optional(),
});

export type CreateCourseLinkInput = z.infer<typeof createCourseLinkSchema>;
export type UpdateCourseLinkInput = z.infer<typeof updateCourseLinkSchema>;

/** Whole-percent saving of `price` against `original`, or null when there is none. */
export function discountPercentage(pricePaise: number, originalPricePaise: number | null | undefined): number | null {
  if (!originalPricePaise || originalPricePaise <= pricePaise) return null;
  return Math.round(((originalPricePaise - pricePaise) / originalPricePaise) * 100);
}

export function toCourseLinkView(row: CourseLink, options: { admin: boolean }) {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    shortDescription: row.shortDescription,
    category: row.category,
    tags: row.tags,
    instructorName: row.instructorName,
    language: row.language,
    level: row.level,
    pricePaise: row.pricePaise,
    originalPricePaise: row.originalPricePaise,
    discountPercentage: row.discountPercentage,
    currency: row.currency,
    isFree: row.isFree,
    rating: row.rating,
    totalReviews: row.totalReviews,
    totalLessons: row.totalLessons,
    totalDurationMinutes: row.totalDurationMinutes,
    thumbnail: row.thumbnailUrl,
    previewVideo: row.previewVideo,
    platformName: row.platformName,
    redirectUrl: row.redirectUrl,
    isFeatured: row.isFeatured,
    status: row.status,
    metaTitle: row.metaTitle,
    metaDescription: row.metaDescription,
    courseId: row.courseId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    // The click count is a business figure: admins only.
    ...(options.admin ? { clickCount: row.clickCount, thumbnailKey: row.thumbnailKey, legacyId: row.legacyId } : {}),
  };
}

export class CourseLinksService {
  // --------------------------------------------------------------- public

  /** Active links, newest first (website `GET /courses`). */
  public async listPublic(query: z.infer<typeof listCourseLinksQuerySchema>) {
    const where: Prisma.CourseLinkWhereInput = { status: CourseLinkStatus.ACTIVE };
    if (query.search) where.title = { contains: query.search, mode: 'insensitive' };
    if (query.category) where.category = { equals: query.category, mode: 'insensitive' };
    if (query.featured !== undefined) where.isFeatured = query.featured;
    const rows = await prisma.courseLink.findMany({ where, orderBy: { createdAt: 'desc' }, take: 500 });
    return rows.map((row) => toCourseLinkView(row, { admin: false }));
  }

  /** One active link by id or slug. An inactive link is not found (the website's by-id route showed it). */
  public async getPublic(idOrSlug: string) {
    const row = await prisma.courseLink.findFirst({
      where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }], status: CourseLinkStatus.ACTIVE },
    });
    if (!row) throw new NotFoundError('Course not found');
    return toCourseLinkView(row, { admin: false });
  }

  /**
   * Counts a click and returns where to send the visitor. The website has a `clickCount` field but
   * never increments it; here every visit through the redirect endpoint adds one, atomically.
   */
  public async registerClick(idOrSlug: string): Promise<{ redirectUrl: string }> {
    const row = await prisma.courseLink.findFirst({
      where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }], status: CourseLinkStatus.ACTIVE },
      select: { id: true, redirectUrl: true },
    });
    if (!row) throw new NotFoundError('Course not found');
    await prisma.courseLink.update({ where: { id: row.id }, data: { clickCount: { increment: 1 } } });
    return { redirectUrl: row.redirectUrl };
  }

  // ---------------------------------------------------------------- admin

  public async list(query: z.infer<typeof listCourseLinksQuerySchema>) {
    const { page, limit, skip } = pageParams(query.page, query.limit, 200);
    const where: Prisma.CourseLinkWhereInput = {};
    if (query.search) where.title = { contains: query.search, mode: 'insensitive' };
    if (query.status) where.status = query.status;
    if (query.category) where.category = { equals: query.category, mode: 'insensitive' };
    if (query.featured !== undefined) where.isFeatured = query.featured;
    const [rows, total] = await Promise.all([
      prisma.courseLink.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }),
      prisma.courseLink.count({ where }),
    ]);
    return {
      courses: rows.map((row) => toCourseLinkView(row, { admin: true })),
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  public async get(id: string) {
    const row = await prisma.courseLink.findUnique({ where: { id } });
    if (!row) throw new NotFoundError('Course not found');
    return toCourseLinkView(row, { admin: true });
  }

  private async assertCourse(courseId: string | null | undefined): Promise<void> {
    if (!courseId) return;
    const course = await prisma.course.findUnique({ where: { id: courseId }, select: { id: true } });
    if (!course) throw new ValidationError('Linked course not found');
  }

  public async create(input: CreateCourseLinkInput, actor: AdminActor) {
    await this.assertCourse(input.courseId);
    const thumbnail = input.thumbnail
      ? validateUploadedRef(input.thumbnail, { visibility: 'public', purposes: ['course'], field: 'thumbnail' })
      : null;
    const slug = await uniqueSlug(slugify(input.title), async (candidate) =>
      Boolean(await prisma.courseLink.findUnique({ where: { slug: candidate }, select: { id: true } }))
    );
    const row = await prisma.courseLink.create({
      data: {
        title: input.title,
        slug,
        shortDescription: input.shortDescription ?? null,
        category: input.category ?? null,
        tags: input.tags ?? [],
        instructorName: input.instructorName ?? null,
        language: input.language ?? null,
        level: input.level ?? null,
        pricePaise: input.pricePaise,
        originalPricePaise: input.originalPricePaise ?? null,
        discountPercentage: discountPercentage(input.pricePaise, input.originalPricePaise),
        currency: input.currency ?? 'INR',
        isFree: input.isFree ?? input.pricePaise === 0,
        rating: input.rating ?? 0,
        totalReviews: input.totalReviews ?? 0,
        totalLessons: input.totalLessons ?? null,
        totalDurationMinutes: input.totalDurationMinutes ?? null,
        thumbnailUrl: thumbnail?.url ?? null,
        thumbnailKey: thumbnail?.key ?? null,
        previewVideo: input.previewVideo ?? null,
        platformName: input.platformName ?? null,
        redirectUrl: input.redirectUrl,
        isFeatured: input.isFeatured ?? false,
        status: input.status ?? CourseLinkStatus.ACTIVE,
        // Website defaults for the SEO fields.
        metaTitle: input.metaTitle || input.title,
        metaDescription: input.metaDescription || input.shortDescription || input.title,
        courseId: input.courseId ?? null,
      },
    });
    await audit(actor, 'COURSE_LINK_CREATED', `CourseLink:${row.id}`, `Created course link "${row.title}" (${row.slug})`);
    return toCourseLinkView(row, { admin: true });
  }

  public async update(id: string, input: UpdateCourseLinkInput, actor: AdminActor) {
    const existing = await prisma.courseLink.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('Course not found');
    if (input.courseId !== undefined) await this.assertCourse(input.courseId);

    const data: Prisma.CourseLinkUncheckedUpdateInput = {};
    if (input.title !== undefined && input.title !== existing.title) {
      data.title = input.title;
      // As on the website, a new title gives a new slug.
      data.slug = await uniqueSlug(slugify(input.title), async (candidate) => {
        const hit = await prisma.courseLink.findUnique({ where: { slug: candidate }, select: { id: true } });
        return Boolean(hit && hit.id !== id);
      });
    }
    const direct = [
      'shortDescription',
      'category',
      'tags',
      'instructorName',
      'language',
      'level',
      'currency',
      'isFree',
      'rating',
      'totalReviews',
      'totalLessons',
      'totalDurationMinutes',
      'previewVideo',
      'platformName',
      'redirectUrl',
      'isFeatured',
      'status',
      'metaTitle',
      'metaDescription',
      'courseId',
      'pricePaise',
      'originalPricePaise',
    ] as const;
    for (const key of direct) {
      if (input[key] !== undefined) (data as Record<string, unknown>)[key] = input[key];
    }
    if (input.pricePaise !== undefined || input.originalPricePaise !== undefined) {
      data.discountPercentage = discountPercentage(
        input.pricePaise ?? existing.pricePaise,
        input.originalPricePaise !== undefined ? input.originalPricePaise : existing.originalPricePaise
      );
    }
    let replacedThumbnail: string | null = null;
    if (input.thumbnail !== undefined) {
      const thumbnail = input.thumbnail
        ? validateUploadedRef(input.thumbnail, { visibility: 'public', purposes: ['course'], field: 'thumbnail' })
        : null;
      data.thumbnailUrl = thumbnail?.url ?? null;
      data.thumbnailKey = thumbnail?.key ?? null;
      const previous = existing.thumbnailKey ?? existing.thumbnailUrl;
      if (previous && existing.thumbnailKey !== thumbnail?.key) replacedThumbnail = previous;
    }

    const row = await prisma.courseLink.update({ where: { id }, data });
    if (replacedThumbnail) await deleteUploadedObject(replacedThumbnail);
    await audit(actor, 'COURSE_LINK_UPDATED', `CourseLink:${id}`, `Updated course link "${row.title}". Fields: ${Object.keys(input).join(', ') || 'none'}`);
    return toCourseLinkView(row, { admin: true });
  }

  public async remove(id: string, actor: AdminActor): Promise<{ deleted: true }> {
    const existing = await prisma.courseLink.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('Course not found');
    await prisma.courseLink.delete({ where: { id } });
    await deleteUploadedObject(existing.thumbnailKey ?? existing.thumbnailUrl);
    await audit(actor, 'COURSE_LINK_DELETED', `CourseLink:${id}`, `Deleted course link "${existing.title}" (${existing.slug})`);
    return { deleted: true };
  }
}

export const courseLinksService = new CourseLinksService();
