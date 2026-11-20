import { AstrologyConfig, DEFAULT_ASTROLOGY_CONFIG } from '../configuration/astrology-config';
import { EphemerisProvider } from '../ephemeris/ephemeris.interface';
import { AstronomyEngineAdapter } from '../ephemeris/astronomy-engine.adapter';
import { PlanetSymbol } from '../planets/planet.types';
import { normalizeDegree } from '../coordinates/angular-math';
import { AscendantRisingCalculator } from '../ascendant-rising/ascendant-rising.calculator';
import { getConfiguredAyanamsa } from '../ephemeris-tables/configured-ayanamsa';
import { utcDateToJulianDay } from '../varshaphala/solar-return.solver';

/**
 * Equal-division boundaries whose crossing changes a chart factor. These are positional facts
 * (fixed arcs), not interpretations: a sign is 30°, a nakshatra 13°20′, a pada (= one navamsa)
 * 3°20′, a dasamsa part 3°, a dwadasamsa part 2°30′, a shashtyamsa part 0°30′ (BPHS ch. 6).
 */
export const SENSITIVITY_DIVISIONS = [
  { key: 'LAGNA_SIGN', label: 'Lagna sign (D1)', arc: 30, body: 'ASC' },
  { key: 'LAGNA_NAKSHATRA', label: 'Lagna nakshatra', arc: 360 / 27, body: 'ASC' },
  { key: 'LAGNA_PADA_D9', label: 'Lagna pada / Navamsa (D9) lagna', arc: 360 / 108, body: 'ASC' },
  { key: 'LAGNA_D10', label: 'Dasamsa (D10) lagna', arc: 3, body: 'ASC' },
  { key: 'LAGNA_D12', label: 'Dwadasamsa (D12) lagna', arc: 2.5, body: 'ASC' },
  { key: 'LAGNA_D60', label: 'Shashtyamsa (D60) lagna', arc: 0.5, body: 'ASC' },
  { key: 'MOON_NAKSHATRA', label: 'Moon nakshatra (dasha lord)', arc: 360 / 27, body: 'MOON' },
  { key: 'MOON_PADA', label: 'Moon pada / Navamsa', arc: 360 / 108, body: 'MOON' },
] as const;

export type SensitivityKey = (typeof SENSITIVITY_DIVISIONS)[number]['key'];

export interface SensitivityChange {
  key: SensitivityKey;
  label: string;
  instantIso: string;
  /** Minutes from the given birth time (negative = earlier). */
  offsetMinutes: number;
  /** 0-based part index before and after the boundary (e.g. sign 0 = Mesha). */
  fromPart: number;
  toPart: number;
  /** Boundary longitude crossed (degrees). */
  boundary: number;
}

export interface SensitivityMargin {
  key: SensitivityKey;
  label: string;
  /** Part index at the birth instant. */
  part: number;
  /** Minutes back to the previous boundary and forward to the next, within the window (null if none). */
  minutesSincePrevious: number | null;
  minutesToNext: number | null;
}

export interface BirthTimeSensitivityResult {
  birthUtcIso: string;
  windowMinutes: number;
  ascendantLongitude: number;
  moonLongitude: number;
  margins: SensitivityMargin[];
  changes: SensitivityChange[];
  source: string;
}

const STEP_MS = 20_000;

/**
 * Birth-time sensitivity (a rectification aid): within ±window minutes of a birth instant, the
 * instants at which the Lagna or the Moon crosses a sign, nakshatra, pada/navamsa, D10, D12 or D60
 * boundary, and how far the given time is from the nearest boundary of each kind. The Lagna and
 * the ayanamsa come from the engine chart calculator (same conventions as charts).
 */
export class BirthTimeSensitivityCalculator {
  private readonly asc: AscendantRisingCalculator;
  private readonly provider: EphemerisProvider;

