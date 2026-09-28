import { describe, it, expect } from 'vitest';
import { SadeSatiCalculator } from '../../src/transit/sade-sati-calculator';

describe('Sade Sati & Dhaiyya Engine Tests', () => {
  it('should detect Phase 1 (Setting) when Saturn is in 12th from Moon', () => {
    const natalMoonLong = 45.0; // Taurus (2)
    const saturnTransitLong = 15.0; // Aries (1) -> 12th from Taurus

    const report = SadeSatiCalculator.evaluateSadeSati(natalMoonLong, saturnTransitLong);
    expect(report.isSadeSatiActive).toBe(true);
    expect(report.phase).toBe('PHASE_1_SETTING');
    expect(report.houseFromMoon).toBe(12);
  });

  it('should detect Phase 2 (Peak) when Saturn is in same sign as Moon', () => {
    const natalMoonLong = 45.0; // Taurus (2)
    const saturnTransitLong = 50.0; // Taurus (2) -> 1st from Taurus

    const report = SadeSatiCalculator.evaluateSadeSati(natalMoonLong, saturnTransitLong);
    expect(report.isSadeSatiActive).toBe(true);
    expect(report.phase).toBe('PHASE_2_PEAK');
    expect(report.houseFromMoon).toBe(1);
  });

  it('should detect Phase 3 (Rising) when Saturn is in 2nd from Moon', () => {
    const natalMoonLong = 45.0; // Taurus (2)
    const saturnTransitLong = 75.0; // Gemini (3) -> 2nd from Taurus

    const report = SadeSatiCalculator.evaluateSadeSati(natalMoonLong, saturnTransitLong);
    expect(report.isSadeSatiActive).toBe(true);
    expect(report.phase).toBe('PHASE_3_RISING');
    expect(report.houseFromMoon).toBe(2);
  });

  it('should detect Dhaiyya Kantaka (4th) and Ashtama (8th) from Moon', () => {
    const natalMoonLong = 45.0; // Taurus (2)
    const saturnTransit4th = 135.0; // Leo (5) -> 4th from Taurus
    const report4th = SadeSatiCalculator.evaluateSadeSati(natalMoonLong, saturnTransit4th);
    expect(report4th.isDhaiyyaActive).toBe(true);
    expect(report4th.dhaiyyaType).toBe('KANTAKA_4TH');

    const saturnTransit8th = 255.0; // Sagittarius (9) -> 8th from Taurus
    const report8th = SadeSatiCalculator.evaluateSadeSati(natalMoonLong, saturnTransit8th);
    expect(report8th.isDhaiyyaActive).toBe(true);
    expect(report8th.dhaiyyaType).toBe('ASHTAMA_8TH');
  });
});
