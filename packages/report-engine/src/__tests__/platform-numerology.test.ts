/**
 * Numerology family (Fortune, Fortune Plus, Baby Name): canonical numerology,
 * astrology add-ons, evidence, blocks, module validation and Hindi claim
 * scanning. Hand-checked expectations are worked out in the comments.
 * Synthetic subjects only. No network, no LLM.
 */
import { describe, expect, it, beforeAll } from 'vitest';
import {
  bhagyank, chaldeanNameNumber, computeNumerologyProfile, kuaNumber, lifeCycles, loShuGrid, maturityNumber, mulank, namePlanes,
  parseBirthDate, personalMonth, personalYear, personalityNumber, reduceToDigit, soulUrgeNumber, tropicalSign,
} from '../platform/reports/_numerology-shared/numerology';
import { numberHarmony } from '../platform/reports/_numerology-shared/associations';
import { computeNameGuidance, numberFit, rashiSyllables, startsWithSyllable, syllableOf } from '../platform/reports/baby-name/calc/name-guidance';
import { groupSadeSati, phaseOf } from '../platform/reports/fortune-plus/calc/sade-sati';
import { extractNatalAssertions, validateGeneratedTopic } from '../platform/validation/claim-validator';
import { validateModule } from '../platform/registry';
import { FORTUNE_MODULE } from '../platform/reports/fortune';
import { FORTUNE_PLUS_MODULE } from '../platform/reports/fortune-plus';
import { BABY_NAME_MODULE } from '../platform/reports/baby-name';
import { ReportModule } from '../platform/module';
import { buildChartSnapshot, ChartSnapshot, SubjectInput } from '../platform/snapshot/chart-snapshot';
import { EvidenceRegistry } from '../platform/evidence/evidence-registry';
import { CORE_BLOCKS } from '../platform/render/blocks';
import { ReportTopicSchema } from '../platform/contracts';

const D = parseBirthDate;

