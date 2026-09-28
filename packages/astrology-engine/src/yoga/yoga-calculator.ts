import { AstroChart } from '../chart/astro-chart.types';
import {
  YogaEvaluationOptions,
  YogaEvaluationReport,
  YogaResult,
} from './yoga.types';
import { YogaContextBuilder } from './yoga-context';
import { YogaRegistry } from './yoga-registry';

export class YogaCalculator {
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
    const context = YogaContextBuilder.buildContext(chart, varga);

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
              allResults.push(res);
            }
          }
        }
      }
    }

    const detectedYogas = allResults.filter((r) => r.isDetected);
    const undetectedYogas = allResults.filter((r) => !r.isDetected);

    return {
      calculationVersion: YogaCalculator.VERSION,
      varga,
      totalEvaluated: allResults.length,
      detectedCount: detectedYogas.length,
      detectedYogas,
      undetectedYogas: options.includeUndetected ? undetectedYogas : undefined,
    };
  }
}

