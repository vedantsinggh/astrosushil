import { ReportModule } from '../../module';
import { loveJupiterWindows } from '../../render/blocks';
import { numerologyBlocks } from '../_numerology-shared/blocks';
import { computeNumerologyExt, numerologyEvidence } from '../_numerology-shared/evidence';
import { ASTRO_BLOCKS, astroEvidence, computeAstroExt } from './astro';
import { FORTUNE_PLUS_DEFINITION } from './fortune-plus.definition';

export const FORTUNE_PLUS_MODULE: ReportModule = {
  definition: FORTUNE_PLUS_DEFINITION,
  blocks: {
    ...numerologyBlocks('fortune-plus', 'en'),
    ...ASTRO_BLOCKS,
    // Same Jupiter-window method as the Love report (D-004).
    'fortune-plus-jupiter-windows': loveJupiterWindows,
  },
  extend: async (ctx) => ({
    numerology: computeNumerologyExt(ctx.snapshot, { useName: true }),
    astro: await computeAstroExt(ctx),
  }),
  evidence: (add, ctx) => {
    numerologyEvidence(add, ctx);
    astroEvidence(add, ctx);
  },
  status: 'implemented-partially-validated',
  statusEvidence: 'Offline E2E + PDF QA pass for two synthetic subjects; real-LLM run pending.',
};
