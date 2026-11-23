import { Prisma, SeoPage } from '@prisma/client';
import { prisma } from '../../services/prisma.service';
import { ConflictError, NotFoundError } from '../../errors/app-error';
import { AdminActor, auditContentAction, changedFields } from './content.audit';
import { ContentCache, contentCache, SEO_CACHE_TTL_MS, seoCacheKey } from './content.cache';
import { acceptFile, deleteStoredFiles, FileView, replacedKey, toFileView } from './content.ports';
import { CreateSeoInput, UpdateSeoInput } from './content.schemas';

export interface PublicSeoView {
  name: string;
  metaTitle: string;
  metaDescription: string;
  image: { url: string } | null;
}

export interface AdminSeoView {
  id: string;
  name: string;
  metaTitle: string;
  metaDescription: string;
  image: FileView | null;
  createdAt: Date;
  updatedAt: Date;
}

function toPublicView(seo: SeoPage): PublicSeoView {
  return {
    name: seo.name,
    metaTitle: seo.metaTitle,
    metaDescription: seo.metaDescription,
    image: seo.imageUrl ? { url: seo.imageUrl } : null,
  };
}

function toAdminView(seo: SeoPage): AdminSeoView {
  return {
    id: seo.id,
    name: seo.name,
    metaTitle: seo.metaTitle,
    metaDescription: seo.metaDescription,
    image: toFileView(seo.imageUrl, seo.imageKey),
    createdAt: seo.createdAt,
    updatedAt: seo.updatedAt,
  };
}

function isUniqueViolation(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002';
}

const DUPLICATE_MESSAGE = 'SEO for this page already exists';

export class SeoService {
  constructor(private readonly cache: ContentCache = contentCache) {}

  /**
   * Meta tags of one page by its (lower-case) name. Cached for 10 minutes and invalidated by every
   * SEO write. Only pages that exist are cached, so unknown names cannot fill the cache.
   */
  public async getPublicByName(name: string): Promise<PublicSeoView> {
    const key = seoCacheKey(name);
    const cached = await this.cache.get<PublicSeoView>(key);
    if (cached) return cached;

    const seo = await prisma.seoPage.findUnique({ where: { name } });
    if (!seo) throw new NotFoundError('SEO not found');

    const view = toPublicView(seo);
    await this.cache.set(key, view, SEO_CACHE_TTL_MS);
    return view;
  }

  public async list(): Promise<AdminSeoView[]> {
    const seos = await prisma.seoPage.findMany({ orderBy: { createdAt: 'desc' } });
    return seos.map(toAdminView);
  }

  public async getById(id: string): Promise<AdminSeoView> {
    return toAdminView(await this.requireSeo(id));
  }

  public async create(input: CreateSeoInput, actor: AdminActor): Promise<AdminSeoView> {
    const exists = await prisma.seoPage.findUnique({ where: { name: input.name }, select: { id: true } });
    if (exists) throw new ConflictError(DUPLICATE_MESSAGE);
    const image = acceptFile(input.image, 'seo', 'image');

    let seo: SeoPage;
    try {
      seo = await prisma.seoPage.create({
        data: {
          name: input.name,
          metaTitle: input.metaTitle,
          metaDescription: input.metaDescription,
          imageUrl: image?.url ?? null,
          imageKey: image?.key ?? null,
        },
      });
    } catch (err) {
      if (isUniqueViolation(err)) throw new ConflictError(DUPLICATE_MESSAGE);
      throw err;
    }

    await this.cache.del(seoCacheKey(seo.name));
    await auditContentAction(actor, 'SEO_CREATE', `SeoPage:${seo.id}`, `SEO for page "${seo.name}"`);
    return toAdminView(seo);
  }

  public async update(id: string, input: UpdateSeoInput, actor: AdminActor): Promise<AdminSeoView> {
    const existing = await this.requireSeo(id);
    const image = acceptFile(input.image, 'seo', 'image');

    const data: Prisma.SeoPageUpdateInput = {};
    if (input.name !== undefined && input.name !== existing.name) {
      const taken = await prisma.seoPage.findUnique({ where: { name: input.name }, select: { id: true } });
      if (taken) throw new ConflictError(DUPLICATE_MESSAGE);
      data.name = input.name;
    }
    if (input.metaTitle !== undefined) data.metaTitle = input.metaTitle;
    if (input.metaDescription !== undefined) data.metaDescription = input.metaDescription;
    if (image !== undefined) {
      data.imageUrl = image?.url ?? null;
      data.imageKey = image?.key ?? null;
    }

    let seo: SeoPage;
    try {
      seo = await prisma.seoPage.update({ where: { id }, data });
    } catch (err) {
      if (isUniqueViolation(err)) throw new ConflictError(DUPLICATE_MESSAGE);
      throw err;
    }

    // Both names: a rename must drop the entry cached under the old name too.
    await this.cache.del(seoCacheKey(existing.name), seoCacheKey(seo.name));
    if (image !== undefined) await deleteStoredFiles([replacedKey(existing.imageKey, seo.imageKey)]);
    await auditContentAction(actor, 'SEO_UPDATE', `SeoPage:${id}`, changedFields(input));
    return toAdminView(seo);
  }

  public async remove(id: string, actor: AdminActor): Promise<void> {
    const existing = await this.requireSeo(id);
    await prisma.seoPage.delete({ where: { id } });

    await this.cache.del(seoCacheKey(existing.name));
    await deleteStoredFiles([existing.imageKey]);
    await auditContentAction(actor, 'SEO_DELETE', `SeoPage:${id}`, `SEO for page "${existing.name}"`);
  }

  private async requireSeo(id: string): Promise<SeoPage> {
    const seo = await prisma.seoPage.findUnique({ where: { id } });
    if (!seo) throw new NotFoundError('SEO not found');
    return seo;
  }
}

export const seoService = new SeoService();
