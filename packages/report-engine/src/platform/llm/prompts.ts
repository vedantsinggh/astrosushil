/**
 * Shared prompt infrastructure. Report-specific guidance comes from each
 * ReportDefinition (`writingGuidance`) and each topic's `objective`.
 *
 * Bump PROMPT_VERSION whenever the wording below changes — it is part of the
 * topic cache key, so stale narrative is regenerated rather than reused.
 */
import { EvidenceItem, ReportDefinition, ReportTopic } from '../contracts';

export const PROMPT_VERSION = 'p1.0.0';

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
  topics: Array<{ topic: ReportTopic; evidence: EvidenceItem[] }>;
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
  for (const { topic, evidence } of input.topics) {
    const depth = topic.depth
      ? `${topic.depth.minParagraphs}-${topic.depth.maxParagraphs} paragraphs of 70-130 words${topic.depth.bullets ? `, plus ${topic.depth.bullets} practical bullets` : ', bullets optional'}`
      : '2-3 paragraphs';
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
  }
  if (input.feedback.length) {
    lines.push(`\nYOUR PREVIOUS ATTEMPT WAS REJECTED. Fix these problems:\n${input.feedback.map((f) => `- ${f}`).join('\n')}`);
  }
  return lines.join('\n\n');
}
