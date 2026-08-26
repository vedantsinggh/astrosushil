export class IncompleteAstrologyDataError extends Error {
  public readonly developerMessage: string;

  constructor(developerMessage: string) {
    super('Complete chart data is currently unavailable. Please try again.');
    this.name = 'IncompleteAstrologyDataError';
    this.developerMessage = developerMessage;
  }
}

/**
 * Validates calculated astrology chart data to ensure no empty objects, missing fields,
 * or corrupted placeholder strings exist before generating a structured report.
 */
export function validateAstrologyDataForReport(rawChartData: any): void {
  if (!rawChartData || typeof rawChartData !== 'object') {
    throw new IncompleteAstrologyDataError('Astrology chart data is null, undefined, or not an object.');
  }

  // Extract chart object (support root chart property, data property, or direct object)
  const chart = rawChartData.chart || rawChartData.data || rawChartData;

  // 1. Validate Ascendant
  if (!chart.ascendant || typeof chart.ascendant !== 'object' || Object.keys(chart.ascendant).length === 0) {
    throw new IncompleteAstrologyDataError('Ascendant data is missing or empty object {}.');
  }

  const asc = chart.ascendant;
  const ascSign = asc.rashiName || asc.sign || asc.rashi;
  const ascNakshatra = asc.nakshatraName || asc.nakshatra;
  const isInvalidAsc =
    !ascSign ||
    ascSign === 'N/A' ||
    ascSign === 'unknown' ||
    ascSign === '0°00' ||
    !ascNakshatra ||
    ascNakshatra === 'N/A' ||
    ascNakshatra === 'unknown' ||
    ascNakshatra === '0°00';

  if (isInvalidAsc) {
    throw new IncompleteAstrologyDataError(
      `Ascendant has incomplete calculation fields: sign=${ascSign}, nakshatra=${ascNakshatra}`
    );
  }

  // 2. Validate Planets Array
  if (!Array.isArray(chart.planets) || chart.planets.length === 0) {
    throw new IncompleteAstrologyDataError('Planets array is missing, empty, or not an array.');
  }

  // Check required standard planets
  const requiredPlanets = ['SUN', 'MOON', 'MARS', 'MERCURY', 'JUPITER', 'VENUS', 'SATURN'];
  const presentPlanetNames = chart.planets.map((p: any) => String(p.planet || p.name || '').toUpperCase());

  for (const required of requiredPlanets) {
    if (!presentPlanetNames.includes(required)) {
      throw new IncompleteAstrologyDataError(`Required planet '${required}' is missing from calculated planets array.`);
    }
  }

  for (const planet of chart.planets) {
    if (!planet || typeof planet !== 'object' || Object.keys(planet).length === 0) {
      throw new IncompleteAstrologyDataError('Planets array contains empty object {}.');
    }
    const pSign = planet.rashiName || planet.sign || planet.rashi;
    const pNakshatra = planet.nakshatraName || planet.nakshatra;
    const isInvalidPlanet =
      !pSign ||
      pSign === 'N/A' ||
      pSign === 'unknown' ||
      pSign === '0°00' ||
      !pNakshatra ||
      pNakshatra === 'N/A' ||
      pNakshatra === 'unknown' ||
      pNakshatra === '0°00';

    if (isInvalidPlanet) {
      throw new IncompleteAstrologyDataError(
        `Planet '${planet.planet || planet.name}' has incomplete calculation fields: sign=${pSign}, nakshatra=${pNakshatra}`
      );
    }
  }

  // 3. Validate Houses Array
  if (!Array.isArray(chart.houses) || chart.houses.length < 12) {
    throw new IncompleteAstrologyDataError(
      `Houses array is invalid or has fewer than 12 houses (length: ${chart.houses?.length}).`
    );
  }

  for (const house of chart.houses) {
    if (!house || typeof house !== 'object' || Object.keys(house).length === 0) {
      throw new IncompleteAstrologyDataError('Houses array contains empty object {}.');
    }
  }
}
