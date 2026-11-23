import { ReportModule } from '../../module';
import { FINANCE_BLOCKS } from './finance.blocks';
import { FINANCE_DEFINITION } from './finance.definition';
import { financeEvidence } from './finance.evidence';
import { FINANCE_HINDI } from './finance.hindi';

export const FINANCE_MODULE: ReportModule = {
  definition: FINANCE_DEFINITION,
  hindi: FINANCE_HINDI,
  blocks: FINANCE_BLOCKS,
  evidence: (add, ctx) => financeEvidence(add, ctx.snapshot),
  status: 'implemented-partially-validated',
  statusEvidence: 'Offline E2E + PDF QA pass for two synthetic subjects; unit tests for functional nature, gochara and outlook windows. Real-LLM run pending (lead engineer).',
};
