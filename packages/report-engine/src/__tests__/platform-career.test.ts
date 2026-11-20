/**
 * Career report module — calculations, evidence, blocks and module validation.
 * No network, no paid API (synthetic subjects only).
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { buildChartSnapshot, ChartSnapshot, SubjectInput } from '../platform/snapshot/chart-snapshot';
import { EvidenceRegistry, planetName } from '../platform/evidence/evidence-registry';
import { validateModule } from '../platform/registry';
import { validateGeneratedTopic } from '../platform/validation/claim-validator';
import { ReportTopicSchema } from '../platform/contracts';
import { CAREER_MODULE } from '../platform/reports/career';
import {
  CareerExt, computeCareer, countFrom, durationText, signFrom, compare, signQuality, signDignity,
} from '../platform/reports/career/calc/career-calc';

const AS_OF = new Date('2026-11-18T00:00:00Z');
const A: SubjectInput = { name: 'Career Test A', gender: 'male', dateOfBirth: '1990-07-14', timeOfBirth: '09:20', placeName: 'Pune', latitude: 18.5204, longitude: 73.8567, timezone: 'Asia/Kolkata' };
const B: SubjectInput = { name: 'Career Test B', gender: 'female', dateOfBirth: '1978-02-03', timeOfBirth: '22:45', placeName: 'Chennai', latitude: 13.0827, longitude: 80.2707, timezone: 'Asia/Kolkata' };

interface Built { snap: ChartSnapshot; ext: Record<string, unknown>; c: CareerExt; reg: EvidenceRegistry }
const built: Built[] = [];

async function build(s: SubjectInput): Promise<Built> {
  const snap = await buildChartSnapshot(s, { asOf: AS_OF, vargas: ['D1', 'D9', 'D10'], transitYears: 2 });
  const ext = await CAREER_MODULE.extend!({ snapshot: snap });
  const reg = new EvidenceRegistry(snap, { contributors: [(add, r) => CAREER_MODULE.evidence!(add, { snapshot: snap, ext, registry: r })] });
  return { snap, ext, c: ext.career as CareerExt, reg };
}

beforeAll(async () => {
  built.push(await build(A), await build(B));
}, 120000);

describe('career calc helpers', () => {
  it('counts signs inclusively', () => {
    expect(signFrom(1, 1)).toBe(1);
    expect(signFrom(11, 5)).toBe(3);
    expect(signFrom(12, 2)).toBe(1);
    expect(countFrom(9, 1)).toBe(5);
    expect(countFrom(1, 12)).toBe(12);
    expect(countFrom(5, 5)).toBe(1);
  });
  it('classifies sign quality and dignity classically', () => {
    expect(signQuality('Leo')).toEqual({ sign: 'Leo', element: 'fire', modality: 'fixed' });
    expect(signQuality('Pisces').modality).toBe('dual');
    expect(signDignity('Sun', 1)).toBe('exalted');
    expect(signDignity('Saturn', 1)).toBe('debilitated');
    expect(signDignity('Saturn', 11)).toBe('own sign');
    expect(signDignity('Rahu', 2)).toMatch(/neither/);
  });
  it('formats durations and comparisons', () => {
    expect(durationText('2025-03-29T00:00:00Z', '2027-06-02T00:00:00Z')).toBe('2 years 2 months');
    expect(durationText('2026-01-01T00:00:00Z', '2026-01-11T00:00:00Z')).toBe('10 days');
    expect(compare(30, 25)).toBe('higher');
    expect(compare(25, 25)).toBe('equal');
  });
});

describe('career calculations', () => {
  it('is deterministic', async () => {
    const again = await build(A);
    expect(JSON.stringify(again.c)).toBe(JSON.stringify(built[0].c));
  });

  it('house aspects agree with the engine aspects on each planet', () => {
    for (const { snap, c } of built) {
      for (const p of snap.natal.planets) {
        for (const h of p.aspectsCast ?? []) {
          expect(c.aspects[h].map((a) => a.planet)).toContain(planetName(p.name));
        }
      }
    }
  });

  it('D10 houses are counted from the D10 ascendant and match core D10 evidence', () => {
    for (const { c, reg } of built) {
      expect(c.d10.houses).toHaveLength(12);
      expect(reg.get('asc.d10.sign')!.value).toBe(c.d10.ascSign);
      expect(c.d10.houses[0].sign).toBe(c.d10.ascSign);
      for (const [name, pl] of Object.entries(c.d10.planets)) {
        expect(reg.get(`planet.${name.toLowerCase()}.d10.sign`)!.value).toBe(pl.sign);
        expect(pl.house).toBe(countFrom(c.d10.ascSignIndex, pl.signIndex));
      }
      for (const h of c.d10.houses) expect(h.lordHouse).toBe(c.d10.planets[h.lord].house);
    }
  });

  it('BNN links Saturn only by sign (conjunction, trines, 2nd, 12th)', () => {
    for (const { snap, c } of built) {
      const sign = (n: string) => snap.natal.planets.find((p) => planetName(p.name) === n)!.rashiIndex;
      const s = c.bnn.saturnSignIndex;
      for (const p of c.bnn.trine5) expect(countFrom(s, sign(p))).toBe(5);
      for (const p of c.bnn.trine9) expect(countFrom(s, sign(p))).toBe(9);
      for (const p of c.bnn.second) expect(countFrom(s, sign(p))).toBe(2);
      for (const p of c.bnn.twelfth) expect(countFrom(s, sign(p))).toBe(12);
      for (const p of c.bnn.conjunct) expect(sign(p)).toBe(s);
      const linked = new Set([...c.bnn.conjunct, ...c.bnn.trine5, ...c.bnn.trine9, ...c.bnn.second, ...c.bnn.twelfth]);
      const expected = snap.natal.planets.filter((p) => planetName(p.name) !== 'Saturn' && [1, 2, 5, 9, 12].includes(countFrom(s, p.rashiIndex)));
      expect(linked.size).toBe(expected.length);
    }
  });

  it('Karmajiva follows Brihat Jataka ch. 10 (Navamsa sign lord of the 10th lord)', () => {
    for (const { snap, c } of built) {
      expect(c.karmajiva.map((k) => k.from)).toEqual(['Lagna', 'Moon', 'Sun']);
      const lagna = c.karmajiva[0];
      expect(lagna.tenthSign).toBe(snap.natal.houses.find((h) => h.number === 10)!.sign);
      const d9 = Object.values(snap.vargas.D9!.placements).find((pl) => pl.planet !== 'Ascendant' && planetName(String(pl.planet)) === lagna.tenthLord)!;
      expect(lagna.lordNavamsaSign).toBe(['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'][d9.rashiIndex - 1]);
    }
  });

  it('only lists engine-detected yogas', () => {
    for (const { snap, c } of built) {
      const detected = new Set(snap.yogas.filter((y) => y.isDetected).map((y) => y.id));
      for (const y of c.yogas) expect(detected.has(y.id)).toBe(true);
    }
  });

  it('transit periods are contiguous, contain the report date and use true ingress dates', () => {
    for (const { c } of built) {
      expect(c.transits.map((t) => t.planet)).toEqual(['Saturn', 'Jupiter', 'Rahu', 'Ketu']);
      for (const t of c.transits) {
        expect(Date.parse(t.current.startIso)).toBeLessThanOrEqual(AS_OF.getTime());
        expect(Date.parse(t.current.endIso)).toBeGreaterThan(AS_OF.getTime());
        expect(t.upcoming.length).toBeGreaterThanOrEqual(1);
        let prev = t.current;
        for (const u of t.upcoming) { expect(u.startIso).toBe(prev.endIso); prev = u; }
      }
      // Ephemeris fact independent of the native: Saturn entered sidereal Pisces in late March 2025.
      const sat = c.transits[0].current;
      expect(sat.sign).toBe('Pisces');
      expect(sat.startIso.slice(0, 7)).toBe('2025-03');
      // Rahu and Ketu are always opposite.
      const rahu = c.transits[2].current;
      const ketu = c.transits[3].current;
      expect(countFrom(rahu.signIndex, ketu.signIndex)).toBe(7);
    }
  });

  it('dasha timeline marks exactly one running Mahadasha, matching core evidence', () => {
    for (const { c, reg } of built) {
      const active = c.dashas.filter((d) => d.active);
      expect(active).toHaveLength(1);
      expect(active[0].lord).toBe(reg.get('dasha.current.md')!.value);
      expect(c.antardashas.filter((a) => a.active).map((a) => a.lord)).toEqual([reg.get('dasha.current.ad')!.value]);
    }
  });
});

describe('career evidence', () => {
  it('registers namespaced, label-grounded evidence that verifies as claims', () => {
    for (const { reg } of built) {
      const items = reg.all().filter((i) => i.id.startsWith('career.'));
      expect(items.length).toBeGreaterThan(100);
      const topic = ReportTopicSchema.parse({ id: 't', title: 't', kind: 'narrative', objective: 'x', requiredEvidence: ['career.*'] });
      for (const item of items) {
        const res = validateGeneratedTopic(topic, {
          topicId: 't', lead: 'Lead sentence here.', paragraphs: ['A paragraph long enough for the schema check.'], bullets: [],
          claims: [{ statement: item.label, evidenceIds: [item.id] }],
        }, reg, { expectedSnapshotId: reg.snapshotId, allowedEvidence: ['career.*'] });
        expect(res.claims[0].status, `${item.id}: ${item.label}`).toBe('verified');
      }
    }
  });

  it('has the key IDs every chart needs', () => {
    for (const { reg } of built) {
      for (const id of ['career.d10.house.10.lord-house', 'career.bnn.trine', 'career.sav.service-vs-partnership', 'career.sav.effort-vs-gain',
        'career.transit.saturn.current', 'career.transit.rahu.current', 'career.transit.ketu.current', 'career.transit.jupiter.current',
        'career.karmajiva.lagna', 'career.gov.sun-saturn', 'career.yogas.relevant', 'career.dasha.next.md', 'career.house.10.aspected-by']) {
        expect(reg.has(id), id).toBe(true);
      }
    }
  });
});

describe('career module', () => {
  it('validates and declares D10 + D9', () => {
    const def = validateModule(CAREER_MODULE);
    expect(def.id).toBe('career');
    expect(def.reportType).toBe('CAREER');
    expect(def.requires.vargas).toEqual(expect.arrayContaining(['D9', 'D10']));
    for (const s of def.sections) expect(s.topics.filter((t) => t.kind === 'narrative').length).toBeLessThanOrEqual(6);
  });

  it('every narrative topic resolves its required evidence for both charts', () => {
    const def = validateModule(CAREER_MODULE);
    for (const { reg } of built) {
      for (const t of def.sections.flatMap((s) => s.topics).filter((x) => x.kind === 'narrative')) {
        for (const p of t.requiredEvidence) expect(reg.resolve([p]).length, `${t.id}: ${p}`).toBeGreaterThan(0);
      }
    }
  });

  it('every block renders and cites only existing evidence', () => {
    const def = validateModule(CAREER_MODULE);
    const blocks = CAREER_MODULE.blocks!;
    const used = def.sections.flatMap((s) => s.topics).filter((t) => t.kind === 'data').map((t) => t.block!);
    for (const { snap, reg, ext } of built) {
      for (const key of used.filter((k) => k in blocks)) {
        const out = blocks[key]({ snapshot: snap, registry: reg, ext });
        expect(out.evidenceIds.length, key).toBeGreaterThan(0);
        for (const id of out.evidenceIds) expect(reg.has(id), `${key} -> ${id}`).toBe(true);
        expect(out.tex).not.toMatch(/undefined|NaN/);
      }
    }
  });
});
