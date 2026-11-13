import { AstroChart, ASTROLOGY_ENGINE_VERSION } from '../chart/astro-chart.types';
import { ChartCalculator } from '../chart/chart-calculator';
import { BirthDetails, LocalDateInput, LocalTimeInput } from '../input/birth-details';
import { AstrologyConfig, DEFAULT_ASTROLOGY_CONFIG } from '../configuration/astrology-config';
import { PlanetSymbol, MANDATORY_VEDIC_PLANETS } from '../planets/planet.types';
import { calculateCombustion } from '../planets/combustion';
import { SolarReturnSolver } from './solar-return.solver';
import { MunthaCalculator } from './muntha-calculator';
import { HarshaBalaCalculator } from './harsha-bala-calculator';
import { PanchadhikariCalculator } from './panchadhikari-calculator';
import { TajikaYogasCalculator } from './tajika-yogas-calculator';
import { SahamsCalculator } from './sahams-calculator';
import { MuddaDashaCalculator } from './mudda-dasha-calculator';
import { PanchangCalculator } from '../panchang/panchang-calculator';
import { RASHIS } from '../zodiac/rashi';
import { getNakshatraByLongitude } from '../nakshatra/nakshatra';
import { CalculatedPoint } from '../houses/house.types';
import {
  VarshaphalaCalculationOptions,
  VarshaphalaChart,
  VarshaLagna,
  AnnualPlanet,
  AnnualHouse,
  MunthaDetails,
  PanchadhikariDetails,
  VarsheshaDetails,
  DEFAULT_VARSHAPHALA_CONVENTION,
} from './varshaphala.types';

export class VarshaphalaCalculator {
  private readonly chartCalculator: ChartCalculator;
  private readonly panchangCalculator: PanchangCalculator;

  constructor(chartCalculator?: ChartCalculator, panchangCalculator?: PanchangCalculator) {
    this.chartCalculator = chartCalculator || new ChartCalculator();
    this.panchangCalculator = panchangCalculator || new PanchangCalculator();
  }

