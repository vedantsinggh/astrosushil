import { z } from 'zod/v3';

/**
 * Request validation for the website-compatible astrology endpoints.
 *
 * The website backend forwarded these requests to the vendor almost unchecked (finding 8:
 * `daily-horoscope` forwarded an unvalidated body; dates were any non-empty string). Here every
 * value is checked before any calculation: numbers must be numbers, dates must be real calendar
 * dates inside the accepted range, and unknown fields are refused.
 */

/** Earliest birth year accepted on the public pages. */
export const MIN_BIRTH_YEAR = 1900;

/**
 * A number sent in a query string. Unlike `z.coerce.number()`, an empty string, `true`, an array or
 * text such as "12abc" is NOT turned into a number: it fails validation.
 */
function numeric(min: number, max: number, integer = false) {
  const base = integer ? z.number().int().min(min).max(max) : z.number().min(min).max(max);
  return z.preprocess((value) => {
    if (typeof value === 'string' && /^-?\d+(\.\d+)?$/.test(value.trim())) return Number(value.trim());
    return value;
  }, base);
}

/** IANA timezone name, checked against the runtime's zone database. */
export const ianaTimezoneSchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .refine(
    (tz) => {
      try {
        Intl.DateTimeFormat(undefined, { timeZone: tz });
        return true;
      } catch {
        return false;
      }
    },
    { message: 'timezone must be an IANA timezone name such as "Asia/Kolkata"' }
  );

export interface CalendarDate {
  year: number;
  month: number;
  day: number;
  /** YYYY-MM-DD */
  iso: string;
}

/**
 * Parses the website's date of birth. The free kundli and match-making forms send `DD-MM-YYYY`
 * (`formatDob` in KundliGenerate.jsx / MathKundli.jsx); the report form sends the browser's
 * `YYYY-MM-DD`. Both are accepted; the four-digit part decides which one it is, so there is no
 * ambiguity. Returns null for anything else, for an impossible date (31-02) and for a date
 * outside MIN_BIRTH_YEAR … today.
 */
export function parseWebsiteDate(value: string, now: Date = new Date()): CalendarDate | null {
  const text = value.trim();
  let year: number;
  let month: number;
  let day: number;
  const dmy = /^(\d{2})-(\d{2})-(\d{4})$/.exec(text);
  const ymd = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (dmy) {
    day = Number(dmy[1]);
    month = Number(dmy[2]);
    year = Number(dmy[3]);
  } else if (ymd) {
    year = Number(ymd[1]);
    month = Number(ymd[2]);
    day = Number(ymd[3]);
  } else {
    return null;
  }
  const probe = new Date(Date.UTC(year, month - 1, day));
  if (probe.getUTCFullYear() !== year || probe.getUTCMonth() !== month - 1 || probe.getUTCDate() !== day) return null;
  if (year < MIN_BIRTH_YEAR) return null;
  // "Not in the future" is checked against the latest calendar date anywhere on Earth (UTC+14).
  const latestToday = new Date(now.getTime() + 14 * 60 * 60 * 1000);
  const latestIso = latestToday.toISOString().slice(0, 10);
  const iso = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  if (iso > latestIso) return null;
  return { year, month, day, iso };
}

const dobSchema = z
  .string()
  .trim()
  .min(8)
  .max(10)
  .refine((value) => parseWebsiteDate(value) !== null, {
    message: `Date of birth must be DD-MM-YYYY or YYYY-MM-DD, a real date from ${MIN_BIRTH_YEAR} up to today`,
  });

/** Sections the free kundli can return. */
export const KUNDLI_LABELS = [
  'astro_details',
  'basic_panchang',
  'planets',
  'manglik',
  'sadhesati_current_status',
  'vimshottri_major_vdasha',
  'vimshottri_antar_vdasha',
  'birth_chart',
] as const;
export type KundliLabel = (typeof KUNDLI_LABELS)[number];

/**
 * Labels the website still sends that are no longer produced (owner decision 2026-11-24: the
 * Kalsarpa and Pitra dosha sections are removed from the free kundli). They are accepted so the
 * unchanged page keeps working, and nothing is returned for them.
 */
export const KUNDLI_REMOVED_LABELS = ['kalsarpa_details', 'pitra_dosha_report'] as const;

