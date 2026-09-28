import { AstroChart } from './astro-chart.types';
import { VargaChart } from '../varga/varga.types';
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
import {
  calculatePlanetaryDignity,
  calculateCombustion,
  calculatePlanetaryAvastha,
  calculatePlanetaryAspects,
  calculateCharaKarakas,
} from '../planets';
import { RASHIS } from '../zodiac/rashi';
import { NAKSHATRAS } from '../nakshatra/nakshatra';
import { normalizeDegree } from '../coordinates/angular-math';

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

  // Pre-gather planet facts for relationships, aspects, and karakas
  const rawFacts = MANDATORY_VEDIC_PLANETS.map((symbol) => {
    const pos = getPlanetData(chart.planets, symbol);
    if (!pos) {
      throw new Error(`Cannot normalize chart: Planet ${symbol} calculation is missing`);
    }
    const rashiIndex = resolveRashiIndex(pos);
    const degreeInRashi = typeof pos.degreeInRashi === 'number' ? pos.degreeInRashi : (pos.degree || 0);
    const absLongitude = typeof pos.longitude === 'number' ? pos.longitude : (rashiIndex - 1) * 30 + degreeInRashi;
    const houseNumber = typeof pos.house === 'number' ? pos.house : (((rashiIndex - ascRashiIndex + 12) % 12) + 1);
    const isRetro = typeof pos.isRetrograde === 'boolean' ? pos.isRetrograde : Boolean(pos.retrograde);
    const speedLongitude = typeof pos.speedLongitude === 'number' ? pos.speedLongitude : 0;
    const latitude = typeof pos.latitude === 'number' ? pos.latitude : 0;

    return {
      symbol,
      pos,
      rashiIndex,
      degreeInRashi,
      absLongitude,
      houseNumber,
      isRetro,
      speedLongitude,
      latitude,
    };
  });

  const planetPositionsMap: Partial<Record<PlanetSymbol, { rashiIndex: number }>> = {};
  const charaDegreesMap: Partial<Record<PlanetSymbol, number>> = {};
  for (const f of rawFacts) {
    planetPositionsMap[f.symbol] = { rashiIndex: f.rashiIndex };
    charaDegreesMap[f.symbol] = f.degreeInRashi;
  }

  // Aspects
  const aspectInputs = rawFacts.map((f) => ({
    planet: f.symbol,
    rashiIndex: f.rashiIndex,
    house: f.houseNumber,
    longitude: f.absLongitude,
  }));
  const aspectsResult = calculatePlanetaryAspects(aspectInputs);

  // Chara Karakas
  const karakas = calculateCharaKarakas(charaDegreesMap);
  const karakaCodeMap = new Map<PlanetSymbol, string>();
  for (const k of karakas) {
    karakaCodeMap.set(k.planet, k.code);
  }

  // 2. Build Planets Array
  const planets: NormalizedPlanet[] = rawFacts.map((f) => {
    const rashiDef = RASHIS[f.rashiIndex - 1] || RASHIS[0];
    const nakshatraIndex = resolveNakshatraIndex(f.pos);
    const nakshatraDef = NAKSHATRAS[nakshatraIndex - 1] || NAKSHATRAS[0];

    const isCombust = calculateCombustion(f.symbol, f.absLongitude, sunLongitude, f.isRetro).isCombust;
    const dignity = calculatePlanetaryDignity(f.symbol, f.rashiIndex, f.degreeInRashi, planetPositionsMap);
    const avastha = calculatePlanetaryAvastha(f.rashiIndex, f.degreeInRashi, dignity);

    const aspectsCastList = aspectsResult.aspectedHouses.get(f.symbol) || [];
    const aspectsReceivedList = aspectsResult.aspectsReceived.get(f.symbol) || [];
    const aspectingPlanets = Array.from(new Set(aspectsReceivedList.map((a) => a.sourcePlanet)));

    // Find house lordships for this planet
    const lordship = houses
      .filter((h) => String(h.lord).toUpperCase() === String(f.symbol).toUpperCase())
      .map((h) => h.number);

    // Populate house occupant
    const targetHouse = houses.find((h) => h.number === f.houseNumber);
    if (targetHouse) {
      targetHouse.occupants.push(f.symbol);
    }

    return {
      name: f.symbol,
      sign: rashiDef.englishName,
      rashiIndex: f.rashiIndex,
      degree: f.degreeInRashi,
      absoluteDegree: f.absLongitude,
      house: f.houseNumber,
      nakshatra: nakshatraDef.name,
      nakshatraIndex,
      pada: f.pos.pada || 1,
      nakshatraLord: formatPlanetName(nakshatraDef.lord || f.pos.nakshatraLord || 'Moon') as PlanetSymbol,
      retrograde: f.isRetro,
      combust: isCombust,
      dignity,
      lordship,
      speedLongitude: f.speedLongitude,
      latitude: f.latitude,
      avastha: {
        baladi: avastha.baladi,
        baladiStrengthPercent: avastha.baladiStrengthPercent,
        jagratadi: avastha.jagratadi,
      },
      charaKaraka: karakaCodeMap.get(f.symbol),
      aspectsReceived: aspectingPlanets,
      aspectsCast: aspectsCastList,
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

/**
 * Normalizes a calculated VargaChart into the canonical NormalizedChart schema.
 * Allows client UI components (like Kundli charts) to render any of the 16 divisional charts
 * with complete houses, planets, sign occupancies, and ascendant details.
 */
export function normalizeVargaChart(chart: AstroChart, vargaChart: VargaChart): NormalizedChart {
  if (!vargaChart || !vargaChart.ascendant) {
    throw new Error('Cannot normalize Varga chart: Ascendant calculation is missing');
  }

  const ascRashiIndex = vargaChart.ascendant.rashiIndex;
  const ascRashiDef = RASHIS[ascRashiIndex - 1] || RASHIS[0];
  const ascDegreeInRashi = typeof vargaChart.ascendant.degreeInVarga === 'number'
    ? vargaChart.ascendant.degreeInVarga
    : 0;
  const ascAbsoluteDegree = (ascRashiIndex - 1) * 30 + ascDegreeInRashi;
  const ascNakIndex = resolveNakshatraIndex(chart.ascendant);

  const ascendant: NormalizedAscendant = {
    sign: ascRashiDef.englishName,
    rashiIndex: ascRashiIndex,
    degree: ascDegreeInRashi,
    absoluteDegree: ascAbsoluteDegree,
    nakshatra: NAKSHATRAS[ascNakIndex - 1]?.name ?? 'Ashwini',
    nakshatraIndex: ascNakIndex,
    pada: chart.ascendant?.pada || 1,
    house: 1,
    lord: formatPlanetName(ascRashiDef.ruler) as PlanetSymbol,
  };

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
  const sunPos = getPlanetData(chart.planets, PlanetSymbol.SUN);
  const sunLongitude = sunPos?.longitude ?? 0;

  const vargaPositionsMap: Partial<Record<PlanetSymbol, { rashiIndex: number }>> = {};
  for (const sym of MANDATORY_VEDIC_PLANETS) {
    if (vargaChart.placements[sym]) {
      vargaPositionsMap[sym] = { rashiIndex: vargaChart.placements[sym].rashiIndex };
    }
  }

  const planets: NormalizedPlanet[] = MANDATORY_VEDIC_PLANETS.map((symbol) => {
    const vPlacement = vargaChart.placements[symbol];
    if (!vPlacement) {
      throw new Error(`Cannot normalize Varga chart: Planet ${symbol} is missing`);
    }

    const rashiIndex = vPlacement.rashiIndex;
    const rashiDef = RASHIS[rashiIndex - 1] || RASHIS[0];
    const degreeInRashi = typeof vPlacement.degreeInVarga === 'number' ? vPlacement.degreeInVarga : 0;
    const absLongitude = (rashiIndex - 1) * 30 + degreeInRashi;
    const houseNumber = vPlacement.house ?? (((rashiIndex - ascRashiIndex + 12) % 12) + 1);

    const origPos = getPlanetData(chart.planets, symbol);
    const nakshatraIndex = origPos ? resolveNakshatraIndex(origPos) : 1;
    const nakshatraDef = NAKSHATRAS[nakshatraIndex - 1] || NAKSHATRAS[0];

    const isRetro = typeof vPlacement.isRetrograde === 'boolean'
      ? vPlacement.isRetrograde
      : origPos ? (typeof origPos.isRetrograde === 'boolean' ? origPos.isRetrograde : Boolean(origPos.retrograde)) : false;

    const isCombust = origPos ? calculateCombustion(symbol, origPos.longitude, sunLongitude, isRetro).isCombust : false;
    const dignity = calculatePlanetaryDignity(symbol, rashiIndex, degreeInRashi, vargaPositionsMap);

    // House lordships in this Varga
    const lordship = houses
      .filter((h) => String(h.lord).toUpperCase() === String(symbol).toUpperCase())
      .map((h) => h.number);

    // Populate occupant
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
      pada: origPos?.pada || 1,
      nakshatraLord: formatPlanetName(nakshatraDef.lord || origPos?.nakshatraLord || 'Moon') as PlanetSymbol,
      retrograde: isRetro,
      combust: isCombust,
      dignity,
      lordship,
      speedLongitude: origPos?.speedLongitude || 0,
      latitude: origPos?.latitude || 0,
      status: 'VERIFIED',
    };
  });

  // 3. Rashis Summary
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

  // 4. Nakshatras Summary
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
      providerName: `${meta.providerName || 'AstroSushil'} [${vargaChart.vargaType} ${vargaChart.name}]`,
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
        planetaryCalculationMode: String(cfg.planetaryCalculationMode || 'GEOCENTRIC'),
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

