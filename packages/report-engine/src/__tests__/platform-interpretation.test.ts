/**
 * Interpretation wiring in report-engine (Agent A5): new `fact.*` evidence, `interp.*`
 * registration (fail closed), topic scope, life-stage variants, the career first-earnings window,
 * and byte-identical cache keys for every topic that does not opt in.
 *
 * Golden subject (user decision 1, 2026-11-20): 08 Jun 2004 08:30 IST, Akbarpur (Ambedkar Nagar)
 * 26.4295 N 82.5343 E, Asia/Kolkata; report date 20 Nov 2026. Expected values are hand-checked
 * against the audited chart (05-report-quality-audit.md): Cancer Lagna, Moon in Aquarius, Saturn
 * transiting Pisces, D10 Jupiter in Capricorn, Jupiter–Saturn Antardasha from 19 Nov 2026 (UTC).
 */
import { beforeAll, describe, expect, it } from 'vitest';
import type { InterpretationPack, InterpretationResult, InterpretationSet, RunInterpretation } from '@astro/prediction-engine';
import { ReportTopic, ReportTopicSchema } from '../platform/contracts';
import { EvidenceRegistry } from '../platform/evidence/evidence-registry';
import {
  contributeInterpretationFacts, lifeStageBand, saturnMoonPhase, vargaSignDignity,
} from '../platform/interpretation/facts';
import {
  interpretationContributor, interpretationLabel, InterpretationUnknownFactError, resolveRunInterpretation,
} from '../platform/interpretation/register';
import {
  applyTopicVariant, interpretationFingerprint, isInterpretationTopic, matchedInterpretations, topicAllowedEvidence,
} from '../platform/interpretation/scope';
import { topicCacheKey } from '../platform/llm/topic-cache';
import { ReportRegistry, validateModule } from '../platform/registry';
import { CAREER_MODULE } from '../platform/reports/career';
import { careerExt, earningsWindowDashas, EARNINGS_WINDOW } from '../platform/reports/career/calc/career-calc';
import { CAREER_BLOCKS } from '../platform/reports/career/career.blocks';
import { EARLY_CAREER_MAX_AGE, RETIREMENT_REFRAME_MAX_AGE } from '../platform/reports/career/career.definition';
import { buildChartSnapshot, ChartSnapshot, sha256, stableStringify, SubjectInput } from '../platform/snapshot/chart-snapshot';

const AS_OF = new Date('2026-11-20T00:00:00Z');
const GOLDEN: SubjectInput = {
  name: 'Golden', dateOfBirth: '2004-06-08', timeOfBirth: '08:30', placeName: 'Akbarpur',
  latitude: 26.4295, longitude: 82.5343, timezone: 'Asia/Kolkata',
};

/** Cache-key inputs fixed for the byte-identity test (any values work; they must just not change). */
const KEY_CONST = { promptVersion: 'P', model: 'm', generationConfig: { temperature: 0.5, maxOutputTokens: 100 } };

async function registryFor(definitionId: string, extraContributors: Array<(add: Parameters<NonNullable<typeof CAREER_MODULE.evidence>>[0], r: EvidenceRegistry) => void> = []) {
  const entry = ReportRegistry.entry(definitionId);
  const def = validateModule(entry.module);
  const snapshot = await buildChartSnapshot(GOLDEN, {
    asOf: AS_OF, requireBirthTime: false,
    vargas: [...new Set(['D1', ...def.requires.vargas])] as typeof def.requires.vargas, transitYears: def.requires.transitYears,
  });
  const ext = entry.module.extend ? await entry.module.extend({ snapshot }) : {};
  const registry = new EvidenceRegistry(snapshot, {
    contributors: [
      ...(entry.module.evidence ? [(add: Parameters<NonNullable<typeof CAREER_MODULE.evidence>>[0], r: EvidenceRegistry) => entry.module.evidence!(add, { snapshot, ext, registry: r })] : []),
      ...extraContributors,
    ],
  });
  return { def, snapshot, ext, registry };
}

