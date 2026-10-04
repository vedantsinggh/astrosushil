import { LocationSearchResult } from '@astro/shared';
import { logger } from '../../utils/logger';

interface CacheEntry {
  data: LocationSearchResult[];
  timestamp: number;
}

/**
 * Built-in fallback catalog of major world cities to ensure seamless offline,
 * resilient, and high-performance search responses even under provider downtime.
 */
const MAJOR_CITIES_CATALOG: LocationSearchResult[] = [
  {
    id: 'geo-in-delhi',
    name: 'New Delhi',
    displayName: 'New Delhi, Delhi, India',
    country: 'India',
    countryCode: 'IN',
    state: 'Delhi',
    latitude: 28.6139,
    longitude: 77.2090,
    timezone: 'Asia/Kolkata',
  },
  {
    id: 'geo-in-mumbai',
    name: 'Mumbai',
    displayName: 'Mumbai, Maharashtra, India',
    country: 'India',
    countryCode: 'IN',
    state: 'Maharashtra',
    latitude: 19.0760,
    longitude: 72.8777,
    timezone: 'Asia/Kolkata',
  },
  {
    id: 'geo-in-bengaluru',
    name: 'Bengaluru',
    displayName: 'Bengaluru, Karnataka, India',
    country: 'India',
    countryCode: 'IN',
    state: 'Karnataka',
    latitude: 12.9716,
    longitude: 77.5946,
    timezone: 'Asia/Kolkata',
  },
  {
    id: 'geo-in-kolkata',
    name: 'Kolkata',
    displayName: 'Kolkata, West Bengal, India',
    country: 'India',
    countryCode: 'IN',
    state: 'West Bengal',
    latitude: 22.5726,
    longitude: 88.3639,
    timezone: 'Asia/Kolkata',
  },
  {
    id: 'geo-in-chennai',
    name: 'Chennai',
    displayName: 'Chennai, Tamil Nadu, India',
    country: 'India',
    countryCode: 'IN',
    state: 'Tamil Nadu',
    latitude: 13.0827,
    longitude: 80.2707,
    timezone: 'Asia/Kolkata',
  },
  {
    id: 'geo-in-hyderabad',
    name: 'Hyderabad',
    displayName: 'Hyderabad, Telangana, India',
    country: 'India',
    countryCode: 'IN',
    state: 'Telangana',
    latitude: 17.3850,
    longitude: 78.4867,
    timezone: 'Asia/Kolkata',
  },
  {
    id: 'geo-in-ahmedabad',
    name: 'Ahmedabad',
    displayName: 'Ahmedabad, Gujarat, India',
    country: 'India',
    countryCode: 'IN',
    state: 'Gujarat',
    latitude: 23.0225,
    longitude: 72.5714,
    timezone: 'Asia/Kolkata',
  },
  {
    id: 'geo-in-pune',
    name: 'Pune',
    displayName: 'Pune, Maharashtra, India',
    country: 'India',
    countryCode: 'IN',
    state: 'Maharashtra',
    latitude: 18.5204,
    longitude: 73.8567,
    timezone: 'Asia/Kolkata',
  },
  {
    id: 'geo-in-jaipur',
    name: 'Jaipur',
    displayName: 'Jaipur, Rajasthan, India',
    country: 'India',
    countryCode: 'IN',
    state: 'Rajasthan',
    latitude: 26.9124,
    longitude: 75.7873,
    timezone: 'Asia/Kolkata',
  },
  {
    id: 'geo-in-lucknow',
    name: 'Lucknow',
    displayName: 'Lucknow, Uttar Pradesh, India',
    country: 'India',
    countryCode: 'IN',
    state: 'Uttar Pradesh',
    latitude: 26.8467,
    longitude: 80.9462,
    timezone: 'Asia/Kolkata',
  },
  {
    id: 'geo-gb-london',
    name: 'London',
    displayName: 'London, Greater London, United Kingdom',
    country: 'United Kingdom',
    countryCode: 'GB',
    state: 'England',
    latitude: 51.5074,
    longitude: -0.1278,
    timezone: 'Europe/London',
  },
  {
    id: 'geo-us-newyork',
    name: 'New York',
    displayName: 'New York, New York, United States',
    country: 'United States',
    countryCode: 'US',
    state: 'New York',
    latitude: 40.7128,
    longitude: -74.0060,
    timezone: 'America/New_York',
  },
  {
    id: 'geo-us-sanfrancisco',
    name: 'San Francisco',
    displayName: 'San Francisco, California, United States',
    country: 'United States',
    countryCode: 'US',
    state: 'California',
    latitude: 37.7749,
    longitude: -122.4194,
    timezone: 'America/Los_Angeles',
  },
  {
    id: 'geo-us-chicago',
    name: 'Chicago',
    displayName: 'Chicago, Illinois, United States',
    country: 'United States',
    countryCode: 'US',
    state: 'Illinois',
    latitude: 41.8781,
    longitude: -87.6298,
    timezone: 'America/Chicago',
  },
  {
    id: 'geo-ae-dubai',
    name: 'Dubai',
    displayName: 'Dubai, Dubai, United Arab Emirates',
    country: 'United Arab Emirates',
    countryCode: 'AE',
    state: 'Dubai',
    latitude: 25.2048,
    longitude: 55.2708,
    timezone: 'Asia/Dubai',
  },
  {
    id: 'geo-sg-singapore',
    name: 'Singapore',
    displayName: 'Singapore, Singapore',
    country: 'Singapore',
    countryCode: 'SG',
    latitude: 1.3521,
    longitude: 103.8198,
    timezone: 'Asia/Singapore',
  },
  {
    id: 'geo-au-sydney',
    name: 'Sydney',
    displayName: 'Sydney, New South Wales, Australia',
    country: 'Australia',
    countryCode: 'AU',
    state: 'New South Wales',
    latitude: -33.8688,
    longitude: 151.2093,
    timezone: 'Australia/Sydney',
  },
  {
    id: 'geo-au-melbourne',
    name: 'Melbourne',
    displayName: 'Melbourne, Victoria, Australia',
    country: 'Australia',
    countryCode: 'AU',
    state: 'Victoria',
    latitude: -37.8136,
    longitude: 144.9631,
    timezone: 'Australia/Melbourne',
  },
  {
    id: 'geo-ca-toronto',
    name: 'Toronto',
    displayName: 'Toronto, Ontario, Canada',
    country: 'Canada',
    countryCode: 'CA',
    state: 'Ontario',
    latitude: 43.6532,
    longitude: -79.3832,
    timezone: 'America/Toronto',
  },
  {
    id: 'geo-jp-tokyo',
    name: 'Tokyo',
    displayName: 'Tokyo, Tokyo, Japan',
    country: 'Japan',
    countryCode: 'JP',
    state: 'Tokyo',
    latitude: 35.6762,
    longitude: 139.6503,
    timezone: 'Asia/Tokyo',
  },
];

