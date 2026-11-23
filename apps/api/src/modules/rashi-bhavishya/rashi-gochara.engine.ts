/**
 * Deterministic daily gochara engine for Rashi Bhavishya.
 *
 * Step 1 (`computeDailySky`) computes what is the same for everyone on a given
 * day: sidereal planet positions at the reference sunrise, the panchang and
 * the transit events (sign ingresses, retrograde/direct stations).
 * Step 2 (`factsForRashi`) counts each planet's house from one Moon sign and
 * applies the classical favourable-house table.
 *
 * Only `@astro/astrology-engine` is used for astronomy. Identical inputs give
 * identical outputs; there is no wall-clock dependency. Method choices are
 * logged in docs/report-system/decisions/rashi-bhavishya.md.
 */
import {
  PanchangCalculator,
  PlanetSymbol,
  RASHIS,
  TransitIngressSolver,
  TransitIngressEvent,
  TransitStationEvent,
} from '@astro/astrology-engine';
import {
  GOCHARA_PLANETS,
  GocharaClass,
  GocharaPlanet,
  FAVOURABLE_HOUSES_FROM_MOON,
  HOUSE_THEMES,
  PLANET_DISPLAY_NAMES,
  PLANET_THEMES,
  VARA_ENGLISH,
  gocharaClass,
  houseFromSign,
} from './rashi-gochara.tables';

/** Bump whenever a rule, table or reference convention changes (part of the cache key). */
export const RASHI_METHOD_VERSION = 'rb-gochara-1';

/** RB-002: the shared reference location is Ujjain, the classical Indian prime meridian. */
export const REFERENCE_LOCATION = { name: 'Ujjain', latitude: 23.1765, longitude: 75.7885 } as const;
export const IST_TIMEZONE = 'Asia/Kolkata';
const IST_OFFSET_MS = 330 * 60 * 1000;
/** RB-008: slow-planet events are listed for this many days after the reference sunrise. */
export const UPCOMING_EVENT_DAYS = 7;

export interface SignRef {
  index: number;
  sanskritName: string;
  englishName: string;
  /** Only in a Hindi API response (display name); never computed, hashed or stored. */
  hindiName?: string;
}

export interface PlanetPosition {
  planet: GocharaPlanet;
  name: string;
  longitude: number;
  degreeInSign: number;
  sign: SignRef;
  isRetrograde: boolean;
}

export interface SkyEvent {
  type: 'SIGN_INGRESS' | 'RETROGRADE_STATION' | 'DIRECT_STATION';
  planet: GocharaPlanet;
  planetName: string;
  timestampIso: string;
  /** Calendar date of the event in IST (YYYY-MM-DD). */
  dateIst: string;
  /** Local IST clock time (HH:mm). */
  timeIst: string;
  /** True when the event falls between the reference sunrise and the next sunrise. */
  withinDay: boolean;
  fromSign?: SignRef;
  toSign?: SignRef;
  /** Sign in which a station happens. */
  sign?: SignRef;
}

export interface PanchangFacts {
  vara: { name: string; english: string; lord: string };
  tithi: { name: string; paksha: 'Shukla' | 'Krishna'; label: string; endsAtIso?: string };
  nakshatra: { name: string; lord: string; pada: number; endsAtIso?: string };
  yoga: { name: string; endsAtIso?: string };
  karana: { name: string; endsAtIso?: string };
}

export interface DailySky {
  date: string;
  timezone: string;
  reference: {
    location: typeof REFERENCE_LOCATION;
    sunriseIso: string;
    nextSunriseIso: string;
    zodiac: 'SIDEREAL';
    ayanamsa: 'LAHIRI';
    nodes: 'MEAN';
  };
  positions: PlanetPosition[];
  panchang: PanchangFacts;
  events: SkyEvent[];
  methodVersion: string;
}