describe('canonical numerology (hand-checked)', () => {
  it('reduces digits', () => {
    expect(reduceToDigit(48)).toBe(3); // 4+8=12 → 3
    expect(reduceToDigit(9)).toBe(9);
    expect(reduceToDigit(0)).toBe(0);
  });

  it('Mulank and Bhagyank', () => {
    // 14-07-1990: day 14 → 5; 1+4+0+7+1+9+9+0 = 31 → 4
    expect(mulank(D('1990-07-14'))).toBe(5);
    expect(bhagyank(D('1990-07-14'))).toBe(4);
    // 03-02-1985: day 3; 0+3+0+2+1+9+8+5 = 28 → 1
    expect(mulank(D('1985-02-03'))).toBe(3);
    expect(bhagyank(D('1985-02-03'))).toBe(1);
  });

  it('Chaldean name, soul urge and personality numbers', () => {
    // AARAV = 1+1+2+1+6 = 11; MEHTA = 4+5+5+4+1 = 19; total 30 → 3
    expect(chaldeanNameNumber('Aarav Mehta')).toEqual({ compound: 30, value: 3 });
    // vowels A A A E A = 1+1+1+5+1 = 9; consonants R V M H T = 2+6+4+5+4 = 21 → 3
    expect(soulUrgeNumber('Aarav Mehta')).toEqual({ compound: 9, value: 9 });
    expect(personalityNumber('Aarav Mehta')).toEqual({ compound: 21, value: 3 });
    // MEERA = 4+5+5+2+1 = 17; IYER = 1+1+5+2 = 9; total 26 → 8 (Y is a consonant)
    expect(chaldeanNameNumber('Meera Iyer').value).toBe(8);
    expect(soulUrgeNumber('Meera Iyer')).toEqual({ compound: 17, value: 8 });
    expect(personalityNumber('Meera Iyer')).toEqual({ compound: 9, value: 9 });
    // Diacritics and punctuation are ignored
    expect(chaldeanNameNumber('Ánikà-Rao').value).toBe(chaldeanNameNumber('Anika Rao').value);
  });

  it('planes of expression', () => {
    // A×4 + H → mental 5; M E → physical 2; R T → emotional 2; V → intuitive 1
    expect(namePlanes('Aarav Mehta').counts).toEqual({ mental: 5, physical: 2, emotional: 2, intuitive: 1 });
  });

  it('Lo Shu grid adds Mulank only for two-digit days, always Bhagyank', () => {
    // 14071990 → 1 4 7 1 9 9, + Mulank 5 + Bhagyank 4
    const g = loShuGrid(D('1990-07-14'));
    expect(g.sourceDigits).toEqual([1, 4, 7, 1, 9, 9, 5, 4]);
    expect(g.missing).toEqual([2, 3, 6, 8]);
    expect(g.repeated).toEqual([1, 4, 9]);
    expect(g.completeLines).toEqual(['col-951']);
    // 03021985 → 3 2 1 9 8 5 + Bhagyank 1 (day 3 is single-digit: Mulank not added)
    const g2 = loShuGrid(D('1985-02-03'));
    expect(g2.addedMulank).toBe(false);
    expect(g2.sourceDigits).toEqual([3, 2, 1, 9, 8, 5, 1]);
    expect(g2.counts[1]).toBe(2);
  });

  it('Kua number (male 11 − y, female 4 + y, 5 substituted, Li Chun year)', () => {
    expect(kuaNumber(D('1983-06-01'), 'male').value).toBe(8); // 21 → 3; 11−3 = 8
    expect(kuaNumber(D('1983-06-01'), 'female').value).toBe(7); // 4+3
    const k95 = kuaNumber(D('1995-06-01'), 'male'); // 24 → 6; 11−6 = 5 → 2
    expect(k95.value).toBe(2);
    expect(k95.fiveSubstituted).toBe(true);
    expect(kuaNumber(D('1995-06-01'), 'female').value).toBe(1); // 4+6 = 10 → 1
    expect(kuaNumber(D('2021-06-01'), 'male').value).toBe(6); // 5 → 11−5 = 6 (classical 9 − 3)
    expect(kuaNumber(D('2021-06-01'), 'female').value).toBe(9); // 4+5 (classical 6 + 3)
    // 20 Jan 2000 belongs to solar year 1999: 28 → 1; male 10 → 1
    const jan = kuaNumber(D('2000-01-20'), 'male');
    expect(jan.solarYear).toBe(1999);
    expect(jan.value).toBe(1);
    expect(kuaNumber(D('1985-02-03'), 'female').nearYearBoundary).toBe(true);
    expect(kuaNumber(D('1990-07-14'), 'male')).toMatchObject({ value: 1, element: 'Water', group: 'East', favourable: { success: 'SE', health: 'E', relationships: 'S', growth: 'N' } });
  });

  it('personal year and month', () => {
    // 28 Dec, 2026: 2+8+1+2+2+0+2+6 = 23 → 5; April 5+4 = 9; May 5+5 = 10 → 1
    const d = D('1983-12-28');
    expect(personalYear(d, 2026)).toBe(5);
    expect(personalMonth(d, 2026, 4)).toBe(9);
    expect(personalMonth(d, 2026, 5)).toBe(1);
  });

  it('pinnacles and challenges are distinct and correctly named', () => {
    // 14-07-1990: m 7, d 5, y 19 → 1; P1 12→3, P2 6, P3 9, P4 8; C1 2, C2 4, C3 2, C4 6; first ends 36 − 4 = 32
    const c = lifeCycles(D('1990-07-14'));
    expect(c.map((x) => x.pinnacle)).toEqual([3, 6, 9, 8]);
    expect(c.map((x) => x.challenge)).toEqual([2, 4, 2, 6]);
    expect(c.map((x) => [x.fromAge, x.toAge])).toEqual([[0, 32], [32, 41], [41, 50], [50, undefined]]);
  });

  it('maturity, profile and determinism', () => {
    expect(maturityNumber(4, 3)).toBe(7);
    const a = computeNumerologyProfile({ dateOfBirth: '1990-07-14', name: 'Aarav Mehta', gender: 'male', asOf: new Date('2026-11-18T00:00:00Z') });
    const b = computeNumerologyProfile({ dateOfBirth: '1990-07-14', name: 'Aarav Mehta', gender: 'male', asOf: new Date('2026-11-18T00:00:00Z') });
    expect(a).toEqual(b);
    expect(a.age).toBe(36);
    expect(a.currentCycle.index).toBe(2);
    expect(a.months[0]).toMatchObject({ year: 2026, month: 11 });
    expect(a.months[11]).toMatchObject({ year: 2027, month: 10 });
    const other = computeNumerologyProfile({ dateOfBirth: '1990-07-14', gender: 'other', asOf: new Date('2026-11-18T00:00:00Z') });
    expect(other.kua).toBeUndefined();
    expect(other.kuaBoth?.male.value).toBe(1);
    expect(other.name).toBeUndefined();
  });

  it('tropical sign and number harmony', () => {
    expect(tropicalSign(280)).toBe('Capricorn');
    expect(tropicalSign(359.9)).toBe('Pisces');
    // Sun (1) and Jupiter (3) are mutual friends; Sun (1) and Saturn (8) mutual enemies
    expect(numberHarmony(1, 3)).toBe('harmonious');
    expect(numberHarmony(1, 8)).toBe('demanding');
    expect(numberHarmony(4, 4)).toBe('same');
  });
});

