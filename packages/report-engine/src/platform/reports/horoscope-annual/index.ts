/**
 * Personalised (annual) Horoscope report module.
 */
import { ReportModule } from '../../module';
import { BlockRenderer } from '../../render/blocks';
import {
  EXT_KEY, horoscopeArea, horoscopeFastTable, horoscopeGochara, horoscopeLucky, horoscopeNumerology, horoscopeSlowTable,
  horoscopeSynopsis, horoscopeWindows,
} from './blocks';
import { computeHoroscopeYear, HORO_AREAS, HoroscopeYearData } from './calc/horoscope-year';
import { addHoroscopeEvidence } from './evidence';
import { HOROSCOPE_ANNUAL_DEFINITION } from './horoscope-annual.definition';

const areaBlocks: Record<string, BlockRenderer> = Object.fromEntries(HORO_AREAS.map((a) => [`horoscope-area-${a.key}`, horoscopeArea(a.key)]));

export const HOROSCOPE_ANNUAL_MODULE: ReportModule = {
  definition: HOROSCOPE_ANNUAL_DEFINITION,
  blocks: {
    'horoscope-synopsis': horoscopeSynopsis,
    'horoscope-windows': horoscopeWindows,
    'horoscope-gochara': horoscopeGochara,
    'horoscope-slow-table': horoscopeSlowTable,
    'horoscope-fast-table': horoscopeFastTable,
    'horoscope-lucky': horoscopeLucky,
    'horoscope-numerology': horoscopeNumerology,
    ...areaBlocks,
  },
  extend: async ({ snapshot }) => {
    const data = await computeHoroscopeYear(snapshot);
    return { [EXT_KEY]: data, avakahada: data.avakahada };
  },
  evidence: (add, { snapshot, ext }) => addHoroscopeEvidence(add, ext[EXT_KEY] as HoroscopeYearData, snapshot.subject.timezone),
  status: 'implemented-partially-validated',
  statusEvidence: 'Offline E2E + PDF QA pass for two synthetic subjects (2026-11-18); real-LLM run pending.',
};
