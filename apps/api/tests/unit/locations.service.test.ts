import { describe, it, expect, beforeEach } from 'vitest';
import { LocationService } from '../../src/modules/locations/locations.service';

describe('LocationService Unit Tests', () => {
  let locationService: LocationService;

  beforeEach(() => {
    locationService = new LocationService();
    locationService.clearCache();
  });

  it('should return empty results for queries shorter than 2 characters', async () => {
    const results1 = await locationService.searchPlaces('');
    const results2 = await locationService.searchPlaces('a');
    expect(results1).toEqual([]);
    expect(results2).toEqual([]);
  });

  it('should return verified locations for "Delhi" with coordinates and IANA timezone', async () => {
    const results = await locationService.searchPlaces('Delhi');
    expect(results.length).toBeGreaterThan(0);
    const delhi = results[0];
    expect(delhi.name).toBeDefined();
    expect(delhi.displayName).toContain('Delhi');
    expect(delhi.country).toBe('India');
    expect(delhi.countryCode).toBe('IN');
    expect(delhi.latitude).toBeCloseTo(28.6139, 1);
    expect(delhi.longitude).toBeCloseTo(77.2090, 1);
    expect(delhi.timezone).toBe('Asia/Kolkata');
  });

  it('should return verified locations for "London" with Europe/London timezone', async () => {
    const results = await locationService.searchPlaces('London');
    expect(results.length).toBeGreaterThan(0);
    const london = results.find((r) => r.countryCode === 'GB' || r.country === 'United Kingdom');
    expect(london).toBeDefined();
    expect(london!.timezone).toBe('Europe/London');
    expect(london!.latitude).toBeCloseTo(51.5074, 1);
    expect(london!.longitude).toBeCloseTo(-0.1278, 1);
  });

  it('should return verified locations for "New York" with America/New_York timezone', async () => {
    const results = await locationService.searchPlaces('New York');
    expect(results.length).toBeGreaterThan(0);
    const ny = results.find((r) => r.countryCode === 'US' || r.country === 'United States');
    expect(ny).toBeDefined();
    expect(ny!.timezone).toBe('America/New_York');
    expect(ny!.latitude).toBeCloseTo(40.7128, 1);
    expect(ny!.longitude).toBeCloseTo(-74.0060, 1);
  });

  it('should return verified locations for "Sydney" with Australia/Sydney timezone', async () => {
    const results = await locationService.searchPlaces('Sydney');
    expect(results.length).toBeGreaterThan(0);
    const sydney = results.find((r) => r.countryCode === 'AU' || r.country === 'Australia');
    expect(sydney).toBeDefined();
    expect(sydney!.timezone).toBe('Australia/Sydney');
    expect(sydney!.latitude).toBeCloseTo(-33.8688, 1);
    expect(sydney!.longitude).toBeCloseTo(151.2093, 1);
  });

  it('should cache repeated searches and return identical results', async () => {
    const res1 = await locationService.searchPlaces('Mumbai');
    const res2 = await locationService.searchPlaces('Mumbai');
    expect(res1).toEqual(res2);
  });

  it('should correctly validate IANA timezones', () => {
    expect(locationService.isValidIanaTimezone('Asia/Kolkata')).toBe(true);
    expect(locationService.isValidIanaTimezone('Europe/London')).toBe(true);
    expect(locationService.isValidIanaTimezone('America/New_York')).toBe(true);
    expect(locationService.isValidIanaTimezone('Australia/Sydney')).toBe(true);
    expect(locationService.isValidIanaTimezone('UTC')).toBe(true);

    expect(locationService.isValidIanaTimezone('Invalid/Timezone_Name')).toBe(false);
    expect(locationService.isValidIanaTimezone('')).toBe(false);
  });
});
