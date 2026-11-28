import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { storageService } from '../../src/services/storage.service';
import { parseLegacyAwsBuckets, legacyAwsBuckets } from '../../src/services/storage/storage-config';
import { reportObjectKey } from '../../src/services/storage/report-object';
import { reportsService } from '../../src/modules/reports/reports.service';
import { adminService } from '../../src/modules/admin/admin.service';
import { productsService } from '../../src/modules/products/products.service';
import { prisma } from '../../src/services/prisma.service';
import { parseBackfillArgs } from '../../src/scripts/backfill-report-storage-keys';

/**
 * Historical (website-era) reports and digital files in a testing / staging copy:
 * STORAGE_LEGACY_AWS_BUCKETS, resolveKey(), reportObjectKey() and the download fallbacks.
 */

const ENV = [
  'NODE_ENV',
  'STORAGE_PROVIDER',
  'STORAGE_LEGACY_AWS_BUCKETS',
  'PUBLIC_API_URL',
  'AWS_STORAGE_BUCKET_NAME',
  'AWS_S3_REGION_NAME',
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'R2_ACCOUNT_ID',
  'S3_ACCOUNT_ID',
  'R2_ACCESS_KEY_ID',
  'S3_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'S3_SECRET_ACCESS_KEY',
];

// The active (testing) bucket and two legacy website buckets copied into it.
const TESTING_ENV = {
  STORAGE_PROVIDER: 'aws',
  AWS_STORAGE_BUCKET_NAME: 'astro-testing-assets',
  AWS_S3_REGION_NAME: 'ap-south-1',
  AWS_ACCESS_KEY_ID: 'AKIAIOSFODNN7EXAMPLE',
  AWS_SECRET_ACCESS_KEY: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
  STORAGE_LEGACY_AWS_BUCKETS: 'astrosushil:ap-south-1, astro-sushil:ap-southeast-2',
};

const LEGACY_URL = 'https://astrosushil.s3.ap-south-1.amazonaws.com/assets/1712345678901-report-66a1b2.pdf';
const LEGACY_KEY = 'assets/1712345678901-report-66a1b2.pdf';

const saved: Record<string, string | undefined> = {};
let fetchSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  for (const name of ENV) {
    saved[name] = process.env[name];
    delete process.env[name];
  }
  process.env.NODE_ENV = 'test';
  Object.assign(process.env, TESTING_ENV);
  // Nothing in this file may reach the network.
  fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
    throw new Error('network access in a unit test');
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  fetchSpy.mockRestore();
  for (const name of ENV) {
    if (saved[name] === undefined) delete process.env[name];
    else process.env[name] = saved[name];
  }
});

describe('STORAGE_LEGACY_AWS_BUCKETS parsing', () => {
  it('reads bucket:region entries separated by commas or spaces, lowercased and de-duplicated', () => {
    expect(parseLegacyAwsBuckets('astrosushil:ap-south-1, Astro-Sushil:AP-SOUTHEAST-2  astrosushil:ap-south-1')).toEqual({
      buckets: [
        { bucket: 'astrosushil', region: 'ap-south-1' },
        { bucket: 'astro-sushil', region: 'ap-southeast-2' },
      ],
      invalid: [],
    });
  });

  it('is empty when unset', () => {
    expect(parseLegacyAwsBuckets(undefined)).toEqual({ buckets: [], invalid: [] });
    expect(parseLegacyAwsBuckets('  ')).toEqual({ buckets: [], invalid: [] });
    expect(legacyAwsBuckets({})).toEqual([]);
  });

  it('rejects malformed entries instead of guessing', () => {
    const { buckets, invalid } = parseLegacyAwsBuckets(
      'nobucketregion,ok-bucket:eu-west-1,bad_bucket:eu-west-1,x:eu-west-1,b..x:eu-west-1,bucket:notaregion,a:b:c,evil.com/x:us-east-1'
    );
    expect(buckets).toEqual([{ bucket: 'ok-bucket', region: 'eu-west-1' }]);
    expect(invalid).toEqual(['nobucketregion', 'bad_bucket:eu-west-1', 'x:eu-west-1', 'b..x:eu-west-1', 'bucket:notaregion', 'a:b:c', 'evil.com/x:us-east-1']);
  });
});