  /**
   * Calculates the full deterministic Varshaphala (Annual Solar Return) chart and analysis.
   */
  public async calculateVarshaphala(
    natalBirthDetails: BirthDetails,
    options: VarshaphalaCalculationOptions,
    config: AstrologyConfig = DEFAULT_ASTROLOGY_CONFIG
  ): Promise<VarshaphalaChart> {
    const isUntimed = Boolean(options.isTimeUnknown);
    let natalSunLongitude: number;
    let natalChart: AstroChart | undefined;

    // 1. Establish natal Sun longitude, Natal Lagna, and input provenance
    let provenance = options.natalSunProvenance;

    if (isUntimed) {
      if (options.natalSunLongitude !== undefined) {
        natalSunLongitude = options.natalSunLongitude;

        // If no provenance supplied, default to verified established input
        if (!provenance) {
          provenance = {
            source: 'INDEPENDENTLY_ESTABLISHED_LONGITUDE',
            ayanamsa: config.ayanamsa || 'LAHIRI',
            coordinateConvention: 'GEOCENTRIC_SIDEREAL_ECLIPTIC',
            uncertaintyDegrees: 0.0001,
            timestampUncertaintyHours: 0.0024, // ~8.6 seconds
            isSufficientlyPrecise: true,
          };
        } else {
          // Sun's apparent diurnal motion is ~0.9856°/day (~0.04107°/hour).
          // Timestamp uncertainty (hours) = uncertaintyDegrees / 0.04107.
          // Because the Ascendant's rate of ascension varies with geographic latitude and zodiacal sign
          // (signs of long vs. short ascension), any timestamp uncertainty translates into significant,
          // location-dependent Ascendant and house cusp displacement.
          const hoursUncertainty = provenance.uncertaintyDegrees / 0.04107;
          provenance.timestampUncertaintyHours = hoursUncertainty;
          provenance.isSufficientlyPrecise = provenance.uncertaintyDegrees <= 0.01;

          if (!provenance.isSufficientlyPrecise) {
            throw new Error(
              `Untimed solar return cannot be reliably established: natal Sun longitude uncertainty (±${provenance.uncertaintyDegrees.toFixed(4)}°) exceeds maximum allowable precision threshold (±0.0100°). Approximate longitudes cannot support exact annual charts or Mudda timing schedules.`
            );
          }
        }
      } else {
        throw new Error(
          'Cannot calculate Solar Return for untimed birth profile without an established natal Sun longitude. Date-only birth records cannot establish an exact solar-return instant.'
        );
      }
    } else {
      natalChart = await this.chartCalculator.calculateChart(natalBirthDetails, config);
      if (!natalChart.ascendant) {
        throw new Error('Natal chart calculation failed to produce Ascendant.');
      }
      natalSunLongitude = options.natalSunLongitude ?? natalChart.planets[PlanetSymbol.SUN].longitude;
      provenance = {
        source: 'RECORDED_BIRTH_TIME_EPHEMERIS',
        ayanamsa: config.ayanamsa || 'LAHIRI',
        coordinateConvention: 'GEOCENTRIC_SIDEREAL_ECLIPTIC',
        uncertaintyDegrees: 0.00001,
        timestampUncertaintyHours: 0.00024,
        isSufficientlyPrecise: true,
      };
    }

    // 2. Solve for exact Solar Return timestamp (Astronomical Sidereal Solar Return)
    const ephemerisProvider = (this.chartCalculator as any).ephemerisProvider;
    const solarReturn = await SolarReturnSolver.solveForBirthDetails(
      natalSunLongitude,
      natalBirthDetails,
      options.targetYear,
      options.annualLocation,
      ephemerisProvider
    );
    solarReturn.provenance = provenance;

    // Also solve for the next consecutive Solar Return to determine the exact annual cycle length
    const nextSolarReturn = await SolarReturnSolver.solveForBirthDetails(
      natalSunLongitude,
      natalBirthDetails,
      options.targetYear + 1,
      options.annualLocation,
      ephemerisProvider
    );
    nextSolarReturn.provenance = provenance;

    // 3. Build BirthDetails for the exact Solar Return event at the annual location
    const returnUtcDate = new Date(solarReturn.solarReturnUtcIso);
    const nextReturnUtcDate = new Date(nextSolarReturn.solarReturnUtcIso);
    const actualCycleDays = (nextReturnUtcDate.getTime() - returnUtcDate.getTime()) / (1000 * 60 * 60 * 24);

    // Format solar return date/time in the target annual timezone
    const timezone = solarReturn.timezone;
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      fractionalSecondDigits: 3,
      hour12: false,
    }).formatToParts(returnUtcDate);

    const partMap: Record<string, string> = {};
    for (const p of parts) {
      partMap[p.type] = p.value;
    }

    let hour = parseInt(partMap.hour || '0', 10);
    if (hour === 24) hour = 0; // Fix standard 24-hour display edge cases

    const annualDate: LocalDateInput = {
      year: parseInt(partMap.year, 10),
      month: parseInt(partMap.month, 10),
      day: parseInt(partMap.day, 10),
    };

    const annualTime: LocalTimeInput = {
      hour,
      minute: parseInt(partMap.minute || '0', 10),
      second: parseInt(partMap.second || '0', 10),
    };

    const annualBirthDetails: BirthDetails = {
      date: annualDate,
      time: annualTime,
      latitude: solarReturn.annualLocation.latitude,
      longitude: solarReturn.annualLocation.longitude,
      timezone: solarReturn.annualLocation.timezone,
      placeName: solarReturn.annualLocation.placeName,
    };

    // 4. Calculate Annual Chart at the exact Solar Return instant
    const annualChart = await this.chartCalculator.calculateChart(annualBirthDetails, config);

    // 5. Structure Varsha Lagna & Natal Lagna
    // Varsha Lagna is derived strictly from the exact Solar Return instant and annual location coordinates.
    // Even if natal birth time is unknown, the Solar Return moment is an exact astronomical instant,
    // so Varsha Lagna is deterministically calculable and valid!
    if (!annualChart.ascendant) {
      throw new Error('Annual chart calculation failed to produce Varsha Ascendant.');
    }

    const ascRashi = RASHIS[annualChart.ascendant.rashiIndex - 1];
    const ascNakshatra = getNakshatraByLongitude(annualChart.ascendant.longitude);
    const varshaLagna: VarshaLagna = {
      ...annualChart.ascendant,
      rashiName: ascRashi.sanskritName,
      nakshatraName: ascNakshatra.name,
      lord: ascRashi.ruler as PlanetSymbol,
    };

    let natalLagna: CalculatedPoint;
    if (isUntimed || !natalChart?.ascendant) {
      natalLagna = {
        name: 'Ascendant',
        longitude: 0,
        degreeInRashi: 0,
        rashiIndex: 0,
        isIndeterminate: true,
      } as any;
    } else {
      natalLagna = natalChart.ascendant;
    }

    // 6. Construct structured AnnualPlanet records with house and combustion
    const annualSunLongitude = annualChart.planets[PlanetSymbol.SUN].longitude;
    const annualPlanets: Partial<Record<PlanetSymbol, AnnualPlanet>> = {};

    for (const sym of MANDATORY_VEDIC_PLANETS) {
      const pos = annualChart.planets[sym];
      if (!pos) continue;

      const house = (((pos.rashiIndex - annualChart.ascendant.rashiIndex + 12) % 12) + 1);
      const combustion = calculateCombustion(
        sym,
        pos.longitude,
        annualSunLongitude,
        pos.isRetrograde
      );

      annualPlanets[sym] = {
        ...pos,
        house,
        isCombust: combustion.isCombust,
        combustionDetail: combustion,
      };
    }

    const typedAnnualPlanets = annualPlanets as Record<PlanetSymbol, AnnualPlanet>;

    // 7. Construct structured AnnualHouse records with lord and occupying planets
    const annualHouses: AnnualHouse[] = [];
    for (let h = 1; h <= 12; h++) {
      const housePlacement = annualChart.houses?.[h - 1];
      const houseRashiIndex = ((annualChart.ascendant.rashiIndex - 1 + (h - 1)) % 12) + 1;
      const houseRashiDef = RASHIS[houseRashiIndex - 1];
      const occupyingPlanets = MANDATORY_VEDIC_PLANETS.filter(
        (sym) => typedAnnualPlanets[sym]?.house === h
      );

      annualHouses.push({
        houseNumber: h,
        cuspLongitude: housePlacement?.cuspLongitude ?? (houseRashiIndex - 1) * 30,
        startLongitude: housePlacement?.startLongitude ?? (houseRashiIndex - 1) * 30,
        endLongitude: housePlacement?.endLongitude ?? houseRashiIndex * 30,
        rashiIndex: houseRashiIndex,
        rashiName: houseRashiDef.sanskritName,
        sign: houseRashiDef.sanskritName,
        lord: houseRashiDef.ruler as PlanetSymbol,
        occupyingPlanets,
      });
    }

    // 8. Calculate Muntha
    let muntha: MunthaDetails;
    if (isUntimed || !natalChart?.ascendant) {
      muntha = {
        rashiIndex: 0,
        rashiName: 'Indeterminate',
        longitude: 0,
        degreeInRashi: 0,
        lord: '' as any,
        houseInVarshaChart: 0,
        houseInNatalChart: 0,
        progressionYears: solarReturn.age,
        progressionIndex: solarReturn.age % 12,
        isIndeterminate: true,
      };
    } else {
      const birthYear = natalBirthDetails.date.year;
      muntha = MunthaCalculator.calculate(
        natalChart.ascendant,
        options.targetYear,
        birthYear,
        annualChart
      );
    }

    // 9. Calculate Harsha Bala (Tajika 4-fold joy strength) & Harsha Yogas
    // Annual chart ascendant and houses are always available from the exact solar return instant
    const { scores: harshaBala, yogas: harshaYogas } = HarshaBalaCalculator.calculateAll(annualChart);

    // 10. Calculate Panchadhikari & Varshesha identification
    // When natal time is unknown, natal Lagna and Muntha are indeterminate (rashi 0).
    // Varsha Lagnesha, Trirashisha, and Dina/Ratri Pati are fully calculable and eligible.
    const panchadhikariCalc = new PanchadhikariCalculator();
    const natalLagnaRashi = (!isUntimed && natalChart?.ascendant) ? natalChart.ascendant.rashiIndex : 0;
    const varshaLagnaRashi = annualChart.ascendant.rashiIndex;
    const munthaRashi = (!isUntimed && muntha && !muntha.isIndeterminate) ? muntha.rashiIndex : 0;

    const { panchadhikari, varshesha } = panchadhikariCalc.evaluatePanchadhikariAndVarshesha(
      natalLagnaRashi,
      varshaLagnaRashi,
      munthaRashi,
      annualChart.planets,
      harshaBala
    );

    // 11. Detect Tajika Yogas (Ithasala, Isarpha, Nakta, Yamaya, Kamboola)
    const tajikaYogas = TajikaYogasCalculator.calculate(annualChart);

    // 12. Calculate Sensitive Points (Sahams)
    const sahams = SahamsCalculator.calculateAll(annualChart);

    // 13. Calculate Mudda Dasha annual timing (using the exact interval between consecutive solar returns)
    const muddaDasha = MuddaDashaCalculator.calculate(
      annualChart,
      returnUtcDate,
      options.targetDate,
      nextReturnUtcDate
    );

    // 14. Calculate instantaneous Panchanga context at the Solar Return instant
    const panchanga = this.panchangCalculator.calculatePanchang(
      annualChart.planets[PlanetSymbol.SUN].longitude,
      annualChart.planets[PlanetSymbol.MOON].longitude,
      returnUtcDate,
      {
        latitude: solarReturn.annualLocation.latitude,
        longitude: solarReturn.annualLocation.longitude,
      }
    );

    return {
      calculationVersion: ASTROLOGY_ENGINE_VERSION,
      convention: DEFAULT_VARSHAPHALA_CONVENTION,
      natalBirthDetails,
      solarReturn,
      varshaLagna,
      natalLagna,
      planets: typedAnnualPlanets,
      houses: annualHouses,
      muntha,
      panchadhikari,
      varshesha,
      harshaBala,
      harshaYogas,
      tajikaYogas,
      sahams,
      muddaDasha,
      panchanga,
      annualChart,
      nextSolarReturn,
      actualCycleDays,
    };
  }
}