describe('baby-name guidance', () => {
  it('namakshara with the Ashlesha correction and Devanagari', () => {
    expect(syllableOf(9, 1)).toMatchObject({ latin: 'Di', devanagari: 'डी' });
    expect(syllableOf(14, 1)).toMatchObject({ latin: 'Pe', devanagari: 'पे' });
    expect(rashiSyllables(1).map((s) => s.latin)).toEqual(['Chu', 'Che', 'Cho', 'La', 'Li', 'Lu', 'Le', 'Lo', 'A']);
    expect(rashiSyllables(12).map((s) => s.latin)).toEqual(['Di', 'Du', 'Tha', 'Jha', 'Jna', 'De', 'Do', 'Cha', 'Chi']);
  });
  it('syllable matching and number fit', () => {
    expect(startsWithSyllable('Bhavya', ['Bha'])).toBe(true);
    expect(startsWithSyllable('Deepa', ['Di'])).toBe(true); // ee spelling
    expect(startsWithSyllable('Riya', ['Bha'])).toBe(false);
    expect(numberFit(3, 1, 3)).toBe('supportive');
    expect(numberFit(8, 1, 3)).toBe('needs-care');
    const g = computeNameGuidance({ moonNakshatraIndex: 21, moonPada: 1, moonSignIndex: 9, mulank: 3, bhagyank: 1, candidateNames: ['Bhavna Rao', '  ', 'Riya'] });
    expect(g.primary.latin).toBe('Bhe');
    expect(g.candidates).toHaveLength(2);
    expect(g.candidates[0].match).toBe('rashi'); // Bha is Mula pada 3, in Sagittarius
    expect(g.candidates[1].match).toBe('none');
  });
});

