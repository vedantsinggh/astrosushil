/**
 * Basic Kundli — report module (reportType KUNDLI_BASIC).
 * A selection of the full Kundli's topics: same blocks, calculations and evidence.
 */
import { ReportModule } from '../../module';
import { KUNDLI_MODULE } from '../kundli';
import { KUNDLI_BASIC_DEFINITION, KUNDLI_BASIC_HINDI } from './kundli-basic.definition';

export const KUNDLI_BASIC_MODULE: ReportModule = {
  ...KUNDLI_MODULE,
  definition: KUNDLI_BASIC_DEFINITION,
  hindi: KUNDLI_BASIC_HINDI,
  status: 'implemented-partially-validated',
  statusEvidence: 'Selection of Kundli topics; unit tests + offline E2E with PDF QA in both languages (2026-11-24); real-LLM run pending.',
};
