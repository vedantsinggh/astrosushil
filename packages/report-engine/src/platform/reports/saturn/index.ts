/**
 * Saturn In Your Birth Chart — report module (reportType SATURN).
 * Shared planet-transit code: ../_planet-transit-shared. Decisions:
 * docs/report-system/decisions/planet-transits.md.
 */
import { ReportModule } from '../../module';
import {
  bavPrastaraBlock,
  binduGuideBlock,
  lordshipBlock,
  moonChart,
  natalAspectsBlock,
  overviewBlock,
  REMEDY_PRINCIPLES,
  returnsBlock,
  savMatrixBlock,
  staticBlock,
  stayBlock,
  summaryBlock,
  transitBinduBlock,
  transitChart,
} from '../_planet-transit-shared';
import { SATURN_BLOCKS } from './saturn.blocks';
import { addSaturnEvidence, SaturnExt, saturnExtend } from './saturn.calc';
import { KANTAK_EXPLAINED, SADE_SATI_EXPLAINED, SATURN_KARMA, SATURN_MANTRA, SHANI_LEGENDS } from './saturn.content';
import { SATURN_DEFINITION } from './saturn.definition';
import { formatDate } from '../../render/latex';
import { ordinal } from '../../evidence/evidence-registry';


export const SATURN_MODULE: ReportModule = {
  definition: SATURN_DEFINITION,
  blocks: {
    'saturn-summary': summaryBlock(['saturn'], (ctx) => {
      const L = (ctx.ext as unknown as SaturnExt).life;
      const next = L.nextCycle !== undefined ? L.cycles[L.nextCycle] : undefined;
      return {
        rows: [
          ['Sade Sati status', L.status.active ? `Active (cycle ${L.status.cycle}, ${L.status.phase} phase)` : `Not active; Saturn is ${ordinal(L.status.saturnHouseFromMoon)} from the Moon`],
          ['Next Sade Sati', next ? `from ${formatDate(next.startIso)}` : 'none before age 90'],
        ],
        ids: ['sadesati.status', 'sadesati.next'],
      };
    }),
    'saturn-moon-chart': moonChart,
    'saturn-transit-chart': transitChart(['saturn']),
    'saturn-legends': staticBlock(SHANI_LEGENDS),
    'saturn-karma': staticBlock(SATURN_KARMA),
    'saturn-lordship': lordshipBlock('saturn'),
    'saturn-natal-aspects': natalAspectsBlock('saturn'),
    'saturn-bav': bavPrastaraBlock('saturn'),
    'saturn-sav': savMatrixBlock(['saturn']),
    'saturn-bindu-guide': binduGuideBlock,
    'saturn-transit-bindus': transitBinduBlock('saturn'),
    'saturn-sadesati-explained': staticBlock(SADE_SATI_EXPLAINED),
    'saturn-stay-a': stayBlock('saturn', 'a'),
    'saturn-stay-b': stayBlock('saturn', 'b'),
    'saturn-overview': overviewBlock('saturn'),
    'saturn-returns': returnsBlock('saturn'),
    'saturn-kantak-explained': staticBlock(KANTAK_EXPLAINED),
    'saturn-remedy-principles': staticBlock(REMEDY_PRINCIPLES),
    'saturn-mantra': staticBlock(SATURN_MANTRA),
    ...SATURN_BLOCKS,
  },
  extend: async ({ snapshot }) => (await saturnExtend(snapshot)) as unknown as Record<string, unknown>,
  evidence: (add, { snapshot, ext }) => addSaturnEvidence(add, snapshot, ext as unknown as SaturnExt),
  status: 'implemented-partially-validated',
  statusEvidence: 'Unit tests + offline E2E (2 synthetic subjects) with PDF QA; real-LLM run pending (lead engineer).',
};