describe('Sade Sati grouping', () => {
  const P = (sign: number, s: string, e: string) => ({ planet: 'SATURN', sign: '', signIndex: sign, startIso: s, endIso: e, enteredRetrograde: false });
  it('groups the 12th/1st/2nd from the Moon into cycles, keeping retrograde re-entries', () => {
    expect(phaseOf(12, 11)).toBe('rising');
    expect(phaseOf(12, 12)).toBe('peak');
    expect(phaseOf(12, 1)).toBe('setting');
    const periods = [
      P(10, '1990-01-01', '1993-03-05'), P(11, '1993-03-05', '1995-06-02'), P(12, '1995-06-02', '1995-08-10'),
      P(11, '1995-08-10', '1996-02-16'), P(12, '1996-02-16', '1998-04-17'), P(1, '1998-04-17', '2000-06-06'),
      P(2, '2000-06-06', '2022-04-29'), P(11, '2022-04-29', '2025-03-29'), P(12, '2025-03-29', '2027-06-02'), P(1, '2027-06-02', '2030-04-17'),
    ];
    const r = groupSadeSati(periods, 12, '1990-01-01', '2030-04-17', '2026-11-18');
    expect(r.cycles).toHaveLength(2);
    expect(r.cycles[0].phases.map((p) => [p.phase, p.startIso, p.endIso])).toEqual([
      ['rising', '1993-03-05', '1996-02-16'], ['peak', '1995-06-02', '1998-04-17'], ['setting', '1998-04-17', '2000-06-06'],
    ]);
    expect(r.current).toMatchObject({ active: true, phase: 'peak', cycleIndex: 2 });
    expect(r.cycles[1].openEnded).toBe(true);
  });
});

describe('Hindi claim scanning', () => {
  it('recognises Hindi planet/house and planet/sign assertions', () => {
    const a = extractNatalAssertions('आपका शुक्र सातवें भाव में है। शनि मकर राशि में स्थित है। 10वें भाव में सूर्य नहीं है।');
    expect(a).toEqual(expect.arrayContaining([
      expect.objectContaining({ planet: 'Venus', house: 7 }),
      expect.objectContaining({ planet: 'Saturn', sign: 'Capricorn' }),
    ]));
    expect(a).toHaveLength(2);
  });
  it('ignores transit, divisional and weekday words', () => {
    expect(extractNatalAssertions('गोचर में शनि दसवें भाव में आएगा।')).toEqual([]);
    expect(extractNatalAssertions('नवांश में मंगल चौथे भाव में है।')).toEqual([]);
    expect(extractNatalAssertions('गुरुवार को पहले घर में दीपक जलाएँ।')).toEqual([]);
  });
  it('keeps English behaviour', () => {
    expect(extractNatalAssertions('Venus is in the 7th house. Saturn in Capricorn.')).toEqual([
      expect.objectContaining({ planet: 'Venus', house: 7 }), expect.objectContaining({ planet: 'Saturn', sign: 'Capricorn' }),
    ]);
  });
});

// ---------------------------------------------------------------------------
// Modules end to end (snapshot → evidence → blocks), no LLM
// ---------------------------------------------------------------------------

const SUBJECT: SubjectInput & { candidateNames?: string[] } = {
  name: 'Aarav Mehta', gender: 'male', dateOfBirth: '1990-07-14', timeOfBirth: '08:30', placeName: 'Pune',
  latitude: 18.5204, longitude: 73.8567, timezone: 'Asia/Kolkata', candidateNames: ['Bhavya Mehta', 'Riya Mehta'],
};

async function build(module: ReportModule): Promise<{ snapshot: ChartSnapshot; registry: EvidenceRegistry; ext: Record<string, unknown> }> {
  const def = validateModule(module);
  const snapshot = await buildChartSnapshot(SUBJECT, {
    asOf: new Date('2026-11-18T00:00:00Z'), requireBirthTime: def.requires.birthTime,
    vargas: [...new Set(['D1', ...def.requires.vargas])] as typeof def.requires.vargas, transitYears: def.requires.transitYears,
  });
  const ext = module.extend ? await module.extend({ snapshot }) : {};
  const registry = new EvidenceRegistry(snapshot, { contributors: [(add, reg) => module.evidence!(add, { snapshot, ext, registry: reg })] });
  return { snapshot, registry, ext };
}

