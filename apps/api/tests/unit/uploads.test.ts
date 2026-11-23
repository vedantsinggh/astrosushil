import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import Fastify, { FastifyInstance } from 'fastify';
import multipart from '@fastify/multipart';

// The acting admin's permissions come from the database in production; here they are fixed per user id.
const STAFF: Record<string, { email: string; isSuperAdmin: boolean; permissions: string[] }> = {
  'admin-uploader': { email: 'uploader@example.test', isSuperAdmin: false, permissions: ['uploads:create'] },
  'admin-reader': { email: 'reader@example.test', isSuperAdmin: false, permissions: ['banners:read'] },
};

vi.mock('../../src/modules/admin/rbac/rbac.resolver', () => ({
  resolveStaffAccess: vi.fn(async (userId: string) => {
    const staff = STAFF[userId];
    return {
      userId,
      email: staff?.email ?? null,
      legacyRole: 'ADMIN',
      isSuperAdmin: staff?.isSuperAdmin ?? false,
      permissions: staff?.permissions ?? [],
      role: staff ? { id: 'r1', name: 'Test Role', slug: 'test', isSuperAdmin: staff.isSuperAdmin, status: 'ACTIVE' } : null,
      denyReason: staff ? null : 'NO_ROLE',
      source: 'staff-profile',
    };
  }),
  accessHasAnyPermission: (access: { isSuperAdmin: boolean; permissions: string[] }, required: string[]) =>
    access.isSuperAdmin || required.some((p) => access.permissions.includes(p)),
}));

vi.mock('../../src/modules/admin/admin.service', () => ({
  adminService: { logAction: vi.fn(async () => undefined) },
}));

import { adminService } from '../../src/modules/admin/admin.service';
import { registerJwt } from '../../src/plugins/jwt';
import { globalErrorHandler } from '../../src/errors/error-handler';
import { uploadsRoutes } from '../../src/modules/uploads/uploads.routes';
import { uploadsService, ImageProcessor } from '../../src/modules/uploads/uploads.service';
import { storageService } from '../../src/services/storage.service';
import {
  classifyObjectKey,
  detectContentType,
  generateObjectKey,
  getUploadPolicy,
  MAX_UPLOAD_BYTES,
  UPLOAD_PURPOSES,
} from '../../src/services/storage/upload-policy';
import {
  deleteUploadedObject,
  getUploadedFileSignedUrl,
  resolveManagedKey,
  validateUploadedRef,
} from '../../src/services/storage/storage-refs';

// Smallest byte sequences that carry each format's signature.
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(32, 1)]);
const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(32, 1)]);
const GIF = Buffer.concat([Buffer.from('GIF89a'), Buffer.alloc(16, 1)]);
const WEBP = Buffer.concat([Buffer.from('RIFF'), Buffer.from([0x10, 0, 0, 0]), Buffer.from('WEBPVP8 '), Buffer.alloc(8, 1)]);
const PDF = Buffer.from('%PDF-1.7\n%test\n');
const ZIP = Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.alloc(32, 1)]);
const OLE = Buffer.concat([Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]), Buffer.alloc(32, 1)]);
const MP4 = Buffer.concat([Buffer.from([0, 0, 0, 0x18]), Buffer.from('ftypisom'), Buffer.alloc(16, 1)]);
const HEIC = Buffer.concat([Buffer.from([0, 0, 0, 0x18]), Buffer.from('ftypheic'), Buffer.alloc(16, 1)]);
const SVG = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
const HTML = Buffer.from('<!doctype html><script>alert(1)</script>');

const DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

const ENV_NAMES = [
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
  'NODE_ENV',
];
const AWS_ENV = {
  AWS_STORAGE_BUCKET_NAME: 'astro-test-bucket',
  AWS_S3_REGION_NAME: 'ap-southeast-2',
  AWS_ACCESS_KEY_ID: 'AKIAIOSFODNN7EXAMPLE',
  AWS_SECRET_ACCESS_KEY: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
};
const AWS_HOST = 'astro-test-bucket.s3.ap-southeast-2.amazonaws.com';
const UUID_KEY = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const savedEnv: Record<string, string | undefined> = {};
let tmpDir: string;
let fetchSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  for (const name of ENV_NAMES) {
    savedEnv[name] = process.env[name];
    delete process.env[name];
  }
  process.env.NODE_ENV = 'test';
  process.env.PUBLIC_API_URL = 'http://localhost:3000';
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'astro-uploads-test-'));
  process.env.STORAGE_LOCAL_DIR = tmpDir;
  fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response(null, { status: 200 }));
  vi.mocked(adminService.logAction).mockClear();
  uploadsService.setImageProcessor(null);
});

