/**
 * Rahu Ketu Transit Report — report module (reportType RAHU_KETU_TRANSIT).
 * Mean node (decision D-001). Shared planet-transit code: ../_planet-transit-shared.
 * Decisions: docs/report-system/decisions/planet-transits.md.
 */
import { ordinal } from '../../evidence/evidence-registry';
import { ReportModule } from '../../module';
import { BlockContext, BlockOutput, kvTable } from '../../render/blocks';
import {
  addPlanetTransitEvidence,
  computePlanetTransitExt,
  moonChart,
  natalAspectsBlock,
  overviewBlock,
  PlanetTransitExt,
  ptData,
  REMEDY_PRINCIPLES,
  returnsBlock,
  savMatrixBlock,
  savNodesBlock,
  staticBlock,
  stayBlock,
  summaryBlock,
  transitChart,
} from '../_planet-transit-shared';
import { KETU_VERSE, NODES_HOUSES, NODES_LEGEND, NODES_MANTRA, NODES_MOTION } from './rahu-ketu.content';
import { RAHU_KETU_DEFINITION } from './rahu-ketu.definition';

export const NODES_HORIZON_YEARS = 19;

export function nodeAxisBlock(ctx: BlockContext): BlockOutput {
  const ra = ptData(ctx, 'rahu').natal;
  const ke = ptData(ctx, 'ketu').natal;
  const rows: Array<[string, string]> = [
    ['Rahu (growth, appetite, the new)', `${ra.sign}, ${ordinal(ra.house)} house; dispositor ${ra.dispositor} in the ${ordinal(ra.dispositorHouse)} house`],
    ['Ketu (mastery, release, insight)', `${ke.sign}, ${ordinal(ke.house)} house; dispositor ${ke.dispositor} in the ${ordinal(ke.dispositorHouse)} house`],
    ['Axis from the Ascendant', `${ordinal(ra.house)}–${ordinal(ke.house)} houses`],
    ['Axis from the Moon', `${ordinal(ra.houseFromMoon)}–${ordinal(ke.houseFromMoon)} from the Moon`],
  ];
  return {
    tex: kvTable(rows),
    evidenceIds: ['planet.rahu.d1.house', 'planet.ketu.d1.house', 'rahu.natal.dispositor', 'ketu.natal.dispositor', 'rahu.natal.house-from-moon', 'ketu.natal.house-from-moon'],
    method: 'Mean lunar nodes; Ketu is always exactly opposite Rahu. Dispositor = lord of the sign the node occupies.',
  };
}

export const RAHU_KETU_TRANSIT_MODULE: ReportModule = {
  definition: RAHU_KETU_DEFINITION,
  blocks: {
    'rahu-ketu-summary': summaryBlock(['rahu', 'ketu']),
    'rahu-ketu-moon-chart': moonChart,
    'rahu-ketu-transit-chart': transitChart(['rahu', 'ketu']),
    'rahu-ketu-legend': staticBlock(NODES_LEGEND),
    'rahu-ketu-ketu-verse': staticBlock(KETU_VERSE),
    'rahu-ketu-houses': staticBlock(NODES_HOUSES),
    'rahu-ketu-rahu-aspects': natalAspectsBlock('rahu'),
    'rahu-ketu-ketu-aspects': natalAspectsBlock('ketu'),
    'rahu-ketu-axis': nodeAxisBlock,
    'rahu-ketu-rahu-stay-a': stayBlock('rahu', 'a'),
    'rahu-ketu-ketu-stay-a': stayBlock('ketu', 'a'),
    'rahu-ketu-rahu-stay-b': stayBlock('rahu', 'b'),
    'rahu-ketu-ketu-stay-b': stayBlock('ketu', 'b'),
    'rahu-ketu-motion': staticBlock(NODES_MOTION),
    'rahu-ketu-sav-nodes': savNodesBlock,
    'rahu-ketu-sav': savMatrixBlock(['rahu', 'ketu']),
    'rahu-ketu-rahu-overview': overviewBlock('rahu'),
    'rahu-ketu-ketu-overview': overviewBlock('ketu'),
    'rahu-ketu-returns': returnsBlock('rahu'),
    'rahu-ketu-remedy-principles': staticBlock(REMEDY_PRINCIPLES),
    'rahu-ketu-mantra': staticBlock(NODES_MANTRA),
  },
  extend: async ({ snapshot }) =>
    (await computePlanetTransitExt(snapshot, [
      { key: 'rahu', horizonYears: NODES_HORIZON_YEARS },
      { key: 'ketu', horizonYears: NODES_HORIZON_YEARS },
    ])) as unknown as Record<string, unknown>,
  evidence: (add, { snapshot, ext }) => addPlanetTransitEvidence(add, snapshot, ext as unknown as PlanetTransitExt),
  status: 'implemented-partially-validated',
  statusEvidence: 'Unit tests + offline E2E (2 synthetic subjects) with PDF QA; real-LLM run pending (lead engineer).',
};
