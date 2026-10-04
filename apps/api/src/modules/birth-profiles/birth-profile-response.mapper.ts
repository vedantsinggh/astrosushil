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
    timezoneOffsetMinutes: number;
    latitude: number;
    longitude: number;
    placeName?: string;
    country?: string;
    countryCode?: string;
    state?: string;
    isResolved?: boolean;
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
  createdAt: Date;
  updatedAt: Date;
}): BirthProfileResponseDto {
  // Determine if location is considered resolved (valid place and not dummy 0,0 UTC coordinates)
  const isResolved =
    profile.isResolved !== undefined && profile.isResolved !== null
      ? profile.isResolved
      : !(profile.latitude === 0 && profile.longitude === 0 && profile.timezone === 'UTC');

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
    createdAt: profile.createdAt.toISOString(),
    updatedAt: profile.updatedAt.toISOString(),
  };
}

