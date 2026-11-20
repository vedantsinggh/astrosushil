/**
 * Claim validator.
 *
 * Treats LLM output as untrusted. A claim is `verified` only when:
 *   1. every cited evidence ID exists in the registry of the *current* snapshot,
 *   2. every cited ID is within the topic's allowed evidence scope, and
 *   3. the statement's checkable facts agree with the cited evidence values
 *      (and at least one such fact or value actually appears in the statement).
 *
 * Independently of the claims, the narrative text is scanned for planet/house/
 * sign assertions and each is re-checked against the snapshot, so an LLM cannot
 * slip an unsupported placement into prose by simply not citing it.
 */
import {
  ClaimValidation,
  GeneratedTopicPayload,
  ReportTopic,
  TopicValidationResult,
  ValidationIssue,
} from '../contracts';
import { EvidenceRegistry, PLANETS, SIGNS, ordinal } from '../evidence/evidence-registry';

const PLANET_RE = PLANETS.join('|');
const SIGN_RE = SIGNS.join('|');
/** Words that signal the sentence is about a transit, a divisional chart or a hypothetical, not natal D1. */
const NON_NATAL_CONTEXT = new RegExp(
  [
    // transits and hypotheticals
    'transit', 'transiting', 'gochar', 'moves? (?:into|through)', 'will (?:enter|move)', 'ingress', 'if ', 'when a', 'whenever', 'generally', 'traditionally', 'in general',
    // divisional charts (D2–D60 and their names)
    'd(?:2|3|4|7|9|10|12|16|20|24|27|30|40|45|60)\\b', 'divisional', 'navamsh?a', 'dasamsa', 'dashamsh?a', 'hora chart', 'drekkana', 'saptamsh?a', 'dwadasamsh?a',
    'shodasamsh?a', 'vimsamsh?a', 'chaturvimsamsh?a', 'bhamsa', 'trimsamsh?a', 'khavedamsh?a', 'akshavedamsh?a', 'shashtiamsh?a', 'varga',
    // annual / Tajik charts
    'varsha', 'varshaphal', 'annual chart', "year'?s chart", 'solar return', 'tajik', 'muntha',
    // houses counted from another reference point
    'from (?:the|your) (?:natal )?(?:moon|sun|lagna|ascendant|karakamsha|atmakaraka)', 'counted from', 'chandra lagna', 'moon chart',
  ].map((t) => `\\b${t}`).join('|'),
  'i'
);
/** Sentences about the second native in two-person reports. */
const PARTNER_CONTEXT = /\b(partner'?s?|spouse'?s|their)\b|^\s*partner:/i;

const ORDINAL_WORDS: Record<string, number> = {
  first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6,
  seventh: 7, eighth: 8, ninth: 9, tenth: 10, eleventh: 11, twelfth: 12,
};

function parseHouseNumber(token: string): number | undefined {
  const m = /^(\d{1,2})(?:st|nd|rd|th)$/i.exec(token);
  if (m) return Number(m[1]);
  return ORDINAL_WORDS[token.toLowerCase()];
}

interface NatalAssertion {
  /** Whose chart the sentence describes. */
  who?: 'native' | 'partner';
  planet: string;
  house?: number;
  sign?: string;
  text: string;
}

// ---------------------------------------------------------------------------
// Hindi (Devanagari) recognition, so Hindi narrative is checked as strictly as
// English. Hindi words map to the English planet/sign names used by the
// registry. JS \b does not work for Devanagari, so word edges use Unicode
// letter/mark look-arounds.
// ---------------------------------------------------------------------------