export interface PlanetGochara {
  planet: GocharaPlanet;
  name: string;
  sign: SignRef;
  degreeInSign: number;
  house: number;
  houseTheme: string;
  planetTheme: string;
  classification: GocharaClass;
  favourableHouses: number[];
  isRetrograde: boolean;
  /** Present when the planet changes sign before the next sunrise. */
  changesTo?: { sign: SignRef; house: number; classification: GocharaClass; atIso: string; timeIst: string; dateIst: string; classificationLabel?: string };
  /** Only in a Hindi API response: the Hindi word for `classification`; never computed, hashed or stored. */
  classificationLabel?: string;
}

export interface RashiDailyFacts {
  date: string;
  rashi: {
    index: number;
    sanskritName: string;
    englishName: string;
    element: string;
    ruler: string;
    /** Only in a Hindi API response (display name); never computed, hashed or stored. */
    hindiName?: string;
  };
  sky: DailySky;
  moon: PlanetGochara;
  planets: PlanetGochara[];
  tally: {
    favourable: number;
    demanding: number;
    total: number;
    favourablePlanets: string[];
    demandingPlanets: string[];
    method: string;
  };
  method: {
    version: string;
    summary: string;
    vedha: 'not-applied';
    sources: string[];
  };
}

export class RashiEngineError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RashiEngineError';
  }
}

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function signRef(index: number): SignRef {
  const r = RASHIS[index - 1];
  if (!r) throw new RashiEngineError(`Unknown sign index ${index}`);
  return { index: r.index, sanskritName: r.sanskritName, englishName: r.englishName };
}

function toJulianDay(date: Date): number {
  return date.getTime() / 86400000 + 2440587.5;
}

/** IST calendar date and clock time of an instant. */
export function istParts(iso: string): { dateIst: string; timeIst: string } {
  const shifted = new Date(new Date(iso).getTime() + IST_OFFSET_MS).toISOString();
  return { dateIst: shifted.slice(0, 10), timeIst: shifted.slice(11, 16) };
}

/** Today's date in IST for a given instant (the API default). */
export function istDateOf(instant: Date): string {
  return istParts(instant.toISOString()).dateIst;
}

export function addDays(date: string, days: number): string {
  const m = DATE_RE.exec(date);
  if (!m) throw new RashiEngineError(`Invalid date ${date}`);
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]) + days));
  return d.toISOString().slice(0, 10);
}

function toGocharaPlanet(symbol: PlanetSymbol | string): GocharaPlanet | undefined {
  return (GOCHARA_PLANETS as readonly string[]).includes(String(symbol)) ? (String(symbol) as GocharaPlanet) : undefined;
}

export class RashiGocharaEngine {
  constructor(
    private readonly solver: TransitIngressSolver = new TransitIngressSolver(),
    private readonly panchang: PanchangCalculator = new PanchangCalculator()
  ) {}