describe.each([
  ['fortune', FORTUNE_MODULE],
  ['fortune-plus', FORTUNE_PLUS_MODULE],
  ['baby-name', BABY_NAME_MODULE],
] as Array<[string, ReportModule]>)('%s module', (id, module) => {
  let ctx: Awaited<ReturnType<typeof build>>;
  beforeAll(async () => {
    ctx = await build(module);
  }, 60000);

  it('validates, with unique topics, sections of ≤ 6 narrative topics and reference mapping', () => {
    const def = validateModule(module);
    expect(def.id).toBe(id);
    for (const s of def.sections) expect(s.topics.filter((t) => t.kind === 'narrative').length).toBeLessThanOrEqual(6);
    for (const s of def.sections) for (const t of s.topics) {
      ReportTopicSchema.parse(t);
      expect(t.bonus || Boolean(t.referencePages)).toBe(true);
    }
  });

  it('every narrative topic finds its required evidence', () => {
    const def = validateModule(module);
    for (const s of def.sections) for (const t of s.topics.filter((x) => x.kind === 'narrative')) {
      for (const p of t.requiredEvidence) expect(ctx.registry.resolve([p]).length, `${t.id} → ${p}`).toBeGreaterThan(0);
    }
  });

  it('every block renders and cites only existing evidence', () => {
    const def = validateModule(module);
    const blocks = { ...CORE_BLOCKS, ...(module.blocks ?? {}) };
    for (const s of def.sections) for (const t of s.topics.filter((x) => x.kind === 'data')) {
      const out = blocks[t.block!]({ snapshot: ctx.snapshot, registry: ctx.registry, ext: ctx.ext });
      expect(out.tex.length, t.id).toBeGreaterThan(20);
      expect(out.tex).not.toMatch(/undefined|NaN/);
      for (const e of out.evidenceIds) expect(ctx.registry.has(e), `${t.id} cites ${e}`).toBe(true);
    }
  });

  it('never puts the subject name or candidate names into evidence', () => {
    for (const item of ctx.registry.all()) {
      expect(item.label).not.toMatch(/Aarav|Mehta|Bhavya|Riya/);
    }
  });
});

describe('numerology evidence values', () => {
  it('fortune registry carries the hand-checked numbers', async () => {
    const { registry } = await build(FORTUNE_MODULE);
    expect(registry.get('numerology.mulank')!.value).toBe(5);
    expect(registry.get('num.name.number')!.value).toBe(3);
    expect(registry.get('num.kua')!.value).toBe(1);
    expect(registry.get('num.loshu.missing')!.value).toEqual(['2', '3', '6', '8']);
    expect(registry.get('num.pinnacle.1')!.value).toBe(3);
    expect(registry.get('num.challenge.2')!.value).toBe(4);
    expect(registry.get('num.pm.01')!.label).toMatch(/November 2026/);
  }, 60000);

  it('a Hindi narrative that misplaces a planet is rejected by the prose scan', async () => {
    const { registry } = await build(FORTUNE_PLUS_MODULE);
    const venusHouse = Number(registry.get('planet.venus.d1.house')!.value);
    const wrong = (venusHouse % 12) + 1;
    const hiOrd = ['पहले', 'दूसरे', 'तीसरे', 'चौथे', 'पाँचवें', 'छठे', 'सातवें', 'आठवें', 'नौवें', 'दसवें', 'ग्यारहवें', 'बारहवें'];
    const topic = ReportTopicSchema.parse({ id: 'planet-venus', title: 'x', kind: 'narrative', objective: 'x', requiredEvidence: ['planet.venus.d1.house'] });
    const res = validateGeneratedTopic(topic, {
      topicId: 'planet-venus', lead: 'शुक्र के बारे में एक परिचय।',
      paragraphs: [`आपका शुक्र ${hiOrd[wrong - 1]} भाव में है, जो संबंधों को रंग देता है।`], bullets: [],
      claims: [{ statement: `Venus is in the ${venusHouse}th house`, evidenceIds: ['planet.venus.d1.house'] }],
    }, registry, { expectedSnapshotId: registry.snapshotId, allowedEvidence: ['planet.venus.d1.*'] });
    expect(res.issues.map((i) => i.code)).toContain('NARRATIVE_CONTRADICTS_CHART');
    expect(res.passed).toBe(false);
  }, 60000);
});
