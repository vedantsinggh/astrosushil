import { AstroChart, ASTROLOGY_ENGINE_VERSION } from '../chart/astro-chart.types';
import { ChartCalculator } from '../chart/chart-calculator';
import { BirthDetails, LocalDateInput, LocalTimeInput } from '../input/birth-details';
import { AstrologyConfig, DEFAULT_ASTROLOGY_CONFIG } from '../configuration/astrology-config';
import { PlanetSymbol, MANDATORY_VEDIC_PLANETS } from '../planets/planet.types';
import { calculateCombustion } from '../planets/combustion';
import { PanchangCalculator } from '../panchang/panchang-calculator';
import { RASHIS } from '../zodiac/rashi';
import { getNakshatraByLongitude } from '../nakshatra/nakshatra';
import { normalizeDegree } from '../coordinates/angular-math';
import {
  PrashnaQuestionInput,
  PrashnaChart,
  PrashnaLagna,
  PrashnaPlanet,
  PrashnaHouse,
  PrashnaMoon,
  MoonAspectDetail,
  PrashnaTimeDetails,
  PrashnaNumberDetails,
  DEFAULT_PRASHNA_CONVENTION,
} from './prashna.types';
import { PrashnaNumberCalculator } from './prashna-number.calculator';
import { PrashnaSphutaCalculator } from './prashna-sphuta.calculator';

export class PrashnaCalculator {
  private readonly chartCalculator: ChartCalculator;
  private readonly panchangCalculator: PanchangCalculator;

  constructor(chartCalculator?: ChartCalculator, panchangCalculator?: PanchangCalculator) {
    this.chartCalculator = chartCalculator || new ChartCalculator();
    this.panchangCalculator = panchangCalculator || new PanchangCalculator();
  }