  /** Sunrise at the reference location on an IST calendar date. Throws instead of guessing. */
  sunriseFor(date: string): Date {
    const m = DATE_RE.exec(date);
    if (!m) throw new RashiEngineError(`Invalid date ${date}`);
    // Midnight IST of the date, expressed in UTC; Ujjain sunrise is always ~00:30–02:00 UTC of the same date.
    const midnightIst = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) - IST_OFFSET_MS);
    const probe = new Date(midnightIst.getTime() + 6 * 3600 * 1000); // 06:00 IST, safely after UTC midnight
    const rs = this.panchang.calculateSunriseSunset(probe, REFERENCE_LOCATION.latitude, REFERENCE_LOCATION.longitude);
    const rise = new Date(rs.sunriseIso);
    // The engine substitutes 06:00/18:00 UTC with a 720-minute day when its solver fails: never accept that.
    const isEngineFallback = rs.dayLengthMinutes === 720 && rise.getUTCHours() === 6 && rise.getUTCMinutes() === 0 && rise.getUTCSeconds() === 0;
    if (isEngineFallback || Number.isNaN(rise.getTime())) {
      throw new RashiEngineError(`Sunrise could not be calculated for ${date}`);
    }
    if (istParts(rs.sunriseIso).dateIst !== date) {
      throw new RashiEngineError(`Sunrise for ${date} resolved to another day (${rs.sunriseIso})`);
    }
    return rise;
  }

  async computeDailySky(date: string): Promise<DailySky> {
    const sunrise = this.sunriseFor(date);
    const nextSunrise = this.sunriseFor(addDays(date, 1));
    const jd = toJulianDay(sunrise);
    const jdNext = toJulianDay(nextSunrise);

    const positions: PlanetPosition[] = [];
    for (const planet of GOCHARA_PLANETS) {
      const st = await this.solver.getPlanetaryState(planet as unknown as PlanetSymbol, jd);
      positions.push({
        planet,
        name: PLANET_DISPLAY_NAMES[planet],
        longitude: Number(st.longitude.toFixed(4)),
        degreeInSign: Number((st.longitude % 30).toFixed(2)),
        sign: signRef(st.rashiIndex),
        isRetrograde: st.isRetrograde,
      });
    }

    const pan = this.panchang.calculatePanchangForDate(sunrise, { withBoundaries: true });
    const paksha = pan.tithi.paksha === 'SUKLA' ? 'Shukla' : 'Krishna';
    const isSpecialTithi = pan.tithi.name === 'Purnima' || pan.tithi.name === 'Amavasya';
    const panchang: PanchangFacts = {
      vara: { name: pan.vara.name, english: VARA_ENGLISH[pan.vara.name] ?? pan.vara.name, lord: PLANET_DISPLAY_NAMES[toGocharaPlanet(pan.vara.lord) ?? 'SUN'] },
      tithi: { name: pan.tithi.name, paksha, label: isSpecialTithi ? pan.tithi.name : `${paksha} ${pan.tithi.name}`, endsAtIso: pan.tithi.endIso },
      nakshatra: {
        name: pan.nakshatra.name,
        lord: PLANET_DISPLAY_NAMES[toGocharaPlanet(pan.nakshatra.lord) ?? 'SUN'],
        pada: pan.nakshatra.pada,
        endsAtIso: pan.nakshatra.endIso,
      },
      yoga: { name: pan.yoga.name, endsAtIso: pan.yoga.endIso },
      karana: { name: pan.karana.name, endsAtIso: pan.karana.endIso },
    };
    if (!toGocharaPlanet(pan.vara.lord) || !toGocharaPlanet(pan.nakshatra.lord)) {
      throw new RashiEngineError('Panchang returned an unknown planetary lord');
    }

    // Events: everything (incl. the Moon) within the day; slower planets for the next week.
    const events: SkyEvent[] = [];
    const weekEnd = jd + UPCOMING_EVENT_DAYS;
    for (const planet of GOCHARA_PLANETS) {
      const sym = planet as unknown as PlanetSymbol;
      const end = planet === 'MOON' ? jdNext : weekEnd;
      const ingresses: TransitIngressEvent[] = await this.solver.findSignIngresses(sym, jd, end);
      for (const e of ingresses) {
        if (!e.fromSign || !e.toSign) continue;
        events.push(this.toEvent('SIGN_INGRESS', planet, e.timestampIso, nextSunrise, { fromSign: signRef(e.fromSign.index), toSign: signRef(e.toSign.index) }));
      }
      if (planet === 'KETU') continue; // Ketu mirrors Rahu
      const stations: TransitStationEvent[] = await this.solver.findStationEvents(sym, jd, weekEnd);
      for (const s of stations) {
        events.push(this.toEvent(s.eventType, planet, s.timestampIso, nextSunrise, { sign: signRef(s.rashiIndex) }));
      }
    }
    events.sort((a, b) => a.timestampIso.localeCompare(b.timestampIso) || a.planet.localeCompare(b.planet));

    return {
      date,
      timezone: IST_TIMEZONE,
      reference: {
        location: REFERENCE_LOCATION,
        sunriseIso: sunrise.toISOString(),
        nextSunriseIso: nextSunrise.toISOString(),
        zodiac: 'SIDEREAL',
        ayanamsa: 'LAHIRI',
        nodes: 'MEAN',
      },
      positions,
      panchang,
      events,
      methodVersion: RASHI_METHOD_VERSION,
    };
  }

  private toEvent(
    type: SkyEvent['type'],
    planet: GocharaPlanet,
    timestampIso: string,
    nextSunrise: Date,
    extra: Pick<SkyEvent, 'fromSign' | 'toSign' | 'sign'>
  ): SkyEvent {
    const { dateIst, timeIst } = istParts(timestampIso);
    return {
      type,
      planet,
      planetName: PLANET_DISPLAY_NAMES[planet],
      timestampIso,
      dateIst,
      timeIst,
      withinDay: new Date(timestampIso).getTime() < nextSunrise.getTime(),
      ...extra,
    };
  }
}

