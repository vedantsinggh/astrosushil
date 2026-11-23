/**
 * Shared prompt infrastructure. Report-specific guidance comes from each
 * ReportDefinition (`writingGuidance`) and each topic's `objective`.
 *
 * Bump PROMPT_VERSION whenever the wording below changes — it is part of the
 * topic cache key, so stale narrative is regenerated rather than reused.
 */
import { EvidenceItem, ReportDefinition, ReportTopic } from '../contracts';
import type { InterpretationView } from '../validation/interpretation-validator';

export const PROMPT_VERSION = 'p1.2.0';

/**
 * Version of the interpretation-specific prompt text (INTERPRETATIONS block,
 * topic instruction, GLOSSARY, life-stage line). It is part of the cache key of
 * opted-in topics only (`interpretationPromptVersion`), so changing it never
 * touches legacy topic keys. Bump it whenever that text changes.
 */
export const INTERPRETATION_PROMPT_VERSION = 'ip1.2.0';

/**
 * Approved glossary (calculation audit A1; report audit F10). Sources: BPHS
 * Ashtakavarga chapters 66-72 and B. V. Raman, *Ashtakavarga System of
 * Prediction* (SAV/BAV); standard Parashari definitions for the rest. Wording
 * is provisional, pending client review. The model must use these definitions
 * when it explains a term and must not define these terms any other way.
 */
export const GLOSSARY: ReadonlyArray<{ term: string; definition: string }> = [
  {
    term: 'Sarvashtakavarga (SAV)',
    definition:
      'the natal total of benefic points (bindus) that each sign receives from eight contributors (the Sun, Moon, Mars, Mercury, Jupiter, Venus, Saturn and the Ascendant), counted from where they sit in the birth chart; the chart total is 337 and the average is 28 per sign. In transit work, a transiting planet is judged by the SAV score of the sign it passes through. The bindus are natal: they are NOT support given by transiting planets.',
  },
  {
    term: 'Bhinnashtakavarga (BAV)',
    definition:
      "one planet's own ashtakavarga: the bindus (0 to 8) that the eight contributors give to each sign for that planet, counted from their natal positions. The seven planets' BAVs add up to the SAV.",
  },
  { term: 'Yogakaraka', definition: 'a planet that owns both a kendra (angular house) and a trikona (trine house) counted from the Ascendant. The label describes house ownership; it is not a promise of results.' },
  { term: 'Kendra / trikona', definition: 'kendras are the 1st, 4th, 7th and 10th houses; trikonas are the 1st, 5th and 9th houses.' },
  { term: 'Dispositor', definition: 'the lord of the sign a planet occupies.' },
  { term: 'Vargottama', definition: 'a planet that occupies the same sign in the birth chart (D1) and the navamsa (D9).' },
  { term: 'Combust', definition: 'a planet within a set angular distance of the Sun (the orb used is the one in the evidence).' },
  {
    term: 'Sade Sati',
    definition:
      "the period of about seven and a half years while transiting Saturn passes through the 12th, 1st and 2nd signs from the natal Moon sign. Describe it neutrally as a time marker; it is not a dosha and it does not predict harm.",
  },
  {
    term: 'Raja yoga / Dhana yoga',
    definition:
      'classical combinations of specified house lords (as named in the evidence). Formation shows a potential; it does not guarantee a result, and its expression depends on the condition of the planets involved.',
  },
];

/** Per-topic instruction added for topics that opted in to interpretation results. */
export const INTERPRETATION_TOPIC_INSTRUCTION =
  "Every evaluative sentence (strong, weak, supportive, demanding, favourable, mixed, and the like) must be backed by a claim that cites an interp.* ID and restates that result's conclusion. If a result is 'mixed', say plainly that it cuts both ways. Never add a judgement, strength word or rule that is not listed in INTERPRETATIONS. Do not present an empty or unaspected house as an advantage. A fact's own wording (e.g. 'functionally challenging', 'dignity: neutral') may be restated in a claim that cites that fact. Write every date in one form, day month year (e.g. 20 Nov 2026), never as 2026-11-20 or November 20, 2026; when an INTERPRETATIONS line gives a date, use that date. CLAIMS FOR THIS TOPIC: a claim that cites an interp.* ID must use that line's conclusion (the text before the first ' — ') copied word for word as its statement, followed by its class (e.g. '... This is mixed: it cuts both ways.'); a claim that cites a fact must copy that EVIDENCE label word for word. Include one such claim for every INTERPRETATIONS line marked REQUIRED and for every interp.* result you rely on. When a prose sentence gives a judgement, keep the key words of the cited conclusion (planet, house, sign, lord) so the two can be matched, but write it as natural, warm prose rather than repeating the claim; for a mixed result say so in varied ways that include 'mixed', 'both', 'while' or 'yet' (use the phrase 'cuts both ways' at most once per topic). Outside such sentences do not use evaluative words about chart factors at all (strong, weak, supportive, supported, balanced, neutral, demanding, favourable, mixed): describe instead what the placement asks of the reader.";

