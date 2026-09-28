import { normalizeDegree } from '../coordinates/angular-math';
import { getNakshatraByLongitude, getPada } from '../nakshatra/nakshatra';
import { PlanetSymbol } from '../planets/planet.types';
import { RASHIS } from '../zodiac/rashi';
import { AstronomyEngineAdapter } from '../ephemeris/astronomy-engine.adapter';
import {
  PanchangOutput,
  TithiDetails,
  VaraDetails,
  YogaDetails,
  KaranaDetails,
  NakshatraPanchangDetails,
  Paksha,
  SunriseSunsetDetails,
  RahuKalaDetails,
  HinduCalendarDate,
  DailyPanchangOutput,
  PanchangaTransitionEvent,
} from './panchang.types';

let astronomyLib: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  astronomyLib = require('astronomy-engine');
} catch {
  astronomyLib = null;
}

export const TITHI_NAMES = [
  'Pratipada',
  'Dwitiya',
  'Tritiya',
  'Chaturthi',
  'Panchami',
  'Shashthi',
  'Saptami',
  'Ashtami',
  'Navami',
  'Dashami',
  'Ekadashi',
  'Dwadashi',
  'Trayodashi',
  'Chaturdashi',
  'Purnima',
];

export const YOGA_NAMES = [
  'Vishkambha',
  'Priti',
  'Ayushman',
  'Saubhagya',
  'Shobhana',
  'Atiganda',
  'Sukarma',
  'Dhriti',
  'Shoola',
  'Ganda',
  'Vriddhi',
  'Dhruva',
  'Vyaghata',
  'Harshana',
  'Vajra',
  'Siddhi',
  'Vyatipata',
  'Variyan',
  'Parigha',
  'Shiva',
  'Siddha',
  'Sadhya',
  'Shubha',
  'Shukla',
  'Brahma',
  'Indra',
  'Vaidhriti',
];

export const VARA_LORDS: { name: string; lord: PlanetSymbol }[] = [
  { name: 'Ravivara', lord: PlanetSymbol.SUN },
  { name: 'Somavara', lord: PlanetSymbol.MOON },
  { name: 'Mangalavara', lord: PlanetSymbol.MARS },
  { name: 'Budhavara', lord: PlanetSymbol.MERCURY },
  { name: 'Guruvara', lord: PlanetSymbol.JUPITER },
  { name: 'Shukravara', lord: PlanetSymbol.VENUS },
  { name: 'Shanivara', lord: PlanetSymbol.SATURN },
];

export const REPEATING_KARANAS = [
  'Bava',
  'Balava',
  'Kaulava',
  'Taitila',
  'Gara',
  'Vanija',
  'Vishti',
];

export const AMANTA_MASAS: Record<number, string> = {
  1: 'Vaisakha',
  2: 'Jyeshtha',
  3: 'Ashadha',
  4: 'Shravana',
  5: 'Bhadrapada',
  6: 'Ashvina',
  7: 'Kartika',
  8: 'Margashirsha',
  9: 'Pausha',
  10: 'Magha',
  11: 'Phalguna',
  12: 'Chaitra',
};

// Traditional 8 daytime segments mapping for Rahu Kala (1-indexed segment 1 to 8):
// Sunday: 8th, Monday: 2nd, Tuesday: 7th, Wednesday: 5th, Thursday: 6th, Friday: 4th, Saturday: 3rd
export const RAHU_KALA_DAY_SEGMENTS: Record<number, number> = {
  0: 8, // Sunday
  1: 2, // Monday
  2: 7, // Tuesday
  3: 5, // Wednesday
  4: 6, // Thursday
  5: 4, // Friday
  6: 3, // Saturday
};

export class PanchangCalculator {
  private ephemeris: AstronomyEngineAdapter;

  constructor(ephemeris?: AstronomyEngineAdapter) {
    this.ephemeris = ephemeris || new AstronomyEngineAdapter();
  }

