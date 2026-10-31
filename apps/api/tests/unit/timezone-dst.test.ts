import { describe, it, expect } from 'vitest';
import { normalizeBirthProfile } from '../../src/utils/birth-details-normalizer';

describe('Multi-Continent Timezone & Historical DST Conversion Tests', () => {
  // 1. INDIA (Asia/Kolkata: UTC+05:30 year-round, no DST)
  it('should correctly convert India (Asia/Kolkata) birth time to UTC', () => {
    const details = normalizeBirthProfile({
      name: 'Rohan Sharma',
      dateOfBirth: '1990-08-15',
      timeOfBirth: '14:30:00',
      latitude: 28.6139,
      longitude: 77.2090,
      timezone: 'Asia/Kolkata',
      placeName: 'New Delhi, India',
    });

    expect(details.timezoneOffsetMinutes).toBe(330); // +5:30 = 330 minutes
    // 14:30 IST - 5:30 = 09:00 UTC
    expect(details.utcDateTime).toBe('1990-08-15T09:00:00.000Z');
  });

  // 2. UNITED KINGDOM (Europe/London: BST = UTC+1 in Summer, GMT = UTC+0 in Winter)
  it('should correctly handle UK (Europe/London) Summer Time (BST = UTC+1)', () => {
    const details = normalizeBirthProfile({
      name: 'Arthur Pendelton',
      dateOfBirth: '1985-07-15', // Summer (BST active)
      timeOfBirth: '14:30:00',
      latitude: 51.5074,
      longitude: -0.1278,
      timezone: 'Europe/London',
      placeName: 'London, UK',
    });

    expect(details.timezoneOffsetMinutes).toBe(60); // BST is UTC+1 (60 minutes)
    // 14:30 BST - 1 hour = 13:30 UTC
    expect(details.utcDateTime).toBe('1985-07-15T13:30:00.000Z');
  });

  it('should correctly handle UK (Europe/London) Winter Time (GMT = UTC+0)', () => {
    const details = normalizeBirthProfile({
      name: 'Arthur Pendelton',
      dateOfBirth: '1985-01-15', // Winter (GMT active)
      timeOfBirth: '14:30:00',
      latitude: 51.5074,
      longitude: -0.1278,
      timezone: 'Europe/London',
      placeName: 'London, UK',
    });

    expect(details.timezoneOffsetMinutes).toBe(0); // GMT is UTC+0
    expect(details.utcDateTime).toBe('1985-01-15T14:30:00.000Z');
  });

  // 3. UNITED STATES (America/New_York: EDT = UTC-4 in Summer, EST = UTC-5 in Winter)
  it('should correctly handle US Eastern Daylight Time (EDT = UTC-4)', () => {
    const details = normalizeBirthProfile({
      name: 'John Miller',
      dateOfBirth: '1992-06-20', // Summer (EDT active)
      timeOfBirth: '10:00:00',
      latitude: 40.7128,
      longitude: -74.0060,
      timezone: 'America/New_York',
      placeName: 'New York, USA',
    });

    expect(details.timezoneOffsetMinutes).toBe(-240); // EDT is UTC-4 (-240 mins)
    // 10:00 EDT - (-4) = 14:00 UTC
    expect(details.utcDateTime).toBe('1992-06-20T14:00:00.000Z');
  });

  it('should correctly handle US Eastern Standard Time (EST = UTC-5)', () => {
    const details = normalizeBirthProfile({
      name: 'John Miller',
      dateOfBirth: '1992-12-20', // Winter (EST active)
      timeOfBirth: '10:00:00',
      latitude: 40.7128,
      longitude: -74.0060,
      timezone: 'America/New_York',
      placeName: 'New York, USA',
    });

    expect(details.timezoneOffsetMinutes).toBe(-300); // EST is UTC-5 (-300 mins)
    // 10:00 EST - (-5) = 15:00 UTC
    expect(details.utcDateTime).toBe('1992-12-20T15:00:00.000Z');
  });

  // 4. AUSTRALIA (Australia/Sydney: Southern Summer AEDT = UTC+11, Winter AEST = UTC+10)
  it('should correctly handle Australia/Sydney Summer Time (AEDT = UTC+11)', () => {
    const details = normalizeBirthProfile({
      name: 'Liam Smith',
      dateOfBirth: '1996-01-10', // Southern Hemisphere Summer (AEDT active)
      timeOfBirth: '08:00:00',
      latitude: -33.8688,
      longitude: 151.2093,
      timezone: 'Australia/Sydney',
      placeName: 'Sydney, Australia',
    });

    expect(details.timezoneOffsetMinutes).toBe(660); // AEDT is UTC+11 (660 mins)
    // 08:00 AEDT - 11 hours = 21:00 UTC previous day
    expect(details.utcDateTime).toBe('1996-01-09T21:00:00.000Z');
  });

  it('should correctly handle Australia/Sydney Standard Time (AEST = UTC+10)', () => {
    const details = normalizeBirthProfile({
      name: 'Liam Smith',
      dateOfBirth: '1996-07-10', // Southern Hemisphere Winter (AEST active)
      timeOfBirth: '08:00:00',
      latitude: -33.8688,
      longitude: 151.2093,
      timezone: 'Australia/Sydney',
      placeName: 'Sydney, Australia',
    });

    expect(details.timezoneOffsetMinutes).toBe(600); // AEST is UTC+10 (600 mins)
    // 08:00 AEST - 10 hours = 22:00 UTC previous day
    expect(details.utcDateTime).toBe('1996-07-09T22:00:00.000Z');
  });
});
