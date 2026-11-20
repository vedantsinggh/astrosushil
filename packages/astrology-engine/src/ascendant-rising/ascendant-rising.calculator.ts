import { AstrologyConfig, DEFAULT_ASTROLOGY_CONFIG } from '../configuration/astrology-config';
import { ChartCalculator } from '../chart/chart-calculator';
import { EphemerisProvider } from '../ephemeris/ephemeris.interface';
import { MANDATORY_VEDIC_PLANETS, PlanetSymbol, RawPlanetaryCoordinates } from '../planets/planet.types';
import { RASHIS } from '../zodiac/rashi';
import { getLocalPartsFromUtc, isValidIanaTimezone, resolveLocalTimeToUtc } from '../validation/timezone.solver';
import { DayDivisionsCalculator } from '../muhurta/day-divisions.calculator';
import { LocalDateInput } from '../input/birth-details';

/**
 * Ephemeris stub: the rising-sign table needs only the ascendant, which the chart calculator
 * derives from time and place alone. Using the real chart calculator (with planets stubbed) keeps
 * the ascendant formula, ayanamsa and conventions identical to every chart in the app.
 */
class AscendantOnlyProvider implements EphemerisProvider {
  getProviderName(): string {
    return 'AscendantOnlyProvider';
  }
  getProviderVersion(): string {
    return '1';
  }
  getPlanetaryPosition(planet: PlanetSymbol): RawPlanetaryCoordinates {
    return { planet, longitude: 0, latitude: 0, distanceAU: 1, speedLongitude: 1, isRetrograde: false };
  }
  getAllPlanetaryPositions(): Record<PlanetSymbol, RawPlanetaryCoordinates> {
    const out: Partial<Record<PlanetSymbol, RawPlanetaryCoordinates>> = {};
    for (const p of MANDATORY_VEDIC_PLANETS) out[p] = this.getPlanetaryPosition(p);
    return out as Record<PlanetSymbol, RawPlanetaryCoordinates>;
  }
}

export type AscendantRisingSpan = 'CIVIL_DAY' | 'SUNRISE_TO_SUNRISE';

export interface AscendantRisingInput {
  date: LocalDateInput;
  timezone: string;
  latitude: number;
  longitude: number;
  /** Window: local midnight to midnight (default) or sunrise to next sunrise. */
  span?: AscendantRisingSpan;
}

export interface AscendantRisingEntry {
  rashiIndex: number;
  rashiName: string;
  /** Instant the sign starts rising (or the window start, if it was already rising). */
  startIso: string;
  /** Instant the next sign starts rising (or the window end, if still rising then). */
  endIso: string;
  durationMinutes: number;
  /** True when the sign was already rising at the window start (start clipped). */
  clippedStart: boolean;
  /** True when the sign is still rising at the window end (end clipped). */
  clippedEnd: boolean;
}

export interface AscendantRisingTable {
  input: AscendantRisingInput;
  windowStartIso: string;
  windowEndIso: string;
  entries: AscendantRisingEntry[];
  zodiac: string;
  ayanamsa: string | null;
  notes: string[];
}

const SCAN_STEP_MS = 60_000; // 1 minute: shorter than any sign's rising time below the polar circles
const TOLERANCE_MS = 500;

/**
 * Lagna (ascendant) rising table: the start and end of each sign on the eastern horizon over one
 * day at a place. The ascendant at each instant comes from the engine chart calculator, so it
 * follows the same formula and ayanamsa as charts; sign changes are bracketed by a 1-minute scan
 * and refined by bisection to under a second.
 */
export class AscendantRisingCalculator {
  private readonly chartCalc = new ChartCalculator(new AscendantOnlyProvider());
  private readonly dayCalc = new DayDivisionsCalculator();

  constructor(private readonly config: AstrologyConfig = DEFAULT_ASTROLOGY_CONFIG) {}

