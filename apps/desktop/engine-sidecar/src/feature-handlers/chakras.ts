import { KotaChakraCalculator, SarvatobhadraChakraCalculator, TripatakiChakraCalculator } from '@astro/astrology-engine';
import { ACTIVE_CONFIG, chartCalc, Handler, intParam } from '../common';
import { parseBirthInput, toBirthDetails } from '../birth';

/**
 * Feature handlers: chakras (Sarvatobhadra, Kota, Tripataki progression). Method names are listed in
 * docs/sidecar-protocol.md. Parsing and shaping only; every value comes from the engine.
 * Sanghatta chakra is not exposed: no reliable published construction (still ❓).
 */
const sbc = new SarvatobhadraChakraCalculator(chartCalc);
const kota = new KotaChakraCalculator(chartCalc);
const tripataki = new TripatakiChakraCalculator(chartCalc);

function birthAndMoment(p: Record<string, unknown>) {
  const birth = toBirthDetails(parseBirthInput(p.birth, 'birth'));
  const moment = p.moment === undefined || p.moment === null ? undefined : toBirthDetails(parseBirthInput(p.moment, 'moment'));
  return { birth, moment };
}

export const handlers: Record<string, Handler> = {
  'chakra.sarvatobhadra': async (p) => {
    const { birth, moment } = birthAndMoment(p);
    return sbc.calculate(birth, moment, ACTIVE_CONFIG);
  },
  'chakra.kota': async (p) => {
    const { birth, moment } = birthAndMoment(p);
    return kota.calculate(birth, moment, ACTIVE_CONFIG);
  },
  'chakra.tripataki': async (p) => {
    const birth = toBirthDetails(parseBirthInput(p.birth, 'birth'));
    const targetYear = intParam(p.targetYear, 'targetYear', birth.date.year, birth.date.year + 150);
    return tripataki.calculate(birth, targetYear, ACTIVE_CONFIG);
  },
};