const HI_PLANETS: Array<[string, string]> = [
  ['सूर्य', 'Sun'], ['चंद्रमा', 'Moon'], ['चन्द्रमा', 'Moon'], ['चंद्र', 'Moon'], ['चन्द्र', 'Moon'], ['मंगल', 'Mars'], ['बुध', 'Mercury'],
  ['बृहस्पति', 'Jupiter'], ['गुरु', 'Jupiter'], ['शुक्र', 'Venus'], ['शनि', 'Saturn'], ['राहु', 'Rahu'], ['केतु', 'Ketu'],
];
const HI_SIGNS: Array<[string, string]> = [
  ['मेष', 'Aries'], ['वृषभ', 'Taurus'], ['वृष', 'Taurus'], ['मिथुन', 'Gemini'], ['कर्क', 'Cancer'], ['सिंह', 'Leo'], ['कन्या', 'Virgo'],
  ['तुला', 'Libra'], ['वृश्चिक', 'Scorpio'], ['धनु', 'Sagittarius'], ['मकर', 'Capricorn'], ['कुंभ', 'Aquarius'], ['कुम्भ', 'Aquarius'], ['मीन', 'Pisces'],
];
const HI_ORDINAL_STEMS: Array<[string, number]> = [
  ['पहल', 1], ['प्रथम', 1], ['दूसर', 2], ['द्वितीय', 2], ['तीसर', 3], ['तृतीय', 3], ['चौथ', 4], ['चतुर्थ', 4],
  ['पाँचव', 5], ['पांचव', 5], ['पंचम', 5], ['छठ', 6], ['षष्ठ', 6], ['सातव', 7], ['सप्तम', 7], ['आठव', 8], ['अष्टम', 8],
  ['नौव', 9], ['नवम', 9], ['नव', 9], ['दसव', 10], ['दशम', 10], ['ग्यारहव', 11], ['एकादश', 11], ['बारहव', 12], ['द्वादश', 12],
];
const HI_EDGE_L = '(?<![\\p{L}\\p{M}])';
const HI_EDGE_R = '(?![\\p{L}\\p{M}])';
const altOf = (xs: string[]) => [...xs].sort((a, b) => b.length - a.length).join('|');
const HI_PLANET_RE = altOf(HI_PLANETS.map(([h]) => h));
const HI_SIGN_RE = altOf(HI_SIGNS.map(([h]) => h));
/** Ordinal stem + oblique/direct ending (वें, वे, वाँ, वां, ा, े, ी), or a digit with वें/वे. */
const HI_ORDINAL_RE = `(?:(${altOf(HI_ORDINAL_STEMS.map(([h]) => h))})(?:वें|वे|वाँ|वां|वीं|ें|े|ा|ी)?|(\\d{1,2})\\s*(?:वें|वे|वाँ|वां))`;
const HI_NON_NATAL = /(गोचर|नवांश|दशमांश|वर्ग\s*कुंडली|यदि|अगर|जब\s|सामान्यतः|सामान्य\s+रूप|परंपरागत\s+रूप|प्रवेश\s+करेग|डी9|डी10|D9|D10)/;

function hiPlanet(word: string): string {
  return HI_PLANETS.find(([h]) => h === word)![1];
}
function hiOrdinal(stem: string | undefined, digits: string | undefined): number | undefined {
  if (digits) return Number(digits);
  return HI_ORDINAL_STEMS.find(([h]) => h === stem)?.[1];
}

/** Hindi assertions: "<ग्रह> … <क्रम> भाव/घर में" and "<ग्रह> … <राशि> (राशि) में". */
function extractHindiAssertions(sentence: string): NatalAssertion[] {
  const out: NatalAssertion[] = [];
  if (HI_NON_NATAL.test(sentence)) return out;
  const houseRe = new RegExp(`${HI_EDGE_L}(${HI_PLANET_RE})${HI_EDGE_R}[^।.;:]{0,40}?${HI_EDGE_L}${HI_ORDINAL_RE}\\s*(?:भाव|घर|स्थान)(?:\\s*में|\\s*मे)`, 'gu');
  const signRe = new RegExp(`${HI_EDGE_L}(${HI_PLANET_RE})${HI_EDGE_R}[^।.;:]{0,30}?${HI_EDGE_L}(${HI_SIGN_RE})${HI_EDGE_R}\\s*(?:राशि\\s*)?(?:में|मे)`, 'gu');
  let m: RegExpExecArray | null;
  while ((m = houseRe.exec(sentence))) {
    const house = hiOrdinal(m[2], m[3]);
    if (house && house >= 1 && house <= 12) out.push({ planet: hiPlanet(m[1]), house, text: sentence });
  }
  while ((m = signRe.exec(sentence))) {
    out.push({ planet: hiPlanet(m[1]), sign: HI_SIGNS.find(([h]) => h === m![2])![1], text: sentence });
  }
  return out;
}