export const SYSTEM_PROMPT = `You are the writing voice of Astro Sushil (astrologer Sushil Kumaar Singh), preparing a premium, personalised Vedic astrology report.

ROLE AND LIMITS
- You are an explanation and writing engine. The chart has already been calculated deterministically. You must NOT calculate, infer or invent any placement, house, sign, degree, aspect, yoga, dasha, date or score.
- Use ONLY the chart facts provided in the EVIDENCE list of each topic. If a fact is not in the list, do not state it. Do not mention planets, houses or periods that are not in the evidence.
- Every sentence that states a chart fact must be backed by a claim object that cites the exact evidence IDs it relies on, and the claim statement must contain the fact's value (e.g. the sign name or house number). The safest claim statement is the cited EVIDENCE label copied word for word. State every placement exactly as the evidence gives it; never restate a planet's sign or house from memory.

ASTRO SUSHIL PHILOSOPHY (mandatory)
- Astro Sushil does not believe in doshas as curses or fear. Never describe any placement, Manglik status, Sade Sati or any "dosha" as harmful, cursed, doomed or dangerous. Frame challenges as growth areas and tendencies that awareness and effort can work with.
- No guarantees: never promise marriage, wealth, health, children, jobs or dates. Use measured language: "tends to", "suggests", "favours", "is a supportive window for".
- No medical, legal or financial advice. No remedy selling, no gemstone purchases, no rituals for money.
- Free will first: the chart describes inclinations; choices remain the reader's.

STYLE
- Warm, intelligent, specific, readable; second person ("you"). Premium editorial quality, not generic horoscope filler.
- Explain the astrology in plain language the first time a term appears (e.g. what the 7th house represents).
- Concrete, practical guidance where the topic asks for it. Vary sentence openings; do not repeat ideas covered in earlier topics.
- Never address the reader by name, never mention their birth date, time or place (they are not provided and are added by the layout).
- Plain text only inside JSON strings: no markdown, no asterisks, no emojis, no headings.

OUTPUT
Return a single JSON object: {"topics":[{"topicId": string, "lead": string (one engaging opening sentence), "paragraphs": string[], "bullets": string[], "takeaway": string, "claims": [{"statement": string, "evidenceIds": string[]}]}]}.
Return one entry per requested topic, using the exact topicId given. Write the JSON compactly on a single line, with no indentation or line breaks between keys (output tokens are billed). Keep each claim statement to one short sentence; do not add more claims than are needed to back the chart facts you state.`;

export interface BatchPromptInput {
  definition: ReportDefinition;
  sectionTitle: string;
  topics: Array<{
    topic: ReportTopic;
    evidence: EvidenceItem[];
    /** Set only for topics that opted in to interpretation results. */
    interpretations?: InterpretationView[];
  }>;
  priorSummaries: string[];
  feedback: string[];
}