afterEach(() => {
  fetchSpy.mockRestore();
  fs.rmSync(tmpDir, { recursive: true, force: true });
  for (const name of ENV_NAMES) {
    if (savedEnv[name] === undefined) delete process.env[name];
    else process.env[name] = savedEnv[name];
  }
});

describe('upload policy', () => {
  it('detects the content type from the file bytes, not from what the client claims', () => {
    expect(detectContentType(PNG, 'image/jpeg', 'x.jpg')).toBe('image/png');
    expect(detectContentType(JPEG)).toBe('image/jpeg');
    expect(detectContentType(GIF)).toBe('image/gif');
    expect(detectContentType(WEBP)).toBe('image/webp');
    expect(detectContentType(PDF, 'application/octet-stream', 'x.bin')).toBe('application/pdf');
    expect(detectContentType(MP4)).toBe('video/mp4');
  });

  it('tells ZIP-based and OLE-based office formats apart by the declared type or extension', () => {
    expect(detectContentType(ZIP, 'application/zip', 'a.zip')).toBe('application/zip');
    expect(detectContentType(ZIP, 'application/octet-stream', 'bundle.ZIP')).toBe('application/zip');
    expect(detectContentType(ZIP, DOCX, 'a.docx')).toBe(DOCX);
    expect(detectContentType(ZIP, 'application/octet-stream', 'a.xlsx')).toBe(XLSX);
    expect(detectContentType(OLE, 'application/msword', 'a.doc')).toBe('application/msword');
    expect(detectContentType(OLE, 'application/octet-stream', 'a.xls')).toBe('application/vnd.ms-excel');
    expect(detectContentType(OLE, 'application/octet-stream', 'a.msi')).toBeNull();
  });

  it('recognises nothing in SVG, HTML, HEIC, text or an empty file, whatever the client claims', () => {
    expect(detectContentType(SVG, 'image/png', 'x.png')).toBeNull();
    expect(detectContentType(HTML, 'image/jpeg', 'x.jpg')).toBeNull();
    expect(detectContentType(HEIC, 'video/mp4', 'x.mp4')).toBeNull();
    expect(detectContentType(Buffer.from('plain text'), 'application/pdf', 'x.pdf')).toBeNull();
    expect(detectContentType(Buffer.alloc(0), 'image/png', 'x.png')).toBeNull();
  });

  it('keeps public purposes to images (and one video purpose) and the sold file private', () => {
    for (const purpose of UPLOAD_PURPOSES) {
      const policy = getUploadPolicy(purpose);
      expect(policy.maxBytes).toBeLessThanOrEqual(MAX_UPLOAD_BYTES);
      if (purpose === 'digital-product') {
        expect(policy.visibility).toBe('private');
        expect(policy.allowedTypes).toEqual(expect.arrayContaining(['application/pdf', 'application/zip', DOCX, XLSX, 'application/msword', 'application/vnd.ms-excel']));
      } else if (purpose === 'media-video') {
        expect(policy).toMatchObject({ visibility: 'public', allowedTypes: ['video/mp4'] });
      } else {
        expect(policy.visibility).toBe('public');
        expect([...policy.allowedTypes].sort()).toEqual(['image/gif', 'image/jpeg', 'image/png', 'image/webp']);
        expect(policy.maxBytes).toBe(10 * 1024 * 1024);
      }
    }
  });
});