describe('resolveKey with legacy buckets', () => {
  it('maps virtual-hosted URLs of an approved legacy bucket to the same key', () => {
    expect(storageService.resolveKey(LEGACY_URL)).toBe(LEGACY_KEY);
    expect(storageService.resolveKey('https://astro-sushil.s3.ap-southeast-2.amazonaws.com/assets/a.pdf')).toBe('assets/a.pdf');
    expect(storageService.resolveKey('https://astrosushil.s3.amazonaws.com/assets/a.pdf')).toBe('assets/a.pdf');
    expect(storageService.resolveKey('https://astrosushil.s3-ap-south-1.amazonaws.com/assets/a.pdf')).toBe('assets/a.pdf');
    expect(storageService.resolveKey('HTTPS://ASTROSUSHIL.S3.AP-SOUTH-1.AMAZONAWS.COM/assets/a.pdf')).toBe('assets/a.pdf');
  });

  it('maps path-style URLs of an approved legacy bucket', () => {
    expect(storageService.resolveKey('https://s3.ap-south-1.amazonaws.com/astrosushil/assets/a.pdf')).toBe('assets/a.pdf');
    expect(storageService.resolveKey('https://s3.amazonaws.com/astro-sushil/assets/a.pdf')).toBe('assets/a.pdf');
  });

  it('still maps the active bucket and decodes the key', () => {
    expect(storageService.resolveKey('https://astro-testing-assets.s3.ap-south-1.amazonaws.com/assets/My%20File.pdf')).toBe('assets/My File.pdf');
  });

  it('ignores the query string and fragment', () => {
    expect(storageService.resolveKey(`${LEGACY_URL}?X-Amz-Signature=abc&response-content-type=text/html#x`)).toBe(LEGACY_KEY);
  });

  it('rejects hosts that are not the active or an approved bucket', () => {
    expect(storageService.resolveKey('https://pdfapilambda.s3.ap-south-1.amazonaws.com/assets/a.pdf')).toBeNull();
    expect(storageService.resolveKey('https://s3.ap-south-1.amazonaws.com/pdfapilambda/assets/a.pdf')).toBeNull();
    expect(storageService.resolveKey('https://astrosushil.s3.ap-south-1.amazonaws.com.evil.example/assets/a.pdf')).toBeNull();
    expect(storageService.resolveKey('https://evil.example/astrosushil.s3.ap-south-1.amazonaws.com/assets/a.pdf')).toBeNull();
    expect(storageService.resolveKey('https://astrosushil.s3.eu-west-1.amazonaws.com/assets/a.pdf')).toBeNull();
    expect(storageService.resolveKey('http://169.254.169.254/latest/meta-data/')).toBeNull();
    expect(storageService.resolveKey('https://user:pw@evil.example/assets/a.pdf')).toBeNull();
  });

  it('rejects legacy bucket URLs once the list is removed', () => {
    delete process.env.STORAGE_LEGACY_AWS_BUCKETS;
    expect(storageService.resolveKey(LEGACY_URL)).toBeNull();
  });

  it('accepts only http and https URLs', () => {
    expect(storageService.resolveKey('ftp://astrosushil.s3.ap-south-1.amazonaws.com/assets/a.pdf')).toBeNull();
    expect(storageService.resolveKey('file:///etc/passwd')).toBeNull();
    expect(storageService.resolveKey('javascript:alert(1)')).toBeNull();
    expect(storageService.resolveKey('s3://astrosushil/assets/a.pdf')).toBeNull();
    expect(storageService.resolveKey('http://astrosushil.s3.ap-south-1.amazonaws.com/assets/a.pdf')).toBe('assets/a.pdf');
  });

  it('rejects path traversal, plain or percent-encoded', () => {
    // The URL parser folds dot segments (also %2e%2e) at the bucket root: never above it.
    expect(storageService.resolveKey('https://astrosushil.s3.ap-south-1.amazonaws.com/assets/%2e%2e/%2e%2e/secret')).toBe('secret');
    expect(storageService.resolveKey('https://astrosushil.s3.ap-south-1.amazonaws.com/assets/..%2F..%2Fsecret')).toBeNull();
    expect(storageService.resolveKey('https://astrosushil.s3.ap-south-1.amazonaws.com/assets/a%00.pdf')).toBeNull();
    expect(storageService.resolveKey('../reports/other-user/x.pdf')).toBeNull();
    expect(storageService.resolveKey('https://astrosushil.s3.ap-south-1.amazonaws.com/')).toBeNull();
  });

  it('ignores malformed legacy entries and keeps the valid ones', () => {
    process.env.STORAGE_LEGACY_AWS_BUCKETS = 'garbage, astrosushil:ap-south-1';
    expect(storageService.resolveKey(LEGACY_URL)).toBe(LEGACY_KEY);
  });
});

