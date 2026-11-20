/**
 * Helpers shared by the core handlers (handlers.ts) and the feature handler modules
 * (feature-handlers/*.ts). Parsing and shaping only: every number comes from the engine.
 */
import { AsyncLocalStorage } from 'node:async_hooks';
import { AstroChart, AstrologyConfig, ChartCalculator, DEFAULT_ASTROLOGY_CONFIG, getOffsetMsAtUtc } from '@astro/astrology-engine';
import {
  AYANAMSA_OPTIONS,
  BirthInput,
  CalculationOptions,
  KP_CUSP_SYSTEM_OPTIONS,
  NODE_TYPE_OPTIONS,
  ProtocolError,
} from './protocol';
import { isRecord, toBirthDetails } from './birth';

/** The engine's canonical configuration (identical to apps/api getActiveConfig). */
const BASE_CONFIG: AstrologyConfig = { ...DEFAULT_ASTROLOGY_CONFIG };

/** Per-request configuration (params.options), scoped to the request's async context. */
const requestConfig = new AsyncLocalStorage<AstrologyConfig>();

/**
 * The configuration of the request being handled: the engine defaults overridden by the
 * request's `params.options` (ayanamsa, nodeType). Reads go through the request scope, so
 * pipelined requests with different options never see each other's settings.
 */
export const ACTIVE_CONFIG: AstrologyConfig = new Proxy(BASE_CONFIG, {
  get: (target, key) => Reflect.get(requestConfig.getStore() ?? target, key),
});

/** Validates `params.options`. */
export function parseCalculationOptions(v: unknown): CalculationOptions {
  if (v === undefined || v === null) return {};
  if (!isRecord(v)) throw new ProtocolError('INVALID_PARAMS', 'options must be an object');
  const pick = <T extends string>(field: string, allowed: readonly T[]): T | undefined => {
    const value = v[field];
    if (value === undefined) return undefined;
    if (typeof value !== 'string' || !(allowed as readonly string[]).includes(value)) {
      throw new ProtocolError('INVALID_PARAMS', `options.${field} must be one of ${allowed.join(', ')}`);
    }
    return value as T;
  };
  return {
    ayanamsa: pick('ayanamsa', AYANAMSA_OPTIONS),
    nodeType: pick('nodeType', NODE_TYPE_OPTIONS),
    kpCuspSystem: pick('kpCuspSystem', KP_CUSP_SYSTEM_OPTIONS),
  };
}

/** Runs `fn` with the request's options applied to ACTIVE_CONFIG. */
export function withCalculationOptions<T>(options: CalculationOptions, fn: () => T): T {
  const config: AstrologyConfig = {
    ...BASE_CONFIG,
    ...(options.ayanamsa ? { ayanamsa: options.ayanamsa } : {}),
    ...(options.nodeType ? { nodeCalculation: options.nodeType } : {}),
  };
  return requestConfig.run(config, fn);
}

/** Effective options of the current request, with defaults filled in (echoed in results). */
export function effectiveCalculationOptions(): Required<CalculationOptions> {
  return {
    ayanamsa: ACTIVE_CONFIG.ayanamsa as Required<CalculationOptions>['ayanamsa'],
    nodeType: ACTIVE_CONFIG.nodeCalculation as Required<CalculationOptions>['nodeType'],
    kpCuspSystem: 'PLACIDUS',
  };
}

export const chartCalc = new ChartCalculator();

export async function chartFor(b: BirthInput): Promise<AstroChart> {
  return chartCalc.calculateChart(toBirthDetails(b), ACTIVE_CONFIG);
}

export type Handler = (p: Record<string, unknown>) => Promise<unknown> | unknown;

export function optionalString(v: unknown, field: string): string | undefined {
  if (v === undefined || v === null) return undefined;
  if (typeof v !== 'string') throw new ProtocolError('INVALID_PARAMS', `${field} must be a string`);
  return v;
}

export function isoDate(v: unknown, field: string): Date {
  if (typeof v !== 'string' || Number.isNaN(Date.parse(v))) {
    throw new ProtocolError('INVALID_PARAMS', `${field} must be an ISO-8601 timestamp`);
  }
  return new Date(v);
}

export function intParam(v: unknown, field: string, min: number, max: number, dflt?: number): number {
  if (v === undefined && dflt !== undefined) return dflt;
  const n = Number(v);
  if (!Number.isInteger(n) || n < min || n > max) throw new ProtocolError('INVALID_PARAMS', `${field} must be an integer ${min}-${max}`);
  return n;
}

export function stringList(v: unknown, field: string, allowed: readonly string[]): string[] | undefined {
  if (v === undefined) return undefined;
  if (!Array.isArray(v) || v.some((x) => typeof x !== 'string' || !allowed.includes(x))) {
    throw new ProtocolError('INVALID_PARAMS', `${field} must be a list drawn from ${allowed.join(', ')}`);
  }
  return v as string[];
}

/** UTC offset (minutes) of an IANA zone at a given instant, from the engine's timezone solver. */
export function offsetMinutes(utcMs: number, timezone: string): number {
  return Math.round(getOffsetMsAtUtc(utcMs, timezone) / 60000);
}

/**
 * Paging for large tables, so no single response line grows unbounded and the UI can render the
 * first page while it asks for the next. `page` is 0-based.
 */
export function pageOf<T>(all: T[], p: Record<string, unknown>, defaultSize = 200, maxSize = 1000) {
  const pageSize = intParam(p.pageSize, 'pageSize', 1, maxSize, defaultSize);
  const pageCount = Math.max(1, Math.ceil(all.length / pageSize));
  const page = intParam(p.page, 'page', 0, Math.max(0, pageCount - 1), 0);
  return { page, pageSize, pageCount, totalRows: all.length, rows: all.slice(page * pageSize, (page + 1) * pageSize) };
}

export { isRecord };
