/**
 * Finance and Couple Matching report modules — calculations, evidence, blocks
 * and module validation (no network, no paid API).
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { buildChartSnapshot, ChartSnapshot, SubjectInput } from '../platform/snapshot/chart-snapshot';
import { EvidenceRegistry } from '../platform/evidence/evidence-registry';
import { extractNatalAssertions } from '../platform/validation/claim-validator';
import { validateModule } from '../platform/registry';
import { ReportModule } from '../platform/module';
import { BlockContext } from '../platform/render/blocks';
import { classifyFunctionalNature } from '../platform/reports/_finance-couple-shared/functional-nature';
import { houseFrom, housesTouched, isFavourableFromMoon, periodsInRange } from '../platform/reports/_finance-couple-shared/gochara';
import { FINANCE_MODULE } from '../platform/reports/finance';
import { dashaSpans, outlookStartYear, outlookWindow, yearOutlook } from '../platform/reports/finance/finance.calc';
import { COUPLE_MATCHING_MODULE } from '../platform/reports/couple-matching';
import { computeMatch, dashaOverlap, groomOf, nodalAxis, saturnMoonPeriods } from '../platform/reports/couple-matching/couple.calc';

const AS_OF = new Date('2026-11-18T00:00:00Z');
const MALE: SubjectInput = { name: 'Synthetic Male', gender: 'male', dateOfBirth: '1990-04-12', timeOfBirth: '09:35', placeName: 'Jaipur', latitude: 26.9124, longitude: 75.7873, timezone: 'Asia/Kolkata' };
const FEMALE: SubjectInput = { name: 'Synthetic Female', gender: 'female', dateOfBirth: '1993-11-02', timeOfBirth: '18:20', placeName: 'Kochi', latitude: 9.9312, longitude: 76.2673, timezone: 'Asia/Kolkata' };

async function setup(module: ReportModule, subject: SubjectInput, partnerSubject?: SubjectInput) {
  const def = validateModule(module);
  const opts = { asOf: AS_OF, vargas: [...new Set(['D1', ...def.requires.vargas])] as typeof def.requires.vargas, transitYears: def.requires.transitYears };
  const snapshot = await buildChartSnapshot(subject, opts);
  const partner = partnerSubject ? await buildChartSnapshot(partnerSubject, opts) : undefined;
  const ext = module.extend ? await module.extend({ snapshot, partner }) : {};
  const registry = new EvidenceRegistry(snapshot, {
    partner,
    contributors: module.evidence ? [(add, reg) => module.evidence!(add, { snapshot, partner, ext, registry: reg })] : [],
  });
  const ctx: BlockContext = { snapshot, registry, partner, ext };
  return { def, snapshot, partner, ext, registry, ctx };
}

/** Every data topic renders and cites only existing evidence; every narrative topic has its required evidence. */
function checkModule(module: ReportModule, s: Awaited<ReturnType<typeof setup>>) {
  for (const section of s.def.sections) {
    for (const t of section.topics) {
      if (t.kind === 'data') {
        const out = module.blocks![t.block!](s.ctx);
        expect(out.tex.length, t.id).toBeGreaterThan(20);
        expect(out.tex, t.id).not.toMatch(/undefined|NaN/);
        expect(out.evidenceIds.filter((id) => !s.registry.has(id)), t.id).toEqual([]);
      } else if (t.kind === 'narrative') {
        for (const p of t.requiredEvidence) expect(s.registry.resolve([p]).length, `${t.id}: ${p}`).toBeGreaterThan(0);
        // The first four evidence labels (quoted verbatim as claims by the offline provider) must not contradict the native's chart.
        const labels = s.registry.resolve([...t.requiredEvidence, ...t.optionalEvidence]).slice(0, 4).map((e) => e.label);
        for (const label of labels) {
          for (const a of extractNatalAssertions(label)) {
            const key = a.planet[0].toUpperCase() + a.planet.slice(1).toLowerCase();
            if (a.house) expect(s.registry.get(`planet.${key.toLowerCase()}.d1.house`)!.value, `${t.id}: ${label}`).toBe(a.house);
            if (a.sign) expect(String(s.registry.get(`planet.${key.toLowerCase()}.d1.sign`)!.value).toLowerCase(), `${t.id}: ${label}`).toBe(a.sign.toLowerCase());
          }
        }
      }
    }
  }
}

