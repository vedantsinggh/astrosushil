/**
 * Astro Sushil Desktop — engine sidecar wire protocol (version 1).
 *
 * Transport: newline-delimited JSON (NDJSON) over stdin/stdout. Exactly one JSON object per line,
 * UTF-8, no embedded newlines. stderr is reserved for human-readable diagnostics.
 *
 *   -> {"id": 1, "method": "chart.compute", "params": {...}}
 *   <- {"id": 1, "ok": true, "result": {...}}
 *   <- {"id": 1, "ok": false, "error": {"code": "INVALID_PARAMS", "message": "..."}}
 *
 * On start-up the sidecar emits one unsolicited event line before any response:
 *   <- {"event": "ready", "protocolVersion": 1, "engineVersion": "0.2.0", "sidecarVersion": "0.1.0"}
 *
 * Requests may be pipelined; responses carry the request id and may arrive in any order.
 * See apps/desktop/docs/sidecar-protocol.md for the full method catalogue.
 */

export const PROTOCOL_VERSION = 1;
export const SIDECAR_VERSION = '0.1.0';

/** Birth / event moment as entered in the desktop app (local civil time + IANA zone). */
export interface BirthInput {
  name?: string;
  date: string; // YYYY-MM-DD (local civil date)
  time: string; // HH:mm or HH:mm:ss (local civil time)
  timezone: string; // IANA zone, e.g. "Asia/Kolkata"
  latitude: number; // + north
  longitude: number; // + east
  placeName?: string;
}

export interface LocationInput {
  latitude: number;
  longitude: number;
  timezone: string;
  placeName?: string;
}

export const VARGA_TYPES = [
  'D1', 'D2', 'D3', 'D4', 'D7', 'D9', 'D10', 'D12', 'D16', 'D20', 'D24', 'D27', 'D30', 'D40', 'D45', 'D60',
] as const;
export type VargaCode = (typeof VARGA_TYPES)[number];

export const DASHA_SYSTEMS = [
  'VIMSHOTTARI', 'ASHTOTTARI', 'YOGINI', 'KALACHAKRA', 'CHARA', 'NARAYANA', 'STHIRA', 'SHOOLA',
  'DWISAPTATI_SAMA', 'SHATABDIKA', 'CHATURASEETI_SAMA', 'DWADASHOTTARI', 'PANCHOTTARI',
] as const;
export type DashaSystemCode = (typeof DASHA_SYSTEMS)[number];

/** Method name -> params type. Results are documented in docs/sidecar-protocol.md. */
export interface MethodParams {
  ping: Record<string, never>;
  'engine.info': Record<string, never>;
  'chart.compute': { birth: BirthInput };
  'vargas.compute': { birth: BirthInput; vargas?: VargaCode[] };
  'dasha.compute': { birth: BirthInput; system?: DashaSystemCode; maxLevel?: number; targetDate?: string };
  /**
   * Sub-periods of one dasha node, for lazy loading of deep levels. `path` holds 0-based indices
   * into the engine's period lists (mahadasha index, then sub-period indices). The full result
   * for (birth, system, maxLevel, targetDate) is computed once and kept in a small cache.
   */
  'dasha.subPeriods': { birth: BirthInput; system?: DashaSystemCode; maxLevel?: number; targetDate?: string; path: number[] };
  'panchang.compute': { moment: BirthInput };
  'dayDivisions.compute': { date: string; location: LocationInput };
  'ashtakavarga.compute': { birth: BirthInput };
  'strength.compute': { birth: BirthInput };
  'transit.compute': { birth?: BirthInput; moment: BirthInput };
  'matchmaking.compute': { boy: BirthInput; girl: BirthInput };
  'yogas.compute': { birth: BirthInput };
  'kp.compute': { birth: BirthInput };
  'jaimini.compute': { birth: BirthInput };
  'specialPoints.compute': { birth: BirthInput };
  'chartVariants.compute': { birth: BirthInput };
  'avakhada.compute': { birth: BirthInput };
  'sudarshana.compute': { birth: BirthInput };
  'varshaphala.compute': { birth: BirthInput; targetYear: number; location?: LocationInput };
  'prashna.compute': { moment: BirthInput; questionNumber?: number; questionNumberSystem?: 'PARASHARI_1_108' | 'KP_1_249' | 'AUTO' };
  'eclipses.find': { startIso: string; endIso: string };
  'transitTimeline.compute': { startIso: string; endIso: string; timezone?: string };
  /** Local civil date/time in an IANA zone for a UTC instant (default: now). */
  'time.local': { timezone: string; utcIso?: string };
}

export type MethodName = keyof MethodParams;
export const METHOD_NAMES: MethodName[] = [
  'ping', 'engine.info', 'chart.compute', 'vargas.compute', 'dasha.compute', 'dasha.subPeriods', 'panchang.compute',
  'dayDivisions.compute', 'ashtakavarga.compute', 'strength.compute', 'transit.compute',
  'matchmaking.compute', 'yogas.compute', 'kp.compute', 'jaimini.compute', 'specialPoints.compute',
  'chartVariants.compute', 'avakhada.compute', 'sudarshana.compute', 'varshaphala.compute',
  'prashna.compute', 'eclipses.find', 'transitTimeline.compute', 'time.local',
];

/**
 * Optional calculation options, accepted as `params.options` by every method (engine 0.2.0,
 * docs/decisions.md ADR-017). Omitted fields take the engine defaults: true Chitrapaksha Lahiri,
 * mean node, true Placidus KP cusps.
 */
export const AYANAMSA_OPTIONS = ['LAHIRI', 'RAMAN', 'KRISHNAMURTI', 'KP', 'FAGAN_BRADLEY'] as const;
export const NODE_TYPE_OPTIONS = ['MEAN_NODE', 'TRUE_NODE'] as const;
export const KP_CUSP_SYSTEM_OPTIONS = ['PLACIDUS'] as const;
export interface CalculationOptions {
  ayanamsa?: (typeof AYANAMSA_OPTIONS)[number];
  nodeType?: (typeof NODE_TYPE_OPTIONS)[number];
  kpCuspSystem?: (typeof KP_CUSP_SYSTEM_OPTIONS)[number];
}

export interface RequestMessage<M extends MethodName = MethodName> {
  id: number | string;
  method: M;
  params?: MethodParams[M] & { options?: CalculationOptions };
}

export type ErrorCode =
  | 'PARSE_ERROR'
  | 'INVALID_REQUEST'
  | 'UNKNOWN_METHOD'
  | 'INVALID_PARAMS'
  | 'CALCULATION_ERROR'
  | 'INTERNAL_ERROR';

export interface ErrorPayload {
  code: ErrorCode;
  message: string;
  /** Machine-readable engine error code behind a CALCULATION_ERROR, when the engine gives one
   * (e.g. `PLACIDUS_UNDEFINED_AT_LATITUDE`), so clients need not parse the message. */
  reason?: string;
}

export interface SuccessResponse {
  id: number | string | null;
  ok: true;
  result: unknown;
}

export interface ErrorResponse {
  id: number | string | null;
  ok: false;
  error: ErrorPayload;
}

export type ResponseMessage = SuccessResponse | ErrorResponse;

export interface ReadyEvent {
  event: 'ready';
  protocolVersion: number;
  engineVersion: string;
  sidecarVersion: string;
}

export class ProtocolError extends Error {
  constructor(public readonly code: ErrorCode, message: string) {
    super(message);
    this.name = 'ProtocolError';
  }
}
