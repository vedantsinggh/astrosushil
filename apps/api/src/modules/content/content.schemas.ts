import { z } from 'zod/v3';
import { isSafeHttpUrl, isSafeLink } from './content.sanitizer';

/**
 * Request validation for the website CMS (banners, blogs, FAQs, testimonials, media, contact
 * inquiries, SEO, site settings). Field names, enums and limits follow the website backend's
 * validation files; where ours is stricter the reason is in docs/integration/modules/content.md.
 *
 * Text fields are plain text unless said otherwise and must be rendered as text by clients.
 * The only HTML fields are BlogPost.content and the five `legal.*` settings; the services
 * sanitise them before they are stored.
 */

// ---------------------------------------------------------------------------
// Shared pieces
// ---------------------------------------------------------------------------

export const idParamSchema = z.object({ id: z.string().uuid('Invalid id') });

const plain = (max: number) => z.string().trim().max(max);
const optionalPlain = (max: number) => plain(max).nullish();

const httpUrl = z
  .string()
  .trim()
  .max(2048)
  .refine(isSafeHttpUrl, 'Must be a valid http(s) URL');

const httpUrlOrEmpty = z.union([z.literal(''), httpUrl]);

const safeLink = z
  .string()
  .trim()
  .max(2048)
  .refine(isSafeLink, 'Must be an http(s) URL or a path starting with "/"');

/**
 * A file uploaded beforehand through POST /admin/uploads: the `{ url, key }` pair it returned.
 * `key` may be omitted; it is then derived from the URL by the storage module.
 */
export const storedFileSchema = z
  .object({
    url: httpUrl,
    key: z.string().trim().min(1).max(1024).nullish(),
  })
  .strict();

/** undefined = leave as is, null = remove the file, object = set or replace it. */
const fileSlot = storedFileSchema.nullish();

const queryBoolean = z.enum(['true', 'false']).transform((value) => value === 'true');

const pageNumber = z.coerce.number().int().min(1).default(1);
const orderNumber = z.number().int().min(-100000).max(100000);

// ---------------------------------------------------------------------------
// Banners
// ---------------------------------------------------------------------------

export const BANNER_TYPES = ['Slider', 'Page'] as const;
export const BANNER_PAGES = ['Homepage', 'About', 'Contact', 'Services'] as const;
export type BannerType = (typeof BANNER_TYPES)[number];
export type BannerPage = (typeof BANNER_PAGES)[number];

const bannerButtonSchema = z
  .object({
    text: plain(100).min(1, 'Button text required'),
    link: safeLink,
  })
  .strict();

const bannerFields = {
  title: optionalPlain(300),
  subtitle: optionalPlain(300),
  description: optionalPlain(2000),
  type: z.enum(BANNER_TYPES, { errorMap: () => ({ message: 'Please select a valid banner type' }) }),
  buttons: z.array(bannerButtonSchema).max(6),
  page: z.enum(BANNER_PAGES),
  order: orderNumber,
  isActive: z.boolean(),
  image: fileSlot,
};

export const createBannerSchema = z
  .object({
    ...bannerFields,
    buttons: bannerFields.buttons.default([]),
    page: bannerFields.page.default('Homepage'),
    order: bannerFields.order.default(0),
    isActive: bannerFields.isActive.default(true),
  })
  .strict();

export const updateBannerSchema = z.object(bannerFields).partial().strict();

export const adminBannerQuerySchema = z.object({
  page: z.enum(BANNER_PAGES).optional(),
  type: z.enum(BANNER_TYPES).optional(),
  isActive: queryBoolean.optional(),
});

export const publicBannerQuerySchema = z.object({
  page: z.string().trim().max(50).default('home'),
});

export type CreateBannerInput = z.infer<typeof createBannerSchema>;
export type UpdateBannerInput = z.infer<typeof updateBannerSchema>;
export type AdminBannerQuery = z.infer<typeof adminBannerQuerySchema>;

// ---------------------------------------------------------------------------
// Blogs
// ---------------------------------------------------------------------------

