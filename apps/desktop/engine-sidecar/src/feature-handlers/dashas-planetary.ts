import {
  PatyayiniDashaCalculator,
  PatyayiniPeriod,
  PlanetaryDashaExtendedRegistry,
  PLANETARY_EXT_DASHA_SYSTEMS,
} from '@astro/astrology-engine';
import { ACTIVE_CONFIG, chartFor, Handler, intParam, isoDate, offsetMinutes, optionalString } from '../common';
import { parseBirthInput, parseLocation, toBirthDetails } from '../birth';
import { ProtocolError } from '../protocol';

/** Feature handlers: dashas-planetary. Method names are listed in docs/sidecar-protocol.md. */
const patyayiniCalc = new PatyayiniDashaCalculator();

export const handlers: Record<string, Handler> = {
  'dashaExt.planetary.list': () => ({ systems: PlanetaryDashaExtendedRegistry.listSystems() }),

  'dashaExt.planetary.compute': async (p) => {
    const birth = parseBirthInput(p.birth);
    const system = optionalString(p.system, 'system');
    if (!system || !PlanetaryDashaExtendedRegistry.isSupported(system)) {
      throw new ProtocolError('INVALID_PARAMS', `system must be one of ${PLANETARY_EXT_DASHA_SYSTEMS.join(', ')}`);
    }
    const maxLevel = intParam(p.maxLevel, 'maxLevel', 1, 3, 2);
    const targetDate = p.targetDate === undefined ? new Date() : isoDate(p.targetDate, 'targetDate');
    const chart = await chartFor(birth);
    return {
      system,
      utcOffsetMinutes: chart.metadata.normalizedTime.timezoneOffsetMinutes,
      result: PlanetaryDashaExtendedRegistry.calculate(system, chart, { maxLevel, targetDate }, ACTIVE_CONFIG),
    };
  },

  'dashaExt.patyayini': async (p) => {
    const birth = parseBirthInput(p.birth);
    const targetYear = intParam(p.targetYear, 'targetYear', 1800, 2399);
    if (targetYear < Number(birth.date.slice(0, 4))) {
      throw new ProtocolError('INVALID_PARAMS', 'targetYear must not be before the birth year');
    }
    const location = p.location === undefined ? undefined : parseLocation(p.location);
    const maxLevel = intParam(p.maxLevel, 'maxLevel', 1, 3, 2);
    const targetDate = p.targetDate === undefined ? undefined : isoDate(p.targetDate, 'targetDate');
    const result = await patyayiniCalc.calculate(
      toBirthDetails(birth),
      { targetYear, annualLocation: location, maxLevel, targetDate },
      ACTIVE_CONFIG
    );
    // Display shaping only: the annual place's UTC offset at the start of every period (DST-aware).
    const tz = result.annualLocation.timezone;
    const annotate = (list: PatyayiniPeriod[]): Array<PatyayiniPeriod & { utcOffsetMinutes: number }> =>
      list.map((n) => {
        const out: PatyayiniPeriod & { utcOffsetMinutes: number } = { ...n, utcOffsetMinutes: offsetMinutes(Date.parse(n.startDateIso), tz) };
        if (n.subPeriods) out.subPeriods = annotate(n.subPeriods);
        return out;
      });
    return { ...result, utcOffsetMinutes: offsetMinutes(Date.parse(result.solarReturnUtcIso), tz), periods: annotate(result.periods) };
  },
};
