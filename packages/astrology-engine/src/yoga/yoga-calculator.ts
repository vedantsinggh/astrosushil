import { AstroChart } from '../chart/astro-chart.types';
import {
  YogaEvaluationOptions,
  YogaEvaluationReport,
  YogaResult,
} from './yoga.types';
import { YogaContextBuilder, YogaContextExtras } from './yoga-context';
import { ensureAssessment } from './yoga-assessment';
import { ShadbalaCalculator } from '../strength/shadbala-calculator';
import { PlanetSymbol } from '../planets/planet.types';
import { YogaRegistry } from './yoga-registry';

export class YogaCalculator {
  // Kept at 0.1.0: consumers (apps/api tests, API clients) pin this value. The 2026-11 fixes are
  // identified by the presence of `YogaResult.assessment`.
  public static readonly VERSION = '0.1.0';

  public calculateYogas(chart: any, options: any = {}): any {
    return this.evaluateYogas(chart, options);
  }

  /**
   * Evaluates all registered classical Yogas for a given AstroChart and options.
   */
  public evaluateYogas(
    chart: AstroChart,
    options: YogaEvaluationOptions = {}
  ): YogaEvaluationReport {
    const varga = options.varga || 'D1';
    const context = YogaContextBuilder.buildContext(chart, varga, {
      shadbala: resolveShadbala(chart, varga, options),
    });

    const evaluators = YogaRegistry.getCategoryEvaluators(options.categories);
    const allResults: YogaResult[] = [];
    const seenYogaIds = new Set<string>();

    for (const entry of evaluators) {
      const results = entry.evaluator(context);
      for (const res of results) {
        if (!seenYogaIds.has(res.id)) {
          seenYogaIds.add(res.id);
          // If specific yogaIds filter provided, filter accordingly
          if (!options.yogaIds || options.yogaIds.includes(res.id)) {
            // Also filter by categories if specified
            if (!options.categories || options.categories.includes(res.category)) {
              allResults.push(ensureAssessment(context, res));
            }
          }
        }
      }
    }

    const detectedYogas = allResults.filter((r) => r.isDetected);
    const undetectedYogas = allResults.filter((r) => !r.isDetected);
    const formedButCancelledYogas = undetectedYogas.filter(
      (r) => r.assessment?.formed === true && r.assessment.cancelled === true
    );

    return {
      calculationVersion: YogaCalculator.VERSION,
      varga,
      totalEvaluated: allResults.length,
      detectedCount: detectedYogas.length,
      detectedYogas,
      undetectedYogas: options.includeUndetected ? undetectedYogas : undefined,
      formedButCancelledYogas,
    };
  }
}

/**
 * Shadbala facts for planet factors: caller-supplied ratios win; otherwise, when
 * `computeShadbala` is set and the evaluation is D1, the engine ShadbalaCalculator is run.
 */
function resolveShadbala(
  chart: AstroChart,
  varga: string,
  options: YogaEvaluationOptions
): YogaContextExtras['shadbala'] {
  if (options.shadbalaRatios) {
    const out: NonNullable<YogaContextExtras['shadbala']> = {};
    for (const [p, ratio] of Object.entries(options.shadbalaRatios)) {
      if (typeof ratio === 'number') out[p as PlanetSymbol] = { ratio };
    }
    return out;
  }
  if (!options.computeShadbala || varga !== 'D1') return undefined;
  const report = new ShadbalaCalculator().calculate(chart);
  const out: NonNullable<YogaContextExtras['shadbala']> = {};
  for (const p of Object.values(report.planets)) {
    if (!p) continue;
    out[p.planet] = {
      ratio: Number(p.ratio.toFixed(4)),
      totalRupas: Number(p.totalRupas.toFixed(4)),
      requiredRupas: p.minimumRequirementRupas,
    };
  }
  return out;
}