export const BLOG_STATUSES = ['draft', 'published'] as const;
export type BlogStatus = (typeof BLOG_STATUSES)[number];

/** Rich text may embed base64 images (the website editor does), so the cap is generous. */
export const MAX_RICH_TEXT_LENGTH = 5_000_000;
export const RICH_TEXT_BODY_LIMIT_BYTES = 8 * 1024 * 1024;

const blogAuthorSchema = z
  .object({
    name: optionalPlain(150),
    avatar: fileSlot,
  })
  .strict();

const blogSeoSchema = z
  .object({
    metaTitle: optionalPlain(300),
    metaDescription: optionalPlain(1000),
    keywords: z.array(plain(100).min(1)).max(50).optional(),
  })
  .strict();

const blogFields = {
  title: plain(300).min(3),
  /** Optional: generated from the title when omitted. */
  slug: plain(150).min(3),
  shortDescription: plain(1000).min(10),
  content: z.string().min(20).max(MAX_RICH_TEXT_LENGTH),
  category: plain(100).min(1),
  tags: z.array(plain(100).min(1)).max(50),
  author: blogAuthorSchema,
  seo: blogSeoSchema,
  status: z.enum(BLOG_STATUSES),
  isFeatured: z.boolean(),
  publishedAt: z.coerce.date().nullable(),
  thumbnail: fileSlot,
  images: z.array(storedFileSchema).max(10),
};

export const createBlogSchema = z
  .object({
    ...blogFields,
    slug: blogFields.slug.optional(),
    tags: blogFields.tags.default([]),
    author: blogFields.author.optional(),
    seo: blogFields.seo.optional(),
    status: blogFields.status.default('draft'),
    isFeatured: blogFields.isFeatured.default(false),
    publishedAt: blogFields.publishedAt.optional(),
    images: blogFields.images.default([]),
  })
  .strict();

export const updateBlogSchema = z.object(blogFields).partial().strict();

const blogListQuery = {
  page: pageNumber,
  search: z.string().trim().max(200).default(''),
  category: z.string().trim().max(100).optional(),
  tag: z.string().trim().max(100).optional(),
  isFeatured: queryBoolean.optional(),
};

/** The website's blog list page asks for `limit=1000`, so the public cap stays that high. */
export const publicBlogQuerySchema = z.object({
  ...blogListQuery,
  limit: z.coerce.number().int().min(1).max(1000).default(10),
});

export const adminBlogQuerySchema = z.object({
  ...blogListQuery,
  limit: z.coerce.number().int().min(1).max(100).default(10),
  status: z.enum(BLOG_STATUSES).optional(),
});

export const blogSlugParamSchema = z.object({ slug: z.string().trim().min(1).max(150) });

export type CreateBlogInput = z.infer<typeof createBlogSchema>;
export type UpdateBlogInput = z.infer<typeof updateBlogSchema>;
export type PublicBlogQuery = z.infer<typeof publicBlogQuerySchema>;
export type AdminBlogQuery = z.infer<typeof adminBlogQuerySchema>;

// ---------------------------------------------------------------------------
// FAQs
// ---------------------------------------------------------------------------

const faqFields = {
  question: plain(1000).min(5, 'Question required'),
  answer: plain(10000).min(5, 'Answer required'),
  page: plain(100).min(1, 'Page required'),
  isActive: z.boolean(),
  order: orderNumber,
};

export const createFaqSchema = z
  .object({
    ...faqFields,
    isActive: faqFields.isActive.default(true),
    order: faqFields.order.default(0),
  })
  .strict();

export const updateFaqSchema = z.object(faqFields).partial().strict();

export const publicFaqQuerySchema = z.object({ page: z.string().trim().max(100).optional() });

export const adminFaqQuerySchema = z.object({
  page: z.string().trim().max(100).optional(),
  isActive: queryBoolean.optional(),
});

export type CreateFaqInput = z.infer<typeof createFaqSchema>;
export type UpdateFaqInput = z.infer<typeof updateFaqSchema>;
export type AdminFaqQuery = z.infer<typeof adminFaqQuerySchema>;

