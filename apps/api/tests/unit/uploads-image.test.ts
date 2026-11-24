/**
 * The sharp image processor (modules/uploads/image-processor.ts) and its use by the uploads
 * service. Images are generated in memory; storage is a temporary local directory; no network.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as zlib from 'zlib';
import sharp from 'sharp';

vi.mock('../../src/utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import {
  MAX_IMAGE_PIXELS,
  MAX_IMAGE_SIDE,
  buildWatermarkSvg,
  createSharpImageProcessor,
  registerImageProcessor,
} from '../../src/modules/uploads/image-processor';
import { uploadsService, WATERMARK_TEXT } from '../../src/modules/uploads/uploads.service';
import { storageService } from '../../src/services/storage.service';

const processor = createSharpImageProcessor(sharp);

const BLUE = { r: 10, g: 20, b: 120 };

function solid(width: number, height: number, background: { r: number; g: number; b: number; alpha?: number } = BLUE) {
  return sharp({ create: { width, height, channels: background.alpha === undefined ? 3 : 4, background } });
}

/** A PNG that only has a header: it claims the given size and holds no pixel data. */
function pngHeaderClaiming(width: number, height: number): Buffer {
  const chunk = (type: string, data: Buffer) => {
    const body = Buffer.concat([Buffer.from(type, 'latin1'), data]);
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(zlib.crc32(body) >>> 0);
    return Buffer.concat([length, body, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(Buffer.alloc(16))),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

async function pixelAt(image: Buffer, x: number, y: number): Promise<number[]> {
  const { data, info } = await sharp(image).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const offset = (y * info.width + x) * info.channels;
  return [data[offset], data[offset + 1], data[offset + 2]];
}

/** Number of pixels inside the box that are clearly lighter than the blue background. */
async function lightPixels(image: Buffer, box: { left: number; top: number; width: number; height: number }): Promise<number> {
  const { data, info } = await sharp(image).extract(box).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  let count = 0;
  for (let i = 0; i < data.length; i += info.channels) {
    if (data[i] > 150 && data[i + 1] > 150 && data[i + 2] > 150) count += 1;
  }
  return count;
}

describe('sharp image processor: WebP conversion', () => {
  it('converts PNG, JPEG and WebP to WebP of the same size', async () => {
    const inputs = [
      await solid(64, 48).png().toBuffer(),
      await solid(64, 48).jpeg().toBuffer(),
      await solid(64, 48).webp().toBuffer(),
    ];
    for (const input of inputs) {
      const metadata = await sharp(await processor.toWebp(input)).metadata();
      expect(metadata).toMatchObject({ format: 'webp', width: 64, height: 48 });
    }
  });

  it('keeps only the first frame of an animated GIF, as the website does', async () => {
    const red = await solid(16, 16, { r: 255, g: 0, b: 0 }).png().toBuffer();
    const green = await solid(16, 16, { r: 0, g: 255, b: 0 }).png().toBuffer();
    const gif = await sharp([red, green], { join: { animated: true } }).gif().toBuffer();
    expect((await sharp(gif, { animated: true }).metadata()).pages).toBe(2);

    const output = await processor.toWebp(gif);
    const metadata = await sharp(output, { animated: true }).metadata();
    expect(metadata.format).toBe('webp');
    expect(metadata.pages ?? 1).toBe(1);
    expect({ width: metadata.width, height: metadata.height }).toEqual({ width: 16, height: 16 });
    const [r, g] = await pixelAt(output, 8, 8);
    expect(r).toBeGreaterThan(200);
    expect(g).toBeLessThan(60);
  });

  it('strips EXIF (GPS position included) and ICC data, and applies the orientation first', async () => {
    const photo = await solid(40, 20)
      .withExif({
        IFD0: { Make: 'TestCam', Copyright: 'Somebody' },
        IFD3: { GPSLatitudeRef: 'N', GPSLatitude: '28/1 36/1 50/1', GPSLongitudeRef: 'E', GPSLongitude: '77/1 12/1 32/1' },
      })
      .withIccProfile('srgb')
      .withMetadata({ orientation: 6 })
      .jpeg()
      .toBuffer();
    const before = await sharp(photo).metadata();
    expect(before.exif).toBeDefined();
    expect(before.exif?.toString('latin1')).toContain('TestCam');
    expect(before.orientation).toBe(6);

    for (const output of [await processor.toWebp(photo), await processor.watermark(photo, WATERMARK_TEXT)]) {
      const after = await sharp(output).metadata();
      expect(after.exif).toBeUndefined();
      expect(after.icc).toBeUndefined();
      expect(after.xmp).toBeUndefined();
      expect(after.iptc).toBeUndefined();
      expect(after.orientation).toBeUndefined();
      // Orientation 6 is a quarter turn: the stored 40x20 image is displayed as 20x40.
      expect({ width: after.width, height: after.height }).toEqual({ width: 20, height: 40 });
      expect(output.toString('latin1')).not.toContain('TestCam');
      expect(output.toString('latin1')).not.toContain('GPS');
    }
  });
});

describe('sharp image processor: limits and non-images', () => {
  it('refuses an image wider or taller than the limit', async () => {
    const wide = await solid(MAX_IMAGE_SIDE + 1, 1).png().toBuffer();
    await expect(processor.toWebp(wide)).rejects.toMatchObject({ statusCode: 413, code: 'IMAGE_DIMENSIONS_TOO_LARGE' });
    await expect(processor.watermark(wide, WATERMARK_TEXT)).rejects.toMatchObject({ statusCode: 413 });

    const atLimit = await solid(MAX_IMAGE_SIDE, 1).png().toBuffer();
    expect((await sharp(await processor.toWebp(atLimit)).metadata()).width).toBe(MAX_IMAGE_SIDE);
  });

  it('refuses a small file that claims more pixels than the limit, without decoding it', async () => {
    const bomb = pngHeaderClaiming(15_000, 15_000);
    expect(bomb.length).toBeLessThan(200);
    expect(15_000 * 15_000).toBeGreaterThan(MAX_IMAGE_PIXELS);
    await expect(processor.toWebp(bomb)).rejects.toMatchObject({ statusCode: 413, code: 'IMAGE_DIMENSIONS_TOO_LARGE' });
    await expect(processor.watermark(bomb, WATERMARK_TEXT)).rejects.toMatchObject({ statusCode: 413 });
  });

  it('refuses anything that is not a JPEG, PNG, WebP or GIF, including formats the library could read', async () => {
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10"/></svg>');
    const tiff = await solid(8, 8).tiff().toBuffer();
    const notAnImage = [svg, tiff, Buffer.from('%PDF-1.7\n%test\n'), Buffer.from('plain text'), Buffer.alloc(0)];
    for (const input of notAnImage) {
      await expect(processor.toWebp(input)).rejects.toMatchObject({ statusCode: 415, code: 'UNSUPPORTED_FILE_TYPE' });
      await expect(processor.watermark(input, WATERMARK_TEXT)).rejects.toMatchObject({ statusCode: 415 });
    }
  });

  it('refuses a truncated image with a clean error', async () => {
    const png = await sharp({ create: { width: 64, height: 64, channels: 3, noise: { type: 'gaussian', mean: 128, sigma: 40 } } })
      .png()
      .toBuffer();
    const truncated = png.subarray(0, Math.floor(png.length / 2));
    await expect(processor.toWebp(truncated)).rejects.toMatchObject({ statusCode: 415, message: 'The image could not be read' });
  });
});

describe('sharp image processor: watermark', () => {
  it('builds the website watermark: bold white text, a twelfth of the width, centred, rotated -30 degrees', () => {
    const svg = buildWatermarkSvg(1200, 800, 'Astro Sushil');
    expect(svg).toContain('width="1200" height="800"');
    expect(svg).toContain('fill: rgb(255, 255, 255)');
    expect(svg).toContain('font-size: 100px');
    expect(svg).toContain('font-weight: bold');
    expect(svg).toContain('x="50%" y="50%" text-anchor="middle" dominant-baseline="middle"');
    expect(svg).toContain('transform="rotate(-30 600 400)"');
    expect(svg).toContain('>Astro Sushil</text>');
    expect(buildWatermarkSvg(100, 100, '<b>&"')).toContain('&lt;b&gt;&amp;&quot;');
  });

  it('draws light text across the middle and leaves the corners alone, as a JPEG of the same size', async () => {
    const input = await solid(600, 400).png().toBuffer();
    const output = await processor.watermark(input, WATERMARK_TEXT);

    expect(await sharp(output).metadata()).toMatchObject({ format: 'jpeg', width: 600, height: 400 });

    // The text is centred and a twelfth of the width high: it lies in the middle band.
    const middle = { left: 100, top: 100, width: 400, height: 200 };
    expect(await lightPixels(input, middle)).toBe(0);
    expect(await lightPixels(output, middle)).toBeGreaterThan(300);

    // Rotated -30 degrees, the text rises from the lower left to the upper right.
    const lowerLeft = await lightPixels(output, { left: 150, top: 200, width: 150, height: 100 });
    const upperLeft = await lightPixels(output, { left: 150, top: 100, width: 150, height: 100 });
    const upperRight = await lightPixels(output, { left: 300, top: 100, width: 150, height: 100 });
    const lowerRight = await lightPixels(output, { left: 300, top: 200, width: 150, height: 100 });
    expect(lowerLeft).toBeGreaterThan(upperLeft);
    expect(upperRight).toBeGreaterThan(lowerRight);

    for (const [x, y] of [[5, 5], [594, 5], [5, 394], [594, 394]]) {
      const [r, g, b] = await pixelAt(output, x, y);
      expect(Math.abs(r - BLUE.r)).toBeLessThan(12);
      expect(Math.abs(g - BLUE.g)).toBeLessThan(12);
      expect(Math.abs(b - BLUE.b)).toBeLessThan(12);
    }
  });
});

describe('sharp image processor: a watermark that draws nothing', () => {
  it('is refused with 501 instead of returning an image without the text', async () => {
    const input = await solid(120, 80).png().toBuffer();
    // Text made of spaces draws no pixel, exactly like real text on a machine without fonts.
    await expect(processor.watermark(input, '   ')).rejects.toMatchObject({
      statusCode: 501,
      code: 'IMAGE_PROCESSING_UNAVAILABLE',
    });
  });
});

describe('uploads service with the image processor registered', () => {
  const ENV_NAMES = [
    'STORAGE_PROVIDER',
    'STORAGE_LOCAL_DIR',
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
    'NODE_ENV',
  ];
  const savedEnv: Record<string, string | undefined> = {};
  let tmpDir: string;

  beforeEach(() => {
    for (const name of ENV_NAMES) {
      savedEnv[name] = process.env[name];
      delete process.env[name];
    }
    process.env.NODE_ENV = 'test';
    process.env.PUBLIC_API_URL = 'http://localhost:3000';
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'astro-uploads-image-test-'));
    process.env.STORAGE_LOCAL_DIR = tmpDir;
    uploadsService.setImageProcessor(null);
  });

  afterEach(() => {
    uploadsService.setImageProcessor(null);
    fs.rmSync(tmpDir, { recursive: true, force: true });
    for (const name of ENV_NAMES) {
      if (savedEnv[name] === undefined) delete process.env[name];
      else process.env[name] = savedEnv[name];
    }
  });

  it('answers 501 for a watermark until the processor is registered, then stores a watermarked WebP', async () => {
    const preview = await solid(600, 400).png().toBuffer();

    await expect(uploadsService.storeUpload({ purpose: 'product', buffer: preview, watermark: true })).rejects.toMatchObject({
      statusCode: 501,
      code: 'IMAGE_PROCESSING_UNAVAILABLE',
    });

    expect(registerImageProcessor()).toBe(true);

    const uploaded = await uploadsService.storeUpload({ purpose: 'product', buffer: preview, watermark: true });
    expect(uploaded).toMatchObject({ contentType: 'image/webp', visibility: 'public', purpose: 'product' });
    expect(uploaded.key).toMatch(/^assets\/product\/\d{4}\/\d{2}\/[0-9a-f-]{36}\.webp$/);

    const stored = await storageService.downloadBuffer(uploaded.key);
    expect(uploaded.size).toBe(stored.length);
    expect(await sharp(stored).metadata()).toMatchObject({ format: 'webp', width: 600, height: 400 });
    expect(await lightPixels(stored, { left: 100, top: 100, width: 400, height: 200 })).toBeGreaterThan(300);

    // The same image without the flag is converted but carries no text.
    const plain = await uploadsService.storeUpload({ purpose: 'product', buffer: preview });
    const plainStored = await storageService.downloadBuffer(plain.key);
    expect((await sharp(plainStored).metadata()).format).toBe('webp');
    expect(await lightPixels(plainStored, { left: 100, top: 100, width: 400, height: 200 })).toBe(0);
  });

  it('converts every public image purpose to WebP whatever was uploaded', async () => {
    registerImageProcessor();
    const jpeg = await solid(32, 32).jpeg().toBuffer();
    const uploaded = await uploadsService.storeUpload({ purpose: 'banner', buffer: jpeg, declaredMimeType: 'image/jpeg', filename: 'a.jpg' });
    expect(uploaded.contentType).toBe('image/webp');
    expect(uploaded.key.endsWith('.webp')).toBe(true);
    expect((await storageService.getMetadata(uploaded.key))?.contentType).toBe('image/webp');
  });

  it('never touches the sold file of a digital product, image or not, and never watermarks it', async () => {
    registerImageProcessor();
    const pdf = Buffer.from('%PDF-1.7\n%a sold file that must arrive byte for byte\n');
    const soldImage = await solid(64, 64).png().toBuffer();

    for (const [buffer, contentType] of [[pdf, 'application/pdf'], [soldImage, 'image/png']] as const) {
      const uploaded = await uploadsService.storeUpload({ purpose: 'digital-product', buffer });
      expect(uploaded).toMatchObject({ contentType, visibility: 'private', url: null });
      expect((await storageService.downloadBuffer(uploaded.key)).equals(buffer)).toBe(true);
    }

    await expect(
      uploadsService.storeUpload({ purpose: 'digital-product', buffer: soldImage, watermark: true })
    ).rejects.toMatchObject({ statusCode: 400, code: 'VALIDATION_ERROR' });
  });

  it('leaves a public file that is not an image as uploaded', async () => {
    registerImageProcessor();
    const mp4 = Buffer.concat([Buffer.from([0, 0, 0, 0x18]), Buffer.from('ftypisom'), Buffer.alloc(64, 7)]);
    const uploaded = await uploadsService.storeUpload({ purpose: 'media-video', buffer: mp4 });
    expect(uploaded.contentType).toBe('video/mp4');
    expect((await storageService.downloadBuffer(uploaded.key)).equals(mp4)).toBe(true);
  });

  it('still refuses SVG, and a file that only carries an image signature, and stores nothing', async () => {
    registerImageProcessor();
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
    await expect(
      uploadsService.storeUpload({ purpose: 'banner', buffer: svg, declaredMimeType: 'image/png', filename: 'a.png' })
    ).rejects.toMatchObject({ statusCode: 415, code: 'UNSUPPORTED_FILE_TYPE' });

    const fakePng = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.from('<script>alert(1)</script>')]);
    await expect(uploadsService.storeUpload({ purpose: 'banner', buffer: fakePng })).rejects.toMatchObject({
      statusCode: 415,
      code: 'UNSUPPORTED_FILE_TYPE',
    });

    const bomb = pngHeaderClaiming(15_000, 15_000);
    await expect(uploadsService.storeUpload({ purpose: 'banner', buffer: bomb })).rejects.toMatchObject({
      statusCode: 413,
      code: 'IMAGE_DIMENSIONS_TOO_LARGE',
    });

    expect(await storageService.listKeys('assets/')).toEqual([]);
  });
});