/** Extract "<Planet> … in the <n>th house" and "<Planet> … in <Sign>" assertions sentence by sentence (English and Hindi). */
export function extractNatalAssertions(text: string): NatalAssertion[] {
  const out: NatalAssertion[] = [];
  const sentences = text.split(/(?<=[.!?।])\s+/);
  const houseRe = new RegExp(
    `\\b(${PLANET_RE})\\b(?:[^.;:]{0,40}?)\\b(?:in|occupies|occupying|placed in|sits in|resides in|located in)\\s+(?:your|the)\\s+(\\d{1,2}(?:st|nd|rd|th)|first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|eleventh|twelfth)\\s+house`,
    'gi'
  );
  const signRe = new RegExp(
    `\\b(${PLANET_RE})\\b(?:[^.;:]{0,25}?)\\b(?:in|occupies|placed in|sits in|located in)\\s+(${SIGN_RE})\\b`,
    'gi'
  );
  for (const s of sentences) {
    if (/[\u0900-\u097F]/.test(s)) out.push(...extractHindiAssertions(s));
    if (NON_NATAL_CONTEXT.test(s)) continue;
    const who: 'native' | 'partner' = PARTNER_CONTEXT.test(s) ? 'partner' : 'native';
    let m: RegExpExecArray | null;
    houseRe.lastIndex = 0;
    while ((m = houseRe.exec(s))) {
      const house = parseHouseNumber(m[2]);
      if (house) out.push({ planet: m[1], house, text: s, who });
    }
    signRe.lastIndex = 0;
    while ((m = signRe.exec(s))) out.push({ planet: m[1], sign: m[2], text: s, who });
  }
  return out;
}

function normalisePlanet(p: string): string {
  return p.charAt(0).toUpperCase() + p.slice(1).toLowerCase();
}

/**
 * Check a placement assertion against the registry. Returns an error message or null.
 *
 * The D1 (natal) value is always acceptable. A value from a divisional chart
 * (D9, D10, …) is also acceptable when the topic is allowed to cite that
 * chart's placement — e.g. a D10 topic saying "Mercury in Pisces" when the D10
 * Mercury is in Pisces. A statement matching none of the in-scope charts is a
 * contradiction.
 */
function checkAssertion(a: NatalAssertion, registry: EvidenceRegistry, allowed: string[] = []): string | null {
  const key = normalisePlanet(a.planet).toLowerCase();
  // Partner sentences are checked against the partner's chart when one exists;
  // otherwise (e.g. a hypothetical future partner) they cannot be checked here.
  const prefix = a.who === 'partner' ? 'partner.' : '';
  if (a.who === 'partner' && !registry.has(`partner.planet.${key}.d1.house`)) return null;
  const inScope = (field: 'house' | 'sign') =>
    registry
      .resolve([`${prefix}planet.${key}.d*.${field}`])
      .filter((ev) => ev.id === `${prefix}planet.${key}.d1.${field}` || EvidenceRegistry.matches(ev.id, allowed));
  if (a.house !== undefined) {
    const evs = inScope('house');
    const natal = registry.get(`${prefix}planet.${key}.d1.house`);
    if (natal && !evs.some((ev) => ev.value === a.house)) {
      return `States ${normalisePlanet(a.planet)} in the ${ordinal(a.house)} house; chart has it in the ${ordinal(Number(natal.value))}`;
    }
  }
  if (a.sign !== undefined) {
    const evs = inScope('sign');
    const natal = registry.get(`${prefix}planet.${key}.d1.sign`);
    if (natal && !evs.some((ev) => String(ev.value).toLowerCase() === a.sign!.toLowerCase())) {
      return `States ${normalisePlanet(a.planet)} in ${a.sign}; chart has it in ${natal.value}`;
    }
  }
  return null;
}

function valueAppears(value: unknown, statement: string): boolean {
  const s = statement.toLowerCase();
  const check = (v: unknown): boolean => {
    if (typeof v === 'number') return new RegExp(`\\b${v}(?:st|nd|rd|th)?\\b`).test(s) || (v >= 1 && v <= 12 && Object.entries(ORDINAL_WORDS).some(([w, n]) => n === v && s.includes(w)));
    if (typeof v === 'string') return v.length > 0 && s.includes(v.toLowerCase().replace(/_/g, ' '));
    if (typeof v === 'boolean') return true; // boolean facts are expressed in words; scope + text scan cover them
    return false;
  };
  if (Array.isArray(value)) return value.length === 0 ? /\b(no|none|unoccupied|alone|empty)\b/.test(s) : value.some(check);
  return check(value);
}

export interface ValidateTopicOptions {
  expectedSnapshotId: string;
  /** Evidence patterns this topic may cite (required + optional). */
  allowedEvidence: string[];
  minVerifiedClaims?: number;
}

