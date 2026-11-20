import { ReportModule } from '../../module';
import { FINANCE_BLOCKS } from './finance.blocks';
import { FINANCE_DEFINITION } from './finance.definition';
import { financeEvidence } from './finance.evidence';

export const FINANCE_MODULE: ReportModule = {
  definition: FINANCE_DEFINITION,
  blocks: FINANCE_BLOCKS,
  evidence: (add, ctx) => financeEvidence(add, ctx.snapshot),
  status: 'implemented-partially-validated',
  statusEvidence: 'Offline E2E + PDF QA pass for two synthetic subjects; unit tests for functional nature, gochara and outlook windows. Real-LLM run pending (lead engineer).',
};
