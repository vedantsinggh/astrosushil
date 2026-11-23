import { ReportModule } from '../../module';
import { numerologyBlocks } from '../_numerology-shared/blocks';
import { numerologyEvidence, numerologyExtend } from '../_numerology-shared/evidence';
import { FORTUNE_DEFINITION, FORTUNE_DEFINITION_EN } from './fortune.definition';

export const FORTUNE_MODULE: ReportModule = {
  definition: FORTUNE_DEFINITION,
  // Written in Hindi (the default edition); the English edition is a full definition from the same specs.
  editions: { en: FORTUNE_DEFINITION_EN },
  blocks: numerologyBlocks('fortune', 'hi'),
  extend: numerologyExtend({ useName: true }),
  evidence: (add, ctx) => numerologyEvidence(add, ctx),
  status: 'implemented-partially-validated',
  statusEvidence: 'Offline E2E + PDF QA pass (Hindi, Devanagari verified visually); real-LLM Hindi run pending.',
};
