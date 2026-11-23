import { storageService, ObjectVisibility } from '../../services/storage.service';
import { AppError, ValidationError } from '../../errors/app-error';
import {
  detectContentType,
  generateObjectKey,
  getUploadPolicy,
  UploadContentType,
  UploadPurpose,
} from '../../services/storage/upload-policy';

export interface UploadFileInput {
  purpose: UploadPurpose;
  buffer: Buffer;
  /** MIME type and filename as sent by the client: hints only, never trusted or stored. */
  declaredMimeType?: string;
  filename?: string;
  /** Text watermark for a digital product's preview image / thumbnail. */
  watermark?: boolean;
}

export interface UploadedFile {
  /** Public URL for a public file; null for a private one. */
  url: string | null;
  key: string;
  contentType: string;
  size: number;
  visibility: ObjectVisibility;
  purpose: UploadPurpose;
}

/**
 * Image conversion seam. The website converted every uploaded image to WebP and watermarked
 * digital-product previews with `sharp`. No image library is installed in this workspace, so no
 * processor is registered by default: images are stored in the format they were uploaded in and a
 * watermark request is refused. Registering an implementation here is all that is needed once an
 * image library is approved.
 */
export interface ImageProcessor {
  toWebp(image: Buffer): Promise<Buffer>;
  watermark(image: Buffer, text: string): Promise<Buffer>;
}

export const WATERMARK_TEXT = 'Astro Sushil';
const PUBLIC_CACHE_CONTROL = 'public, max-age=31536000, immutable';
const WATERMARK_PURPOSES: readonly UploadPurpose[] = ['product'];

export class FileTooLargeError extends AppError {
  constructor(maxBytes: number) {
    super(`The file is larger than the ${Math.floor(maxBytes / (1024 * 1024))} MB allowed for this kind of upload`, 413, 'FILE_TOO_LARGE');
  }
}

export class UnsupportedFileTypeError extends AppError {
  constructor(message: string) {
    super(message, 415, 'UNSUPPORTED_FILE_TYPE');
  }
}

export class UploadsService {
  private imageProcessor: ImageProcessor | null = null;

  public setImageProcessor(processor: ImageProcessor | null): void {
    this.imageProcessor = processor;
  }

  /**
   * Validates a file against the rules of its purpose and stores it. Used by the admin upload
   * endpoint; other backend services with their own authenticated upload route (for example a
   * customer's profile photo) call it too, so every upload goes through the same checks.
   */
  public async storeUpload(input: UploadFileInput): Promise<UploadedFile> {
    const policy = getUploadPolicy(input.purpose);

    if (!input.buffer || input.buffer.length === 0) {
      throw new ValidationError('The uploaded file is empty');
    }
    if (input.buffer.length > policy.maxBytes) {
      throw new FileTooLargeError(policy.maxBytes);
    }

    let contentType: UploadContentType | null = detectContentType(input.buffer, input.declaredMimeType, input.filename);
    if (!contentType || !policy.allowedTypes.includes(contentType)) {
      throw new UnsupportedFileTypeError(
        `This file type is not allowed for '${input.purpose}' uploads. Allowed: ${policy.allowedTypes.join(', ')}`
      );
    }

    let body = input.buffer;
    const isPublicImage = policy.visibility === 'public' && contentType.startsWith('image/');

    if (input.watermark) {
      if (!WATERMARK_PURPOSES.includes(input.purpose) || !isPublicImage) {
        throw new ValidationError('A watermark can only be applied to product preview images');
      }
      if (!this.imageProcessor) {
        throw new AppError('Image watermarking is not available on this server', 501, 'IMAGE_PROCESSING_UNAVAILABLE');
      }
      body = await this.imageProcessor.watermark(body, WATERMARK_TEXT);
    }

    if (isPublicImage && this.imageProcessor) {
      body = await this.imageProcessor.toWebp(body);
      contentType = 'image/webp';
    }

    const key = generateObjectKey(input.purpose, contentType);
    await storageService.upload({
      key,
      body,
      contentType,
      visibility: policy.visibility,
      cacheControl: policy.visibility === 'public' ? PUBLIC_CACHE_CONTROL : undefined,
    });

    return {
      url: policy.visibility === 'public' ? storageService.getPublicUrl(key) : null,
      key,
      contentType,
      size: body.length,
      visibility: policy.visibility,
      purpose: input.purpose,
    };
  }
}

export const uploadsService = new UploadsService();
