import { prisma } from '../../services/prisma.service';
import { NotFoundError } from '../../errors/app-error';
import { normalizeBirthProfile } from '../../utils/birth-details-normalizer';
import { CreateBirthProfileInput, UpdateBirthProfileInput } from './birth-profiles.schemas';
import {
  mapBirthProfileToResponseDto,
  BirthProfileWithDetailsResponseDto,
} from './birth-profile-response.mapper';

export class BirthProfilesService {
  /**
   * Creates a new birth profile for an authenticated user.
   */
  public async createProfile(
    userId: string,
    input: CreateBirthProfileInput
  ): Promise<BirthProfileWithDetailsResponseDto> {
    // Validate & normalize birth input
    const normalized = normalizeBirthProfile({
      name: input.name,
      dateOfBirth: input.dateOfBirth,
      timeOfBirth: input.timeOfBirth,
      latitude: input.latitude,
      longitude: input.longitude,
      timezone: input.timezone,
      placeName: input.placeName,
      country: input.country,
      countryCode: input.countryCode,
      state: input.state,
      isResolved: input.isResolved ?? true,
      disambiguation: input.disambiguation,
    });

    const profile = await prisma.birthProfile.create({
      data: {
        userId,
        name: normalized.name,
        dateOfBirth: input.dateOfBirth,
        timeOfBirth: normalized.localDateTime.split('T')[1],
        latitude: normalized.latitude,
        longitude: normalized.longitude,
        timezone: normalized.timezone,
        placeName: normalized.placeName ?? null,
        country: normalized.country ?? null,
        countryCode: normalized.countryCode ?? null,
        state: normalized.state ?? null,
        isResolved: normalized.isResolved ?? true,
        disambiguation: normalized.disambiguation ?? input.disambiguation ?? null,
        utcDateTime: new Date(normalized.utcDateTime),
        timezoneOffsetSeconds: normalized.timezoneOffsetSeconds ?? null,
        disambiguationRequired: false,
      },
    });

    const dto = mapBirthProfileToResponseDto(profile);

    return {
      ...dto,
      normalizedDetails: normalized,
    };
  }

  /**
   * Migrates a guest birth profile to an authenticated user account idempotently.
   */
  public async migrateGuestProfile(userId: string, input: CreateBirthProfileInput) {
    // Idempotency check: look for an existing profile with matching core fields
    const existingProfiles = await prisma.birthProfile.findMany({
      where: { userId },
    });

    const duplicate = existingProfiles.find(
      (p) =>
        p.name.toLowerCase() === input.name.toLowerCase() &&
        p.dateOfBirth === input.dateOfBirth &&
        Math.abs(p.latitude - input.latitude) < 0.001 &&
        Math.abs(p.longitude - input.longitude) < 0.001
    );

    if (duplicate) {
      return {
        ...mapBirthProfileToResponseDto(duplicate),
        normalizedDetails: normalizeBirthProfile({
          id: duplicate.id,
          name: duplicate.name,
          dateOfBirth: duplicate.dateOfBirth,
          timeOfBirth: duplicate.timeOfBirth,
          latitude: duplicate.latitude,
          longitude: duplicate.longitude,
          timezone: duplicate.timezone,
          placeName: duplicate.placeName,
          country: duplicate.country,
          countryCode: duplicate.countryCode,
          state: duplicate.state,
          isResolved: duplicate.isResolved,
          disambiguation: (duplicate.disambiguation as any) ?? undefined,
          utcDateTime: duplicate.utcDateTime,
          timezoneOffsetSeconds: duplicate.timezoneOffsetSeconds,
        }),
      };
    }

    return this.createProfile(userId, input);
  }