describe('object keys', () => {
  it('generates keys from the purpose, the date and a random id only', () => {
    const now = new Date('2026-11-24T10:00:00Z');
    expect(generateObjectKey('banner', 'image/png', now, 'fixed-id')).toBe('assets/banner/2026/11/fixed-id.png');
    expect(generateObjectKey('digital-product', 'application/pdf', now, 'fixed-id')).toBe('private/digital-product/2026/11/fixed-id.pdf');
    expect(generateObjectKey('media-video', 'video/mp4', new Date('2027-01-02T00:00:00Z'), 'v')).toBe('assets/media-video/2027/01/v.mp4');

    const a = generateObjectKey('blog', 'image/jpeg');
    const b = generateObjectKey('blog', 'image/jpeg');
    expect(a).not.toBe(b);
    const file = a.split('/').pop() as string;
    expect(file.endsWith('.jpg')).toBe(true);
    expect(file.replace('.jpg', '')).toMatch(UUID_KEY);
  });

  it('classifies our keys, website-era keys and unmanaged keys', () => {
    expect(classifyObjectKey('assets/banner/2026/11/x.png')).toEqual({ visibility: 'public', purpose: 'banner', legacy: false });
    expect(classifyObjectKey('private/digital-product/2026/11/x.pdf')).toEqual({ visibility: 'private', purpose: 'digital-product', legacy: false });
    expect(classifyObjectKey('assets/1700000000000-my-banner.webp')).toEqual({ visibility: 'public', purpose: null, legacy: true });
    expect(classifyObjectKey('assets/64f0c0ffee/1700000000000-photo.webp')).toEqual({ visibility: 'public', purpose: null, legacy: true });
    // A private purpose name under the public prefix is not one of ours.
    expect(classifyObjectKey('assets/digital-product/2026/11/x.pdf')).toMatchObject({ visibility: 'public', purpose: null, legacy: true });
    expect(classifyObjectKey('private/banner/2026/11/x.png')).toMatchObject({ visibility: 'private', purpose: null });
    expect(classifyObjectKey('reports/user-1/report-1.pdf')).toEqual({ visibility: null, purpose: null, legacy: false });
  });
});