  constructor(private readonly config: AstrologyConfig = DEFAULT_ASTROLOGY_CONFIG, ephemerisProvider?: EphemerisProvider) {
    this.asc = new AscendantRisingCalculator(config);
    this.provider = ephemerisProvider ?? new AstronomyEngineAdapter();
  }

  private async longitudes(ms: number, lat: number, lon: number): Promise<{ ASC: number; MOON: number }> {
    const jd = utcDateToJulianDay(new Date(ms));
    const moon = await this.provider.getPlanetaryPosition(PlanetSymbol.MOON, jd);
    return {
      ASC: await this.asc.ascendantAt(ms, lat, lon),
      MOON: normalizeDegree(moon.longitude - (await getConfiguredAyanamsa(jd, this.config))),
    };
  }

  public async calculate(input: { birthUtcIso: string; latitude: number; longitude: number; windowMinutes?: number }): Promise<BirthTimeSensitivityResult> {
    const t0 = Date.parse(input.birthUtcIso);
    if (!Number.isFinite(t0)) throw new Error('birthUtcIso must be an ISO instant');
    if (Math.abs(input.latitude) >= 66) throw new Error('Not defined inside the polar circles (|latitude| >= 66°)');
    const win = input.windowMinutes ?? 30;
    if (!(win > 0 && win <= 180)) throw new Error('windowMinutes must be in (0, 180]');
    const start = t0 - win * 60000;
    const end = t0 + win * 60000;
    const { latitude: la, longitude: lo } = input;
    const part = (v: number, arc: number) => Math.floor(v / arc + 1e-12) % Math.round(360 / arc);
    const changes: SensitivityChange[] = [];

    let prevMs = start;
    let prev = await this.longitudes(start, la, lo);
    while (prevMs < end) {
      const ms = Math.min(prevMs + STEP_MS, end);
      const cur = await this.longitudes(ms, la, lo);
      for (const d of SENSITIVITY_DIVISIONS) {
        const a = part(prev[d.body], d.arc);
        const b = part(cur[d.body], d.arc);
        if (a === b) continue;
        let lo2 = prevMs;
        let hi2 = ms;
        while (hi2 - lo2 > 250) {
          const mid = (lo2 + hi2) / 2;
          if (part((await this.longitudes(mid, la, lo))[d.body], d.arc) === a) lo2 = mid;
          else hi2 = mid;
        }
        const at = Math.round((lo2 + hi2) / 2);
        changes.push({ key: d.key, label: d.label, instantIso: new Date(at).toISOString(), offsetMinutes: (at - t0) / 60000, fromPart: a, toPart: b, boundary: (b * d.arc) % 360 });
      }
      prevMs = ms;
      prev = cur;
    }
    changes.sort((x, y) => x.instantIso.localeCompare(y.instantIso));
    const at0 = await this.longitudes(t0, la, lo);
    const margins: SensitivityMargin[] = SENSITIVITY_DIVISIONS.map((d) => {
      const before = changes.filter((c) => c.key === d.key && c.offsetMinutes <= 0).pop();
      const after = changes.find((c) => c.key === d.key && c.offsetMinutes > 0);
      return { key: d.key, label: d.label, part: part(at0[d.body], d.arc), minutesSincePrevious: before ? -before.offsetMinutes : null, minutesToNext: after ? after.offsetMinutes : null };
    });
    return {
      birthUtcIso: new Date(t0).toISOString(),
      windowMinutes: win,
      ascendantLongitude: at0.ASC,
      moonLongitude: at0.MOON,
      margins,
      changes,
      source:
        'Equal-arc divisions per BPHS ch. 6 (sign 30°, navamsa 3°20′, dasamsa 3°, dwadasamsa 2°30′, shashtyamsa 0°30′) and the 27 nakshatras of 13°20′ with 4 padas. ' +
        'Boundary instants only; which varga sign follows a boundary is shown by the varga charts. No rectification judgement is made.',
    };
  }
}
