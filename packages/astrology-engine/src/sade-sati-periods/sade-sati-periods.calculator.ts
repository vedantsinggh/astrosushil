import { AstrologyConfig, DEFAULT_ASTROLOGY_CONFIG } from '../configuration/astrology-config';
import { EphemerisProvider } from '../ephemeris/ephemeris.interface';
import { AstronomyEngineAdapter } from '../ephemeris/astronomy-engine.adapter';
import { PlanetSymbol } from '../planets/planet.types';
import { normalizeDegree } from '../coordinates/angular-math';
import { RASHIS } from '../zodiac/rashi';
import { julianDayToUtcDate, utcDateToJulianDay } from '../varshaphala/solar-return.solver';
import { getConfiguredAyanamsa } from '../ephemeris-tables/configured-ayanamsa';

/** Saturn's sign relative to the natal Moon sign (1 = Moon sign). */
export type SaturnFromMoonHouse = 12 | 1 | 2 | 4 | 8;

export interface SaturnSignSegment {
  /** Saturn's sign during the segment. */
  rashiIndex: number;
  rashiName: string;
  /** House of Saturn counted from the natal Moon sign. */
  houseFromMoon: number;
  startIso: string;
  endIso: string;
  /** True when the segment began with a retrograde re-entry into the sign. */
  retrogradeEntry: boolean;
  startsBeforeRange: boolean;
  endsAfterRange: boolean;
}

/** One Sade Sati cycle: Saturn continuously in the 12th, 1st or 2nd sign from the natal Moon. */
export interface SadeSatiCycle {
  cycle: number;
  startIso: string;
  /** First entry of Saturn into the natal Moon sign (peak phase), if within the cycle. */
  peakStartIso: string | null;
  /** Final exit of Saturn from the natal Moon sign. */
  peakEndIso: string | null;
  endIso: string;
  startsBeforeRange: boolean;
  endsAfterRange: boolean;
  segments: SaturnSignSegment[];
}

export interface SadeSatiPeriodsResult {
  natalMoonRashiIndex: number;
  natalMoonRashiName: string;
  rangeStartIso: string;
  rangeEndIso: string;
  cycles: SadeSatiCycle[];
  /** Saturn in the 4th and 8th signs from the Moon (often tabulated alongside Sade Sati). */
  fourthAndEighth: SaturnSignSegment[];
  definition: string;
  source: string;
}

const STEP_DAYS = 2;
const MAX_RANGE_YEARS = 120;
/** A retrograde excursion out of the Sade Sati signs shorter than this stays in the same cycle. */
const MERGE_GAP_DAYS = 400;

/**
 * Sade Sati as a neutral calculated table (ADR-016 §5): the periods when transiting Saturn is in
 * the 12th, 1st and 2nd signs from the natal Moon sign, with the peak (Saturn in the Moon sign)
 * marked. Saturn's sidereal sign uses the ayanamsa of the given configuration. No
 * interpretation is produced.
 */
export class SadeSatiPeriodsCalculator {
  private readonly provider: EphemerisProvider;

  constructor(ephemerisProvider?: EphemerisProvider, private readonly config: AstrologyConfig = DEFAULT_ASTROLOGY_CONFIG) {
    this.provider = ephemerisProvider ?? new AstronomyEngineAdapter();
  }

  /** Saturn's zodiacal sign index 0..11 (per the config) at a Julian Day UT. */
  private async saturnSign(jd: number): Promise<{ sign: number; retro: boolean }> {
    const raw = await this.provider.getPlanetaryPosition(PlanetSymbol.SATURN, jd);
    const lon = normalizeDegree(raw.longitude - (await getConfiguredAyanamsa(jd, this.config)));
    return { sign: Math.floor(lon / 30) % 12, retro: raw.isRetrograde };
  }

  /** All Saturn sign segments over [startJD, endJD]. */
  private async segments(startJD: number, endJD: number) {
    const out: Array<{ sign: number; start: number; end: number; retroEntry: boolean; clippedStart: boolean; clippedEnd: boolean }> = [];
    let prev = await this.saturnSign(startJD);
    let segStart = startJD;
    let retroEntry = false;
    let first = true;
    let prevT = startJD;
    for (let jd = startJD + STEP_DAYS; ; jd += STEP_DAYS) {
      const t = Math.min(jd, endJD);
      const cur = await this.saturnSign(t);
      if (cur.sign !== prev.sign) {
        let lo = prevT;
        let hi = t;
        while (hi - lo > 1 / 1440) {
          const mid = (lo + hi) / 2;
          if ((await this.saturnSign(mid)).sign === prev.sign) lo = mid;
          else hi = mid;
        }
        const edge = (lo + hi) / 2;
        out.push({ sign: prev.sign, start: segStart, end: edge, retroEntry, clippedStart: first, clippedEnd: false });
        first = false;
        segStart = edge;
        retroEntry = cur.retro;
      }
      prev = cur;
      prevT = t;
      if (t >= endJD) break;
    }
    out.push({ sign: prev.sign, start: segStart, end: endJD, retroEntry, clippedStart: first, clippedEnd: true });
    return out;
  }