describe('functional nature by Lagna (BPHS 34 / Laghu Parashari)', () => {
  const nat = (asc: number, p: string) => classifyFunctionalNature(asc).find((c) => c.planet === p)!.nature;
  it('finds the classical Yogakarakas', () => {
    expect(nat(2, 'Saturn')).toBe('yogakaraka'); // Taurus
    expect(nat(4, 'Mars')).toBe('yogakaraka'); // Cancer
    expect(nat(5, 'Mars')).toBe('yogakaraka'); // Leo
    expect(nat(7, 'Saturn')).toBe('yogakaraka'); // Libra
    expect(nat(10, 'Venus')).toBe('yogakaraka'); // Capricorn
    expect(nat(11, 'Venus')).toBe('yogakaraka'); // Aquarius
  });
  it('applies Lagna-lord, trikona, dusthana and kendra rules', () => {
    expect(nat(1, 'Mars')).toBe('favourable'); // Aries lord also owns 8th
    expect(nat(2, 'Jupiter')).toBe('challenging'); // Taurus: 8th + 11th
    expect(nat(2, 'Mercury')).toBe('favourable'); // Taurus: 2nd + 5th
    expect(nat(2, 'Sun')).toBe('neutral'); // Taurus: 4th only
    expect(nat(3, 'Saturn')).toBe('mixed'); // Gemini: 8th + 9th
    expect(nat(9, 'Moon')).toBe('neutral'); // Sagittarius: Moon exempt from 8th-lord blemish
    expect(nat(1, 'Rahu')).toBe('shadow');
  });
  it('gives every Lagna exactly one Lagna lord and 12 lordships in total', () => {
    for (let asc = 1; asc <= 12; asc++) {
      const c = classifyFunctionalNature(asc);
      expect(c.reduce((a, x) => a + x.lordships.length, 0)).toBe(12);
      expect(c.filter((x) => x.lordships.includes(1))).toHaveLength(1);
    }
  });
});

describe('gochara helpers', () => {
  it('counts houses inclusively and applies Phaladeepika favourable houses', () => {
    expect(houseFrom(7, 7)).toBe(1);
    expect(houseFrom(7, 5)).toBe(11);
    expect(isFavourableFromMoon('JUPITER', 11)).toBe(true);
    expect(isFavourableFromMoon('JUPITER', 10)).toBe(false);
    expect(isFavourableFromMoon('SATURN', 3)).toBe(true);
    expect(isFavourableFromMoon('SATURN', 12)).toBe(false);
    expect(housesTouched('JUPITER', 5, 2)).toEqual({ occupies: 4, aspects: [8, 10, 12] });
    expect(housesTouched('SATURN', 12, 2)).toEqual({ occupies: 11, aspects: [1, 5, 8] });
  });
  it('clips periods to a range and keeps their snapshot index', () => {
    const periods = [
      { planet: 'JUPITER', sign: 'Leo', signIndex: 5, startIso: '2026-01-01T00:00:00Z', endIso: '2026-06-01T00:00:00Z', enteredRetrograde: false },
      { planet: 'JUPITER', sign: 'Virgo', signIndex: 6, startIso: '2026-06-01T00:00:00Z', endIso: '2027-06-01T00:00:00Z', enteredRetrograde: false },
    ];
    const r = periodsInRange(periods, Date.UTC(2026, 4, 1), Date.UTC(2026, 7, 1));
    expect(r.map((p) => p.index)).toEqual([0, 1]);
    expect(r[0].clipStartIso).toBe('2026-05-01T00:00:00.000Z');
    expect(r[1].clipEndIso).toBe('2026-08-01T00:00:00.000Z');
  });
});

describe('finance report module', () => {
  let s: Awaited<ReturnType<typeof setup>>;
  beforeAll(async () => {
    s = await setup(FINANCE_MODULE, MALE);
  }, 120000);

  it('validates and maps to the FINANCE report type', () => {
    expect(s.def.reportType).toBe('FINANCE');
    expect(s.def.requires.vargas).toEqual(expect.arrayContaining(['D2', 'D9', 'D10']));
  });
  it('starts the outlook in the next calendar year when the report date is in the second half', () => {
    expect(outlookStartYear('2026-11-18T00:00:00Z')).toBe(2027);
    expect(outlookStartYear('2026-03-01T00:00:00Z')).toBe(2026);
    const y = yearOutlook(s.snapshot, 1);
    expect(y.year).toBe(2027);
    expect(y.months).toHaveLength(12);
    for (const m of y.months) {
      expect(m.jupiter.length).toBeGreaterThan(0);
      expect(m.saturn.length).toBeGreaterThan(0);
      expect(m.dashas.length).toBeGreaterThan(0);
    }
  });
  it('covers the whole outlook window with transit periods and contiguous antardashas', () => {
    const y5 = yearOutlook(s.snapshot, 5);
    expect(y5.transits.some((t) => t.planet === 'JUPITER')).toBe(true);
    expect(Date.parse(y5.months[11].jupiter.at(-1)!.period.clipEndIso)).toBe(Date.UTC(y5.year + 1, 0, 1));
    const w = outlookWindow(s.snapshot);
    const spans = dashaSpans(s.snapshot, w.startMs, w.endMs);
    for (let i = 1; i < spans.length; i++) expect(spans[i].startIso).toBe(spans[i - 1].endIso);
  });
  it('registers deterministic finance evidence', () => {
    for (let n = 1; n <= 5; n++) for (const k of ['year', 'jupiter', 'saturn', 'jupiter-gochara', 'saturn-gochara', 'wealth-contacts', 'dasha']) expect(s.registry.has(`finance.year.${n}.${k}`)).toBe(true);
    expect(s.registry.get('finance.year.1.year')!.value).toBe('2027');
    expect(s.registry.get('finance.functional.saturn')!.value).toBe('yogakaraka'); // Taurus Lagna
    expect(s.registry.resolve(['finance.ad.*']).length).toBeGreaterThan(0);
    expect(s.registry.has('finance.md.current')).toBe(true);
  });
  it('renders every block from existing evidence and every narrative topic has its evidence', () => {
    checkModule(FINANCE_MODULE, s);
  });
  it('is deterministic', async () => {
    const again = await setup(FINANCE_MODULE, MALE);
    expect(again.registry.fingerprint(again.registry.all())).toBe(s.registry.fingerprint(s.registry.all()));
  }, 120000);
});

