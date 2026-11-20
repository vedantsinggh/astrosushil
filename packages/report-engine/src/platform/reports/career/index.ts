/**
 * Career Report module (reportType CAREER).
 * Definition, deterministic blocks, extra calculations (`extend`) and the
 * `career.*` evidence they contribute. See career.definition.ts for coverage.
 *
 * Interpretation layer: the module contributes the shared `fact.*` items
 * (platform/interpretation/facts.ts) and, once prediction-engine exports the career rule pack
 * (`CAREER_INTERPRETATION_PACK`, Agent A4), declares it so the orchestrator registers the
 * `interp.career.*` results that the opted-in topics narrate.
 */
import * as PredictionEngine from '@astro/prediction-engine';
import type { InterpretationPack } from '@astro/prediction-engine';
import { contributeInterpretationFacts, NodeTransitNow } from '../../interpretation/facts';
import { buildInterpretationExtras, InterpretationExtras } from '../../interpretation/register';
import { ReportModule } from '../../module';
import { CAREER_BLOCKS } from './career.blocks';
import { CAREER_DEFINITION } from './career.definition';
import { contributeCareerEvidence } from './career.evidence';
import { careerExt, computeCareer } from './calc/career-calc';

/** Export name of the career pack in @astro/prediction-engine (looked up at runtime until it lands). */
export const CAREER_PACK_EXPORT = 'CAREER_INTERPRETATION_PACK';

function careerPack(): InterpretationPack | undefined {
  const pack = (PredictionEngine as unknown as Record<string, unknown>)[CAREER_PACK_EXPORT];
  const runner = (PredictionEngine as unknown as Record<string, unknown>).runInterpretation;
  const ok = typeof runner === 'function' && !!pack && typeof pack === 'object' && 'topics' in pack && 'rules' in pack;
  return ok ? (pack as InterpretationPack) : undefined;
}

const pack = careerPack();

export const CAREER_MODULE: ReportModule = {
  definition: CAREER_DEFINITION,
  blocks: CAREER_BLOCKS,
  extend: async ({ snapshot }) => {
    const career = await computeCareer(snapshot);
    // Interpretation inputs (Shadbala, Sade Sati, birth-time sensitivity, formed-but-cancelled yogas):
    // computed once here, read by the fact contributor and by the orchestrator's interpretation run.
    const interpretationExtras = await buildInterpretationExtras(snapshot, { transitYears: CAREER_DEFINITION.requires.transitYears });
    for (const y of interpretationExtras.yogas ?? []) {
      if (y.isDetected || !y.assessment?.cancelled) continue;
      career.allYogas.push({
        id: y.id, evidenceId: `yoga.${y.id.replace(/^YOGA_/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`,
        name: `${y.canonicalName} (formed and cancelled)`, category: y.category, relevant: false,
        conditions: y.assessment.cancellations.filter((c) => c.satisfied).map((c) => `${c.description}: ${c.observed}`),
      });
    }
    return { career, interpretationExtras };
  },
  evidence: (add, { snapshot, ext }) => {
    const c = careerExt(ext);
    contributeCareerEvidence(add, snapshot, c);
    const nodeTransits: NodeTransitNow[] = c.transits
      .filter((t): t is typeof t & { planet: 'Rahu' | 'Ketu' } => t.planet === 'Rahu' || t.planet === 'Ketu')
      .map((t) => ({ planet: t.planet, sign: t.current.sign, signIndex: t.current.signIndex }));
    const extras = ext.interpretationExtras as InterpretationExtras | undefined;
    contributeInterpretationFacts(add, snapshot, { nodeTransits, sadeSati: extras?.sadeSati, yogas: extras?.yogas });
  },
  ...(pack ? { interpretation: { pack } } : {}),
  status: 'implemented-partially-validated',
  statusEvidence: 'Offline E2E + PDF QA pass for synthetic subjects (2026-11-18); real-LLM run pending.',
};
