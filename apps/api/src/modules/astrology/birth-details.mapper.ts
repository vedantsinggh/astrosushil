import { BirthDetails, TimezoneDisambiguation } from '@astro/astrology-engine';

export interface PrismaBirthProfileInput {
  id: string;
  name: string;
  dateOfBirth: string; // Format: "YYYY-MM-DD"
  timeOfBirth: string; // Format: "HH:mm:ss"
  latitude: number;
  longitude: number;
  timezone: string;
  placeName?: string | null;
  country?: string | null;
  countryCode?: string | null;
  state?: string | null;
  disambiguation?: string | null;
  utcDateTime?: Date | string | null;
  timezoneOffsetSeconds?: number | null;
}

/**
 * Maps a database BirthProfile record into the domain-pure BirthDetails input required by @astro/astrology-engine.
 * Protects the domain package from Prisma database details.
 * Preserves the authoritative persisted UTC instant, offset, and disambiguation choice.
 */
export function mapBirthProfileToBirthDetails(profile: PrismaBirthProfileInput): BirthDetails {
  // Parse YYYY-MM-DD
  const dateParts = profile.dateOfBirth.split('-');
  if (dateParts.length !== 3) {
    throw new Error(`Invalid dateOfBirth format in database record: ${profile.dateOfBirth}`);
  }
  const year = parseInt(dateParts[0], 10);
  const month = parseInt(dateParts[1], 10);
  const day = parseInt(dateParts[2], 10);

  // Parse HH:mm:ss
  const timeParts = profile.timeOfBirth.split(':');
  if (timeParts.length < 2) {
    throw new Error(`Invalid timeOfBirth format in database record: ${profile.timeOfBirth}`);
  }
  const hour = parseInt(timeParts[0], 10);
  const minute = parseInt(timeParts[1], 10);
  const second = timeParts.length > 2 ? parseInt(timeParts[2], 10) : 0;

  // Canonicalize disambiguation
  let disambiguation: TimezoneDisambiguation | undefined = undefined;
  if (profile.disambiguation === 'earlier' || profile.disambiguation === 'later') {
    disambiguation = profile.disambiguation;
  } else if (profile.disambiguation === 'daylight') {
    disambiguation = 'earlier';
  } else if (profile.disambiguation === 'standard') {
    disambiguation = 'later';
  }

  // Preserve authoritative UTC instant as ISO string if present
  let utcDateTime: string | undefined = undefined;
  if (profile.utcDateTime) {
    if (profile.utcDateTime instanceof Date) {
      utcDateTime = !isNaN(profile.utcDateTime.getTime()) ? profile.utcDateTime.toISOString() : undefined;
    } else if (typeof profile.utcDateTime === 'string') {
      const d = new Date(profile.utcDateTime);
      utcDateTime = !isNaN(d.getTime()) ? d.toISOString() : undefined;
    }
  }

  const timezoneOffsetSeconds =
    profile.timezoneOffsetSeconds !== null && profile.timezoneOffsetSeconds !== undefined
      ? profile.timezoneOffsetSeconds
      : undefined;

  const details: BirthDetails = {
    name: profile.name,
    dateOfBirth: profile.dateOfBirth,
    timeOfBirth: profile.timeOfBirth,
    date: { year, month, day },
    time: { hour, minute, second },
    timezone: profile.timezone,
    latitude: profile.latitude,
    longitude: profile.longitude,
    placeName: profile.placeName || undefined,
    disambiguation,
    utcDateTime,
    timezoneOffsetSeconds,
  };

  return details;
}

export function mapDirectBirthDetailsToBirthDetails(input: {
  name: string;
  dateOfBirth: string;
  timeOfBirth: string;
  latitude: number;
  longitude: number;
  timezone: string;
  placeName?: string | null;
  disambiguation?: TimezoneDisambiguation;
  utcDateTime?: string | Date;
  timezoneOffsetSeconds?: number;
}): BirthDetails {
  const dateParts = input.dateOfBirth.split('-');
  const year = parseInt(dateParts[0], 10);
  const month = parseInt(dateParts[1], 10);
  const day = parseInt(dateParts[2], 10);

  const timeParts = input.timeOfBirth.split(':');
  const hour = parseInt(timeParts[0], 10);
  const minute = parseInt(timeParts[1], 10);
  const second = timeParts.length > 2 ? parseInt(timeParts[2], 10) : 0;

  return {
    name: input.name,
    dateOfBirth: input.dateOfBirth,
    timeOfBirth: input.timeOfBirth,
    date: { year, month, day },
    time: { hour, minute, second },
    timezone: input.timezone,
    latitude: input.latitude,
    longitude: input.longitude,
    placeName: input.placeName || undefined,
    disambiguation: input.disambiguation,
    utcDateTime: input.utcDateTime instanceof Date ? input.utcDateTime.toISOString() : input.utcDateTime,
    timezoneOffsetSeconds: input.timezoneOffsetSeconds,
  };
}

