/**
 * Birth-day particulars by the Vedic (sunrise-to-sunrise) day convention.
 *
 * The engine's PanchangCalculator derives the weekday (vara) from the UTC
 * calendar date (docs/report-system/analysis/astrology-engines.md, defect D6),
 * which is wrong for births before local sunrise and for most births west of
 * Greenwich. This module recomputes the vara from the last sunrise before the
 * birth instant (classical rule: the Vedic day runs from one sunrise to the
 * next) using the engine's own sunrise solver. Decision KUN-002.
 *
 * Everything here is deterministic: identical inputs give identical outputs.
 */
import { PanchangCalculator, PanchangOutput, VARA_LORDS } from '@astro/astrology-engine';

const DAY_MS = 86400000;
const GHATI_MS = 24 * 60000; // 1 ghati = 24 minutes; 1 pala = 24 seconds

export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;

export interface GhatiPala {
  ghati: number;
  pala: number;
  text: string;
}

export function toGhatiPala(ms: number): GhatiPala {
  const totalPala = Math.max(0, Math.round(ms / 24000));
  const ghati = Math.floor(totalPala / 60);
  const pala = totalPala % 60;
  return { ghati, pala, text: `${ghati} gh ${String(pala).padStart(2, '0')} pal` };
}

/** Weekday index (0 = Sunday) of an instant in an IANA timezone. */
export function localWeekday(iso: string, timeZone: string): number {
  const name = new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone }).format(new Date(iso));
  return WEEKDAYS.indexOf(name as (typeof WEEKDAYS)[number]);
}

/** "06:42" local clock time of an instant. */
export function localClock(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone }).format(new Date(iso));
}

/** "14 Mar 1991, 06:42" local date and time of an instant. */
export function localDateTime(iso: string, timeZone: string): string {
  const d = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone }).format(new Date(iso));
  return `${d}, ${localClock(iso, timeZone)}`;
}

/** Classical ritu from the (amanta) lunar month: two months per season. */
const RITU_BY_MASA: Record<string, string> = {
  Chaitra: 'Vasanta (spring)', Vaisakha: 'Vasanta (spring)',
  Jyeshtha: 'Grishma (summer)', Ashadha: 'Grishma (summer)',
  Shravana: 'Varsha (monsoon)', Bhadrapada: 'Varsha (monsoon)',
  Ashvina: 'Sharad (autumn)', Kartika: 'Sharad (autumn)',
  Margashirsha: 'Hemanta (pre-winter)', Pausha: 'Hemanta (pre-winter)',
  Magha: 'Shishira (winter)', Phalguna: 'Shishira (winter)',
};

export function rituForMasa(masa: string): string {
  return RITU_BY_MASA[masa] ?? '—';
}

/**
 * Vikram Samvat (Chaitradi, amanta). The year changes at Chaitra Shukla
 * Pratipada (March/April): months Pausha, Magha and Phalguna falling in
 * January–April still belong to the previous Samvat year. Shaka = Vikram − 135.
 */
export function samvatYears(gregorianYear: number, gregorianMonth: number, amantaMasa: string): { vikram: number; shaka: number } {
  const beforeNewYear = ['Pausha', 'Magha', 'Phalguna'].includes(amantaMasa) && gregorianMonth <= 4;
  const vikram = gregorianYear + (beforeNewYear ? 56 : 57);
  return { vikram, shaka: vikram - 135 };
}

export interface VedicDay {
  birthIso: string;
  /** Sunrise that opened the Vedic day of birth (the last sunrise at or before birth). */
  sunriseIso: string;
  sunsetIso: string;
  nextSunriseIso: string;
  dayLengthMinutes: number;
  bornAfterSunset: boolean;
  /** Vedic weekday, sunrise to sunrise (0 = Sunday). */
  varaIndex: number;
  varaName: string;
  varaWeekday: string;
  varaLord: string;
  /** Civil (midnight-to-midnight) local weekday of birth. */
  civilWeekday: string;
  /** Weekday the engine's PanchangCalculator reports (UTC calendar day). */
  engineWeekday: string;
  /** Time from sunrise to birth (Ishta kala). */
  ishtaKala: GhatiPala;
  /** Local mean time of birth and the correction from zone time, in minutes. */
  localMeanTime: string;
  lmtCorrectionMinutes: number;
  /** Ayana and gola from the tropical (sayana) Sun. */
  ayana: string;
  gola: string;
  tropicalSunLongitude: number;
  westernSunSign: string;
  /** Lahiri ayanamsa at birth, as applied by the engine. */
  ayanamsa: number;
}