function legacyKey(def: { id: string; specVersion: string }, snapshot: ChartSnapshot, reg: EvidenceRegistry, t: ReportTopic): string {
  const ev = reg.resolve(topicAllowedEvidence(t, reg));
  return topicCacheKey({
    snapshotId: reg.snapshotId, subjectRef: snapshot.subjectRef, definitionId: def.id, specVersion: def.specVersion, topicId: t.id,
    promptVersion: KEY_CONST.promptVersion, evidenceFingerprint: reg.fingerprint(ev), model: KEY_CONST.model, generationConfig: KEY_CONST.generationConfig,
  });
}

let career: Awaited<ReturnType<typeof registryFor>>;
beforeAll(async () => {
  career = await registryFor('career');
}, 300000);

// ---------------------------------------------------------------------------
// New facts on the golden chart
// ---------------------------------------------------------------------------

describe('interpretation facts (golden chart, hand-checked)', () => {
  const v = (id: string) => career.registry.get(id)?.value;

  it('Saturn transits Pisces = 9th from the Cancer Lagna and 2nd from the Aquarius Moon (last Sade Sati phase)', () => {
    expect(v('fact.transit.saturn.now')).toEqual(['Pisces', '9', '2']);
    expect(v('fact.transit.saturn.from-moon')).toBe('second');
    expect(career.registry.get('fact.transit.saturn.from-moon')!.label).toMatch(/last of the three Sade Sati phases/);
    expect(career.registry.get('fact.transit.saturn.now')!.label).toMatch(/transit position, not the natal placement/);
    // Rahu/Ketu come from the career module's node transits and are 7 signs apart.
    const rahu = v('fact.transit.rahu.now') as string[];
    const ketu = v('fact.transit.ketu.now') as string[];
    expect(((Number(ketu[1]) - Number(rahu[1]) + 12) % 12)).toBe(6);
  });

  it('the native is 22 (early career) at the report date', () => {
    expect(v('native.age')).toBe(22);
    expect(v('native.life-stage')).toBe('early-career');
    expect(lifeStageBand(25).band).toBe('building');
    expect(lifeStageBand(40).band).toBe('mid-career');
    expect(lifeStageBand(55).band).toBe('late-career');
  });

  it('D10 Jupiter is debilitated in Capricorn (sign dignity, labelled by definition)', () => {
    expect(v('planet.jupiter.d10.sign')).toBe('Capricorn');
    expect(v('planet.jupiter.d10.dignity')).toBe('DEBILITATED');
    expect(career.registry.get('planet.jupiter.d10.dignity')!.label).toMatch(/debilitated by sign dignity .*not the D1 compound dignity/);
    expect(v('planet.venus.d10.dignity')).toBe('DEBILITATED'); // Virgo
    expect(v('planet.sun.d10.dignity')).toBe('OWN_SIGN'); // Leo
    expect(v('planet.rahu.d10.dignity')).toBe('NONE');
    expect(vargaSignDignity('Saturn', 7)).toBe('EXALTED');
  });

  it('dispositors follow the D1 sign lords', () => {
    expect(v('planet.mars.d1.dispositor')).toBe('Mercury'); // Mars in Gemini
    expect(v('planet.jupiter.d1.dispositor')).toBe('Sun'); // Jupiter in Leo
    expect(v('planet.venus.d1.dispositor')).toBe('Venus'); // own sign Taurus
    expect(v('planet.moon.d1.dispositor')).toBe('Saturn'); // Moon in Aquarius
  });

  it('vargottama compares the D1 and D9 signs', () => {
    for (const p of ['sun', 'moon', 'mars', 'mercury', 'jupiter', 'venus', 'saturn']) {
      expect(v(`planet.${p}.vargottama`)).toBe(v(`planet.${p}.d1.sign`) === v(`planet.${p}.d9.sign`));
    }
    expect(v('planet.moon.vargottama')).toBe(false); // Aquarius vs Libra (A0 golden)
  });

  it('current MD–AD is Jupiter–Saturn: Saturn (Gemini) 11th from Jupiter (Leo), Jupiter 3rd from Saturn', () => {
    expect(v('dasha.current.ad')).toBe('Saturn');
    expect(v('fact.dasha.current.md-ad')).toEqual(['Jupiter', 'Saturn', '11', '3']);
  });

  it('ages at Mahadasha starts (birth MD counts as 0)', () => {
    const ages = career.snapshot.vimshottari.mahadashas.map((md, i) => [String(md.lord), v(`dasha.md.${String(i + 1).padStart(2, '0')}.age`)]);
    expect(ages.slice(0, 4)).toEqual([['MARS', ['0', '2']], ['RAHU', ['2', '20']], ['JUPITER', ['20', '36']], ['SATURN', ['36', '55']]]);
    // Jupiter MD (3rd) → Saturn AD is the 2nd sub-period: Jupiter–Saturn starts on 19 Nov 2026 UTC,
    // which is 20 Nov 2026 in IST. Evidence values and labels use the IST calendar date (audit F24).
    const ad = career.snapshot.vimshottari.mahadashas[2].subPeriods![1];
    expect(ad.startDateIso.slice(0, 10)).toBe('2026-11-19');
    expect(new Date(Date.parse(ad.startDateIso) + 330 * 60000).toISOString().slice(0, 10)).toBe('2026-11-20');
    expect(v('dasha.ad.03.02')).toEqual(['Saturn', '2026-11-20', '2029-06-02']);
    expect(career.registry.get('dasha.ad.03.02')!.label).toBe('Jupiter–Saturn Antardasha: 20 Nov 2026 to 02 Jun 2029');
    expect(v('dasha.ad.03.02.age')).toEqual(['22', '24']);
  });

  it('the canonical SAV definition is natal and never "support from transiting planets"', () => {
    const item = career.registry.get('fact.definition.sav')!;
    expect(item.value).toBe('natal-bindus-per-sign');
    expect(item.label).toMatch(/natal total of benefic points .* seven planets and the Lagna/);
    expect(item.label).toMatch(/total 337/);
    for (const e of career.registry.all()) expect(e.label, e.id).not.toMatch(/(support|bindus)[^.]*(receives|received) from (all )?transiting planets/i);
  });

  it('A2/A3 stage facts: chart.*, functional nature, shadbala, paksha, aspects-cast, Kemadruma, Sade Sati segments', () => {
    expect(v('chart.birth-time')).toBe(true);
    expect(v('chart.vargas')).toEqual(expect.arrayContaining(['D1', 'D9', 'D10']));
    expect(v('planet.mars.d1.functional-nature')).toBe('yogakaraka'); // Cancer Lagna: lord of 5 and 10
    expect(typeof v('planet.jupiter.shadbala')).toBe('number');
    expect(v('planet.moon.d1.paksha')).toBe('waning'); // Moon Aquarius 2°, Sun Taurus 24°: elongation ≈ 248°
    expect(v('planet.mars.d1.combust-distance')).toBeGreaterThan(0);
    expect(v('yoga.kemadruma')).toBe('Kemadruma Yoga');
    expect(career.registry.get('yoga.kemadruma')!.label).toMatch(/formed and cancelled/);
    const segs = career.registry.resolve(['transit.saturn-from-moon.*']);
    expect(segs.length).toBeGreaterThan(0);
    expect(segs.map((e) => (e.value as string[])[3])).toContain('2'); // Pisces = 2nd from the Aquarius Moon
    expect(v('native.age')).toBe(22);
  });

  it('phase helper covers the five Saturn-from-Moon positions', () => {
    expect([12, 1, 2, 4, 8, 3].map(saturnMoonPhase)).toEqual(['twelfth', 'over-moon', 'second', 'fourth', 'eighth', 'none']);
  });

  it('is deterministic', async () => {
    const again = new EvidenceRegistry(career.snapshot, { contributors: [(add) => contributeInterpretationFacts(add, career.snapshot)] });
    for (const e of again.all().filter((x) => x.id.startsWith('fact.') && !/rahu|ketu/.test(x.id))) {
      expect(career.registry.get(e.id)?.value, e.id).toEqual(e.value);
    }
  });
});

