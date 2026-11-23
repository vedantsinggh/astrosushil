import {
  EMPTY_PAYLOAD_SHA256,
  encodeKeyPath,
  presignUrl,
  sha256Hex,
  signRequest,
  amzDates,
} from './sigv4';
import { S3Target } from './storage-config';

/** The subset of `fetch` this client needs; tests pass a fake so no network call is ever made. */
export type FetchLike = (url: string, init: { method: string; headers: Record<string, string>; body?: Uint8Array<ArrayBuffer> }) => Promise<Response>;

export interface S3PutInput {
  key: string;
  body: Buffer;
  contentType: string;
  /** Canned ACL (`public-read`). Omitted = the bucket default, which is private. */
  acl?: string | null;
  cacheControl?: string;
  /** Hex SHA-256 of the body when the caller already has it. */
  payloadHash?: string;
}

export interface S3HeadResult {
  size: number;
  contentType?: string;
  lastModified?: Date;
}

export class S3RequestError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = 'S3RequestError';
  }
}

/**
 * Minimal S3 REST client (PutObject, GetObject, HeadObject, DeleteObject, ListObjectsV2,
 * PutObjectAcl, presigned GET) for AWS S3 and Cloudflare R2, signed with SigV4.
 * No SDK dependency; it never logs credentials or request headers.
 */
export class S3ObjectClient {
  constructor(
    private readonly target: S3Target,
    private readonly fetchImpl: FetchLike = (url, init) => fetch(url, init),
    private readonly now: () => Date = () => new Date()
  ) {}

  public get host(): string {
    return this.target.host;
  }

  /** Plain (unsigned) https URL of an object. Only readable by the public when the object is public. */
  public objectUrl(key: string): string {
    return `https://${this.target.host}/${encodeKeyPath(key)}`;
  }

  private async send(
    method: string,
    key: string | null,
    options: { query?: Record<string, string>; headers?: Record<string, string>; body?: Buffer; payloadHash?: string } = {}
  ): Promise<Response> {
    const date = this.now();
    const canonicalUri = key === null ? '/' : `/${encodeKeyPath(key)}`;
    const payloadHash = options.payloadHash || (options.body ? sha256Hex(options.body) : EMPTY_PAYLOAD_SHA256);
    const headers: Record<string, string> = {
      host: this.target.host,
      'x-amz-date': amzDates(date).dateIso,
      'x-amz-content-sha256': payloadHash,
      ...(options.headers || {}),
    };
    const { authorization } = signRequest({
      method,
      canonicalUri,
      query: options.query,
      headers,
      payloadHash,
      date,
      credentials: this.target,
    });
    const queryString = options.query
      ? Object.entries(options.query)
          .map(([k, v]) => (v === '' ? encodeURIComponent(k) : `${encodeURIComponent(k)}=${encodeURIComponent(v)}`))
          .join('&')
      : '';
    const url = `https://${this.target.host}${canonicalUri}${queryString ? `?${queryString}` : ''}`;
    return this.fetchImpl(url, {
      method,
      headers: { ...headers, Authorization: authorization },
      body: options.body ? new Uint8Array(options.body) : undefined,
    });
  }

  public async putObject(input: S3PutInput): Promise<void> {
    const headers: Record<string, string> = {
      'content-type': input.contentType,
      'content-length': String(input.body.length),
    };
    if (input.acl) headers['x-amz-acl'] = input.acl;
    if (input.cacheControl) headers['cache-control'] = input.cacheControl;
    const res = await this.send('PUT', input.key, { headers, body: input.body, payloadHash: input.payloadHash });
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new S3RequestError(`Object storage upload failed (${res.status}): ${errText || res.statusText}`, res.status);
    }
  }

  public async getObject(key: string): Promise<Buffer> {
    const res = await this.send('GET', key);
    if (!res.ok) {
      throw new S3RequestError(`Failed to download object from object storage (${res.status}): ${res.statusText}`, res.status);
    }
    return Buffer.from(await res.arrayBuffer());
  }

  public async headObject(key: string): Promise<S3HeadResult | null> {
    const res = await this.send('HEAD', key);
    if (!res.ok) return null;
    const sizeStr = res.headers.get('content-length');
    const lastModifiedStr = res.headers.get('last-modified');
    return {
      size: sizeStr ? parseInt(sizeStr, 10) : 0,
      contentType: res.headers.get('content-type') || undefined,
      lastModified: lastModifiedStr ? new Date(lastModifiedStr) : undefined,
    };
  }

  /** Deleting a key that does not exist succeeds (S3 answers 204). Returns whether S3 accepted it. */
  public async deleteObject(key: string): Promise<boolean> {
    const res = await this.send('DELETE', key);
    return res.ok || res.status === 404;
  }

  /** Changes the ACL of an existing object, e.g. to `private` for a paid file the website left public. */
  public async putObjectAcl(key: string, acl: string): Promise<void> {
    const res = await this.send('PUT', key, { query: { acl: '' }, headers: { 'x-amz-acl': acl } });
    if (!res.ok) {
      throw new S3RequestError(`Object storage ACL update failed (${res.status}): ${res.statusText}`, res.status);
    }
  }

  /** Keys under a prefix (follows continuation tokens). An error response yields an empty list. */
  public async listKeys(prefix: string): Promise<string[]> {
    const keys: string[] = [];
    let continuationToken: string | undefined;
    for (let page = 0; page < 1000; page++) {
      const query: Record<string, string> = { 'list-type': '2', prefix };
      if (continuationToken) query['continuation-token'] = continuationToken;
      const res = await this.send('GET', null, { query });
      if (!res.ok) return keys;
      const xml = await res.text().catch(() => '');
      for (const match of xml.match(/<Key>(.*?)<\/Key>/g) || []) {
        keys.push(decodeXml(match.replace(/<\/?Key>/g, '')));
      }
      const next = xml.match(/<NextContinuationToken>(.*?)<\/NextContinuationToken>/);
      if (!next) break;
      continuationToken = decodeXml(next[1]);
    }
    return keys;
  }

  public presignGetUrl(key: string, expiresInSeconds: number, options: { downloadFileName?: string } = {}): string {
    const query: Record<string, string> = {};
    if (options.downloadFileName) {
      query['response-content-disposition'] = `attachment; filename="${options.downloadFileName.replace(/[^A-Za-z0-9._ -]/g, '_')}"`;
    }
    return presignUrl({
      method: 'GET',
      host: this.target.host,
      canonicalUri: `/${encodeKeyPath(key)}`,
      query,
      expiresInSeconds,
      date: this.now(),
      credentials: this.target,
    });
  }
}

function decodeXml(value: string): string {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}