  /**
   * Helper to compute Sun and Moon sidereal coordinates at an arbitrary UTC Date.
   */
  public getSunMoonPositions(date: Date): {
    sunSidereal: number;
    moonSidereal: number;
    sunTropical: number;
    moonTropical: number;
    ayanamsa: number;
  } {
    const jd = date.getTime() / 86400000 + 2440587.5;
    const sunRaw = this.ephemeris.getPlanetaryPosition(PlanetSymbol.SUN, jd);
    const moonRaw = this.ephemeris.getPlanetaryPosition(PlanetSymbol.MOON, jd);
    const yearsFromJ2000 = (jd - 2451545.0) / 365.25;
    const ayanamsa = 23.85 + 0.01396 * yearsFromJ2000;
    const sunSidereal = normalizeDegree(sunRaw.longitude - ayanamsa);
    const moonSidereal = normalizeDegree(moonRaw.longitude - ayanamsa);
    return {
      sunSidereal,
      moonSidereal,
      sunTropical: sunRaw.longitude,
      moonTropical: moonRaw.longitude,
      ayanamsa,
    };
  }

  /**
   * Calculates instantaneous Panchang elements given Sun longitude, Moon longitude, and date.
   * Backward compatible with Phase 2A-2E implementations.
   */
  public calculatePanchang(
    sunLongitude: number,
    moonLongitude: number,
    birthDateUtc: Date,
    options?: { withBoundaries?: boolean; latitude?: number; longitude?: number }
  ): PanchangOutput {
    const sunNorm = normalizeDegree(sunLongitude);
    const moonNorm = normalizeDegree(moonLongitude);

    // 1. Tithi (12 degrees elongation)
    const tithiDiff = normalizeDegree(moonNorm - sunNorm);
    const tithiIndex = Math.floor(tithiDiff / 12) + 1; // 1 to 30
    const paksha: Paksha = tithiIndex <= 15 ? 'SUKLA' : 'KRISHNA';

    let tithiNameIndex = (tithiIndex - 1) % 15;
    let tithiName = TITHI_NAMES[tithiNameIndex];
    if (tithiIndex === 15) tithiName = 'Purnima';
    if (tithiIndex === 30) tithiName = 'Amavasya';

    const degreeInTithi = tithiDiff % 12;
    const completionPercentage = (degreeInTithi / 12) * 100;

    const tithi: TithiDetails = {
      index: tithiIndex,
      name: tithiName,
      paksha,
      degreeInTithi,
      completionPercentage,
    };

    // 2. Vara (Weekday from UTC date)
    const dayOfWeek = birthDateUtc.getUTCDay(); // 0 = Sunday
    const varaInfo = VARA_LORDS[dayOfWeek];
    const vara: VaraDetails = {
      dayIndex: dayOfWeek,
      name: varaInfo.name,
      lord: varaInfo.lord,
    };

    // 3. Nakshatra (13°20' Moon longitude)
    const nakshatraDef = getNakshatraByLongitude(moonNorm);
    const pada = getPada(moonNorm);
    const nakshatra: NakshatraPanchangDetails = {
      index: nakshatraDef.index,
      name: nakshatraDef.name,
      lord: nakshatraDef.lord,
      pada,
    };

    // 4. Yoga (13°20' Sun + Moon longitude)
    const yogaSum = normalizeDegree(sunNorm + moonNorm);
    const yogaSpan = 360 / 27; // 13.333333333333334
    const yogaIndex = Math.floor(yogaSum / yogaSpan) + 1;
    const yogaDegree = yogaSum % yogaSpan;
    const yogaCompletion = (yogaDegree / yogaSpan) * 100;

    const yoga: YogaDetails = {
      index: yogaIndex,
      name: YOGA_NAMES[yogaIndex - 1],
      completionPercentage: yogaCompletion,
    };

    // 5. Karana (Half-tithi, 6 degrees each, classical fixed/movable sequence)
    const karanaIndex = Math.floor(tithiDiff / 6) + 1; // 1 to 60
    let karanaName = '';
    let karanaType: 'MOVABLE' | 'FIXED' = 'MOVABLE';

    if (karanaIndex === 1) {
      karanaName = 'Kimstughna';
      karanaType = 'FIXED';
    } else if (karanaIndex >= 2 && karanaIndex <= 57) {
      const repIndex = (karanaIndex - 2) % 7;
      karanaName = REPEATING_KARANAS[repIndex];
      karanaType = 'MOVABLE';
    } else if (karanaIndex === 58) {
      karanaName = 'Shakuni';
      karanaType = 'FIXED';
    } else if (karanaIndex === 59) {
      karanaName = 'Chatushpada';
      karanaType = 'FIXED';
    } else if (karanaIndex === 60) {
      karanaName = 'Naga';
      karanaType = 'FIXED';
    }

    const karana: KaranaDetails = {
      index: karanaIndex,
      name: karanaName,
      type: karanaType,
    };

    // Optional boundary time searching
    if (options?.withBoundaries) {
      const tithiBoundaries = this.findTithiBoundaries(birthDateUtc, tithiIndex, degreeInTithi);
      tithi.startIso = tithiBoundaries.startIso;
      tithi.endIso = tithiBoundaries.endIso;

      const nakshatraBoundaries = this.findNakshatraBoundaries(birthDateUtc, nakshatraDef.index, moonNorm);
      nakshatra.startIso = nakshatraBoundaries.startIso;
      nakshatra.endIso = nakshatraBoundaries.endIso;

      const yogaBoundaries = this.findYogaBoundaries(birthDateUtc, yogaIndex, yogaDegree);
      yoga.startIso = yogaBoundaries.startIso;
      yoga.endIso = yogaBoundaries.endIso;

      const karanaBoundaries = this.findKaranaBoundaries(birthDateUtc, karanaIndex, tithiDiff % 6);
      karana.startIso = karanaBoundaries.startIso;
      karana.endIso = karanaBoundaries.endIso;
    }

    // Optional Sunrise, Sunset & Rahu Kala
    let sunriseSunset: SunriseSunsetDetails | undefined;
    let rahuKala: RahuKalaDetails | undefined;
    if (typeof options?.latitude === 'number' && typeof options?.longitude === 'number') {
      sunriseSunset = this.calculateSunriseSunset(birthDateUtc, options.latitude, options.longitude);
      rahuKala = this.calculateRahuKala(sunriseSunset.sunriseIso, sunriseSunset.sunsetIso, dayOfWeek);
    }

    // Hindu Calendar Date
    const sunRashiIndex = Math.floor(sunNorm / 30) + 1;
    const sunRashiDef = RASHIS[sunRashiIndex - 1];
    const amantaMasa = AMANTA_MASAS[sunRashiIndex] || 'Chaitra';
    const purnimantaMasa = paksha === 'SUKLA' ? amantaMasa : (AMANTA_MASAS[(sunRashiIndex % 12) + 1] || 'Vaisakha');

    const hinduCalendar: HinduCalendarDate = {
      amantaMasa,
      purnimantaMasa,
      paksha,
      tithiIndex,
      tithiName,
      solarRashi: sunRashiDef.sanskritName,
      solarRashiIndex: sunRashiIndex,
      isAdhika: false,
    };

    return {
      tithi,
      vara,
      nakshatra,
      yoga,
      karana,
      sunriseSunset,
      rahuKala,
      hinduCalendar,
    };
  }