describe('reportObjectKey', () => {
  it('prefers storageKey', () => {
    expect(reportObjectKey({ storageKey: 'reports/u1/r1.pdf', s3Url: LEGACY_URL })).toBe('reports/u1/r1.pdf');
  });

  it('derives the key from an allowlisted s3Url when storageKey is null', () => {
    expect(reportObjectKey({ storageKey: null, s3Url: LEGACY_URL })).toBe(LEGACY_KEY);
  });

  it('gives null for an s3Url outside the allowlist, or no reference at all', () => {
    expect(reportObjectKey({ storageKey: null, s3Url: 'https://s3.ap-south-1.amazonaws.com/pdfapilambda/x.pdf' })).toBeNull();
    expect(reportObjectKey({ storageKey: null, s3Url: null })).toBeNull();
    expect(reportObjectKey(null)).toBeNull();
  });
});

describe('customer report download of a migrated report', () => {
  const user = { id: 'usr-1', role: 'USER' };
  const completed = { id: 'rep-1', userId: user.id, status: 'COMPLETED', stage: 'COMPLETED', reportType: 'KUNDLI' };

  it('streams the PDF from the active store under the key behind s3Url', async () => {
    vi.spyOn(reportsService as any, 'getReportStatus').mockResolvedValue(completed);
    vi.spyOn(prisma.report, 'findUnique').mockResolvedValue({ ...completed, storageKey: null, s3Url: LEGACY_URL } as any);
    const pdf = Buffer.from('%PDF-1.4 historical');
    const download = vi.spyOn(storageService, 'downloadBuffer').mockResolvedValue(pdf);

    const result = await reportsService.generateReportPdfBuffer('rep-1', user);
    expect(download).toHaveBeenCalledWith(LEGACY_KEY);
    expect(result.buffer.equals(pdf)).toBe(true);
  });

  it('answers 404 without reading anything when s3Url is not allowlisted', async () => {
    vi.spyOn(reportsService as any, 'getReportStatus').mockResolvedValue(completed);
    vi.spyOn(prisma.report, 'findUnique').mockResolvedValue({
      ...completed,
      storageKey: null,
      s3Url: 'https://evil.example/assets/x.pdf',
    } as any);
    const download = vi.spyOn(storageService, 'downloadBuffer');

    await expect(reportsService.generateReportPdfBuffer('rep-1', user)).rejects.toMatchObject({ statusCode: 404, code: 'REPORT_ASSET_NOT_FOUND' });
    expect(download).not.toHaveBeenCalled();
  });

  it('signs a short-lived link for the key behind s3Url', async () => {
    vi.spyOn(prisma.report, 'findUnique').mockResolvedValue({
      ...completed,
      storageKey: null,
      s3Url: LEGACY_URL,
      completedAt: null,
      fileName: null,
      order: null,
    } as any);
    const sign = vi.spyOn(storageService, 'getSignedDownloadUrl').mockResolvedValue('https://signed.example.test/x');

    const result = await reportsService.getReportAccessUrl('rep-1', user);
    expect(sign).toHaveBeenCalledWith(LEGACY_KEY, 900);
    expect(result.accessUrl).toBe('https://signed.example.test/x');
  });
});

