/**
 * Shared prompt infrastructure. Report-specific guidance comes from each
 * ReportDefinition (`writingGuidance`) and each topic's `objective`.
 *
 * Bump PROMPT_VERSION whenever the wording below changes — it is part of the
 * topic cache key, so stale narrative is regenerated rather than reused.
 */
import { EvidenceItem, ReportDefinition, ReportTopic } from '../contracts';
import type { InterpretationView } from '../validation/interpretation-validator';

export const PROMPT_VERSION = 'p1.0.0';

/**
 * Version of the interpretation-specific prompt text (INTERPRETATIONS block,
 * topic instruction, GLOSSARY, life-stage line). It is part of the cache key of
 * opted-in topics only (`interpretationPromptVersion`), so changing it never
 * touches legacy topic keys. Bump it whenever that text changes.
 */
export const INTERPRETATION_PROMPT_VERSION = 'ip1.1.0';

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
  "Every evaluative sentence (strong, weak, supportive, demanding, favourable, mixed, and the like) must be backed by a claim that cites an interp.* ID and restates that result's conclusion. If a result is 'mixed', say plainly that it cuts both ways. Never add a judgement, strength word or rule that is not listed in INTERPRETATIONS. Do not present an empty or unaspected house as an advantage. A fact's own wording (e.g. 'functionally challenging', 'dignity: neutral') may be restated in a claim that cites that fact. Write every date in one form, day month year (e.g. 20 Nov 2026), never as 2026-11-20 or November 20, 2026; when an INTERPRETATIONS line gives a date, use that date.";

export const SYSTEM_PROMPT = `You are the writing voice of Astro Sushil (astrologer Sushil Kumaar Singh), preparing a premium, personalised Vedic astrology report.

ROLE AND LIMITS
- You are an explanation and writing engine. The chart has already been calculated deterministically. You must NOT calculate, infer or invent any placement, house, sign, degree, aspect, yoga, dasha, date or score.
- Use ONLY the chart facts provided in the EVIDENCE list of each topic. If a fact is not in the list, do not state it. Do not mention planets, houses or periods that are not in the evidence.
- Every sentence that states a chart fact must be backed by a claim object that cites the exact evidence IDs it relies on, and the claim statement must contain the fact's value (e.g. the sign name or house number).

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
Return one entry per requested topic, using the exact topicId given.`;

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
    lines.push(`ALREADY COVERED EARLIER IN THE REPORT (stay consistent, do not repeat):\n${input.priorSummaries.map((s) => `- ${s}`).join('\n')}`);
  }
  if (input.topics.some((t) => t.interpretations !== undefined)) {
    lines.push(buildGlossaryBlock());
  }
  for (const { topic, evidence, interpretations } of input.topics) {
    const depth = topic.depth
      ? `${topic.depth.minParagraphs}-${topic.depth.maxParagraphs} paragraphs of 70-130 words${topic.depth.bullets ? `, plus ${topic.depth.bullets} practical bullets` : ', bullets optional'}`
      : '2-3 paragraphs';
    if (interpretations === undefined) {
      lines.push(
        [
          `\n=== TOPIC topicId="${topic.id}" ===`,
          `Title: ${topic.title}`,
          `Objective: ${topic.objective}`,
          `Length: ${depth}. Include at least 2 claims.`,
          `EVIDENCE (cite these IDs exactly):`,
          ...evidence.map((e) => `  [${e.id}] ${e.label}`),
        ].join('\n')
      );
      continue;
    }
    const interpIds = new Set(interpretations.map((i) => i.id));
    const facts = evidence.filter((e) => !interpIds.has(e.id));
    const lifeStage = facts.filter(isLifeStageEvidence);
    lines.push(
      [
        `\n=== TOPIC topicId="${topic.id}" ===`,
        `Title: ${topic.title}`,
        `Objective: ${topic.objective}`,
        `Length: ${depth}. Include at least 2 claims.`,
        `EVIDENCE (cite these IDs exactly):`,
        ...facts.map((e) => `  [${e.id}] ${e.label}`),
        `INTERPRETATIONS (state these conclusions; do not add others; cite their IDs):`,
        ...(interpretations.length ? interpretations.map(formatInterpretationLine) : ['  (none for this chart: describe the facts without any evaluative judgement)']),
        `INSTRUCTION: ${INTERPRETATION_TOPIC_INSTRUCTION}`,
        ...(lifeStage.length ? [`LIFE STAGE: ${lifeStage.map((e) => e.label).join('; ')}. ${LIFE_STAGE_INSTRUCTION}`] : []),
      ].join('\n')
    );
  }
  if (input.feedback.length) {
    lines.push(`\nYOUR PREVIOUS ATTEMPT WAS REJECTED. Fix these problems:\n${input.feedback.map((f) => `- ${f}`).join('\n')}`);
  }
  return lines.join('\n\n');
}

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
