/**
 * Rahu Ketu Transit Report — report module (reportType RAHU_KETU_TRANSIT).
 * Mean node (decision D-001). Shared planet-transit code: ../_planet-transit-shared.
 * Decisions: docs/report-system/decisions/planet-transits.md.
 */
import { ordinal } from '../../evidence/evidence-registry';
import { ReportModule } from '../../module';
import { planetLabel, signLabel } from '../../i18n/hindi';
import { BlockContext, BlockOutput, blockLang, kvTable } from '../../render/blocks';
import {
  addPlanetTransitEvidence,
  computePlanetTransitExt,
  kvTableL,
  moonChart,
  natalAspectsBlock,
  ord,
  ordObliqueHi,
  overviewBlock,
  PlanetTransitExt,
  ptData,
  REMEDY_PRINCIPLES,
  REMEDY_PRINCIPLES_HI,
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
import { KETU_VERSE_HI, NODE_AXIS_LABELS_HI, NODES_HOUSES_HI, NODES_LEGEND_HI, NODES_MANTRA_HI, NODES_MOTION_HI, RAHU_KETU_HINDI } from './rahu-ketu.hindi';

export const NODES_HORIZON_YEARS = 19;

export function nodeAxisBlock(ctx: BlockContext): BlockOutput {
  const ra = ptData(ctx, 'rahu').natal;
  const ke = ptData(ctx, 'ketu').natal;
  if (blockLang(ctx) === 'hi') {
    const L = NODE_AXIS_LABELS_HI;
    const placed = (n: typeof ra) =>
      `${signLabel('hi', n.sign)}, ${ord('hi', n.house)} भाव; राशि स्वामी ${planetLabel('hi', n.dispositor)} ${ordObliqueHi(n.dispositorHouse)} भाव में`;
    return {
      tex: kvTableL('hi', [
        [L['Rahu (growth, appetite, the new)'], placed(ra)],
        [L['Ketu (mastery, release, insight)'], placed(ke)],
        [L['Axis from the Ascendant'], `${ord('hi', ra.house)}–${ord('hi', ke.house)} भाव`],
        [L['Axis from the Moon'], `चंद्र से ${ord('hi', ra.houseFromMoon)}–${ord('hi', ke.houseFromMoon)}`],
      ]),
      evidenceIds: ['planet.rahu.d1.house', 'planet.ketu.d1.house', 'rahu.natal.dispositor', 'ketu.natal.dispositor', 'rahu.natal.house-from-moon', 'ketu.natal.house-from-moon'],
      method: L['Mean lunar nodes; Ketu is always exactly opposite Rahu. Dispositor = lord of the sign the node occupies.'],
    };
  }
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
  hindi: RAHU_KETU_HINDI,
  blocks: {
    'rahu-ketu-summary': summaryBlock(['rahu', 'ketu']),
    'rahu-ketu-moon-chart': moonChart,
    'rahu-ketu-transit-chart': transitChart(['rahu', 'ketu']),
    'rahu-ketu-legend': staticBlock(NODES_LEGEND, NODES_LEGEND_HI),
    'rahu-ketu-ketu-verse': staticBlock(KETU_VERSE, KETU_VERSE_HI),
    'rahu-ketu-houses': staticBlock(NODES_HOUSES, NODES_HOUSES_HI),
    'rahu-ketu-rahu-aspects': natalAspectsBlock('rahu'),
    'rahu-ketu-ketu-aspects': natalAspectsBlock('ketu'),
    'rahu-ketu-axis': nodeAxisBlock,
    'rahu-ketu-rahu-stay-a': stayBlock('rahu', 'a'),
    'rahu-ketu-ketu-stay-a': stayBlock('ketu', 'a'),
    'rahu-ketu-rahu-stay-b': stayBlock('rahu', 'b'),
    'rahu-ketu-ketu-stay-b': stayBlock('ketu', 'b'),
    'rahu-ketu-motion': staticBlock(NODES_MOTION, NODES_MOTION_HI),
    'rahu-ketu-sav-nodes': savNodesBlock,
    'rahu-ketu-sav': savMatrixBlock(['rahu', 'ketu']),
    'rahu-ketu-rahu-overview': overviewBlock('rahu'),
    'rahu-ketu-ketu-overview': overviewBlock('ketu'),
    'rahu-ketu-returns': returnsBlock('rahu'),
    'rahu-ketu-remedy-principles': staticBlock(REMEDY_PRINCIPLES, REMEDY_PRINCIPLES_HI),
    'rahu-ketu-mantra': staticBlock(NODES_MANTRA, NODES_MANTRA_HI),
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