  /**
   * Retrieves all birth profiles created by the authenticated user.
   */
  public async getUserProfiles(userId: string): Promise<BirthProfileWithDetailsResponseDto[]> {
    const profiles = await prisma.birthProfile.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return profiles.map((p) => {
      const dto = mapBirthProfileToResponseDto(p);
      let normalized;
      try {
        normalized = normalizeBirthProfile({
          id: p.id,
          name: p.name,
          dateOfBirth: p.dateOfBirth,
          timeOfBirth: p.timeOfBirth,
          latitude: p.latitude,
          longitude: p.longitude,
          timezone: p.timezone,
          placeName: p.placeName,
          country: p.country,
          countryCode: p.countryCode,
          state: p.state,
          isResolved: p.isResolved,
          utcDateTime: p.utcDateTime,
          timezoneOffsetSeconds: p.timezoneOffsetSeconds,
          disambiguation: (p.disambiguation as any) ?? undefined,
        });
      } catch (err) {
        // Safe backward compatibility: if legacy profile is ambiguous without a stored choice,
        // flag it for user resolution rather than crashing the entire profile listing.
        dto.disambiguationRequired = true;
        normalized = {
          profileId: p.id,
          name: p.name,
          utcDateTime: '',
          localDateTime: `${p.dateOfBirth}T${p.timeOfBirth}`,
          timezone: p.timezone,
          timezoneOffsetSeconds: p.timezoneOffsetSeconds ?? undefined,
          timezoneOffsetMinutes: p.timezoneOffsetSeconds ? p.timezoneOffsetSeconds / 60 : 0,
          latitude: p.latitude,
          longitude: p.longitude,
          placeName: p.placeName ?? undefined,
          country: p.country ?? undefined,
          countryCode: p.countryCode ?? undefined,
          state: p.state ?? undefined,
          isResolved: p.isResolved,
          disambiguation: (p.disambiguation as any) ?? undefined,
          disambiguationRequired: true,
        };
      }

      return {
        ...dto,
        normalizedDetails: normalized,
      };
    });
  }

  /**
   * Retrieves a specific birth profile by ID with strict user authorization check.
   */
  public async getProfileById(
    profileId: string,
    requestingUser: { id: string; role: 'USER' | 'SUPER_ADMIN' | 'ADMIN' | 'SUPPORT' | string }
  ): Promise<BirthProfileWithDetailsResponseDto> {
    const profile = await prisma.birthProfile.findUnique({
      where: { id: profileId },
    });

    // Security Check: Enforce server-side ownership authorization
    const isAdmin = ['ADMIN', 'SUPER_ADMIN', 'SUPPORT'].includes(requestingUser.role);
    if (!profile || (profile.userId !== requestingUser.id && !isAdmin)) {
      throw new NotFoundError('Birth profile not found');
    }

    const dto = mapBirthProfileToResponseDto(profile);
    let normalized;
    try {
      normalized = normalizeBirthProfile({
        id: profile.id,
        name: profile.name,
        dateOfBirth: profile.dateOfBirth,
        timeOfBirth: profile.timeOfBirth,
        latitude: profile.latitude,
        longitude: profile.longitude,
        timezone: profile.timezone,
        placeName: profile.placeName,
        country: profile.country,
        countryCode: profile.countryCode,
        state: profile.state,
        isResolved: profile.isResolved,
        utcDateTime: profile.utcDateTime,
        timezoneOffsetSeconds: profile.timezoneOffsetSeconds,
        disambiguation: (profile.disambiguation as any) ?? undefined,
      });
    } catch (err) {
      dto.disambiguationRequired = true;
      normalized = {
        profileId: profile.id,
        name: profile.name,
        utcDateTime: '',
        localDateTime: `${profile.dateOfBirth}T${profile.timeOfBirth}`,
        timezone: profile.timezone,
        timezoneOffsetSeconds: profile.timezoneOffsetSeconds ?? undefined,
        timezoneOffsetMinutes: profile.timezoneOffsetSeconds ? profile.timezoneOffsetSeconds / 60 : 0,
        latitude: profile.latitude,
        longitude: profile.longitude,
        placeName: profile.placeName ?? undefined,
        country: profile.country ?? undefined,
        countryCode: profile.countryCode ?? undefined,
        state: profile.state ?? undefined,
        isResolved: profile.isResolved,
        disambiguation: (profile.disambiguation as any) ?? undefined,
        disambiguationRequired: true,
      };
    }

    return {
      ...dto,
      normalizedDetails: normalized,
    };
  }

