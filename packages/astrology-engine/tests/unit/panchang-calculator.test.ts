import { describe, it, expect } from 'vitest';
import {
  PanchangCalculator,
  TITHI_NAMES,
  YOGA_NAMES,
  VARA_LORDS,
  REPEATING_KARANAS,
  RAHU_KALA_DAY_SEGMENTS,
} from '../../src/panchang/panchang-calculator';
import { PlanetSymbol } from '../../src/planets/planet.types';

describe('PanchangCalculator - Comprehensive Unit & Boundary Tests (Phase 2I)', () => {
  const calculator = new PanchangCalculator();
  const testDate = new Date('2026-08-24T06:00:00.000Z'); // Monday

  describe('1. Tithi Calculations & Boundaries', () => {
    it('calculates Sukla Paksha Pratipada when Sun and Moon are conjunct (0 degree diff)', () => {
      const result = calculator.calculatePanchang(0.0, 5.0, testDate);

      expect(result.tithi.index).toBe(1);
      expect(result.tithi.paksha).toBe('SUKLA');
      expect(result.tithi.name).toBe('Pratipada');
      expect(result.tithi.degreeInTithi).toBeCloseTo(5.0, 4);
      expect(result.tithi.completionPercentage).toBeCloseTo((5 / 12) * 100, 4);
    });

    it('calculates Purnima when Moon is opposite Sun (180 degree diff)', () => {
      const result = calculator.calculatePanchang(0.0, 175.0, testDate);

      expect(result.tithi.index).toBe(15);
      expect(result.tithi.paksha).toBe('SUKLA');
      expect(result.tithi.name).toBe('Purnima');
    });

    it('calculates Amavasya in Krishna Paksha when Moon is 355 deg ahead of Sun', () => {
      const result = calculator.calculatePanchang(0.0, 355.0, testDate);

      expect(result.tithi.index).toBe(30);
      expect(result.tithi.paksha).toBe('KRISHNA');
      expect(result.tithi.name).toBe('Amavasya');
    });

    it('handles exact 12° boundary transitions across all 30 Tithis', () => {
      for (let t = 1; t <= 30; t++) {
        // Test midpoint of each Tithi
        const elongation = (t - 1) * 12 + 6.0;
        const result = calculator.calculatePanchang(0.0, elongation, testDate);
        expect(result.tithi.index).toBe(t);
        if (t <= 15) {
          expect(result.tithi.paksha).toBe('SUKLA');
        } else {
          expect(result.tithi.paksha).toBe('KRISHNA');
        }
      }
    });

    it('handles exact boundary at 0° / 360° without NaN or index overflow', () => {
      const result0 = calculator.calculatePanchang(0.0, 0.0, testDate);
      expect(result0.tithi.index).toBe(1);

      const result360 = calculator.calculatePanchang(0.0, 360.0, testDate);
      expect(result360.tithi.index).toBe(1);

      const resultJustBefore = calculator.calculatePanchang(0.0, 359.9999, testDate);
      expect(resultJustBefore.tithi.index).toBe(30);
      expect(resultJustBefore.tithi.name).toBe('Amavasya');
    });
  });

  describe('2. Vara (Weekday & Planetary Lord)', () => {
    it('correctly maps all 7 days of the week to traditional Sanskrit names and planetary rulers', () => {
      // 2026-08-23 is Sunday, 2026-08-24 is Monday, ..., 2026-08-29 is Saturday
      const expectedDays = [
        { date: '2026-08-23T12:00:00Z', index: 0, name: 'Ravivara', lord: PlanetSymbol.SUN },
        { date: '2026-08-24T12:00:00Z', index: 1, name: 'Somavara', lord: PlanetSymbol.MOON },
        { date: '2026-08-25T12:00:00Z', index: 2, name: 'Mangalavara', lord: PlanetSymbol.MARS },
        { date: '2026-08-26T12:00:00Z', index: 3, name: 'Budhavara', lord: PlanetSymbol.MERCURY },
        { date: '2026-08-27T12:00:00Z', index: 4, name: 'Guruvara', lord: PlanetSymbol.JUPITER },
        { date: '2026-08-28T12:00:00Z', index: 5, name: 'Shukravara', lord: PlanetSymbol.VENUS },
        { date: '2026-08-29T12:00:00Z', index: 6, name: 'Shanivara', lord: PlanetSymbol.SATURN },
      ];

      for (const d of expectedDays) {
        const res = calculator.calculatePanchang(0.0, 10.0, new Date(d.date));
        expect(res.vara.dayIndex).toBe(d.index);
        expect(res.vara.name).toBe(d.name);
        expect(res.vara.lord).toBe(d.lord);
      }
    });
  });

  describe('3. Nakshatra & Pada Consistency', () => {
    it('reproduces exact Nakshatra name, lord, and Pada from canonical Moon longitude', () => {
      // 0° is Ashwini Pada 1 (Ketu)
      const res0 = calculator.calculatePanchang(0.0, 0.0, testDate);
      expect(res0.nakshatra.index).toBe(1);
      expect(res0.nakshatra.name).toBe('Ashwini');
      expect(res0.nakshatra.lord).toBe(PlanetSymbol.KETU);
      expect(res0.nakshatra.pada).toBe(1);

      // 45° is Rohini Pada 2 (Moon)
      const resRohini = calculator.calculatePanchang(0.0, 45.0, testDate);
      expect(resRohini.nakshatra.index).toBe(4);
      expect(resRohini.nakshatra.name).toBe('Rohini');
      expect(resRohini.nakshatra.lord).toBe(PlanetSymbol.MOON);
      expect(resRohini.nakshatra.pada).toBe(2);
    });
  });

  describe('4. Panchanga Soli-Lunar Yoga', () => {
    it('calculates correct Yoga index and name based on (Sun + Moon) modulo 360', () => {
      // Sun 10° + Moon 20° = 30°. 30° / (360/27 = 13.3333) = 2.25 -> Index 3 (Ayushman)
      const res = calculator.calculatePanchang(10.0, 20.0, testDate);
      expect(res.yoga.index).toBe(3);
      expect(res.yoga.name).toBe('Ayushman');
      expect(res.yoga.completionPercentage).toBeGreaterThan(0);
      expect(res.yoga.completionPercentage).toBeLessThan(100);
    });

    it('covers all 27 Panchanga Yogas across 360 degrees', () => {
      const span = 360 / 27;
      for (let y = 1; y <= 27; y++) {
        const sum = (y - 1) * span + span / 2;
        const res = calculator.calculatePanchang(0.0, sum, testDate);
        expect(res.yoga.index).toBe(y);
        expect(res.yoga.name).toBe(YOGA_NAMES[y - 1]);
      }
    });
  });

  describe('5. Karana Classical Fixed and Movable Sequence', () => {
    it('correctly maps Karana 1 to Kimstughna (Fixed, 1st half of Shukla Pratipada)', () => {
      // Elongation 3° (within 0°..6°) -> Karana 1
      const res = calculator.calculatePanchang(0.0, 3.0, testDate);
      expect(res.karana.index).toBe(1);
      expect(res.karana.name).toBe('Kimstughna');
      expect(res.karana.type).toBe('FIXED');
    });

    it('correctly maps repeating Karanas 2 through 57 in an 8-cycle sequence', () => {
      // Karana 2 (6°..12°) is Bava
      const res2 = calculator.calculatePanchang(0.0, 9.0, testDate);
      expect(res2.karana.index).toBe(2);
      expect(res2.karana.name).toBe('Bava');
      expect(res2.karana.type).toBe('MOVABLE');

      // Karana 3 (12°..18°) is Balava
      const res3 = calculator.calculatePanchang(0.0, 15.0, testDate);
      expect(res3.karana.index).toBe(3);
      expect(res3.karana.name).toBe('Balava');
      expect(res3.karana.type).toBe('MOVABLE');

      // Karana 8 (42°..48°) is Vishti (end of 1st 7-fold cycle)
      const res8 = calculator.calculatePanchang(0.0, 45.0, testDate);
      expect(res8.karana.index).toBe(8);
      expect(res8.karana.name).toBe('Vishti');
      expect(res8.karana.type).toBe('MOVABLE');

      // Karana 57 (336°..342°) is Vishti (8th cycle end)
      const res57 = calculator.calculatePanchang(0.0, 339.0, testDate);
      expect(res57.karana.index).toBe(57);
      expect(res57.karana.name).toBe('Vishti');
      expect(res57.karana.type).toBe('MOVABLE');
    });

    it('correctly maps the 3 final Fixed Karanas: 58 (Shakuni), 59 (Chatushpada), 60 (Naga)', () => {
      // Karana 58 (342°..348°) -> 2nd half of Krishna 14 = Shakuni
      const res58 = calculator.calculatePanchang(0.0, 345.0, testDate);
      expect(res58.karana.index).toBe(58);
      expect(res58.karana.name).toBe('Shakuni');
      expect(res58.karana.type).toBe('FIXED');

      // Karana 59 (348°..354°) -> 1st half of Amavasya = Chatushpada
      const res59 = calculator.calculatePanchang(0.0, 351.0, testDate);
      expect(res59.karana.index).toBe(59);
      expect(res59.karana.name).toBe('Chatushpada');
      expect(res59.karana.type).toBe('FIXED');

      // Karana 60 (354°..360°) -> 2nd half of Amavasya = Naga
      const res60 = calculator.calculatePanchang(0.0, 357.0, testDate);
      expect(res60.karana.index).toBe(60);
      expect(res60.karana.name).toBe('Naga');
      expect(res60.karana.type).toBe('FIXED');
    });
  });

  describe('6. Sunrise, Sunset & Day Length (Step 9)', () => {
    it('calculates deterministic Sunrise and Sunset for New Delhi', () => {
      const sunDelhi = calculator.calculateSunriseSunset(testDate, 28.6139, 77.209);

      expect(sunDelhi.sunriseIso).toBeDefined();
      expect(sunDelhi.sunsetIso).toBeDefined();
      expect(sunDelhi.dayLengthMinutes).toBeGreaterThan(600); // More than 10 hours in August
      expect(sunDelhi.dayLengthMinutes).toBeLessThan(900); // Less than 15 hours

      const riseMs = new Date(sunDelhi.sunriseIso).getTime();
      const setMs = new Date(sunDelhi.sunsetIso).getTime();
      expect(setMs).toBeGreaterThan(riseMs);
    });

    it('calculates deterministic Sunrise and Sunset for London', () => {
      const sunLondon = calculator.calculateSunriseSunset(testDate, 51.5074, -0.1278);

      expect(sunLondon.sunriseIso).toBeDefined();
      expect(sunLondon.sunsetIso).toBeDefined();
      expect(sunLondon.dayLengthMinutes).toBeGreaterThan(700); // Long summer day in London
    });
  });

  describe('7. Rahu Kala (Step 11)', () => {
    it('divides daytime into 8 equal parts and maps segments correctly across all 7 days', () => {
      const sunrise = '2026-08-24T06:00:00.000Z';
      const sunset = '2026-08-24T18:00:00.000Z'; // 12 hours daytime = 90 minutes per segment

      // Monday (dayIndex 1): segment 2 (07:30 to 09:00 UTC)
      const rkMon = calculator.calculateRahuKala(sunrise, sunset, 1);
      expect(rkMon.segmentIndex).toBe(2);
      expect(rkMon.startIso).toBe('2026-08-24T07:30:00.000Z');
      expect(rkMon.endIso).toBe('2026-08-24T09:00:00.000Z');

      // Sunday (dayIndex 0): segment 8 (16:30 to 18:00 UTC)
      const rkSun = calculator.calculateRahuKala(sunrise, sunset, 0);
      expect(rkSun.segmentIndex).toBe(8);
      expect(rkSun.startIso).toBe('2026-08-24T16:30:00.000Z');
      expect(rkSun.endIso).toBe('2026-08-24T18:00:00.000Z');

      // Saturday (dayIndex 6): segment 3 (09:00 to 10:30 UTC)
      const rkSat = calculator.calculateRahuKala(sunrise, sunset, 6);
      expect(rkSat.segmentIndex).toBe(3);
      expect(rkSat.startIso).toBe('2026-08-24T09:00:00.000Z');
      expect(rkSat.endIso).toBe('2026-08-24T10:30:00.000Z');
    });
  });

  describe('8. Hindu Calendar Date & Masa (Steps 14, 15, 16)', () => {
    it('derives Amanta and Purnimanta Masa, Paksha, and Solar Rashi', () => {
      const res = calculator.calculatePanchang(130.0, 140.0, testDate);

      expect(res.hinduCalendar).toBeDefined();
      expect(typeof res.hinduCalendar!.amantaMasa).toBe('string');
      expect(typeof res.hinduCalendar!.purnimantaMasa).toBe('string');
      expect(['SUKLA', 'KRISHNA']).toContain(res.hinduCalendar!.paksha);
      expect(typeof res.hinduCalendar!.solarRashi).toBe('string');
      expect(res.hinduCalendar!.solarRashiIndex).toBeGreaterThanOrEqual(1);
      expect(res.hinduCalendar!.solarRashiIndex).toBeLessThanOrEqual(12);
    });
  });

  describe('9. Daily Panchanga with Civil Day Transitions (Steps 12 & 13)', () => {
    it('assembles complete daily Panchang for New Delhi with chronologically ordered transition events', () => {
      const daily = calculator.calculateDailyPanchang(testDate, 28.6139, 77.209, 'Asia/Kolkata');

      expect(daily.date).toBe('2026-08-24');
      expect(daily.location.latitude).toBe(28.6139);
      expect(daily.location.longitude).toBe(77.209);
      expect(daily.sun).toBeDefined();
      expect(daily.rahuKala).toBeDefined();
      expect(daily.hinduCalendar).toBeDefined();
      expect(daily.instantaneous).toBeDefined();

      // Check transitions
      expect(Array.isArray(daily.transitions)).toBe(true);
      expect(daily.transitions.length).toBeGreaterThanOrEqual(2); // At least sunrise & sunset

      // Invariant: Transitions are strictly ordered chronologically
      for (let i = 0; i < daily.transitions.length - 1; i++) {
        const t1 = new Date(daily.transitions[i].timestampIso).getTime();
        const t2 = new Date(daily.transitions[i + 1].timestampIso).getTime();
        expect(t2).toBeGreaterThanOrEqual(t1);
      }
    });
  });

  describe('10. Determinism & Repeatability (Step 19)', () => {
    it('produces 100% identical outputs for repeated invocations with identical arguments', () => {
      const run1 = calculator.calculateDailyPanchang(testDate, 28.6139, 77.209, 'Asia/Kolkata');
      const run2 = calculator.calculateDailyPanchang(testDate, 28.6139, 77.209, 'Asia/Kolkata');

      expect(JSON.stringify(run1)).toBe(JSON.stringify(run2));
    });
  });
});

