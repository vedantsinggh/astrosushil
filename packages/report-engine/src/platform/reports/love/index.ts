import { ReportModule } from '../../module';
import { loveAllies, loveAstralDetails, loveCautions, loveJupiterWindows } from '../../render/blocks';
import { LOVE_DEFINITION } from './love.definition';

export const LOVE_MODULE: ReportModule = {
  definition: LOVE_DEFINITION,
  blocks: {
    'love-astral-details': loveAstralDetails,
    'love-allies': loveAllies,
    'love-cautions': loveCautions,
    'love-jupiter-windows': loveJupiterWindows,
  },
  status: 'implemented-partially-validated',
  statusEvidence: 'Offline E2E + PDF QA pass; real-LLM run pending (Gemini 503 overload on 2026-11-18).',
};
