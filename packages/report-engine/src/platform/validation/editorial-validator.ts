/**
 * Editorial safeguards (AGENTS.md + docs/report-system §10).
 *
 * Blocks fear-based dosha language, guaranteed outcomes, medical/financial/legal
 * certainty, foreign branding and leaked reference-sample identities, and flags
 * cross-topic repetition.
 */
import { GeneratedTopicPayload, ValidationIssue } from '../contracts';

interface Rule {
  code: string;
  severity: 'error' | 'warning';
  pattern: RegExp;
  message: string;
}

const RULES: Rule[] = [
  { code: 'FEAR_LANGUAGE', severity: 'error', pattern: /(?<!\b(?:not|no|never|nor|isn't|is not|rather than|instead of)\s(?:an?\s|a\s)?)\b(curse[ds]?|cursed|doomed|destroy(?:s|ed)? your|catastroph\w*|calamit\w*|inauspicious fate|evil eye|black magic)\b/i, message: 'Fear-based language is not permitted' },
  { code: 'DOSHA_AS_AFFLICTION', severity: 'error', pattern: /\b(suffer(?:s|ing)? from|afflicted by|victim of)\s+(?:a\s+|the\s+)?(?:manglik|mangal|kaal\s*sarp|pitra|nadi|kemadruma|sade\s*sati)/i, message: 'Doshas must not be framed as afflictions (Astro Sushil does not believe in doshas)' },
  { code: 'GUARANTEE', severity: 'error', pattern: /\b(guarantee[ds]?|certainly will|will definitely|100\s?%|without (?:any )?doubt you will|is destined to fail|never marry|will die)\b/i, message: 'Guaranteed or absolute outcomes are not permitted' },
  { code: 'MEDICAL_CERTAINTY', severity: 'error', pattern: /\b(will (?:get|develop|suffer)\s+(?:cancer|diabetes|disease|illness)|diagnos\w+)\b/i, message: 'Medical predictions are not permitted' },
  { code: 'FINANCIAL_CERTAINTY', severity: 'error', pattern: /\b(will (?:become|be) (?:rich|wealthy|a millionaire)|guaranteed returns?|lottery)\b/i, message: 'Financial certainty is not permitted' },
  { code: 'REMEDY_SALES', severity: 'error', pattern: /\b(buy|purchase|order|invest in|get yourself)\b[^.]{0,40}\b(gem|gemstone|stone|sapphire|ruby|emerald|pearl|coral|diamond|hessonite|cat's eye|rudraksha?|yantra|puja|pooja|kavach|bracelet)s?\b|\bcoupon\b|\bdiscount\b/i, message: 'Remedy sales language is not permitted' },
  { code: 'FOREIGN_BRAND', severity: 'error', pattern: /\b(arun pandit|gemsmantra|astroarunpandit)\b/i, message: 'Third-party brand mentioned' },
  { code: 'REFERENCE_IDENTITY_LEAK', severity: 'error', pattern: /\b(puneet|bulandshahr|ananya iyer)\b/i, message: 'Reference/sample native identity leaked into content' },
  { code: 'PLACEHOLDER', severity: 'error', pattern: /\b(lorem ipsum|TODO|TBD|\[insert|\{\{|N\/A)\b/, message: 'Placeholder text' },
  { code: 'AI_SELF_REFERENCE', severity: 'error', pattern: /\b(as an ai|language model|i cannot|i'm unable)\b/i, message: 'Model self-reference' },
  { code: 'INVENTED_HISTORY', severity: 'warning', pattern: /\b(when you were (?:a child|young)|you (?:once|previously) (?:told|said)|as you know from your past)\b/i, message: 'Possible invented personal history' },
];

export function topicText(p: GeneratedTopicPayload): string {
  return [p.lead, ...p.paragraphs, ...p.bullets, p.takeaway ?? ''].join('\n');
}

export function validateEditorial(payload: GeneratedTopicPayload): ValidationIssue[] {
  const text = topicText(payload);
  const issues: ValidationIssue[] = [];
  for (const r of RULES) {
    const m = r.pattern.exec(text);
    if (m) issues.push({ severity: r.severity, code: r.code, message: `${r.message}: "${m[0]}"` });
  }
  // Intra-topic duplicated sentences.
  const seen = new Set<string>();
  for (const s of text.split(/(?<=[.!?])\s+/)) {
    const k = s.toLowerCase().replace(/[^a-z ]/g, '').trim();
    if (k.length > 40 && seen.has(k)) {
      issues.push({ severity: 'warning', code: 'REPEATED_SENTENCE', message: `Repeated: "${s.slice(0, 80)}"` });
    }
    seen.add(k);
  }
  return issues;
}

/** Cross-topic repetition: near-identical sentences used in more than one topic. */
export function findCrossTopicRepetition(payloads: GeneratedTopicPayload[]): Array<{ sentence: string; topics: string[] }> {
  const index = new Map<string, Set<string>>();
  for (const p of payloads) {
    for (const s of topicText(p).split(/(?<=[.!?])\s+/)) {
      const k = s.toLowerCase().replace(/[^a-z ]/g, '').replace(/\s+/g, ' ').trim();
      if (k.length < 60) continue;
      if (!index.has(k)) index.set(k, new Set());
      index.get(k)!.add(p.topicId);
    }
  }
  return [...index.entries()]
    .filter(([, t]) => t.size > 1)
    .map(([sentence, t]) => ({ sentence, topics: [...t] }));
}
