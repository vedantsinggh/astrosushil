import * as crypto from 'crypto';

/**
 * AWS Signature Version 4 for S3-compatible object storage (AWS S3 and Cloudflare R2).
 * Pure functions: the caller supplies the date, so every output is reproducible and testable
 * against the vectors published in the AWS S3 documentation.
 */

export interface SigV4Credentials {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  /** Defaults to `s3`. */
  service?: string;
}

export const EMPTY_PAYLOAD_SHA256 = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
export const UNSIGNED_PAYLOAD = 'UNSIGNED-PAYLOAD';
/** S3 refuses presigned URLs valid for more than seven days. */
export const MAX_PRESIGN_SECONDS = 604800;

export function sha256Hex(data: Buffer | string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/** RFC 3986 percent-encoding as SigV4 requires (encodeURIComponent leaves !'()* alone). */
export function encodeRfc3986(value: string): string {
  return encodeURIComponent(value).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}

/** Canonical URI for an object key: every segment encoded, slashes kept. No leading slash. */
export function encodeKeyPath(key: string): string {
  return key.split('/').map(encodeRfc3986).join('/');
}

export function amzDates(date: Date): { dateIso: string; dateStamp: string } {
  const dateIso = date.toISOString().replace(/[:-]|\.\d{3}/g, ''); // YYYYMMDDTHHMMSSZ
  return { dateIso, dateStamp: dateIso.slice(0, 8) };
}

export function canonicalQueryString(query: Record<string, string>): string {
  return Object.keys(query)
    .map((k) => [encodeRfc3986(k), encodeRfc3986(query[k])] as const)
    .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
    .map(([k, v]) => `${k}=${v}`)
    .join('&');
}

function hmac(key: Buffer | string, data: string): Buffer {
  return crypto.createHmac('sha256', key).update(data).digest();
}

function signingKey(creds: SigV4Credentials, dateStamp: string): Buffer {
  const kDate = hmac(`AWS4${creds.secretAccessKey}`, dateStamp);
  const kRegion = hmac(kDate, creds.region);
  const kService = hmac(kRegion, creds.service || 's3');
  return hmac(kService, 'aws4_request');
}

function credentialScope(creds: SigV4Credentials, dateStamp: string): string {
  return `${dateStamp}/${creds.region}/${creds.service || 's3'}/aws4_request`;
}

function sign(creds: SigV4Credentials, dateIso: string, dateStamp: string, canonicalRequest: string): string {
  const stringToSign = ['AWS4-HMAC-SHA256', dateIso, credentialScope(creds, dateStamp), sha256Hex(canonicalRequest)].join('\n');
  return crypto.createHmac('sha256', signingKey(creds, dateStamp)).update(stringToSign).digest('hex');
}

export interface SignRequestInput {
  method: string;
  /** Canonical URI, already encoded, with the leading slash (e.g. `/assets/a%20b.png`). */
  canonicalUri: string;
  query?: Record<string, string>;
  /** Every header that will be sent, `host` included. All of them are signed. */
  headers: Record<string, string>;
  /** Hex SHA-256 of the body (EMPTY_PAYLOAD_SHA256 for no body). */
  payloadHash: string;
  date: Date;
  credentials: SigV4Credentials;
}

export interface SignRequestResult {
  authorization: string;
  signature: string;
  signedHeaders: string;
  canonicalRequest: string;
}

/** Header-based signing: returns the value of the `Authorization` header. */
export function signRequest(input: SignRequestInput): SignRequestResult {
  const { dateIso, dateStamp } = amzDates(input.date);
  const lowered: Record<string, string> = {};
  for (const [name, value] of Object.entries(input.headers)) {
    lowered[name.toLowerCase()] = value.trim().replace(/\s+/g, ' ');
  }
  const names = Object.keys(lowered).sort();
  const canonicalHeaders = names.map((n) => `${n}:${lowered[n]}\n`).join('');
  const signedHeaders = names.join(';');

  const canonicalRequest = [
    input.method.toUpperCase(),
    input.canonicalUri,
    canonicalQueryString(input.query || {}),
    canonicalHeaders,
    signedHeaders,
    input.payloadHash,
  ].join('\n');

  const signature = sign(input.credentials, dateIso, dateStamp, canonicalRequest);
  return {
    signature,
    signedHeaders,
    canonicalRequest,
    authorization: `AWS4-HMAC-SHA256 Credential=${input.credentials.accessKeyId}/${credentialScope(input.credentials, dateStamp)}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
  };
}

export interface PresignInput {
  method: string;
  host: string;
  /** Canonical URI, already encoded, with the leading slash. */
  canonicalUri: string;
  /** Extra query parameters to sign (e.g. response-content-disposition). */
  query?: Record<string, string>;
  expiresInSeconds: number;
  date: Date;
  credentials: SigV4Credentials;
}

/** Query-string signing: returns a complete https URL valid for `expiresInSeconds`. */
export function presignUrl(input: PresignInput): string {
  const { dateIso, dateStamp } = amzDates(input.date);
  const expires = Math.min(MAX_PRESIGN_SECONDS, Math.max(1, Math.floor(input.expiresInSeconds)));
  const query: Record<string, string> = {
    ...(input.query || {}),
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': `${input.credentials.accessKeyId}/${credentialScope(input.credentials, dateStamp)}`,
    'X-Amz-Date': dateIso,
    'X-Amz-Expires': String(expires),
    'X-Amz-SignedHeaders': 'host',
  };
  const canonicalQuery = canonicalQueryString(query);
  const canonicalRequest = [
    input.method.toUpperCase(),
    input.canonicalUri,
    canonicalQuery,
    `host:${input.host}\n`,
    'host',
    UNSIGNED_PAYLOAD,
  ].join('\n');
  const signature = sign(input.credentials, dateIso, dateStamp, canonicalRequest);
  return `https://${input.host}${input.canonicalUri}?${canonicalQuery}&X-Amz-Signature=${signature}`;
}
