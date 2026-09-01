import { AstroChart } from './astro-chart.types';
import {
  NormalizedChart,
  NormalizedAscendant,
  NormalizedPlanet,
  NormalizedHouse,
  NormalizedRashi,
  NormalizedNakshatra,
  PlanetaryDignity,
} from './normalized-chart.types';
import { PlanetSymbol, MANDATORY_VEDIC_PLANETS } from '../planets/planet.types';
import { RASHIS } from '../zodiac/rashi';
import { NAKSHATRAS } from '../nakshatra/nakshatra';
import { normalizeDegree } from '../coordinates/angular-math';

const COMBUSTION_LIMITS: Partial<Record<PlanetSymbol, number>> = {
  [PlanetSymbol.MERCURY]: 14,
  [PlanetSymbol.VENUS]: 10,
  [PlanetSymbol.MARS]: 17,
  [PlanetSymbol.JUPITER]: 11,
  [PlanetSymbol.SATURN]: 15,
  [PlanetSymbol.MOON]: 12,
};

function checkCombustion(planet: PlanetSymbol, planetLongitude: number, sunLongitude: number): boolean {
  const limit = COMBUSTION_LIMITS[planet];
  if (!limit) return false;
  let diff = Math.abs(normalizeDegree(planetLongitude - sunLongitude));
  if (diff > 180) diff = 360 - diff;
  return diff <= limit;
}

function calculateDignity(planet: PlanetSymbol, rashiIndex: number): PlanetaryDignity {
  switch (planet) {
    case PlanetSymbol.SUN:
      if (rashiIndex === 1) return 'EXALTED';
      if (rashiIndex === 7) return 'DEBILITATED';
      if (rashiIndex === 5) return 'OWN_SIGN';
      break;
    case PlanetSymbol.MOON:
      if (rashiIndex === 2) return 'EXALTED';
      if (rashiIndex === 8) return 'DEBILITATED';
      if (rashiIndex === 4) return 'OWN_SIGN';
      break;
    case PlanetSymbol.MARS:
      if (rashiIndex === 10) return 'EXALTED';
      if (rashiIndex === 4) return 'DEBILITATED';
      if (rashiIndex === 1 || rashiIndex === 8) return 'OWN_SIGN';
      break;
    case PlanetSymbol.MERCURY:
      if (rashiIndex === 6) return 'EXALTED';
      if (rashiIndex === 12) return 'DEBILITATED';
      if (rashiIndex === 3 || rashiIndex === 6) return 'OWN_SIGN';
      break;
    case PlanetSymbol.JUPITER:
      if (rashiIndex === 4) return 'EXALTED';
      if (rashiIndex === 10) return 'DEBILITATED';
      if (rashiIndex === 9 || rashiIndex === 12) return 'OWN_SIGN';
      break;
    case PlanetSymbol.VENUS:
      if (rashiIndex === 12) return 'EXALTED';
      if (rashiIndex === 6) return 'DEBILITATED';
      if (rashiIndex === 2 || rashiIndex === 7) return 'OWN_SIGN';
      break;
    case PlanetSymbol.SATURN:
      if (rashiIndex === 7) return 'EXALTED';
      if (rashiIndex === 1) return 'DEBILITATED';
      if (rashiIndex === 10 || rashiIndex === 11) return 'OWN_SIGN';
      break;
    case PlanetSymbol.RAHU:
      if (rashiIndex === 2 || rashiIndex === 3) return 'EXALTED';
      if (rashiIndex === 8 || rashiIndex === 9) return 'DEBILITATED';
      if (rashiIndex === 11) return 'OWN_SIGN';
      break;
    case PlanetSymbol.KETU:
      if (rashiIndex === 8 || rashiIndex === 9) return 'EXALTED';
      if (rashiIndex === 2 || rashiIndex === 3) return 'DEBILITATED';
      if (rashiIndex === 8) return 'OWN_SIGN';
      break;
  }
  return 'NEUTRAL';
}

function resolveRashiIndex(input: any): number {
  if (typeof input?.rashiIndex === 'number' && input.rashiIndex >= 1 && input.rashiIndex <= 12) {
    return input.rashiIndex;
  }
  const signName = input?.sign || input?.rashiName || '';
  if (signName) {
    const found = RASHIS.find(
      (r) =>
        r.sanskritName.toLowerCase() === String(signName).toLowerCase() ||
        r.englishName.toLowerCase() === String(signName).toLowerCase()
    );
    if (found) return found.index;
  }
  return 1;
}

