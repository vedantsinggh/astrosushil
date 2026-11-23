/**
 * Premium Personalised Kundli — report module (flagship).
 * Definition, deterministic blocks, extra calculations (`extend`) and evidence.
 */
import { ReportModule } from '../../module';
import { BlockRenderer, loveJupiterWindows } from '../../render/blocks';
import { kundliAvakahada, kundliBirthDetails, kundliGhatak, kundliPanchangTable } from './blocks/birth';
import { kundliAspectTable, kundliHouseTable, kundliPlanetTable, kundliSouthAndMoon, kundliVargaCharts, kundliVargaTable } from './blocks/charts';
import { kundliAdGrid, kundliLifeTimeline, kundliMdGlance, kundliMdTable, kundliPdGrids } from './blocks/dasha';
import {
  kundliAshtakavarga, kundliBhavaSignificators, kundliConjunctions, kundliHouseLords, kundliKarakaTable, kundliMangalTable,
  kundliNumerologyTable, kundliPatternNote, kundliPracticeTable, kundliSadeSatiTable, kundliYogaTable,
} from './blocks/tables';
import { contributeKundliEvidence } from './evidence';
import { extendKundli } from './extend';
import { KUNDLI_DEFINITION } from './kundli.definition';
import { KUNDLI_HINDI } from './kundli.hindi';

const MD_GLANCE: Record<string, BlockRenderer> = Object.fromEntries(
  Array.from({ length: 9 }, (_, i) => [`kundli-md-glance-${i + 1}`, kundliMdGlance(i + 1)])
);

export const KUNDLI_BLOCKS: Record<string, BlockRenderer> = {
  'kundli-birth-details': kundliBirthDetails,
  'kundli-avakahada': kundliAvakahada,
  'kundli-panchang': kundliPanchangTable,
  'kundli-ghatak': kundliGhatak,
  'kundli-south-moon': kundliSouthAndMoon,
  'kundli-planet-table': kundliPlanetTable,
  'kundli-house-table': kundliHouseTable,
  'kundli-aspect-table': kundliAspectTable,
  'kundli-varga-charts': kundliVargaCharts,
  'kundli-varga-table': kundliVargaTable,
  'kundli-life-timeline': kundliLifeTimeline,
  'kundli-md-table': kundliMdTable,
  'kundli-ad-table': kundliAdGrid,
  'kundli-pd-tables': kundliPdGrids,
  'kundli-ashtakavarga': kundliAshtakavarga,
  'kundli-bhava-significators': kundliBhavaSignificators,
  'kundli-house-lords': kundliHouseLords,
  'kundli-conjunctions': kundliConjunctions,
  'kundli-marriage-windows': loveJupiterWindows,
  'kundli-karaka-table': kundliKarakaTable,
  'kundli-mangal-table': kundliMangalTable,
  'kundli-sadesati-table': kundliSadeSatiTable,
  'kundli-yoga-table': kundliYogaTable,
  'kundli-pattern-note': kundliPatternNote,
  'kundli-numerology-table': kundliNumerologyTable,
  'kundli-practice-table': kundliPracticeTable,
  ...MD_GLANCE,
};

export const KUNDLI_MODULE: ReportModule = {
  definition: KUNDLI_DEFINITION,
  hindi: KUNDLI_HINDI,
  blocks: KUNDLI_BLOCKS,
  extend: extendKundli,
  evidence: (add, ctx) => contributeKundliEvidence(add, ctx),
  status: 'implemented-partially-validated',
  statusEvidence: 'Unit tests + offline E2E with PDF QA pass for two synthetic subjects; real-LLM run pending (central).',
};
