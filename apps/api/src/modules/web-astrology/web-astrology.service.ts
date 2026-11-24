import { createHash } from 'crypto';
import {
  AstroChart,
  AstrologyConfig,
  AvakhadaChakraCalculator,
  BirthDetailsValidationError,
  BirthTimeAmbiguousError,
  BirthTimeNonexistentError,
  ChartCalculator,
  DashaRegistry,
  MatchmakingCalculator,
  NormalizedChart,
  PanchangCalculator,
  PlanetSymbol,
  SadeSatiPeriodsCalculator,
  UnconfirmedMethodologyError,
  VimshottariDashaTree,
  normalizeAstroChart,
} from '@astro/astrology-engine';
import type { LocationSearchResult } from '@astro/shared';
import { AppError, ValidationError } from '../../errors/app-error';
import { mapDirectBirthDetailsToBirthDetails } from '../astrology/birth-details.mapper';
import { locationService } from '../locations/locations.service';
import { rashiBhavishyaService } from '../rashi-bhavishya/rashi-bhavishya.service';
import type { RashiBhavishyaQuery } from '../rashi-bhavishya/rashi-bhavishya.schemas';
import {
  KundliEngineFacts,
  WebPlace,
  mapAntarDasha,
  mapAshtakootPoints,
  mapAstroDetails,
  mapBasicPanchang,
  mapBirthChart,
  mapMajorDasha,
  mapManglik,
  mapMatchBirthDetails,
  mapMatchMakingReport,
  mapMatchManglikReport,
  mapMatchPercentage,
  mapMatchPlanetDetails,
  mapPlace,
  mapPlanets,
  mapSadeSatiStatus,
} from './web-astrology.mapper';
import { KundliLabel, MatchLabel, WebDailyHoroscopeBody, WebKundliQuery, WebMatchQuery, parseWebsiteDate } from './web-astrology.schemas';
import { PlaceTimezoneMemo, TimezoneSource, resolveBirthTimezone } from './web-astrology.timezone';

/**
 * Website-compatible astrology: the free kundli, match-making, daily horoscope and place search of
 * astrosushil.com, answered by this backend's own engine instead of the paid vendor.
 *
 * Every value comes from packages/astrology-engine (deterministic, no LLM, no external astrology
 * API). This class only decides WHICH engine calculations a request needs, runs them once, and
 * hands the results to the mapper.
 */

/**
 * The API's default calculation conventions (ADR-017): the same object AstrologyService uses when a
 * request names no ayanamsa or node type. tests/unit/web-astrology-engine.test.ts checks that a
 * chart from here is identical to one from `POST /astrology/kundli`.
 */
export const WEB_ASTROLOGY_CONFIG: AstrologyConfig = {
  zodiacType: 'SIDEREAL',
  ayanamsa: 'LAHIRI',
  houseSystem: 'WHOLE_SIGN',
  nodeCalculation: 'MEAN_NODE',
  planetaryCalculationMode: 'GEOCENTRIC',
  precisionDegrees: 0.0001,
  roundingRule: 'NEAREST',
  dashaSystem: 'VIMSHOTTARI',
};

/** Years before and after today covered by the Sade Sati table (one cycle lasts about 7.5 years). */
const SADE_SATI_WINDOW_YEARS = 10;

const RESULT_TTL_MS = 6 * 60 * 60 * 1000;
const RESULT_MAX_ENTRIES = 2000;

/**
 * Identical requests are answered from memory (and concurrent identical requests share one
 * calculation), so repeating a request cannot be used to keep the server calculating (finding 8).
 * Results are deterministic for a given request and day.
 */
export class ResultCache {
  private readonly entries = new Map<string, { value: unknown; expiresAt: number }>();
  private readonly inFlight = new Map<string, Promise<unknown>>();

  constructor(
    private readonly ttlMs: number = RESULT_TTL_MS,
    private readonly maxEntries: number = RESULT_MAX_ENTRIES,
    private readonly now: () => number = () => Date.now()
  ) {}

  public static key(scope: string, value: unknown): string {
    return `${scope}:${createHash('sha256').update(JSON.stringify(value)).digest('hex')}`;
  }

  public async getOrCompute<T>(key: string, compute: () => Promise<T>): Promise<{ value: T; cached: boolean }> {
    const hit = this.entries.get(key);
    if (hit && hit.expiresAt > this.now()) return { value: hit.value as T, cached: true };
    const running = this.inFlight.get(key);
    if (running) return { value: (await running) as T, cached: true };
    const promise = compute();
    this.inFlight.set(key, promise);
    try {
      const value = await promise;
      if (this.entries.size >= this.maxEntries) {
        const oldest = this.entries.keys().next().value;
        if (oldest !== undefined) this.entries.delete(oldest);
      }
      this.entries.set(key, { value, expiresAt: this.now() + this.ttlMs });
      return { value, cached: false };
    } finally {
      this.inFlight.delete(key);
    }
  }

