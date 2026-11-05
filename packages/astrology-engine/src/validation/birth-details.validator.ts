import { BirthDetails, NormalizedBirthTime } from '../input/birth-details';
import { BirthDetailsValidationError } from '../errors/astrology.error';
import { resolveLocalTimeToUtc, isValidIanaTimezone, getOffsetMsAtUtc } from './timezone.solver';

/**
 * Validates canonical BirthDetails input structure.
 */
export function validateBirthDetails(details: BirthDetails): BirthDetails {
  const errors: string[] = [];

  if (!details) {
    throw new BirthDetailsValidationError('BirthDetails object is required');
  }

  // Support string dateOfBirth if date object is omitted
  if (!details.date && details.dateOfBirth && typeof details.dateOfBirth === 'string') {
    const parts = details.dateOfBirth.split('-').map(Number);
    if (parts.length === 3 && !parts.some(isNaN)) {
      details.date = { year: parts[0], month: parts[1], day: parts[2] };
    }
  }

  // Support string timeOfBirth if time object is omitted
  if (!details.time && details.timeOfBirth && typeof details.timeOfBirth === 'string') {
    const parts = details.timeOfBirth.split(':').map(Number);
    if (parts.length >= 2 && !parts.some(isNaN)) {
      details.time = { hour: parts[0], minute: parts[1], second: parts[2] || 0 };
    }
  }

  // Validate Date
  if (!details.date) {
    errors.push('Birth date object is required');
  } else {
    const { year, month, day } = details.date;
    if (typeof year !== 'number' || year < 1000 || year > 3000) {
      errors.push(`Invalid birth year: ${year}. Must be between 1000 and 3000.`);
    }
    if (typeof month !== 'number' || month < 1 || month > 12) {
      errors.push(`Invalid birth month: ${month}. Must be between 1 and 12.`);
    }
    if (typeof day !== 'number' || day < 1 || day > 31) {
      errors.push(`Invalid birth day: ${day}. Must be between 1 and 31.`);
    } else if (typeof year === 'number' && typeof month === 'number' && month >= 1 && month <= 12) {
      // Calculate max days in month
      const maxDays = new Date(Date.UTC(year, month, 0)).getUTCDate();
      if (day > maxDays) {
        errors.push(`Invalid day ${day} for month ${month} in year ${year}. Max days is ${maxDays}.`);
      }
    }
  }

  // Validate Time
  if (!details.time) {
    errors.push('Birth time object is required');
  } else {
    const { hour, minute, second } = details.time;
    if (typeof hour !== 'number' || hour < 0 || hour > 23) {
      errors.push(`Invalid birth hour: ${hour}. Must be between 0 and 23.`);
    }
    if (typeof minute !== 'number' || minute < 0 || minute > 59) {
      errors.push(`Invalid birth minute: ${minute}. Must be between 0 and 59.`);
    }
    if (typeof second !== 'number' || second < 0 || second > 59) {
      errors.push(`Invalid birth second: ${second}. Must be between 0 and 59.`);
    }
  }

  // Validate Timezone
  if (!details.timezone || typeof details.timezone !== 'string') {
    errors.push('Timezone IANA string is required (e.g. "Asia/Kolkata")');
  } else if (!isValidIanaTimezone(details.timezone)) {
    errors.push(`Invalid IANA timezone identifier: "${details.timezone}".`);
  }

  // Validate Disambiguation (if supplied)
  if (details.disambiguation !== undefined) {
    const validDisambiguations = ['earlier', 'later', 'daylight', 'standard'];
    if (!validDisambiguations.includes(details.disambiguation)) {
      errors.push(
        `Invalid disambiguation: "${details.disambiguation}". Must be one of: earlier, later, daylight, standard.`
      );
    }
  }

  // Validate Geographic Coordinates
  if (typeof details.latitude !== 'number' || details.latitude < -90 || details.latitude > 90) {
    errors.push(`Invalid latitude: ${details.latitude}. Must be between -90.0 and +90.0.`);
  }

  if (typeof details.longitude !== 'number' || details.longitude < -180 || details.longitude > 180) {
    errors.push(`Invalid longitude: ${details.longitude}. Must be between -180.0 and +180.0.`);
  }

  if (errors.length > 0) {
    throw new BirthDetailsValidationError(
      `BirthDetails validation failed with ${errors.length} error(s): ${errors.join('; ')}`,
      errors
    );
  }

  return details;
}

/**
 * Converts local birth details to UTC normalized timestamp and Julian Day Number.
 * If authoritative utcDateTime is already persisted on details, it is honored directly
 * to guarantee chart reproducibility regardless of future timezone database changes.
 * Preserves the original local birth details untouched.
 */
export function normalizeBirthTime(details: BirthDetails): NormalizedBirthTime {
  const validated = validateBirthDetails(details);

  // If authoritative utcDateTime is already known and stored, use it directly
  if (validated.utcDateTime) {
    const utcDate = new Date(validated.utcDateTime);
    if (!isNaN(utcDate.getTime())) {
      const utcTimestampMs = utcDate.getTime();
      const utcIsoString = utcDate.toISOString();
      const julianDayUT = utcTimestampMs / 86400000 + 2440587.5;
      const timezoneOffsetSeconds = validated.timezoneOffsetSeconds !== undefined
        ? validated.timezoneOffsetSeconds
        : Math.round(getOffsetMsAtUtc(utcTimestampMs, validated.timezone) / 1000);
      const timezoneOffsetMinutes = timezoneOffsetSeconds / 60;

      return {
        originalDetails: validated,
        utcIsoString,
        utcTimestampMs,
        julianDayUT,
        timezoneOffsetSeconds,
        timezoneOffsetMinutes,
      };
    }
  }

  const { year, month, day } = validated.date;
  const { hour, minute, second } = validated.time;

  const resolved = resolveLocalTimeToUtc(
    year,
    month,
    day,
    hour,
    minute,
    second,
    validated.timezone,
    validated.disambiguation
  );

  // Compute Julian Day Number in Universal Time (UT)
  // Julian Day 2440587.5 corresponds to 1970-01-01T00:00:00.000Z Epoch
  const julianDayUT = resolved.utcTimestampMs / 86400000 + 2440587.5;

  return {
    originalDetails: validated,
    utcIsoString: resolved.utcIsoString,
    utcTimestampMs: resolved.utcTimestampMs,
    julianDayUT,
    timezoneOffsetSeconds: resolved.timezoneOffsetSeconds,
    timezoneOffsetMinutes: resolved.timezoneOffsetMinutes,
    isDaylightSaving: resolved.isDaylightSaving,
  };
}
