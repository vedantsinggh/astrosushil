import { BirthDetails, resolveLocalTimeToUtc, isValidIanaTimezone } from '@astro/astrology-engine';
import { BirthInput, LocationInput, ProtocolError } from './protocol';

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_RE = /^(\d{2}):(\d{2})(?::(\d{2}))?$/;

function fail(message: string): never {
  throw new ProtocolError('INVALID_PARAMS', message);
}

export function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

export function parseDate(s: unknown, field = 'date'): { year: number; month: number; day: number } {
  if (typeof s !== 'string') fail(`${field} must be a YYYY-MM-DD string`);
  const m = DATE_RE.exec(s);
  if (!m) fail(`${field} must be a YYYY-MM-DD string`);
  return { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) };
}

export function parseTime(s: unknown, field = 'time'): { hour: number; minute: number; second: number } {
  if (typeof s !== 'string') fail(`${field} must be an HH:mm[:ss] string`);
  const m = TIME_RE.exec(s);
  if (!m) fail(`${field} must be an HH:mm[:ss] string`);
  return { hour: Number(m[1]), minute: Number(m[2]), second: m[3] ? Number(m[3]) : 0 };
}

function num(v: unknown, field: string, min: number, max: number): number {
  if (typeof v !== 'number' || !Number.isFinite(v) || v < min || v > max) fail(`${field} must be a number in [${min}, ${max}]`);
  return v;
}

function tz(v: unknown, field = 'timezone'): string {
  if (typeof v !== 'string' || !isValidIanaTimezone(v)) fail(`${field} must be a valid IANA timezone`);
  return v;
}

export function parseLocation(v: unknown, field = 'location'): LocationInput {
  if (!isRecord(v)) fail(`${field} is required`);
  return {
    latitude: num(v.latitude, `${field}.latitude`, -90, 90),
    longitude: num(v.longitude, `${field}.longitude`, -180, 180),
    timezone: tz(v.timezone, `${field}.timezone`),
    placeName: typeof v.placeName === 'string' ? v.placeName : undefined,
  };
}

export function parseBirthInput(v: unknown, field = 'birth'): BirthInput {
  if (!isRecord(v)) fail(`${field} is required`);
  parseDate(v.date, `${field}.date`);
  parseTime(v.time, `${field}.time`);
  return {
    name: typeof v.name === 'string' ? v.name : undefined,
    date: v.date as string,
    time: v.time as string,
    timezone: tz(v.timezone, `${field}.timezone`),
    latitude: num(v.latitude, `${field}.latitude`, -90, 90),
    longitude: num(v.longitude, `${field}.longitude`, -180, 180),
    placeName: typeof v.placeName === 'string' ? v.placeName : undefined,
  };
}

export function toBirthDetails(b: BirthInput): BirthDetails {
  const date = parseDate(b.date);
  const time = parseTime(b.time);
  return {
    name: b.name,
    date,
    time,
    timezone: b.timezone,
    latitude: b.latitude,
    longitude: b.longitude,
    placeName: b.placeName,
  };
}

/** Resolve a local civil moment to a UTC ISO instant via the engine's timezone solver. */
export function toUtcIso(b: BirthInput): string {
  const d = parseDate(b.date);
  const t = parseTime(b.time);
  return resolveLocalTimeToUtc(d.year, d.month, d.day, t.hour, t.minute, t.second, b.timezone, 'earlier').utcIsoString;
}
