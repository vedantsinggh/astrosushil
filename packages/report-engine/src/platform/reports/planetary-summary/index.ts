/**
 * Planetary Dynamics & Dignity Summary — report module (reportType PLANETARY_SUMMARY).
 * Uses only core snapshot evidence; the planet table is the Kundli module's
 * deterministic table (built from the natal chart alone).
 */
import { ReportModule } from '../../module';
import { kundliPlanetTable } from '../kundli/blocks/charts';
import { PLANETARY_SUMMARY_DEFINITION } from './planetary-summary.definition';

export const PLANETARY_SUMMARY_MODULE: ReportModule = {
  definition: PLANETARY_SUMMARY_DEFINITION,
  blocks: {
    'planetary-summary-planet-table': kundliPlanetTable,
  },
  status: 'implemented-partially-validated',
  statusEvidence: 'Unit tests + offline E2E with PDF QA (2026-11-18); real-LLM run pending.',
};
