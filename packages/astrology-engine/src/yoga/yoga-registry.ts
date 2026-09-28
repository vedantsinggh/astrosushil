import { YogaCategory, YogaDefinition } from './yoga.types';
import { evaluateMahapurushaYogas } from './evaluators/mahapurusha.evaluator';
import { evaluateChandraYogas } from './evaluators/chandra.evaluator';
import { evaluateSuryaYogas } from './evaluators/surya.evaluator';
import { evaluateNeechaBhangaYogas } from './evaluators/neecha-bhanga.evaluator';
import { evaluateParivartanaYogas } from './evaluators/parivartana.evaluator';
import { evaluateViparitaYogas } from './evaluators/viparita.evaluator';
import { evaluateRajaAndDhanaYogas } from './evaluators/raja-dhana.evaluator';
import { evaluateNabhasaYogas } from './evaluators/nabhasa.evaluator';

export type CategoryEvaluatorFn = typeof evaluateMahapurushaYogas;

export interface CategoryRegistryEntry {
  category: YogaCategory;
  evaluator: CategoryEvaluatorFn;
  description: string;
}

export class YogaRegistry {
  private static readonly CATEGORY_REGISTRY: CategoryRegistryEntry[] = [
    {
      category: 'MAHAPURUSHA',
      evaluator: evaluateMahapurushaYogas,
      description: 'Pancha Mahapurusha Yogas (Ruchaka, Bhadra, Hamsa, Malavya, Shasha)',
    },
    {
      category: 'CHANDRA',
      evaluator: evaluateChandraYogas,
      description: 'Moon-relative Yogas (Gajakesari, Sunapha, Anapha, Durudhara, Kemadruma, Chandradhi, Chandra-Mangala, Amala)',
    },
    {
      category: 'SURYA',
      evaluator: evaluateSuryaYogas,
      description: 'Sun-relative Yogas (Budha-Aditya, Vesi, Vosi, Ubhayachari)',
    },
    {
      category: 'NEICHA_BHANGA' as any,
      evaluator: evaluateNeechaBhangaYogas,
      description: 'Debilitation cancellation & Neecha Bhanga Raja Yogas',
    },
    {
      category: 'NEECHA_BHANGA',
      evaluator: evaluateNeechaBhangaYogas,
      description: 'Debilitation cancellation & Neecha Bhanga Raja Yogas',
    },
    {
      category: 'PARIVARTANA',
      evaluator: evaluateParivartanaYogas,
      description: 'Planetary sign exchange Yogas (Maha, Dainya, Khala)',
    },
    {
      category: 'VIPARITA',
      evaluator: evaluateViparitaYogas,
      description: 'Viparita Raja Yogas (Harsha, Sarala, Vimala)',
    },
    {
      category: 'RAJA',
      evaluator: evaluateRajaAndDhanaYogas,
      description: 'Kendra-Trikona Lord Raja Yogas and Dharma-Karmadhipati',
    },
    {
      category: 'DHANA',
      evaluator: evaluateRajaAndDhanaYogas,
      description: 'Wealth combinations involving houses 1, 2, 5, 9, 11',
    },
    {
      category: 'AUSPICIOUS',
      evaluator: evaluateRajaAndDhanaYogas,
      description: 'Classical auspicious combinations (Lakshmi, Saraswati)',
    },
    {
      category: 'NABHASA',
      evaluator: evaluateNabhasaYogas,
      description: 'Planetary distribution Yogas (Ashraya, Akriti, Sankhya)',
    },
  ];

  public static getCategoryEvaluators(categories?: YogaCategory[]): CategoryRegistryEntry[] {
    if (!categories || categories.length === 0) {
      // Return distinct evaluators
      const seen = new Set<CategoryEvaluatorFn>();
      const result: CategoryRegistryEntry[] = [];
      for (const entry of this.CATEGORY_REGISTRY) {
        if (!seen.has(entry.evaluator)) {
          seen.add(entry.evaluator);
          result.push(entry);
        }
      }
      return result;
    }

    const selectedCategories = new Set(categories);
    const seen = new Set<CategoryEvaluatorFn>();
    const result: CategoryRegistryEntry[] = [];

    for (const entry of this.CATEGORY_REGISTRY) {
      if (selectedCategories.has(entry.category) && !seen.has(entry.evaluator)) {
        seen.add(entry.evaluator);
        result.push(entry);
      }
    }

    return result;
  }
}

export const defaultYogaRegistry = YogaRegistry;

