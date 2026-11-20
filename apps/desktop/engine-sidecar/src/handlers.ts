/**
 * Method handlers: thin adapters from protocol params to @astro/astrology-engine calls.
 * No astrological rule lives here — every number is produced by the engine. Handlers only
 * parse/validate input, choose the engine's canonical configuration, and shape the JSON.
 */
import {
  AstroChart,
  ASTROLOGY_ENGINE_VERSION,
  AshtakavargaCalculator,
  AvakhadaChakraCalculator,
  ChartCalculator,
  ChartVariantsCalculator,
  ConventionRegistry,
  DashaRegistry,
  DayDivisionsCalculator,
  DEFAULT_ASTROLOGY_CONFIG,
  EclipseCalculator,
  GhatChakraCalculator,
  JaiminiCalculator,
  KPCalculator,
  MatchmakingCalculator,
  PanchangCalculator,
  PlanetSymbol,
  PlanetaryIntelligenceCalculator,
  PrashnaCalculator,
  ShadbalaCalculator,
  SpecialPointsCalculator,
  TaraChakraCalculator,
  TransitCalculator,
  VargaCalculator,
  VarshaphalaCalculator,
  VimshopakaCalculator,
  YogaCalculator,
  calculateBhavaBala,
  getOffsetMsAtUtc,
  getLocalPartsFromUtc,
  isValidIanaTimezone,
  calculateIshtaKashtaPhala,
  calculateSudarshanaChakra,
  normalizeAstroChart,
  normalizeVargaChart,
  AstrologyConfig,
  VargaType,
  PrashnaNumberSystem,
} from '@astro/astrology-engine';

const PRASHNA_SYSTEMS: PrashnaNumberSystem[] = ['PARASHARI_1_108', 'KP_1_249', 'AUTO'];
import {
  AYANAMSA_OPTIONS,
  BirthInput,
  DASHA_SYSTEMS,
  KP_CUSP_SYSTEM_OPTIONS,
  NODE_TYPE_OPTIONS,
  DashaSystemCode,
  MethodName,
  PROTOCOL_VERSION,
  ProtocolError,
  SIDECAR_VERSION,
  VARGA_TYPES,
  VargaCode,
} from './protocol';
import { isRecord, parseBirthInput, parseDate, parseLocation, toBirthDetails, toUtcIso } from './birth';

import {
  ACTIVE_CONFIG,
  chartCalc,
  chartFor,
  effectiveCalculationOptions,
  Handler,
  isoDate,
  offsetMinutes,
  optionalString,
} from './common';
import { featureHandlers } from './feature-handlers';

export { ACTIVE_CONFIG };

const vargaCalc = new VargaCalculator();
const panchangCalc = new PanchangCalculator();
const jaiminiCalc = new JaiminiCalculator(vargaCalc);
const dayDivCalc = new DayDivisionsCalculator();

function params(p: unknown): Record<string, unknown> {
  if (p === undefined || p === null) return {};
  if (!isRecord(p)) throw new ProtocolError('INVALID_PARAMS', 'params must be an object');
  return p;
}


/** Sunrise <= t < sunset of the local civil date (engine sunrise primitive). */
function isDayBirth(b: BirthInput): boolean {
  const d = parseDate(b.date);
  const bounds = dayDivCalc.calculateSolarDay({ date: d, timezone: b.timezone, latitude: b.latitude, longitude: b.longitude });
  const t = Date.parse(toUtcIso(b));
  return t >= Date.parse(bounds.sunriseIso) && t < Date.parse(bounds.sunsetIso);
}


interface DashaRequest {
  birth: BirthInput;
  system: DashaSystemCode;
  maxLevel: number;
  targetDate: Date;
  utcOffsetMinutes: number;
  totalCycleYears: number | undefined;
  chart: AstroChart;
}

