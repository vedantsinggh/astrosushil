import { describe, it, expect } from 'vitest';
import {
  createUnconfirmedAstrologyConfig,
  validateRequiredMethodology,
  CLIENT_CONFIRMATION_REQUIRED,
} from '../../src/configuration/astrology-config';
import { UnconfirmedMethodologyError } from '../../src/errors/astrology.error';
import { ChartCalculator } from '../../src/chart/chart-calculator';
import { MockEphemerisProvider } from '../../src/ephemeris/mock-ephemeris.provider';

describe('AstrologyConfig & Methodology Validation Unit Tests', () => {
  it('should initialize config with explicit CLIENT_CONFIRMATION_REQUIRED values', () => {
    const config = createUnconfirmedAstrologyConfig();
    expect(config.zodiacType).toBe(CLIENT_CONFIRMATION_REQUIRED);
    expect(config.ayanamsa).toBe(CLIENT_CONFIRMATION_REQUIRED);
    expect(config.houseSystem).toBe(CLIENT_CONFIRMATION_REQUIRED);
    expect(config.nodeCalculation).toBe(CLIENT_CONFIRMATION_REQUIRED);
  });

  it('should throw UnconfirmedMethodologyError when validating CLIENT_CONFIRMATION_REQUIRED setting', () => {
    expect(() =>
      validateRequiredMethodology(CLIENT_CONFIRMATION_REQUIRED, 'zodiacType')
    ).toThrow(UnconfirmedMethodologyError);
  });

  it('should pass validation when methodology value is explicitly confirmed', () => {
    const result = validateRequiredMethodology('SIDEREAL', 'zodiacType');
    expect(result).toBe('SIDEREAL');
  });

  it('ChartCalculator should throw UnconfirmedMethodologyError when given unconfirmed config', async () => {
    const calculator = new ChartCalculator(new MockEphemerisProvider());
    const unconfirmedConfig = createUnconfirmedAstrologyConfig();

    const details = {
      date: { year: 1990, month: 5, day: 15 },
      time: { hour: 14, minute: 30, second: 0 },
      timezone: 'Asia/Kolkata',
      latitude: 28.6139,
      longitude: 77.209,
    };

    await expect(calculator.calculateChart(details, unconfirmedConfig)).rejects.toThrow(
      UnconfirmedMethodologyError
    );
  });
});
