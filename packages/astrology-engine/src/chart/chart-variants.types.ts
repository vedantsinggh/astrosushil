import { NormalizedChart } from './normalized-chart.types';

export type ChartVariantType =
  | 'RASHI'
  | 'SUN_CHART'
  | 'MOON_CHART'
  | 'KARAKAMSHA_CHART'
  | 'SUNRISE_CHART'
  | 'BHAVA_EQUAL'
  | 'BHAVA_SRIPATI';

export interface ChartVariantSummary {
  variantType: ChartVariantType;
  title: string;
  sanskritTitle: string;
  referenceSignIndex: number;
  referenceSignName: string;
  referenceLongitude: number;
  chart: NormalizedChart;
}

export interface ChartVariantsCollection {
  rashi: ChartVariantSummary;
  sunChart: ChartVariantSummary;
  moonChart: ChartVariantSummary;
  karakamshaChart: ChartVariantSummary;
  sunriseChart: ChartVariantSummary;
  bhavaEqual: ChartVariantSummary;
  bhavaSripati: ChartVariantSummary;
}