  public clear(): void {
    this.entries.clear();
  }
}

export interface WebBirthInput {
  /** YYYY-MM-DD */
  dateOfBirth: string;
  hour: number;
  minute: number;
  latitude: number;
  longitude: number;
  timezone: string;
}

export interface PersonCalculation {
  raw: AstroChart;
  facts: KundliEngineFacts;
}

interface HoroscopeSource {
  getTodayPrediction(userId: string | undefined, query?: RashiBhavishyaQuery): Promise<{ data: unknown }>;
}

interface PlaceSearchSource {
  searchPlaces(query: string, limit?: number): Promise<LocationSearchResult[]>;
}

export interface WebAstrologyDeps {
  chartCalculator?: ChartCalculator;
  places?: PlaceSearchSource;
  horoscope?: HoroscopeSource;
  timezones?: PlaceTimezoneMemo;
  cache?: ResultCache;
  now?: () => Date;
}

export interface WebTimezoneNote {
  timezone: string;
  source: TimezoneSource;
  utc_offset_minutes: number;
}

const pad = (n: number): string => String(n).padStart(2, '0');

export class WebAstrologyService {
  private readonly chartCalculator: ChartCalculator;
  private readonly matchmaking = new MatchmakingCalculator();
  private readonly panchang = new PanchangCalculator();
  private readonly sadeSati = new SadeSatiPeriodsCalculator(undefined, WEB_ASTROLOGY_CONFIG);
  private readonly places: PlaceSearchSource;
  private readonly horoscope: HoroscopeSource;
  public readonly timezones: PlaceTimezoneMemo;
  private readonly cache: ResultCache;
  private readonly now: () => Date;

  constructor(deps: WebAstrologyDeps = {}) {
    this.chartCalculator = deps.chartCalculator ?? new ChartCalculator();
    this.places = deps.places ?? locationService;
    this.horoscope = deps.horoscope ?? rashiBhavishyaService;
    this.timezones = deps.timezones ?? new PlaceTimezoneMemo();
    this.cache = deps.cache ?? new ResultCache();
    this.now = deps.now ?? (() => new Date());
  }

  // ---- engine calls ------------------------------------------------------------------------

  /** One chart and the birth-instant facts every section is mapped from. */
  public async calculatePerson(input: WebBirthInput): Promise<PersonCalculation> {
    let raw: AstroChart;
    try {
      raw = await this.chartCalculator.calculateChart(
        mapDirectBirthDetailsToBirthDetails({
          name: 'Website chart',
          dateOfBirth: input.dateOfBirth,
          timeOfBirth: `${pad(input.hour)}:${pad(input.minute)}:00`,
          latitude: input.latitude,
          longitude: input.longitude,
          timezone: input.timezone,
        }),
        WEB_ASTROLOGY_CONFIG
      );
    } catch (error) {
      // Same translation as AstrologyService.calculateChartForDirectInput.
      if (error instanceof BirthTimeAmbiguousError || error instanceof BirthTimeNonexistentError) {
        throw new ValidationError(error.message, [
          {
            field: 'hour',
            message: error.message,
            code: error instanceof BirthTimeAmbiguousError ? 'AMBIGUOUS_LOCAL_TIME' : 'NONEXISTENT_LOCAL_TIME',
            timezone: error.timezone,
          },
        ]);
      }
      if (error instanceof BirthDetailsValidationError) throw new ValidationError(error.message);
      if (error instanceof UnconfirmedMethodologyError) throw new AppError(error.message, 400, 'UNCONFIRMED_METHODOLOGY');
      throw error;
    }

    const chart: NormalizedChart = normalizeAstroChart(raw);
    const sun = raw.planets[PlanetSymbol.SUN];
    const moon = raw.planets[PlanetSymbol.MOON];
    if (!sun || !moon || !raw.ascendant) {
      throw new AppError('The chart could not be calculated completely', 500, 'ASTROLOGY_CALCULATION_INVALID');
    }
    const birthUtc = new Date(raw.metadata.normalizedTime.utcIsoString);
    const [year, month, day] = input.dateOfBirth.split('-').map(Number);
    return {
      raw,
      facts: {
        chart,
        avakhada: AvakhadaChakraCalculator.calculateAvakhada(moon.longitude, raw.ascendant.rashiIndex),
        // Tithi, nakshatra, yoga and karana at the birth instant, from the chart's own Sun and Moon.
        panchang: this.panchang.calculatePanchang(sun.longitude, moon.longitude, birthUtc),
        // Sunrise and sunset of the local civil date of birth, searched from local midnight in the birth zone.
        sun: this.panchang.calculateSunriseSunset(new Date(Date.UTC(year, month - 1, day)), input.latitude, input.longitude, input.timezone),
        timezone: input.timezone,
        dateOfBirth: input.dateOfBirth,
      },
    };
  }

