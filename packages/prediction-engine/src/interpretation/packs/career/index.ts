/**
 * Career interpretation pack (proposal §8; the 10 career dimensions of audit 05 §2).
 *
 * Topic keys (result IDs `interp.<topic>.<parts>`):
 *   career.house-{1,2,6,7,10,11}  lord-placement, sav, occupants, aspects
 *   career.planet                  <planet> (S2 condition)
 *   career.yoga                    <slug> (CAR-005 career yogas, formed only)
 *   career.d10                     tenth-lord, house-{1,6,7,10,11}.lord
 *   career.d1-d10                  agreement, vargottama
 *   career.service-orientation … career.transitions   dimensions 1–9 (one result each)
 *   career.period                  md, ad, next-md, next-ad, md-ad-position, earnings-window  (dimension 10)
 *   career.transit                 jupiter, saturn, saturn-from-moon                           (dimension 10)
 *   career.fields                  house-{1,5,9}-lord (CAR-018)
 */
import type { InterpretationPack, PackTopic } from '../../stages';
import { CAREER_RULE_CATALOGUE } from '../../rules/catalogue';
import {
  CAREER_HOUSES,
  buildD10Topic,
  buildD1D10Topic,
  buildDimensionTopic,
  buildFieldsTopic,
  buildHouseTopic,
  buildPeriodTopic,
  buildPlanetTopic,
  buildTransitTopic,
  buildYogaTopic,
} from './rules';
import { DIMENSIONS, type DimensionKey } from './templates';

export const CAREER_PACK_ID = 'career';
export const CAREER_PACK_VERSION = '1.0.0';

const DIMENSION_RULES: Readonly<Record<DimensionKey, string>> = {
  'service-orientation': 'INT-CAR-001',
  enterprise: 'INT-CAR-002',
  leadership: 'INT-CAR-003',
  analytical: 'INT-CAR-004',
  'financial-growth': 'INT-CAR-005',
  recognition: 'INT-CAR-006',
  stability: 'INT-CAR-007',
  obstacles: 'INT-CAR-008',
  transitions: 'INT-CAR-009',
};

function topics(): Record<string, PackTopic> {
  const out: Record<string, PackTopic> = {};
  const add = (t: PackTopic) => {
    out[t.topic] = t;
  };
  for (const n of CAREER_HOUSES) {
    add({ topic: `career.house-${n}`, ruleIds: ['INT-H-001', 'INT-H-002'], build: buildHouseTopic(n) });
  }
  add({ topic: 'career.planet', ruleIds: ['INT-P-001'], build: buildPlanetTopic });
  add({ topic: 'career.yoga', ruleIds: ['INT-CY-001', 'INT-CY-002'], build: buildYogaTopic });
  add({ topic: 'career.d10', ruleIds: ['INT-D-001', 'INT-D-004'], build: buildD10Topic });
  add({ topic: 'career.d1-d10', ruleIds: ['INT-D-002', 'INT-D-003'], build: buildD1D10Topic });
  for (const dim of Object.keys(DIMENSIONS) as DimensionKey[]) {
    add({ topic: `career.${dim}`, ruleIds: [DIMENSION_RULES[dim]], build: buildDimensionTopic(dim) });
  }
  add({ topic: 'career.period', ruleIds: ['INT-T-001'], build: buildPeriodTopic });
  add({ topic: 'career.transit', ruleIds: ['INT-T-010', 'INT-T-011'], build: buildTransitTopic });
  add({ topic: 'career.fields', ruleIds: ['INT-F-001'], build: buildFieldsTopic });
  return out;
}

export const CAREER_PACK: InterpretationPack = {
  id: CAREER_PACK_ID,
  version: CAREER_PACK_VERSION,
  rules: [...CAREER_RULE_CATALOGUE],
  topics: topics(),
};

/** Export name report-engine's career module looks up (`CAREER_PACK_EXPORT`). */
export const CAREER_INTERPRETATION_PACK: InterpretationPack = CAREER_PACK;

export { CAREER_HOUSES, D10_LORD_HOUSES, TRINE_HOUSES, EARNINGS_MIN_AGE, EARNINGS_MAX_AGE, assessFactors, explain } from './rules';
export type { Factor, Assessment } from './rules';
