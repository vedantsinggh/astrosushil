import { ReportModule } from '../../module';
import { loShuBlock } from '../_numerology-shared/blocks';
import { addNumerologyEvidence, numerologyExtOf } from '../_numerology-shared/evidence';
import { babyEvidence, babyExtend, BABY_BLOCKS } from './baby-name.module-parts';
import { BABY_NAME_DEFINITION } from './baby-name.definition';

export const BABY_NAME_MODULE: ReportModule = {
  definition: BABY_NAME_DEFINITION,
  blocks: { ...BABY_BLOCKS, 'baby-name-loshu': loShuBlock('en') },
  extend: babyExtend,
  evidence: (add, ctx) => {
    addNumerologyEvidence(add, ctx.registry, numerologyExtOf(ctx.ext));
    babyEvidence(add, ctx);
  },
  status: 'implemented-partially-validated',
  statusEvidence: 'Offline E2E + PDF QA pass (with and without candidate names); real-LLM run pending; candidateNames input needs a core SubjectInput field.',
};