  /**
   * Convenience method to calculate instantaneous Panchanga directly for a UTC Date.
   */
  public calculatePanchangForDate(
    date: Date,
    options?: { withBoundaries?: boolean; latitude?: number; longitude?: number }
  ): PanchangOutput {
    const { sunSidereal, moonSidereal } = this.getSunMoonPositions(date);
    return this.calculatePanchang(sunSidereal, moonSidereal, date, options);
  }

  /**
   * Deterministically calculates Sunrise and Sunset for a geographic location and date.
   */
  public calculateSunriseSunset(
    date: Date,
    latitude: number,
    longitude: number
  ): SunriseSunsetDetails {
    if (astronomyLib) {
      try {
        const observer = new astronomyLib.Observer(latitude, longitude, 0);
        const dayStart = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0));

        const rise = astronomyLib.SearchRiseSet('Sun', observer, +1, dayStart, 1.2);
        const set = astronomyLib.SearchRiseSet('Sun', observer, -1, rise ? rise.date : dayStart, 1.2);

        if (rise && set) {
          const sunriseIso = rise.date.toISOString();
          const sunsetIso = set.date.toISOString();
          const dayLengthMinutes = Math.max(0, Math.round((set.date.getTime() - rise.date.getTime()) / 60000));
          return {
            sunriseIso,
            sunsetIso,
            dayLengthMinutes,
          };
        }
      } catch {
        // Fall through to deterministic fallback if astronomyLib throws on polar regions
      }
    }

    // Geometric fallback (approx 6:00 to 18:00 local solar time)
    const fallbackRise = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 6, 0, 0));
    const fallbackSet = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 18, 0, 0));
    return {
      sunriseIso: fallbackRise.toISOString(),
      sunsetIso: fallbackSet.toISOString(),
      dayLengthMinutes: 720,
    };
  }

  /**
   * Calculates Rahu Kala by dividing the daytime interval into 8 equal parts.
   */
  public calculateRahuKala(
    sunriseIso: string,
    sunsetIso: string,
    dayIndex: number
  ): RahuKalaDetails {
    const riseMs = new Date(sunriseIso).getTime();
    const setMs = new Date(sunsetIso).getTime();
    const segmentDurationMs = Math.max(0, (setMs - riseMs) / 8);
    const segment1Based = RAHU_KALA_DAY_SEGMENTS[dayIndex] || 8;
    const startMs = Math.round(riseMs + (segment1Based - 1) * segmentDurationMs);
    const endMs = Math.round(riseMs + segment1Based * segmentDurationMs);

    return {
      startIso: new Date(startMs).toISOString(),
      endIso: new Date(endMs).toISOString(),
      segmentIndex: segment1Based,
      totalSegments: 8,
    };
  }

  /**
   * Calculates full Daily Panchang with all transitions across the civil day.
   */
  public calculateDailyPanchang(
    date: Date,
    latitude: number,
    longitude: number,
    timezone: string = 'UTC'
  ): DailyPanchangOutput {
    // 1. Civil day boundaries in UTC
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth();
    const day = date.getUTCDate();
    const dayStart = new Date(Date.UTC(year, month, day, 0, 0, 0));
    const dayEnd = new Date(Date.UTC(year, month, day, 23, 59, 59, 999));
    const dayStartMs = dayStart.getTime();
    const dayEndMs = dayEnd.getTime();

    // 2. Solar Rise and Set
    const sun = this.calculateSunriseSunset(date, latitude, longitude);
    const dayIndex = date.getUTCDay();
    const rahuKala = this.calculateRahuKala(sun.sunriseIso, sun.sunsetIso, dayIndex);

    // 3. Instantaneous Panchang at sunrise (or noon if sunrise unavailable)
    const referenceDate = new Date(sun.sunriseIso);
    const instantaneous = this.calculatePanchangForDate(referenceDate, {
      withBoundaries: true,
      latitude,
      longitude,
    });

    // 4. Assemble chronological transition events during this civil day
    const transitions: PanchangaTransitionEvent[] = [];

    // Sunrise & Sunset events
    const sunriseMs = new Date(sun.sunriseIso).getTime();
    if (sunriseMs >= dayStartMs && sunriseMs <= dayEndMs) {
      transitions.push({
        type: 'SUNRISE',
        name: 'Sunrise',
        timestampIso: sun.sunriseIso,
      });
    }

    const sunsetMs = new Date(sun.sunsetIso).getTime();
    if (sunsetMs >= dayStartMs && sunsetMs <= dayEndMs) {
      transitions.push({
        type: 'SUNSET',
        name: 'Sunset',
        timestampIso: sun.sunsetIso,
      });
    }

    // Rahu Kala events
    const rkStartMs = new Date(rahuKala.startIso).getTime();
    if (rkStartMs >= dayStartMs && rkStartMs <= dayEndMs) {
      transitions.push({
        type: 'RAHU_KALA_START',
        name: 'Rahu Kala Start',
        timestampIso: rahuKala.startIso,
      });
    }
    const rkEndMs = new Date(rahuKala.endIso).getTime();
    if (rkEndMs >= dayStartMs && rkEndMs <= dayEndMs) {
      transitions.push({
        type: 'RAHU_KALA_END',
        name: 'Rahu Kala End',
        timestampIso: rahuKala.endIso,
      });
    }

    // Tithi transition
    if (instantaneous.tithi.endIso) {
      const tEndMs = new Date(instantaneous.tithi.endIso).getTime();
      if (tEndMs >= dayStartMs && tEndMs <= dayEndMs) {
        const nextTithiIdx = (instantaneous.tithi.index % 30) + 1;
        let nextName = TITHI_NAMES[(nextTithiIdx - 1) % 15];
        if (nextTithiIdx === 15) nextName = 'Purnima';
        if (nextTithiIdx === 30) nextName = 'Amavasya';

        transitions.push({
          type: 'TITHI_CHANGE',
          name: `Tithi changes to ${nextName}`,
          timestampIso: instantaneous.tithi.endIso,
          fromName: instantaneous.tithi.name,
          toName: nextName,
        });
      }
    }

    // Nakshatra transition
    if (instantaneous.nakshatra.endIso) {
      const nEndMs = new Date(instantaneous.nakshatra.endIso).getTime();
      if (nEndMs >= dayStartMs && nEndMs <= dayEndMs) {
        const nextNakIdx = (instantaneous.nakshatra.index % 27) + 1;
        const nextNakDef = getNakshatraByLongitude((nextNakIdx - 1) * (360 / 27) + 0.1);

        transitions.push({
          type: 'NAKSHATRA_CHANGE',
          name: `Nakshatra changes to ${nextNakDef.name}`,
          timestampIso: instantaneous.nakshatra.endIso,
          fromName: instantaneous.nakshatra.name,
          toName: nextNakDef.name,
        });
      }
    }

    // Yoga transition
    if (instantaneous.yoga.endIso) {
      const yEndMs = new Date(instantaneous.yoga.endIso).getTime();
      if (yEndMs >= dayStartMs && yEndMs <= dayEndMs) {
        const nextYogaIdx = (instantaneous.yoga.index % 27) + 1;
        const nextYogaName = YOGA_NAMES[nextYogaIdx - 1];

        transitions.push({
          type: 'YOGA_CHANGE',
          name: `Yoga changes to ${nextYogaName}`,
          timestampIso: instantaneous.yoga.endIso,
          fromName: instantaneous.yoga.name,
          toName: nextYogaName,
        });
      }
    }

    // Karana transition
    if (instantaneous.karana.endIso) {
      const kEndMs = new Date(instantaneous.karana.endIso).getTime();
      if (kEndMs >= dayStartMs && kEndMs <= dayEndMs) {
        const nextKaranaIdx = (instantaneous.karana.index % 60) + 1;
        let nextKaranaName = '';
        if (nextKaranaIdx === 1) nextKaranaName = 'Kimstughna';
        else if (nextKaranaIdx >= 2 && nextKaranaIdx <= 57) nextKaranaName = REPEATING_KARANAS[(nextKaranaIdx - 2) % 7];
        else if (nextKaranaIdx === 58) nextKaranaName = 'Shakuni';
        else if (nextKaranaIdx === 59) nextKaranaName = 'Chatushpada';
        else if (nextKaranaIdx === 60) nextKaranaName = 'Naga';

        transitions.push({
          type: 'KARANA_CHANGE',
          name: `Karana changes to ${nextKaranaName}`,
          timestampIso: instantaneous.karana.endIso,
          fromName: instantaneous.karana.name,
          toName: nextKaranaName,
        });
      }
    }

    // Sort transitions chronologically
    transitions.sort((a, b) => new Date(a.timestampIso).getTime() - new Date(b.timestampIso).getTime());

    const dateFormatted = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    return {
      date: dateFormatted,
      location: {
        latitude,
        longitude,
        timezone,
      },
      instantaneous,
      sun,
      rahuKala,
      hinduCalendar: instantaneous.hinduCalendar!,
      transitions,
    };
  }

  // -----------------------------------------------------------------------------------------
  // Numerical Bisection Root Searching for Exact Transitions
  // -----------------------------------------------------------------------------------------

  private findTithiBoundaries(
    refDate: Date,
    tithiIndex: number,
    degreeInTithi: number
  ): { startIso: string; endIso: string } {
    const t0 = refDate.getTime();
    const degElapsed = degreeInTithi;
    const degRemaining = 12 - degElapsed;

    // Approximate rates: Moon - Sun moves ~0.508 degrees per hour (~12.2° per day)
    const hoursElapsed = Math.max(0.1, degElapsed / 0.508);
    const hoursRemaining = Math.max(0.1, degRemaining / 0.508);

    const getDiff = (ms: number) => {
      const { sunSidereal, moonSidereal } = this.getSunMoonPositions(new Date(ms));
      return normalizeDegree(moonSidereal - sunSidereal);
    };

    const refDiff = getDiff(t0);

    // Bisection for end boundary
    let leftEnd = t0;
    let rightEnd = t0 + Math.round((hoursRemaining * 1.5 + 2) * 3600000);
    for (let iter = 0; iter < 20; iter++) {
      const mid = Math.round((leftEnd + rightEnd) / 2);
      const curr = getDiff(mid);
      const forwardDelta = normalizeDegree(curr - refDiff);
      if (forwardDelta >= degRemaining) {
        rightEnd = mid;
      } else {
        leftEnd = mid;
      }
    }
    const endIso = new Date(rightEnd).toISOString();

    // Bisection for start boundary
    let leftStart = t0 - Math.round((hoursElapsed * 1.5 + 2) * 3600000);
    let rightStart = t0;
    for (let iter = 0; iter < 20; iter++) {
      const mid = Math.round((leftStart + rightStart) / 2);
      const curr = getDiff(mid);
      const backwardDelta = normalizeDegree(refDiff - curr);
      if (backwardDelta >= degElapsed) {
        leftStart = mid;
      } else {
        rightStart = mid;
      }
    }
    const startIso = new Date(leftStart).toISOString();

    return { startIso, endIso };
  }

  private findNakshatraBoundaries(
    refDate: Date,
    nakshatraIndex: number,
    moonLongitude: number
  ): { startIso: string; endIso: string } {
    const t0 = refDate.getTime();
    const span = 360 / 27; // 13.333333333333334
    const degElapsed = moonLongitude % span;
    const degRemaining = span - degElapsed;

    // Moon moves ~13.2 degrees per day (~0.55 degrees/hour)
    const hoursElapsed = Math.max(0.1, degElapsed / 0.55);
    const hoursRemaining = Math.max(0.1, degRemaining / 0.55);

    const getMoon = (ms: number) => {
      const { moonSidereal } = this.getSunMoonPositions(new Date(ms));
      return moonSidereal;
    };

    const refMoon = getMoon(t0);

    let leftEnd = t0;
    let rightEnd = t0 + Math.round((hoursRemaining * 1.5 + 2) * 3600000);
    for (let iter = 0; iter < 20; iter++) {
      const mid = Math.round((leftEnd + rightEnd) / 2);
      const curr = getMoon(mid);
      const forwardDelta = normalizeDegree(curr - refMoon);
      if (forwardDelta >= degRemaining) {
        rightEnd = mid;
      } else {
        leftEnd = mid;
      }
    }
    const endIso = new Date(rightEnd).toISOString();

    let leftStart = t0 - Math.round((hoursElapsed * 1.5 + 2) * 3600000);
    let rightStart = t0;
    for (let iter = 0; iter < 20; iter++) {
      const mid = Math.round((leftStart + rightStart) / 2);
      const curr = getMoon(mid);
      const backwardDelta = normalizeDegree(refMoon - curr);
      if (backwardDelta >= degElapsed) {
        leftStart = mid;
      } else {
        rightStart = mid;
      }
    }
    const startIso = new Date(leftStart).toISOString();

    return { startIso, endIso };
  }

  private findYogaBoundaries(
    refDate: Date,
    yogaIndex: number,
    yogaDegree: number
  ): { startIso: string; endIso: string } {
    const t0 = refDate.getTime();
    const span = 360 / 27;
    const degElapsed = yogaDegree;
    const degRemaining = span - degElapsed;

    // Sun + Moon moves ~14.2 degrees per day (~0.59 degrees/hour)
    const hoursElapsed = Math.max(0.1, degElapsed / 0.59);
    const hoursRemaining = Math.max(0.1, degRemaining / 0.59);

    const getSum = (ms: number) => {
      const { sunSidereal, moonSidereal } = this.getSunMoonPositions(new Date(ms));
      return normalizeDegree(sunSidereal + moonSidereal);
    };

    const refSum = getSum(t0);

    let leftEnd = t0;
    let rightEnd = t0 + Math.round((hoursRemaining * 1.5 + 2) * 3600000);
    for (let iter = 0; iter < 20; iter++) {
      const mid = Math.round((leftEnd + rightEnd) / 2);
      const curr = getSum(mid);
      const forwardDelta = normalizeDegree(curr - refSum);
      if (forwardDelta >= degRemaining) {
        rightEnd = mid;
      } else {
        leftEnd = mid;
      }
    }
    const endIso = new Date(rightEnd).toISOString();

    let leftStart = t0 - Math.round((hoursElapsed * 1.5 + 2) * 3600000);
    let rightStart = t0;
    for (let iter = 0; iter < 20; iter++) {
      const mid = Math.round((leftStart + rightStart) / 2);
      const curr = getSum(mid);
      const backwardDelta = normalizeDegree(refSum - curr);
      if (backwardDelta >= degElapsed) {
        leftStart = mid;
      } else {
        rightStart = mid;
      }
    }
    const startIso = new Date(leftStart).toISOString();

    return { startIso, endIso };
  }

  private findKaranaBoundaries(
    refDate: Date,
    karanaIndex: number,
    degreeInKarana: number
  ): { startIso: string; endIso: string } {
    const t0 = refDate.getTime();
    const degElapsed = degreeInKarana;
    const degRemaining = 6 - degElapsed;

    const hoursElapsed = Math.max(0.1, degElapsed / 0.508);
    const hoursRemaining = Math.max(0.1, degRemaining / 0.508);

    const getDiff = (ms: number) => {
      const { sunSidereal, moonSidereal } = this.getSunMoonPositions(new Date(ms));
      return normalizeDegree(moonSidereal - sunSidereal);
    };

    const refDiff = getDiff(t0);

    let leftEnd = t0;
    let rightEnd = t0 + Math.round((hoursRemaining * 1.5 + 2) * 3600000);
    for (let iter = 0; iter < 20; iter++) {
      const mid = Math.round((leftEnd + rightEnd) / 2);
      const curr = getDiff(mid);
      const forwardDelta = normalizeDegree(curr - refDiff);
      if (forwardDelta >= degRemaining) {
        rightEnd = mid;
      } else {
        leftEnd = mid;
      }
    }
    const endIso = new Date(rightEnd).toISOString();

    let leftStart = t0 - Math.round((hoursElapsed * 1.5 + 2) * 3600000);
    let rightStart = t0;
    for (let iter = 0; iter < 20; iter++) {
      const mid = Math.round((leftStart + rightStart) / 2);
      const curr = getDiff(mid);
      const backwardDelta = normalizeDegree(refDiff - curr);
      if (backwardDelta >= degElapsed) {
        leftStart = mid;
      } else {
        rightStart = mid;
      }
    }
    const startIso = new Date(leftStart).toISOString();

    return { startIso, endIso };
  }
}

