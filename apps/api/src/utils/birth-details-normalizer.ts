import { NormalizedBirthDetails } from '@astro/shared';
import { ValidationError } from '../errors/app-error';

export interface BirthProfileInput {
  id?: string;
  name: string;
  dateOfBirth: string; // YYYY-MM-DD
  timeOfBirth: string; // HH:mm:ss or HH:mm
  latitude: number;    // [-90, 90]
  longitude: number;   // [-180, 180]
  timezone: string;    // IANA Timezone string, e.g. "Asia/Kolkata"
  placeName?: string | null;
}

/**
 * Normalizes input birth profile parameters into a canonical BirthDetails data structure.
 * 
 * TIMEZONE & UTC STRATEGY:
 * 1. Date of birth (YYYY-MM-DD) and time of birth (HH:mm:ss) represent local clock time at the birth location.
 * 2. Timezone MUST be an explicit IANA Timezone identifier (e.g. "Asia/Kolkata", "America/New_York", "Europe/London").
 * 3. UTC conversion explicitly evaluates the timezone's offset and Daylight Saving Time (DST) status for the given local date and time.
 * 4. The astrology engine core consumes normalized UTC ISO strings and coordinate values without guessing or ambiguous locale shifts.
 */
export function normalizeBirthProfile(input: BirthProfileInput): NormalizedBirthDetails {
  const { id, name, dateOfBirth, timeOfBirth, latitude, longitude, timezone, placeName } = input;

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
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
  } catch (err) {
    throw new ValidationError(`Invalid IANA timezone identifier: "${timezone}". Example valid timezone: "Asia/Kolkata"`);
  }

  // 5. Calculate Local ISO string & UTC ISO String
  const localDateTimeStr = `${dateOfBirth}T${normalizedTime}`;

  // Parse local components
  const [yearStr, monthStr, dayStr] = dateOfBirth.split('-');
  const [hourStr, minStr, secStr] = normalizedTime.split(':');

  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10) - 1;
  const day = parseInt(dayStr, 10);
  const hour = parseInt(hourStr, 10);
  const min = parseInt(minStr, 10);
  const sec = parseInt(secStr, 10);

  // Compute timezone offset at target local time
  const offsetMinutes = getTimezoneOffsetMinutes(timezone, year, month, day, hour, min, sec);
  
  // Create UTC date object by subtracting offset minutes from local time
  const localTimestamp = Date.UTC(year, month, day, hour, min, sec);
  const utcTimestamp = localTimestamp - offsetMinutes * 60 * 1000;
  const utcDate = new Date(utcTimestamp);

  return {
    profileId: id,
    name: name.trim(),
    utcDateTime: utcDate.toISOString(),
    localDateTime: localDateTimeStr,
    timezone,
    timezoneOffsetMinutes: offsetMinutes,
    latitude,
    longitude,
    placeName: placeName ? placeName.trim() : undefined,
  };
}

/**
 * Helper function to determine timezone offset in minutes relative to UTC for a specific date and time in an IANA timezone.
 */
function getTimezoneOffsetMinutes(
  timeZone: string,
  year: number,
  month: number,
  day: number,
  hour: number,
  min: number,
  sec: number
): number {
  const dateInUtc = new Date(Date.UTC(year, month, day, hour, min, sec));

  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const parts = dtf.formatToParts(dateInUtc);
  const values: Record<string, number> = {};
  for (const part of parts) {
    if (part.type !== 'literal') {
      values[part.type] = parseInt(part.value, 10);
    }
  }

  const asLocalInTz = Date.UTC(
    values.year,
    values.month - 1,
    values.day,
    values.hour === 24 ? 0 : values.hour,
    values.minute,
    values.second
  );

  return Math.round((asLocalInTz - dateInUtc.getTime()) / 60000);
}
