/**
 * Deterministic, evidence-traceable interpretation layer (prediction-engine).
 * Methodology: docs/report-system/decisions/interpretation.md.
 *
 * Wave 0 exports the contracts and the conflict policy. Stage, pack and pipeline modules
 * add their export lines here when they land (Wave 1).
 */
export * from './types';
export * from './schema';
export * from './input';
export * from './ids';
export * from './stages';
export * from './conflict/policy';
export * from './conflict/resolve';

// Wave 1: stages (A2 natal, A3 yoga/activation), rule tables, pipeline and the career pack (A4).
export * from './stages/chart-validation';
export * from './stages/planet-condition';
export * from './stages/house-lordship';
export * from './stages/divisional';
export * from './stages/functional-nature';
export * from './rules/yoga-rules';
export * from './stages/yoga-assessment';
export {
  runS6Activation,
  S6_RULES,
  S6_RULE_IDS,
  LIFE_STAGE_HORIZON_AGE,
  listDashaPeriods,
  selectReportedPeriods,
  currentMdIndex,
} from './stages/activation';
export type { DashaPeriodRef } from './stages/activation';
export * from './pipeline';
export * from './rules/catalogue';
export * from './packs/career';
