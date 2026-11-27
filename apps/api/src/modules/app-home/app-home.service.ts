import { blogsService } from '../content/blogs.service';
import { mediaService } from '../content/media.service';
import { onSettingsChanged, settingsService } from '../content/settings.service';
import { testimonialsService } from '../content/testimonials.service';

/**
 * The mobile app's home page content (owner decision 2026-11-27).
 *
 * Featured consultations, reports and products are returned as ids only: the app joins them with
 * the consultation, report and shop lists it already loads, so names, prices and GST are exactly
 * what checkout uses. The rest is public CMS content, trimmed to what a home card shows.
 */
export interface AppHomeView {
  featured: { consultationSkus: string[]; reportIds: string[]; productIds: string[] };
  show: { starVideos: boolean; youtube: boolean; testimonials: boolean; blogs: boolean };
  celebrityVideos: { id: string; title: string; personName: string | null; videoUrl: string; thumbnailUrl: string | null }[];
  youtubeVideos: { id: string; title: string; url: string; thumbnailUrl: string | null }[];
  testimonials: { id: string; name: string; rating: number | null; text: string; imageUrl: string | null }[];
  blogs: { id: string; slug: string; title: string; shortDescription: string; category: string; thumbnailUrl: string | null; publishedAt: string | null }[];
}

const CACHE_MS = 60_000;
const MAX_YOUTUBE = 10;
const MAX_TESTIMONIALS = 10;
const MAX_BLOGS = 6;

export class AppHomeService {
  private cache: { value: AppHomeView; expiresAt: number } | null = null;

  public clearCache(): void {
    this.cache = null;
  }

  public async get(): Promise<AppHomeView> {
    if (this.cache && this.cache.expiresAt > Date.now()) return this.cache.value;
    const value = await this.build();
    this.cache = { value, expiresAt: Date.now() + CACHE_MS };
    return value;
  }

  private async build(): Promise<AppHomeView> {
    const { appHome } = await settingsService.getSettings();
    const show = {
      starVideos: appHome.showStarVideos,
      youtube: appHome.showYoutube,
      testimonials: appHome.showTestimonials,
      blogs: appHome.showBlogs,
    };

    const [stars, podcasts, testimonials, blogs] = await Promise.all([
      show.starVideos ? mediaService.listPublic('celebrity') : Promise.resolve([]),
      show.youtube ? mediaService.listPublic('podcast') : Promise.resolve([]),
      show.testimonials ? testimonialsService.listPublic({ limit: MAX_TESTIMONIALS }).then((r) => r.items) : Promise.resolve([]),
      show.blogs ? blogsService.listPublished({ page: 1, limit: MAX_BLOGS, search: '' }).then((r) => r.blogs) : Promise.resolve([]),
    ]);

    return {
      featured: {
        consultationSkus: appHome.featuredConsultationSkus,
        reportIds: appHome.featuredReportIds,
        productIds: appHome.featuredProductIds,
      },
      show,
      celebrityVideos: stars
        .filter((m) => m.mediaUrl)
        .map((m) => ({ id: m.id, title: m.title, personName: m.personName || null, videoUrl: m.mediaUrl as string, thumbnailUrl: m.thumbnail })),
      youtubeVideos: podcasts
        .filter((m) => m.mediaUrl)
        .slice(0, MAX_YOUTUBE)
        .map((m) => ({ id: m.id, title: m.title, url: m.mediaUrl as string, thumbnailUrl: m.thumbnail })),
      testimonials: testimonials
        .filter((t) => t.type !== 'video' && t.message.trim())
        .map((t) => ({ id: t.id, name: t.name, rating: t.rating ?? null, text: t.message, imageUrl: t.image })),
      blogs: blogs.map((b) => ({
        id: b.id,
        slug: b.slug,
        title: b.title,
        shortDescription: b.shortDescription,
        category: b.category,
        thumbnailUrl: b.thumbnail?.url ?? null,
        publishedAt: (b.publishedAt ?? b.createdAt)?.toISOString() ?? null,
      })),
    };
  }
}

export const appHomeService = new AppHomeService();
onSettingsChanged(() => appHomeService.clearCache());