describe('uploadsService.storeUpload', () => {
  it('stores a public image and returns its public URL and generated key', async () => {
    const result = await uploadsService.storeUpload({ purpose: 'banner', buffer: PNG, declaredMimeType: 'image/png', filename: '../../My Banner (final).PNG' });
    expect(result).toMatchObject({ contentType: 'image/png', size: PNG.length, visibility: 'public', purpose: 'banner' });
    expect(result.key).toMatch(/^assets\/banner\/\d{4}\/\d{2}\/[0-9a-f-]{36}\.png$/);
    expect(result.key).not.toMatch(/banner \(final\)|My/i);
    expect(result.url).toBe(`http://localhost:3000/api/v1/uploads/local/${result.key}`);
    expect(await storageService.exists(result.key)).toBe(true);
  });

  it('stores a sold digital file privately: no public URL, no public ACL', async () => {
    Object.assign(process.env, AWS_ENV);
    const result = await uploadsService.storeUpload({ purpose: 'digital-product', buffer: PDF, declaredMimeType: 'application/pdf', filename: 'ebook.pdf' });
    expect(result.url).toBeNull();
    expect(result.visibility).toBe('private');
    expect(result.key).toMatch(/^private\/digital-product\/\d{4}\/\d{2}\/[0-9a-f-]{36}\.pdf$/);

    const [url, init] = fetchSpy.mock.calls[0] as [string, { method: string; headers: Record<string, string> }];
    expect(url).toBe(`https://${AWS_HOST}/${result.key}`);
    expect(init.method).toBe('PUT');
    expect(init.headers['x-amz-acl']).toBeUndefined();
    expect(init.headers['cache-control']).toBeUndefined();
  });

  it('stores a public image on S3 with public-read and the plain bucket URL', async () => {
    Object.assign(process.env, AWS_ENV);
    const result = await uploadsService.storeUpload({ purpose: 'blog', buffer: JPEG });
    expect(result.url).toBe(`https://${AWS_HOST}/${result.key}`);
    const [, init] = fetchSpy.mock.calls[0] as [string, { headers: Record<string, string> }];
    expect(init.headers['x-amz-acl']).toBe('public-read');
    expect(init.headers['content-type']).toBe('image/jpeg');
    expect(init.headers['cache-control']).toBe('public, max-age=31536000, immutable');
  });

  it('rejects content types that are not allowed for the purpose', async () => {
    await expect(uploadsService.storeUpload({ purpose: 'banner', buffer: PDF, declaredMimeType: 'image/png', filename: 'x.png' })).rejects.toMatchObject({
      statusCode: 415,
      code: 'UNSUPPORTED_FILE_TYPE',
    });
    await expect(uploadsService.storeUpload({ purpose: 'banner', buffer: SVG, declaredMimeType: 'image/svg+xml', filename: 'x.svg' })).rejects.toMatchObject({ statusCode: 415 });
    await expect(uploadsService.storeUpload({ purpose: 'banner', buffer: MP4 })).rejects.toMatchObject({ statusCode: 415 });
    await expect(uploadsService.storeUpload({ purpose: 'media-video', buffer: PNG })).rejects.toMatchObject({ statusCode: 415 });
    await expect(uploadsService.storeUpload({ purpose: 'digital-product', buffer: HTML, declaredMimeType: 'application/pdf', filename: 'x.pdf' })).rejects.toMatchObject({ statusCode: 415 });
    await expect(uploadsService.storeUpload({ purpose: 'digital-product', buffer: MP4 })).rejects.toMatchObject({ statusCode: 415 });
    expect(fs.readdirSync(tmpDir)).toEqual([]);
  });

  it('rejects empty and oversized files', async () => {
    await expect(uploadsService.storeUpload({ purpose: 'banner', buffer: Buffer.alloc(0) })).rejects.toMatchObject({ statusCode: 400, code: 'VALIDATION_ERROR' });
    const tooBig = Buffer.concat([PNG, Buffer.alloc(10 * 1024 * 1024)]);
    await expect(uploadsService.storeUpload({ purpose: 'banner', buffer: tooBig })).rejects.toMatchObject({ statusCode: 413, code: 'FILE_TOO_LARGE' });
    expect(fs.readdirSync(tmpDir)).toEqual([]);
  });

  it('keeps the original image format and refuses a watermark while no image processor is installed', async () => {
    const stored = await uploadsService.storeUpload({ purpose: 'product', buffer: JPEG });
    expect(stored.contentType).toBe('image/jpeg');
    await expect(uploadsService.storeUpload({ purpose: 'product', buffer: JPEG, watermark: true })).rejects.toMatchObject({
      statusCode: 501,
      code: 'IMAGE_PROCESSING_UNAVAILABLE',
    });
    await expect(uploadsService.storeUpload({ purpose: 'digital-product', buffer: PDF, watermark: true })).rejects.toMatchObject({ statusCode: 400 });
    await expect(uploadsService.storeUpload({ purpose: 'banner', buffer: PNG, watermark: true })).rejects.toMatchObject({ statusCode: 400 });
  });

  it('converts public images to WebP and watermarks previews once a processor is registered; private files are never touched', async () => {
    const processor: ImageProcessor = {
      toWebp: vi.fn(async (image: Buffer) => Buffer.concat([WEBP, Buffer.from(`from:${image.length}`)])),
      watermark: vi.fn(async (image: Buffer) => Buffer.concat([image, Buffer.from('WM')])),
    };
    uploadsService.setImageProcessor(processor);

    const preview = await uploadsService.storeUpload({ purpose: 'product', buffer: JPEG, watermark: true });
    expect(processor.watermark).toHaveBeenCalledWith(JPEG, 'Astro Sushil');
    expect(preview.contentType).toBe('image/webp');
    expect(preview.key.endsWith('.webp')).toBe(true);

    const sold = await uploadsService.storeUpload({ purpose: 'digital-product', buffer: PNG });
    expect(sold.contentType).toBe('image/png');
    expect((await storageService.downloadBuffer(sold.key)).equals(PNG)).toBe(true);
    expect(processor.toWebp).toHaveBeenCalledTimes(1);
    expect(processor.watermark).toHaveBeenCalledTimes(1);
  });
});

