import { AstroChart } from '../chart/astro-chart.types';
import { ChartCalculator } from '../chart/chart-calculator';
import { EphemerisProvider } from '../ephemeris/ephemeris.interface';
import { AstronomyEngineAdapter } from '../ephemeris/astronomy-engine.adapter';
import { AstrologyConfig, DEFAULT_ASTROLOGY_CONFIG } from '../configuration/astrology-config';
import { PlanetSymbol, MANDATORY_VEDIC_PLANETS, PlanetPosition } from '../planets/planet.types';
import { normalizeDegree } from '../coordinates/angular-math';
import { getRashiByLongitude, getDegreeInRashi, RASHIS } from '../zodiac/rashi';
import { getNakshatraByLongitude, getPada } from '../nakshatra/nakshatra';
import { VargaCalculator } from '../varga/varga-calculator';
import { VargaType } from '../varga/varga.types';
import { AshtakavargaCalculator } from '../ashtakavarga/ashtakavarga-calculator';
import { AshtakavargaResult, AshtakavargaPlanet } from '../ashtakavarga/ashtakavarga.types';
import { calculateCombustion } from '../planets/combustion';
import { getAspectedSigns } from '../planets/planetary-aspects';
import { KakshaCalculator } from './kaksha-calculator';
import { TransitIngressSolver } from './transit-ingress.solver';
import {
  GocharaKakshaDetail,
  TransitAscendant,
  TransitAshtakavargaDetail,
  TransitAspectDetail,
  TransitChart,
  TransitHouse,
  TransitLocationInput,
  TransitPlanetPosition,
  TransitSnapshot,
  TransitTimeline,
  TransitTimelineEvent,
  TransitToNatalLagnaRelationship,
  TransitToNatalMoonRelationship,
  TransitToNatalPlanetRelationship,
  TransitVargaDetail,
} from './transit.types';
import { utcDateToJulianDay } from '../varshaphala/solar-return.solver';

export class TransitCalculator {
  private readonly ephemerisProvider: EphemerisProvider;
  private readonly chartCalculator: ChartCalculator;
  private readonly kakshaCalculator: KakshaCalculator;
  private readonly ingressSolver: TransitIngressSolver;
  private readonly ashtakavargaCalculator: AshtakavargaCalculator;
  private readonly vargaCalculator: VargaCalculator;

  constructor(ephemerisProvider?: EphemerisProvider) {
    this.ephemerisProvider = ephemerisProvider || new AstronomyEngineAdapter();
    this.chartCalculator = new ChartCalculator(this.ephemerisProvider);
    this.kakshaCalculator = new KakshaCalculator();
    this.ingressSolver = new TransitIngressSolver(this.ephemerisProvider);
    this.ashtakavargaCalculator = new AshtakavargaCalculator();
    this.vargaCalculator = new VargaCalculator();
  }

