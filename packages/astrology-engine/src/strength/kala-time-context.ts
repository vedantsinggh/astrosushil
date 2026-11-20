import { PlanetSymbol } from '../planets/planet.types';
import { AstroChart } from '../chart/astro-chart.types';
import { findLocalSolarEvents, CivilDate } from '../astronomy/solar-day';
import { getTrueAyanamsa, resolveAyanamsaSystem } from '../ayanamsa/ayanamsa';

/**
 * Time context for Kala Bala (BPHS ch. 27, Santhanam; B.V. Raman, "Graha and Bhava Balas", Kala Bala
 * chapter). Computed once per chart and shared by every planet.
 *
 * Classical rules implemented here:
 * - The Vedic day (vara) runs from sunrise to the next sunrise. A birth before local sunrise belongs to
 *   the previous weekday (BPHS ch. 27 Vara Bala; Raman, Vara Bala).
 * - Day birth = between the actual local sunrise and sunset (solar-day.ts, ADR-015 upper-limb convention).
 * - Nathonnata: Unnata = time elapsed from local apparent midnight (folded to 0..12 h); apparent midnight
 *   is taken 12 h from apparent noon = midpoint of sunrise and sunset (Raman, Nathonnata Bala).
 * - Tribhaga: the day (sunrise..sunset) and the night (sunset..next sunrise) are each divided into three
 *   equal parts (BPHS ch. 27).
 * - Hora: the first hora of the Vedic day belongs to the weekday lord; horas follow the Chaldean order
 *   Sun, Venus, Mercury, Moon, Saturn, Jupiter, Mars (BPHS ch. 27 Hora Bala). Hora length: provisional –
 *   pending client review: day/12 from sunrise and night/12 from sunset (unequal seasonal horas). Raman's
 *   worked examples use equal 1-hour horas from sunrise; the two coincide at the equinoxes.
 * - Abda / Masa: lord of the weekday on which the current 360-day year / 30-day month counted from the
 *   Kali epoch began (Raman, "Graha and Bhava Balas", Abda and Masa Bala via the Ahargana; BPHS ch. 27).
 *   Kali epoch: JDN 588466 = Friday 18 Feb 3102 BCE (Julian), the traditional start of Kali Yuga.
 *   Provisional – pending client review (epoch day and civil-day Ahargana, as in Raman).
 *
 * If sunrise/sunset cannot be found (polar day/night, or a chart without location/date), the legacy
 * approximations (06:00 / 18:00 local clock, Sun's whole-sign house) are used and `source` = 'FALLBACK'.
 */

export const WEEKDAY_LORDS: readonly PlanetSymbol[] = [
  PlanetSymbol.SUN, // 0 = Sunday
  PlanetSymbol.MOON,
  PlanetSymbol.MARS,
  PlanetSymbol.MERCURY,
  PlanetSymbol.JUPITER,
  PlanetSymbol.VENUS,
  PlanetSymbol.SATURN,
];

/** Chaldean hora sequence (descending order of the planetary spheres). */
export const HORA_SEQUENCE: readonly PlanetSymbol[] = [
  PlanetSymbol.SUN,
  PlanetSymbol.VENUS,
  PlanetSymbol.MERCURY,
  PlanetSymbol.MOON,
  PlanetSymbol.SATURN,
  PlanetSymbol.JUPITER,
  PlanetSymbol.MARS,
];

/** JDN of the first civil day of Kali Yuga (Friday, 18 Feb 3102 BCE Julian). */
export const KALI_EPOCH_JDN = 588466;

const HOUR_MS = 3600000;

export interface KalaTimeContext {
  source: 'SOLAR' | 'FALLBACK';
  isDayBirth: boolean;
  /** 0 = Sunday … 6 = Saturday, of the Vedic (sunrise-to-sunrise) day. */
  vedicWeekday: number;
  /** Local civil date of the Vedic day (the date whose sunrise starts it). */
  vedicDate: CivilDate;
  sunriseIso: string | null;
  sunsetIso: string | null;
  nextSunriseIso: string | null;
  /** Hours elapsed since apparent midnight, folded to [0, 12]. */
  unnataHours: number;
  /** 0, 1, 2 = first, middle, last third of the day (isDayBirth) or of the night. */
  tribhagaPart: number;
  /** 0-based index of the hora within the day (0..11) or the night (0..11). */
  horaIndex: number;
  horaLord: PlanetSymbol;
  /** Days elapsed since the Kali epoch (civil days, Vedic-day date). */
  ahargana: number;
  abdaLord: PlanetSymbol;
  masaLord: PlanetSymbol;
  /** Ayanamsa (degrees) added to sidereal longitudes to obtain sayana longitudes for Ayana Bala. */
  ayanamsaDegrees: number;
  conventionNotes: string[];
}

