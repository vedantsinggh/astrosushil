import { normalizeDegree } from '../coordinates/angular-math';
import { getNakshatraByLongitude, getPada } from '../nakshatra/nakshatra';
import { PlanetSymbol } from '../planets/planet.types';
import {
  PanchangOutput,
  TithiDetails,
  VaraDetails,
  YogaDetails,
  KaranaDetails,
  Paksha,
} from './panchang.types';

export const TITHI_NAMES = [
  'Pratipada',
  'Dwitiya',
  'Tritiya',
  'Chaturthi',
  'Panchami',
  'Shashthi',
  'Saptami',
  'Ashtami',
  'Navami',
  'Dashami',
  'Ekadashi',
  'Dwadashi',
  'Trayodashi',
  'Chaturdashi',
  'Purnima / Amavasya',
];

export const YOGA_NAMES = [
  'Vishkambha',
  'Priti',
  'Ayushman',
  'Saubhagya',
  'Shobhana',
  'Atiganda',
  'Sukarma',
  'Dhriti',
  'Shoola',
  'Ganda',
  'Vriddhi',
  'Dhruva',
  'Vyaghata',
  'Harshana',
  'Vajra',
  'Siddhi',
  'Vyatipata',
  'Variyan',
  'Parigha',
  'Shiva',
  'Siddha',
  'Sadhya',
  'Shubha',
  'Shukla',
  'Brahma',
  'Indra',
  'Vaidhriti',
];

export const VARA_LORDS: { name: string; lord: PlanetSymbol }[] = [
  { name: 'Ravivara', lord: PlanetSymbol.SUN },
  { name: 'Somavara', lord: PlanetSymbol.MOON },
  { name: 'Mangalavara', lord: PlanetSymbol.MARS },
  { name: 'Budhavara', lord: PlanetSymbol.MERCURY },
  { name: 'Guruvara', lord: PlanetSymbol.JUPITER },
  { name: 'Shukravara', lord: PlanetSymbol.VENUS },
  { name: 'Shanivara', lord: PlanetSymbol.SATURN },
];

export const REPEATING_KARANAS = [
  'Bava',
  'Balava',
  'Kaulava',
  'Taitila',
  'Gara',
  'Vanija',
  'Vishti (Bhadra)',
];

export class PanchangCalculator {
  /**
   * Calculates Panchang elements given Sun longitude, Moon longitude, and birth date.
   */
  public calculatePanchang(
    sunLongitude: number,
    moonLongitude: number,
    birthDateUtc: Date
  ): PanchangOutput {
    const sunNorm = normalizeDegree(sunLongitude);
    const moonNorm = normalizeDegree(moonLongitude);

    // 1. Tithi
    const tithiDiff = normalizeDegree(moonNorm - sunNorm);
    const tithiIndex = Math.floor(tithiDiff / 12) + 1; // 1 to 30
    const paksha: Paksha = tithiIndex <= 15 ? 'SUKLA' : 'KRISHNA';

    let tithiNameIndex = (tithiIndex - 1) % 15;
    let tithiName = TITHI_NAMES[tithiNameIndex];
    if (tithiIndex === 15) tithiName = 'Purnima';
    if (tithiIndex === 30) tithiName = 'Amavasya';

    const degreeInTithi = tithiDiff % 12;
    const completionPercentage = (degreeInTithi / 12) * 100;

    const tithi: TithiDetails = {
      index: tithiIndex,
      name: tithiName,
      paksha,
      degreeInTithi,
      completionPercentage,
    };

    // 2. Vara (Weekday from UTC date)
    const dayOfWeek = birthDateUtc.getUTCDay(); // 0 = Sunday
    const varaInfo = VARA_LORDS[dayOfWeek];
    const vara: VaraDetails = {
      dayIndex: dayOfWeek,
      name: varaInfo.name,
      lord: varaInfo.lord,
    };

    // 3. Nakshatra
    const nakshatraDef = getNakshatraByLongitude(moonNorm);
    const pada = getPada(moonNorm);
    const nakshatra = {
      index: nakshatraDef.index,
      name: nakshatraDef.name,
      lord: nakshatraDef.lord,
      pada,
    };

    // 4. Yoga
    const yogaSum = normalizeDegree(sunNorm + moonNorm);
    const yogaSpan = 360 / 27; // 13.333333333333334
    const yogaIndex = Math.floor(yogaSum / yogaSpan) + 1;
    const yogaDegree = yogaSum % yogaSpan;
    const yogaCompletion = (yogaDegree / yogaSpan) * 100;

    const yoga: YogaDetails = {
      index: yogaIndex,
      name: YOGA_NAMES[yogaIndex - 1],
      completionPercentage: yogaCompletion,
    };

    // 5. Karana (Half-tithi, 6 degrees each)
    const karanaIndex = Math.floor(tithiDiff / 6) + 1; // 1 to 60
    let karanaName = '';
    let karanaType: 'MOVABLE' | 'FIXED' = 'MOVABLE';

    if (karanaIndex === 1) {
      karanaName = 'Kinstughna';
      karanaType = 'FIXED';
    } else if (karanaIndex >= 57) {
      if (karanaIndex === 57) karanaName = 'Shakuni';
      if (karanaIndex === 58) karanaName = 'Chatuspada';
      if (karanaIndex === 59) karanaName = 'Naga';
      if (karanaIndex === 60) karanaName = 'Kinstughna';
      karanaType = 'FIXED';
    } else {
      const repIndex = (karanaIndex - 2) % 7;
      karanaName = REPEATING_KARANAS[repIndex];
    }

    const karana: KaranaDetails = {
      index: karanaIndex,
      name: karanaName,
      type: karanaType,
    };

    return {
      tithi,
      vara,
      nakshatra,
      yoga,
      karana,
    };
  }
}