  /**
   * Calculates a complete transit chart at an arbitrary timestamp and location.
   */
  public async calculateTransitChart(
    input: {
      timestampIso: string;
      timezone: string;
      location: TransitLocationInput;
    },
    config: AstrologyConfig = DEFAULT_ASTROLOGY_CONFIG
  ): Promise<TransitChart> {
    const transitDate = new Date(input.timestampIso);
    if (isNaN(transitDate.getTime())) {
      throw new Error(`Invalid timestamp string: ${input.timestampIso}`);
    }

    const julianDayUT = utcDateToJulianDay(transitDate);

    // Map input to BirthDetails structure to calculate chart with canonical ChartCalculator
    const hours = transitDate.getUTCHours();
    const minutes = transitDate.getUTCMinutes();
    const seconds = transitDate.getUTCSeconds();
    const year = transitDate.getUTCFullYear();
    const month = transitDate.getUTCMonth() + 1;
    const day = transitDate.getUTCDate();

    const chart = await this.chartCalculator.calculateChart(
      {
        date: { year, month, day },
        time: { hour: hours, minute: minutes, second: seconds },
        timezone: 'UTC', // UTC timestamp converted directly
        latitude: input.location.latitude,
        longitude: input.location.longitude,
        placeName: input.location.placeName,
      },
      config
    );

    const ascendantDef = chart.ascendant!;
    const ascRashi = getRashiByLongitude(ascendantDef.longitude);
    const ascNak = getNakshatraByLongitude(ascendantDef.longitude);
    const ascPada = getPada(ascendantDef.longitude);

    const ascendant: TransitAscendant = {
      longitude: ascendantDef.longitude,
      rashiIndex: ascRashi.index,
      rashiName: ascRashi.sanskritName,
      rashiLord: ascRashi.ruler as PlanetSymbol,
      degreeInRashi: getDegreeInRashi(ascendantDef.longitude),
      nakshatraIndex: ascNak.index,
      nakshatraName: ascNak.name,
      pada: ascPada,
    };

    const planets: Partial<Record<PlanetSymbol, TransitPlanetPosition>> = {};
    const sunPos = chart.planets[PlanetSymbol.SUN];
    const sunLongitude = sunPos?.longitude ?? 0;

    for (const pSymbol of MANDATORY_VEDIC_PLANETS) {
      const pPos: PlanetPosition = chart.planets[pSymbol];
      if (pPos) {
        const rDef = getRashiByLongitude(pPos.longitude);
        const nakDef = getNakshatraByLongitude(pPos.longitude);
        const pada = getPada(pPos.longitude);
        const nakSpan = 360 / 27;
        const degreeInNakshatra = (pPos.longitude % nakSpan + nakSpan) % nakSpan;

        // Whole-sign house from transit Ascendant
        const house = ((rDef.index - ascRashi.index + 12) % 12) + 1;

        const isCombust =
          pSymbol === PlanetSymbol.SUN
            ? false
            : calculateCombustion(pSymbol, pPos.longitude, sunLongitude, pPos.isRetrograde).isCombust;

        planets[pSymbol] = {
          planet: pSymbol,
          longitude: pPos.longitude,
          latitude: pPos.latitude,
          speedLongitude: pPos.speedLongitude,
          isRetrograde: pPos.isRetrograde,
          isCombust,
          rashiIndex: rDef.index,
          rashiName: rDef.sanskritName,
          rashiLord: rDef.ruler as PlanetSymbol,
          degreeInRashi: getDegreeInRashi(pPos.longitude),
          house,
          nakshatraIndex: nakDef.index,
          nakshatraName: nakDef.name,
          nakshatraLord: nakDef.lord,
          pada,
          degreeInNakshatra,
        };
      }
    }

    // Build 12 whole sign transit houses
    const houses: TransitHouse[] = [];
    for (let h = 1; h <= 12; h++) {
      const signIndex = ((ascRashi.index - 1 + (h - 1)) % 12) + 1;
      const signDef = RASHIS[signIndex - 1];
      const startDegree = (signIndex - 1) * 30.0;

      const occupyingPlanets = MANDATORY_VEDIC_PLANETS.filter(
        (p) => planets[p]?.rashiIndex === signIndex
      );

      houses.push({
        houseNumber: h,
        rashiIndex: signIndex,
        rashiName: signDef.sanskritName,
        lord: signDef.ruler as PlanetSymbol,
        startDegree,
        occupyingPlanets,
      });
    }

    return {
      calculationVersion: '0.1.0',
      transitTime: {
        utcIso: transitDate.toISOString(),
        localIso: input.timestampIso,
        julianDayUT,
        timezone: input.timezone,
      },
      location: input.location,
      ascendant,
      planets: planets as Record<PlanetSymbol, TransitPlanetPosition>,
      houses,
    };
  }

