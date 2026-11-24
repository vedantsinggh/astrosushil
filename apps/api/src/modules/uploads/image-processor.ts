import type { Metadata, Sharp as SharpPipeline } from 'sharp';
import { AppError } from '../../errors/app-error';
import { logger } from '../../utils/logger';
import { ImageProcessor, UnsupportedFileTypeError, uploadsService } from './uploads.service';

/**
 * The real image processor behind `uploadsService.setImageProcessor`, built on `sharp`
 * (Apache-2.0, approved by the owner on 2026-11-24; the website backend uses the same library).
 *
 * What it reproduces from the website (`src/service/UploadAws.js`, `src/utils/createWatermarkedImage.js`):
 *  - every image becomes WebP at quality 80;
 *  - an animated GIF keeps its first frame only (the website calls `sharp(buffer)` without
 *    `animated: true`, so only the first frame is read);
 *  - the watermark is the given text in bold white, font size `floor(width / 12)`, centred, rotated
 *    -30 degrees around the centre, composited over the whole image and encoded as JPEG quality 90
 *    (a transparent image is therefore flattened onto black, as on the website).
 *
 * What it adds:
 *  - the EXIF orientation is applied to the pixels before the metadata is dropped (the website
 *    dropped the tag without rotating, so phone photos could come out sideways);
 *  - no metadata is written to the output: no EXIF (GPS position, camera, date), XMP, IPTC or ICC;
 *  - images above MAX_IMAGE_PIXELS or MAX_IMAGE_SIDE are refused before any pixel is decoded;
 *  - only JPEG, PNG, WebP and GIF are decoded, whatever else libvips could read (SVG, TIFF, HEIF, PDF);
 *  - a watermark that drew nothing (no font installed on the machine) is an error, not a silent success.
 */

/** Largest decoded image accepted: 50 megapixels (a 50 MP phone photo is 8160 x 6120). */
export const MAX_IMAGE_PIXELS = 50_000_000;
/** Largest width or height accepted: the WebP format cannot store more than 16383 pixels per side. */
export const MAX_IMAGE_SIDE = 16_383;
export const WEBP_QUALITY = 80;
export const WATERMARK_JPEG_QUALITY = 90;

const DECODABLE_FORMATS: readonly string[] = ['jpeg', 'png', 'webp', 'gif'];

export class ImageDimensionsTooLargeError extends AppError {
  constructor() {
    super(
      `The image is too large in pixels. The limit is ${MAX_IMAGE_PIXELS / 1_000_000} megapixels and ${MAX_IMAGE_SIDE} pixels per side`,
      413,
      'IMAGE_DIMENSIONS_TOO_LARGE'
    );
  }
}

export class WatermarkUnavailableError extends AppError {
  constructor() {
    super('Image watermarking is not available on this server', 501, 'IMAGE_PROCESSING_UNAVAILABLE');
  }
}

type Sharp = typeof import('sharp').default;

interface CheckedImage {
  /** Width and height as displayed, after the EXIF orientation is applied. */
  width: number;
  height: number;
}

function escapeXml(text: string): string {
  return text.replace(/[<>&'"]/g, (char) => {
    switch (char) {
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '&':
        return '&amp;';
      case "'":
        return '&apos;';
      default:
        return '&quot;';
    }
  });
}

/** The website's watermark SVG, with the text escaped. No font family is named: the server's default font is used. */
export function buildWatermarkSvg(width: number, height: number, text: string): string {
  const fontSize = Math.floor(width / 12);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <style>.title { fill: rgb(255, 255, 255); font-size: ${fontSize}px; font-weight: bold; }</style>
  <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" transform="rotate(-30 ${width / 2} ${height / 2})" class="title">${escapeXml(text)}</text>
</svg>`;
}

export function createSharpImageProcessor(sharp: Sharp): ImageProcessor {
  // Only the first frame of an animated image is read (`pages` defaults to 1), as on the website.
  const open = (image: Buffer) => sharp(image, { limitInputPixels: MAX_IMAGE_PIXELS, failOn: 'error' });

  /** Reads the header only: refuses anything that is not a supported raster image or is too large. */
  async function check(image: Buffer): Promise<CheckedImage> {
    let metadata: Metadata;
    try {
      // The pixel limit is checked below, so that an oversized image gets its own error.
      metadata = await sharp(image, { limitInputPixels: false }).metadata();
    } catch {
      throw new UnsupportedFileTypeError('The image could not be read');
    }
    if (!metadata.format || !DECODABLE_FORMATS.includes(metadata.format)) {
      throw new UnsupportedFileTypeError('The image could not be read');
    }
    const rawWidth = metadata.width ?? 0;
    const rawHeight = metadata.height ?? 0;
    if (rawWidth < 1 || rawHeight < 1) {
      throw new UnsupportedFileTypeError('The image could not be read');
    }
    if (rawWidth > MAX_IMAGE_SIDE || rawHeight > MAX_IMAGE_SIDE || rawWidth * rawHeight > MAX_IMAGE_PIXELS) {
      throw new ImageDimensionsTooLargeError();
    }
    // EXIF orientations 5 to 8 turn the image by a quarter: displayed width and height swap.
    const quarterTurn = (metadata.orientation ?? 1) >= 5;
    return quarterTurn ? { width: rawHeight, height: rawWidth } : { width: rawWidth, height: rawHeight };
  }

  async function encode(pipeline: SharpPipeline): Promise<Buffer> {
    try {
      // No withMetadata / keepExif / keepIccProfile call: sharp writes no metadata unless asked to.
      return await pipeline.toBuffer();
    } catch (err) {
      if (err instanceof Error && /pixel limit/i.test(err.message)) throw new ImageDimensionsTooLargeError();
      throw new UnsupportedFileTypeError('The image could not be read');
    }
  }

  return {
    async toWebp(image: Buffer): Promise<Buffer> {
      await check(image);
      return encode(open(image).rotate().webp({ quality: WEBP_QUALITY }));
    },

    async watermark(image: Buffer, text: string): Promise<Buffer> {
      const { width, height } = await check(image);
      const overlay = Buffer.from(buildWatermarkSvg(width, height, text));
      // The text is drawn with a font of the machine. Without any font installed the overlay comes
      // out empty; refuse then, rather than publish a preview that only looks watermarked in the code.
      const drawn = await sharp(overlay).extractChannel('alpha').stats();
      if (drawn.channels[0].max === 0) throw new WatermarkUnavailableError();
      return encode(
        open(image)
          .rotate()
          .composite([{ input: overlay, top: 0, left: 0 }])
          .jpeg({ quality: WATERMARK_JPEG_QUALITY })
      );
    },
  };
}

/**
 * Registers the sharp processor with the uploads service. Called once at API start-up. Never
 * throws: if the native library cannot be loaded on this machine the API still starts, images are
 * stored as uploaded and a watermark request keeps answering 501, and the failure is logged.
 */
export function registerImageProcessor(): boolean {
  try {
    // Loaded here, not at the top of the file, so a missing native binary cannot stop the process.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const sharp = require('sharp') as Sharp;
    uploadsService.setImageProcessor(createSharpImageProcessor(sharp));
    return true;
  } catch (err) {
    logger.error({ err }, 'Image library could not be loaded: uploads are stored unconverted and watermarking is unavailable');
    return false;
  }
}
