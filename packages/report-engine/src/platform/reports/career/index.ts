/**
 * Career Report module (reportType CAREER).
 * Definition, deterministic blocks, extra calculations (`extend`) and the
 * `career.*` evidence they contribute. See career.definition.ts for coverage.
 */
import { ReportModule } from '../../module';
import { CAREER_BLOCKS } from './career.blocks';
import { CAREER_DEFINITION } from './career.definition';
import { contributeCareerEvidence } from './career.evidence';
import { careerExt, computeCareer } from './calc/career-calc';

export const CAREER_MODULE: ReportModule = {
  definition: CAREER_DEFINITION,
  blocks: CAREER_BLOCKS,
  extend: async ({ snapshot }) => ({ career: await computeCareer(snapshot) }),
  evidence: (add, { snapshot, ext }) => contributeCareerEvidence(add, snapshot, careerExt(ext)),
  status: 'implemented-partially-validated',
  statusEvidence: 'Offline E2E + PDF QA pass for synthetic subjects (2026-11-18); real-LLM run pending.',
};
