export type UserRole = 'USER' | 'ADMIN';

export interface HealthStatusResponse {
  status: string;
  timestamp: string;
  service: string;
  environment: string;
}

export interface NormalizedBirthDetails {
  profileId?: string;
  name: string;
  utcDateTime: string; // ISO 8601 UTC string (e.g. "1990-05-15T09:00:00.000Z")
  localDateTime: string; // YYYY-MM-DDTHH:mm:ss format
  timezone: string; // IANA Timezone ID (e.g., "Asia/Kolkata")
  timezoneOffsetMinutes: number; // Offset from UTC in minutes (e.g., +330 for IST)
  latitude: number; // Decimal degrees [-90, 90]
  longitude: number; // Decimal degrees [-180, 180]
  placeName?: string;
}

export interface ApiErrorDetail {
  field?: string;
  message: string;
  code?: string;
}

export interface ApiErrorPayload {
  code: string;
  message: string;
  details?: ApiErrorDetail[];
  requestId?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiErrorPayload;
}

export const SHARED_PACKAGE_NAME = "@astro/shared";
