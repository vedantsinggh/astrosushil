import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { logger } from '../utils/logger';
import { S3ObjectClient } from './storage/s3-client';
import { encodeKeyPath } from './storage/sigv4';
import {
  awsBucketHost,
  knownAwsBucket,
  LegacyAwsBucket,
  parseLegacyAwsBuckets,
  publicObjectAcl,
  resolveStorageTarget,
  S3Target,
} from './storage/storage-config';

/**
 * `private` (the default): never publicly readable; reachable only through a short-lived signed URL
 * handed out after an ownership / purchase check (report PDFs, paid digital files, invoices).
 * `public`: readable by anyone at a plain URL (banners, blog and product images).
 */
export type ObjectVisibility = 'public' | 'private';

export interface ObjectStorageUploadInput {
  key: string;
  body: Buffer;
  contentType?: string;
  metadata?: Record<string, string>;
  /** Defaults to `private`. */
  visibility?: ObjectVisibility;
  cacheControl?: string;
}

export interface ObjectStorageUploadResult {
  key: string;
  fileSize: number;
  checksum: string;
  location?: string;
}

export interface ObjectMetadata {
  size: number;
  contentType?: string;
  lastModified?: Date;
}

export interface SignedDownloadOptions {
  /** Makes the browser save the file under this name (remote stores only). */
  downloadFileName?: string;
}

/** Path (under the API base URL) that serves `public` objects from local disk outside production. */
export const LOCAL_PUBLIC_ROUTE_PREFIX = '/api/v1/uploads/local/';

const LOCAL_CONTENT_TYPES: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.mp4': 'video/mp4',
  '.zip': 'application/zip',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

/**
 * One storage abstraction for the whole backend. The remote store is S3-compatible and chosen by
 * environment (AWS S3 or Cloudflare R2, see ./storage/storage-config.ts); without one, files go to
 * local disk, which is refused in production.
 */
export class StorageService {
  private get localFallbackDir(): string {
    return path.resolve(process.env.STORAGE_LOCAL_DIR || '/tmp/astro-sushil/storage');
  }

  private ensureConfiguredInProduction(): void {
    if (process.env.NODE_ENV === 'production' && !this.remoteTarget) {
      throw new Error(
        'STORAGE_CONFIGURATION_ERROR: AWS S3 / Cloudflare R2 object storage credentials must be configured in production. Ephemeral local disk fallback is disabled in production.'
      );
    }
  }

  private get remoteTarget(): S3Target | null {
    return resolveStorageTarget(process.env);
  }

  private get remoteClient(): S3ObjectClient | null {
    const target = this.remoteTarget;
    return target ? new S3ObjectClient(target) : null;
  }

  /** `aws`, `r2` or `local`: which store is active for this process. */
  public get providerName(): 'aws' | 'r2' | 'local' {
    return this.remoteTarget?.provider || 'local';
  }

  private get publicApiBaseUrl(): string {
    return (process.env.PUBLIC_API_URL || 'http://localhost:3000').replace(/\/+$/, '');
  }

  private ephemeralSigningKey?: string;

