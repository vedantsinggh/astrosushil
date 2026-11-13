import { NormalizedBirthDetails } from '@astro/shared';
import {
  resolveLocalTimeToUtc,
  isValidIanaTimezone,
  getOffsetMsAtUtc,
  TimezoneDisambiguation,
  BirthTimeNonexistentError,
  BirthTimeAmbiguousError,
  BirthDetailsValidationError,
} from '@astro/astrology-engine';
import { ValidationError } from '../errors/app-error';

export interface BirthProfileInput {
  id?: string;
  name: string;
  dateOfBirth: string; // YYYY-MM-DD
  timeOfBirth: string; // HH:mm:ss or HH:mm
  latitude: number;    // [-90, 90]
  longitude: number;   // [-180, 180]
  timezone: string;    // IANA Timezone string, e.g. "Asia/Kolkata"
  disambiguation?: TimezoneDisambiguation;
  utcDateTime?: string | Date | null;
  timezoneOffsetSeconds?: number | null;
  placeName?: string | null;
  country?: string | null;
  countryCode?: string | null;
  state?: string | null;
  isResolved?: boolean;
}

/**
 * Normalizes input birth profile parameters into a canonical BirthDetails data structure.
 * 
 * TIMEZONE & UTC STRATEGY:
 * 1. Date of birth (YYYY-MM-DD) and time of birth (HH:mm:ss) represent local clock time at the birth location.
 * 2. Timezone MUST be an explicit IANA Timezone identifier (e.g. "Asia/Kolkata", "America/New_York", "Europe/London").
 * 3. If an authoritative utcDateTime is already persisted, it is directly honored to ensure chart reproducibility.
 * 4. UTC conversion explicitly evaluates the timezone's offset and Daylight Saving Time (DST) status for the given local date and time.
 * 5. Ambiguous local times require canonical disambiguation ('earlier' | 'later').
 */
export function normalizeBirthProfile(input: BirthProfileInput): NormalizedBirthDetails {
  const { id, name, dateOfBirth, timeOfBirth, latitude, longitude, timezone, placeName, disambiguation, utcDateTime, timezoneOffsetSeconds } = input;

  // 1. Validate Coordinates Range
  if (typeof latitude !== 'number' || latitude < -90 || latitude > 90) {
    throw new ValidationError('Latitude must be a valid number between -90.0 and 90.0 degrees');
  }

  if (typeof longitude !== 'number' || longitude < -180 || longitude > 180) {
    throw new ValidationError('Longitude must be a valid number between -180.0 and 180.0 degrees');
  }

  // 2. Validate & Normalize Date (YYYY-MM-DD)
  const dateRegex = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
  if (!dateRegex.test(dateOfBirth)) {
    throw new ValidationError('dateOfBirth must be in YYYY-MM-DD format');
  }

  // 3. Validate & Normalize Time (HH:mm:ss)
  let normalizedTime = timeOfBirth;
  if (/^\d{2}:\d{2}$/.test(timeOfBirth)) {
    normalizedTime = `${timeOfBirth}:00`;
  }
  const timeRegex = /^([01]\d|2[0-3]):[0-5]\d:[0-5]\d$/;
  if (!timeRegex.test(normalizedTime)) {
    throw new ValidationError('timeOfBirth must be in HH:mm or HH:mm:ss (24-hour) format');
  }

  // 4. Validate IANA Timezone Identifier
  if (!isValidIanaTimezone(timezone)) {
    throw new ValidationError(`Invalid IANA timezone identifier: "${timezone}". Example valid timezone: "Asia/Kolkata"`);
  }

  // 5. Calculate Local ISO string
  const localDateTimeStr = `${dateOfBirth}T${normalizedTime}`;

  // If authoritative utcDateTime is already provided on input, reuse it directly
  if (utcDateTime) {
    const parsedUtc = new Date(utcDateTime);
    if (!isNaN(parsedUtc.getTime())) {
      const resolvedOffsetSeconds =
        timezoneOffsetSeconds !== undefined && timezoneOffsetSeconds !== null
          ? timezoneOffsetSeconds
          : Math.round(getOffsetMsAtUtc(parsedUtc.getTime(), timezone) / 1000);
      const resolvedOffsetMinutes = resolvedOffsetSeconds / 60;

      return {
        profileId: id,
        name: name.trim(),
        utcDateTime: parsedUtc.toISOString(),
        localDateTime: localDateTimeStr,
        timezone,
        timezoneOffsetSeconds: resolvedOffsetSeconds,
        timezoneOffsetMinutes: resolvedOffsetMinutes,
        latitude,
        longitude,
        placeName: placeName ? placeName.trim() : undefined,
        country: input.country ? input.country.trim() : undefined,
        countryCode: input.countryCode ? input.countryCode.trim() : undefined,
        state: input.state ? input.state.trim() : undefined,
        isResolved: input.isResolved ?? true,
        disambiguation: disambiguation === 'earlier' || disambiguation === 'later' ? disambiguation : undefined,
        disambiguationRequired: false,
      };
    }
  }

  // Parse local components
  const [yearStr, monthStr, dayStr] = dateOfBirth.split('-');
  const [hourStr, minStr, secStr] = normalizedTime.split(':');

  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);
  const hour = parseInt(hourStr, 10);
  const min = parseInt(minStr, 10);
  const sec = parseInt(secStr, 10);

  // Compute timezone offset at target local time using robust solver
  try {
    const resolved = resolveLocalTimeToUtc(year, month, day, hour, min, sec, timezone, disambiguation);

    return {
      profileId: id,
      name: name.trim(),
      utcDateTime: resolved.utcIsoString,
      localDateTime: localDateTimeStr,
      timezone,
      timezoneOffsetSeconds: resolved.timezoneOffsetSeconds,
      timezoneOffsetMinutes: resolved.timezoneOffsetMinutes,
      isDaylightSaving: resolved.isDaylightSaving,
      latitude,
      longitude,
      placeName: placeName ? placeName.trim() : undefined,
      country: input.country ? input.country.trim() : undefined,
      countryCode: input.countryCode ? input.countryCode.trim() : undefined,
      state: input.state ? input.state.trim() : undefined,
      isResolved: input.isResolved ?? true,
      disambiguation: disambiguation === 'earlier' || disambiguation === 'later' ? disambiguation : undefined,
      disambiguationRequired: false,
    };
  } catch (err) {
    if (err instanceof BirthTimeNonexistentError) {
      throw new ValidationError(err.message, [
        {
          field: 'timeOfBirth',
          message: err.message,
          code: 'NONEXISTENT_LOCAL_TIME',
          localIsoString: err.localIsoString,
          timezone: err.timezone,
        },
      ]);
    }
    if (err instanceof BirthTimeAmbiguousError) {
      throw new ValidationError(err.message, [
        {
          field: 'timeOfBirth',
          message: err.message,
          code: 'AMBIGUOUS_LOCAL_TIME',
          localIsoString: err.localIsoString,
          timezone: err.timezone,
          candidates: err.candidates,
        },
      ]);
    }
    if (err instanceof BirthDetailsValidationError) {
      throw new ValidationError(err.message, [
        { field: 'timezone', message: err.message, code: 'INVALID_TIMEZONE' },
      ]);
    }
    throw err;
  }
}
