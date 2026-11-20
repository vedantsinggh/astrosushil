import { PlanetSymbol, MANDATORY_VEDIC_PLANETS } from '../planets/planet.types';
import { AstroChart } from '../chart/astro-chart.types';
import { normalizeDegree } from '../coordinates/angular-math';
import { RASHIS, getRashiByLongitude, getDegreeInRashi } from '../zodiac/rashi';
import { getNakshatraByLongitude, getPada } from '../nakshatra/nakshatra';
import {
  KPPointPlacement,
  KPCuspPlacement,
  KPHouseSignificators,
  KPRulingPlanets,
  KPReport,
} from './kp.types';
import { KPSubLordCalculator } from './kp-sub-lords';
import { VARA_LORDS } from '../panchang/panchang-calculator';
import { calculateHouseAngles, calculatePlacidusCuspsTropical, houseOfLongitude } from '../houses/house-cusps';
import { computeAyanamsa, resolveAyanamsaSystem } from '../ayanamsa/ayanamsa';
import { KP_CUSP_SYSTEM } from '../configuration/astrology-config';
import { AstrologyEngineError } from '../errors/astrology.error';

export class KPCalculator {
  /**
   * Computes complete deterministic KP System intelligence for an AstroChart.
   */
  public calculateKP(
    chart: AstroChart,
    birthDate: Date,
    isDayBirth: boolean = true
  ): KPReport {
    const ascLong = chart.ascendant?.longitude ?? 0;

    // 1. KP cusps = TRUE Placidus (client decision ADR-017; src/houses/house-cusps.ts), in the
    // chart's zodiac: tropical Placidus cusps (mean equinox) minus the chart's MEAN ayanamsa.
    // Throws PlacidusUndefinedError beyond the polar circles (|latitude| >= ~66.56°).
    const julianDayUT = chart.metadata?.normalizedTime?.julianDayUT;
    const latitude = chart.birthDetails?.latitude;
    const longitude = chart.birthDetails?.longitude;
    if (typeof julianDayUT !== 'number' || typeof latitude !== 'number' || typeof longitude !== 'number') {
      throw new AstrologyEngineError('KP cusps need the chart birth time (metadata.normalizedTime) and place (birthDetails).');
    }
    const sidereal = chart.metadata.config?.zodiacType !== 'TROPICAL';
    const chartAyanamsa =
      chart.metadata.ayanamsa ??
      (sidereal
        ? (() => {
            const a = computeAyanamsa(julianDayUT, resolveAyanamsaSystem(chart.metadata.config?.ayanamsa));
            return { system: a.system, label: a.definition.label, trueDegrees: a.trueDegrees, meanDegrees: a.meanDegrees };
          })()
        : null);
    const angles = calculateHouseAngles(julianDayUT, latitude, longitude);
    const placidusTropical = calculatePlacidusCuspsTropical(angles.armcDegrees, latitude, angles.obliquityDegrees);
    const cuspLongitudes = placidusTropical.map((c) => normalizeDegree(c - (chartAyanamsa ? chartAyanamsa.meanDegrees : 0)));

    const cusps: KPCuspPlacement[] = [];
    for (let h = 1; h <= 12; h++) {
      const cuspLong = cuspLongitudes[h - 1];
      const rashiDef = getRashiByLongitude(cuspLong);
      const nakDef = getNakshatraByLongitude(cuspLong);
      const degInRashi = getDegreeInRashi(cuspLong);

      const lords = KPSubLordCalculator.calculateKPLords(cuspLong);

      cusps.push({
        houseNumber: h,
        cuspLongitude: Number(cuspLong.toFixed(4)),
        rashiIndex: rashiDef.index,
        rashiName: rashiDef.sanskritName,
        degreeInRashi: Number(degInRashi.toFixed(4)),
        nakshatraIndex: nakDef.index,
        nakshatraName: nakDef.name,
        signLord: lords.signLord,
        starLord: lords.starLord,
        subLord: lords.subLord,
        subSubLord: lords.subSubLord,
        subNumber: lords.subNumber,
      });
    }

    // 2. Build KP Planetary Placements
    const planetsReport: Record<string, KPPointPlacement> = {};
    for (const sym of MANDATORY_VEDIC_PLANETS) {
      const pos = chart.planets[sym];
      if (!pos || typeof pos.longitude !== 'number') continue;

      const norm = normalizeDegree(pos.longitude);
      const rashiDef = getRashiByLongitude(norm);
      const nakDef = getNakshatraByLongitude(norm);
      const pada = getPada(norm);
      const degInRashi = getDegreeInRashi(norm);
      // KP bhava: the planet is in house h when it lies between cusp h and cusp h+1.
      const house = houseOfLongitude(norm, cuspLongitudes);

      const lords = KPSubLordCalculator.calculateKPLords(norm);

      planetsReport[sym] = {
        name: sym,
        longitude: Number(norm.toFixed(4)),
        rashiIndex: rashiDef.index,
        rashiName: rashiDef.sanskritName,
        degreeInRashi: Number(degInRashi.toFixed(4)),
        nakshatraIndex: nakDef.index,
        nakshatraName: nakDef.name,
        pada,
        house,
        signLord: lords.signLord,
        starLord: lords.starLord,
        subLord: lords.subLord,
        subSubLord: lords.subSubLord,
        subNumber: lords.subNumber,
      };
    }

    // 3. Compute KP House Significators (4 Levels: A, B, C, D)
    // Level A: Planets in star of occupants of the house
    // Level B: Occupants of the house
    // Level C: Planets in star of the house lord
    // Level D: House Lord
    const houseSignificators: KPHouseSignificators[] = [];
    const planetSignifications: Record<string, number[]> = {};
    for (const sym of MANDATORY_VEDIC_PLANETS) {
      planetSignifications[sym] = [];
    }

    // Map house occupants
    const houseOccupants: Record<number, PlanetSymbol[]> = {};
    for (let h = 1; h <= 12; h++) houseOccupants[h] = [];
    for (const sym of MANDATORY_VEDIC_PLANETS) {
      const p = planetsReport[sym];
      if (p) {
        houseOccupants[p.house].push(sym);
      }
    }

    for (let h = 1; h <= 12; h++) {
      const cusp = cusps[h - 1];
      const houseLord = cusp.signLord;
      const occupants = houseOccupants[h] || [];

      // Level A: Planets whose star lord is any occupant of house h
      const levelA: PlanetSymbol[] = [];
      for (const sym of MANDATORY_VEDIC_PLANETS) {
        const p = planetsReport[sym];
        if (p && occupants.includes(p.starLord)) {
          levelA.push(sym);
        }
      }

      // Level B: Occupants
      const levelB = [...occupants];

      // Level C: Planets whose star lord is the house lord
      const levelC: PlanetSymbol[] = [];
      for (const sym of MANDATORY_VEDIC_PLANETS) {
        const p = planetsReport[sym];
        if (p && p.starLord === houseLord) {
          levelC.push(sym);
        }
      }

      // Level D: House Lord
      const levelD = [houseLord];

      const allSignificators = Array.from(new Set([...levelA, ...levelB, ...levelC, ...levelD]));

      for (const sigPlanet of allSignificators) {
        if (!planetSignifications[sigPlanet].includes(h)) {
          planetSignifications[sigPlanet].push(h);
        }
      }

      houseSignificators.push({
        houseNumber: h,
        levelA_StarOfOccupants: Array.from(new Set(levelA)),
        levelB_Occupants: levelB,
        levelC_StarOfLord: Array.from(new Set(levelC)),
        levelD_Lord: levelD,
        allSignificators,
      });
    }

    // 4. Compute Ruling Planets (RP)
    const dayIndex = birthDate.getUTCDay();
    const dayLord = VARA_LORDS[dayIndex]?.lord ?? PlanetSymbol.SUN;

    const moonKP = planetsReport[PlanetSymbol.MOON];
    const ascKP = KPSubLordCalculator.calculateKPLords(ascLong);

    const moonSignLord = moonKP?.signLord ?? PlanetSymbol.MOON;
    const moonStarLord = moonKP?.starLord ?? PlanetSymbol.MOON;
    const ascendantSignLord = ascKP.signLord;
    const ascendantStarLord = ascKP.starLord;

    // Rahu and Ketu node representation rules (represent sign lords and conjunction planets)
    const nodeRahuRepresents: PlanetSymbol[] = [];
    const nodeKetuRepresents: PlanetSymbol[] = [];

    const rahuPos = planetsReport[PlanetSymbol.RAHU];
    if (rahuPos) {
      nodeRahuRepresents.push(rahuPos.signLord);
    }
    const ketuPos = planetsReport[PlanetSymbol.KETU];
    if (ketuPos) {
      nodeKetuRepresents.push(ketuPos.signLord);
    }

    const primaryRulingPlanets = Array.from(
      new Set([
        ascendantStarLord,
        ascendantSignLord,
        moonStarLord,
        moonSignLord,
        dayLord,
      ])
    );

    const rulingPlanets: KPRulingPlanets = {
      dayLord,
      moonSignLord,
      moonStarLord,
      ascendantSignLord,
      ascendantStarLord,
      nodeRahuRepresents,
      nodeKetuRepresents,
      primaryRulingPlanets,
    };

    // 5. Pars Fortuna (Fortuna)
    const sunLong = chart.planets[PlanetSymbol.SUN]?.longitude ?? 0;
    const moonLong = chart.planets[PlanetSymbol.MOON]?.longitude ?? 0;

    const fortunaLong = isDayBirth
      ? normalizeDegree(ascLong + moonLong - sunLong)
      : normalizeDegree(ascLong + sunLong - moonLong);

    const fortunaRashiDef = getRashiByLongitude(fortunaLong);
    const fortunaNakDef = getNakshatraByLongitude(fortunaLong);
    const fortunaPada = getPada(fortunaLong);
    const fortunaDegInRashi = getDegreeInRashi(fortunaLong);
    const fortunaHouse = houseOfLongitude(fortunaLong, cuspLongitudes);
    const fortunaLords = KPSubLordCalculator.calculateKPLords(fortunaLong);

    const parsFortuna: KPPointPlacement = {
      name: 'Pars Fortuna',
      longitude: Number(fortunaLong.toFixed(4)),
      rashiIndex: fortunaRashiDef.index,
      rashiName: fortunaRashiDef.sanskritName,
      degreeInRashi: Number(fortunaDegInRashi.toFixed(4)),
      nakshatraIndex: fortunaNakDef.index,
      nakshatraName: fortunaNakDef.name,
      pada: fortunaPada,
      house: fortunaHouse,
      signLord: fortunaLords.signLord,
      starLord: fortunaLords.starLord,
      subLord: fortunaLords.subLord,
      subSubLord: fortunaLords.subSubLord,
      subNumber: fortunaLords.subNumber,
    };

    return {
      ayanamsaType: chartAyanamsa ? chartAyanamsa.system : 'TROPICAL',
      ayanamsaValue: chartAyanamsa ? Number(chartAyanamsa.trueDegrees.toFixed(6)) : 0,
      cuspSystem: KP_CUSP_SYSTEM,
      cusps,
      planets: planetsReport,
      houseSignificators,
      planetSignifications,
      rulingPlanets,
      parsFortuna,
    };
  }
}