async function parseDashaRequest(p: Record<string, unknown>): Promise<DashaRequest> {
  const birth = parseBirthInput(p.birth);
  const system = (optionalString(p.system, 'system') ?? 'VIMSHOTTARI') as DashaSystemCode;
  if (!(DASHA_SYSTEMS as readonly string[]).includes(system)) {
    throw new ProtocolError('INVALID_PARAMS', `system must be one of ${DASHA_SYSTEMS.join(', ')}`);
  }
  const maxLevel = p.maxLevel === undefined ? 3 : Number(p.maxLevel);
  if (!Number.isInteger(maxLevel) || maxLevel < 1 || maxLevel > 5) {
    throw new ProtocolError('INVALID_PARAMS', 'maxLevel must be an integer 1-5');
  }
  const targetDate = p.targetDate === undefined ? new Date() : isoDate(p.targetDate, 'targetDate');
  const chart = await chartFor(birth);
  return {
    birth,
    system,
    maxLevel,
    targetDate,
    chart,
    utcOffsetMinutes: chart.metadata.normalizedTime.timezoneOffsetMinutes,
    totalCycleYears: DashaRegistry.getDefinition(system)?.totalCycleYears,
  };
}

/**
 * Small LRU cache of full dasha results. Deep trees (5 levels, ~20 MB of JSON for Vimshottari)
 * are expensive, so the desktop app fetches levels 4-5 lazily with `dasha.subPeriods`; the
 * engine runs once per (birth, system, depth, target date) and later requests reuse the result.
 * Caching does not change any value: the engine is deterministic for identical inputs.
 */
const DASHA_CACHE_SIZE = 6;
const dashaCache = new Map<string, unknown>();

async function dashaResult(req: DashaRequest): Promise<unknown> {
  const key = JSON.stringify([req.birth, req.system, req.maxLevel, req.targetDate.toISOString(), ACTIVE_CONFIG.ayanamsa, ACTIVE_CONFIG.nodeCalculation]);
  if (dashaCache.has(key)) {
    const hit = dashaCache.get(key);
    dashaCache.delete(key);
    dashaCache.set(key, hit);
    return hit;
  }
  const result = DashaRegistry.calculateDasha(req.system, req.chart, { maxLevel: req.maxLevel, targetDate: req.targetDate });
  dashaCache.set(key, result);
  while (dashaCache.size > DASHA_CACHE_SIZE) dashaCache.delete(dashaCache.keys().next().value as string);
  return result;
}

/** Test hook: number of cached dasha results. */
export function dashaCacheSize(): number {
  return dashaCache.size;
}