describe('couple matching module', () => {
  let s: Awaited<ReturnType<typeof setup>>;
  beforeAll(async () => {
    s = await setup(COUPLE_MATCHING_MODULE, MALE, FEMALE);
  }, 180000);

  it('validates, needs a partner and maps to MARRIAGE_COMPATIBILITY', () => {
    expect(s.def.reportType).toBe('MARRIAGE_COMPATIBILITY');
    expect(s.def.requires.partner).toBe(true);
  });
  it('uses the male chart as the groom chart regardless of who orders the report', () => {
    const a = computeMatch(s.snapshot, s.partner!);
    const b = computeMatch(s.partner!, s.snapshot);
    expect(groomOf(s.snapshot, s.partner!)).toBe('native');
    expect(b.groom).toBe('partner');
    expect(b.result.ashtakoota.totalObtainedPoints).toBe(a.result.ashtakoota.totalObtainedPoints);
    expect(b.profile.native.nakshatraName).toBe(a.profile.partner.nakshatraName);
    expect(b.manglik.native.marsPlacement.houseFromLagna).toBe(a.manglik.partner.marsPlacement.houseFromLagna);
  });
  it('registers koota evidence that sums to the engine total', () => {
    const kootas = s.registry.resolve(['match.koota.*']);
    expect(kootas).toHaveLength(8);
    const sum = kootas.reduce((acc, k) => acc + Number(k.value), 0);
    expect(sum).toBeCloseTo(Number(s.registry.get('match.total')!.value), 5);
  });
  it('derives Saturn cycles, nodal axis and dasha overlap deterministically', () => {
    for (const snap of [s.snapshot, s.partner!]) {
      for (const p of saturnMoonPeriods(snap)) expect([12, 1, 2, 4, 8]).toContain(p.houseFromMoon);
      const ax = nodalAxis(snap);
      expect(ax.rahuSide.length + ax.ketuSide.length).toBe(7);
    }
    const segs = dashaOverlap(s.snapshot, s.partner!, 12);
    expect(segs[0].startIso).toBe(AS_OF.toISOString());
    for (let i = 1; i < segs.length; i++) expect(segs[i].startIso).toBe(segs[i - 1].endIso);
  });
  it('labels partner facts clearly and never in a form the natal validator would misread', () => {
    expect(s.registry.get('partner.planet.venus.d1.sign')!.label).toMatch(/^Partner: /);
    for (const item of s.registry.resolve(['match.*'])) {
      for (const a of extractNatalAssertions(item.label)) {
        const key = a.planet.toLowerCase();
        if (a.house) expect(s.registry.get(`planet.${key}.d1.house`)!.value, item.label).toBe(a.house);
        if (a.sign) expect(String(s.registry.get(`planet.${key}.d1.sign`)!.value).toLowerCase(), item.label).toBe(a.sign.toLowerCase());
      }
    }
  });
  it('cites both natives in the comparison topics', () => {
    const topics = s.def.sections.flatMap((x) => x.topics).filter((t) => t.kind === 'narrative');
    const both = topics.filter((t) => [...t.requiredEvidence, ...t.optionalEvidence].some((p) => p.startsWith('partner.planet.')) && [...t.requiredEvidence, ...t.optionalEvidence].some((p) => p.startsWith('planet.')));
    expect(both.length).toBeGreaterThanOrEqual(10);
  });
  it('renders every block from existing evidence and every narrative topic has its evidence', () => {
    checkModule(COUPLE_MATCHING_MODULE, s);
  });
});