  /**
   * Deterministically calculates a complete Prashna (Horary) chart from explicit
   * question timestamp, timezone, location coordinates, and optional question number.
   */
  public async calculatePrashna(
    input: PrashnaQuestionInput,
    config: AstrologyConfig = DEFAULT_ASTROLOGY_CONFIG
  ): Promise<PrashnaChart> {
    // 1. Validate inputs
    if (!input.questionTimestamp) {
      throw new Error('questionTimestamp is required for Prashna calculation.');
    }
    const questionDate = new Date(input.questionTimestamp);
    if (isNaN(questionDate.getTime())) {
      throw new Error(`Invalid questionTimestamp: '${input.questionTimestamp}'`);
    }

    if (!input.location) {
      throw new Error('location is required for Prashna calculation.');
    }
    const { latitude, longitude, timezone } = input.location;
    if (typeof latitude !== 'number' || latitude < -90 || latitude > 90) {
      throw new Error(`Invalid latitude: ${latitude}. Must be between -90 and 90.`);
    }
    if (typeof longitude !== 'number' || longitude < -180 || longitude > 180) {
      throw new Error(`Invalid longitude: ${longitude}. Must be between -180 and 180.`);
    }
    if (!timezone) {
      throw new Error('timezone is required in location.');
    }

    // 2. Normalize question time
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hour12: false,
    }).formatToParts(questionDate);

    const partMap: Record<string, string> = {};
    for (const p of parts) {
      partMap[p.type] = p.value;
    }

    let hour = parseInt(partMap.hour || '0', 10);
    if (hour === 24) hour = 0;

    const dateInput: LocalDateInput = {
      year: parseInt(partMap.year, 10),
      month: parseInt(partMap.month, 10),
      day: parseInt(partMap.day, 10),
    };

    const timeInput: LocalTimeInput = {
      hour,
      minute: parseInt(partMap.minute || '0', 10),
      second: parseInt(partMap.second || '0', 10),
    };

    const birthDetails: BirthDetails = {
      date: dateInput,
      time: timeInput,
      latitude,
      longitude,
      timezone,
      placeName: input.location.placeName,
    };

    // Format local ISO string
    const pad = (n: number) => String(n).padStart(2, '0');
    const localIso = `${dateInput.year}-${pad(dateInput.month)}-${pad(dateInput.day)}T${pad(timeInput.hour)}:${pad(timeInput.minute)}:${pad(timeInput.second)}`;
    const julianDayUT = questionDate.getTime() / 86400000 + 2440587.5;

    const questionTime: PrashnaTimeDetails = {
      utcIso: questionDate.toISOString(),
      localIso,
      timezone,
      julianDayUT,
    };

    // 3. Compute underlying AstroChart for the exact Prashna instant
    const astroChart = await this.chartCalculator.calculateChart(birthDetails, config);
    if (!astroChart.ascendant) {
      throw new Error('Astronomical engine failed to produce Prashna Lagna.');
    }

    // 4. Structure Prashna Lagna
    const ascRashi = RASHIS[astroChart.ascendant.rashiIndex - 1];
    const ascNakshatra = getNakshatraByLongitude(astroChart.ascendant.longitude);
    const prashnaLagna: PrashnaLagna = {
      ...astroChart.ascendant,
      rashiName: ascRashi.sanskritName,
      nakshatraName: ascNakshatra.name,
      lord: ascRashi.ruler as PlanetSymbol,
    };

    // 5. Structure Prashna Planets (with house from Prashna Lagna and combustion status)
    const sunPos = astroChart.planets[PlanetSymbol.SUN];
    if (!sunPos) {
      throw new Error('Astronomical engine failed to produce Sun position.');
    }
    const sunLongitude = sunPos.longitude;

    const planetsResult: Partial<Record<PlanetSymbol, PrashnaPlanet>> = {};

    for (const sym of MANDATORY_VEDIC_PLANETS) {
      const pos = astroChart.planets[sym];
      if (!pos) continue;

      const house = ((pos.rashiIndex - prashnaLagna.rashiIndex + 12) % 12) + 1;
      const combustion = calculateCombustion(sym, pos.longitude, sunLongitude, pos.isRetrograde);

      planetsResult[sym] = {
        ...pos,
        house,
        isCombust: combustion.isCombust,
        combustionDetail: combustion,
      };
    }
    const typedPlanets = planetsResult as Record<PlanetSymbol, PrashnaPlanet>;

    // 6. Build 12 Whole Sign Houses from Prashna Lagna
    const houses: PrashnaHouse[] = [];
    for (let h = 1; h <= 12; h++) {
      const houseRashiIndex = ((prashnaLagna.rashiIndex - 1 + (h - 1)) % 12) + 1;
      const houseRashi = RASHIS[houseRashiIndex - 1];
      const startLongitude = (houseRashiIndex - 1) * 30;
      const endLongitude = houseRashiIndex * 30;

      const occupyingPlanets: PlanetSymbol[] = [];
      for (const sym of MANDATORY_VEDIC_PLANETS) {
        if (typedPlanets[sym]?.rashiIndex === houseRashiIndex) {
          occupyingPlanets.push(sym);
        }
      }

      houses.push({
        houseNumber: h,
        cuspLongitude: startLongitude,
        startLongitude,
        endLongitude,
        rashiIndex: houseRashiIndex,
        rashiName: houseRashi.sanskritName,
        sign: houseRashi.sanskritName,
        lord: houseRashi.ruler as PlanetSymbol,
        occupyingPlanets,
      });
    }

    // 7. Structure Prashna Moon (Chandra - Query Carrier)
    const moonPos = typedPlanets[PlanetSymbol.MOON];
    if (!moonPos) {
      throw new Error('Astronomical engine failed to produce Moon position.');
    }

    const moonDiffFromSun = normalizeDegree(moonPos.longitude - sunLongitude);
    const isWaxing = moonDiffFromSun < 180;
    const phaseName = isWaxing ? 'Shukla Paksha' : 'Krishna Paksha';

    // Planetary aspects received by the Moon
    const aspectsReceived: MoonAspectDetail[] = [];
    for (const sym of MANDATORY_VEDIC_PLANETS) {
      if (sym === PlanetSymbol.MOON) continue;
      const other = typedPlanets[sym];
      if (!other) continue;

      const diff = Math.abs(normalizeDegree(moonPos.longitude - other.longitude));
      const minAngle = Math.min(diff, 360 - diff);

      if (minAngle <= 10) {
        aspectsReceived.push({ aspectingPlanet: sym, aspectType: 'CONJUNCTION', angleDegrees: minAngle, orbDegrees: minAngle });
      } else if (Math.abs(minAngle - 180) <= 10) {
        aspectsReceived.push({ aspectingPlanet: sym, aspectType: 'OPPOSITION', angleDegrees: minAngle, orbDegrees: Math.abs(minAngle - 180) });
      } else if (Math.abs(minAngle - 120) <= 8) {
        aspectsReceived.push({ aspectingPlanet: sym, aspectType: 'TRINE', angleDegrees: minAngle, orbDegrees: Math.abs(minAngle - 120) });
      } else if (Math.abs(minAngle - 90) <= 8) {
        aspectsReceived.push({ aspectingPlanet: sym, aspectType: 'SQUARE', angleDegrees: minAngle, orbDegrees: Math.abs(minAngle - 90) });
      } else if (Math.abs(minAngle - 60) <= 6) {
        aspectsReceived.push({ aspectingPlanet: sym, aspectType: 'SEXTILE', angleDegrees: minAngle, orbDegrees: Math.abs(minAngle - 60) });
      }
    }

    const moon: PrashnaMoon = {
      longitude: moonPos.longitude,
      rashiIndex: moonPos.rashiIndex,
      rashiName: moonPos.rashiName,
      degreeInRashi: moonPos.degreeInRashi,
      house: moonPos.house,
      nakshatraIndex: moonPos.nakshatraIndex,
      nakshatraName: moonPos.nakshatraName,
      pada: moonPos.pada,
      nakshatraLord: moonPos.nakshatraLord,
      isWaxing,
      phaseName,
      aspectsReceived,
    };

    // 8. Instantaneous Panchanga Context & Rahu Kala
    const moonLongitude = moonPos.longitude;
    const panchanga = this.panchangCalculator.calculatePanchang(
      sunLongitude,
      moonLongitude,
      questionDate,
      { latitude, longitude }
    );

    let isRahuKala = false;
    if (panchanga.rahuKala) {
      const qTime = questionDate.getTime();
      const rStart = new Date(panchanga.rahuKala.startIso).getTime();
      const rEnd = new Date(panchanga.rahuKala.endIso).getTime();
      isRahuKala = qTime >= rStart && qTime <= rEnd;
    }

    // 9. Classical Prashna Sphutas (Gulika, Trisphuta, Chatusphuta, Panchasphuta)
    const sunriseIso = panchanga.sunriseSunset?.sunriseIso || new Date(questionDate.getTime() - 21600000).toISOString();
    const sunsetIso = panchanga.sunriseSunset?.sunsetIso || new Date(questionDate.getTime() + 21600000).toISOString();
    const dayIndex = panchanga.vara.dayIndex;
    const rahuPos = typedPlanets[PlanetSymbol.RAHU];
    const rahuLongitude = rahuPos ? rahuPos.longitude : 0;

    const sphutas = PrashnaSphutaCalculator.calculateAllSphutas(
      prashnaLagna.longitude,
      prashnaLagna.rashiIndex,
      moonLongitude,
      sunLongitude,
      rahuLongitude,
      questionDate,
      sunriseIso,
      sunsetIso,
      dayIndex,
      latitude,
      longitude
    );

    // 10. Optional Question Number (1-108 Parashari or 1-249 KP)
    let questionNumberDetails: PrashnaNumberDetails | undefined = undefined;
    if (typeof input.questionNumber === 'number') {
      questionNumberDetails = PrashnaNumberCalculator.calculate(
        input.questionNumber,
        prashnaLagna.rashiIndex,
        input.questionNumberSystem || 'AUTO'
      );
    }

    return {
      calculationVersion: ASTROLOGY_ENGINE_VERSION,
      convention: DEFAULT_PRASHNA_CONVENTION,
      questionTime,
      location: input.location,
      questionText: input.questionText,
      prashnaLagna,
      planets: typedPlanets,
      houses,
      moon,
      sphutas,
      questionNumberDetails,
      panchanga,
      isRahuKala,
      astroChart,
    };
  }
}
