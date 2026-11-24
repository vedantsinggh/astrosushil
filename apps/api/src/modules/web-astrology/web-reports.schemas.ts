import { z } from 'zod';
import { ianaTimezoneSchema, parseWebsiteDate, MIN_BIRTH_YEAR } from './web-astrology.schemas';

/**
 * What the website's report form (frontend/src/pages/Reports/BookingForm.jsx) sends to
 * `POST /report/buy` and `POST /report/verify-payment`.
 *
 * Differences from the website's own validation (report.validation.js), all deliberate:
 *   - `currencyRate` is not part of the schema. The website multiplied the price by this number
 *     from the browser (finding 3). It is ignored; the rate is looked up on the server.
 *   - `reportType` is optional and, when sent, must be the type of the product named by
 *     `reportId`. The website trusted it without checking it against the product.
 *   - dates, times and coordinates are real dates, times and numbers in range.
 */

export const WEBSITE_REPORT_TYPES = ['mini_horoscope_pdf', 'basic_horoscope_pdf', 'pro_horoscope_pdf', 'match_making_pdf'] as const;
export type WebsiteReportType = (typeof WEBSITE_REPORT_TYPES)[number];

const coordinate = (min: number, max: number) =>
  z.preprocess((value) => {
    // The form keeps coordinates as text (String(item.location.latitude)).
    if (typeof value === 'string' && /^-?\d+(\.\d+)?$/.test(value.trim())) return Number(value.trim());
    return value;
  }, z.number().min(min).max(max));

const dateOfBirth = z
  .string()
  .trim()
  .refine((value) => parseWebsiteDate(value) !== null, {
    message: `dateOfBirth must be YYYY-MM-DD (or DD-MM-YYYY), a real date from ${MIN_BIRTH_YEAR} up to today`,
  })
  .transform((value) => parseWebsiteDate(value)!.iso);

const timeOfBirth = z
  .string()
  .trim()
  .regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, 'timeOfBirth must be HH:mm (24-hour)')
  .transform((value) => (value.length === 5 ? `${value}:00` : value));

export const reportLanguageInput = z.enum(['en', 'hi'], { errorMap: () => ({ message: 'reportLanguage must be "en" or "hi"' }) });

const personBase = {
  fullName: z.string().trim().min(1).max(100),
  email: z.string().trim().toLowerCase().email().max(200),
  whatsappNumber: z
    .string()
    .trim()
    .min(10)
    .max(20)
    .regex(/^\+?[0-9 -]+$/, 'whatsappNumber must be a phone number'),
  dateOfBirth,
  timeOfBirth,
  birthPlace: z.string().trim().min(1).max(200),
  gender: z.enum(['male', 'female', 'other']),
  pinCode: z.string().trim().min(1).max(12),
  latitude: coordinate(-90, 90),
  longitude: coordinate(-180, 180),
  /** IANA timezone of the birth place, as returned by place search (see web-astrology.timezone.ts). */
  timezone: ianaTimezoneSchema.optional(),
};

export const webPersonSchema = z.object(personBase);
export type WebPersonInput = z.infer<typeof webPersonSchema>;

export const webBuyReportSchema = z.object({
  /** The product: its `_id` from GET /web/reports (our catalogue id), its slug, or its website report type. */
  reportId: z.string().trim().min(1).max(100),
  reportType: z.enum(WEBSITE_REPORT_TYPES).optional(),
  /** Currency to pay in; validated against the supported list by the commerce layer. */
  currency: z.string().trim().length(3).optional(),
  customerDetails: z.object({ ...personBase, reportLanguage: reportLanguageInput }).optional(),
  matchMakingDetails: z
    .object({
      bride: webPersonSchema,
      groom: webPersonSchema,
      reportLanguage: reportLanguageInput,
    })
    .optional(),
  idempotencyKey: z.string().min(4).max(128).optional(),
});
export type WebBuyReportInput = z.infer<typeof webBuyReportSchema>;

/** Razorpay's own field names, as the website sends them. Anything else in the body is ignored. */
export const webVerifyReportPaymentSchema = z.object({
  razorpay_order_id: z.string().min(1).max(100),
  razorpay_payment_id: z.string().min(1).max(100),
  razorpay_signature: z.string().min(1).max(256),
});
export type WebVerifyReportPaymentInput = z.infer<typeof webVerifyReportPaymentSchema>;
