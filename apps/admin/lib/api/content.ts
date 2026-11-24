/**
 * Admin API of the website CMS (apps/api/src/modules/content): banners, blogs, FAQs, testimonials,
 * media, contact inquiries, SEO and site settings. See docs/integration/modules/content.md.
 *
 * Every response is the envelope `{ statusCode, success, message, data }`; these functions return
 * `data`. Errors are thrown by `apiFetch`; show them with `apiErrorMessage` (lib/api/uploads).
 */
import { apiFetch } from '../api-client';

export { apiErrorMessage } from './uploads';

const BASE = '/api/v1/admin';

interface Envelope<T> {
  statusCode: number;
  success: boolean;
  message: string;
  data: T;
}

type QueryValue = string | number | boolean | undefined | null;

function withQuery(path: string, query?: Record<string, QueryValue>): string {
  if (!query) return path;
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    params.set(key, String(value));
  });
  const text = params.toString();
  return text ? `${path}?${text}` : path;
}

async function get<T>(path: string, query?: Record<string, QueryValue>): Promise<T> {
  const res = await apiFetch<Envelope<T>>(withQuery(`${BASE}${path}`, query));
  return res.data;
}

async function send<T>(method: 'POST' | 'PUT' | 'PATCH' | 'DELETE', path: string, body?: unknown): Promise<T> {
  // `apiFetch` always declares JSON, and Fastify rejects an empty JSON body on POST / PUT / PATCH,
  // so a call without a payload (the toggles) sends `{}`. DELETE carries no body at all.
  const payload = body !== undefined ? JSON.stringify(body) : method === 'DELETE' ? undefined : '{}';
  const res = await apiFetch<Envelope<T>>(`${BASE}${path}`, {
    method,
    body: payload,
  });
  return res.data;
}

/** A file uploaded through POST /admin/uploads, as the content endpoints return and accept it. */
export interface StoredFile {
  url: string;
  key: string | null;
}

/** undefined = leave as is, null = remove the file, object = set or replace it. */
export type FileSlot = StoredFile | null | undefined;

/** Converts the value of an UploadField into what the content endpoints accept. */
export function toFileSlot(value: { url: string | null; key?: string | null } | null | undefined): StoredFile | null {
  if (!value || !value.url) return null;
  return { url: value.url, key: value.key || null };
}

/**
 * The value to send for a file slot of a form: undefined (JSON drops it, so the server leaves the
 * file as it is) when the file was not touched, null to remove it, or the pair to set / replace it.
 * An untouched file is never re-sent, so a record migrated from the website keeps whatever it holds.
 */
export function changedFileSlot(
  current: { url: string | null; key?: string | null } | null | undefined,
  initial: { url: string | null; key?: string | null } | null | undefined
): FileSlot {
  const sameUrl = (current?.url || null) === (initial?.url || null);
  const sameKey = (current?.key || null) === (initial?.key || null);
  if (sameUrl && sameKey) return undefined;
  return toFileSlot(current);
}

// ---------------------------------------------------------------------------
// Banners
// ---------------------------------------------------------------------------

export const BANNER_TYPES = ['Slider', 'Page'] as const;
export const BANNER_PAGES = ['Homepage', 'About', 'Contact', 'Services'] as const;
export type BannerType = (typeof BANNER_TYPES)[number];
export type BannerPage = (typeof BANNER_PAGES)[number];

export interface BannerButton {
  text: string;
  link: string;
}

