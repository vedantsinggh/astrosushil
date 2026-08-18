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
  createdAt: Date;
  updatedAt: Date;
}): BirthProfileResponseDto {
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
    createdAt: profile.createdAt.toISOString(),
    updatedAt: profile.updatedAt.toISOString(),
  };
}
