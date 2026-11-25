import { z } from 'zod/v3';
import { UPLOAD_PURPOSES } from '../../services/storage/upload-policy';

export const uploadQuerySchema = z.object({
  purpose: z.enum(UPLOAD_PURPOSES, {
    errorMap: () => ({ message: `purpose is required and must be one of: ${UPLOAD_PURPOSES.join(', ')}` }),
  }),
  // Digital-product preview images and thumbnail only (never the sold file).
  watermark: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => value === 'true'),
});

export type UploadQuery = z.infer<typeof uploadQuerySchema>;

export const uploadResponseJsonSchema = {
  type: 'object',
  properties: {
    url: { type: ['string', 'null'], description: 'Public URL; null for a private file' },
    key: { type: 'string' },
    contentType: { type: 'string' },
    size: { type: 'integer' },
    visibility: { type: 'string', enum: ['public', 'private'] },
    purpose: { type: 'string' },
  },
} as const;
