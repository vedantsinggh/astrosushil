import { ErrorResponse, ProtocolError, ResponseMessage } from './protocol';
import { getHandler, normalizeParams } from './handlers';
import { isRecord } from './birth';
import { parseCalculationOptions, withCalculationOptions } from './common';

function errorResponse(id: ErrorResponse['id'], code: ErrorResponse['error']['code'], message: string, reason?: string): ErrorResponse {
  return { id, ok: false, error: { code, message, ...(reason ? { reason } : {}) } };
}

/** The engine's own error code (e.g. PlacidusUndefinedError.code), if it is a plain identifier. */
function engineErrorCode(err: unknown): string | undefined {
  const code = isRecord(err) || err instanceof Error ? (err as { code?: unknown }).code : undefined;
  return typeof code === 'string' && /^[A-Z][A-Z0-9_]{0,63}$/.test(code) ? code : undefined;
}

/** Replace non-finite numbers (NaN/Infinity) with null so every response is valid JSON. */
export function safeStringify(value: unknown): string {
  return JSON.stringify(value, (_k, v) => (typeof v === 'number' && !Number.isFinite(v) ? null : v));
}

/** Handle one raw NDJSON line and produce exactly one response object. */
export async function dispatchLine(line: string): Promise<ResponseMessage> {
  let msg: unknown;
  try {
    msg = JSON.parse(line);
  } catch {
    return errorResponse(null, 'PARSE_ERROR', 'Request is not valid JSON');
  }
  if (!isRecord(msg)) return errorResponse(null, 'INVALID_REQUEST', 'Request must be a JSON object');
  const id = typeof msg.id === 'number' || typeof msg.id === 'string' ? msg.id : null;
  if (id === null) return errorResponse(null, 'INVALID_REQUEST', 'Request id must be a number or string');
  if (typeof msg.method !== 'string') return errorResponse(id, 'INVALID_REQUEST', 'method must be a string');
  const handler = getHandler(msg.method);
  if (!handler) return errorResponse(id, 'UNKNOWN_METHOD', `Unknown method: ${msg.method}`);
  try {
    const params = normalizeParams(msg.params);
    const options = parseCalculationOptions(params.options);
    const result = await withCalculationOptions(options, () => handler(params));
    return { id, ok: true, result };
  } catch (err) {
    if (err instanceof ProtocolError) return errorResponse(id, err.code, err.message);
    const message = err instanceof Error ? err.message : String(err);
    return errorResponse(id, 'CALCULATION_ERROR', message, engineErrorCode(err));
  }
}