/** Julian Day Number (integer, civil day) of a proleptic Gregorian civil date. */
export function civilDateToJdn(date: CivilDate): number {
  const a = Math.floor((14 - date.month) / 12);
  const y = date.year + 4800 - a;
  const m = date.month + 12 * a - 3;
  return (
    date.day +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045
  );
}

/** Weekday of a JDN, 0 = Sunday. */
export function jdnWeekday(jdn: number): number {
  return (((jdn + 1) % 7) + 7) % 7;
}

/** Lords of the 360-day year (Abda) and 30-day month (Masa) for an Ahargana counted from the Kali epoch. */
export function abdaMasaLords(ahargana: number): { abdaLord: PlanetSymbol; masaLord: PlanetSymbol } {
  const yearStartJdn = KALI_EPOCH_JDN + 360 * Math.floor(ahargana / 360);
  const monthStartJdn = KALI_EPOCH_JDN + 30 * Math.floor(ahargana / 30);
  return {
    abdaLord: WEEKDAY_LORDS[jdnWeekday(yearStartJdn)],
    masaLord: WEEKDAY_LORDS[jdnWeekday(monthStartJdn)],
  };
}

function shiftDate(date: CivilDate, days: number): CivilDate {
  const d = new Date(Date.UTC(date.year, date.month - 1, date.day + days));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

/** Ayanamsa applied to the chart (metadata first, else true ayanamsa of the configured system at the JD). */
export function resolveChartAyanamsa(chart: AstroChart): number {
  const meta = chart.metadata;
  if (!meta) return 0;
  if (meta.ayanamsa && typeof meta.ayanamsa.trueDegrees === 'number') return meta.ayanamsa.trueDegrees;
  if (meta.ayanamsa === null) return 0; // tropical chart
  if (meta.config && String(meta.config.zodiacType) === 'TROPICAL') return 0;
  const jd = meta.normalizedTime?.julianDayUT;
  if (typeof jd !== 'number' || !Number.isFinite(jd)) return 0;
  try {
    return getTrueAyanamsa(jd, resolveAyanamsaSystem(meta.config?.ayanamsa));
  } catch {
    return getTrueAyanamsa(jd);
  }
}

function horaLordFor(vedicWeekday: number, horaOfDay: number): PlanetSymbol {
  const start = HORA_SEQUENCE.indexOf(WEEKDAY_LORDS[vedicWeekday]);
  return HORA_SEQUENCE[(start + horaOfDay) % 7];
}

function finite(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n);
}

/** Legacy approximation used when real sunrise/sunset are unavailable. */
function fallbackContext(chart: AstroChart, ayanamsaDegrees: number, reason: string): KalaTimeContext {
  const bd = chart.birthDetails;
  const civil: CivilDate = bd?.date
    ? { year: bd.date.year, month: bd.date.month, day: bd.date.day }
    : { year: 2000, month: 1, day: 1 };
  const t = bd?.time || { hour: 12, minute: 0, second: 0 };
  const localHour = t.hour + (t.minute || 0) / 60 + (t.second || 0) / 3600;
  const beforeSunrise = localHour < 6;
  const vedicDate = beforeSunrise ? shiftDate(civil, -1) : civil;
  const jdn = civilDateToJdn(vedicDate);
  const vedicWeekday = jdnWeekday(jdn);
  const isDayBirth = localHour >= 6 && localHour < 18;
  const sinceStart = isDayBirth ? localHour - 6 : (localHour - 18 + 24) % 24;
  const tribhagaPart = Math.min(2, Math.floor(sinceStart / 4));
  const horaIndex = Math.min(11, Math.floor(sinceStart));
  const horaLord = horaLordFor(vedicWeekday, (isDayBirth ? 0 : 12) + horaIndex);
  const fromMidnight = localHour;
  const unnataHours = fromMidnight <= 12 ? fromMidnight : 24 - fromMidnight;
  const ahargana = jdn - KALI_EPOCH_JDN;
  return {
    source: 'FALLBACK',
    isDayBirth,
    vedicWeekday,
    vedicDate,
    sunriseIso: null,
    sunsetIso: null,
    nextSunriseIso: null,
    unnataHours,
    tribhagaPart,
    horaIndex,
    horaLord,
    ahargana,
    ...abdaMasaLords(ahargana),
    ayanamsaDegrees,
    conventionNotes: [`Fallback: ${reason}; 06:00/18:00 local clock used for sunrise/sunset.`],
  };
}