export class LocationService {
  private cache = new Map<string, CacheEntry>();
  private readonly CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
  private readonly MAX_CACHE_SIZE = 1000;

  /**
   * Search for geographic locations/cities worldwide by name.
   * Returns canonical results with verified latitude, longitude, and IANA timezone.
   */
  public async searchPlaces(query: string, limit: number = 10): Promise<LocationSearchResult[]> {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      return [];
    }

    const normalizedKey = trimmed.toLowerCase();

    // 1. Check in-memory cache
    const cached = this.cache.get(normalizedKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
      return cached.data.slice(0, limit);
    }

    // 2. Fetch from Geocoding Provider (Open-Meteo Geocoding API)
    try {
      const results = await this.fetchFromProvider(trimmed, limit);
      if (results && results.length > 0) {
        this.setCache(normalizedKey, results);
        return results.slice(0, limit);
      }
    } catch (err) {
      logger.warn(
        { query: trimmed, error: err instanceof Error ? err.message : String(err) },
        '[LocationService] Geocoding provider request failed, falling back to local catalog'
      );
    }

    // 3. Fallback to local catalog
    const fallbackResults = this.searchCatalog(trimmed, limit);
    if (fallbackResults.length > 0) {
      this.setCache(normalizedKey, fallbackResults);
    }
    return fallbackResults;
  }

  /**
   * Fetches location autocomplete from Open-Meteo Geocoding API.
   * Open-Meteo provides accurate latitude, longitude, elevation, and IANA timezone without API keys.
   */
  private async fetchFromProvider(query: string, limit: number): Promise<LocationSearchResult[]> {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
      query
    )}&count=${Math.min(limit * 2, 20)}&language=en&format=json`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4500);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'AstroSushil-Backend/1.0',
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Geocoding provider responded with status ${response.status}`);
      }

      const json = await response.json() as any;
      if (!json || !Array.isArray(json.results)) {
        return [];
      }

      const results: LocationSearchResult[] = [];

      for (const item of json.results) {
        if (
          typeof item.latitude !== 'number' ||
          typeof item.longitude !== 'number' ||
          !item.name
        ) {
          continue;
        }

        const name = String(item.name).trim();
        const country = item.country ? String(item.country).trim() : '';
        const countryCode = item.country_code ? String(item.country_code).toUpperCase().trim() : '';
        const state = item.admin1 ? String(item.admin1).trim() : undefined;

        // Build canonical display name (e.g., "New Delhi, Delhi, India")
        const parts: string[] = [name];
        if (state && state !== name) parts.push(state);
        if (country && country !== name && country !== state) parts.push(country);
        const displayName = parts.join(', ');

        // Ensure IANA timezone validity
        let timezone = item.timezone ? String(item.timezone).trim() : 'UTC';
        if (!this.isValidIanaTimezone(timezone)) {
          timezone = this.resolveTimezoneFallback(item.latitude, item.longitude, countryCode);
        }

        results.push({
          id: `om-${item.id ?? Math.abs(Math.round(item.latitude * 10000 + item.longitude * 10000))}`,
          name,
          displayName,
          country: country || name,
          countryCode: countryCode || 'XX',
          state,
          latitude: Number(item.latitude.toFixed(4)),
          longitude: Number(item.longitude.toFixed(4)),
          timezone,
        });
      }

      return results;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Matches query against built-in major cities catalog.
   */
  private searchCatalog(query: string, limit: number): LocationSearchResult[] {
    const q = query.toLowerCase().trim();
    return MAJOR_CITIES_CATALOG.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.displayName.toLowerCase().includes(q) ||
        (c.state && c.state.toLowerCase().includes(q)) ||
        c.country.toLowerCase().includes(q)
    ).slice(0, limit);
  }

  /**
   * Validates whether a given timezone is recognized by standard Intl.
   */
  public isValidIanaTimezone(timezone: string): boolean {
    if (!timezone || typeof timezone !== 'string') return false;
    try {
      Intl.DateTimeFormat(undefined, { timeZone: timezone });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Fallback timezone resolver for common geographic regions.
   */
  public resolveTimezoneFallback(lat: number, lon: number, countryCode?: string): string {
    if (countryCode === 'IN') return 'Asia/Kolkata';
    if (countryCode === 'GB') return 'Europe/London';
    if (countryCode === 'AE') return 'Asia/Dubai';
    if (countryCode === 'SG') return 'Asia/Singapore';
    if (countryCode === 'JP') return 'Asia/Tokyo';

    // India bounding box approx
    if (lat >= 6 && lat <= 38 && lon >= 68 && lon <= 98) {
      return 'Asia/Kolkata';
    }

    return 'UTC';
  }

  private setCache(key: string, data: LocationSearchResult[]): void {
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      // Remove oldest entry
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) this.cache.delete(oldestKey);
    }
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  /**
   * Clears internal cache (useful for testing).
   */
  public clearCache(): void {
    this.cache.clear();
  }
}

export const locationService = new LocationService();