  public async calculate(input: { natalMoonLongitude: number; startIso: string; endIso: string }): Promise<SadeSatiPeriodsResult> {
    const start = new Date(input.startIso);
    const end = new Date(input.endIso);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) throw new Error('Sade Sati range must be a positive ISO interval');
    if ((end.getTime() - start.getTime()) / (365.25 * 86400000) > MAX_RANGE_YEARS) throw new Error(`Sade Sati range exceeds ${MAX_RANGE_YEARS} years`);
    const moonSign = Math.floor(normalizeDegree(input.natalMoonLongitude) / 30) % 12;
    const house = (sign: number) => ((sign - moonSign + 12) % 12) + 1;
    const segs = await this.segments(utcDateToJulianDay(start), utcDateToJulianDay(end));
    const toSeg = (s: (typeof segs)[number]): SaturnSignSegment => ({
      rashiIndex: s.sign + 1,
      rashiName: RASHIS[s.sign].sanskritName,
      houseFromMoon: house(s.sign),
      startIso: julianDayToUtcDate(s.start).toISOString(),
      endIso: julianDayToUtcDate(s.end).toISOString(),
      retrogradeEntry: s.retroEntry,
      startsBeforeRange: s.clippedStart,
      endsAfterRange: s.clippedEnd,
    });

    // Group consecutive segments in the 12th/1st/2nd signs. A short excursion outside them caused by
    // retrograde motion (Saturn leaving and re-entering within MERGE_GAP_DAYS) stays in the same cycle;
    // the excursion segment is kept in the list so the segments tile the cycle.
    const groups: Array<typeof segs> = [];
    let current: typeof segs = [];
    let pendingGap: typeof segs = [];
    for (const s of segs) {
      if ([12, 1, 2].includes(house(s.sign))) {
        const gapDays = pendingGap.reduce((a, g) => a + (g.end - g.start), 0);
        if (current.length === 0 && groups.length > 0 && pendingGap.length > 0 && gapDays < MERGE_GAP_DAYS) {
          current = [...groups.pop()!, ...pendingGap];
        }
        pendingGap = [];
        current.push(s);
      } else {
        if (current.length > 0) {
          groups.push(current);
          current = [];
        }
        pendingGap.push(s);
      }
    }
    if (current.length > 0) groups.push(current);
    const cycles: SadeSatiCycle[] = groups.map((g, i) => {
      const mapped = g.map(toSeg);
      const peak = mapped.filter((m) => m.houseFromMoon === 1);
      return {
        cycle: i + 1,
        startIso: mapped[0].startIso,
        peakStartIso: peak.length ? peak[0].startIso : null,
        peakEndIso: peak.length ? peak[peak.length - 1].endIso : null,
        endIso: mapped[mapped.length - 1].endIso,
        startsBeforeRange: mapped[0].startsBeforeRange,
        endsAfterRange: mapped[mapped.length - 1].endsAfterRange,
        segments: mapped,
      };
    });
    return {
      natalMoonRashiIndex: moonSign + 1,
      natalMoonRashiName: RASHIS[moonSign].sanskritName,
      rangeStartIso: start.toISOString(),
      rangeEndIso: end.toISOString(),
      cycles,
      fourthAndEighth: segs.filter((s) => [4, 8].includes(house(s.sign))).map(toSeg),
      definition:
        'Sade Sati: transiting Saturn in the 12th, 1st or 2nd sign from the natal Moon sign (whole signs, sidereal). ' +
        'A cycle runs from Saturn’s first entry into the 12th sign to its final exit from the 2nd, including retrograde re-entries. ' +
        'Peak = Saturn in the natal Moon sign.',
      source: 'Standard whole-sign definition as tabulated in Indian panchangas (e.g. B.V. Raman, "Hindu Predictive Astrology", Gochara chapter). Calculated table only; no interpretation.',
    };
  }
}
