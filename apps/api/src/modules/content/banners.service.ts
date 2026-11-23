import { Banner, Prisma } from '@prisma/client';
import { prisma } from '../../services/prisma.service';
import { NotFoundError } from '../../errors/app-error';
import { AdminActor, auditContentAction, changedFields } from './content.audit';
import { BANNER_CACHE_TTL_MS, bannerCacheKey, ContentCache, contentCache } from './content.cache';
import { acceptFile, deleteStoredFiles, FileView, replacedKey, toFileView } from './content.ports';
import { AdminBannerQuery, BANNER_PAGES, BannerPage, CreateBannerInput, UpdateBannerInput } from './content.schemas';

export interface BannerButton {
  text: string;
  link: string;
}

export interface AdminBannerView {
  id: string;
  title: string | null;
  subtitle: string | null;
  description: string | null;
  image: FileView | null;
  type: string;
  buttons: BannerButton[];
  page: string;
  order: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PublicSliderView {
  id: string;
  title: string | null;
  subtitle: string | null;
  description: string | null;
  image: string | null;
  buttons: BannerButton[];
  order: number;
}

export interface PublicPageBannerView {
  id: string;
  title: string | null;
  subtitle: string | null;
  description: string | null;
  image: string | null;
}

export type PublicBannersView = { sliders: PublicSliderView[] } | { banner: PublicPageBannerView | null };

/** The website's `?page=` aliases for the public endpoint. */
const PUBLIC_PAGE_ALIASES: Record<string, BannerPage> = {
  home: 'Homepage',
  homepage: 'Homepage',
  about: 'About',
  contact: 'Contact',
  services: 'Services',
};

export function resolvePublicBannerPage(page: string): BannerPage | null {
  return PUBLIC_PAGE_ALIASES[page.trim().toLowerCase()] ?? null;
}

function readButtons(value: Prisma.JsonValue): BannerButton[] {
  if (!Array.isArray(value)) return [];
  const buttons: BannerButton[] = [];
  for (const item of value) {
    if (item && typeof item === 'object' && !Array.isArray(item)) {
      const { text, link } = item as Record<string, unknown>;
      if (typeof text === 'string' && typeof link === 'string') buttons.push({ text, link });
    }
  }
  return buttons;
}

function toAdminView(banner: Banner): AdminBannerView {
  return {
    id: banner.id,
    title: banner.title,
    subtitle: banner.subtitle,
    description: banner.description,
    image: toFileView(banner.imageUrl, banner.imageKey),
    type: banner.type,
    buttons: readButtons(banner.buttons),
    page: banner.page,
    order: banner.order,
    isActive: banner.isActive,
    createdAt: banner.createdAt,
    updatedAt: banner.updatedAt,
  };
}

export class BannersService {
  constructor(private readonly cache: ContentCache = contentCache) {}

  // -------------------------------------------------------------------------
  // Public
  // -------------------------------------------------------------------------

  /**
   * Active banners of one page, as the website's `GET /banners/frontend`: the home page gets its
   * sliders in display order, every other page gets its single page banner (or null).
   * Cached per page for 24 hours and invalidated by every banner write.
   */
  public async getPublicBanners(pageParam: string): Promise<PublicBannersView> {
    const page = resolvePublicBannerPage(pageParam);
    // An unknown page has no banner. It is answered without a query or a cache entry, so
    // arbitrary `?page=` values cannot fill the cache.
    if (!page) return { banner: null };

    const key = bannerCacheKey(page);
    const cached = await this.cache.get<PublicBannersView>(key);
    if (cached) return cached;

    let result: PublicBannersView;
    if (page === 'Homepage') {
      const sliders = await prisma.banner.findMany({
        where: { page: 'Homepage', type: 'Slider', isActive: true },
        orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
      });
      result = {
        sliders: sliders.map((banner) => ({
          id: banner.id,
          title: banner.title,
          subtitle: banner.subtitle,
          description: banner.description,
          image: banner.imageUrl,
          buttons: readButtons(banner.buttons),
          order: banner.order,
        })),
      };
    } else {
      const banner = await prisma.banner.findFirst({
        where: { page, type: 'Page', isActive: true },
        orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
      });
      result = {
        banner: banner
          ? {
              id: banner.id,
              title: banner.title,
              subtitle: banner.subtitle,
              description: banner.description,
              image: banner.imageUrl,
            }
          : null,
      };
    }

    await this.cache.set(key, result, BANNER_CACHE_TTL_MS);
    return result;
  }