// ---------------------------------------------------------------------------
// Testimonials
// ---------------------------------------------------------------------------

export const TESTIMONIAL_TYPES = ['text', 'video'] as const;
export type TestimonialType = (typeof TESTIMONIAL_TYPES)[number];

const testimonialFields = {
  name: plain(150).min(1),
  designation: optionalPlain(150),
  message: plain(5000).min(1),
  rating: z.number().int().min(1).max(5),
  serviceName: optionalPlain(150),
  tagline: optionalPlain(300),
  type: z.enum(TESTIMONIAL_TYPES),
  videoUrl: httpUrl.nullish(),
  page: plain(100).min(1),
  order: orderNumber,
  isActive: z.boolean(),
  image: fileSlot,
};

export const createTestimonialSchema = z
  .object({
    ...testimonialFields,
    rating: testimonialFields.rating.default(5),
    type: testimonialFields.type.default('text'),
    page: testimonialFields.page.default('home'),
    order: testimonialFields.order.default(0),
    isActive: testimonialFields.isActive.default(true),
  })
  .strict();

export const updateTestimonialSchema = z.object(testimonialFields).partial().strict();

const testimonialListQuery = {
  page: z.string().trim().max(100).optional(),
  serviceName: z.string().trim().max(150).optional(),
  /** Minimum rating, as on the website (`rating >= value`). */
  rating: z.coerce.number().int().min(1).max(5).optional(),
};

