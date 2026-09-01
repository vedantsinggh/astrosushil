import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

export interface ObjectStorageUploadInput {
  key: string;
  body: Buffer;
  contentType?: string;
  metadata?: Record<string, string>;
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

export class StorageService {
  private readonly localFallbackDir = path.resolve('/tmp/astro-sushil/storage');

  private get r2Config() {
    const accountId = process.env.R2_ACCOUNT_ID || process.env.S3_ACCOUNT_ID;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID || process.env.S3_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY || process.env.S3_SECRET_ACCESS_KEY;
    const bucketName = process.env.R2_BUCKET_NAME || process.env.S3_BUCKET_NAME || 'astro-sushil-reports';
    const region = process.env.R2_REGION || process.env.S3_REGION || 'auto';

    if (accountId && accessKeyId && secretAccessKey) {
      return {
        accountId,
        accessKeyId,
        secretAccessKey,
        bucketName,
        region,
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        host: `${bucketName}.${accountId}.r2.cloudflarestorage.com`,
      };
    }
    return null;
  }

  private get signingSecretKey(): string {
    return process.env.JWT_SECRET || process.env.STORAGE_SECRET || 'astro-sushil-storage-secret-key-v1';
  }

  /**
   * Uploads binary object (e.g. PDF report) to private Cloudflare R2 object storage
   * or local fallback directory.
   */
  public async upload(input: ObjectStorageUploadInput): Promise<ObjectStorageUploadResult> {
    const checksum = crypto.createHash('sha256').update(input.body).digest('hex');
    const contentType = input.contentType || 'application/pdf';
    const config = this.r2Config;

    if (config) {
      // Cloudflare R2 S3 API PutObject
      const url = `https://${config.host}/${input.key}`;
      const dateIso = new Date().toISOString().replace(/[:-]|\.\d{3}/g, ''); // YYYYMMDDTHHMMSSZ
      const dateStamp = dateIso.slice(0, 8); // YYYYMMDD

      const payloadHash = checksum;
      const headers: Record<string, string> = {
        'host': config.host,
        'x-amz-date': dateIso,
        'x-amz-content-sha256': payloadHash,
        'content-type': contentType,
        'content-length': input.body.length.toString(),
      };

      const authorization = this.computeS3V4Signature({
        method: 'PUT',
        path: `/${input.key}`,
        headers,
        payloadHash,
        dateIso,
        dateStamp,
        config,
      });

      headers['Authorization'] = authorization;

      const res = await fetch(url, {
        method: 'PUT',
        headers,
        body: new Uint8Array(input.body),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        throw new Error(`R2 Object Storage upload failed (${res.status}): ${errText || res.statusText}`);
      }

      return {
        key: input.key,
        fileSize: input.body.length,
        checksum,
        location: url,
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
   * Generates a short-lived signed download URL for private report viewing.
   */
  public async getSignedDownloadUrl(key: string, expiresInSeconds: number = 900): Promise<string> {
    const config = this.r2Config;
    const expiresAtMs = Date.now() + expiresInSeconds * 1000;

    if (config) {
      // Cloudflare R2 Presigned S3 GET URL
      const dateIso = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
      const dateStamp = dateIso.slice(0, 8);
      const credentialScope = `${dateStamp}/${config.region}/s3/aws4_request`;

      const queryParams: Record<string, string> = {
        'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
        'X-Amz-Credential': `${config.accessKeyId}/${credentialScope}`,
        'X-Amz-Date': dateIso,
        'X-Amz-Expires': expiresInSeconds.toString(),
        'X-Amz-SignedHeaders': 'host',
      };

      const canonicalQueryString = Object.keys(queryParams)
        .sort()
        .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(queryParams[k])}`)
        .join('&');

      const canonicalHeaders = `host:${config.host}\n`;
      const signedHeaders = 'host';
      const payloadHash = 'UNSIGNED-PAYLOAD';

      const canonicalRequest = [
        'GET',
        `/${inputPathEncoder(key)}`,
        canonicalQueryString,
        canonicalHeaders,
        signedHeaders,
        payloadHash,
      ].join('\n');

      const stringToSign = [
        'AWS4-HMAC-SHA256',
        dateIso,
        credentialScope,
        crypto.createHash('sha256').update(canonicalRequest).digest('hex'),
      ].join('\n');

      const kDate = crypto.createHmac('sha256', `AWS4${config.secretAccessKey}`).update(dateStamp).digest();
      const kRegion = crypto.createHmac('sha256', kDate).update(config.region).digest();
      const kService = crypto.createHmac('sha256', kRegion).update('s3').digest();
      const kSigning = crypto.createHmac('sha256', kService).update('aws4_request').digest();
      const signature = crypto.createHmac('sha256', kSigning).update(stringToSign).digest('hex');

      return `https://${config.host}/${inputPathEncoder(key)}?${canonicalQueryString}&X-Amz-Signature=${signature}`;
    }

    // Local / Backend Tokenized Signed URL Fallback
    const baseUrl = process.env.PUBLIC_API_URL || 'http://localhost:3000';
    const payload = `${key}:${expiresAtMs}`;
    const token = crypto.createHmac('sha256', this.signingSecretKey).update(payload).digest('hex');

    return `${baseUrl}/api/v1/reports/download-secure?key=${encodeURIComponent(key)}&expires=${expiresAtMs}&token=${token}`;
  }

  /**
   * Validates a tokenized local download signature.
   */
  public verifyLocalSignedUrl(key: string, expiresMs: number, token: string): boolean {
    if (Date.now() > expiresMs) {
      return false;
    }
    const payload = `${key}:${expiresMs}`;
    const expectedToken = crypto.createHmac('sha256', this.signingSecretKey).update(payload).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expectedToken));
  }

  /**
   * Deletes object from Cloudflare R2 or local disk storage.
   */
  public async delete(key: string): Promise<void> {
    const config = this.r2Config;
    if (config) {
      const url = `https://${config.host}/${key}`;
      const dateIso = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
      const dateStamp = dateIso.slice(0, 8);
      const payloadHash = crypto.createHash('sha256').update('').digest('hex');

      const headers: Record<string, string> = {
        'host': config.host,
        'x-amz-date': dateIso,
        'x-amz-content-sha256': payloadHash,
      };

      const authorization = this.computeS3V4Signature({
        method: 'DELETE',
        path: `/${key}`,
        headers,
        payloadHash,
        dateIso,
        dateStamp,
        config,
      });

      headers['Authorization'] = authorization;
      await fetch(url, { method: 'DELETE', headers });
      return;
    }

    const localFilePath = path.join(this.localFallbackDir, key);
    if (fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
    }
  }

  /**
   * Checks if object exists in Cloudflare R2 or local disk storage.
   */
  public async exists(key: string): Promise<boolean> {
    const config = this.r2Config;
    if (config) {
      const url = `https://${config.host}/${key}`;
      const dateIso = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
      const dateStamp = dateIso.slice(0, 8);
      const payloadHash = crypto.createHash('sha256').update('').digest('hex');

      const headers: Record<string, string> = {
        'host': config.host,
        'x-amz-date': dateIso,
        'x-amz-content-sha256': payloadHash,
      };

      const authorization = this.computeS3V4Signature({
        method: 'HEAD',
        path: `/${key}`,
        headers,
        payloadHash,
        dateIso,
        dateStamp,
        config,
      });

      headers['Authorization'] = authorization;
      const res = await fetch(url, { method: 'HEAD', headers });
      return res.ok;
    }

    const localFilePath = path.join(this.localFallbackDir, key);
    return fs.existsSync(localFilePath);
  }

  /**
   * Gets metadata for object in Cloudflare R2 or local disk storage.
   */
  public async getMetadata(key: string): Promise<ObjectMetadata | null> {
    const config = this.r2Config;
    if (config) {
      const url = `https://${config.host}/${key}`;
      const dateIso = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
      const dateStamp = dateIso.slice(0, 8);
      const payloadHash = crypto.createHash('sha256').update('').digest('hex');

      const headers: Record<string, string> = {
        'host': config.host,
        'x-amz-date': dateIso,
        'x-amz-content-sha256': payloadHash,
      };

      const authorization = this.computeS3V4Signature({
        method: 'HEAD',
        path: `/${key}`,
        headers,
        payloadHash,
        dateIso,
        dateStamp,
        config,
      });

      headers['Authorization'] = authorization;
      const res = await fetch(url, { method: 'HEAD', headers });
      if (!res.ok) return null;

      const sizeStr = res.headers.get('content-length');
      const contentType = res.headers.get('content-type') || undefined;
      const lastModifiedStr = res.headers.get('last-modified');

      return {
        size: sizeStr ? parseInt(sizeStr, 10) : 0,
        contentType,
        lastModified: lastModifiedStr ? new Date(lastModifiedStr) : undefined,
      };
    }

    const localFilePath = path.join(this.localFallbackDir, key);
    if (!fs.existsSync(localFilePath)) return null;

    const stats = fs.statSync(localFilePath);
    return {
      size: stats.size,
      contentType: 'application/pdf',
      lastModified: stats.mtime,
    };
  }

  /**
   * Downloads raw buffer of an object from Cloudflare R2 or local disk.
   */
  public async downloadBuffer(key: string): Promise<Buffer> {
    const config = this.r2Config;
    if (config) {
      const url = `https://${config.host}/${key}`;
      const dateIso = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
      const dateStamp = dateIso.slice(0, 8);
      const payloadHash = crypto.createHash('sha256').update('').digest('hex');

      const headers: Record<string, string> = {
        'host': config.host,
        'x-amz-date': dateIso,
        'x-amz-content-sha256': payloadHash,
      };

      const authorization = this.computeS3V4Signature({
        method: 'GET',
        path: `/${key}`,
        headers,
        payloadHash,
        dateIso,
        dateStamp,
        config,
      });

      headers['Authorization'] = authorization;
      const res = await fetch(url, { method: 'GET', headers });
      if (!res.ok) {
        throw new Error(`Failed to download object from R2 (${res.status}): ${res.statusText}`);
      }
      const arrayBuffer = await res.arrayBuffer();
      return Buffer.from(arrayBuffer);
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

  private computeS3V4Signature(params: {
    method: string;
    path: string;
    headers: Record<string, string>;
    payloadHash: string;
    dateIso: string;
    dateStamp: string;
    config: { accountId: string; accessKeyId: string; secretAccessKey: string; bucketName: string; region: string; host: string };
  }): string {
    const { method, path, headers, payloadHash, dateIso, dateStamp, config } = params;
    const credentialScope = `${dateStamp}/${config.region}/s3/aws4_request`;

    const sortedHeaderKeys = Object.keys(headers)
      .map((k) => k.toLowerCase())
      .sort();

    const canonicalHeaders = sortedHeaderKeys
      .map((k) => `${k}:${headers[k].trim()}\n`)
      .join('');

    const signedHeaders = sortedHeaderKeys.join(';');

    const canonicalRequest = [
      method,
      path,
      '', // canonical query string
      canonicalHeaders,
      signedHeaders,
      payloadHash,
    ].join('\n');

    const stringToSign = [
      'AWS4-HMAC-SHA256',
      dateIso,
      credentialScope,
      crypto.createHash('sha256').update(canonicalRequest).digest('hex'),
    ].join('\n');

    const kDate = crypto.createHmac('sha256', `AWS4${config.secretAccessKey}`).update(dateStamp).digest();
    const kRegion = crypto.createHmac('sha256', kDate).update(config.region).digest();
    const kService = crypto.createHmac('sha256', kRegion).update('s3').digest();
    const kSigning = crypto.createHmac('sha256', kService).update('aws4_request').digest();
    const signature = crypto.createHmac('sha256', kSigning).update(stringToSign).digest('hex');

    return `AWS4-HMAC-SHA256 Credential=${config.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  }
}

function inputPathEncoder(pathStr: string): string {
  return pathStr.split('/').map((segment) => encodeURIComponent(segment)).join('/');
}

export const storageService = new StorageService();
