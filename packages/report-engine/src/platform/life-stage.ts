/**
 * Life-stage product thresholds shared by report definitions and validators.
 *
 * These are product defaults, NOT astrology (docs/report-system/decisions/interpretation.md §8),
 * provisional pending client review. Keeping them in one place means the validator agrees with
 * what the prompt variant tells the model.
 */

/**
 * Early-career band: up to and including this age (completed years), a topic's early-career
 * variant withholds seniority framing (board-level, executive, mentoring juniors, retirement),
 * and the interpretation validator flags seniority wording (LIFE_STAGE_MISMATCH).
 */
export const EARLY_CAREER_MAX_AGE = 29;

/** True when `age` (completed years) is in the early-career band. */
export function isEarlyCareerAge(age: number): boolean {
  return age <= EARLY_CAREER_MAX_AGE;
}
