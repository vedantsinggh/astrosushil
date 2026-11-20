/**
 * Stage, pack and pipeline signatures (types only; frozen in Wave 0).
 *
 * Implementations (Wave 1):
 *   - A2 `stages/chart-validation.ts`  → `export const runS1ChartValidation: RunS1ChartValidation`
 *        `stages/planet-condition.ts`  → `export const runS2PlanetCondition: RunS2PlanetCondition`
 *        `stages/house-lordship.ts`    → `export const runS3HouseLordship: RunS3HouseLordship`
 *        `stages/divisional.ts`        → `export const runS5DivisionalSynthesis: RunS5DivisionalSynthesis`
 *   - A3 `stages/yoga-assessment.ts`   → `export const runS4YogaAssessment: RunS4YogaAssessment`
 *        `stages/activation.ts`        → `export const runS6Activation: RunS6Activation`
 *   - A1 `conflict/resolve.ts`         → `runConflictResolution` (S7 primitive; implemented)
 *   - A4 `pipeline.ts`                 → `export const runInterpretation: RunInterpretation`
 *
 * All stages are pure: same input, same output; no `Date.now()`; IDs from `ids.ts`.
 * A stage that needs an earlier stage's output takes it as an explicit `deps` argument,
 * so stages can be implemented and tested in parallel against fixtures.
 */
import type { FactView, InterpretationInput, LifeStage } from './input';
import type {
  Activation,
  ChartValidation,
  ConflictInput,
  ConflictOutcome,
  ConflictPolicy,
  DivisionalLink,
  HouseAssessment,
  InterpretationResult,
  InterpretationRule,
  InterpretationSet,
  PlanetCondition,
  StageOutputs,
  YogaAssessment,
} from './types';

// ---------------------------------------------------------------------------
// Stage signatures
// ---------------------------------------------------------------------------

/** S1: conventions present, required vargas, birth time present, boundary sensitivity. */
export type RunS1ChartValidation = (input: InterpretationInput, facts: FactView) => ChartValidation;

/** S2: per planet (Sun … Ketu, registry order): dignity, varga dignity, combustion, functional nature… */
export type RunS2PlanetCondition = (input: InterpretationInput, facts: FactView) => PlanetCondition[];

/** S3: per house 1–12: lord placement category, lord condition (S2), occupants, aspects, SAV vs 28. */
export type RunS3HouseLordship = (
  input: InterpretationInput,
  facts: FactView,
  deps: { planets: PlanetCondition[] },
) => HouseAssessment[];

/** S4: engine YogaResult + cited modifiers, cancellations, set-logic class, activation windows. */
export type RunS4YogaAssessment = (
  input: InterpretationInput,
  facts: FactView,
  deps: { planets: PlanetCondition[] },
) => YogaAssessment[];

/** S5: D1 ↔ D10 (↔ D9) agreement facts. */
export type RunS5DivisionalSynthesis = (
  input: InterpretationInput,
  facts: FactView,
  deps: { planets: PlanetCondition[] },
) => DivisionalLink[];

/** S6: MD/AD activation, MD–AD mutual position, Saturn-from-Moon phase, transits over natal points. */
export type RunS6Activation = (
  input: InterpretationInput,
  facts: FactView,
  deps: { planets: PlanetCondition[]; yogas: YogaAssessment[]; lifeStage: LifeStage },
) => Activation[];

/** S7 primitive: one subject's conditions against the conflict policy (`conflict/resolve.ts`). */
export type RunConflictResolution = (input: ConflictInput, policy: ConflictPolicy) => ConflictOutcome;

// ---------------------------------------------------------------------------
// Rule packs (S8)
// ---------------------------------------------------------------------------

/** Everything a pack's result builder may read. All of it is already computed; builders are pure. */
export interface PackBuildContext {
  input: InterpretationInput;
  facts: FactView;
  lifeStage: LifeStage;
  stages: StageOutputs;
  policy: ConflictPolicy;
  /** Rules of the pack and the stages, by ID. */
  rules: Readonly<Record<string, InterpretationRule>>;
  /** Bound `runConflictResolution(input, policy)`. */
  resolve: (input: ConflictInput) => ConflictOutcome;
}

/**
 * Builds the results for one interpretation topic. Returns zero or more results (one per
 * question/subject); every result's `ruleIds` must include the topic's pack rule(s).
 */
export type ResultBuilder = (ctx: PackBuildContext) => InterpretationResult[];

export interface PackTopic {
  /** Interpretation topic key, e.g. 'career.house-10'. Results get IDs under `interp.<topic>.…`. */
  topic: string;
  /** Rule IDs (pack + stage rules) this topic depends on; a pending-client rule here keeps it out of rendering. */
  ruleIds: string[];
  build: ResultBuilder;
}

export interface InterpretationPack {
  /** e.g. 'career'. */
  id: string;
  version: string;
  /** Pack rules and the stage rules the pack relies on. Feeds `computeRulesetVersion`. */
  rules: InterpretationRule[];
  /** Topic key → topic. */
  topics: Record<string, PackTopic>;
}

// ---------------------------------------------------------------------------
// Pipeline
// ---------------------------------------------------------------------------

export interface RunInterpretationOptions {
  /**
   * Include results that depend on `pending-client` rules. Tests only; production callers
   * never set it (decision 8: pending-client rules are evaluated in tests, never rendered).
   */
  includePendingClient?: boolean;
}

/** S1–S8: runs the stages, the pack's builders and the policy; returns a schema-valid set. */
export type RunInterpretation = (
  input: InterpretationInput,
  facts: FactView,
  pack: InterpretationPack,
  policy: ConflictPolicy,
  options?: RunInterpretationOptions,
) => InterpretationSet;
