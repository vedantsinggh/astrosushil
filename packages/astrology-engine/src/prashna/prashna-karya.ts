import { PlanetSymbol, PlanetPosition } from '../planets/planet.types';
import { RASHIS } from '../zodiac/rashi';
import { TajikaYogasCalculator, isTajikaAspect } from '../varshaphala/tajika-yogas-calculator';
import { TajikaYoga } from '../varshaphala/varshaphala.types';

/**
 * Prashna Karya Bhava (house of the matter asked) and Karya lord.
 * Decision log PRS-001..PRS-004. The question domain is mapped to the house that signifies it
 * (BPHS ch. 11 bhava significations, as used for Karya Bhava in Prashna Marga and Tajika
 * Prashna); the Karya lord is the Whole Sign lord of that house counted from the Prashna Lagna.
 * The engine reports facts only (lords, their houses and Tajika aspect yogas between them).
 */
export const PRASHNA_DOMAIN_HOUSES = {
  SELF: 1,
  HEALTH: 1,
  WEALTH: 2,
  FAMILY: 2,
  SIBLINGS: 3,
  COMMUNICATION: 3,
  SHORT_JOURNEY: 3,
  MOTHER: 4,
  PROPERTY: 4,
  VEHICLE: 4,
  EDUCATION: 5,
  CHILDREN: 5,
  DISEASE: 6,
  ENEMIES: 6,
  LITIGATION: 6,
  DEBT: 6,
  MARRIAGE: 7,
  PARTNERSHIP: 7,
  LONGEVITY: 8,
  FATHER: 9,
  LONG_JOURNEY: 9,
  CAREER: 10,
  GAINS: 11,
  EXPENSES: 12,
  FOREIGN_RESIDENCE: 12,
} as const;

export type PrashnaQuestionDomain = keyof typeof PRASHNA_DOMAIN_HOUSES;
export const PRASHNA_QUESTION_DOMAINS = Object.keys(PRASHNA_DOMAIN_HOUSES) as PrashnaQuestionDomain[];

export interface PrashnaKaryaAnalysis {
  questionDomain: PrashnaQuestionDomain;
  karyaHouseNumber: number;
  karyaHouseSignIndex: number;
  karyaHouseSignName: string;
  lagnaLord: PlanetSymbol;
  lagnaLordHouse: number;
  karyaLord: PlanetSymbol;
  karyaLordHouse: number;
  isSameLord: boolean;
  /** Sign-based Tajika aspect (1/3/4/5/7/9/10/11 apart) between the Lagna lord and Karya lord. */
  lordsInTajikaAspect: boolean;
  /** Tajika yogas (Ithasala, Isarpha, ...) formed between the Lagna lord and the Karya lord. */
  tajikaYogasBetweenLords: TajikaYoga[];
  methodology: string;
}

export function evaluatePrashnaKarya(
  questionDomain: PrashnaQuestionDomain,
  lagnaRashiIndex: number,
  planets: Record<PlanetSymbol, PlanetPosition & { house?: number }>
): PrashnaKaryaAnalysis {
  const karyaHouseNumber = PRASHNA_DOMAIN_HOUSES[questionDomain];
  const karyaSign = ((lagnaRashiIndex - 1 + karyaHouseNumber - 1) % 12) + 1;
  const lagnaLord = RASHIS[lagnaRashiIndex - 1].ruler as PlanetSymbol;
  const karyaLord = RASHIS[karyaSign - 1].ruler as PlanetSymbol;
  const houseOf = (p: PlanetSymbol): number => {
    const pos = planets[p];
    if (pos && typeof pos.house === 'number') return pos.house;
    return pos ? ((pos.rashiIndex - lagnaRashiIndex + 12) % 12) + 1 : 0;
  };

  const isSameLord = lagnaLord === karyaLord;
  const llSign = planets[lagnaLord]?.rashiIndex;
  const klSign = planets[karyaLord]?.rashiIndex;
  const lordsInTajikaAspect = !isSameLord && !!llSign && !!klSign && isTajikaAspect(llSign, klSign);

  const tajikaYogasBetweenLords = isSameLord
    ? []
    : new TajikaYogasCalculator()
        .evaluateTajikaYogas(planets)
        .filter(
          (y) =>
            (y.planet1 === lagnaLord && y.planet2 === karyaLord) ||
            (y.planet1 === karyaLord && y.planet2 === lagnaLord)
        );

  return {
    questionDomain,
    karyaHouseNumber,
    karyaHouseSignIndex: karyaSign,
    karyaHouseSignName: RASHIS[karyaSign - 1].sanskritName,
    lagnaLord,
    lagnaLordHouse: houseOf(lagnaLord),
    karyaLord,
    karyaLordHouse: houseOf(karyaLord),
    isSameLord,
    lordsInTajikaAspect,
    tajikaYogasBetweenLords,
    methodology:
      'Karya Bhava = house signifying the question domain (BPHS ch. 11), counted as a Whole Sign house from the Prashna Lagna; Karya lord = its sign lord. Tajika yogas use the engine Tajika calculator (Tajika Neelakanthi deeptamshas).',
  };
}
