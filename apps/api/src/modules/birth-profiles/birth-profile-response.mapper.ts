export interface BirthProfileResponseDto {
  id: string;
  userId: string;
  name: string;
  dateOfBirth: string;
  timeOfBirth: string;
  latitude: number;
  longitude: number;
  timezone: string;
  placeName: string | null;
  country: string | null;
  countryCode: string | null;
  state: string | null;
  isResolved: boolean;
  disambiguation?: string | null;
  utcDateTime?: string | null;
  timezoneOffsetSeconds?: number | null;
  disambiguationRequired: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BirthProfileWithDetailsResponseDto extends BirthProfileResponseDto {
  normalizedDetails: {
    profileId?: string;
    name: string;
    utcDateTime: string;
    localDateTime: string;
    timezone: string;
    timezoneOffsetSeconds?: number;
    timezoneOffsetMinutes: number;
    latitude: number;
    longitude: number;
    placeName?: string;
    country?: string;
    countryCode?: string;
    state?: string;
    isResolved?: boolean;
    disambiguation?: 'earlier' | 'later';
    disambiguationRequired?: boolean;
  };
}

export function mapBirthProfileToResponseDto(profile: {
  id: string;
  userId: string;
  name: string;
  dateOfBirth: string;
  timeOfBirth: string;
  latitude: number;
  longitude: number;
  timezone: string;
  placeName: string | null;
  country?: string | null;
  countryCode?: string | null;
  state?: string | null;
  isResolved?: boolean | null;
  disambiguation?: string | null;
  utcDateTime?: Date | string | null;
  timezoneOffsetSeconds?: number | null;
  disambiguationRequired?: boolean | null;
  createdAt: Date;
  updatedAt: Date;
}): BirthProfileResponseDto {
  // Determine if location is considered resolved (valid place and not dummy 0,0 UTC coordinates)
  const isResolved =
    profile.isResolved !== undefined && profile.isResolved !== null
      ? profile.isResolved
      : !(profile.latitude === 0 && profile.longitude === 0 && profile.timezone === 'UTC');

  let utcDateTimeStr: string | null = null;
  if (profile.utcDateTime) {
    utcDateTimeStr =
      profile.utcDateTime instanceof Date
        ? profile.utcDateTime.toISOString()
        : new Date(profile.utcDateTime).toISOString();
  }

  return {
    id: profile.id,
    userId: profile.userId,
    name: profile.name,
    dateOfBirth: profile.dateOfBirth,
    timeOfBirth: profile.timeOfBirth,
    latitude: profile.latitude,
    longitude: profile.longitude,
    timezone: profile.timezone,
    placeName: profile.placeName,
    country: profile.country ?? null,
    countryCode: profile.countryCode ?? null,
    state: profile.state ?? null,
    isResolved,
    disambiguation: profile.disambiguation ?? null,
    utcDateTime: utcDateTimeStr,
    timezoneOffsetSeconds: profile.timezoneOffsetSeconds ?? null,
    disambiguationRequired: profile.disambiguationRequired ?? false,
    createdAt: profile.createdAt.toISOString(),
    updatedAt: profile.updatedAt.toISOString(),
  };
}

