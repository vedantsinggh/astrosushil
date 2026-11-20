import { calculateDashakoota, calculatePorutham, southMatchPersonFromChart } from '@astro/astrology-engine';
import { chartFor, Handler } from '../common';
import { parseBirthInput } from '../birth';

/**
 * Feature handlers: matching-south (South Indian Porutham and Dashakoota, ADR-016 §4).
 * Parsing and shaping only: both charts come from the engine with ACTIVE_CONFIG and every koota is
 * evaluated by the engine. Method names are listed in docs/sidecar-protocol.md.
 */
async function profiles(p: Record<string, unknown>) {
  const boyBirth = parseBirthInput(p.boy, 'boy');
  const girlBirth = parseBirthInput(p.girl, 'girl');
  const [boy, girl] = await Promise.all([chartFor(boyBirth), chartFor(girlBirth)]);
  return { boy: southMatchPersonFromChart(boy, 'Boy'), girl: southMatchPersonFromChart(girl, 'Girl') };
}

export const handlers: Record<string, Handler> = {
  'matching.porutham': async (p) => {
    const { boy, girl } = await profiles(p);
    return calculatePorutham(boy, girl);
  },
  'matching.dashakoota': async (p) => {
    const { boy, girl } = await profiles(p);
    return calculateDashakoota(boy, girl);
  },
};