function resolveNakshatraIndex(input: any): number {
  if (typeof input?.nakshatraIndex === 'number' && input.nakshatraIndex >= 1 && input.nakshatraIndex <= 27) {
    return input.nakshatraIndex;
  }
  const nakName = input?.nakshatra || input?.nakshatraName || '';
  if (nakName) {
    const found = NAKSHATRAS.find((n) => n.name.toLowerCase() === String(nakName).toLowerCase());
    if (found) return found.index;
  }
  return 1;
}

function getPlanetData(planetsInput: any, symbol: PlanetSymbol): any {
  if (Array.isArray(planetsInput)) {
    return planetsInput.find(
      (p) => String(p.planet || p.name || '').toUpperCase() === symbol
    );
  }
  if (planetsInput && typeof planetsInput === 'object') {
    return (
      planetsInput[symbol] ||
      planetsInput[symbol.toLowerCase()] ||
      planetsInput[symbol.charAt(0) + symbol.slice(1).toLowerCase()]
    );
  }
  return undefined;
}

function formatPlanetName(symbol: string): string {
  if (!symbol) return '';
  const s = String(symbol).trim();
  if (s.length <= 1) return s.toUpperCase();
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

export function normalizeAstroChart(chart: AstroChart): NormalizedChart {
  if (!chart || !chart.ascendant) {
    throw new Error('Cannot normalize chart: Ascendant calculation is missing');
  }

  const ascRashiIndex = resolveRashiIndex(chart.ascendant);
  const ascRashiDef = RASHIS[ascRashiIndex - 1] || RASHIS[0];
  const ascNakIndex = resolveNakshatraIndex(chart.ascendant);

  const ascDegreeInRashi = typeof chart.ascendant.degreeInRashi === 'number'
    ? chart.ascendant.degreeInRashi
    : ((chart.ascendant as any).degree || 0);

  const ascLongitude = typeof chart.ascendant.longitude === 'number'
    ? chart.ascendant.longitude
    : (ascRashiIndex - 1) * 30 + ascDegreeInRashi;

  const ascendant: NormalizedAscendant = {
    sign: ascRashiDef.englishName,
    rashiIndex: ascRashiIndex,
    degree: ascDegreeInRashi,
    absoluteDegree: ascLongitude,
    nakshatra: NAKSHATRAS[ascNakIndex - 1]?.name ?? String((chart.ascendant as any).nakshatra || ''),
    nakshatraIndex: ascNakIndex,
    pada: chart.ascendant.pada || 1,
    house: 1,
    lord: formatPlanetName(ascRashiDef.ruler) as PlanetSymbol,
  };

  const sunPos = getPlanetData(chart.planets, PlanetSymbol.SUN);
  const sunRashiIdx = sunPos ? resolveRashiIndex(sunPos) : 1;
  const sunDeg = sunPos ? (typeof sunPos.degreeInRashi === 'number' ? sunPos.degreeInRashi : (sunPos.degree || 0)) : 0;
  const sunLongitude = sunPos ? (typeof sunPos.longitude === 'number' ? sunPos.longitude : (sunRashiIdx - 1) * 30 + sunDeg) : 0;

  // 1. Build Houses (1 to 12)
  const houses: NormalizedHouse[] = [];
  for (let h = 1; h <= 12; h++) {
    const houseRashiIndex = ((ascRashiIndex - 1 + (h - 1)) % 12) + 1;
    const houseRashiDef = RASHIS[houseRashiIndex - 1];
    const startLongitude = (houseRashiIndex - 1) * 30;
    const endLongitude = houseRashiIndex * 30;

    houses.push({
      number: h,
      sign: houseRashiDef.englishName,
      rashiIndex: houseRashiIndex,
      lord: formatPlanetName(houseRashiDef.ruler) as PlanetSymbol,
      occupants: [],
      cuspLongitude: startLongitude,
      startLongitude,
      endLongitude,
      status: 'VERIFIED',
    });
  }

  // 2. Build Planets Array
  const planets: NormalizedPlanet[] = MANDATORY_VEDIC_PLANETS.map((symbol) => {
    const pos = getPlanetData(chart.planets, symbol);
    if (!pos) {
      throw new Error(`Cannot normalize chart: Planet ${symbol} calculation is missing`);
    }

    const rashiIndex = resolveRashiIndex(pos);
    const rashiDef = RASHIS[rashiIndex - 1] || RASHIS[0];
    const nakshatraIndex = resolveNakshatraIndex(pos);
    const nakshatraDef = NAKSHATRAS[nakshatraIndex - 1] || NAKSHATRAS[0];

    const degreeInRashi = typeof pos.degreeInRashi === 'number' ? pos.degreeInRashi : (pos.degree || 0);
    const absLongitude = typeof pos.longitude === 'number' ? pos.longitude : (rashiIndex - 1) * 30 + degreeInRashi;

    const houseNumber = typeof pos.house === 'number' ? pos.house : (((rashiIndex - ascRashiIndex + 12) % 12) + 1);

    const isRetro = typeof pos.isRetrograde === 'boolean' ? pos.isRetrograde : Boolean(pos.retrograde);
    const isCombust = checkCombustion(symbol, absLongitude, sunLongitude);
    const dignity = calculateDignity(symbol, rashiIndex);

    // Find house lordships for this planet
    const lordship = houses
      .filter((h) => String(h.lord).toUpperCase() === String(symbol).toUpperCase())
      .map((h) => h.number);

    // Populate house occupant
    const targetHouse = houses.find((h) => h.number === houseNumber);
    if (targetHouse) {
      targetHouse.occupants.push(symbol);
    }

    return {
      name: symbol,
      sign: rashiDef.englishName,
      rashiIndex,
      degree: degreeInRashi,
      absoluteDegree: absLongitude,
      house: houseNumber,
      nakshatra: nakshatraDef.name,
      nakshatraIndex,
      pada: pos.pada || 1,
      nakshatraLord: formatPlanetName(nakshatraDef.lord || pos.nakshatraLord || 'Moon') as PlanetSymbol,
      retrograde: isRetro,
      combust: isCombust,
      dignity,
      lordship,
      status: 'VERIFIED',
    };
  });

  // 3. Build Rashis Summary (1 to 12)
  const rashis: NormalizedRashi[] = RASHIS.map((rashi) => {
    const houseNumber = ((rashi.index - ascRashiIndex + 12) % 12) + 1;
    const occupants = planets
      .filter((p) => p.rashiIndex === rashi.index)
      .map((p) => p.name);

    return {
      index: rashi.index,
      name: rashi.sanskritName,
      englishName: rashi.englishName,
      lord: rashi.ruler as PlanetSymbol,
      element: rashi.element,
      modality: rashi.modality,
      houseNumber,
      occupants,
    };
  });

  // 4. Build Nakshatras Summary (1 to 27)
  const nakshatras: NormalizedNakshatra[] = NAKSHATRAS.map((nak) => {
    const occupants = planets
      .filter((p) => p.nakshatraIndex === nak.index)
      .map((p) => p.name);

    return {
      index: nak.index,
      name: nak.name,
      lord: nak.lord as PlanetSymbol,
      startDegree: nak.startDegree,
      endDegree: nak.endDegree,
      occupants,
    };
  });

  const meta = chart.metadata || ({} as any);
  const normTime = meta.normalizedTime || {};
  const cfg = meta.config || {};
  const birth = chart.birthDetails || ({} as any);

  return {
    calculation: {
      calculationVersion: meta.engineVersion || '0.1.0',
      providerName: meta.providerName || 'AstroSushil Engine',
      providerVersion: meta.providerVersion || '1.0',
      calculationTimestampIso: meta.calculationTimestampIso || new Date().toISOString(),
      normalizedTime: {
        utcIsoString: normTime.utcIsoString || new Date().toISOString(),
        julianDayUT: normTime.julianDayUT || 0,
        timezoneOffsetMinutes: normTime.timezoneOffsetMinutes || 330,
      },
      config: {
        zodiacType: String(cfg.zodiacType || 'SIDEREAL'),
        ayanamsa: String(cfg.ayanamsa || 'LAHIRI'),
        houseSystem: String(cfg.houseSystem || 'WHOLE_SIGN'),
        nodeCalculation: String(cfg.nodeCalculation || 'MEAN_NODE'),
        planetaryCalculationMode: String(cfg.planetaryCalculationMode || 'SWISSEPH'),
      },
    },
    birthDetails: {
      name: birth.name || 'Valued Client',
      dateOfBirth:
        birth.dateOfBirth ||
        (birth.date
          ? `${birth.date.year}-${String(birth.date.month).padStart(2, '0')}-${String(birth.date.day).padStart(2, '0')}`
          : 'Not supplied'),
      timeOfBirth:
        birth.timeOfBirth ||
        (birth.time
          ? `${String(birth.time.hour).padStart(2, '0')}:${String(birth.time.minute).padStart(2, '0')}:${String(birth.time.second || 0).padStart(2, '0')}`
          : 'Not supplied'),
      latitude: birth.latitude || 28.6139,
      longitude: birth.longitude || 77.209,
      timezone: birth.timezone || 'Asia/Kolkata',
      placeName: birth.placeName || 'New Delhi, India',
    },
    ascendant,
    planets,
    houses,
    rashis,
    nakshatras,
  };
}
