export interface LocalDateInput {
  year: number;   // Four digit year, e.g. 1990
  month: number;  // 1 to 12
  day: number;    // 1 to 31
}

export interface LocalTimeInput {
  hour: number;   // 0 to 23
  minute: number; // 0 to 59
  second: number; // 0 to 59
}

// Canonical disambiguation choices are 'earlier' | 'later'.
// 'daylight' and 'standard' are retained as deprecated aliases for backward compatibility.
export type TimezoneDisambiguation = 'earlier' | 'later' | 'daylight' | 'standard';

export interface BirthDetails {
  name?: string;          // Optional person or profile name
  dateOfBirth?: string;   // Optional date of birth string (YYYY-MM-DD)
  timeOfBirth?: string;   // Optional time of birth string (HH:mm:ss)
  date: LocalDateInput;
  time: LocalTimeInput;
  timezone: string;       // IANA Timezone string, e.g. "Asia/Kolkata"
  latitude: number;       // Decimal degrees [-90.0, 90.0]
  longitude: number;      // Decimal degrees [-180.0, 180.0]
  altitudeMeters?: number;// Altitude above sea level in meters (Default: 0)
  placeName?: string;     // Optional location description
  disambiguation?: TimezoneDisambiguation; // Optional explicit choice for ambiguous DST transition times
  utcDateTime?: string | Date; // Authoritative resolved instant for chart reproducibility
  timezoneOffsetSeconds?: number; // Exact signed UTC offset in seconds
}

export interface NormalizedBirthTime {
  originalDetails: BirthDetails;
  utcIsoString: string;          // ISO 8601 UTC string (e.g. "1990-05-15T09:00:00.000Z")
  utcTimestampMs: number;        // Epoch timestamp in milliseconds
  julianDayUT: number;           // Julian Day Number in Universal Time (UT)
  timezoneOffsetSeconds?: number; // Exact calculated offset from UTC in seconds
  timezoneOffsetMinutes: number; // Calculated offset from UTC in minutes (+330 for IST)
  isDaylightSaving?: boolean;    // Whether daylight saving time was active at birth instant
}