  private vimshottari(raw: AstroChart): VimshottariDashaTree {
    const tree = DashaRegistry.calculateDasha('VIMSHOTTARI', raw, { maxLevel: 2 });
    if (!('mahadashas' in tree) || !Array.isArray(tree.mahadashas)) {
      throw new AppError('Vimshottari periods could not be calculated for this chart', 500, 'ASTROLOGY_CALCULATION_INVALID');
    }
    return tree as VimshottariDashaTree;
  }

  private async sadeSatiStatus(raw: AstroChart, now: Date) {
    const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    const start = new Date(today);
    start.setUTCFullYear(start.getUTCFullYear() - SADE_SATI_WINDOW_YEARS);
    const end = new Date(today);
    end.setUTCFullYear(end.getUTCFullYear() + SADE_SATI_WINDOW_YEARS);
    const table = await this.sadeSati.calculate({
      natalMoonLongitude: raw.planets[PlanetSymbol.MOON].longitude,
      startIso: start.toISOString(),
      endIso: end.toISOString(),
    });
    return mapSadeSatiStatus(table, now);
  }

  private timezoneNote(calc: PersonCalculation, source: TimezoneSource): WebTimezoneNote {
    return {
      timezone: calc.facts.timezone,
      source,
      utc_offset_minutes: calc.raw.metadata.normalizedTime.timezoneOffsetMinutes,
    };
  }

  // ---- free kundli -------------------------------------------------------------------------

  public async kundli(query: WebKundliQuery): Promise<Record<string, unknown>> {
    const date = parseWebsiteDate(query.dob, this.now());
    if (!date) throw new ValidationError('Invalid date of birth', [{ field: 'dob', message: 'Not a valid date' }]);
    const tz = await resolveBirthTimezone(this.timezones, query);
    const now = this.now();
    const input: WebBirthInput = {
      dateOfBirth: date.iso,
      hour: query.hour,
      minute: query.min,
      latitude: query.latitude,
      longitude: query.longitude,
      timezone: tz.timezone,
    };
    const labels: readonly KundliLabel[] = query.label;
    // Sade Sati status changes with the calendar day, so the day is part of the key.
    const key = ResultCache.key('kundli', { input, labels, day: now.toISOString().slice(0, 10) });
    const { value } = await this.cache.getOrCompute(key, async () => {
      const calc = await this.calculatePerson(input);
      const out: Record<string, unknown> = {};
      const wants = (label: KundliLabel) => labels.includes(label);
      if (wants('astro_details')) out.astro_details = mapAstroDetails(calc.facts);
      if (wants('basic_panchang')) out.basic_panchang = mapBasicPanchang(calc.facts);
      if (wants('planets')) out.planets = mapPlanets(calc.facts.chart);
      if (wants('manglik')) out.manglik = mapManglik(this.matchmaking.evaluateManglikDosha(calc.raw));
      if (wants('sadhesati_current_status')) out.sadhesati_current_status = await this.sadeSatiStatus(calc.raw, now);
      if (wants('vimshottri_major_vdasha') || wants('vimshottri_antar_vdasha')) {
        const tree = this.vimshottari(calc.raw);
        if (wants('vimshottri_major_vdasha')) out.vimshottri_major_vdasha = mapMajorDasha(tree.mahadashas);
        if (wants('vimshottri_antar_vdasha')) out.vimshottri_antar_vdasha = mapAntarDasha(tree.mahadashas);
      }
      if (wants('birth_chart')) out.birth_chart = mapBirthChart(calc.facts.chart);
      out.calculation = {
        ...this.timezoneNote(calc, tz.source),
        ayanamsa: WEB_ASTROLOGY_CONFIG.ayanamsa,
        house_system: WEB_ASTROLOGY_CONFIG.houseSystem,
        node: WEB_ASTROLOGY_CONFIG.nodeCalculation,
        engine_version: calc.raw.metadata.engineVersion,
      };
      return out;
    });
    return value;
  }

  // ---- match-making ------------------------------------------------------------------------

