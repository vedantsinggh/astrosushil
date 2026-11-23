import { ReportModule } from '../../module';
import { COUPLE_BLOCKS } from './couple.blocks';
import { CoupleExt, coupleExtend } from './couple.calc';
import { COUPLE_DEFINITION } from './couple.definition';
import { coupleEvidence } from './couple.evidence';
import { COUPLE_HINDI } from './couple.hindi';

export const COUPLE_MATCHING_MODULE: ReportModule = {
  definition: COUPLE_DEFINITION,
  hindi: COUPLE_HINDI,
  blocks: COUPLE_BLOCKS,
  extend: async ({ snapshot, partner }) => {
    if (!partner) throw new Error('SNAPSHOT_INPUT_INVALID: couple matching requires partner birth details');
    return (await coupleExtend(snapshot, partner)) as unknown as Record<string, unknown>;
  },
  evidence: (add, ctx) => {
    if (!ctx.partner) throw new Error('SNAPSHOT_INPUT_INVALID: couple matching requires partner birth details');
    coupleEvidence(add, ctx.snapshot, ctx.partner, ctx.ext as unknown as CoupleExt);
  },
  status: 'implemented-partially-validated',
  statusEvidence: 'Offline E2E + PDF QA pass for two synthetic couples; unit tests for matching, Manglik, Saturn cycles, nodal axis and dasha overlap. Real-LLM run pending; partner-aware claim validation needs a core change (COU-010).',
};