// ---------------------------------------------------------------------------
// Career module fixes
// ---------------------------------------------------------------------------

describe('career: first-earnings window, yogas, D10 dignity, life stage', () => {
  it('first earnings only sees Mahadashas within the earning-years window (no Venus/Sun MD at 79–105)', () => {
    const lords = earningsWindowDashas(career.snapshot).map((d) => d.lord);
    expect(lords).toEqual(['Rahu', 'Jupiter', 'Saturn', 'Mercury']);
    expect(EARNINGS_WINDOW).toEqual({ minEndAge: 16, maxStartAge: 60 });
    const windowed = career.registry.resolve(['career.window.earnings.md.*']).map((e) => (e.value as string[])[0]);
    expect(windowed).not.toContain('Venus');
    expect(windowed).not.toContain('Sun');
    const def = validateModule(CAREER_MODULE);
    const topic = def.sections.flatMap((s) => s.topics).find((t) => t.id === 'first-earnings')!;
    const scope = career.registry.resolve(topicAllowedEvidence(topic, career.registry)).map((e) => e.id);
    expect(scope.some((id) => id.startsWith('dasha.md.'))).toBe(false);
    const mdLords = scope.filter((id) => id.startsWith('career.window.earnings.')).map((id) => (career.registry.get(id)!.value as string[])[0]);
    expect(mdLords).not.toContain('Venus');
    expect(mdLords).not.toContain('Sun');
    expect(scope).toContain('native.age');
  });

  it('yoga table lists every detected yoga (Kedara included) with observed relations, never "Mars with Mars"', () => {
    const c = careerExt(career.ext);
    const block = CAREER_BLOCKS['career-yogas']({ snapshot: career.snapshot, registry: career.registry, ext: career.ext });
    if (c.allYogas.some((y) => y.id === 'YOGA_NABHASA_KEDARA')) expect(block.tex).toMatch(/Kedara/);
    expect(block.tex).not.toMatch(/must be/);
    expect(block.tex).not.toMatch(/Mars \(MARS\) and Lord of H5 \(MARS\)|lord Mars with the 5th lord Mars|MARS.*with.*MARS/);
    const raja = c.allYogas.find((y) => y.id === 'YOGA_RAJA_H10_H5');
    if (raja) expect(raja.conditions.join(' ')).toMatch(/Yogakaraka: MARS owns both kendra 10 and trikona 5/);
    for (const id of block.evidenceIds) expect(career.registry.has(id), id).toBe(true);
  });

  it('D10 houses table has a dignity column and shows Jupiter debilitated', () => {
    const block = CAREER_BLOCKS['career-d10-houses']({ snapshot: career.snapshot, registry: career.registry, ext: career.ext });
    expect(block.tex).toMatch(/Lord's D10 dignity/);
    expect(block.tex).toMatch(/Jupiter \(debilitated\)/);
    expect(block.evidenceIds).toContain('planet.jupiter.d10.dignity');
    for (const id of block.evidenceIds) expect(career.registry.has(id), id).toBe(true);
  });

  it('D10 topics request D10 dignity; current-dasha gets transit and Sade Sati evidence', () => {
    const def = validateModule(CAREER_MODULE);
    const topics = new Map(def.sections.flatMap((s) => s.topics).map((t) => [t.id, t] as const));
    for (const id of ['d10-lagna', 'd10-tenth-lord', 'd10-sixth-lord', 'd10-seventh-lord', 'advancement-d10', 'stormy-seas-d10', 'changing-course', 'jupiter-guidance']) {
      const scope = career.registry.resolve(topicAllowedEvidence(topics.get(id)!, career.registry)).map((e) => e.id);
      expect(scope.some((x) => /^planet\.[a-z]+\.d10\.dignity$/.test(x)), id).toBe(true);
    }
    const cur = career.registry.resolve(topicAllowedEvidence(topics.get('current-dasha')!, career.registry)).map((e) => e.id);
    expect(cur).toEqual(expect.arrayContaining(['fact.transit.saturn.now', 'fact.transit.jupiter.now', 'fact.transit.saturn.from-moon', 'fact.dasha.current.md-ad']));
  });

  it('life-stage gating: retirement is reframed and seniority framing withheld at 22, not at 45', () => {
    const def = validateModule(CAREER_MODULE);
    const topics = new Map(def.sections.flatMap((s) => s.topics).map((t) => [t.id, t] as const));
    const ret = topics.get('retirement')!;
    const young = applyTopicVariant(ret, 22);
    expect(young.variant).toBe('long-term-stability');
    expect(young.topic.objective).toMatch(/do not discuss retirement/);
    expect(applyTopicVariant(ret, RETIREMENT_REFRAME_MAX_AGE + 1).variant).toBeUndefined();
    const road = topics.get('roadmap-summary')!;
    expect(applyTopicVariant(road, 22).topic.objective).toMatch(/do not refer to board-level/);
    expect(applyTopicVariant(road, EARLY_CAREER_MAX_AGE + 1).topic).toBe(road);
    expect(applyTopicVariant(topics.get('career-intro')!, 22).variant).toBeUndefined();
  });

  it('redundant restatement topics are retired; sections are kept', () => {
    const def = validateModule(CAREER_MODULE);
    const ids = def.sections.flatMap((s) => s.topics).map((t) => t.id);
    for (const gone of ['first-house-planets', 'first-house-aspects', 'tenth-house-planets', 'tenth-house-aspects', 'sixth-house-planets', 'sixth-house-aspects',
      'seventh-house-planets', 'seventh-house-aspects', 'eleventh-house-planets', 'eleventh-house-aspects', 'second-house-planets', 'second-house-aspects',
      'advancement-d1', 'government-houses']) expect(ids).not.toContain(gone);
    expect(def.sections.map((s) => s.id)).toEqual(['career-charts', 'lagna', 'tenth-sixth', 'seventh-eleventh', 'second-house', 'signatures', 'd10-map', 'bnn',
      'voyage', 'voyage-turns', 'government', 'business', 'cosmic-clock', 'dasha-ahead', 'vocation', 'remedies', 'roadmap']);
  });

  it('opt-in patterns use only the proposal §8 topic keys', () => {
    const def = validateModule(CAREER_MODULE);
    // §8 keys, aligned with A4's result IDs (A4-topic-keys.md); enterprise / financial-growth are A4's dimension results.
    const allowed = /^interp\.career\.(house-(1|2|6|7|10|11)\.\*|yoga\.\*|d10\.\*|d1-d10\.\*|service-orientation|enterprise|financial-growth|period\.\*|period\.earnings-window\*|transit\.(\*|saturn\*|jupiter\*)|fields\.\*)$/;
    const patterns = def.sections.flatMap((s) => s.topics).flatMap((t) => t.interpretations);
    expect(patterns.length).toBeGreaterThan(20);
    for (const p of patterns) expect(p).toMatch(allowed);
  });
});

// ---------------------------------------------------------------------------
// Backward compatibility: cache keys of topics that do not opt in
// ---------------------------------------------------------------------------

/** Captured from the code BEFORE the interpretation changes (same golden chart, asOf and key constants). */
const CAREER_LEGACY_KEYS: Record<string, string> = {
  'career-intro': 'tc_9fdce76f9c0b393b02d3e0b4014947af2960b143',
  'birth-dasha': 'tc_edc0c8f949e15b373c90b2a246163723bc25edad',
  'sun-career': 'tc_93693caf14b6db013c02637e85ab26afdcc78832',
  'saturn-career': 'tc_55c4f00e5d001052846daff459b81651be75a4dc',
  'atmakaraka-career': 'tc_c183dc319efc352488ae0a32ab18e10c226d44f2',
  'amatyakaraka-career': 'tc_6d4615e4c607c321bb3f762345efb660a7d3b2f7',
  'bnn-saturn': 'tc_7f955b894eb92992aca4d7d5564949013d8dc993',
  'bnn-links': 'tc_6c590bd29f1a5846a5c031ad63420486d16add51',
  'early-education': 'tc_254a5202564669d7ad9d09c0c53c7b2947983eee',
  'stormy-seas-d1': 'tc_f55aa8b76e3a2451ab77aeafe7025573e9f13966',
  'business-compass': 'tc_4cba63a11f0a66b9e2f379572ff135509a9c946d',
  'business-growth': 'tc_c2141894d62d36e228b1d0039eb69498b9fb12b4',
  // Re-keyed on purpose (2026-11-20, audit F24): its career.transit.* labels now give IST dates in
  // the one human format ("29 Mar 2025"). Previous key: tc_b2c795d6fdd99a936850ceb2f4d04984858169e3.
  'transit-nodes': 'tc_2cdc3bc557d1d66b78e2d509a925b1150e918139',
  'vocational-signature': 'tc_6fdd306b3f707921a7fc6c36b1c6ff485f862f31',
  'remedy-practices': 'tc_4b4cbf9a1f332e71e29ca529a3f3028416bdee3c',
  'lifestyle-practices': 'tc_d8fefb205909bb1e9a13f66142a04aa4e5f34071',
  'seva-practices': 'tc_cf00b58274549a80a839a885a17bc97ef8b05359',
};

/**
 * sha256(stableStringify({ definitionId: { topicId: key } })) over the 403 narrative topics of every
 * other single-subject report, captured before the change (hard-coded; recompute only on purpose).
 */
const OTHER_MODULES_DIGEST = 'bc0ab2ef93edc5103d11243124f49009086d441bf7bf6f5912e7382c4dc12ac3';

describe('backward compatibility', () => {
  it('career topics that do not opt in keep byte-identical cache keys', () => {
    const def = validateModule(CAREER_MODULE);
    // The career specVersion was bumped 1.0.0 -> 1.1.0 on purpose after the last migration wave
    // (proposal §6), which re-keys every career topic. The legacy keys below were captured at 1.0.0, so
    // they are recomputed with the pre-bump specVersion: this still proves that the evidence scope,
    // fingerprint and every other key part of a non-opted topic are unchanged.
    expect(def.specVersion).toBe('1.1.0');
    const preBump = { ...def, specVersion: '1.0.0' };
    const topics = def.sections.flatMap((s) => s.topics).filter((t) => t.kind === 'narrative');
    for (const [id, expected] of Object.entries(CAREER_LEGACY_KEYS)) {
      const t = topics.find((x) => x.id === id)!;
      expect(isInterpretationTopic(t), id).toBe(false);
      expect(interpretationFingerprint(t, career.registry), id).toBeUndefined();
      expect(legacyKey(preBump, career.snapshot, career.registry, t), id).toBe(expected);
      expect(legacyKey(def, career.snapshot, career.registry, t), id).not.toBe(expected);
    }
  });

  it('every other report keeps byte-identical cache keys (no fact.*/interp.* leaks)', async () => {
    const all: Record<string, Record<string, string>> = {};
    let count = 0;
    for (const entry of ReportRegistry.list()) {
      const def = validateModule(entry.module);
      // kundli-basic was added after this baseline was recorded; its topics are the Kundli's own.
      if (def.requires.partner || def.id === 'career' || def.id === 'kundli-basic') continue;
      const { snapshot, registry } = await registryFor(def.id);
      all[def.id] = {};
      for (const s of def.sections) for (const t of s.topics) {
        if (t.kind !== 'narrative') continue;
        expect(isInterpretationTopic(t)).toBe(false);
        all[def.id][t.id] = legacyKey(def, snapshot, registry, t);
        count += 1;
      }
    }
    expect(count).toBe(403);
    expect(sha256(stableStringify(all))).toBe(OTHER_MODULES_DIGEST);
  }, 600000);

  it('no evidence pattern of any definition matches an interp.* ID; only career cites fact.*', () => {
    const sampleInterp = ['interp.career.house-10.lord-placement', 'interp.career.fields', 'interp.x.y'];
    const sampleFact = career.registry.all().filter((e) => e.id.startsWith('fact.')).map((e) => e.id);
    for (const entry of ReportRegistry.list()) {
      const def = validateModule(entry.module);
      for (const t of def.sections.flatMap((s) => s.topics)) {
        const pats = [...t.requiredEvidence, ...t.optionalEvidence];
        for (const id of sampleInterp) expect(EvidenceRegistry.matches(id, pats), `${def.id}/${t.id}`).toBe(false);
        if (def.id !== 'career') for (const id of sampleFact) expect(EvidenceRegistry.matches(id, pats), `${def.id}/${t.id}`).toBe(false);
      }
    }
  });

  it('legacy topics parse with empty interpretations and variants', () => {
    const t = ReportTopicSchema.parse({ id: 't', title: 't', kind: 'narrative', objective: 'x', requiredEvidence: ['a.b'] });
    expect(t.interpretations).toEqual([]);
    expect(t.variants).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Registration and scope (injected runner; independent of the A4 pack)
// ---------------------------------------------------------------------------

const PACK: InterpretationPack = { id: 'test', version: '0.0.1', rules: [], topics: {} };

function result(id: string, refs: string[], over: Partial<InterpretationResult> = {}): InterpretationResult {
  return {
    id, topic: 'career.house-10', question: 'Where does the 10th lord direct professional energy?',
    conclusion: { code: 'LORD_IN_DUSTHANA', text: 'The 10th lord sits in a dusthana' },
    supporting: [], contradicting: refs.slice(0, 1).map((f) => ({ factId: f, conditionCode: 'LORD_IN_DUSTHANA' as const, ruleId: 'INT-H-001' })),
    ruleIds: ['INT-H-001'], chartRefs: refs, strengthClass: 'challenged', timeRelevance: { kind: 'natal' },
    qualification: ['BIRTH_TIME_SENSITIVE'], explanation: 'the 10th lord Mars is in the 12th house', provisional: false, sources: ['BPHS'],
    ...over,
  };
}

function setOf(results: InterpretationResult[], snapshotId: string): InterpretationSet {
  return { schemaVersion: '1.0.0', rulesetVersion: 'abcdef012345', snapshotId, results, rejected: [] };
}

describe('interp.* registration', () => {
  it('registers each result with the contract label, kind, value and source, after the module contributors', () => {
    let seenFacts = false;
    const run: RunInterpretation = (input, facts) => {
      seenFacts = facts.has('planet.mars.d1.dispositor') && facts.has('career.yogas.relevant');
      return setOf([
        result('interp.career.house-10.lord-placement', ['house.10.d1.lord-house', 'planet.mars.d1.house']),
        result('interp.career.fields', ['asc.d1.lord'], { strengthClass: 'mixed', qualification: ['MIXED_INDICATORS'], timeRelevance: { kind: 'current', asOfIso: input.asOfIso, activatedBy: [] } as never }),
      ], input.snapshotId);
    };
    const r = career.snapshot;
    const reg = new EvidenceRegistry(r, {
      contributors: [
        (add, x) => CAREER_MODULE.evidence!(add, { snapshot: r, ext: career.ext, registry: x }),
        interpretationContributor({ pack: PACK, run }),
      ],
    });
    expect(seenFacts).toBe(true);
    const item = reg.get('interp.career.house-10.lord-placement')!;
    expect(item.kind).toBe('interpretation');
    expect(item.value).toBe('LORD_IN_DUSTHANA');
    expect(item.source).toBe('interpretation:INT-H-001');
    expect(item.label).toBe('The 10th lord sits in a dusthana [challenged; natal; BIRTH_TIME_SENSITIVE] — because the 10th lord Mars is in the 12th house');
    expect(reg.get('interp.career.fields')!.label).toMatch(/\[mixed; current as of 20 Nov 2026; MIXED_INDICATORS\]/);
    expect(reg.interpretation?.set.rulesetVersion).toBe('abcdef012345');
    expect(reg.interpretation?.byId.size).toBe(2);

    // Scope: opted-in topics add patterns + chartRefs of matched results; legacy topics unchanged.
    const opted = ReportTopicSchema.parse({ id: 'o', title: 'o', kind: 'narrative', objective: 'x', requiredEvidence: ['house.10.d1.sign'], interpretations: ['interp.career.house-10.*'] });
    expect(matchedInterpretations(opted, reg).map((x) => x.id)).toEqual(['interp.career.house-10.lord-placement']);
    expect(topicAllowedEvidence(opted, reg)).toEqual(['house.10.d1.sign', 'interp.career.house-10.*', 'house.10.d1.lord-house', 'planet.mars.d1.house']);
    expect(interpretationFingerprint(opted, reg)).toMatch(/^[0-9a-f]{24}$/);
    const legacy = ReportTopicSchema.parse({ id: 'l', title: 'l', kind: 'narrative', objective: 'x', requiredEvidence: ['house.10.d1.sign'], optionalEvidence: ['sav.house.10'] });
    expect(topicAllowedEvidence(legacy, reg)).toEqual(['house.10.d1.sign', 'sav.house.10']);
    expect(interpretationFingerprint(legacy, reg)).toBeUndefined();
    expect(interpretationLabel(result('interp.a.b', [], { qualification: [] }))).toMatch(/\[challenged; natal; no qualification\]/);
  });

  it('fails closed on an unknown chartRef (INTERPRETATION_UNKNOWN_FACT)', () => {
    const run: RunInterpretation = (input) => setOf([result('interp.career.house-10.lord-placement', ['house.10.d1.lord-house', 'planet.mars.d1.nonexistent'])], input.snapshotId);
    expect(() => new EvidenceRegistry(career.snapshot, { contributors: [interpretationContributor({ pack: PACK, run })] }))
      .toThrow(InterpretationUnknownFactError);
    expect(() => new EvidenceRegistry(career.snapshot, { contributors: [interpretationContributor({ pack: PACK, run })] }))
      .toThrow(/INTERPRETATION_UNKNOWN_FACT: .*planet\.mars\.d1\.nonexistent/);
  });

  it('rejects a schema-invalid set (mixed without MIXED_INDICATORS)', () => {
    const run: RunInterpretation = (input) => setOf([result('interp.career.fields', ['asc.d1.lord'], { strengthClass: 'mixed', qualification: [] })], input.snapshotId);
    expect(() => new EvidenceRegistry(career.snapshot, { contributors: [interpretationContributor({ pack: PACK, run })] })).toThrow();
  });

  it('runs the real pipeline when prediction-engine provides it (Wave 2 golden run)', () => {
    const run = resolveRunInterpretation();
    const packExport = CAREER_MODULE.interpretation?.pack;
    if (!run || !packExport) return; // A4 pipeline/pack not exported yet: covered by the injected runner above
    const reg = new EvidenceRegistry(career.snapshot, {
      contributors: [
        (add, x) => CAREER_MODULE.evidence!(add, { snapshot: career.snapshot, ext: career.ext, registry: x }),
        interpretationContributor({ pack: packExport }),
      ],
    });
    expect(reg.interpretation!.set.results.length).toBeGreaterThan(0);
    for (const r of reg.interpretation!.set.results) for (const ref of r.chartRefs) expect(reg.has(ref), `${r.id} -> ${ref}`).toBe(true);
  });
});
