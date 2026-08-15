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

export interface BirthDetails {
  date: LocalDateInput;
  time: LocalTimeInput;
  timezone: string;       // IANA Timezone string, e.g. "Asia/Kolkata"
  latitude: number;       // Decimal degrees [-90.0, 90.0]
  longitude: number;      // Decimal degrees [-180.0, 180.0]
  altitudeMeters?: number;// Altitude above sea level in meters (Default: 0)
  placeName?: string;     // Optional location description
}

export interface NormalizedBirthTime {
  originalDetails: BirthDetails;
  utcIsoString: string;          // ISO 8601 UTC string (e.g. "1990-05-15T09:00:00.000Z")
  utcTimestampMs: number;        // Epoch timestamp in milliseconds
  julianDayUT: number;           // Julian Day Number in Universal Time (UT)
  timezoneOffsetMinutes: number; // Calculated offset from UTC in minutes (+330 for IST)
}