export function buildBatchPrompt(input: BatchPromptInput): string {
  const { definition } = input;
  const lines: string[] = [];
  lines.push(`REPORT: ${definition.title} — ${definition.subtitle}`);
  if (definition.language === 'hi') {
    lines.push('LANGUAGE: Write lead, paragraphs, bullets and takeaway in natural, warm Hindi (Devanagari script). Keep each claim "statement" in English, quoting the chart fact exactly as given in the evidence label, so it can be audited.');
  }
  lines.push(`REPORT-SPECIFIC GUIDANCE:\n${definition.writingGuidance.map((g) => `- ${g}`).join('\n')}`);
  lines.push(`SECTION: ${input.sectionTitle}`);
  if (input.priorSummaries.length) {
    lines.push(`ALREADY COVERED EARLIER IN THE REPORT (stay consistent, do not repeat):\n${input.priorSummaries.map((s) => `- ${clip(s, PRIOR_SUMMARY_CHARS)}`).join('\n')}`);
  }
  if (input.topics.some((t) => t.interpretations !== undefined)) {
    lines.push(buildGlossaryBlock());
    // Stated once per call, not once per topic (input tokens are billed).
    lines.push(`INSTRUCTION FOR EVERY TOPIC BELOW THAT HAS AN INTERPRETATIONS BLOCK: ${INTERPRETATION_TOPIC_INSTRUCTION}`);
  }
  // Facts that every topic of this call may cite are listed once instead of once per topic.
  const interpIdsOf = (t: BatchPromptInput['topics'][number]) => new Set((t.interpretations ?? []).map((i) => i.id));
  const factsOf = (t: BatchPromptInput['topics'][number]) => {
    const skip = interpIdsOf(t);
    return t.evidence.filter((e) => !skip.has(e.id));
  };
  const common = new Set<string>();
  if (input.topics.length > 1) {
    const [first, ...rest] = input.topics.map((t) => new Set(factsOf(t).map((e) => e.id)));
    for (const id of first) if (rest.every((r) => r.has(id))) common.add(id);
    // A topic keeps at least a few facts of its own listing so its block stays self-explanatory.
    if (common.size < COMMON_EVIDENCE_MIN) common.clear();
  }
  if (common.size) {
    lines.push(
      [`${COMMON_EVIDENCE_HEADING} (every topic below may cite these IDs exactly, in addition to its own list):`,
        ...factsOf(input.topics[0]).filter((e) => common.has(e.id)).map((e) => `  [${e.id}] ${e.label}`)].join('\n')
    );
  }
  const ownFacts = (t: BatchPromptInput['topics'][number]) => factsOf(t).filter((e) => !common.has(e.id));
  const evidenceHead = common.size ? `EVIDENCE (cite these IDs exactly; the ${COMMON_EVIDENCE_HEADING} list above also applies):` : `EVIDENCE (cite these IDs exactly):`;
  for (const { topic, evidence, interpretations } of input.topics) {
    const depth = topic.depth
      ? `${topic.depth.minParagraphs}-${topic.depth.maxParagraphs} paragraphs of 70-130 words (the "paragraphs" array must hold at least ${topic.depth.minParagraphs} separate entries; fewer is rejected)${topic.depth.bullets ? `, plus ${topic.depth.bullets} practical bullets` : ', bullets optional'}`
      : '2-3 paragraphs';
    if (interpretations === undefined) {
      lines.push(
        [
          `\n=== TOPIC topicId="${topic.id}" ===`,
          `Title: ${topic.title}`,
          `Objective: ${topic.objective}`,
          `Length: ${depth}. Include at least 2 claims.`,
          evidenceHead,
          ...evidence.filter((e) => !common.has(e.id)).map((e) => `  [${e.id}] ${e.label}`),
        ].join('\n')
      );
      continue;
    }
    const interpIds = new Set(interpretations.map((i) => i.id));
    // Results named exactly (no trailing *) in the topic must be cited by a verified claim (validator V5).
    const named = (topic as ReportTopic & { interpretations?: unknown }).interpretations;
    const required = new Set(Array.isArray(named) ? named.filter((n): n is string => typeof n === 'string' && !n.endsWith('*')) : []);
    const facts = evidence.filter((e) => !interpIds.has(e.id));
    const lifeStage = facts.filter(isLifeStageEvidence);
    const listed = facts.filter((e) => !common.has(e.id));
    lines.push(
      [
        `\n=== TOPIC topicId="${topic.id}" ===`,
        `Title: ${topic.title}`,
        `Objective: ${topic.objective}`,
        `Length: ${depth}. Include at least 2 claims.`,
        evidenceHead,
        ...listed.map((e) => `  [${e.id}] ${e.label}`),
        `INTERPRETATIONS (state these conclusions; do not add others; cite their IDs):`,
        ...(interpretations.length ? interpretations.map((v) => formatInterpretationLine(v) + (required.has(v.id) ? ' — REQUIRED: cite this ID in a claim' : '')) : ['  (none for this chart: describe the facts without any evaluative judgement)']),
        ...(lifeStage.length ? [`LIFE STAGE: ${lifeStage.map((e) => e.label).join('; ')}. ${LIFE_STAGE_INSTRUCTION}`] : []),
      ].join('\n')
    );
  }
  if (input.feedback.length) {
    lines.push(`\nYOUR PREVIOUS ATTEMPT WAS REJECTED. Fix these problems:\n${input.feedback.map((f) => `- ${f}`).join('\n')}`);
  }
  return lines.join('\n\n');
}

export const COMMON_EVIDENCE_HEADING = 'EVIDENCE COMMON TO EVERY TOPIC';
/** Sharing fewer facts than this is not worth a separate block. */
const COMMON_EVIDENCE_MIN = 6;
/** Earlier topics are recalled by title and the start of their opening line only. */
const PRIOR_SUMMARY_CHARS = 150;
const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

export const LIFE_STAGE_INSTRUCTION =
  'Frame guidance for this life stage: do not assume seniority, a long track record, retirement or late-career roles the native has not reached; speak of later possibilities only as long-term possibilities.';

function isLifeStageEvidence(e: EvidenceItem): boolean {
  return e.kind === 'life-stage' || /(?:^|\.)(?:life-stage|age)(?:\.|$)/.test(e.id);
}

const dash = (xs: string[]) => (xs.length ? `[${xs.join(', ')}]` : '[none]');

/** `[interp.id] conclusion — class — timing — qualifications — supported by [ids] — contradicted by [ids]` */
export function formatInterpretationLine(v: InterpretationView): string {
  return `  [${v.id}] ${v.conclusionText} — ${v.strengthClass ?? 'unclassified'} — ${v.timing || 'natal'} — ${v.qualification || 'no qualifications'} — supported by ${dash(v.supportedBy)} — contradicted by ${dash(v.contradictedBy)}${v.explanation ? ` — because ${v.explanation}` : ''}`;
}

export function buildGlossaryBlock(): string {
  return `APPROVED GLOSSARY (when you explain one of these terms, use this definition; never define them any other way):\n${GLOSSARY.map((g) => `- ${g.term}: ${g.definition}`).join('\n')}`;
}
