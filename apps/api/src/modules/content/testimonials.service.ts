import { Prisma, Testimonial } from '@prisma/client';
import { prisma } from '../../services/prisma.service';
import { NotFoundError } from '../../errors/app-error';
import { AdminActor, auditContentAction, changedFields } from './content.audit';
import { acceptFile, deleteStoredFiles, FileView, replacedKey, toFileView } from './content.ports';
import {
  AdminTestimonialQuery,
  CreateTestimonialInput,
  PublicTestimonialQuery,
  UpdateTestimonialInput,
} from './content.schemas';

interface TestimonialBase {
  id: string;
  name: string;
  designation: string | null;
  message: string;
  rating: number;
  serviceName: string | null;
  tagline: string | null;
  type: string;
  videoUrl: string | null;
  page: string;
  order: number;
  createdAt: Date;
}

/** Public shape: `image` is the image URL, as on the website. */
export interface PublicTestimonialView extends TestimonialBase {
  image: string | null;
}

export interface AdminTestimonialView extends TestimonialBase {
  image: FileView | null;
  isActive: boolean;
  updatedAt: Date;
}

const DISPLAY_ORDER: Prisma.TestimonialOrderByWithRelationInput[] = [{ order: 'asc' }, { createdAt: 'desc' }];

function base(item: Testimonial): TestimonialBase {
  return {
    id: item.id,
    name: item.name,
    designation: item.designation,
    message: item.message,
    rating: item.rating,
    serviceName: item.serviceName,
    tagline: item.tagline,
    type: item.type,
    videoUrl: item.videoUrl,
    page: item.page,
    order: item.order,
    createdAt: item.createdAt,
  };
}

function toPublicView(item: Testimonial): PublicTestimonialView {
  return { ...base(item), image: item.imageUrl };
}

function toAdminView(item: Testimonial): AdminTestimonialView {
  return {
    ...base(item),
    image: toFileView(item.imageUrl, item.imageKey),
    isActive: item.isActive,
    updatedAt: item.updatedAt,
  };
}

function filterWhere(query: { page?: string; serviceName?: string; rating?: number }): Prisma.TestimonialWhereInput {
  const where: Prisma.TestimonialWhereInput = {};
  if (query.page) where.page = query.page;
  if (query.serviceName) where.serviceName = query.serviceName;
  if (query.rating !== undefined) where.rating = { gte: query.rating };
  return where;
}

export class TestimonialsService {
  // -------------------------------------------------------------------------
  // Public: active testimonials only
  // -------------------------------------------------------------------------

  public async listPublic(query: PublicTestimonialQuery): Promise<{ items: PublicTestimonialView[]; total: number }> {
    const where: Prisma.TestimonialWhereInput = { ...filterWhere(query), isActive: true };
    const [items, total] = await Promise.all([
      prisma.testimonial.findMany({ where, orderBy: DISPLAY_ORDER, take: query.limit }),
      prisma.testimonial.count({ where }),
    ]);
    return { items: items.map(toPublicView), total };
  }

  public async getPublicById(id: string): Promise<PublicTestimonialView> {
    const item = await prisma.testimonial.findFirst({ where: { id, isActive: true } });
    if (!item) throw new NotFoundError('Testimonial not found');
    return toPublicView(item);
  }

  // -------------------------------------------------------------------------
  // Admin
  // -------------------------------------------------------------------------

  public async list(query: AdminTestimonialQuery): Promise<{ items: AdminTestimonialView[]; total: number }> {
    const where = filterWhere(query);
    if (query.type) where.type = query.type;
    if (query.isActive !== undefined) where.isActive = query.isActive;
    const [items, total] = await Promise.all([
      prisma.testimonial.findMany({ where, orderBy: DISPLAY_ORDER, skip: query.offset, take: query.limit }),
      prisma.testimonial.count({ where }),
    ]);
    return { items: items.map(toAdminView), total };
  }

  public async getById(id: string): Promise<AdminTestimonialView> {
    return toAdminView(await this.requireTestimonial(id));
  }

  public async create(input: CreateTestimonialInput, actor: AdminActor): Promise<AdminTestimonialView> {
    const image = acceptFile(input.image, 'testimonial', 'image');
    const item = await prisma.testimonial.create({
      data: {
        name: input.name,
        designation: input.designation ?? null,
        message: input.message,
        rating: input.rating,
        serviceName: input.serviceName ?? null,
        tagline: input.tagline ?? null,
        type: input.type,
        videoUrl: input.videoUrl ?? null,
        page: input.page,
        order: input.order,
        isActive: input.isActive,
        imageUrl: image?.url ?? null,
        imageKey: image?.key ?? null,
      },
    });
    await auditContentAction(actor, 'TESTIMONIAL_CREATE', `Testimonial:${item.id}`, `${item.type} testimonial on page "${item.page}"`);
    return toAdminView(item);
  }

  public async update(id: string, input: UpdateTestimonialInput, actor: AdminActor): Promise<AdminTestimonialView> {
    const existing = await this.requireTestimonial(id);
    const image = acceptFile(input.image, 'testimonial', 'image');

    const data: Prisma.TestimonialUpdateInput = {};
    if (input.name !== undefined) data.name = input.name;
    if (input.designation !== undefined) data.designation = input.designation;
    if (input.message !== undefined) data.message = input.message;
    if (input.rating !== undefined) data.rating = input.rating;
    if (input.serviceName !== undefined) data.serviceName = input.serviceName;
    if (input.tagline !== undefined) data.tagline = input.tagline;
    if (input.type !== undefined) data.type = input.type;
    if (input.videoUrl !== undefined) data.videoUrl = input.videoUrl;
    if (input.page !== undefined) data.page = input.page;
    if (input.order !== undefined) data.order = input.order;
    if (input.isActive !== undefined) data.isActive = input.isActive;
    if (image !== undefined) {
      data.imageUrl = image?.url ?? null;
      data.imageKey = image?.key ?? null;
    }

    const item = await prisma.testimonial.update({ where: { id }, data });
    if (image !== undefined) await deleteStoredFiles([replacedKey(existing.imageKey, item.imageKey)]);
    await auditContentAction(actor, 'TESTIMONIAL_UPDATE', `Testimonial:${id}`, changedFields(input));
    return toAdminView(item);
  }

  public async toggle(id: string, actor: AdminActor): Promise<AdminTestimonialView> {
    const existing = await this.requireTestimonial(id);
    const item = await prisma.testimonial.update({ where: { id }, data: { isActive: !existing.isActive } });
    await auditContentAction(actor, 'TESTIMONIAL_TOGGLE', `Testimonial:${id}`, item.isActive ? 'Activated' : 'Deactivated');
    return toAdminView(item);
  }

  public async remove(id: string, actor: AdminActor): Promise<void> {
    const existing = await this.requireTestimonial(id);
    await prisma.testimonial.delete({ where: { id } });
    await deleteStoredFiles([existing.imageKey]);
    await auditContentAction(actor, 'TESTIMONIAL_DELETE', `Testimonial:${id}`, `${existing.type} testimonial on page "${existing.page}"`);
  }

  private async requireTestimonial(id: string): Promise<Testimonial> {
    const item = await prisma.testimonial.findUnique({ where: { id } });
    if (!item) throw new NotFoundError('Testimonial not found');
    return item;
  }
}

export const testimonialsService = new TestimonialsService();