export const publicTestimonialQuerySchema = z.object({
  ...testimonialListQuery,
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export const adminTestimonialQuerySchema = z.object({
  ...testimonialListQuery,
  type: z.enum(TESTIMONIAL_TYPES).optional(),
  isActive: queryBoolean.optional(),
  limit: z.coerce.number().int().min(1).max(500).default(100),
  offset: z.coerce.number().int().min(0).default(0),
});

export type CreateTestimonialInput = z.infer<typeof createTestimonialSchema>;
export type UpdateTestimonialInput = z.infer<typeof updateTestimonialSchema>;
export type PublicTestimonialQuery = z.infer<typeof publicTestimonialQuerySchema>;
export type AdminTestimonialQuery = z.infer<typeof adminTestimonialQuerySchema>;

// ---------------------------------------------------------------------------
// Media (podcast / celebrity / wishes)
// ---------------------------------------------------------------------------

export const MEDIA_SECTIONS = ['podcast', 'celebrity', 'wishes'] as const;
export const MEDIA_TYPES = ['video', 'image'] as const;
export type MediaSection = (typeof MEDIA_SECTIONS)[number];
export type MediaType = (typeof MEDIA_TYPES)[number];

const mediaFields = {
  title: plain(300).min(2, 'Title is required'),
  description: plain(5000),
  section: z.enum(MEDIA_SECTIONS),
  /** podcast only: the YouTube link. */
  mediaUrl: httpUrl.nullish(),
  /** celebrity only: the uploaded video. */
  media: fileSlot,
  /** podcast and celebrity: the thumbnail image. wishes: the image itself. */
  thumbnail: fileSlot,
  tag: plain(100),
  personName: plain(150),
  background: plain(300),
  isActive: z.boolean(),
  order: orderNumber,
};

export const createMediaSchema = z
  .object({
    ...mediaFields,
    description: mediaFields.description.default(''),
    tag: mediaFields.tag.default(''),
    personName: mediaFields.personName.default(''),
    background: mediaFields.background.default(''),
    isActive: mediaFields.isActive.default(true),
    order: mediaFields.order.default(0),
  })
  .strict();

export const updateMediaSchema = z.object(mediaFields).partial().strict();

export const publicMediaQuerySchema = z.object({ section: z.enum(MEDIA_SECTIONS).optional() });

export const adminMediaQuerySchema = z.object({
  section: z.enum(MEDIA_SECTIONS).optional(),
  isActive: queryBoolean.optional(),
});

export type CreateMediaInput = z.infer<typeof createMediaSchema>;
export type UpdateMediaInput = z.infer<typeof updateMediaSchema>;
export type AdminMediaQuery = z.infer<typeof adminMediaQuerySchema>;

// ---------------------------------------------------------------------------
// Contact inquiries
// ---------------------------------------------------------------------------

export const submitContactSchema = z
  .object({
    name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .max(254)
      .refine((value) => value === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value), 'Invalid email address')
      .default(''),
    phone: z
      .string()
      .trim()
      .refine(
        (value) => value === '' || /^\+?[1-9]\d{6,14}$/.test(value),
        'Enter a valid phone number (7-15 digits, with optional + country code)'
      )
      .optional(),
    subject: z.string().trim().max(150).optional(),
    message: z.string().trim().min(5, 'Message must be at least 5 characters').max(2000),
  })
  .strict();

export const contactRemarksSchema = z
  .object({
    remarks: z.string().trim().max(2000, 'Remarks must be under 2000 characters').default(''),
  })
  .strict();

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD');

export const adminContactQuerySchema = z.object({
  page: pageNumber,
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().max(200).default(''),
  /** IST calendar dates, both inclusive. An empty value means "no bound", as the website admin sends. */
  fromDate: z.union([z.literal(''), isoDate]).optional(),
  toDate: z.union([z.literal(''), isoDate]).optional(),
});

export type SubmitContactInput = z.infer<typeof submitContactSchema>;
export type AdminContactQuery = z.infer<typeof adminContactQuerySchema>;

// ---------------------------------------------------------------------------
// SEO
// ---------------------------------------------------------------------------

const seoName = z
  .string()
  .trim()
  .min(1, 'Page name is required')
  .max(150)
  .transform((value) => value.toLowerCase())
  .refine((value) => !/[\u0000-\u001f\u007f]/.test(value), 'Invalid page name');

const seoFields = {
  name: seoName,
  metaTitle: plain(300).min(1, 'Meta title is required'),
  metaDescription: plain(1000).min(1, 'Meta description is required'),
  image: fileSlot,
};

export const createSeoSchema = z.object(seoFields).strict();
export const updateSeoSchema = z.object(seoFields).partial().strict();
export const seoNameParamSchema = z.object({ name: seoName });

export type CreateSeoInput = z.infer<typeof createSeoSchema>;
export type UpdateSeoInput = z.infer<typeof updateSeoSchema>;

// ---------------------------------------------------------------------------
// Site settings
// ---------------------------------------------------------------------------
//
// One record. NO CREDENTIALS: the website's payment.razorpayKey/razorpaySecret/stripeKey/
// stripeSecret, smtp.* and sms.* are not part of this document at all; those stay in the server
// environment. The update schema is strict, so a request that carries them is rejected instead of
// being silently accepted.
//
// "Decorative" marks a field that the website backend stores but never reads (no code path uses
// it). It is kept so nothing is lost in the migration; changing it changes no behaviour.
// Money is integer paise (the website stored decimal rupees).

const hexColorOrEmpty = z.union([z.literal(''), z.string().regex(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/, 'Must be a hex colour')]);
const paise = z.number().int().min(0).max(100_000_000_000);
const smallCount = z.number().int().min(0).max(1_000_000);
const percent = z.number().min(0).max(100);
/** HSN or SAC code: 4, 6 or 8 digits, or blank. */
export const hsnSac = z.union([z.literal(''), z.string().trim().regex(/^(\d{4}|\d{6}|\d{8})$/, 'HSN/SAC code must be 4, 6 or 8 digits')]);
const linkOrEmpty = z.union([z.literal(''), safeLink]);
const richText = z.string().max(MAX_RICH_TEXT_LENGTH);

const announcementBarShape = {
  enabled: z.boolean(),
  text: plain(500),
  bgColor: hexColorOrEmpty,
  textColor: hexColorOrEmpty,
  linkEnabled: z.boolean(),
  /** Internal route ("/free-online-kundli") or a full external URL. */
  linkUrl: linkOrEmpty,
};

/** Up to 20 ids, trimmed, duplicates dropped (first one kept). */
const idList = z
  .array(z.string().trim().min(1).max(100))
  .max(20)
  .transform((ids) => [...new Set(ids)]);

export const SETTINGS_SHAPE = {
  branding: {
    siteName: plain(150).min(1),
    logoUrl: httpUrlOrEmpty,
    logoKey: plain(1024),
    faviconUrl: httpUrlOrEmpty,
    faviconKey: plain(1024),
  },
  contact: {
    email: z.union([z.literal(''), z.string().trim().toLowerCase().email().max(254)]),
    phone: plain(50),
    whatsapp: plain(50),
    address: plain(1000),
  },
  socialLinks: {
    facebook: httpUrlOrEmpty,
    instagram: httpUrlOrEmpty,
    twitter: httpUrlOrEmpty,
    youtube: httpUrlOrEmpty,
    linkedin: httpUrlOrEmpty,
  },
  business: {
    companyName: plain(300),
    gstNumber: plain(50),
    panNumber: plain(50),
  },
  // Decorative, except that the website checkout page reads codEnabled.
  payment: {
    currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/, 'Must be a 3-letter currency code'),
    taxPercent: percent,
    codEnabled: z.boolean(),
  },
  // Decorative: shown on the shipping policy page only; no charge is calculated from it.
  shipping: {
    freeShippingThresholdPaise: paise,
    baseDeliveryChargePaise: paise,
    deliveryChargePerKmPaise: paise,
    maxCodLimitPaise: paise,
    supportedAreas: z.array(plain(150).min(1)).max(500),
  },
  // Decorative.
  product: {
    lowStockWarning: smallCount,
    maxQuantityInCart: smallCount,
  },
  // Decorative.
  offers: {
    referralRewardPercent: percent,
    enableCoupons: z.boolean(),
    flashSaleEnabled: z.boolean(),
  },
  // Decorative: returnPolicyDays is shown on the shipping policy page only.
  order: {
    autoCancelUnpaidMinutes: smallCount,
    returnPolicyDays: smallCount,
    maxOrderValuePaise: paise,
  },
  // Decorative.
  communication: {
    enableOrderEmails: z.boolean(),
    enableOrderSMS: z.boolean(),
    enablePushNotifications: z.boolean(),
  },
  // Decorative: OTP expiry and resend timing are fixed in the auth code, not read from here.
  otp: {
    expiryMinutes: smallCount,
    resendTimeoutSec: smallCount,
  },
  // Decorative: the API's maintenance switch is the MAINTENANCE_MODE environment variable.
  system: {
    maintenanceMode: z.boolean(),
  },
  topBar: announcementBarShape,
  highlightsBar: announcementBarShape,
  // Rich text (sanitised HTML). returnPolicyText is stored but not rendered by the website.
  // GST invoice (owner decision 2026-11-26). Blank until the owner's CA confirms the codes: an
  // invoice line then prints no code and the invoice register flags it. A product's own code wins.
  invoice: {
    hsnSacReport: hsnSac,
    hsnSacConsultation: hsnSac,
    hsnSacProduct: hsnSac,
    hsnSacCourse: hsnSac,
  },
  // Mobile app home page (owner decision 2026-11-27): which consultations (mode catalog ids),
  // reports (catalog ids) and products (ids) are featured, in order, and which content sections
  // show. An empty list lets the app show the first few automatically.
  appHome: {
    featuredConsultationSkus: idList,
    featuredReportIds: idList,
    featuredProductIds: idList,
    showStarVideos: z.boolean(),
    showYoutube: z.boolean(),
    showTestimonials: z.boolean(),
    showBlogs: z.boolean(),
  },
  legal: {
    privacyPolicy: richText,
    termsConditions: richText,
    returnPolicyText: richText,
    cancellationRefundPolicy: richText,
    shippingDeliveryPolicy: richText,
  },
} as const;