/** Per-Moon-sign facts for a day. Pure: depends only on the sky and the sign. */
export function factsForRashi(sky: DailySky, rashiIndex: number): RashiDailyFacts {
  const r = RASHIS[rashiIndex - 1];
  if (!r) throw new RashiEngineError(`Unknown rashi index ${rashiIndex}`);

  const planets: PlanetGochara[] = sky.positions.map((p) => {
    const house = houseFromSign(rashiIndex, p.sign.index);
    const g: PlanetGochara = {
      planet: p.planet,
      name: p.name,
      sign: p.sign,
      degreeInSign: p.degreeInSign,
      house,
      houseTheme: HOUSE_THEMES[house],
      planetTheme: PLANET_THEMES[p.planet],
      classification: gocharaClass(p.planet, house),
      favourableHouses: [...FAVOURABLE_HOUSES_FROM_MOON[p.planet]],
      isRetrograde: p.isRetrograde,
    };
    // A sign change before the next sunrise (in practice the Moon, occasionally a faster planet).
    const change = sky.events.find((e) => e.type === 'SIGN_INGRESS' && e.planet === p.planet && e.withinDay && e.toSign);
    if (change && change.toSign) {
      const h2 = houseFromSign(rashiIndex, change.toSign.index);
      g.changesTo = {
        sign: change.toSign,
        house: h2,
        classification: gocharaClass(p.planet, h2),
        atIso: change.timestampIso,
        timeIst: change.timeIst,
        dateIst: change.dateIst,
      };
    }
    return g;
  });

  const moon = planets.find((p) => p.planet === 'MOON');
  if (!moon) throw new RashiEngineError('Moon position missing');
  const fav = planets.filter((p) => p.classification === 'favourable');
  const dem = planets.filter((p) => p.classification === 'demanding');

  return {
    date: sky.date,
    rashi: { index: r.index, sanskritName: r.sanskritName, englishName: r.englishName, element: r.element, ruler: r.ruler },
    sky,
    moon,
    planets,
    tally: {
      favourable: fav.length,
      demanding: dem.length,
      total: planets.length,
      favourablePlanets: fav.map((p) => p.name),
      demandingPlanets: dem.map((p) => p.name),
      method:
        'Count of the nine grahas whose sign at sunrise falls in a classically favourable house from the Moon sign ' +
        '(Phaladeepika ch. 26 gochara table, without vedha). It is a plain count, not a score.',
    },
    method: {
      version: RASHI_METHOD_VERSION,
      summary:
        `Planet positions at sunrise in ${REFERENCE_LOCATION.name} (sidereal, Lahiri ayanamsa, mean nodes). ` +
        'Each planet\'s house is counted from your Moon sign (whole signs) and compared with the classical gochara table of favourable houses. ' +
        'Vedha (obstruction) is not applied.',
      vedha: 'not-applied',
      sources: ['Phaladeepika ch. 26 (Gochara Phala)', 'Brihat Parashara Hora Shastra (house and planet significations)'],
    },
  };
}