  // -------------------------------------------------------------------------
  // Admin
  // -------------------------------------------------------------------------

  public async list(query: AdminBannerQuery): Promise<AdminBannerView[]> {
    const where: Prisma.BannerWhereInput = {};
    if (query.page) where.page = query.page;
    if (query.type) where.type = query.type;
    if (query.isActive !== undefined) where.isActive = query.isActive;

    const banners = await prisma.banner.findMany({ where, orderBy: [{ order: 'asc' }, { createdAt: 'desc' }] });
    return banners.map(toAdminView);
  }

  public async getById(id: string): Promise<AdminBannerView> {
    return toAdminView(await this.requireBanner(id));
  }

  public async create(input: CreateBannerInput, actor: AdminActor): Promise<AdminBannerView> {
    const image = acceptFile(input.image, 'banner', 'image');
    const banner = await prisma.banner.create({
      data: {
        title: input.title ?? null,
        subtitle: input.subtitle ?? null,
        description: input.description ?? null,
        type: input.type,
        buttons: input.buttons,
        page: input.page,
        order: input.order,
        isActive: input.isActive,
        imageUrl: image?.url ?? null,
        imageKey: image?.key ?? null,
      },
    });

    await this.invalidate();
    await auditContentAction(actor, 'BANNER_CREATE', `Banner:${banner.id}`, `${banner.type} banner on ${banner.page}`);
    return toAdminView(banner);
  }

  public async update(id: string, input: UpdateBannerInput, actor: AdminActor): Promise<AdminBannerView> {
    const existing = await this.requireBanner(id);
    const image = acceptFile(input.image, 'banner', 'image');

    const data: Prisma.BannerUpdateInput = {};
    if (input.title !== undefined) data.title = input.title;
    if (input.subtitle !== undefined) data.subtitle = input.subtitle;
    if (input.description !== undefined) data.description = input.description;
    if (input.type !== undefined) data.type = input.type;
    if (input.buttons !== undefined) data.buttons = input.buttons;
    if (input.page !== undefined) data.page = input.page;
    if (input.order !== undefined) data.order = input.order;
    if (input.isActive !== undefined) data.isActive = input.isActive;
    if (image !== undefined) {
      data.imageUrl = image?.url ?? null;
      data.imageKey = image?.key ?? null;
    }

    const banner = await prisma.banner.update({ where: { id }, data });

    await this.invalidate();
    if (image !== undefined) await deleteStoredFiles([replacedKey(existing.imageKey, banner.imageKey)]);
    await auditContentAction(actor, 'BANNER_UPDATE', `Banner:${id}`, changedFields(input));
    return toAdminView(banner);
  }

  public async toggle(id: string, actor: AdminActor): Promise<AdminBannerView> {
    const existing = await this.requireBanner(id);
    const banner = await prisma.banner.update({ where: { id }, data: { isActive: !existing.isActive } });

    await this.invalidate();
    await auditContentAction(actor, 'BANNER_TOGGLE', `Banner:${id}`, banner.isActive ? 'Activated' : 'Deactivated');
    return toAdminView(banner);
  }

  public async remove(id: string, actor: AdminActor): Promise<void> {
    const existing = await this.requireBanner(id);
    await prisma.banner.delete({ where: { id } });

    await this.invalidate();
    await deleteStoredFiles([existing.imageKey]);
    await auditContentAction(actor, 'BANNER_DELETE', `Banner:${id}`, `${existing.type} banner on ${existing.page}`);
  }

  private async requireBanner(id: string): Promise<Banner> {
    const banner = await prisma.banner.findUnique({ where: { id } });
    if (!banner) throw new NotFoundError('Banner not found');
    return banner;
  }

  /** Every banner write may move a banner between pages, so all page keys are dropped. */
  private async invalidate(): Promise<void> {
    await this.cache.del(...BANNER_PAGES.map(bannerCacheKey));
  }
}

export const bannersService = new BannersService();