export const handlers: Record<MethodName, Handler> = {
  ping: () => ({ pong: true }),

  'engine.info': () => ({
    methods: allMethodNames(),
    protocolVersion: PROTOCOL_VERSION,
    sidecarVersion: SIDECAR_VERSION,
    engineVersion: ASTROLOGY_ENGINE_VERSION,
    config: ACTIVE_CONFIG,
    options: {
      ayanamsa: AYANAMSA_OPTIONS,
      nodeType: NODE_TYPE_OPTIONS,
      kpCuspSystem: KP_CUSP_SYSTEM_OPTIONS,
      defaults: { ayanamsa: 'LAHIRI', nodeType: 'MEAN_NODE', kpCuspSystem: 'PLACIDUS' },
    },
    conventions: ConventionRegistry.getAllConventions(),
    dashaSystems: {
      implemented: DashaRegistry.getImplementedSystems(),
      pending: DashaRegistry.getPendingSystems(),
    },
  }),

  'chart.compute': async (p) => {
    const birth = parseBirthInput(p.birth);
    const chart = await chartFor(birth);
    const d9 = vargaCalc.calculateVarga(chart, 'D9');
    const utc = new Date(chart.metadata.normalizedTime.utcIsoString);
    return {
      birth,
      utcIso: chart.metadata.normalizedTime.utcIsoString,
      julianDayUT: chart.metadata.normalizedTime.julianDayUT,
      timezoneOffsetMinutes: chart.metadata.normalizedTime.timezoneOffsetMinutes,
      ayanamsa: chart.metadata.ayanamsa ? chart.metadata.ayanamsa.trueDegrees : 0,
      config: ACTIVE_CONFIG,
      options: effectiveCalculationOptions(),
      engineVersion: ASTROLOGY_ENGINE_VERSION,
      rasi: normalizeAstroChart(chart),
      navamsa: normalizeVargaChart(chart, d9),
      panchang: panchangCalc.calculatePanchangForDate(utc, { latitude: birth.latitude, longitude: birth.longitude }),
      isDayBirth: isDayBirth(birth),
    };
  },

  'vargas.compute': async (p) => {
    const birth = parseBirthInput(p.birth);
    let list: VargaCode[] = [...VARGA_TYPES];
    if (p.vargas !== undefined) {
      if (!Array.isArray(p.vargas) || p.vargas.some((v) => !(VARGA_TYPES as readonly string[]).includes(String(v)))) {
        throw new ProtocolError('INVALID_PARAMS', `vargas must be a subset of ${VARGA_TYPES.join(', ')}`);
      }
      list = p.vargas as VargaCode[];
    }
    const chart = await chartFor(birth);
    const out: Record<string, unknown> = {};
    for (const v of list) out[v] = vargaCalc.calculateVarga(chart, v as VargaType);
    return { vargas: out };
  },

  'dasha.compute': async (p) => {
    const req = await parseDashaRequest(p);
    return { system: req.system, utcOffsetMinutes: req.utcOffsetMinutes, totalCycleYears: req.totalCycleYears, result: await dashaResult(req) };
  },

  'dasha.subPeriods': async (p) => {
    const req = await parseDashaRequest(p);
    const path = p.path;
    if (!Array.isArray(path) || path.length === 0 || path.some((i) => !Number.isInteger(i) || (i as number) < 0)) {
      throw new ProtocolError('INVALID_PARAMS', 'path must be a non-empty array of non-negative integers');
    }
    const result = (await dashaResult(req)) as { mahadashas?: unknown[]; periods?: unknown[] };
    let list: unknown[] | undefined = result.mahadashas ?? result.periods;
    for (const i of path as number[]) {
      const node = list?.[i];
      if (!isRecord(node)) throw new ProtocolError('INVALID_PARAMS', 'path does not address a dasha period');
      list = Array.isArray(node.subPeriods) ? node.subPeriods : [];
    }
    return { system: req.system, utcOffsetMinutes: req.utcOffsetMinutes, path, periods: list ?? [] };
  },

  'panchang.compute': (p) => {
    const moment = parseBirthInput(p.moment, 'moment');
    const utc = new Date(toUtcIso(moment));
    const d = parseDate(moment.date);
    // calculateDailyPanchang takes the civil date as the UTC calendar fields of a Date plus the IANA
    // zone (the engine resolves local midnights itself), so pass the civil Y-M-D at 00:00 UTC.
    const civilDate = new Date(Date.UTC(d.year, d.month - 1, d.day));
    return {
      utcOffsetMinutes: offsetMinutes(utc.getTime(), moment.timezone),
      instant: panchangCalc.calculatePanchangForDate(utc, { withBoundaries: true, latitude: moment.latitude, longitude: moment.longitude }),
      daily: panchangCalc.calculateDailyPanchang(civilDate, moment.latitude, moment.longitude, moment.timezone),
      dayDivisions: dayDivCalc.calculate({ date: d, timezone: moment.timezone, latitude: moment.latitude, longitude: moment.longitude }),
    };
  },

  'dayDivisions.compute': (p) => {
    const loc = parseLocation(p.location);
    const report = dayDivCalc.calculate({ date: parseDate(p.date), timezone: loc.timezone, latitude: loc.latitude, longitude: loc.longitude });
    return { ...report, utcOffsetMinutes: offsetMinutes(Date.parse(report.bounds.sunriseIso), loc.timezone) };
  },

  'ashtakavarga.compute': async (p) => new AshtakavargaCalculator().calculateAshtakavarga(await chartFor(parseBirthInput(p.birth))),

  'strength.compute': async (p) => {
    const chart = await chartFor(parseBirthInput(p.birth));
    const shadbala = new ShadbalaCalculator(vargaCalc).calculateShadbala(chart);
    return {
      shadbala,
      bhavaBala: calculateBhavaBala(chart, shadbala),
      ishtaKashta: calculateIshtaKashtaPhala(shadbala),
      vimshopaka: new VimshopakaCalculator(vargaCalc).calculateVimshopaka(chart),
    };
  },

  'transit.compute': async (p) => {
    const moment = parseBirthInput(p.moment, 'moment');
    const natal = p.birth === undefined ? undefined : await chartFor(parseBirthInput(p.birth));
    const utcIso = toUtcIso(moment);
    const snapshot = await new TransitCalculator().calculateTransitSnapshot(
      {
        timestampIso: utcIso,
        timezone: moment.timezone,
        location: { latitude: moment.latitude, longitude: moment.longitude, timezone: moment.timezone, placeName: moment.placeName },
      },
      natal,
      ACTIVE_CONFIG,
      ['D1', 'D9'],
    );
    return { utcOffsetMinutes: offsetMinutes(Date.parse(utcIso), moment.timezone), ...snapshot };
  },

  'transitTimeline.compute': async (p) => {
    const start = isoDate(p.startIso, 'startIso');
    const end = isoDate(p.endIso, 'endIso');
    if (end.getTime() - start.getTime() > 3 * 366 * 86400000 || end <= start) {
      throw new ProtocolError('INVALID_PARAMS', 'timeline range must be positive and at most 3 years');
    }
    const timezone = optionalString(p.timezone, 'timezone');
    if (timezone !== undefined && !isValidIanaTimezone(timezone)) {
      throw new ProtocolError('INVALID_PARAMS', 'timezone must be a valid IANA timezone');
    }
    const timeline = await new TransitCalculator().calculateTransitTimeline({
      startDateIso: start.toISOString(),
      endDateIso: end.toISOString(),
      timezone,
    });
    if (timezone === undefined) return timeline;
    // Display aid only: the zone's UTC offset at each event instant (engine timezone solver), so
    // the client can show local times correctly across DST changes.
    return {
      ...timeline,
      events: timeline.events.map((e) => ({ ...e, utcOffsetMinutes: offsetMinutes(Date.parse(e.timestampIso), timezone) })),
    };
  },

  'matchmaking.compute': async (p) => {
    const [boy, girl] = await Promise.all([chartFor(parseBirthInput(p.boy, 'boy')), chartFor(parseBirthInput(p.girl, 'girl'))]);
    return new MatchmakingCalculator().evaluateCompatibility(boy, girl, { personALabel: 'Boy', personBLabel: 'Girl' });
  },

  'yogas.compute': async (p) => new YogaCalculator().evaluateYogas(await chartFor(parseBirthInput(p.birth)), {}),

  'kp.compute': async (p) => {
    const birth = parseBirthInput(p.birth);
    const chart = await chartFor(birth);
    return new KPCalculator().calculateKP(chart, new Date(chart.metadata.normalizedTime.utcIsoString), isDayBirth(birth));
  },

  'jaimini.compute': async (p) => jaiminiCalc.calculateFromChart(await chartFor(parseBirthInput(p.birth)), 'SEVEN_KARAKA'),

  'specialPoints.compute': async (p) => {
    const birth = parseBirthInput(p.birth);
    const chart = await chartFor(birth);
    return {
      specialPoints: new SpecialPointsCalculator(panchangCalc).calculateFromChart(
        chart,
        new Date(chart.metadata.normalizedTime.utcIsoString),
        birth.latitude,
        birth.longitude,
      ),
      planetaryIntelligence: new PlanetaryIntelligenceCalculator().calculateFromChart(chart),
    };
  },

  'chartVariants.compute': async (p) =>
    new ChartVariantsCalculator(vargaCalc, jaiminiCalc).calculateAllVariants(await chartFor(parseBirthInput(p.birth))),

  'avakhada.compute': async (p) => {
    const chart = await chartFor(parseBirthInput(p.birth));
    const moon = chart.planets[PlanetSymbol.MOON];
    if (!chart.ascendant) throw new ProtocolError('CALCULATION_ERROR', 'Ascendant could not be calculated');
    return {
      avakhada: AvakhadaChakraCalculator.calculateAvakhada(moon.longitude, chart.ascendant.rashiIndex),
      ghat: GhatChakraCalculator.calculateGhatChakra(moon.rashiIndex),
      tara: TaraChakraCalculator.calculateTaraChakra(moon.nakshatraIndex),
    };
  },

  'sudarshana.compute': async (p) => calculateSudarshanaChakra(await chartFor(parseBirthInput(p.birth))),

  'varshaphala.compute': async (p) => {
    const birth = parseBirthInput(p.birth);
    const targetYear = Number(p.targetYear);
    if (!Number.isInteger(targetYear) || targetYear < 1800 || targetYear > 2200) {
      throw new ProtocolError('INVALID_PARAMS', 'targetYear must be an integer 1800-2200');
    }
    const loc = p.location === undefined ? { latitude: birth.latitude, longitude: birth.longitude, timezone: birth.timezone, placeName: birth.placeName } : parseLocation(p.location);
    return new VarshaphalaCalculator(chartCalc, panchangCalc).calculateVarshaphala(
      toBirthDetails(birth),
      { targetYear, annualLocation: loc },
      ACTIVE_CONFIG,
    );
  },

  'prashna.compute': async (p) => {
    const moment = parseBirthInput(p.moment, 'moment');
    const qn = p.questionNumber === undefined ? undefined : Number(p.questionNumber);
    const system = optionalString(p.questionNumberSystem, 'questionNumberSystem');
    if (system !== undefined && !PRASHNA_SYSTEMS.includes(system as PrashnaNumberSystem)) {
      throw new ProtocolError('INVALID_PARAMS', `questionNumberSystem must be one of ${PRASHNA_SYSTEMS.join(', ')}`);
    }
    return new PrashnaCalculator(chartCalc, panchangCalc).calculatePrashna(
      {
        questionTimestamp: toUtcIso(moment),
        timezone: moment.timezone,
        location: { latitude: moment.latitude, longitude: moment.longitude, timezone: moment.timezone, placeName: moment.placeName },
        questionNumber: qn,
        questionNumberSystem: system as PrashnaNumberSystem | undefined,
      },
      ACTIVE_CONFIG,
    );
  },

  'time.local': (p) => {
    const timezone = p.timezone;
    if (typeof timezone !== 'string' || !isValidIanaTimezone(timezone)) {
      throw new ProtocolError('INVALID_PARAMS', 'timezone must be a valid IANA timezone');
    }
    const utcMs = p.utcIso === undefined ? Date.now() : isoDate(p.utcIso, 'utcIso').getTime();
    const l = getLocalPartsFromUtc(utcMs, timezone);
    const pad = (n: number) => String(n).padStart(2, '0');
    return {
      utcIso: new Date(utcMs).toISOString(),
      date: `${l.year}-${pad(l.month)}-${pad(l.day)}`,
      time: `${pad(l.hour)}:${pad(l.minute)}:${pad(l.second)}`,
      utcOffsetMinutes: offsetMinutes(utcMs, timezone),
    };
  },

  'eclipses.find': (p) => {
    const start = isoDate(p.startIso, 'startIso');
    const end = isoDate(p.endIso, 'endIso');
    if (end.getTime() - start.getTime() > 25 * 366 * 86400000) {
      throw new ProtocolError('INVALID_PARAMS', 'eclipse range must be at most 25 years');
    }
    return { eclipses: new EclipseCalculator(panchangCalc).findEclipses(start, end) };
  },
};

export function getHandler(method: string): Handler | undefined {
  if (Object.prototype.hasOwnProperty.call(handlers, method)) return handlers[method as MethodName];
  return Object.prototype.hasOwnProperty.call(featureHandlers, method) ? featureHandlers[method] : undefined;
}

/** Every method this sidecar answers (core protocol methods plus feature modules). */
export function allMethodNames(): string[] {
  return [...Object.keys(handlers), ...Object.keys(featureHandlers)];
}

export { params as normalizeParams };
