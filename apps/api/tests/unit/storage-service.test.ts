import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { storageService } from '../../src/services/storage.service';
import { resolveStorageTarget, publicObjectAcl } from '../../src/services/storage/storage-config';

const STORAGE_ENV = [
  'STORAGE_PROVIDER',
  'STORAGE_LOCAL_DIR',
  'PUBLIC_API_URL',
  'AWS_STORAGE_BUCKET_NAME',
  'AWS_S3_REGION_NAME',
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'AWS_S3_PUBLIC_ACL',
  'R2_ACCOUNT_ID',
  'S3_ACCOUNT_ID',
  'R2_ACCESS_KEY_ID',
  'S3_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'S3_SECRET_ACCESS_KEY',
  'R2_BUCKET_NAME',
  'S3_BUCKET_NAME',
  'R2_REGION',
  'S3_REGION',
  'NODE_ENV',
];

const AWS_ENV = {
  AWS_STORAGE_BUCKET_NAME: 'astro-test-bucket',
  AWS_S3_REGION_NAME: 'ap-southeast-2',
  AWS_ACCESS_KEY_ID: 'AKIAIOSFODNN7EXAMPLE',
  AWS_SECRET_ACCESS_KEY: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
};
const R2_ENV = { R2_ACCOUNT_ID: 'acct123', R2_ACCESS_KEY_ID: 'r2key', R2_SECRET_ACCESS_KEY: 'r2secret' };
const AWS_HOST = 'astro-test-bucket.s3.ap-southeast-2.amazonaws.com';