describe('storage reference helpers for other modules', () => {
  beforeEach(() => Object.assign(process.env, AWS_ENV));

  const publicKey = 'assets/banner/2026/11/0b0f4a52-1c1c-4a53-9f43-0d9c4b1f2a10.png';
  const privateKey = 'private/digital-product/2026/11/0b0f4a52-1c1c-4a53-9f43-0d9c4b1f2a10.pdf';
  const legacyUrl = `https://${AWS_HOST}/assets/1700000000000-old-banner.webp`;

  it('accepts a public upload by key, by url, or both, and returns the normalised pair', () => {
    const expected = { key: publicKey, url: `https://${AWS_HOST}/${publicKey}` };
    expect(validateUploadedRef({ key: publicKey }, { visibility: 'public', purposes: ['banner'] })).toEqual(expected);
    expect(validateUploadedRef({ url: expected.url }, { visibility: 'public' })).toEqual(expected);
    expect(validateUploadedRef({ url: expected.url, key: publicKey }, { visibility: 'public' })).toEqual(expected);
  });

  it('accepts website-era public files for public fields', () => {
    expect(validateUploadedRef({ url: legacyUrl }, { visibility: 'public', purposes: ['banner'] })).toEqual({
      key: 'assets/1700000000000-old-banner.webp',
      url: legacyUrl,
    });
  });

  it('refuses foreign URLs, mismatched pairs, wrong purposes and wrong visibility', () => {
    const bad = (input: Parameters<typeof validateUploadedRef>[0], options: Parameters<typeof validateUploadedRef>[1]) =>
      expect(() => validateUploadedRef(input, options)).toThrowError(expect.objectContaining({ statusCode: 400, code: 'VALIDATION_ERROR' }));

    bad({}, { visibility: 'public' });
    bad({ url: 'https://evil.example/assets/banner/2026/11/x.png' }, { visibility: 'public' });
    bad({ url: `https://${AWS_HOST}/${publicKey}`, key: 'assets/banner/2026/11/other.png' }, { visibility: 'public' });
    bad({ key: publicKey }, { visibility: 'public', purposes: ['blog'] });
    bad({ key: 'assets/media-video/2026/11/v.mp4' }, { visibility: 'public', purposes: ['media'] });
    bad({ key: privateKey }, { visibility: 'public' });
    bad({ key: publicKey }, { visibility: 'private' });
    bad({ key: '../../etc/passwd' }, { visibility: 'public' });
  });

  it('never accepts a key outside the upload prefixes, such as a customer report PDF', () => {
    expect(() => validateUploadedRef({ key: 'reports/user-1/report-1.pdf' }, { visibility: 'private' })).toThrowError(/not uploaded through the upload endpoint/);
    expect(() => validateUploadedRef({ key: 'reports/user-1/report-1.pdf' }, { visibility: 'public' })).toThrowError();
    expect(resolveManagedKey('reports/user-1/report-1.pdf')).toBeNull();
  });

  it('accepts a private upload and gives it no public URL; website-era sold files only when allowed', () => {
    expect(validateUploadedRef({ key: privateKey }, { visibility: 'private', purposes: ['digital-product'] })).toEqual({ key: privateKey, url: null });
    const legacySold = `https://${AWS_HOST}/assets/1700000000000-ebook.pdf`;
    expect(() => validateUploadedRef({ url: legacySold }, { visibility: 'private', purposes: ['digital-product'] })).toThrowError();
    expect(validateUploadedRef({ url: legacySold }, { visibility: 'private', purposes: ['digital-product'], allowLegacy: true })).toEqual({
      key: 'assets/1700000000000-ebook.pdf',
      url: null,
    });
  });

  it('deletes an upload by key or by website-era URL, and ignores what is not ours', async () => {
    expect(await deleteUploadedObject(legacyUrl)).toBe(true);
    let [url, init] = fetchSpy.mock.calls[0] as [string, { method: string }];
    expect(init.method).toBe('DELETE');
    expect(url).toBe(`https://${AWS_HOST}/assets/1700000000000-old-banner.webp`);

    expect(await deleteUploadedObject(privateKey)).toBe(true);
    [url, init] = fetchSpy.mock.calls[1] as [string, { method: string }];
    expect(url).toBe(`https://${AWS_HOST}/${privateKey}`);

    expect(await deleteUploadedObject('https://evil.example/assets/x.png')).toBe(false);
    expect(await deleteUploadedObject('reports/user-1/report-1.pdf')).toBe(false);
    expect(await deleteUploadedObject(null)).toBe(false);
    expect(await deleteUploadedObject('')).toBe(false);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it('does not throw when the store fails during a delete', async () => {
    fetchSpy.mockRejectedValueOnce(new Error('network down'));
    expect(await deleteUploadedObject(publicKey)).toBe(false);
  });

  it('signs a short-lived URL for a private file or a website-era URL, capped at one hour', async () => {
    const signed = await getUploadedFileSignedUrl(privateKey, 300, { downloadFileName: 'ebook.pdf' });
    expect(signed.startsWith(`https://${AWS_HOST}/${privateKey}?`)).toBe(true);
    expect(signed).toContain('X-Amz-Expires=300');

    const legacy = await getUploadedFileSignedUrl(`https://${AWS_HOST}/assets/1700000000000-ebook.pdf`, 999999);
    expect(legacy).toContain('X-Amz-Expires=3600');

    await expect(getUploadedFileSignedUrl('https://evil.example/x.pdf')).rejects.toMatchObject({ statusCode: 400 });
    await expect(getUploadedFileSignedUrl('reports/user-1/report-1.pdf')).rejects.toMatchObject({ statusCode: 400 });
  });
});

describe('POST /api/v1/admin/uploads', () => {
  let app: FastifyInstance;
  let uploaderToken: string;
  let readerToken: string;
  let customerToken: string;

  beforeAll(async () => {
    app = Fastify({ logger: false });
    app.setErrorHandler(globalErrorHandler);
    await app.register(registerJwt);
    await app.register(multipart, { limits: { fileSize: MAX_UPLOAD_BYTES, files: 1, fields: 10, fieldSize: 16 * 1024, parts: 12 } });
    await app.register(uploadsRoutes, { prefix: '/api/v1' });
    await app.ready();
    uploaderToken = app.jwt.sign({ sub: 'admin-uploader', role: 'ADMIN' });
    readerToken = app.jwt.sign({ sub: 'admin-reader', role: 'ADMIN' });
    customerToken = app.jwt.sign({ sub: 'customer-1', role: 'USER' });
  });

  afterAll(async () => {
    await app.close();
  });

  function multipartBody(parts: Array<{ field: string; filename?: string; type?: string; content: Buffer | string }>) {
    const boundary = '----astrotestboundary7MA4YWxkTrZu0gW';
    const chunks: Buffer[] = [];
    for (const part of parts) {
      let head = `--${boundary}\r\nContent-Disposition: form-data; name="${part.field}"`;
      if (part.filename !== undefined) head += `; filename="${part.filename}"`;
      head += '\r\n';
      if (part.type) head += `Content-Type: ${part.type}\r\n`;
      chunks.push(Buffer.from(`${head}\r\n`), Buffer.isBuffer(part.content) ? part.content : Buffer.from(part.content), Buffer.from('\r\n'));
    }
    chunks.push(Buffer.from(`--${boundary}--\r\n`));
    return { payload: Buffer.concat(chunks), contentType: `multipart/form-data; boundary=${boundary}` };
  }

  function upload(token: string | null, query: string, parts: Parameters<typeof multipartBody>[0]) {
    const body = multipartBody(parts);
    return app.inject({
      method: 'POST',
      url: `/api/v1/admin/uploads${query}`,
      headers: { 'content-type': body.contentType, ...(token ? { authorization: `Bearer ${token}` } : {}) },
      payload: body.payload,
    });
  }

  const pngPart = { field: 'file', filename: 'Client Name.png', type: 'image/png', content: PNG };

  it('uploads a file and returns { url, key, contentType, size }', async () => {
    const res = await upload(uploaderToken, '?purpose=banner', [pngPart]);
    expect(res.statusCode).toBe(201);
    const json = res.json();
    expect(json).toEqual({
      url: `http://localhost:3000/api/v1/uploads/local/${json.key}`,
      key: expect.stringMatching(/^assets\/banner\/\d{4}\/\d{2}\/[0-9a-f-]{36}\.png$/),
      contentType: 'image/png',
      size: PNG.length,
      visibility: 'public',
      purpose: 'banner',
    });
    expect((await storageService.downloadBuffer(json.key)).equals(PNG)).toBe(true);
  });

  it('writes an audit entry for the upload without the client filename', async () => {
    const res = await upload(uploaderToken, '?purpose=banner', [pngPart]);
    const { key } = res.json();
    expect(adminService.logAction).toHaveBeenCalledTimes(1);
    const entry = vi.mocked(adminService.logAction).mock.calls[0][0];
    expect(entry).toMatchObject({ adminId: 'admin-uploader', adminEmail: 'uploader@example.test', action: 'UPLOAD_FILE', resource: `Upload:${key}` });
    expect(entry.details).toContain('purpose=banner');
    expect(entry.details).toContain('visibility=public');
    expect(JSON.stringify(entry)).not.toContain('Client Name');
  });

  it('returns a private file with a null url', async () => {
    const res = await upload(uploaderToken, '?purpose=digital-product', [{ field: 'file', filename: 'ebook.pdf', type: 'application/pdf', content: PDF }]);
    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({ url: null, visibility: 'private', contentType: 'application/pdf' });
    expect(res.json().key).toMatch(/^private\/digital-product\//);
  });

  it('requires authentication, an admin role and the uploads:create permission', async () => {
    const anonymous = await upload(null, '?purpose=banner', [pngPart]);
    expect(anonymous.statusCode).toBe(401);

    const customer = await upload(customerToken, '?purpose=banner', [pngPart]);
    expect(customer.statusCode).toBe(403);

    const noPermission = await upload(readerToken, '?purpose=banner', [pngPart]);
    expect(noPermission.statusCode).toBe(403);
    expect(noPermission.json().error).toMatchObject({ code: 'AUTHORIZATION_ERROR' });
    expect(noPermission.json().error.requestId).toBeTruthy();

    expect(adminService.logAction).not.toHaveBeenCalled();
    expect(fs.readdirSync(tmpDir)).toEqual([]);
  });

  it('rejects an unknown or missing purpose', async () => {
    expect((await upload(uploaderToken, '', [pngPart])).statusCode).toBe(400);
    expect((await upload(uploaderToken, '?purpose=reports', [pngPart])).statusCode).toBe(400);
    expect(adminService.logAction).not.toHaveBeenCalled();
  });

  it('rejects a disallowed content type with 415 in the standard error shape', async () => {
    const res = await upload(uploaderToken, '?purpose=banner', [{ field: 'file', filename: 'x.png', type: 'image/png', content: SVG }]);
    expect(res.statusCode).toBe(415);
    expect(res.json().error).toMatchObject({ code: 'UNSUPPORTED_FILE_TYPE' });
    expect(res.json().error.requestId).toBeTruthy();
    expect(adminService.logAction).not.toHaveBeenCalled();
  });

  it('rejects a file over the size cap of its purpose with 413', async () => {
    const tooBig = Buffer.concat([PNG, Buffer.alloc(10 * 1024 * 1024)]);
    const res = await upload(uploaderToken, '?purpose=banner', [{ field: 'file', filename: 'big.png', type: 'image/png', content: tooBig }]);
    expect(res.statusCode).toBe(413);
    expect(res.json().error.code).toBe('FILE_TOO_LARGE');
    expect(fs.readdirSync(tmpDir)).toEqual([]);
  });

  it('rejects a body that is not multipart or has no "file" field', async () => {
    const json = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/uploads?purpose=banner',
      headers: { authorization: `Bearer ${uploaderToken}`, 'content-type': 'application/json' },
      payload: { file: 'x' },
    });
    expect(json.statusCode).toBe(400);

    const wrongField = await upload(uploaderToken, '?purpose=banner', [{ ...pngPart, field: 'image' }]);
    expect(wrongField.statusCode).toBe(400);

    const noFile = await upload(uploaderToken, '?purpose=banner', [{ field: 'note', content: 'hello' }]);
    expect(noFile.statusCode).toBe(400);
  });

  describe('development route for locally stored public files', () => {
    it('serves a public file, and nothing private or unmanaged', async () => {
      const created = (await upload(uploaderToken, '?purpose=banner', [pngPart])).json();
      const ok = await app.inject({ method: 'GET', url: `/api/v1/uploads/local/${created.key}` });
      expect(ok.statusCode).toBe(200);
      expect(ok.headers['content-type']).toBe('image/png');
      expect(ok.rawPayload.equals(PNG)).toBe(true);

      const priv = (await upload(uploaderToken, '?purpose=digital-product', [{ field: 'file', filename: 'e.pdf', type: 'application/pdf', content: PDF }])).json();
      expect((await app.inject({ method: 'GET', url: `/api/v1/uploads/local/${priv.key}` })).statusCode).toBe(404);

      await storageService.upload({ key: 'reports/user-1/r.pdf', body: PDF });
      expect((await app.inject({ method: 'GET', url: '/api/v1/uploads/local/reports/user-1/r.pdf' })).statusCode).toBe(404);
      expect((await app.inject({ method: 'GET', url: '/api/v1/uploads/local/assets/%2e%2e/reports/user-1/r.pdf' })).statusCode).toBe(404);
    });

    it('does not exist in production or when a remote store is active', async () => {
      const created = (await upload(uploaderToken, '?purpose=banner', [pngPart])).json();
      Object.assign(process.env, AWS_ENV);
      expect((await app.inject({ method: 'GET', url: `/api/v1/uploads/local/${created.key}` })).statusCode).toBe(404);
      for (const name of Object.keys(AWS_ENV)) delete process.env[name];
      process.env.NODE_ENV = 'production';
      expect((await app.inject({ method: 'GET', url: `/api/v1/uploads/local/${created.key}` })).statusCode).toBe(404);
    });
  });
});
