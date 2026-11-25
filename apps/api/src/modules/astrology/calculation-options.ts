import { AsyncLocalStorage } from 'node:async_hooks';
import { z } from 'zod/v3';

/**
 * Optional per-request calculation options for the astrology endpoints (engine 0.2.0,
 * docs/decisions.md ADR-017). Sent as top-level body fields next to `birthProfileId` /
 * `birthDetails`. Omitted fields take the engine defaults (true Chitrapaksha Lahiri, mean node),
 * so existing clients are unaffected.
 */
export const AYANAMSA_VALUES = ['LAHIRI', 'RAMAN', 'KRISHNAMURTI', 'KP', 'FAGAN_BRADLEY'] as const;
export const NODE_TYPE_VALUES = ['MEAN_NODE', 'TRUE_NODE'] as const;

export const calculationOptionsSchema = z.object({
  ayanamsa: z.enum(AYANAMSA_VALUES).optional(),
  nodeType: z.enum(NODE_TYPE_VALUES).optional(),
});

export type CalculationOptions = z.infer<typeof calculationOptionsSchema>;

const calculationOptionsContext = new AsyncLocalStorage<CalculationOptions>();

/** Runs `fn` (e.g. Fastify's `done`) with the request's options in scope. */
export function runWithCalculationOptions<T>(options: CalculationOptions, fn: () => T): T {
  return calculationOptionsContext.run(options, fn);
}

/** Options of the request being handled ({} outside a request). */
export function currentCalculationOptions(): CalculationOptions {
  return calculationOptionsContext.getStore() ?? {};
}

/** Parses the options from a request body (non-object bodies carry no options). */
export function parseCalculationOptions(body: unknown): CalculationOptions {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) return {};
  return calculationOptionsSchema.parse(body);
}