  /**
   * Calculates a complete transit snapshot against an optional natal chart.
   */
  public async calculateTransitSnapshot(
    input: {
      timestampIso: string;
      timezone: string;
      location: TransitLocationInput;
    },
    natalChart?: AstroChart,
    config: AstrologyConfig = DEFAULT_ASTROLOGY_CONFIG,
    vargas: VargaType[] = ['D1', 'D9']
  ): Promise<TransitSnapshot> {
    const transitChart = await this.calculateTransitChart(input, config);

    if (!natalChart) {
      return {
        calculationVersion: '0.1.0',
        transitChart,
      };
    }

    // Natal reference points
    const natalAscRashi = natalChart.ascendant?.rashiIndex ?? 1;
    const natalAscName = natalChart.ascendant
      ? getRashiByLongitude(natalChart.ascendant.longitude).sanskritName
      : 'Mesha';

    const natalMoon = natalChart.planets[PlanetSymbol.MOON];
    const natalMoonRashi = natalMoon?.rashiIndex ?? natalAscRashi;
    const natalMoonName = natalMoon
      ? getRashiByLongitude(natalMoon.longitude).sanskritName
      : 'Mesha';

    // Calculate Ashtakavarga for natal chart if available
    let natalAshtakavarga: AshtakavargaResult | undefined;
    try {
      natalAshtakavarga = this.ashtakavargaCalculator.calculateAshtakavarga(natalChart);
    } catch {
      natalAshtakavarga = undefined;
    }

    const transitToLagna: TransitToNatalLagnaRelationship[] = [];
    const transitToMoon: TransitToNatalMoonRelationship[] = [];
    const transitToNatalPlanets: TransitToNatalPlanetRelationship[] = [];
    const aspectsToNatal: TransitAspectDetail[] = [];
    const ashtakavargaTransit: TransitAshtakavargaDetail[] = [];
    const gocharaKakshas: GocharaKakshaDetail[] = [];
    const vargaTransits: TransitVargaDetail[] = [];

    for (const pSymbol of MANDATORY_VEDIC_PLANETS) {
      const tPlanet = transitChart.planets[pSymbol];
      if (!tPlanet) continue;

      // 1. Transit to Natal Lagna
      const signDistFromLagna = ((tPlanet.rashiIndex - natalAscRashi + 12) % 12) + 1;
      let angSepLagna = Math.abs(
        normalizeDegree(tPlanet.longitude - (natalChart.ascendant?.longitude ?? 0))
      );
      if (angSepLagna > 180) angSepLagna = 360 - angSepLagna;

      transitToLagna.push({
        transitPlanet: pSymbol,
        transitSignIndex: tPlanet.rashiIndex,
        transitSignName: tPlanet.rashiName,
        natalLagnaSignIndex: natalAscRashi,
        natalLagnaSignName: natalAscName,
        signDistance: signDistFromLagna,
        houseFromLagna: signDistFromLagna,
        angularSeparation: angSepLagna,
      });

      // 2. Transit to Natal Moon
      const signDistFromMoon = ((tPlanet.rashiIndex - natalMoonRashi + 12) % 12) + 1;
      let moonBavScore: number | undefined;
      if (natalAshtakavarga && natalAshtakavarga.bav[pSymbol as AshtakavargaPlanet]) {
        moonBavScore =
          natalAshtakavarga.bav[pSymbol as AshtakavargaPlanet].signs[tPlanet.rashiIndex];
      }

      transitToMoon.push({
        transitPlanet: pSymbol,
        transitSignIndex: tPlanet.rashiIndex,
        transitSignName: tPlanet.rashiName,
        natalMoonSignIndex: natalMoonRashi,
        natalMoonSignName: natalMoonName,
        signDistance: signDistFromMoon,
        houseFromMoon: signDistFromMoon,
        transitNakshatra: tPlanet.nakshatraName,
        bavScore: moonBavScore,
      });

      // 3. Transit to Natal Planet comparison
      const nPlanet = natalChart.planets[pSymbol];
      if (nPlanet) {
        let angDist = Math.abs(normalizeDegree(tPlanet.longitude - nPlanet.longitude));
        if (angDist > 180) angDist = 360 - angDist;

        const sDist = ((tPlanet.rashiIndex - nPlanet.rashiIndex + 12) % 12) + 1;
        const hDist = sDist;

        let rel = 'NEUTRAL';
        if (tPlanet.rashiIndex === nPlanet.rashiIndex) rel = 'CONJUNCTION_TRANSIT';
        else if (sDist === 7) rel = 'OPPOSITION_TRANSIT';
        else if (sDist === 5 || sDist === 9) rel = 'TRINE_TRANSIT';
        else if (sDist === 4 || sDist === 10) rel = 'SQUARE_TRANSIT';

        transitToNatalPlanets.push({
          transitPlanet: pSymbol,
          natalPlanet: pSymbol,
          transitLongitude: tPlanet.longitude,
          natalLongitude: nPlanet.longitude,
          angularSeparation: angDist,
          signDistance: sDist,
          houseDistance: hDist,
          relationship: rel,
        });
      }

      // 4. Parashari Aspects cast onto Natal Chart
      const aspectedSigns = getAspectedSigns(pSymbol, tPlanet.rashiIndex);
      for (const sa of aspectedSigns) {
        // Check if natal Lagna is in aspected sign
        if (sa.rashiIndex === natalAscRashi) {
          aspectsToNatal.push({
            sourceTransitPlanet: pSymbol,
            targetType: 'NATAL_LAGNA',
            targetIdentifier: 'Lagna',
            aspectType: sa.aspectType,
            angleDegrees: ((sa.rashiIndex - tPlanet.rashiIndex + 12) % 12) * 30,
            isFullDrishti: true,
          });
        }

        // Check if any natal planets are in aspected sign
        for (const nPSymbol of MANDATORY_VEDIC_PLANETS) {
          const np = natalChart.planets[nPSymbol];
          if (np && np.rashiIndex === sa.rashiIndex) {
            let angle = Math.abs(normalizeDegree(np.longitude - tPlanet.longitude));
            if (angle > 180) angle = 360 - angle;

            aspectsToNatal.push({
              sourceTransitPlanet: pSymbol,
              targetType: 'NATAL_PLANET',
              targetIdentifier: nPSymbol,
              aspectType: sa.aspectType,
              angleDegrees: angle,
              isFullDrishti: true,
            });
          }
        }
      }

      // 5. Ashtakavarga Transit Details
      if (natalAshtakavarga) {
        const bavTable = natalAshtakavarga.bav[pSymbol as AshtakavargaPlanet];
        const bavPoints = bavTable?.signs[tPlanet.rashiIndex] ?? 0;
        const savPoints = natalAshtakavarga.sav.signs[tPlanet.rashiIndex] ?? 0;

        ashtakavargaTransit.push({
          planet: pSymbol,
          transitSignIndex: tPlanet.rashiIndex,
          transitSignName: tPlanet.rashiName,
          bavPoints,
          savPoints,
          isBavFavorable: bavPoints >= 4,
          isSavFavorable: savPoints >= 28,
        });
      }

      // 6. Gochara Kaksha Status
      const kaksha = this.kakshaCalculator.calculateKaksha(
        pSymbol,
        tPlanet.longitude,
        natalAshtakavarga
      );
      gocharaKakshas.push(kaksha);

      // 7. Varga Transits
      for (const vType of vargas) {
        const tVargaRashiIndex = this.vargaCalculator.calculateLongitudeVarga(tPlanet.longitude, vType);
        const tVRashiDef = RASHIS[tVargaRashiIndex - 1];

        const nPos = natalChart.planets[pSymbol];
        if (nPos) {
          const nVargaRashiIndex = this.vargaCalculator.calculateLongitudeVarga(nPos.longitude, vType);
          const nVRashiDef = RASHIS[nVargaRashiIndex - 1];

          vargaTransits.push({
            vargaType: vType,
            transitPlanet: pSymbol,
            transitVargaRashiIndex: tVargaRashiIndex,
            transitVargaRashiName: tVRashiDef.sanskritName,
            natalVargaRashiIndex: nVargaRashiIndex,
            natalVargaRashiName: nVRashiDef.sanskritName,
            isSameVargaSign: tVargaRashiIndex === nVargaRashiIndex,
          });
        }
      }
    }

    return {
      calculationVersion: '0.1.0',
      transitChart,
      transitToLagna,
      transitToMoon,
      transitToNatalPlanets,
      aspectsToNatal,
      ashtakavargaTransit,
      gocharaKakshas,
      vargaTransits,
    };
  }