export const LEGAL_FIELDS = [
  'privacyPolicy',
  'termsConditions',
  'returnPolicyText',
  'cancellationRefundPolicy',
  'shippingDeliveryPolicy',
] as const;

export const SETTINGS_DEFAULTS = {
  branding: { siteName: 'Astro Sushil', logoUrl: '', logoKey: '', faviconUrl: '', faviconKey: '' },
  contact: { email: '', phone: '', whatsapp: '', address: '' },
  socialLinks: { facebook: '', instagram: '', twitter: '', youtube: '', linkedin: '' },
  business: { companyName: '', gstNumber: '', panNumber: '' },
  payment: { currency: 'INR', taxPercent: 0, codEnabled: true },
  shipping: {
    freeShippingThresholdPaise: 100000,
    baseDeliveryChargePaise: 5000,
    deliveryChargePerKmPaise: 500,
    maxCodLimitPaise: 2000000,
    supportedAreas: [] as string[],
  },
  product: { lowStockWarning: 5, maxQuantityInCart: 10 },
  offers: { referralRewardPercent: 0, enableCoupons: true, flashSaleEnabled: false },
  order: { autoCancelUnpaidMinutes: 60, returnPolicyDays: 7, maxOrderValuePaise: 10000000 },
  communication: { enableOrderEmails: true, enableOrderSMS: true, enablePushNotifications: false },
  otp: { expiryMinutes: 5, resendTimeoutSec: 30 },
  system: { maintenanceMode: false },
  topBar: { enabled: false, text: '', bgColor: '#ffffff', textColor: '#ef4444', linkEnabled: false, linkUrl: '' },
  highlightsBar: { enabled: false, text: '', bgColor: '#121045', textColor: '#ffffff', linkEnabled: false, linkUrl: '' },
  invoice: { hsnSacReport: '', hsnSacConsultation: '', hsnSacProduct: '', hsnSacCourse: '' },
  appHome: {
    featuredConsultationSkus: [] as string[],
    featuredReportIds: [] as string[],
    featuredProductIds: [] as string[],
    showStarVideos: true,
    showYoutube: true,
    showTestimonials: true,
    showBlogs: true,
  },
  legal: {
    privacyPolicy: '',
    termsConditions: '',
    returnPolicyText: '',
    cancellationRefundPolicy: '',
    shippingDeliveryPolicy: '',
  },
};