  /**
   * Updates a birth profile with strict user authorization check.
   */
  public async updateProfile(
    profileId: string,
    input: UpdateBirthProfileInput,
    requestingUser: { id: string; role: 'USER' | 'SUPER_ADMIN' | 'ADMIN' | 'SUPPORT' | string }
  ): Promise<BirthProfileWithDetailsResponseDto> {
    const existing = await prisma.birthProfile.findUnique({
      where: { id: profileId },
    });

    // Security Check: Enforce server-side ownership authorization
    const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(requestingUser.role);
    if (!existing || (existing.userId !== requestingUser.id && !isAdmin)) {
      throw new NotFoundError('Birth profile not found');
    }

    // Atomic location update logic: if placeName is being modified, coordinates and timezone must update together
    const isLocationModified =
      input.placeName !== undefined || input.latitude !== undefined || input.longitude !== undefined;

    const isTimeOrTzModified =
      input.dateOfBirth !== undefined ||
      input.timeOfBirth !== undefined ||
      input.timezone !== undefined ||
      input.disambiguation !== undefined;

    const merged = {
      name: input.name ?? existing.name,
      dateOfBirth: input.dateOfBirth ?? existing.dateOfBirth,
      timeOfBirth: input.timeOfBirth ?? existing.timeOfBirth,
      latitude: input.latitude ?? existing.latitude,
      longitude: input.longitude ?? existing.longitude,
      timezone: input.timezone ?? existing.timezone,
      placeName: input.placeName !== undefined ? input.placeName : existing.placeName,
      country: input.country !== undefined ? input.country : (isLocationModified ? null : existing.country),
      countryCode: input.countryCode !== undefined ? input.countryCode : (isLocationModified ? null : existing.countryCode),
      state: input.state !== undefined ? input.state : (isLocationModified ? null : existing.state),
      isResolved: input.isResolved !== undefined ? input.isResolved : (isLocationModified ? true : existing.isResolved),
    };

    // If time/timezone/disambiguation was NOT modified and we already have an authoritative instant, preserve it
    const existingUtc = !isTimeOrTzModified ? existing.utcDateTime : undefined;
    const existingOffsetSeconds = !isTimeOrTzModified ? existing.timezoneOffsetSeconds : undefined;

    // Re-validate and normalize merged data
    const normalized = normalizeBirthProfile({
      id: profileId,
      name: merged.name,
      dateOfBirth: merged.dateOfBirth,
      timeOfBirth: merged.timeOfBirth,
      latitude: merged.latitude,
      longitude: merged.longitude,
      timezone: merged.timezone,
      placeName: merged.placeName,
      country: merged.country,
      countryCode: merged.countryCode,
      state: merged.state,
      isResolved: merged.isResolved,
      disambiguation: input.disambiguation ?? (existing.disambiguation as any) ?? undefined,
      utcDateTime: existingUtc,
      timezoneOffsetSeconds: existingOffsetSeconds,
    });

    const updated = await prisma.birthProfile.update({
      where: { id: profileId },
      data: {
        name: normalized.name,
        dateOfBirth: merged.dateOfBirth,
        timeOfBirth: normalized.localDateTime.split('T')[1],
        latitude: normalized.latitude,
        longitude: normalized.longitude,
        timezone: normalized.timezone,
        placeName: normalized.placeName ?? null,
        country: normalized.country ?? null,
        countryCode: normalized.countryCode ?? null,
        state: normalized.state ?? null,
        isResolved: normalized.isResolved ?? true,
        disambiguation: normalized.disambiguation ?? input.disambiguation ?? existing.disambiguation ?? null,
        utcDateTime: new Date(normalized.utcDateTime),
        timezoneOffsetSeconds: normalized.timezoneOffsetSeconds ?? null,
        disambiguationRequired: false,
      },
    });

    const dto = mapBirthProfileToResponseDto(updated);

    return {
      ...dto,
      normalizedDetails: normalized,
    };
  }

  /**
   * Deletes a birth profile with strict user authorization check.
   */
  public async deleteProfile(
    profileId: string,
    requestingUser: { id: string; role: 'USER' | 'SUPER_ADMIN' | 'ADMIN' | 'SUPPORT' | string }
  ): Promise<{ message: string }> {
    const existing = await prisma.birthProfile.findUnique({
      where: { id: profileId },
    });

    // Security Check: Enforce server-side ownership authorization
    const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(requestingUser.role);
    if (!existing || (existing.userId !== requestingUser.id && !isAdmin)) {
      throw new NotFoundError('Birth profile not found');
    }

    await prisma.birthProfile.delete({
      where: { id: profileId },
    });

    return { message: 'Birth profile deleted successfully' };
  }
}

export const birthProfilesService = new BirthProfilesService();