/** Sections the match-making endpoint can return. */
export const MATCH_LABELS = [
  'match_ashtakoot_points',
  'match_birth_details',
  'match_astro_details',
  'match_percentage',
  'match_making_report',
  'match_manglik_report',
  'match_planet_details',
] as const;
export type MatchLabel = (typeof MATCH_LABELS)[number];

/** Sections of the vendor's match report our engine has no result for; accepted, never returned. */
export const MATCH_UNAVAILABLE_LABELS = ['match_dashakoot_points', 'match_obstructions'] as const;

function labelList<T extends string>(allowed: readonly T[], ignored: readonly string[]) {
  return z
    .string()
    .trim()
    .min(3)
    .max(400)
    .transform((value, ctx) => {
      const requested = value
        .split(',')
        .map((part) => part.trim())
        .filter((part) => part.length > 0);
      const unknown = requested.filter((part) => !(allowed as readonly string[]).includes(part) && !ignored.includes(part));
      if (requested.length === 0 || unknown.length > 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `label must be a comma-separated list of: ${allowed.join(', ')}`,
        });
        return z.NEVER;
      }
      return allowed.filter((label) => requested.includes(label));
    });
}

export const webKundliQuerySchema = z
  .object({
    latitude: numeric(-90, 90),
    longitude: numeric(-180, 180),
    dob: dobSchema,
    hour: numeric(0, 23, true),
    min: numeric(0, 59, true),
    label: labelList(KUNDLI_LABELS, KUNDLI_REMOVED_LABELS),
    /** IANA timezone of the birth place, as returned by place search. */
    timezone: ianaTimezoneSchema.optional(),
  })
  .strict();
export type WebKundliQuery = z.infer<typeof webKundliQuerySchema>;

const personName = z.string().trim().max(100).optional();

export const webMatchQuerySchema = z
  .object({
    male_lat: numeric(-90, 90),
    male_long: numeric(-180, 180),
    male_dob: dobSchema,
    male_hour: numeric(0, 23, true),
    male_min: numeric(0, 59, true),
    male_timezone: ianaTimezoneSchema.optional(),
    // The website form sends the names; they are not used in any calculation and are not stored.
    male_name: personName,

    female_lat: numeric(-90, 90),
    female_long: numeric(-180, 180),
    female_dob: dobSchema,
    female_hour: numeric(0, 23, true),
    female_min: numeric(0, 59, true),
    female_timezone: ianaTimezoneSchema.optional(),
    female_name: personName,

    label: labelList(MATCH_LABELS, MATCH_UNAVAILABLE_LABELS),
  })
  .strict();
export type WebMatchQuery = z.infer<typeof webMatchQuerySchema>;

export const webGeoQuerySchema = z
  .object({
    place: z.string().trim().min(2, 'place must be at least 2 characters').max(100),
  })
  .strict();

const horoscopeLanguage = z.enum(['en', 'hi'], { errorMap: () => ({ message: 'language must be "en" or "hi"' }) });

/**
 * Daily horoscope. The website forwarded the body to the vendor unchecked and no page of the
 * current frontend calls it, so the vendor's field names are not known from the code; the Moon
 * sign may be sent as `sign`, `zodiac`, `rashi` (English or Sanskrit name) or `rashiIndex` (1-12).
 */
export const webDailyHoroscopeBodySchema = z
  .object({
    sign: z.string().trim().min(3).max(20).optional(),
    zodiac: z.string().trim().min(3).max(20).optional(),
    rashi: z.string().trim().min(3).max(20).optional(),
    rashiIndex: numeric(1, 12, true).optional(),
    date: z
      .string()
      .regex(/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/, 'date must be YYYY-MM-DD')
      .optional(),
    language: horoscopeLanguage.optional(),
    lang: horoscopeLanguage.optional(),
  })
  .strict()
  .refine((body) => body.rashiIndex !== undefined || body.sign || body.zodiac || body.rashi, {
    message: 'Send the Moon sign as "sign" (for example "Aries" or "Mesha") or "rashiIndex" (1-12)',
  });
export type WebDailyHoroscopeBody = z.infer<typeof webDailyHoroscopeBodySchema>;