describe('admin report download and diagnostics of a migrated report', () => {
  const admin = { id: 'adm-1', email: 'admin@example.com' };

  it('downloads the PDF under the key behind s3Url and audits it', async () => {
    vi.spyOn(prisma.report, 'findUnique').mockResolvedValue({
      id: 'rep-1',
      reportType: 'KUNDLI',
      status: 'COMPLETED',
      storageKey: null,
      s3Url: LEGACY_URL,
      fileName: null,
    } as any);
    const download = vi.spyOn(storageService, 'downloadBuffer').mockResolvedValue(Buffer.from('%PDF-1.4'));
    const audit = vi.spyOn(adminService, 'logAction').mockResolvedValue(undefined as any);

    const result = await adminService.downloadReportPdf('rep-1', admin);
    expect(download).toHaveBeenCalledWith(LEGACY_KEY);
    expect(result.fileName).toBe('astro-sushil-report-rep-1.pdf');
    expect(audit).toHaveBeenCalledWith(expect.objectContaining({ action: 'ADMIN_DOWNLOADED_REPORT' }));
  });

  it('refuses with 404 when the report has neither a key nor an allowlisted URL', async () => {
    vi.spyOn(prisma.report, 'findUnique').mockResolvedValue({
      id: 'rep-1',
      reportType: 'KUNDLI',
      status: 'COMPLETED',
      storageKey: null,
      s3Url: 'https://s3.ap-south-1.amazonaws.com/pdfapilambda/x.pdf',
      fileName: null,
    } as any);
    const download = vi.spyOn(storageService, 'downloadBuffer');
    await expect(adminService.downloadReportPdf('rep-1', admin)).rejects.toMatchObject({ statusCode: 404, code: 'REPORT_ASSET_NOT_FOUND' });
    expect(download).not.toHaveBeenCalled();
  });
});

describe('digital download of a purchase without a file on the entitlement', () => {
  const base = {
    id: 'ent-1',
    userId: 'u1',
    productId: 'p1',
    status: 'ACTIVE',
    expiresAt: null,
    assetKey: null,
    assetName: 'Yantra',
    bundleAssets: null,
    downloadCount: 0,
    variantId: null,
    legacyId: null,
    product: { title: 'Yantra', imageUrl: 'https://astrosushil.s3.ap-south-1.amazonaws.com/assets/thumb.webp', metadata: null },
  };

  beforeEach(() => {
    vi.spyOn(prisma.digitalProductEntitlement, 'update').mockResolvedValue({} as any);
    vi.spyOn(storageService, 'getSignedDownloadUrl').mockImplementation(async (key: string) => `https://signed.example.test/${key}`);
  });

  it("uses the purchased variant's file", async () => {
    vi.spyOn(prisma.digitalProductEntitlement, 'findFirst').mockResolvedValue({ ...base, variantId: 'v1', legacyId: 'mongo-1' } as any);
    vi.spyOn(prisma.productVariant, 'findUnique').mockResolvedValue({ downloadKey: 'private/digital-product/yantra.pdf' } as any);
    const result = await productsService.getSecureDownloadUrl('u1', 'ent-1');
    expect(result.downloadUrl).toBe('https://signed.example.test/private/digital-product/yantra.pdf');
  });

  it("uses the product's file when the variant has none", async () => {
    vi.spyOn(prisma.digitalProductEntitlement, 'findFirst').mockResolvedValue({
      ...base,
      legacyId: 'mongo-1',
      product: { ...base.product, metadata: { digitalAssetKey: 'private/digital-product/whole.zip' } },
    } as any);
    const result = await productsService.getSecureDownloadUrl('u1', 'ent-1');
    expect(result.downloadUrl).toBe('https://signed.example.test/private/digital-product/whole.zip');
  });

  it('never hands a migrated buyer the product image instead of the file', async () => {
    vi.spyOn(prisma.digitalProductEntitlement, 'findFirst').mockResolvedValue({ ...base, legacyId: 'mongo-1' } as any);
    const sign = vi.spyOn(storageService, 'getSignedDownloadUrl');
    await expect(productsService.getSecureDownloadUrl('u1', 'ent-1')).rejects.toMatchObject({ statusCode: 404 });
    expect(sign).not.toHaveBeenCalled();
  });

  it('keeps the image fallback of seeded (non-migrated) products', async () => {
    vi.spyOn(prisma.digitalProductEntitlement, 'findFirst').mockResolvedValue({ ...base } as any);
    const result = await productsService.getSecureDownloadUrl('u1', 'ent-1');
    expect(result.downloadUrl).toBe('https://signed.example.test/assets/thumb.webp');
  });
});

describe('backfill-report-storage-keys arguments', () => {
  it('is a dry run with verification by default', () => {
    expect(parseBackfillArgs([])).toEqual({ execute: false, verify: true, limit: null });
  });

  it('writes only with --execute', () => {
    expect(parseBackfillArgs(['--execute', '--no-verify', '--limit=10'])).toEqual({ execute: true, verify: false, limit: 10 });
  });

  it('rejects unknown or malformed arguments', () => {
    expect(() => parseBackfillArgs(['--force'])).toThrow(/Unknown argument/);
    expect(() => parseBackfillArgs(['--limit=0'])).toThrow(/Invalid --limit/);
  });
});