export interface Banner {
  id: string;
  title: string | null;
  subtitle: string | null;
  description: string | null;
  image: StoredFile | null;
  type: string;
  buttons: BannerButton[];
  page: string;
  order: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BannerInput {
  type: BannerType;
  page: BannerPage;
  title: string | null;
  subtitle: string | null;
  description: string | null;
  buttons: BannerButton[];
  order: number;
  isActive: boolean;
  image?: FileSlot;
}

export const bannersApi = {
  list: (query: { page?: string; type?: string; isActive?: string } = {}) => get<Banner[]>('/banners', query),
  get: (id: string) => get<Banner>(`/banners/${id}`),
  create: (input: BannerInput) => send<Banner>('POST', '/banners', input),
  update: (id: string, input: Partial<BannerInput>) => send<Banner>('PUT', `/banners/${id}`, input),
  toggle: (id: string) => send<Banner>('PATCH', `/banners/${id}/toggle`),
  remove: (id: string) => send<null>('DELETE', `/banners/${id}`),
};

// ---------------------------------------------------------------------------
// Blogs
// ---------------------------------------------------------------------------

export const BLOG_STATUSES = ['draft', 'published'] as const;
export type BlogStatus = (typeof BLOG_STATUSES)[number];

export interface Blog {
  id: string;
  title: string;
  slug: string;
  shortDescription: string;
  content: string;
  category: string;
  tags: string[];
  author: { name: string | null; avatar: StoredFile | null };
  thumbnail: StoredFile | null;
  images: StoredFile[];
  seo: { metaTitle: string | null; metaDescription: string | null; keywords: string[] };
  status: string;
  isFeatured: boolean;
  views: number;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BlogInput {
  title: string;
  /** Omit on create to have it generated from the title. */
  slug?: string;
  shortDescription: string;
  content: string;
  category: string;
  tags: string[];
  author: { name: string | null; avatar?: FileSlot };
  seo: { metaTitle: string | null; metaDescription: string | null; keywords: string[] };
  status: BlogStatus;
  isFeatured: boolean;
  /** ISO date-time, or null to clear. */
  publishedAt?: string | null;
  thumbnail?: FileSlot;
  images: StoredFile[];
}

export interface BlogList {
  blogs: Blog[];
  total: number;
  page: number;
  limit: number;
}

export const blogsApi = {
  list: (query: { page?: number; limit?: number; search?: string; status?: string; category?: string; tag?: string; isFeatured?: string }) =>
    get<BlogList>('/blogs', query),
  get: (id: string) => get<Blog>(`/blogs/${id}`),
  create: (input: BlogInput) => send<Blog>('POST', '/blogs', input),
  update: (id: string, input: Partial<BlogInput>) => send<Blog>('PUT', `/blogs/${id}`, input),
  remove: (id: string) => send<null>('DELETE', `/blogs/${id}`),
};

// ---------------------------------------------------------------------------
// FAQs
// ---------------------------------------------------------------------------

export interface Faq {
  id: string;
  question: string;
  answer: string;
  page: string;
  order: number;
  isActive: boolean;
  createdById: string | null;
  updatedById: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FaqInput {
  question: string;
  answer: string;
  page: string;
  isActive: boolean;
  order: number;
}

export const faqsApi = {
  list: (query: { page?: string; isActive?: string } = {}) => get<Faq[]>('/faqs', query),
  get: (id: string) => get<Faq>(`/faqs/${id}`),
  create: (input: FaqInput) => send<Faq>('POST', '/faqs', input),
  update: (id: string, input: Partial<FaqInput>) => send<Faq>('PUT', `/faqs/${id}`, input),
  remove: (id: string) => send<null>('DELETE', `/faqs/${id}`),
};

// ---------------------------------------------------------------------------
// Testimonials
// ---------------------------------------------------------------------------

export const TESTIMONIAL_TYPES = ['text', 'video'] as const;
export type TestimonialType = (typeof TESTIMONIAL_TYPES)[number];

export interface Testimonial {
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
  image: StoredFile | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TestimonialInput {
  name: string;
  designation: string | null;
  message: string;
  rating: number;
  serviceName: string | null;
  tagline: string | null;
  type: TestimonialType;
  videoUrl: string | null;
  page: string;
  order: number;
  isActive: boolean;
  image?: FileSlot;
}

export const testimonialsApi = {
  list: (query: { page?: string; serviceName?: string; rating?: string; type?: string; isActive?: string; limit?: number; offset?: number }) =>
    get<{ items: Testimonial[]; total: number }>('/testimonials', query),
  get: (id: string) => get<Testimonial>(`/testimonials/${id}`),
  create: (input: TestimonialInput) => send<Testimonial>('POST', '/testimonials', input),
  update: (id: string, input: Partial<TestimonialInput>) => send<Testimonial>('PUT', `/testimonials/${id}`, input),
  toggle: (id: string) => send<Testimonial>('PATCH', `/testimonials/${id}/toggle`),
  remove: (id: string) => send<null>('DELETE', `/testimonials/${id}`),
};

// ---------------------------------------------------------------------------
// Media (podcast / celebrity / wishes)
// ---------------------------------------------------------------------------

export const MEDIA_SECTIONS = ['podcast', 'celebrity', 'wishes'] as const;
export type MediaSection = (typeof MEDIA_SECTIONS)[number];

export interface MediaItem {
  id: string;
  title: string;
  description: string;
  section: string;
  type: string;
  /** podcast: the YouTube link. celebrity: the uploaded video's URL. wishes: null. */
  mediaUrl: string | null;
  /** The uploaded video of a celebrity item; null otherwise. */
  media: StoredFile | null;
  /** podcast and celebrity: the thumbnail. wishes: the image itself. */
  thumbnail: StoredFile | null;
  tag: string;
  personName: string;
  background: string;
  order: number;
  isActive: boolean;
  createdById: string | null;
  updatedById: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MediaInput {
  title: string;
  description: string;
  section: MediaSection;
  mediaUrl?: string | null;
  media?: FileSlot;
  thumbnail?: FileSlot;
  tag: string;
  personName: string;
  background: string;
  isActive: boolean;
  order: number;
}

export const mediaApi = {
  list: (query: { section?: string; isActive?: string } = {}) => get<MediaItem[]>('/media', query),
  get: (id: string) => get<MediaItem>(`/media/${id}`),
  create: (input: MediaInput) => send<MediaItem>('POST', '/media', input),
  update: (id: string, input: Partial<MediaInput>) => send<MediaItem>('PUT', `/media/${id}`, input),
  toggle: (id: string) => send<MediaItem>('PATCH', `/media/${id}/toggle`),
  remove: (id: string) => send<null>('DELETE', `/media/${id}`),
};

// ---------------------------------------------------------------------------
// Contact inquiries
// ---------------------------------------------------------------------------

export interface Inquiry {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  subject: string | null;
  message: string;
  remarks: string;
  createdAt: string;
  updatedAt: string;
}

export interface InquiryList {
  contacts: Inquiry[];
  total: number;
  page: number;
  pages: number;
}

export const inquiriesApi = {
  /** `fromDate` / `toDate` are IST calendar dates (YYYY-MM-DD), both inclusive. */
  list: (query: { page?: number; limit?: number; search?: string; fromDate?: string; toDate?: string }) =>
    get<InquiryList>('/inquiries', query),
  get: (id: string) => get<Inquiry>(`/inquiries/${id}`),
  updateRemarks: (id: string, remarks: string) => send<Inquiry>('PATCH', `/inquiries/${id}/remarks`, { remarks }),
  remove: (id: string) => send<null>('DELETE', `/inquiries/${id}`),
};

// ---------------------------------------------------------------------------
// SEO
// ---------------------------------------------------------------------------

export interface SeoPage {
  id: string;
  name: string;
  metaTitle: string;
  metaDescription: string;
  image: StoredFile | null;
  createdAt: string;
  updatedAt: string;
}

export interface SeoInput {
  name: string;
  metaTitle: string;
  metaDescription: string;
  image?: FileSlot;
}

export const seoApi = {
  list: () => get<SeoPage[]>('/seo'),
  get: (id: string) => get<SeoPage>(`/seo/${id}`),
  create: (input: SeoInput) => send<SeoPage>('POST', '/seo', input),
  update: (id: string, input: Partial<SeoInput>) => send<SeoPage>('PUT', `/seo/${id}`, input),
  remove: (id: string) => send<null>('DELETE', `/seo/${id}`),
};

// ---------------------------------------------------------------------------
// Site settings
// ---------------------------------------------------------------------------
//
// Exactly the sections and fields of SETTINGS_SHAPE in content.schemas.ts. The update schema is
// strict: an unknown section or field is a 400. Credentials (payment gateway, SMTP, SMS) are not
// part of this document; they live in the server configuration.

export interface AnnouncementBar {
  enabled: boolean;
  text: string;
  bgColor: string;
  textColor: string;
  linkEnabled: boolean;
  linkUrl: string;
}

export interface SiteSettings {
  branding: { siteName: string; logoUrl: string; logoKey: string; faviconUrl: string; faviconKey: string };
  contact: { email: string; phone: string; whatsapp: string; address: string };
  socialLinks: { facebook: string; instagram: string; twitter: string; youtube: string; linkedin: string };
  business: { companyName: string; gstNumber: string; panNumber: string };
  payment: { currency: string; taxPercent: number; codEnabled: boolean };
  shipping: {
    freeShippingThresholdPaise: number;
    baseDeliveryChargePaise: number;
    deliveryChargePerKmPaise: number;
    maxCodLimitPaise: number;
    supportedAreas: string[];
  };
  product: { lowStockWarning: number; maxQuantityInCart: number };
  offers: { referralRewardPercent: number; enableCoupons: boolean; flashSaleEnabled: boolean };
  order: { autoCancelUnpaidMinutes: number; returnPolicyDays: number; maxOrderValuePaise: number };
  communication: { enableOrderEmails: boolean; enableOrderSMS: boolean; enablePushNotifications: boolean };
  otp: { expiryMinutes: number; resendTimeoutSec: number };
  system: { maintenanceMode: boolean };
  topBar: AnnouncementBar;
  highlightsBar: AnnouncementBar;
  legal: {
    privacyPolicy: string;
    termsConditions: string;
    returnPolicyText: string;
    cancellationRefundPolicy: string;
    shippingDeliveryPolicy: string;
  };
}

export type SettingsSection = keyof SiteSettings;

export interface AdminSiteSettings extends SiteSettings {
  updatedById: string | null;
  updatedAt: string | null;
}

export type SiteSettingsPatch = { [S in SettingsSection]?: Partial<SiteSettings[S]> };

export const settingsApi = {
  get: () => get<AdminSiteSettings>('/settings'),
  /** Any subset of sections and fields; merged field by field, arrays replaced. 409 on a concurrent save. */
  update: (patch: SiteSettingsPatch) => send<AdminSiteSettings>('PUT', '/settings', patch),
};

// ---------------------------------------------------------------------------
// Small helpers shared by the content screens
// ---------------------------------------------------------------------------

/** Same rule as the backend's `slugify` (content.sanitizer.ts), for the slug preview. */
export function slugify(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120)
    .replace(/-+$/g, '');
}

/** http(s) URL check used for video URLs, social links and file URLs. */
export function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value.trim());
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/** Button and bar links: an http(s) URL, or a site path starting with a single "/". */
export function isSafeLink(value: string): boolean {
  const text = value.trim();
  if (text.startsWith('/')) return !text.startsWith('//') && !/[\s\\]/.test(text);
  return isHttpUrl(text);
}

export function isYoutubeUrl(value: string): boolean {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return false;
    const host = url.hostname.toLowerCase().replace(/^www\.|^m\./, '');
    return host === 'youtube.com' || host === 'youtu.be' || host === 'youtube-nocookie.com' || host === 'music.youtube.com';
  } catch {
    return false;
  }
}

/** Business dates are IST. */
export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' });
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium' });
}