export type SiteSettings = typeof SETTINGS_DEFAULTS;
export type SettingsSection = keyof SiteSettings;
export const SETTINGS_SECTIONS = Object.keys(SETTINGS_SHAPE) as SettingsSection[];

const strictPartial = <T extends z.ZodRawShape>(shape: T) => z.object(shape).partial().strict().optional();

/** Admin update: any subset of sections, any subset of fields per section. Unknown keys are rejected. */
export const updateSettingsSchema = z
  .object({
    branding: strictPartial(SETTINGS_SHAPE.branding),
    contact: strictPartial(SETTINGS_SHAPE.contact),
    socialLinks: strictPartial(SETTINGS_SHAPE.socialLinks),
    business: strictPartial(SETTINGS_SHAPE.business),
    payment: strictPartial(SETTINGS_SHAPE.payment),
    shipping: strictPartial(SETTINGS_SHAPE.shipping),
    product: strictPartial(SETTINGS_SHAPE.product),
    offers: strictPartial(SETTINGS_SHAPE.offers),
    order: strictPartial(SETTINGS_SHAPE.order),
    communication: strictPartial(SETTINGS_SHAPE.communication),
    otp: strictPartial(SETTINGS_SHAPE.otp),
    system: strictPartial(SETTINGS_SHAPE.system),
    topBar: strictPartial(SETTINGS_SHAPE.topBar),
    highlightsBar: strictPartial(SETTINGS_SHAPE.highlightsBar),
    invoice: strictPartial(SETTINGS_SHAPE.invoice),
    appHome: strictPartial(SETTINGS_SHAPE.appHome),
    legal: strictPartial(SETTINGS_SHAPE.legal),
  })
  .strict();

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