const TROPICAL_SIGNS = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];

/** Sunrise on the UTC calendar day of `dayStartMs` (engine solver searches forward from UTC midnight). */
function sunriseCandidates(pc: PanchangCalculator, birthMs: number, lat: number, lon: number) {
  const out: Array<{ rise: number; set: number }> = [];
  for (let k = -2; k <= 2; k++) {
    const day = new Date(birthMs + k * DAY_MS);
    const rs = pc.calculateSunriseSunset(day, lat, lon);
    const rise = Date.parse(rs.sunriseIso);
    if (!out.some((o) => Math.abs(o.rise - rise) < 3600000)) out.push({ rise, set: Date.parse(rs.sunsetIso) });
  }
  return out.sort((a, b) => a.rise - b.rise);
}

export function computeVedicDay(input: {
  birthIso: string;
  latitude: number;
  longitude: number;
  timezone: string;
  timezoneOffsetMinutes: number;
  enginePanchang: PanchangOutput;
  panchangCalculator?: PanchangCalculator;
}): VedicDay {
  const pc = input.panchangCalculator ?? new PanchangCalculator();
  const birthMs = Date.parse(input.birthIso);
  const candidates = sunriseCandidates(pc, birthMs, input.latitude, input.longitude);
  const before = candidates.filter((c) => c.rise <= birthMs);
  const after = candidates.filter((c) => c.rise > birthMs);
  if (!before.length || !after.length) throw new Error('VEDIC_DAY_SUNRISE_NOT_FOUND');
  const day = before[before.length - 1];
  const next = after[0];
  const sunriseIso = new Date(day.rise).toISOString();
  const varaIndex = localWeekday(sunriseIso, input.timezone);
  const vara = VARA_LORDS[varaIndex];

  const lmtCorrectionMinutes = Math.round((input.longitude * 4 - input.timezoneOffsetMinutes) * 100) / 100;
  const lmtMs = birthMs + input.longitude * 4 * 60000;
  const lmt = new Date(lmtMs);
  const localMeanTime = `${String(lmt.getUTCHours()).padStart(2, '0')}:${String(lmt.getUTCMinutes()).padStart(2, '0')}:${String(lmt.getUTCSeconds()).padStart(2, '0')}`;

  const { sunTropical, ayanamsa } = pc.getSunMoonPositions(new Date(birthMs));
  const trop = ((sunTropical % 360) + 360) % 360;

  return {
    birthIso: input.birthIso,
    sunriseIso,
    sunsetIso: new Date(day.set).toISOString(),
    nextSunriseIso: new Date(next.rise).toISOString(),
    dayLengthMinutes: Math.round((day.set - day.rise) / 60000),
    bornAfterSunset: birthMs > day.set,
    varaIndex,
    varaName: vara.name,
    varaWeekday: WEEKDAYS[varaIndex],
    varaLord: String(vara.lord),
    civilWeekday: WEEKDAYS[localWeekday(input.birthIso, input.timezone)],
    engineWeekday: WEEKDAYS[input.enginePanchang.vara.dayIndex],
    ishtaKala: toGhatiPala(birthMs - day.rise),
    localMeanTime,
    lmtCorrectionMinutes,
    ayana: trop >= 270 || trop < 90 ? 'Uttarayana (northward)' : 'Dakshinayana (southward)',
    gola: trop < 180 ? 'Uttara Gola (north)' : 'Dakshina Gola (south)',
    tropicalSunLongitude: trop,
    westernSunSign: TROPICAL_SIGNS[Math.floor(trop / 30)],
    ayanamsa,
  };
}

/** Bhayat (elapsed) and Bhabhog (total) of the birth nakshatra, in ghati-pala. */
export function bhayatBhabhog(birthIso: string, nakStartIso?: string, nakEndIso?: string): { bhayat: GhatiPala; bhabhog: GhatiPala } | undefined {
  if (!nakStartIso || !nakEndIso) return undefined;
  const b = Date.parse(birthIso);
  const s = Date.parse(nakStartIso);
  const e = Date.parse(nakEndIso);
  if (!(s <= b && b <= e)) return undefined;
  return { bhayat: toGhatiPala(b - s), bhabhog: toGhatiPala(e - s) };
}

export const GHATI_IN_MS = GHATI_MS;