  public async matchMaking(query: WebMatchQuery): Promise<Record<string, unknown>> {
    const now = this.now();
    const maleDate = parseWebsiteDate(query.male_dob, now);
    const femaleDate = parseWebsiteDate(query.female_dob, now);
    if (!maleDate) throw new ValidationError('Invalid date of birth', [{ field: 'male_dob', message: 'Not a valid date' }]);
    if (!femaleDate) throw new ValidationError('Invalid date of birth', [{ field: 'female_dob', message: 'Not a valid date' }]);
    const maleTz = await resolveBirthTimezone(
      this.timezones,
      { latitude: query.male_lat, longitude: query.male_long, timezone: query.male_timezone },
      'male_timezone'
    );
    const femaleTz = await resolveBirthTimezone(
      this.timezones,
      { latitude: query.female_lat, longitude: query.female_long, timezone: query.female_timezone },
      'female_timezone'
    );
    const male: WebBirthInput = {
      dateOfBirth: maleDate.iso,
      hour: query.male_hour,
      minute: query.male_min,
      latitude: query.male_lat,
      longitude: query.male_long,
      timezone: maleTz.timezone,
    };
    const female: WebBirthInput = {
      dateOfBirth: femaleDate.iso,
      hour: query.female_hour,
      minute: query.female_min,
      latitude: query.female_lat,
      longitude: query.female_long,
      timezone: femaleTz.timezone,
    };
    const labels: readonly MatchLabel[] = query.label;
    // Names are deliberately not part of the key or of any calculation.
    const key = ResultCache.key('match', { male, female, labels });
    const { value } = await this.cache.getOrCompute(key, async () => {
      const [boy, girl] = await Promise.all([this.calculatePerson(male), this.calculatePerson(female)]);
      // Same call and labels as POST /astrology/matchmaking: person A is the boy, person B the girl.
      const result = this.matchmaking.evaluateCompatibility(boy.raw, girl.raw, { personALabel: 'Boy', personBLabel: 'Girl' });
      const out: Record<string, unknown> = {};
      const wants = (label: MatchLabel) => labels.includes(label);
      if (wants('match_ashtakoot_points')) out.match_ashtakoot_points = mapAshtakootPoints(result.ashtakoota);
      if (wants('match_birth_details')) {
        out.match_birth_details = {
          male_astro_details: mapMatchBirthDetails(
            { year: maleDate.year, month: maleDate.month, day: maleDate.day, hour: male.hour, minute: male.minute, latitude: male.latitude, longitude: male.longitude },
            boy.facts
          ),
          female_astro_details: mapMatchBirthDetails(
            { year: femaleDate.year, month: femaleDate.month, day: femaleDate.day, hour: female.hour, minute: female.minute, latitude: female.latitude, longitude: female.longitude },
            girl.facts
          ),
        };
      }
      if (wants('match_astro_details')) {
        out.match_astro_details = { male_astro_details: mapAstroDetails(boy.facts), female_astro_details: mapAstroDetails(girl.facts) };
      }
      if (wants('match_percentage')) out.match_percentage = mapMatchPercentage(result.ashtakoota);
      if (wants('match_making_report')) out.match_making_report = mapMatchMakingReport(result.ashtakoota);
      if (wants('match_manglik_report')) out.match_manglik_report = mapMatchManglikReport(result.manglikComparison);
      if (wants('match_planet_details')) {
        out.match_planet_details = {
          male_planet_details: mapMatchPlanetDetails(boy.facts.chart),
          female_planet_details: mapMatchPlanetDetails(girl.facts.chart),
        };
      }
      out.calculation = {
        male: this.timezoneNote(boy, maleTz.source),
        female: this.timezoneNote(girl, femaleTz.source),
        convention: result.convention.name,
        ayanamsa: WEB_ASTROLOGY_CONFIG.ayanamsa,
        engine_version: boy.raw.metadata.engineVersion,
      };
      return out;
    });
    return value;
  }

  // ---- daily horoscope ---------------------------------------------------------------------

  /** The website's request mapped onto GET /rashi-bhavishya/today; that service stores and reuses each day's text. */
  public async dailyHoroscope(body: WebDailyHoroscopeBody): Promise<unknown> {
    const query: RashiBhavishyaQuery = {
      rashiIndex: body.rashiIndex,
      rashi: body.rashiIndex === undefined ? body.sign ?? body.zodiac ?? body.rashi : undefined,
      date: body.date,
      language: body.language ?? body.lang,
    };
    // No user is passed: a public request names its sign and never reads anyone's birth profile.
    const result = await this.horoscope.getTodayPrediction(undefined, query);
    return result.data;
  }

  // ---- place search ------------------------------------------------------------------------

  public async geoDetails(place: string): Promise<WebPlace[]> {
    const key = ResultCache.key('geo', place.trim().toLowerCase());
    const { value } = await this.cache.getOrCompute(key, async () => {
      const results = await this.places.searchPlaces(place, 10);
      return results.map(mapPlace);
    });
    // Remembered on every answer (also a cached one), so a kundli request that follows with these
    // coordinates and no `timezone` gets the place's real zone.
    await Promise.all(value.map((p) => this.timezones.remember(p.location.latitude, p.location.longitude, p.timezone)));
    return value;
  }

  /** Test helper. */
  public clearCache(): void {
    this.cache.clear();
  }
}

export const webAstrologyService = new WebAstrologyService();
