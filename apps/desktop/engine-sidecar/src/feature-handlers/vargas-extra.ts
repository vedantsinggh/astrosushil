import {
  BhriguBinduCalculator,
  EXTRA_VARGA_TYPES,
  ExtraVargaCalculator,
  ExtraVargaChart,
  ExtraVargaType,
  PushkaraCalculator,
} from '@astro/astrology-engine';
import { Handler, chartFor, stringList } from '../common';
import { parseBirthInput } from '../birth';

/**
 * Feature handlers: vargas-extra (ADR-016 §6, provisional conventions). Parsing and shaping only;
 * every number comes from the engine (packages/astrology-engine/src/varga-extended).
 *
 *  - vargasExtra.compute  { birth, vargas?: ('D5'|'D6'|'D8'|'D11'|'D81'|'D108'|'D144'|'D150')[] }
 *      -> { vargas: { D5: ExtraVargaChart, ... }, provisional: true }   (VargaChart shape + provisional/source/conventionNotes)
 *  - pushkara.compute     { birth } -> PushkaraResult (bodies, reference table, provisional, source, conventionNotes)
 *  - bhriguBindu.compute  { birth } -> BhriguBinduResult
 */
const extraVargaCalc = new ExtraVargaCalculator();
const pushkaraCalc = new PushkaraCalculator();
const bhriguCalc = new BhriguBinduCalculator();

export const handlers: Record<string, Handler> = {
  'vargasExtra.compute': async (p) => {
    const birth = parseBirthInput(p.birth);
    const list = (stringList(p.vargas, 'vargas', EXTRA_VARGA_TYPES) ?? [...EXTRA_VARGA_TYPES]) as ExtraVargaType[];
    const chart = await chartFor(birth);
    const vargas: Partial<Record<ExtraVargaType, ExtraVargaChart>> = {};
    for (const v of list) vargas[v] = extraVargaCalc.calculateFromChart(chart, v);
    return { vargas, provisional: true };
  },

  'pushkara.compute': async (p) => {
    const chart = await chartFor(parseBirthInput(p.birth));
    return pushkaraCalc.calculateFromChart(chart);
  },

  'bhriguBindu.compute': async (p) => {
    const chart = await chartFor(parseBirthInput(p.birth));
    return bhriguCalc.calculateFromChart(chart);
  },
};
