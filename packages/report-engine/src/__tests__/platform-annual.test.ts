/**
 * Annual reports (Varshphal + Personalised Horoscope) — calculation, evidence
 * and module tests. No network, no LLM.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { PlanetSymbol, TransitIngressSolver } from '@astro/astrology-engine';
import { buildChartSnapshot, ChartSnapshot, SubjectInput } from '../platform/snapshot/chart-snapshot';
import { EvidenceRegistry } from '../platform/evidence/evidence-registry';
import { validateModule } from '../platform/registry';
import { ReportModule } from '../platform/module';
import { extractNatalAssertions } from '../platform/validation/claim-validator';
import { BlockContext } from '../platform/render/blocks';
import { datesForNumber, digitReduce, gocharaStatus, houseFrom } from '../platform/reports/_annual-shared/astro';
import { computeMudda, muddaFirstLord } from '../platform/reports/varshphal/calc/mudda';
import { VARSHPHAL_MODULE } from '../platform/reports/varshphal';
import { HOROSCOPE_ANNUAL_MODULE } from '../platform/reports/horoscope-annual';
import { horoscopeWindows, personalYear } from '../platform/reports/horoscope-annual/calc/horoscope-year';
import { luckyFor } from '../platform/reports/horoscope-annual/lucky';
import { VarshaYearData } from '../platform/reports/varshphal/calc/varsha-year';

const AS_OF = new Date('2026-11-18T00:00:00Z');
const A: SubjectInput = { name: 'Annual Test A', gender: 'female', dateOfBirth: '1994-03-17', timeOfBirth: '06:42', placeName: 'Jaipur', latitude: 26.9124, longitude: 75.7873, timezone: 'Asia/Kolkata' };
const B: SubjectInput = { name: 'Annual Test B', gender: 'male', dateOfBirth: '1987-12-29', timeOfBirth: '04:30', placeName: 'Pune', latitude: 18.5204, longitude: 73.8567, timezone: 'Asia/Kolkata' };

describe('classical tables', () => {
  it('counts houses inclusively', () => {
    expect(houseFrom(1, 1)).toBe(1);
    expect(houseFrom(12, 1)).toBe(2);
    expect(houseFrom(5, 4)).toBe(12);
  });
  it('applies the Phaladeepika gochara table', () => {
    expect(gocharaStatus('Jupiter', 5)).toBe('favourable');
    expect(gocharaStatus('Jupiter', 1)).toBe('demanding');
    expect(gocharaStatus('Saturn', 11)).toBe('favourable');
    expect(gocharaStatus('Saturn', 7)).toBe('demanding');
    expect(gocharaStatus('Venus', 6)).toBe('demanding');
    expect(gocharaStatus('Venus', 12)).toBe('favourable');
  });
  it('reduces numbers and finds matching dates', () => {
    expect(digitReduce(2026)).toBe(1);
    expect(datesForNumber(5)).toEqual([5, 14, 23]);
    expect(datesForNumber(9)).toEqual([9, 18, 27]);
  });
});

describe('Mudda dasha (Tajika Neelakanthi)', () => {
  it('selects the first lord by (nakshatra + years − 2) mod 9', () => {
    expect(muddaFirstLord(1, 0)).toBe('Ketu'); // Ashwini at birth → its own lord
    expect(muddaFirstLord(2, 0)).toBe('Venus');
    expect(muddaFirstLord(3, 0)).toBe('Sun');
    expect(muddaFirstLord(2, 32)).toBe('Jupiter'); // 32 mod 9 = 5 → Jupiter
    expect(muddaFirstLord(27, 1)).toBe('Ketu'); // 26 mod 9 = 8 → Ketu
  });
  it('fills the year exactly, with balance and closing parts', () => {
    const start = '2026-03-17T06:18:42.000Z';
    const end = '2027-03-17T12:27:00.000Z';
    const mid = computeMudda({ natalMoonLongitude: 13.3333 + 6.6667, completedYears: 32, yearStartIso: start, yearEndIso: end }); // half of Bharani travelled
    expect(mid).toHaveLength(10);
    expect(mid[0].lord).toBe('Jupiter');
    expect(mid[9].lord).toBe('Jupiter');
    expect(mid[0].part).toBe('balance');
    expect(mid[9].part).toBe('closing');
    expect(mid[0].days).toBeCloseTo(mid[9].days, 1);
    expect(mid[0].startIso).toBe(start);
    expect(mid[9].endIso).toBe(end);
    for (let i = 1; i < mid.length; i++) expect(mid[i].startIso).toBe(mid[i - 1].endIso);
    const total = mid.reduce((a, p) => a + p.days, 0);
    expect(total).toBeCloseTo((Date.parse(end) - Date.parse(start)) / 86400000, 6);
    // Saturn (19 of 120 years) follows Jupiter in the cycle
    expect(mid[1].lord).toBe('Saturn');
    expect(mid[1].days).toBeCloseTo((19 / 120) * total, 3);
  });
  it('has no closing part when the Moon is at the start of its nakshatra', () => {
    const p = computeMudda({ natalMoonLongitude: 0, completedYears: 0, yearStartIso: '2026-01-01T00:00:00Z', yearEndIso: '2027-01-01T00:00:00Z' });
    expect(p).toHaveLength(9);
    expect(p[0].lord).toBe('Ketu');
  });
});

describe('horoscope helpers', () => {
  it('builds three 4-month windows from the report month', () => {
    const w = horoscopeWindows('2026-11-18T00:00:00.000Z');
    expect(w.map((x) => x.label)).toEqual(['Nov 2026 – Feb 2027', 'Mar 2027 – Jun 2027', 'Jul 2027 – Oct 2027']);
    expect(w[0].startIso).toBe('2026-11-01T00:00:00.000Z');
    expect(w[2].endIso).toBe('2027-11-01T00:00:00.000Z');
  });
  it('computes the personal year', () => {
    expect(personalYear('1994-03-17', 2026)).toBe(3); // 8 + 3 + 1 = 12 → 3
    expect(personalYear('1987-12-29', 2027)).toBe(7); // 29→2, 12→3, 2027→2
  });
  it('derives associations from the Moon-sign lord', () => {
    const l = luckyFor('Mars', 'Jupiter');
    expect(l.number).toBe(9);
    expect(l.dates).toEqual([9, 18, 27]);
    expect(l.enemies).toContain('Mercury');
    expect(l.cautionDates).toEqual([5, 14, 23]);
    expect(l.cautionColours).not.toContain('red');
  });
});

async function runModule(module: ReportModule, subject: SubjectInput) {
  const def = validateModule(module);
  const snapshot = await buildChartSnapshot(subject, { asOf: AS_OF, vargas: def.requires.vargas as never, transitYears: def.requires.transitYears });
  const ext = await module.extend!({ snapshot });
  const registry = new EvidenceRegistry(snapshot, { contributors: [(add, reg) => module.evidence!(add, { snapshot, ext, registry: reg })] });
  return { def, snapshot, ext, registry };
}

function checkModule(r: Awaited<ReturnType<typeof runModule>>, module: ReportModule) {
  const ctx: BlockContext = { snapshot: r.snapshot, registry: r.registry, ext: r.ext };
  for (const s of r.def.sections) {
    expect(s.topics.filter((t) => t.kind === 'narrative').length).toBeLessThanOrEqual(6);
    for (const t of s.topics) {
      if (t.kind === 'data' && module.blocks?.[t.block!]) {
        const out = module.blocks[t.block!](ctx);
        const missing = out.evidenceIds.filter((id) => !r.registry.has(id));
        expect(missing, `${t.id}`).toEqual([]);
        expect(out.tex).not.toMatch(/undefined|NaN/);
      }
      if (t.kind === 'narrative') {
        for (const p of t.requiredEvidence) expect(r.registry.resolve([p]).length, `${t.id} needs ${p}`).toBeGreaterThan(0);
      }
    }
  }
  // Report-specific labels must never read as natal placements (offline/LLM claims quote them).
  const own = r.registry.all().filter((e) => /^(varsha|horo|avakahada)\./.test(e.id));
  for (const e of own) expect(extractNatalAssertions(e.label), e.label).toEqual([]);
}

describe('Varshphal module', () => {
  let a: Awaited<ReturnType<typeof runModule>>;
  let b: Awaited<ReturnType<typeof runModule>>;
  beforeAll(async () => {
    a = await runModule(VARSHPHAL_MODULE, A);
    b = await runModule(VARSHPHAL_MODULE, B);
  }, 180000);

  it('validates and every block / required evidence resolves', () => {
    checkModule(a, VARSHPHAL_MODULE);
    checkModule(b, VARSHPHAL_MODULE);
  });

  it('chooses the solar-return year that contains the report date', () => {
    const da = a.ext.varshphal as VarshaYearData;
    const db = b.ext.varshphal as VarshaYearData;
    expect(da.targetYear).toBe(2026); // birthday 17 Mar → SR 17 Mar 2026
    expect(db.targetYear).toBe(2025); // birthday 29 Dec → SR Dec 2025 (Dec 2026 not yet reached)
    for (const d of [da, db]) {
      expect(Date.parse(d.yearStartIso)).toBeLessThanOrEqual(AS_OF.getTime());
      expect(Date.parse(d.yearEndIso)).toBeGreaterThan(AS_OF.getTime());
      expect(d.varsha.muntha.progressionYears).toBe(d.varsha.solarReturn.age);
    }
    expect(a.registry.get('varsha.age')!.value).toBe(32);
  });

  it('builds 12 contiguous Masa Pravesha months with the Sun 30° apart', async () => {
    const d = a.ext.varshphal as VarshaYearData;
    expect(d.months).toHaveLength(12);
    expect(d.months[0].month.startIso).toBe(d.yearStartIso);
    expect(d.months[11].month.endIso).toBe(d.yearEndIso);
    const solver = new TransitIngressSolver();
    for (let k = 1; k < 12; k++) {
      expect(d.months[k].month.startIso).toBe(d.months[k - 1].month.endIso);
      const jd = Date.parse(d.months[k].month.startIso) / 86400000 + 2440587.5;
      const sun = (await solver.getPlanetaryState(PlanetSymbol.SUN, jd)).longitude;
      const target = (d.varsha.solarReturn.natalSunLongitude + 30 * k) % 360;
      expect(Math.abs(((sun - target + 540) % 360) - 180)).toBeLessThan(0.01);
    }
  });

  it('gives each month its own facts (no copied months)', () => {
    const d = a.ext.varshphal as VarshaYearData;
    const sig = d.months.map((m) => JSON.stringify([m.mudda.map((x) => x.lord), Object.values(m.mid).map((t) => t.sign)]));
    expect(new Set(sig).size).toBe(12);
    const labels = d.months.map((_, i) => a.registry.get(`varsha.month.${String(i + 1).padStart(2, '0')}.area.work`)!.label);
    expect(new Set(labels).size).toBe(12);
  });

  it('computes lunar observances (Chaitra Purnima 2026 = 2 Apr; Adhika Jyeshtha in 2026)', () => {
    const d = a.ext.varshphal as VarshaYearData;
    const chaitra = d.lunar.find((e) => e.kind === 'purnima' && e.masa === 'Chaitra');
    expect(chaitra?.iso.slice(0, 10)).toBe('2026-04-02');
    expect(d.lunar.some((e) => e.kind === 'purnima' && e.masa === 'Adhika Jyeshtha')).toBe(true);
  });

  it('transit periods are contiguous and cover the year', () => {
    const d = a.ext.varshphal as VarshaYearData;
    for (const ps of Object.values(d.transits)) {
      expect(ps[0].startIso).toBe(d.yearStartIso);
      expect(ps[ps.length - 1].endIso).toBe(new Date(d.yearEndIso).toISOString());
      for (let i = 1; i < ps.length; i++) expect(ps[i].startIso).toBe(ps[i - 1].endIso);
    }
  });

  it('is deterministic', async () => {
    const again = await runModule(VARSHPHAL_MODULE, A);
    expect(again.registry.fingerprint(again.registry.all())).toBe(a.registry.fingerprint(a.registry.all()));
  }, 120000);
});

describe('Horoscope (annual) module', () => {
  let a: Awaited<ReturnType<typeof runModule>>;
  let b: Awaited<ReturnType<typeof runModule>>;
  beforeAll(async () => {
    a = await runModule(HOROSCOPE_ANNUAL_MODULE, A);
    b = await runModule(HOROSCOPE_ANNUAL_MODULE, B);
  }, 120000);

  it('validates and every block / required evidence resolves', () => {
    checkModule(a, HOROSCOPE_ANNUAL_MODULE);
    checkModule(b, HOROSCOPE_ANNUAL_MODULE);
  });

  it('counts transits from both the Moon and the Ascendant', () => {
    const label = a.registry.get('horo.window.1.saturn')!.label;
    expect(label).toMatch(/from the Moon/);
    expect(label).toMatch(/from the Ascendant/);
    expect(a.registry.resolve(['horo.area.*']).length).toBe(18);
  });

  it('records lucky associations from the Moon-sign lord', () => {
    // Subject A: Moon in Aries → Mars → 9
    expect(a.registry.get('horo.lucky.planet')!.value).toBe('Mars');
    expect(a.registry.get('horo.lucky.number')!.value).toBe(9);
  });
});
