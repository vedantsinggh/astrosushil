import { describe, it, expect } from 'vitest';
import { validateBirthDetails, normalizeBirthTime } from '../../src/validation/birth-details.validator';
import { BirthDetailsValidationError } from '../../src/errors/astrology.error';

describe('BirthDetails Validation & Normalization Unit Tests', () => {
  const validDetails = {
    date: { year: 1990, month: 5, day: 15 },
    time: { hour: 14, minute: 30, second: 0 },
    timezone: 'Asia/Kolkata',
    latitude: 28.6139,
    longitude: 77.209,
    placeName: 'New Delhi, India',
  };

  it('should validate valid birth details without throwing', () => {
    const validated = validateBirthDetails(validDetails);
    expect(validated).toEqual(validDetails);
  });

  it('should preserve original local date and time untouched during normalization', () => {
    const normalized = normalizeBirthTime(validDetails);
    expect(normalized.originalDetails.date).toEqual({ year: 1990, month: 5, day: 15 });
    expect(normalized.originalDetails.time).toEqual({ hour: 14, minute: 30, second: 0 });
    expect(normalized.originalDetails.timezone).toBe('Asia/Kolkata');
    expect(normalized.utcIsoString).toBe('1990-05-15T09:00:00.000Z');
    expect(normalized.timezoneOffsetMinutes).toBe(330); // IST +5:30
  });

  it('should throw BirthDetailsValidationError for invalid month > 12', () => {
    expect(() =>
      validateBirthDetails({
        ...validDetails,
        date: { year: 1990, month: 13, day: 15 },
      })
    ).toThrow(BirthDetailsValidationError);
  });

  it('should throw BirthDetailsValidationError for invalid day in February non-leap year', () => {
    expect(() =>
      validateBirthDetails({
        ...validDetails,
        date: { year: 1991, month: 2, day: 29 },
      })
    ).toThrow(BirthDetailsValidationError);
  });

  it('should throw BirthDetailsValidationError for latitude out of range > 90', () => {
    expect(() =>
      validateBirthDetails({
        ...validDetails,
        latitude: 95.0,
      })
    ).toThrow(BirthDetailsValidationError);
  });

  it('should throw BirthDetailsValidationError for invalid IANA timezone', () => {
    expect(() =>
      validateBirthDetails({
        ...validDetails,
        timezone: 'NonExistent/Timezone',
      })
    ).toThrow(BirthDetailsValidationError);
  });
});