  private get signingSecretKey(): string {
    const configured = process.env.JWT_SECRET || process.env.STORAGE_SECRET;
    if (configured) {
      return configured;
    }
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET or STORAGE_SECRET must be configured in production');
    }
    if (!this.ephemeralSigningKey) {
      this.ephemeralSigningKey = crypto.randomBytes(32).toString('hex');
    }
    return this.ephemeralSigningKey;
  }

  private validateKey(key: string): void {
    if (!key || typeof key !== 'string') {
      throw new Error('Invalid storage key');
    }
    if (key.includes('\0') || key.includes('\n') || key.includes('\r')) {
      throw new Error('Security Error: Path traversal attempt detected');
    }
    const normalized = path.normalize(key);
    if (normalized.startsWith('..') || path.isAbsolute(normalized) || key.includes('..') || normalized.includes('../') || normalized.includes('..\\')) {
      throw new Error('Security Error: Path traversal attempt detected');
    }
  }

  /**
   * Uploads a binary object (report PDF, admin upload) to the configured object store or to the
   * local fallback directory. Objects are private unless `visibility: 'public'` is passed.
   */
  public async upload(input: ObjectStorageUploadInput): Promise<ObjectStorageUploadResult> {
    this.validateKey(input.key);
    this.ensureConfiguredInProduction();
    const checksum = crypto.createHash('sha256').update(input.body).digest('hex');
    const contentType = input.contentType || 'application/pdf';
    const client = this.remoteClient;

    if (client) {
      await client.putObject({
        key: input.key,
        body: input.body,
        contentType,
        // A public ACL is only ever attached on explicit request; private objects carry none.
        acl: input.visibility === 'public' ? publicObjectAcl(process.env) : null,
        cacheControl: input.cacheControl,
        payloadHash: checksum,
      });

      return {
        key: input.key,
        fileSize: input.body.length,
        checksum,
        location: client.objectUrl(input.key),
      };
    }

    // Local Disk Storage Fallback
    const localFilePath = path.join(this.localFallbackDir, input.key);
    fs.mkdirSync(path.dirname(localFilePath), { recursive: true });
    fs.writeFileSync(localFilePath, input.body);

    return {
      key: input.key,
      fileSize: input.body.length,
      checksum,
      location: localFilePath,
    };
  }

  /**
   * Plain URL of an object stored with `visibility: 'public'`. With a remote store this is the
   * bucket URL (the same shape the website stored: https://<bucket>.s3.<region>.amazonaws.com/<key>);
   * on local disk it is a development-only route of this API.
   */
  public getPublicUrl(key: string): string {
    this.validateKey(key);
    this.ensureConfiguredInProduction();
    const client = this.remoteClient;
    if (client) return client.objectUrl(key);
    return `${this.publicApiBaseUrl}${LOCAL_PUBLIC_ROUTE_PREFIX}${encodeKeyPath(key)}`;
  }

  private warnedLegacyValue?: string;

  /** STORAGE_LEGACY_AWS_BUCKETS, parsed; malformed entries are ignored and logged once. */
  private legacyBuckets(): LegacyAwsBucket[] {
    const raw = process.env.STORAGE_LEGACY_AWS_BUCKETS;
    const { buckets, invalid } = parseLegacyAwsBuckets(raw);
    if (invalid.length > 0 && this.warnedLegacyValue !== raw) {
      this.warnedLegacyValue = raw;
      logger.warn({ invalidEntries: invalid }, 'STORAGE_LEGACY_AWS_BUCKETS has malformed entries (expected bucket:region); they are ignored');
    }
    return buckets;
  }

  /**
   * Turns a stored reference into an object key of OUR store, or null when it points elsewhere.
   * Accepts a bare key, or an absolute URL of the configured bucket (the website stored absolute
   * URLs, sometimes without the key): virtual-hosted and path-style AWS URLs of the website bucket,
   * the active remote store's host, and the local development route. Query strings are ignored.
   * URLs of the buckets listed in STORAGE_LEGACY_AWS_BUCKETS map to the same key of the ACTIVE
   * store (their objects were copied there); the legacy bucket itself is never contacted.
   */
  public resolveKey(urlOrKey: string | null | undefined): string | null {
    if (!urlOrKey || typeof urlOrKey !== 'string') return null;
    const value = urlOrKey.trim();
    if (!value) return null;

    let key: string;
    if (/^[a-z][a-z0-9+.-]*:/i.test(value) || value.startsWith('//')) {
      let url: URL;
      try {
        url = new URL(value.startsWith('//') ? `https:${value}` : value);
      } catch {
        return null;
      }
      if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
      const host = url.host.toLowerCase();
      let rawPath: string | null = null;

      const bucketHosts = new Set<string>();
      const pathStyle: Array<{ host: string; bucket: string }> = [];
      const target = this.remoteTarget;
      if (target) bucketHosts.add(target.host.toLowerCase());
      // The configured website bucket, plus legacy buckets whose objects were copied into the
      // active store under the same key (STORAGE_LEGACY_AWS_BUCKETS; empty unless set).
      const awsBuckets = [knownAwsBucket(process.env), ...this.legacyBuckets()];
      for (const aws of awsBuckets) {
        if (!aws) continue;
        bucketHosts.add(awsBucketHost(aws.bucket, aws.region).toLowerCase());
        bucketHosts.add(`${aws.bucket}.s3.amazonaws.com`.toLowerCase());
        bucketHosts.add(`${aws.bucket}.s3-${aws.region}.amazonaws.com`.toLowerCase());
        pathStyle.push({ host: `s3.${aws.region}.amazonaws.com`, bucket: aws.bucket });
        pathStyle.push({ host: 's3.amazonaws.com', bucket: aws.bucket });
      }

      if (bucketHosts.has(host)) {
        rawPath = url.pathname.replace(/^\/+/, '');
      } else {
        const style = pathStyle.find((p) => p.host === host && url.pathname.startsWith(`/${p.bucket}/`));
        if (style) {
          rawPath = url.pathname.slice(style.bucket.length + 2);
        } else {
          let apiHost: string | null = null;
          try {
            apiHost = new URL(this.publicApiBaseUrl).host.toLowerCase();
          } catch {
            apiHost = null;
          }
          if (apiHost && host === apiHost && url.pathname.startsWith(LOCAL_PUBLIC_ROUTE_PREFIX)) {
            rawPath = url.pathname.slice(LOCAL_PUBLIC_ROUTE_PREFIX.length);
          }
        }
      }
      if (rawPath === null) return null;
      try {
        key = rawPath.split('/').map((segment) => decodeURIComponent(segment)).join('/');
      } catch {
        return null;
      }
    } else {
      key = value;
    }

    try {
      this.validateKey(key);
    } catch {
      return null;
    }
    return key;
  }

  /**
   * Generates a short-lived signed download URL for a private object.
   */
  public async getSignedDownloadUrl(key: string, expiresInSeconds: number = 900, options: SignedDownloadOptions = {}): Promise<string> {
    this.validateKey(key);
    this.ensureConfiguredInProduction();
    const client = this.remoteClient;
    const expiresAtMs = Date.now() + expiresInSeconds * 1000;

    if (client) {
      return client.presignGetUrl(key, expiresInSeconds, options);
    }

    // Local / Backend Tokenized Signed URL Fallback
    const payload = `${key}:${expiresAtMs}`;
    const token = crypto.createHmac('sha256', this.signingSecretKey).update(payload).digest('hex');

    return `${this.publicApiBaseUrl}/api/v1/reports/download-secure?key=${encodeURIComponent(key)}&expires=${expiresAtMs}&token=${token}`;
  }

  /**
   * Validates a tokenized local download signature.
   */
  public verifyLocalSignedUrl(key: string, expiresMs: number, token: string): boolean {
    if (process.env.NODE_ENV === 'production') {
      return false;
    }
    if (Date.now() > expiresMs) {
      return false;
    }
    const payload = `${key}:${expiresMs}`;
    const expectedToken = crypto.createHmac('sha256', this.signingSecretKey).update(payload).digest('hex');
    const tokenBuf = Buffer.from(token);
    const expectedBuf = Buffer.from(expectedToken);
    if (tokenBuf.length !== expectedBuf.length) {
      return false;
    }
    return crypto.timingSafeEqual(tokenBuf, expectedBuf);
  }

  /**
   * Deletes an object from the object store or local disk storage.
   */
  public async delete(key: string): Promise<void> {
    this.validateKey(key);
    this.ensureConfiguredInProduction();
    const client = this.remoteClient;
    if (client) {
      const accepted = await client.deleteObject(key);
      if (!accepted) {
        logger.warn({ storageKey: key }, 'Object storage refused a delete request');
      }
      return;
    }

    const localFilePath = path.join(this.localFallbackDir, key);
    if (fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
    }
  }

  /**
   * Removes public read access from an existing object (the website uploaded everything, paid
   * files included, with a public-read ACL). No-op on local disk.
   */
  public async makePrivate(key: string): Promise<void> {
    this.validateKey(key);
    this.ensureConfiguredInProduction();
    const client = this.remoteClient;
    if (client) await client.putObjectAcl(key, 'private');
  }

  /**
   * Checks if an object exists in the object store or local disk storage.
   */
  public async exists(key: string): Promise<boolean> {
    this.validateKey(key);
    this.ensureConfiguredInProduction();
    const client = this.remoteClient;
    if (client) {
      return (await client.headObject(key)) !== null;
    }

    const localFilePath = path.join(this.localFallbackDir, key);
    return fs.existsSync(localFilePath);
  }

  /**
   * Gets metadata for an object in the object store or local disk storage.
   */
  public async getMetadata(key: string): Promise<ObjectMetadata | null> {
    this.validateKey(key);
    this.ensureConfiguredInProduction();
    const client = this.remoteClient;
    if (client) {
      return client.headObject(key);
    }

    const localFilePath = path.join(this.localFallbackDir, key);
    if (!fs.existsSync(localFilePath)) return null;

    const stats = fs.statSync(localFilePath);
    return {
      size: stats.size,
      contentType: LOCAL_CONTENT_TYPES[path.extname(key).toLowerCase()] || 'application/pdf',
      lastModified: stats.mtime,
    };
  }

  /**
   * Downloads the raw buffer of an object from the object store or local disk.
   */
  public async downloadBuffer(key: string): Promise<Buffer> {
    this.validateKey(key);
    this.ensureConfiguredInProduction();
    const client = this.remoteClient;
    if (client) {
      return client.getObject(key);
    }

    const localFilePath = path.join(this.localFallbackDir, key);
    if (!fs.existsSync(localFilePath)) {
      throw new Error(`File not found: ${key}`);
    }
    return fs.readFileSync(localFilePath);
  }

  /**
   * Legacy method for backwards compatibility with existing presigned download helper
   */
  public async getPresignedDownloadUrl(reportId: string): Promise<string> {
    return this.getSignedDownloadUrl(`reports/career/${reportId}/career-report.pdf`, 900);
  }

  /**
   * Lists object storage keys under the local fallback directory or the remote bucket
   */
  public async listKeys(prefix = 'reports'): Promise<string[]> {
    const client = this.remoteClient;
    if (client) {
      return client.listKeys(prefix);
    }

    const baseDir = path.join(this.localFallbackDir, prefix);
    if (!fs.existsSync(baseDir)) return [];

    const keys: string[] = [];
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(fullPath);
        } else {
          const relKey = path.relative(this.localFallbackDir, fullPath);
          keys.push(relKey);
        }
      }
    };
    walk(baseDir);
    return keys;
  }

  /**
   * Safely cleans up orphaned report objects that are not registered in PostgreSQL.
   *
   * Only keys shaped like our report PDFs (`reports/<owner>/<file>`) are candidates. The website's
   * S3 bucket also holds its own files directly under `reports/` (report cover images such as
   * `reports/CAREER-REPORT.webp`); those are never ours to delete.
   */
  public async cleanupOrphanedObjects(validKeysSet: Set<string>): Promise<{ deletedCount: number; deletedKeys: string[] }> {
    const allKeys = await this.listKeys('reports');
    const orphanedKeys = allKeys.filter((k) => /^reports\/[^/]+\/.+/.test(k) && !validKeysSet.has(k));
    const deletedKeys: string[] = [];

    for (const key of orphanedKeys) {
      try {
        await this.delete(key);
        deletedKeys.push(key);
      } catch (err) {
        logger.error({ storageKey: key, err }, 'Failed to delete orphaned storage object');
      }
    }

    return { deletedCount: deletedKeys.length, deletedKeys };
  }
}

export const storageService = new StorageService();
