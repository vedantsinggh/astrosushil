import { PlanetSymbol } from '../planets/planet.types';
import {
  YogaAssessmentInputs,
  YogaCancellationFlag,
  YogaChartContext,
  YogaLordRelation,
  YogaPlanetFactors,
  YogaResult,
} from './yoga.types';

/**
 * Helpers for the optional `YogaResult.assessment` (2026-11 engine fixes). Everything here is a
 * fact about formation; nothing describes results or assigns a verdict.
 */

export interface LordRelationResult {
  /** All relations found, in priority order: OWNERSHIP, CONJUNCTION, SIGN_EXCHANGE, MUTUAL_ASPECT. */
  relations: Exclude<YogaLordRelation, 'ONE_WAY_ASPECT'>[];
  /** Directed aspects that are not returned (A aspects B, B does not aspect A). */
  oneWayAspects: Array<{ from: PlanetSymbol; to: PlanetSymbol; aspect: string }>;
  /** Formation holds (any relation other than a one-way aspect). */
  isAssociated: boolean;
  /** Primary relation (first of `relations`), or ONE_WAY_ASPECT when only that holds. */
  primary?: YogaLordRelation;
  description: string;
}

const ORD = (n: number): string => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

/**
 * Relation between the lords of two houses for lord-association yogas.
 * Counted relations (BPHS ch. 39 Raja yogas, Santhanam numbering, verify verses): conjunction
 * (same sign), mutual aspect (graha drishti returned, incl. Mars 4/8, Jupiter 5/9, Saturn 3/10),
 * sign exchange (parivartana). A single planet owning both houses is OWNERSHIP (BPHS ch. 34
 * Yogakaraka; Laghu Parashari ch. 2). One-way aspects are reported but do not form the yoga
 * (provisional – pending client review).
 */
export function lordRelation(
  ctx: YogaChartContext,
  pA: PlanetSymbol,
  pB: PlanetSymbol,
  houseA: number,
  houseB: number
): LordRelationResult {
  if (pA === pB) {
    const k = [houseA, houseB].filter((h) => [1, 4, 7, 10].includes(h));
    const t = [houseA, houseB].filter((h) => [1, 5, 9].includes(h) && !k.includes(h));
    const description =
      k.length && t.length
        ? `Yogakaraka: ${pA} owns both kendra ${k[0]} and trikona ${t[0]}`
        : `${pA} owns both the ${ORD(houseA)} and the ${ORD(houseB)}`;
    return { relations: ['OWNERSHIP'], oneWayAspects: [], isAssociated: true, primary: 'OWNERSHIP', description };
  }

  const a = ctx.planets[pA];
  const b = ctx.planets[pB];
  const relations: Exclude<YogaLordRelation, 'ONE_WAY_ASPECT'>[] = [];
  const parts: string[] = [];

  if (a.rashiIndex === b.rashiIndex) {
    relations.push('CONJUNCTION');
    parts.push(`conjunct in ${a.rashiName}`);
  }
  const exchange = ctx.signExchanges.some(
    (ex) => (ex.planetA === pA && ex.planetB === pB) || (ex.planetA === pB && ex.planetB === pA)
  );
  if (exchange) {
    relations.push('SIGN_EXCHANGE');
    parts.push(`in sign exchange (${pA} in ${a.rashiName}, ${pB} in ${b.rashiName})`);
  }
  const mutual = ctx.mutualAspects.find(
    (m) => (m.planetA === pA && m.planetB === pB) || (m.planetA === pB && m.planetB === pA)
  );
  if (mutual) {
    relations.push('MUTUAL_ASPECT');
    parts.push(`in mutual aspect (${mutual.aspectType})`);
  }

  const oneWayAspects: Array<{ from: PlanetSymbol; to: PlanetSymbol; aspect: string }> = [];
  if (!mutual && ctx.grahaAspects) {
    for (const g of ctx.grahaAspects) {
      if ((g.from === pA && g.to === pB) || (g.from === pB && g.to === pA)) {
        oneWayAspects.push({ from: g.from, to: g.to, aspect: g.aspectType });
      }
    }
  }

  const label = `Lord of H${houseA} (${pA}) and Lord of H${houseB} (${pB})`;
  if (relations.length > 0) {
    return { relations, oneWayAspects, isAssociated: true, primary: relations[0], description: `${label} ${parts.join('; ')}` };
  }
  if (oneWayAspects.length > 0) {
    const w = oneWayAspects.map((o) => `${o.from} aspects ${o.to} (${o.aspect})`).join('; ');
    return {
      relations,
      oneWayAspects,
      isAssociated: false,
      primary: 'ONE_WAY_ASPECT',
      description: `${label}: one-way aspect only (${w}); not counted as association`,
    };
  }
  return { relations, oneWayAspects, isAssociated: false, description: `${label}: no association` };
}

/** Factor facts for the given planets, in order, de-duplicated. */
export function factorsFor(ctx: YogaChartContext, planets: PlanetSymbol[]): YogaPlanetFactors[] {
  const seen = new Set<PlanetSymbol>();
  const out: YogaPlanetFactors[] = [];
  for (const p of planets) {
    if (seen.has(p)) continue;
    seen.add(p);
    const f = ctx.planetFactors?.[p];
    if (f) out.push(f);
  }
  return out;
}

export interface AssessmentSpec {
  formed: boolean;
  cancelled?: boolean;
  keyPlanets: PlanetSymbol[];
  relations?: YogaLordRelation[];
  oneWayAspects?: Array<{ from: PlanetSymbol; to: PlanetSymbol; aspect: string }>;
  variant?: 'BENEFIC' | 'MALEFIC' | 'MIXED';
  cancellations?: YogaCancellationFlag[];
  notes?: string[];
  source: string;
}

export function buildAssessment(ctx: YogaChartContext, spec: AssessmentSpec): YogaAssessmentInputs {
  const a: YogaAssessmentInputs = {
    formed: spec.formed,
    cancelled: spec.cancelled ?? false,
    keyPlanets: [...spec.keyPlanets],
    planetFactors: factorsFor(ctx, spec.keyPlanets),
    cancellations: spec.cancellations ?? [],
    notes: spec.notes ?? [],
    source: spec.source,
    provisional: true,
  };
  if (spec.relations) a.relations = [...spec.relations];
  if (spec.oneWayAspects && spec.oneWayAspects.length) a.oneWayAspects = [...spec.oneWayAspects];
  if (spec.variant) a.variant = spec.variant;
  return a;
}

/**
 * Default assessment for a yoga whose evaluator did not supply one: base formation = isDetected,
 * key planets = involved planets.
 */
export function ensureAssessment(ctx: YogaChartContext, result: YogaResult): YogaResult {
  if (result.assessment) return result;
  return {
    ...result,
    assessment: buildAssessment(ctx, {
      formed: result.isDetected,
      keyPlanets: result.evidence.involvedPlanets.map((p) => p.planet),
      source: result.convention,
    }),
  };
}

/** Natural benefics for Vesi/Vasi and Sunapha/Anapha variants: Jupiter, Venus, Mercury (BPHS ch. 37-38). */
export function occupantVariant(planets: PlanetSymbol[]): 'BENEFIC' | 'MALEFIC' | 'MIXED' | undefined {
  if (planets.length === 0) return undefined;
  const benefic = new Set<PlanetSymbol>([PlanetSymbol.JUPITER, PlanetSymbol.VENUS, PlanetSymbol.MERCURY]);
  const nb = planets.filter((p) => benefic.has(p)).length;
  if (nb === planets.length) return 'BENEFIC';
  if (nb === 0) return 'MALEFIC';
  return 'MIXED';
}
