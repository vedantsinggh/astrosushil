import { BirthDetails, NormalizedBirthTime } from '../input/birth-details';
import { BirthDetailsValidationError } from '../errors/astrology.error';

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
  } else {
    try {
      Intl.DateTimeFormat(undefined, { timeZone: details.timezone });
    } catch {
      errors.push(`Invalid IANA timezone identifier: "${details.timezone}".`);
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
 * Preserves the original local birth details untouched.
 */
export function normalizeBirthTime(details: BirthDetails): NormalizedBirthTime {
  const validated = validateBirthDetails(details);

  const { year, month, day } = validated.date;
  const { hour, minute, second } = validated.time;

  // Format canonical local ISO string
  const pad = (n: number) => n.toString().padStart(2, '0');
  const localIsoString = `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}:${pad(second)}`;

  // Determine timezone offset for local ISO string
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: validated.timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  // Calculate UTC timestamp from local date/time + timezone
  // Construct UTC target date object
  const targetNaiveUtc = new Date(Date.UTC(year, month - 1, day, hour, minute, second));

  // Determine offset via Intl API
  const parts = formatter.formatToParts(targetNaiveUtc);
  const partsMap: Record<string, number> = {};
  for (const part of parts) {
    if (part.type !== 'literal') {
      partsMap[part.type] = parseInt(part.value, 10);
    }
  }

  // Handle midnight/24hr formatting edge case in Intl
  if (partsMap.hour === 24) partsMap.hour = 0;

  const formattedUtcFromTarget = new Date(
    Date.UTC(
      partsMap.year,
      partsMap.month - 1,
      partsMap.day,
      partsMap.hour,
      partsMap.minute,
      partsMap.second
    )
  );

  // Timezone offset in milliseconds
  const offsetMs = targetNaiveUtc.getTime() - formattedUtcFromTarget.getTime();
  const utcTimestampMs = targetNaiveUtc.getTime() + offsetMs;
  const timezoneOffsetMinutes = Math.round(-offsetMs / 60000);

  const utcDate = new Date(utcTimestampMs);
  const utcIsoString = utcDate.toISOString();

  // Compute Julian Day Number in Universal Time (UT)
  // Julian Day 2440587.5 corresponds to 1970-01-01T00:00:00.000Z Epoch
  const julianDayUT = utcTimestampMs / 86400000 + 2440587.5;

  return {
    originalDetails: validated,
    utcIsoString,
    utcTimestampMs,
    julianDayUT,
    timezoneOffsetMinutes,
  };
}
