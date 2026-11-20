import { ACTIVE_CONFIG, Handler, intParam } from '../common';
import { parseBirthInput, parseDate, toBirthDetails } from '../birth';
import { ProtocolError } from '../protocol';
import { LalKitabCalculator, LAL_KITAB_MAX_AGE, LAL_KITAB_MIN_AGE } from '@astro/astrology-engine';

/** Feature handlers: lal-kitab (calculation only, ADR-016 §1). Method names are listed in docs/sidecar-protocol.md. */
const calc = new LalKitabCalculator();

export const handlers: Record<string, Handler> = {
  'lalKitab.chart': async (p) => {
    const birth = parseBirthInput(p.birth);
    return calc.calculateChart(toBirthDetails(birth), ACTIVE_CONFIG);
  },

  'lalKitab.varshphal': async (p) => {
    const birth = parseBirthInput(p.birth);
    const hasAge = p.age !== undefined && p.age !== null;
    const hasYear = p.targetYear !== undefined && p.targetYear !== null;
    if (hasAge === hasYear) throw new ProtocolError('INVALID_PARAMS', 'give exactly one of age or targetYear');
    const birthYear = parseDate(birth.date, 'birth.date').year;
    const options = hasAge
      ? { age: intParam(p.age, 'age', LAL_KITAB_MIN_AGE, LAL_KITAB_MAX_AGE) }
      : { targetYear: intParam(p.targetYear, 'targetYear', birthYear + LAL_KITAB_MIN_AGE - 1, birthYear + LAL_KITAB_MAX_AGE - 1) };
    return calc.calculateVarshphal(toBirthDetails(birth), options, ACTIVE_CONFIG);
  },
};