describe('storage: provider selection and public / private behaviour', () => {
  const saved: Record<string, string | undefined> = {};
  let tmpDir: string;
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    for (const name of STORAGE_ENV) {
      saved[name] = process.env[name];
      delete process.env[name];
    }
    process.env.NODE_ENV = 'test';
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'astro-storage-test-'));
    process.env.STORAGE_LOCAL_DIR = tmpDir;
    // Any real network call in this file is a bug: every fetch is intercepted.
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response(null, { status: 200 }));
  });

  afterEach(() => {
    fetchSpy.mockRestore();
    fs.rmSync(tmpDir, { recursive: true, force: true });
    for (const name of STORAGE_ENV) {
      if (saved[name] === undefined) delete process.env[name];
      else process.env[name] = saved[name];
    }
  });

  describe('provider selection', () => {
    it('uses local disk when nothing is configured', () => {
      expect(resolveStorageTarget({})).toBeNull();
      expect(storageService.providerName).toBe('local');
    });

    it('does not switch to S3 on generic AWS credentials alone', () => {
      expect(resolveStorageTarget({ AWS_ACCESS_KEY_ID: 'x', AWS_SECRET_ACCESS_KEY: 'y' })).toBeNull();
    });

    it('uses AWS S3 with the website variable names', () => {
      expect(resolveStorageTarget(AWS_ENV)).toMatchObject({ provider: 'aws', bucket: 'astro-test-bucket', region: 'ap-southeast-2', host: AWS_HOST });
    });

    it('keeps existing R2 deployments on R2 unless STORAGE_PROVIDER says otherwise', () => {
      expect(resolveStorageTarget(R2_ENV)).toMatchObject({
        provider: 'r2',
        region: 'auto',
        host: 'astro-sushil-reports.acct123.r2.cloudflarestorage.com',
      });
      expect(resolveStorageTarget({ ...R2_ENV, ...AWS_ENV })?.provider).toBe('r2');
      expect(resolveStorageTarget({ ...R2_ENV, ...AWS_ENV, STORAGE_PROVIDER: 'aws' })?.provider).toBe('aws');
      expect(resolveStorageTarget({ ...R2_ENV, ...AWS_ENV, STORAGE_PROVIDER: 'local' })).toBeNull();
    });

    it('treats a named but incomplete provider as not configured, which production refuses', async () => {
      expect(resolveStorageTarget({ STORAGE_PROVIDER: 'aws', AWS_STORAGE_BUCKET_NAME: 'b' })).toBeNull();
      process.env.NODE_ENV = 'production';
      process.env.STORAGE_PROVIDER = 'aws';
      await expect(storageService.upload({ key: 'assets/banner/x.png', body: Buffer.from('x') })).rejects.toThrow(/STORAGE_CONFIGURATION_ERROR/);
      expect(() => storageService.getPublicUrl('assets/banner/x.png')).toThrow(/STORAGE_CONFIGURATION_ERROR/);
    });

    it('reads the public ACL setting', () => {
      expect(publicObjectAcl({})).toBe('public-read');
      expect(publicObjectAcl({ AWS_S3_PUBLIC_ACL: 'none' })).toBeNull();
    });
  });

  describe('AWS S3', () => {
    beforeEach(() => Object.assign(process.env, AWS_ENV));

    function lastRequest() {
      const [url, init] = fetchSpy.mock.calls[fetchSpy.mock.calls.length - 1] as [string, { method: string; headers: Record<string, string> }];
      return { url, method: init.method, headers: init.headers };
    }

    it('stores a private object without any ACL and returns no public location to callers that sign', async () => {
      const result = await storageService.upload({ key: 'reports/user-1/report-1.pdf', body: Buffer.from('%PDF-1.7') });
      const req = lastRequest();
      expect(req.method).toBe('PUT');
      expect(req.url).toBe(`https://${AWS_HOST}/reports/user-1/report-1.pdf`);
      expect(req.headers['x-amz-acl']).toBeUndefined();
      expect(req.headers['content-type']).toBe('application/pdf');
      expect(req.headers.Authorization).toContain('/ap-southeast-2/s3/aws4_request');
      expect(result).toMatchObject({ key: 'reports/user-1/report-1.pdf', fileSize: 8 });
    });

    it('stores a public object with the public-read ACL and a cache header', async () => {
      await storageService.upload({
        key: 'assets/banner/2026/11/a.png',
        body: Buffer.from('x'),
        contentType: 'image/png',
        visibility: 'public',
        cacheControl: 'public, max-age=31536000, immutable',
      });
      const req = lastRequest();
      expect(req.headers['x-amz-acl']).toBe('public-read');
      expect(req.headers['cache-control']).toBe('public, max-age=31536000, immutable');
    });

    it('omits the ACL for public objects when the bucket uses a policy instead', async () => {
      process.env.AWS_S3_PUBLIC_ACL = 'none';
      await storageService.upload({ key: 'assets/banner/2026/11/a.png', body: Buffer.from('x'), contentType: 'image/png', visibility: 'public' });
      expect(lastRequest().headers['x-amz-acl']).toBeUndefined();
    });

    it('gives public objects the plain bucket URL the website used', () => {
      expect(storageService.getPublicUrl('assets/banner/2026/11/a.png')).toBe(`https://${AWS_HOST}/assets/banner/2026/11/a.png`);
    });

    it('gives private objects only a short-lived signed URL', async () => {
      const url = await storageService.getSignedDownloadUrl('private/digital-product/2026/11/f.pdf', 120, { downloadFileName: 'guide.pdf' });
      expect(url.startsWith(`https://${AWS_HOST}/private/digital-product/2026/11/f.pdf?`)).toBe(true);
      expect(url).toContain('X-Amz-Expires=120');
      expect(url).toContain('X-Amz-Credential=AKIAIOSFODNN7EXAMPLE%2F');
      expect(url).toContain('response-content-disposition=');
      expect(url).toMatch(/X-Amz-Signature=[0-9a-f]{64}$/);
      expect(url).not.toContain('wJalrXUtnFEMI');
      expect(fetchSpy).not.toHaveBeenCalled(); // signing is local, no request is made
    });

    it('deletes by key and can make a website-era object private', async () => {
      await storageService.delete('assets/1700000000000-old-banner.webp');
      expect(lastRequest()).toMatchObject({ method: 'DELETE', url: `https://${AWS_HOST}/assets/1700000000000-old-banner.webp` });
      await storageService.makePrivate('assets/1700000000000-ebook.pdf');
      const req = lastRequest();
      expect(req.url).toBe(`https://${AWS_HOST}/assets/1700000000000-ebook.pdf?acl`);
      expect(req.headers['x-amz-acl']).toBe('private');
    });

    it('resolves absolute website URLs of our bucket to keys and rejects everything else', () => {
      const key = 'assets/1700000000000-my-banner.webp';
      expect(storageService.resolveKey(`https://${AWS_HOST}/${key}`)).toBe(key);
      expect(storageService.resolveKey(`https://${AWS_HOST}/${key}?X-Amz-Signature=abc`)).toBe(key);
      expect(storageService.resolveKey(`https://astro-test-bucket.s3.amazonaws.com/${key}`)).toBe(key);
      expect(storageService.resolveKey(`https://s3.ap-southeast-2.amazonaws.com/astro-test-bucket/${key}`)).toBe(key);
      expect(storageService.resolveKey(`https://${AWS_HOST}/assets/a%20b.png`)).toBe('assets/a b.png');
      expect(storageService.resolveKey(key)).toBe(key);

      expect(storageService.resolveKey('https://other-bucket.s3.ap-southeast-2.amazonaws.com/assets/x.png')).toBeNull();
      expect(storageService.resolveKey('https://s3.ap-southeast-2.amazonaws.com/other-bucket/assets/x.png')).toBeNull();
      expect(storageService.resolveKey(`https://${AWS_HOST}.evil.example/assets/x.png`)).toBeNull();
      expect(storageService.resolveKey('https://evil.example/assets/x.png')).toBeNull();
      expect(storageService.resolveKey(`https://${AWS_HOST}/assets/..%2F..%2Fetc%2Fpasswd`)).toBeNull();
      expect(storageService.resolveKey('javascript:alert(1)')).toBeNull();
      expect(storageService.resolveKey('../etc/passwd')).toBeNull();
      expect(storageService.resolveKey('/etc/passwd')).toBeNull();
      expect(storageService.resolveKey('')).toBeNull();
      expect(storageService.resolveKey(null)).toBeNull();
    });

    it('only removes orphaned report PDFs, never the website files that sit directly under reports/', async () => {
      fetchSpy.mockImplementation(async (_url: unknown, init?: { method?: string }) => {
        if (init?.method === 'GET') {
          return new Response(
            '<R><Contents><Key>reports/CAREER-REPORT.webp</Key></Contents><Contents><Key>reports/u1/keep.pdf</Key></Contents><Contents><Key>reports/u1/orphan.pdf</Key></Contents></R>',
            { status: 200 }
          );
        }
        return new Response(null, { status: 204 });
      });
      const result = await storageService.cleanupOrphanedObjects(new Set(['reports/u1/keep.pdf']));
      expect(result.deletedKeys).toEqual(['reports/u1/orphan.pdf']);
    });
  });

  describe('Cloudflare R2 (existing report storage) keeps working', () => {
    beforeEach(() => Object.assign(process.env, R2_ENV));

    it('uploads and signs against the R2 endpoint with region auto', async () => {
      await storageService.upload({ key: 'reports/user-1/report-1.pdf', body: Buffer.from('%PDF-1.7') });
      const [url, init] = fetchSpy.mock.calls[0] as [string, { headers: Record<string, string> }];
      expect(url).toBe('https://astro-sushil-reports.acct123.r2.cloudflarestorage.com/reports/user-1/report-1.pdf');
      expect(init.headers.Authorization).toContain('Credential=r2key/');
      expect(init.headers.Authorization).toContain('/auto/s3/aws4_request');
      expect(init.headers['x-amz-acl']).toBeUndefined();

      const signed = await storageService.getSignedDownloadUrl('reports/user-1/report-1.pdf', 900);
      expect(signed.startsWith('https://astro-sushil-reports.acct123.r2.cloudflarestorage.com/reports/user-1/report-1.pdf?')).toBe(true);
      expect(signed).toContain('X-Amz-Expires=900');
    });
  });

  describe('local disk (development and tests)', () => {
    it('round-trips an object and never touches the network', async () => {
      const key = 'private/digital-product/2026/11/file.pdf';
      await storageService.upload({ key, body: Buffer.from('%PDF-local'), contentType: 'application/pdf' });
      expect(await storageService.exists(key)).toBe(true);
      expect((await storageService.downloadBuffer(key)).toString()).toBe('%PDF-local');
      await storageService.delete(key);
      expect(await storageService.exists(key)).toBe(false);
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('serves public objects through the development route and maps that URL back to the key', () => {
      process.env.PUBLIC_API_URL = 'http://localhost:3000';
      const url = storageService.getPublicUrl('assets/banner/2026/11/a.png');
      expect(url).toBe('http://localhost:3000/api/v1/uploads/local/assets/banner/2026/11/a.png');
      expect(storageService.resolveKey(url)).toBe('assets/banner/2026/11/a.png');
      expect(storageService.resolveKey('http://localhost:3000/api/v1/reports/x')).toBeNull();
    });

    it('signs private objects with the expiring local token', async () => {
      const key = 'private/digital-product/2026/11/file.pdf';
      const url = new URL(await storageService.getSignedDownloadUrl(key, 60));
      expect(url.pathname).toBe('/api/v1/reports/download-secure');
      const expires = Number(url.searchParams.get('expires'));
      const token = url.searchParams.get('token') as string;
      expect(storageService.verifyLocalSignedUrl(key, expires, token)).toBe(true);
      expect(storageService.verifyLocalSignedUrl('private/digital-product/2026/11/other.pdf', expires, token)).toBe(false);
    });

    it('still recognises website bucket URLs when only the bucket name and region are known', () => {
      process.env.AWS_STORAGE_BUCKET_NAME = 'astro-test-bucket';
      process.env.AWS_S3_REGION_NAME = 'ap-southeast-2';
      expect(storageService.providerName).toBe('local');
      expect(storageService.resolveKey(`https://${AWS_HOST}/assets/1700-x.webp`)).toBe('assets/1700-x.webp');
    });

    it('rejects path traversal keys', async () => {
      await expect(storageService.upload({ key: '../outside.pdf', body: Buffer.from('x') })).rejects.toThrow(/Path traversal/);
    });
  });
});
