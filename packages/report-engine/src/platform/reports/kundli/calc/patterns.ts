/**
 * Small deterministic chart patterns built on the normalized chart.
 * Each function documents its classical rule; none of them grades or scores.
 */
import { getNaturalRelationship, NormalizedChart, PlanetSymbol } from '@astro/astrology-engine';
import { planetName, PlanetName } from '../../../evidence/evidence-registry';

export interface ConjunctionGroup {
  house: number;
  sign: string;
  planets: Array<{ name: PlanetName; degree: number }>;
  /** Widest separation in degrees between members (same sign, so < 30). */
  spanDegrees: number;
  /** Closest pair and its separation. */
  closest: { a: PlanetName; b: PlanetName; orb: number };
}

/** Planets sharing a sign (Whole Sign house) form a conjunction group (yuti). */
export function conjunctionGroups(natal: NormalizedChart): ConjunctionGroup[] {
  const out: ConjunctionGroup[] = [];
  for (const h of natal.houses) {
    const members = natal.planets
      .filter((p) => p.house === h.number)
      .map((p) => ({ name: planetName(p.name), degree: p.degree }))
      .sort((a, b) => a.degree - b.degree);
    if (members.length < 2) continue;
    let closest = { a: members[0].name, b: members[1].name, orb: Math.abs(members[1].degree - members[0].degree) };
    for (let i = 0; i < members.length; i++) {
      for (let j = i + 1; j < members.length; j++) {
        const orb = Math.abs(members[j].degree - members[i].degree);
        if (orb < closest.orb) closest = { a: members[i].name, b: members[j].name, orb };
      }
    }
    out.push({
      house: h.number,
      sign: h.sign,
      planets: members,
      spanDegrees: members[members.length - 1].degree - members[0].degree,
      closest,
    });
  }
  return out;
}

/** Planets casting graha drishti on each house (engine aspects: 7th for all; Mars 4/8, Jupiter 5/9, Saturn 3/10, nodes 5/9). */
export function houseAspects(natal: NormalizedChart): Record<number, PlanetName[]> {
  const out: Record<number, PlanetName[]> = {};
  for (let h = 1; h <= 12; h++) out[h] = [];
  for (const p of natal.planets) for (const h of p.aspectsCast ?? []) out[h]?.push(planetName(p.name));
  return out;
}

/** Planets that occupy the houses a planet aspects. */
export function planetsAspectedBy(natal: NormalizedChart, planet: PlanetSymbol | string): PlanetName[] {
  const p = natal.planets.find((x) => String(x.name) === String(planet));
  if (!p) return [];
  const houses = new Set(p.aspectsCast ?? []);
  return natal.planets.filter((o) => o.name !== p.name && houses.has(o.house)).map((o) => planetName(o.name));
}

export interface KaalSarpPattern {
  present: boolean;
  /** 'rahu-to-ketu' when all seven lie in the arc from Rahu forward to Ketu, 'ketu-to-rahu' for the other half. */
  direction?: 'rahu-to-ketu' | 'ketu-to-rahu';
  /** Planets outside the hemmed arc (empty when present). */
  outside: PlanetName[];
}

/**
 * The "Kaal Sarp" pattern: all seven visible planets (Sun–Saturn) lie within one
 * half of the zodiac bounded by the Rahu–Ketu axis. A planet exactly on a node
 * counts as inside. Presented as a neutral pattern only (D-006). Decision KUN-010.
 */
export function kaalSarpPattern(natal: NormalizedChart): KaalSarpPattern {
  const rahu = natal.planets.find((p) => String(p.name) === 'RAHU');
  if (!rahu) return { present: false, outside: [] };
  const seven = natal.planets.filter((p) => !['RAHU', 'KETU'].includes(String(p.name)));
  const rel = seven.map((p) => ({ name: planetName(p.name), d: (((p.absoluteDegree - rahu.absoluteDegree) % 360) + 360) % 360 }));
  const firstHalf = rel.filter((r) => r.d <= 180);
  const secondHalf = rel.filter((r) => r.d >= 180 || r.d === 0);
  if (firstHalf.length === seven.length) return { present: true, direction: 'rahu-to-ketu', outside: [] };
  if (secondHalf.length === seven.length) return { present: true, direction: 'ketu-to-rahu', outside: [] };
  const outside = firstHalf.length >= secondHalf.length ? rel.filter((r) => r.d > 180) : rel.filter((r) => r.d > 0 && r.d < 180);
  return { present: false, outside: outside.map((r) => r.name) };
}

/** Sign distance counted inclusively (1 = same sign). */
export function signDistance(fromSign: number, toSign: number): number {
  return ((toSign - fromSign + 12) % 12) + 1;
}

export interface SubPeriodRelation {
  /** Position of the sub-period lord counted from the period lord's sign (1–12). */
  fromParent: number;
  /** Natural (naisargika) relationship of the period lord towards the sub-period lord. */
  natural: 'Friend' | 'Neutral' | 'Enemy' | 'Self';
}

/**
 * Classical dasha reading begins by locating the sub-period lord relative to the
 * period lord (BPHS dasha-phala chapters): the sign distance between them and
 * their natural relationship. Reported as facts, never graded. Decision KUN-008.
 */
export function subPeriodRelation(natal: NormalizedChart, parent: string, child: string): SubPeriodRelation {
  const a = natal.planets.find((p) => String(p.name) === parent);
  const b = natal.planets.find((p) => String(p.name) === child);
  if (!a || !b) throw new Error(`PLANET_MISSING: ${parent}/${child}`);
  if (parent === child) return { fromParent: 1, natural: 'Self' };
  const rel = String(getNaturalRelationship(parent as PlanetSymbol, child as PlanetSymbol));
  return {
    fromParent: signDistance(a.rashiIndex, b.rashiIndex),
    natural: rel === 'FRIEND' ? 'Friend' : rel === 'ENEMY' ? 'Enemy' : 'Neutral',
  };
}
