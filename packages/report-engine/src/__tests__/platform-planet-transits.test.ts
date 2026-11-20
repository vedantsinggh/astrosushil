/**
 * Planet-transit report family (Saturn, Jupiter Transit, Rahu–Ketu Transit):
 * calculations, evidence, blocks and module validation. No network, no LLM.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { PlanetSymbol } from '@astro/astrology-engine';
import { buildChartSnapshot, ChartSnapshot, SubjectInput } from '../platform/snapshot/chart-snapshot';
import { EvidenceRegistry } from '../platform/evidence/evidence-registry';
import { ReportModule } from '../platform/module';
import { validateModule } from '../platform/registry';
import { CORE_BLOCKS } from '../platform/render/blocks';
import { SATURN_MODULE } from '../platform/reports/saturn';
import { JUPITER_TRANSIT_MODULE } from '../platform/reports/jupiter-transit';
import { RAHU_KETU_TRANSIT_MODULE } from '../platform/reports/rahu-ketu-transit';
import {
  computeSignSpans,
  groupStays,
  houseFrom,
  isYogakaraka,
  pairRetroWindows,
  PlanetTransitData,
  SignSpan,
  Station,
} from '../platform/reports/_planet-transit-shared';
import { SaturnExt } from '../platform/reports/saturn/saturn.calc';

const AS_OF = new Date('2026-11-18T00:00:00Z');
const A: SubjectInput = { name: 'Test Native Alpha', gender: 'female', dateOfBirth: '1994-03-17', timeOfBirth: '06:42', placeName: 'Jaipur', latitude: 26.9124, longitude: 75.7873, timezone: 'Asia/Kolkata' };
const B: SubjectInput = { name: 'Test Native Beta', gender: 'male', dateOfBirth: '1971-08-29', timeOfBirth: '21:10', placeName: 'Pune', latitude: 18.5204, longitude: 73.8567, timezone: 'Asia/Kolkata' };

interface Built { snapshot: ChartSnapshot; ext: Record<string, unknown>; registry: EvidenceRegistry }

async function build(module: ReportModule, subject: SubjectInput, snapshot?: ChartSnapshot): Promise<Built> {
  const snap = snapshot ?? (await buildChartSnapshot(subject, { asOf: AS_OF, vargas: ['D1'], transitYears: 3 }));
  const ext = await module.extend!({ snapshot: snap });
  const registry = new EvidenceRegistry(snap, { contributors: [(add, reg) => module.evidence!(add, { snapshot: snap, ext, registry: reg })] });
  return { snapshot: snap, ext, registry };
}

const MODULES: Array<[string, ReportModule]> = [
  ['saturn', SATURN_MODULE],
  ['jupiter-transit', JUPITER_TRANSIT_MODULE],
  ['rahu-ketu-transit', RAHU_KETU_TRANSIT_MODULE],
];

let snapA: ChartSnapshot;
let snapB: ChartSnapshot;
const built: Record<string, { A: Built; B: Built }> = {};

beforeAll(async () => {
  snapA = await buildChartSnapshot(A, { asOf: AS_OF, vargas: ['D1'], transitYears: 3 });
  snapB = await buildChartSnapshot(B, { asOf: AS_OF, vargas: ['D1'], transitYears: 3 });
  for (const [id, m] of MODULES) built[id] = { A: await build(m, A, snapA), B: await build(m, B, snapB) };
}, 180000);

// ---------------------------------------------------------------------------
describe('timeline primitives', () => {
  const span = (sign: number, s: string, e: string, retro = false): SignSpan => ({
    signIndex: sign, sign: String(sign), startIso: `${s}T00:00:00.000Z`, endIso: `${e}T00:00:00.000Z`, enteredRetrograde: retro, startClipped: false, endClipped: false,
  });

  it('groups retrograde re-entries into one stay and keeps separate passes apart', () => {
    const stays = groupStays([
      span(12, '2025-03-29', '2027-06-02'), span(1, '2027-06-02', '2027-10-20'), span(12, '2027-10-20', '2028-02-23', true),
      span(1, '2028-02-23', '2029-08-08'), span(12, '2054-01-01', '2056-06-01'),
    ]);
    expect(stays.map((s) => [s.signIndex, s.spans.length])).toEqual([[12, 2], [1, 2], [12, 1]]);
    expect(stays[0].lastEndIso.slice(0, 10)).toBe('2028-02-23');
  });

  it('pairs retrograde and direct stations', () => {
    const st = (type: Station['type'], iso: string): Station => ({ type, iso, signIndex: 12, sign: 'Pisces', longitude: 345 });
    const w = pairRetroWindows([st('direct', '2025-01-01'), st('retrograde', '2025-07-13'), st('direct', '2025-11-28'), st('retrograde', '2026-07-27')]);
    expect(w).toHaveLength(3);
    expect(w[0].startIso).toBeUndefined();
    expect(w[1]).toMatchObject({ startIso: '2025-07-13', endIso: '2025-11-28' });
    expect(w[2].endIso).toBeUndefined();
  });

  it('counts houses inclusively and detects yogakaraka (kendra + trikona lordship)', () => {
    expect(houseFrom(6, 12)).toBe(7);
    expect(houseFrom(1, 12)).toBe(12);
    expect(isYogakaraka([4, 5])).toBe(true); // Saturn for Libra Ascendant
    expect(isYogakaraka([9, 10])).toBe(true); // Saturn for Taurus Ascendant
    expect(isYogakaraka([1, 2])).toBe(false);
  });

  it('solves Saturn ingresses including the 2027–2028 Aries/Pisces retrograde split', async () => {
    const spans = await computeSignSpans(PlanetSymbol.SATURN, new Date('2025-01-01T00:00:00Z'), new Date('2030-01-01T00:00:00Z'));
    const starts = spans.filter((s) => !s.startClipped).map((s) => `${s.sign}@${s.startIso.slice(0, 10)}${s.enteredRetrograde ? 'R' : ''}`);
    // Engine 0.2.0 (true Lahiri, ADR-017): the Aries ingress is 2027-06-03 00:33 UT = 06:03 IST.
    // Published Lahiri panchangs give 3 June 2027, about 06:23-06:30 IST (e.g. AstroSage "Saturn
    // Transit 2027", astrosage.com/2027/saturn-transit-2027.asp). The pre-0.2.0 linear ayanamsa gave
    // about 2027-06-02 21:30 UT (03:00 IST), so this UTC date moved by one day.
    expect(starts.slice(0, 4)).toEqual(['Pisces@2025-03-29', 'Aries@2027-06-03', 'Pisces@2027-10-20R', 'Aries@2028-02-23']);
  });

  it('never marks node ingresses as retrograde re-entries, and Ketu is always opposite Rahu', async () => {
    const from = new Date('2024-01-01T00:00:00Z');
    const to = new Date('2040-01-01T00:00:00Z');
    const ra = await computeSignSpans(PlanetSymbol.RAHU, from, to);
    const ke = await computeSignSpans(PlanetSymbol.KETU, from, to);
    expect(ra.every((s) => !s.enteredRetrograde)).toBe(true);
    expect(ra.length).toBe(ke.length);
    ra.forEach((s, i) => expect(houseFrom(s.signIndex, ke[i].signIndex)).toBe(7));
    expect(ra.find((s) => s.sign === 'Aquarius')!.startIso.slice(0, 10)).toBe('2025-05-18');
  });
});

// ---------------------------------------------------------------------------
describe('Saturn lifetime: Sade Sati, Kantaka, Dhaiya', () => {
  const life = (k: 'A' | 'B') => (built.saturn[k].ext as unknown as SaturnExt).life;

  it('finds every Sade Sati cycle from the solver, with phases in the 12th, 1st and 2nd from the Moon', () => {
    for (const k of ['A', 'B'] as const) {
      const L = life(k);
      expect(L.cycles.length).toBeGreaterThanOrEqual(3);
      for (const c of L.cycles) {
        expect(c.phases.map((p) => houseFrom(L.moonSign, p.signIndex))).toEqual([12, 1, 2]);
        expect(Date.parse(c.startIso)).toBeLessThan(Date.parse(c.endIso));
        const years = (Date.parse(c.endIso) - Date.parse(c.startIso)) / 3.15576e10;
        expect(years).toBeGreaterThan(6.5);
        expect(years).toBeLessThan(9);
      }
      for (let i = 1; i < L.cycles.length; i++) {
        const gap = (Date.parse(L.cycles[i].startIso) - Date.parse(L.cycles[i - 1].startIso)) / 3.15576e10;
        expect(gap).toBeGreaterThan(27);
        expect(gap).toBeLessThan(32);
      }
    }
  });

  it('is personal: different Moon signs give different Sade Sati dates (no fixed table)', () => {
    expect(life('A').moonSign).not.toBe(life('B').moonSign);
    expect(life('A').cycles[0].startIso).not.toBe(life('B').cycles[0].startIso);
  });

  it('reports Sade Sati status on the report date (Aries Moon, Saturn in Pisces = rising phase)', () => {
    const L = life('A');
    expect(L.moonSign).toBe(1);
    expect(L.status).toMatchObject({ active: true, phase: 'rising', saturnSign: 'Pisces', saturnHouseFromMoon: 12 });
    expect(built.saturn.A.registry.get('sadesati.status')!.value).toBe('active');
  });

  it('labels Kantaka (4/7/10) and Dhaiya (4/8) transits correctly', () => {
    for (const k of ['A', 'B'] as const) {
      const L = life(k);
      expect(L.kantak.length).toBeGreaterThanOrEqual(8);
      for (const p of L.kantak) {
        expect([4, 7, 8, 10]).toContain(p.houseFromMoon);
        expect(p.kinds.includes('kantaka')).toBe([4, 7, 10].includes(p.houseFromMoon));
        expect(p.kinds.includes('dhaiya')).toBe([4, 8].includes(p.houseFromMoon));
        expect(houseFrom(L.moonSign, p.signIndex)).toBe(p.houseFromMoon);
      }
    }
  });
});

// ---------------------------------------------------------------------------
describe('transit stays and evidence', () => {
  const data = (id: string, key: 'saturn' | 'jupiter' | 'rahu', k: 'A' | 'B' = 'A') =>
    (built[id][k].ext as { pt: Record<string, PlanetTransitData> }).pt[key];

  it('picks the stay in progress and the next one, with consistent houses', () => {
    const s = data('saturn', 'saturn');
    expect(s.a.sign).toBe('Pisces');
    expect(s.b.sign).toBe('Aries');
    expect(s.b.spans).toHaveLength(3); // Aries 2027, re-entry 2028–29, and the return from Taurus late 2029
    expect(s.a.retroWindows.length).toBeGreaterThanOrEqual(2);
    const asc = snapA.natal.ascendant.rashiIndex;
    expect(s.a.houseFromLagna).toBe(houseFrom(asc, s.a.signIndex));
    expect(s.a.aspects.map((x) => x.nth)).toEqual([3, 7, 10]);
    expect(data('jupiter-transit', 'jupiter').a.aspects.map((x) => x.nth)).toEqual([5, 7, 9]);
    const r = data('rahu-ketu-transit', 'rahu');
    expect(r.a.sign).toBe('Aquarius');
    expect(r.b.sign).toBe('Capricorn');
  });

  it('records Ashtakavarga bindus of the transit sign from the engine', () => {
    const s = data('saturn', 'saturn');
    expect(s.a.bav).toBe(snapA.ashtakavarga.bav[PlanetSymbol.SATURN as keyof typeof snapA.ashtakavarga.bav].signs[s.a.signIndex]);
    expect(s.a.sav).toBe(snapA.ashtakavarga.sav.signs[s.a.signIndex]);
    expect(data('rahu-ketu-transit', 'rahu').a.bav).toBeUndefined();
  });

  it('is deterministic for identical inputs', async () => {
    const again = await build(SATURN_MODULE, A, snapA);
    expect(again.registry.fingerprint(again.registry.all())).toBe(built.saturn.A.registry.fingerprint(built.saturn.A.registry.all()));
  });

  it('evidence labels contain their values', () => {
    for (const [id] of MODULES) {
      for (const item of built[id].A.registry.all().filter((i) => /^(saturn|jupiter|rahu|ketu|sadesati|kantak|transit-now)\./.test(i.id))) {
        const vals = Array.isArray(item.value) ? item.value : [item.value];
        if (typeof item.value === 'boolean' || vals.length === 0) continue;
        expect(vals.some((v) => item.label.toLowerCase().includes(String(v).toLowerCase())), `${item.id}: ${item.label}`).toBe(true);
      }
    }
  });
});

// ---------------------------------------------------------------------------
describe.each(MODULES)('module %s', (id, module) => {
  it('validates and declares its reportType', () => {
    const def = validateModule(module);
    expect(def.id).toBe(id);
    expect(['SATURN', 'JUPITER_TRANSIT', 'RAHU_KETU_TRANSIT']).toContain(def.reportType);
    for (const s of def.sections) expect(s.topics.filter((t) => t.kind === 'narrative').length).toBeLessThanOrEqual(6);
  });

  it('every topic maps a reference page or is marked bonus', () => {
    for (const s of validateModule(module).sections) for (const t of s.topics) expect(!!t.referencePages || t.bonus, t.id).toBe(true);
  });

  it.each(['A', 'B'] as const)('subject %s: required evidence resolves for every narrative topic', (k) => {
    const { registry } = built[id][k];
    for (const s of validateModule(module).sections) {
      for (const t of s.topics.filter((x) => x.kind === 'narrative')) {
        for (const p of t.requiredEvidence) expect(registry.resolve([p]).length, `${t.id} → ${p}`).toBeGreaterThan(0);
      }
    }
  });

  it.each(['A', 'B'] as const)('subject %s: every data block renders and cites only registered evidence', (k) => {
    const b = built[id][k];
    const blocks = { ...CORE_BLOCKS, ...(module.blocks ?? {}) };
    for (const s of validateModule(module).sections) {
      for (const t of s.topics.filter((x) => x.kind === 'data')) {
        const out = blocks[t.block!]({ snapshot: b.snapshot, registry: b.registry, ext: b.ext });
        expect(out.tex.length, t.id).toBeGreaterThan(20);
        expect(out.tex).not.toMatch(/undefined|NaN/);
        for (const e of out.evidenceIds) expect(b.registry.has(e), `${t.id} cites ${e}`).toBe(true);
      }
    }
  });
});
