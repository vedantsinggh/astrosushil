/**
 * Premium Personalised Kundli module — calculations, evidence, blocks and
 * module validation. No network, no paid API, no LaTeX compile.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { NormalizedChart, PanchangCalculator } from '@astro/astrology-engine';
import { buildChartSnapshot, ChartSnapshot, SubjectInput } from '../platform/snapshot/chart-snapshot';
import { EvidenceRegistry } from '../platform/evidence/evidence-registry';
import { validateModule } from '../platform/registry';
import { CORE_BLOCKS } from '../platform/render/blocks';
import { LlmNarrator, DEFAULT_NARRATOR_CONFIG } from '../platform/llm/narrator';
import { OfflineTestProvider } from '../platform/llm/offline-test-provider';
import { InMemoryTopicCacheStore } from '../platform/llm/topic-cache';
import { SignPeriod } from '../platform/snapshot/transit-periods';
import { KUNDLI_MODULE } from '../platform/reports/kundli';
import { KUNDLI_VARGAS } from '../platform/reports/kundli/blocks/charts';
import { KundliExt } from '../platform/reports/kundli/extend';
import { computeVedicDay, rituForMasa, samvatYears, toGhatiPala, bhayatBhabhog } from '../platform/reports/kundli/calc/vedic-day';
import { computeSadeSatiCycles, phaseOf, sadeSatiStatusAt } from '../platform/reports/kundli/calc/sade-sati';
import { conjunctionGroups, kaalSarpPattern, signDistance, subPeriodRelation } from '../platform/reports/kundli/calc/patterns';

const AS_OF = new Date('2026-11-18T00:00:00Z');
// Synthetic subjects only.
const PUNE: SubjectInput = { name: 'Synthetic Native One', gender: 'male', dateOfBirth: '1991-03-14', timeOfBirth: '05:20', placeName: 'Pune', latitude: 18.5204, longitude: 73.8567, timezone: 'Asia/Kolkata' };
const TORONTO: SubjectInput = { name: 'Synthetic Native Two', gender: 'female', dateOfBirth: '1978-09-02', timeOfBirth: '22:40', placeName: 'Toronto', latitude: 43.6532, longitude: -79.3832, timezone: 'America/Toronto' };

interface Built { snap: ChartSnapshot; ext: Record<string, unknown>; registry: EvidenceRegistry }
async function build(subject: SubjectInput): Promise<Built> {
  const def = validateModule(KUNDLI_MODULE);
  const snap = await buildChartSnapshot(subject, { asOf: AS_OF, vargas: def.requires.vargas, transitYears: def.requires.transitYears });
  const ext = await KUNDLI_MODULE.extend!({ snapshot: snap });
  const registry = new EvidenceRegistry(snap, {
    contributors: [(add, reg) => KUNDLI_MODULE.evidence!(add, { snapshot: snap, ext, registry: reg })],
  });
  return { snap, ext, registry };
}

let A: Built;
let B: Built;
beforeAll(async () => {
  A = await build(PUNE);
  B = await build(TORONTO);
}, 120000);

const kx = (b: Built) => b.ext.kundli as KundliExt;

describe('Vedic day (sunrise-to-sunrise vara) — KUN-002', () => {
  it('assigns a pre-sunrise birth to the previous weekday', () => {
    const vd = kx(A).vedicDay;
    expect(vd.civilWeekday).toBe('Thursday'); // 14 Mar 1991 local calendar day
    expect(vd.varaWeekday).toBe('Wednesday'); // born 05:20, before sunrise
    expect(Date.parse(vd.sunriseIso)).toBeLessThan(Date.parse(vd.birthIso));
    expect(Date.parse(vd.nextSunriseIso)).toBeGreaterThan(Date.parse(vd.birthIso));
    expect(vd.bornAfterSunset).toBe(true); // between the previous sunset and the next sunrise
  });

  it('corrects the engine UTC weekday for a western-hemisphere evening birth', () => {
    const vd = kx(B).vedicDay;
    expect(vd.engineWeekday).toBe('Sunday'); // 02:40 UTC on 3 Sep
    expect(vd.varaWeekday).toBe('Saturday');
    expect(vd.civilWeekday).toBe('Saturday');
    expect(vd.varaName).toBe('Shanivara');
  });

  it('is deterministic', () => {
    const p = kx(A).panchangBirth;
    const again = computeVedicDay({
      birthIso: kx(A).vedicDay.birthIso, latitude: PUNE.latitude, longitude: PUNE.longitude, timezone: PUNE.timezone,
      timezoneOffsetMinutes: 330, enginePanchang: p, panchangCalculator: new PanchangCalculator(),
    });
    expect(again).toEqual(kx(A).vedicDay);
  });

  it('converts time to ghati-pala and computes samvat, ritu, bhayat', () => {
    expect(toGhatiPala(24 * 60000).text).toBe('1 gh 00 pal');
    expect(toGhatiPala(25 * 60000)).toMatchObject({ ghati: 1, pala: 3 });
    expect(samvatYears(1991, 3, 'Phalguna')).toEqual({ vikram: 2047, shaka: 1912 });
    expect(samvatYears(1991, 4, 'Chaitra')).toEqual({ vikram: 2048, shaka: 1913 });
    expect(samvatYears(1983, 12, 'Pausha').vikram).toBe(2040);
    expect(rituForMasa('Shravana')).toMatch(/Varsha/);
    const bb = bhayatBhabhog('2000-01-01T12:00:00Z', '2000-01-01T00:00:00Z', '2000-01-02T00:00:00Z')!;
    expect(bb.bhayat.ghati).toBe(30);
    expect(bb.bhabhog.ghati).toBe(60);
    expect(bhayatBhabhog('2000-01-03T00:00:00Z', '2000-01-01T00:00:00Z', '2000-01-02T00:00:00Z')).toBeUndefined();
  });
});

describe('Sade Sati cycles — KUN-006', () => {
  const per = (signIndex: number, s: string, e: string): SignPeriod => ({ planet: 'SATURN', sign: String(signIndex), signIndex, startIso: s, endIso: e, enteredRetrograde: false });

  it('classifies phases from the Moon sign', () => {
    expect(phaseOf(11, 12)).toBe('rising');
    expect(phaseOf(12, 12)).toBe('peak');
    expect(phaseOf(1, 12)).toBe('setting');
    expect(phaseOf(2, 12)).toBeNull();
  });

  it('merges a retrograde step-back and spans first entry to last exit', () => {
    const periods = [
      per(10, '2000-01-01', '2002-01-01'),
      per(11, '2002-01-01', '2002-06-01'), // enters 12th from Moon(12)
      per(10, '2002-06-01', '2002-10-01'), // brief retrograde step back
      per(11, '2002-10-01', '2004-06-01'),
      per(12, '2004-06-01', '2007-01-01'),
      per(1, '2007-01-01', '2009-06-01'),
      per(2, '2009-06-01', '2012-01-01'),
    ];
    const cycles = computeSadeSatiCycles(periods, 12);
    expect(cycles).toHaveLength(1);
    expect(cycles[0].startIso).toBe('2002-01-01');
    expect(cycles[0].endIso).toBe('2009-06-01');
    expect(cycles[0].phases.map((p) => p.phase)).toEqual(['rising', 'peak', 'setting']);
    expect(cycles[0].runningAtBirth).toBe(false);
    const st = sadeSatiStatusAt(cycles, periods, 12, '2005-01-01');
    expect(st.active?.index).toBe(1);
    expect(st.phase).toBe('peak');
  });

  it('finds real lifetime cycles from the engine (≈7.5 years, ≈30 years apart)', () => {
    const cycles = kx(A).sadeSati;
    expect(cycles.length).toBeGreaterThanOrEqual(3);
    for (const c of cycles.filter((x) => !x.runningAtBirth)) {
      const years = (Date.parse(c.endIso) - Date.parse(c.startIso)) / 3.15576e10;
      expect(years).toBeGreaterThan(6);
      expect(years).toBeLessThan(9.5);
    }
    // Pune native: Moon in Aquarius, Saturn in Capricorn (12th) at birth.
    expect(cycles[0].runningAtBirth).toBe(true);
  });
});

describe('Chart patterns', () => {
  const planet = (name: string, abs: number, house = 1) => ({ name, absoluteDegree: abs, degree: abs % 30, house, rashiIndex: Math.floor(abs / 30) + 1 });

  it('detects the Rahu-Ketu one-sided pattern (KUN-010)', () => {
    const base = ['SUN', 'MOON', 'MARS', 'MERCURY', 'JUPITER', 'VENUS', 'SATURN'];
    const inside = { planets: [planet('RAHU', 10), planet('KETU', 190), ...base.map((n, i) => planet(n, 20 + i * 20))] } as unknown as NormalizedChart;
    expect(kaalSarpPattern(inside)).toMatchObject({ present: true, direction: 'rahu-to-ketu' });
    const other = { planets: [planet('RAHU', 10), planet('KETU', 190), ...base.map((n, i) => planet(n, 200 + i * 20))] } as unknown as NormalizedChart;
    expect(kaalSarpPattern(other)).toMatchObject({ present: true, direction: 'ketu-to-rahu' });
    const mixed = { planets: [planet('RAHU', 10), planet('KETU', 190), ...base.map((n, i) => planet(n, i === 0 ? 250 : 20 + i * 20))] } as unknown as NormalizedChart;
    expect(kaalSarpPattern(mixed)).toEqual({ present: false, outside: ['Sun'] });
  });

  it('groups conjunctions by sign with spread and closest pair', () => {
    const groups = conjunctionGroups(A.snap.natal);
    for (const g of groups) {
      expect(g.planets.length).toBeGreaterThanOrEqual(2);
      expect(g.spanDegrees).toBeLessThan(30);
      expect(g.closest.orb).toBeLessThanOrEqual(g.spanDegrees);
    }
    const sharing = A.snap.natal.houses.filter((h) => h.occupants.length >= 2).length;
    expect(groups).toHaveLength(sharing);
  });

  it('locates sub-period lords from the period lord (KUN-008)', () => {
    expect(signDistance(1, 1)).toBe(1);
    expect(signDistance(12, 1)).toBe(2);
    expect(signDistance(5, 1)).toBe(9);
    expect(subPeriodRelation(A.snap.natal, 'SUN', 'SUN')).toEqual({ fromParent: 1, natural: 'Self' });
    expect(subPeriodRelation(A.snap.natal, 'SUN', 'MOON').natural).toBe('Friend');
    expect(subPeriodRelation(A.snap.natal, 'SUN', 'SATURN').natural).toBe('Enemy');
  });
});

describe('Dasha to pratyantardasha', () => {
  it('covers the whole life with 9 Mahadashas, each with Antardashas and Pratyantardashas', () => {
    for (const b of [A, B]) {
      const mds = kx(b).dasha.mahadashas;
      expect(mds).toHaveLength(9);
      expect(mds[0].startDateIso).toBe(b.snap.raw.metadata.normalizedTime.utcIsoString);
      for (const md of mds) {
        expect(md.subPeriods!.length).toBeGreaterThan(0);
        for (const ad of md.subPeriods!) expect(ad.subPeriods!.length).toBeGreaterThan(0);
      }
      // Same Mahadasha dates as the core snapshot.
      expect(mds.map((m) => m.endDateIso)).toEqual(b.snap.vimshottari.mahadashas.map((m) => m.endDateIso));
    }
  });
});

describe('Kundli evidence', () => {
  it('registers namespaced, value-bearing evidence for both subjects', () => {
    for (const b of [A, B]) {
      for (const id of ['kundli.vara', 'kundli.tithi', 'kundli.nitya-yoga', 'kundli.karana', 'kundli.moon.pada', 'kundli.conjunctions.count',
        'kundli.mangal.pattern', 'kundli.mangal.exceptions', 'kundli.sadesati.status', 'kundli.kaalsarp.pattern', 'kundli.yogas.count',
        'kundli.remedy.focus', 'kundli.karaka.ak.placement', 'kundli.karakamsha.sign', 'kundli.numerology.mulank-planet']) {
        expect(b.registry.has(id), id).toBe(true);
      }
      for (let n = 1; n <= 9; n++) {
        expect(b.registry.has(`kundli.md.0${n}.lord`)).toBe(true);
        expect(b.registry.has(`kundli.md.0${n}.lord-house`)).toBe(true);
      }
      for (let h = 1; h <= 12; h++) expect(b.registry.has(`kundli.house.${h}.aspected-by`)).toBe(true);
      for (const e of b.registry.all().filter((x) => x.id.startsWith('kundli.'))) {
        expect(e.label).not.toMatch(/undefined|NaN/);
      }
    }
    expect(A.registry.get('kundli.vara')!.value).toBe('Wednesday');
    expect(B.registry.get('kundli.vara')!.value).toBe('Saturday');
  });

  it('MD lord evidence agrees with the natal chart', () => {
    const md1 = String(A.registry.get('kundli.md.01.lord')!.value);
    expect(A.registry.get('kundli.md.01.lord-house')!.value).toBe(A.registry.get(`planet.${md1.toLowerCase()}.d1.house`)!.value);
  });
});

describe('Kundli module', () => {
  it('passes module validation and stays within the narrative budget', () => {
    const def = validateModule(KUNDLI_MODULE);
    expect(def.id).toBe('kundli');
    expect(def.reportType).toBe('KUNDLI');
    expect(def.requires.vargas).toEqual(KUNDLI_VARGAS);
    const narrative = def.sections.flatMap((s) => s.topics).filter((t) => t.kind === 'narrative');
    expect(narrative.length).toBeGreaterThanOrEqual(35);
    expect(narrative.length).toBeLessThanOrEqual(45);
    for (const s of def.sections) expect(s.topics.filter((t) => t.kind === 'narrative').length).toBeLessThanOrEqual(6);
    for (const t of def.sections.flatMap((s) => s.topics)) expect(t.referencePages || t.bonus, t.id).toBeTruthy();
  });

  it('every narrative topic has its required evidence for both subjects', () => {
    const def = validateModule(KUNDLI_MODULE);
    for (const b of [A, B]) {
      for (const t of def.sections.flatMap((s) => s.topics).filter((x) => x.kind === 'narrative')) {
        for (const p of t.requiredEvidence) expect(b.registry.resolve([p]).length, `${t.id}: ${p}`).toBeGreaterThan(0);
      }
    }
  });

  it('every block renders and cites only existing evidence', () => {
    const def = validateModule(KUNDLI_MODULE);
    const blocks = { ...CORE_BLOCKS, ...KUNDLI_MODULE.blocks! };
    for (const b of [A, B]) {
      for (const t of def.sections.flatMap((s) => s.topics).filter((x) => x.kind === 'data')) {
        const out = blocks[t.block!]({ snapshot: b.snap, registry: b.registry, ext: b.ext });
        expect(out.tex.length, t.id).toBeGreaterThan(20);
        expect(out.tex).not.toMatch(/undefined|NaN/);
        expect(out.evidenceIds.filter((id) => !b.registry.has(id)), t.id).toEqual([]);
      }
    }
  });

  it('offline narratives pass claim and editorial validation for every topic', async () => {
    const def = validateModule(KUNDLI_MODULE);
    const narrator = new LlmNarrator(new OfflineTestProvider(), new InMemoryTopicCacheStore(), { ...DEFAULT_NARRATOR_CONFIG, model: 'offline-test' });
    for (const s of def.sections) {
      const topics = s.topics.filter((t) => t.kind === 'narrative');
      if (!topics.length) continue;
      const out = await narrator.generateBatch({ definition: def, registry: A.registry, subjectRef: A.snap.subjectRef, topics, sectionTitle: s.title, priorSummaries: [] });
      for (const o of out) expect(o.status, `${o.topic.id}: ${o.error ?? ''}`).toBe('generated');
    }
  });
});