  /** Sidereal (per config) ascendant longitude at a UTC instant for a place. */
  public async ascendantAt(utcMs: number, latitude: number, longitude: number): Promise<number> {
    const l = getLocalPartsFromUtc(utcMs, 'UTC');
    const chart = await this.chartCalc.calculateChart(
      {
        date: { year: l.year, month: l.month, day: l.day },
        time: { hour: l.hour, minute: l.minute, second: l.second },
        timezone: 'UTC',
        latitude,
        longitude,
        utcDateTime: new Date(utcMs).toISOString(),
      },
      this.config,
    );
    if (!chart.ascendant) throw new Error('Ascendant could not be calculated');
    return chart.ascendant.longitude;
  }

  private async signAt(ms: number, lat: number, lon: number): Promise<number> {
    return Math.floor((await this.ascendantAt(ms, lat, lon)) / 30) % 12;
  }

  public async calculate(input: AscendantRisingInput): Promise<AscendantRisingTable> {
    const { date, timezone, latitude, longitude } = input;
    if (!isValidIanaTimezone(timezone)) throw new Error(`Invalid IANA timezone: ${timezone}`);
    if (Math.abs(latitude) >= 66) throw new Error('Rising-sign tables are not defined reliably inside the polar circles (|latitude| >= 66°)');
    const span = input.span ?? 'CIVIL_DAY';
    let startMs: number;
    let endMs: number;
    if (span === 'SUNRISE_TO_SUNRISE') {
      const b = this.dayCalc.calculateSolarDay({ date, timezone, latitude, longitude });
      startMs = Date.parse(b.sunriseIso);
      endMs = Date.parse(b.nextSunriseIso);
    } else {
      startMs = resolveLocalTimeToUtc(date.year, date.month, date.day, 0, 0, 0, timezone, 'earlier').utcTimestampMs;
      const next = new Date(Date.UTC(date.year, date.month - 1, date.day + 1));
      endMs = resolveLocalTimeToUtc(next.getUTCFullYear(), next.getUTCMonth() + 1, next.getUTCDate(), 0, 0, 0, timezone, 'earlier').utcTimestampMs;
    }

    const changes: Array<{ ms: number; sign: number }> = [];
    let prevMs = startMs;
    let prevSign = await this.signAt(startMs, latitude, longitude);
    const firstSign = prevSign;
    while (prevMs < endMs) {
      const nextMs = Math.min(prevMs + SCAN_STEP_MS, endMs);
      const sign = await this.signAt(nextMs, latitude, longitude);
      if (sign !== prevSign) {
        let lo = prevMs;
        let hi = nextMs;
        while (hi - lo > TOLERANCE_MS) {
          const mid = (lo + hi) / 2;
          if ((await this.signAt(mid, latitude, longitude)) === prevSign) lo = mid;
          else hi = mid;
        }
        changes.push({ ms: Math.round((lo + hi) / 2), sign });
      }
      prevMs = nextMs;
      prevSign = sign;
    }

    const entries: AscendantRisingEntry[] = [];
    const bounds = [{ ms: startMs, sign: firstSign }, ...changes];
    for (let i = 0; i < bounds.length; i++) {
      const s = bounds[i].ms;
      const e = i + 1 < bounds.length ? bounds[i + 1].ms : endMs;
      if (e <= s) continue;
      const r = RASHIS[bounds[i].sign];
      entries.push({
        rashiIndex: r.index,
        rashiName: r.sanskritName,
        startIso: new Date(s).toISOString(),
        endIso: new Date(e).toISOString(),
        durationMinutes: (e - s) / 60000,
        clippedStart: i === 0,
        clippedEnd: i + 1 >= bounds.length,
      });
    }
    return {
      input: { ...input, span },
      windowStartIso: new Date(startMs).toISOString(),
      windowEndIso: new Date(endMs).toISOString(),
      entries,
      zodiac: String(this.config.zodiacType),
      ayanamsa: this.config.zodiacType === 'SIDEREAL' ? String(this.config.ayanamsa) : null,
      notes: [
        'Ascendant from the engine chart calculator (mean sidereal time and mean obliquity), so it matches the charts.',
        'Times are refined to under one second; the ephemeris and ayanamsa conventions limit real accuracy to about ±30 seconds.',
        span === 'SUNRISE_TO_SUNRISE' ? 'Window: local sunrise to next sunrise (engine sunrise).' : 'Window: local midnight to next local midnight.',
      ],
    };
  }
}
