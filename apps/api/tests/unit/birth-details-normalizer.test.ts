import { describe, it, expect } from 'vitest';
import { normalizeBirthProfile } from '../../src/utils/birth-details-normalizer';
import { ValidationError } from '../../src/errors/app-error';

describe('Birth Details Normalizer Utility', () => {
  it('should correctly normalize valid birth details for IST (Asia/Kolkata)', () => {
    const normalized = normalizeBirthProfile({
      name: 'Sushil Kumar',
      dateOfBirth: '1990-05-15',
      timeOfBirth: '14:30:00',
      latitude: 28.6139,
      longitude: 77.209,
      timezone: 'Asia/Kolkata',
      placeName: 'New Delhi, India',
    });

    expect(normalized.name).toBe('Sushil Kumar');
    expect(normalized.localDateTime).toBe('1990-05-15T14:30:00');
    expect(normalized.timezone).toBe('Asia/Kolkata');
    expect(normalized.timezoneOffsetMinutes).toBe(330); // IST is +5:30 (330 mins)
    expect(normalized.utcDateTime).toBe('1990-05-15T09:00:00.000Z');
    expect(normalized.latitude).toBe(28.6139);
    expect(normalized.longitude).toBe(77.209);
    expect(normalized.placeName).toBe('New Delhi, India');
  });

  it('should throw ValidationError for invalid latitude out of range', () => {
    expect(() =>
      normalizeBirthProfile({
        name: 'Test',
        dateOfBirth: '1990-05-15',
        timeOfBirth: '14:30:00',
        latitude: 95.0, // Invalid > 90
        longitude: 77.209,
        timezone: 'Asia/Kolkata',
      })
    ).toThrow(ValidationError);
  });

  it('should throw ValidationError for invalid longitude out of range', () => {
    expect(() =>
      normalizeBirthProfile({
        name: 'Test',
        dateOfBirth: '1990-05-15',
        timeOfBirth: '14:30:00',
        latitude: 28.6139,
        longitude: -190.0, // Invalid < -180
        timezone: 'Asia/Kolkata',
      })
    ).toThrow(ValidationError);
  });

  it('should throw ValidationError for invalid date format', () => {
    expect(() =>
      normalizeBirthProfile({
        name: 'Test',
        dateOfBirth: '15-05-1990', // Invalid format
        timeOfBirth: '14:30:00',
        latitude: 28.6139,
        longitude: 77.209,
        timezone: 'Asia/Kolkata',
      })
    ).toThrow(ValidationError);
  });

  it('should throw ValidationError for invalid timezone string', () => {
    expect(() =>
      normalizeBirthProfile({
        name: 'Test',
        dateOfBirth: '1990-05-15',
        timeOfBirth: '14:30:00',
        latitude: 28.6139,
        longitude: 77.209,
        timezone: 'Invalid/NonExistentTimezone',
      })
    ).toThrow(ValidationError);
  });
});