/**
 * Resolves the Kala Bala time context from real local sunrise/sunset (solar-day.ts).
 * Deterministic: depends only on the chart's birth instant, civil date, location and timezone.
 */
export function resolveKalaTimeContext(chart: AstroChart): KalaTimeContext {
  const ayanamsaDegrees = resolveChartAyanamsa(chart);
  const bd = chart.birthDetails;
  const birthMs = chart.metadata?.normalizedTime?.utcTimestampMs;
  if (!bd || !bd.date || !finite(bd.latitude) || !finite(bd.longitude) || !finite(birthMs)) {
    return fallbackContext(chart, ayanamsaDegrees, 'birth instant or location missing');
  }

  const civil: CivilDate = { year: bd.date.year, month: bd.date.month, day: bd.date.day };
  const tz = bd.timezone || undefined;
  let today;
  let yesterday;
  try {
    today = findLocalSolarEvents(civil, bd.latitude, bd.longitude, tz);
    yesterday = findLocalSolarEvents(shiftDate(civil, -1), bd.latitude, bd.longitude, tz);
  } catch {
    return fallbackContext(chart, ayanamsaDegrees, 'sunrise search failed');
  }

  // Pick the Vedic day containing the birth instant: [sunrise, nextSunrise).
  let day = today;
  let vedicDate = civil;
  if (today.sunrise && birthMs < today.sunrise.getTime()) {
    day = yesterday;
    vedicDate = shiftDate(civil, -1);
  }
  if (!day.sunrise || !day.sunset || !day.nextSunrise) {
    return fallbackContext(chart, ayanamsaDegrees, 'no sunrise/sunset at this latitude and date');
  }

  const riseMs = day.sunrise.getTime();
  const setMs = day.sunset.getTime();
  const nextRiseMs = day.nextSunrise.getTime();
  const isDayBirth = birthMs >= riseMs && birthMs < setMs;

  const jdn = civilDateToJdn(vedicDate);
  const vedicWeekday = jdnWeekday(jdn);

  // Tribhaga + Hora.
  const spanStart = isDayBirth ? riseMs : setMs;
  const spanLength = isDayBirth ? setMs - riseMs : nextRiseMs - setMs;
  const frac = Math.min(Math.max((birthMs - spanStart) / spanLength, 0), 0.999999999);
  const tribhagaPart = Math.floor(frac * 3);
  const horaIndex = Math.floor(frac * 12);
  const horaLord = horaLordFor(vedicWeekday, (isDayBirth ? 0 : 12) + horaIndex);

  // Nathonnata: distance from apparent midnight (= apparent noon ± 12 h).
  const noonMs = (riseMs + setMs) / 2;
  let fromNoonH = Math.abs(birthMs - noonMs) / HOUR_MS;
  fromNoonH = fromNoonH % 24;
  if (fromNoonH > 12) fromNoonH = 24 - fromNoonH;
  const unnataHours = 12 - fromNoonH;

  const ahargana = jdn - KALI_EPOCH_JDN;
  const iso = (ms: number): string => new Date(ms).toISOString();

  return {
    source: 'SOLAR',
    isDayBirth,
    vedicWeekday,
    vedicDate,
    sunriseIso: iso(riseMs),
    sunsetIso: iso(setMs),
    nextSunriseIso: iso(nextRiseMs),
    unnataHours: Number(unnataHours.toFixed(6)),
    tribhagaPart,
    horaIndex,
    horaLord,
    ahargana,
    ...abdaMasaLords(ahargana),
    ayanamsaDegrees,
    conventionNotes: [
      'Sunrise/sunset: upper limb with 34\' refraction (ADR-015).',
      'Hora length day/12 and night/12: provisional – pending client review.',
      'Abda/Masa from Kali-epoch Ahargana (JDN 588466, Friday): provisional – pending client review.',
    ],
  };
}
