/**
 * Jupiter Transit Report — report module (reportType JUPITER_TRANSIT).
 * Shared planet-transit code: ../_planet-transit-shared. Decisions:
 * docs/report-system/decisions/planet-transits.md.
 */
import { ReportModule } from '../../module';
import {
  addPlanetTransitEvidence,
  bavPrastaraBlock,
  binduGuideBlock,
  computePlanetTransitExt,
  lordshipBlock,
  moonChart,
  natalAspectsBlock,
  overviewBlock,
  PlanetTransitExt,
  REMEDY_PRINCIPLES,
  REMEDY_PRINCIPLES_HI,
  returnsBlock,
  savMatrixBlock,
  staticBlock,
  stayBlock,
  summaryBlock,
  transitBinduBlock,
  transitChart,
} from '../_planet-transit-shared';
import { BRIHASPATI_LEGEND, JUPITER_HOUSES, JUPITER_MANTRA } from './jupiter.content';
import { JUPITER_DEFINITION } from './jupiter.definition';
import { BRIHASPATI_LEGEND_HI, JUPITER_HINDI, JUPITER_HOUSES_HI, JUPITER_MANTRA_HI } from './jupiter.hindi';

export const JUPITER_HORIZON_YEARS = 12;

export const JUPITER_TRANSIT_MODULE: ReportModule = {
  definition: JUPITER_DEFINITION,
  hindi: JUPITER_HINDI,
  blocks: {
    'jupiter-summary': summaryBlock(['jupiter']),
    'jupiter-moon-chart': moonChart,
    'jupiter-transit-chart': transitChart(['jupiter']),
    'jupiter-legend': staticBlock(BRIHASPATI_LEGEND, BRIHASPATI_LEGEND_HI),
    'jupiter-houses': staticBlock(JUPITER_HOUSES, JUPITER_HOUSES_HI),
    'jupiter-lordship': lordshipBlock('jupiter'),
    'jupiter-natal-aspects': natalAspectsBlock('jupiter'),
    'jupiter-stay-a': stayBlock('jupiter', 'a'),
    'jupiter-stay-b': stayBlock('jupiter', 'b'),
    'jupiter-bav': bavPrastaraBlock('jupiter'),
    'jupiter-sav': savMatrixBlock(['jupiter']),
    'jupiter-bindu-guide': binduGuideBlock,
    'jupiter-transit-bindus': transitBinduBlock('jupiter'),
    'jupiter-overview': overviewBlock('jupiter'),
    'jupiter-returns': returnsBlock('jupiter'),
    'jupiter-remedy-principles': staticBlock(REMEDY_PRINCIPLES, REMEDY_PRINCIPLES_HI),
    'jupiter-mantra': staticBlock(JUPITER_MANTRA, JUPITER_MANTRA_HI),
  },
  extend: async ({ snapshot }) =>
    (await computePlanetTransitExt(snapshot, [{ key: 'jupiter', horizonYears: JUPITER_HORIZON_YEARS }])) as unknown as Record<string, unknown>,
  evidence: (add, { snapshot, ext }) => addPlanetTransitEvidence(add, snapshot, ext as unknown as PlanetTransitExt),
  status: 'implemented-partially-validated',
  statusEvidence: 'Unit tests + offline E2E (2 synthetic subjects) with PDF QA; real-LLM run pending (lead engineer).',
};