  /**
   * Calculates chronological transit events (sign/nakshatra ingresses, retrograde stations) over a bounded date range.
   */
  public async calculateTransitTimeline(
    input: {
      startDateIso: string;
      endDateIso: string;
      timezone?: string;
      planets?: PlanetSymbol[];
      eventTypes?: ('SIGN_INGRESS' | 'NAKSHATRA_INGRESS' | 'RETROGRADE_STATION' | 'DIRECT_STATION')[];
    }
  ): Promise<TransitTimeline> {
    const startDate = new Date(input.startDateIso);
    const endDate = new Date(input.endDateIso);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new Error('Invalid start or end date format in transit timeline query');
    }

    if (endDate.getTime() < startDate.getTime()) {
      throw new Error('Timeline endDate cannot precede startDate');
    }

    // Bounded maximum interval: 730 days (~2 years) to protect performance
    const maxDays = 730;
    const diffDays = (endDate.getTime() - startDate.getTime()) / 86400000;
    if (diffDays > maxDays) {
      throw new Error(`Transit timeline query exceeds maximum permitted interval (${maxDays} days)`);
    }

    const startJD = utcDateToJulianDay(startDate);
    const endJD = utcDateToJulianDay(endDate);

    const planetsToQuery =
      input.planets && input.planets.length > 0 ? input.planets : [...MANDATORY_VEDIC_PLANETS];
    const requestedTypes =
      input.eventTypes && input.eventTypes.length > 0
        ? input.eventTypes
        : ['SIGN_INGRESS', 'NAKSHATRA_INGRESS', 'RETROGRADE_STATION', 'DIRECT_STATION'];

    const allEvents: TransitTimelineEvent[] = [];

    for (const planet of planetsToQuery) {
      if (requestedTypes.includes('SIGN_INGRESS')) {
        const signEvents = await this.ingressSolver.findSignIngresses(planet, startJD, endJD);
        allEvents.push(...signEvents);
      }

      if (requestedTypes.includes('NAKSHATRA_INGRESS')) {
        const nakEvents = await this.ingressSolver.findNakshatraIngresses(planet, startJD, endJD);
        allEvents.push(...nakEvents);
      }

      if (
        requestedTypes.includes('RETROGRADE_STATION') ||
        requestedTypes.includes('DIRECT_STATION')
      ) {
        const stationEvents = await this.ingressSolver.findStationEvents(planet, startJD, endJD);
        for (const se of stationEvents) {
          if (requestedTypes.includes(se.eventType)) {
            allEvents.push(se);
          }
        }
      }
    }

    // Sort chronologically by Julian Day UT
    allEvents.sort((a, b) => a.julianDayUT - b.julianDayUT);

    return {
      calculationVersion: '0.1.0',
      startDateIso: startDate.toISOString(),
      endDateIso: endDate.toISOString(),
      planets: planetsToQuery,
      eventCount: allEvents.length,
      events: allEvents,
    };
  }
}
