import { describe, it, expect } from 'vitest';
import { astrologyService } from '../../src/modules/astrology/astrology.service';

describe('Planetary Intelligence API & Service Unit Tests (Phase 2B)', () => {
  const sampleBirthDetails = {
    name: 'Planetary Intelligence Test',
    dateOfBirth: '1990-05-15',
    timeOfBirth: '14:30:00',
    latitude: 28.6139,
    longitude: 77.209,
    timezone: 'Asia/Kolkata',
    placeName: 'New Delhi, India',
  };

  it('1. returns enriched planetary intelligence with real speeds, latitudes, dignities, and avasthas', async () => {
    const result = await astrologyService.calculateChartForDirectInput(sampleBirthDetails);

    expect(result.data).toBeDefined();
    expect(result.chart).toBeDefined();
    expect(result.chart.planets.length).toBeGreaterThanOrEqual(9);

    const sun = result.chart.planets.find((p) => p.planet === 'SUN')!;
    const moon = result.chart.planets.find((p) => p.planet === 'MOON')!;
    const mars = result.chart.planets.find((p) => p.planet === 'MARS')!;

    // Sun: realistic daily motion (~0.95 to ~1.02 deg/day)
    expect(sun.speedLongitude).toBeGreaterThan(0.9);
    expect(sun.speedLongitude).toBeLessThan(1.05);

    // Moon: realistic daily motion (~11.5 to ~15.5 deg/day)
    expect(moon.speedLongitude).toBeGreaterThan(11.0);
    expect(moon.speedLongitude).toBeLessThan(16.0);

    // Latitudes: not hardcoded 0 for Moon (Moon has ~5° inclination)
    expect(Math.abs(moon.latitude)).toBeGreaterThan(0.01);

    // Dignity check across all planets
    const validDignities = [
      'EXALTED',
      'DEBILITATED',
      'MOOLATRIKONA',
      'OWN_SIGN',
      'GREAT_FRIEND',
      'FRIEND',
      'NEUTRAL',
      'ENEMY',
      'GREAT_ENEMY',
    ];
    for (const p of result.chart.planets) {
      expect(validDignities).toContain(p.dignity);
      expect(p.rashiName).toBeDefined();
      expect(p.degreeInRashi).toBeGreaterThanOrEqual(0);
      expect(p.degreeInRashi).toBeLessThan(30);

      // Avasthas
      expect(p.avastha).toBeDefined();
      expect(['BALA', 'KUMARA', 'YUVA', 'VRIDDHA', 'MRITA']).toContain(p.avastha?.baladi);
      expect([0, 10, 25, 50, 100]).toContain(p.avastha?.baladiStrengthPercent);
      expect(['JAGRATA', 'SWAPNA', 'SUSHUPTI']).toContain(p.avastha?.jagratadi);

      // Aspects
      expect(p.aspectsCast).toBeDefined();
      expect(Array.isArray(p.aspectsCast)).toBe(true);
      expect(p.aspectsCast!.length).toBeGreaterThanOrEqual(1); // At least 7th aspect
      expect(p.aspectsReceived).toBeDefined();
      expect(Array.isArray(p.aspectsReceived)).toBe(true);
    }
  });

  it('2. assigns unique Chara Karakas to the 7 classical planets', async () => {
    const result = await astrologyService.calculateChartForDirectInput(sampleBirthDetails);

    const sevenPlanets = ['SUN', 'MOON', 'MARS', 'MERCURY', 'JUPITER', 'VENUS', 'SATURN'];
    const charaCodes: string[] = [];

    for (const name of sevenPlanets) {
      const p = result.chart.planets.find((item) => item.planet === name)!;
      expect(p.charaKaraka).toBeDefined();
      expect(['AK', 'AmK', 'BK', 'MK', 'PK', 'GK', 'DK']).toContain(p.charaKaraka);
      charaCodes.push(p.charaKaraka!);
    }

    // All 7 Chara Karakas must be assigned uniquely
    expect(new Set(charaCodes).size).toBe(7);
    expect(charaCodes).toContain('AK'); // Atmakaraka
    expect(charaCodes).toContain('DK'); // Darakaraka
  });

  it('3. validates special aspects for Mars, Jupiter, and Saturn', async () => {
    const result = await astrologyService.calculateChartForDirectInput(sampleBirthDetails);

    const mars = result.chart.planets.find((p) => p.planet === 'MARS')!;
    const jupiter = result.chart.planets.find((p) => p.planet === 'JUPITER')!;
    const saturn = result.chart.planets.find((p) => p.planet === 'SATURN')!;

    // Mars casts 3 full aspects: 4th, 7th, 8th
    expect(mars.aspectsCast).toHaveLength(3);

    // Jupiter casts 3 full aspects: 5th, 7th, 9th
    expect(jupiter.aspectsCast).toHaveLength(3);

    // Saturn casts 3 full aspects: 3rd, 7th, 10th
    expect(saturn.aspectsCast).toHaveLength(3);
  });

  it('4. ensures zero empty {} objects in API JSON serialization', async () => {
    const result = await astrologyService.calculateChartForDirectInput(sampleBirthDetails);
    const serialized = JSON.stringify(result);

    expect(serialized).not.toContain('"avastha":{}');
    expect(serialized).not.toContain('"aspectsReceived":[{}]');
    expect(serialized).not.toContain('"aspectsCast":[{}]');
    expect(serialized).not.toContain('"planets":[{}]');
    expect(serialized).not.toContain('"houses":[{}]');
    expect(serialized).not.toContain('{}');
  });

  it('5. deterministic repeatability: two runs yield identical planetary intelligence', async () => {
    const run1 = await astrologyService.calculateChartForDirectInput(sampleBirthDetails);
    const run2 = await astrologyService.calculateChartForDirectInput(sampleBirthDetails);

    expect(JSON.stringify(run1.chart.planets)).toBe(JSON.stringify(run2.chart.planets));
  });
});