export function validateGeneratedTopic(
  topic: ReportTopic,
  payload: GeneratedTopicPayload,
  registry: EvidenceRegistry,
  opts: ValidateTopicOptions
): TopicValidationResult {
  const issues: ValidationIssue[] = [];
  const claims: ClaimValidation[] = [];
  const verified = new Set<string>();

  if (registry.snapshotId !== opts.expectedSnapshotId) {
    issues.push({ severity: 'error', code: 'SNAPSHOT_MISMATCH', message: 'Registry snapshot differs from the report snapshot' });
  }
  if (payload.topicId !== topic.id) {
    issues.push({ severity: 'error', code: 'TOPIC_ID_MISMATCH', message: `Payload topicId ${payload.topicId} != ${topic.id}` });
  }

  for (const claim of payload.claims) {
    const reasons: string[] = [];
    for (const id of claim.evidenceIds) {
      const item = registry.get(id);
      if (!item) reasons.push(`UNKNOWN_EVIDENCE:${id}`);
      else if (item.snapshotId !== opts.expectedSnapshotId) reasons.push(`CROSS_SNAPSHOT_EVIDENCE:${id}`);
      else if (!EvidenceRegistry.matches(id, opts.allowedEvidence)) reasons.push(`OUT_OF_SCOPE_EVIDENCE:${id}`);
    }
    const contradictions = extractNatalAssertions(claim.statement)
      .map((a) => checkAssertion(a, registry, opts.allowedEvidence))
      .filter((x): x is string => x !== null);
    reasons.push(...contradictions.map((c) => `CONTRADICTS_CHART:${c}`));

    let status: ClaimValidation['status'];
    if (reasons.length > 0) {
      status = 'rejected';
    } else {
      const items = claim.evidenceIds.map((id) => registry.get(id)!);
      const grounded = items.some((i) => valueAppears(i.value, claim.statement));
      status = grounded ? 'verified' : 'unverifiable';
      if (!grounded) reasons.push('STATEMENT_DOES_NOT_STATE_CITED_VALUE');
    }
    if (status === 'verified') claim.evidenceIds.forEach((id) => verified.add(id));
    claims.push({ statement: claim.statement, evidenceIds: claim.evidenceIds, status, reasons });
  }

  // Independent scan of every sentence of the narrative.
  const fullText = [payload.lead, ...payload.paragraphs, ...payload.bullets, payload.takeaway ?? ''].join(' ');
  for (const a of extractNatalAssertions(fullText)) {
    const err = checkAssertion(a, registry, opts.allowedEvidence);
    if (err) issues.push({ severity: 'error', code: 'NARRATIVE_CONTRADICTS_CHART', message: `${err} — "${a.text.slice(0, 160)}"` });
  }

  const rejected = claims.filter((c) => c.status === 'rejected');
  if (rejected.length) {
    issues.push({ severity: 'error', code: 'REJECTED_CLAIMS', message: `${rejected.length} claim(s) rejected: ${rejected.map((r) => r.reasons.join('|')).join('; ').slice(0, 400)}` });
  }
  const minVerified = opts.minVerifiedClaims ?? 1;
  if (verified.size === 0 || claims.filter((c) => c.status === 'verified').length < minVerified) {
    issues.push({ severity: 'error', code: 'INSUFFICIENT_VERIFIED_CLAIMS', message: `Needs at least ${minVerified} verified claim(s)` });
  }

  // Required evidence coverage: each required pattern must be cited by a verified claim.
  for (const pattern of topic.requiredEvidence) {
    if (![...verified].some((id) => EvidenceRegistry.matches(id, [pattern]))) {
      issues.push({ severity: 'warning', code: 'REQUIRED_EVIDENCE_NOT_CITED', message: `No verified claim cites ${pattern}` });
    }
  }

  // Depth requirements.
  if (topic.depth) {
    const n = payload.paragraphs.length;
    if (n < topic.depth.minParagraphs) issues.push({ severity: 'error', code: 'TOO_SHORT', message: `${n} paragraphs < ${topic.depth.minParagraphs}` });
    if (n > topic.depth.maxParagraphs) issues.push({ severity: 'warning', code: 'TOO_LONG', message: `${n} paragraphs > ${topic.depth.maxParagraphs}` });
  }

  return {
    topicId: topic.id,
    passed: !issues.some((i) => i.severity === 'error'),
    claims,
    issues,
    verifiedEvidenceIds: [...verified].sort(),
  };
}
