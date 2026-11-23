import { FastifyInstance, FastifyPluginOptions, FastifyRequest } from 'fastify';
import { adminService } from '../admin/admin.service';
import { checkPermission, getRequestStaffAccess } from '../admin/rbac/check-permission';
import { NotFoundError, ValidationError } from '../../errors/app-error';
import { storageService } from '../../services/storage.service';
import { classifyObjectKey, getUploadPolicy } from '../../services/storage/upload-policy';
import { FileTooLargeError, uploadsService } from './uploads.service';
import { uploadQuerySchema, uploadResponseJsonSchema } from './uploads.schemas';

interface MultipartFailure {
  code?: string;
  statusCode?: number;
}

/** Reads the single `file` part into memory, enforcing the size cap of the upload's purpose. */
async function readFilePart(request: FastifyRequest, maxBytes: number) {
  if (!request.isMultipart()) {
    throw new ValidationError('Send the file as multipart/form-data in a field named "file"');
  }
  try {
    const part = await request.file({ limits: { fileSize: maxBytes, files: 1 } });
    if (!part || part.fieldname !== 'file') {
      part?.file.resume(); // discard the unread stream so the request can finish
      throw new ValidationError('Send the file as multipart/form-data in a field named "file"');
    }
    const buffer = await part.toBuffer();
    return { buffer, mimetype: part.mimetype, filename: part.filename };
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    const failure = err as MultipartFailure;
    if (failure.code === 'FST_REQ_FILE_TOO_LARGE') throw new FileTooLargeError(maxBytes);
    if (typeof failure.code === 'string' && failure.code.startsWith('FST_')) {
      throw new ValidationError('The multipart upload is malformed or contains more than one file');
    }
    throw err;
  }
}

/**
 * File uploads (registered without a prefix under /api/v1):
 *   POST /admin/uploads?purpose=<purpose>   admin, permission `uploads:create`
 *   GET  /uploads/local/*                   development only: serves public files kept on local disk
 */
export async function uploadsRoutes(fastify: FastifyInstance, _options: FastifyPluginOptions) {
  fastify.register(async (adminScope) => {
    adminScope.addHook('onRequest', fastify.authenticate);
    adminScope.addHook('onRequest', fastify.authorize(['SUPER_ADMIN', 'ADMIN', 'SUPPORT']));

    adminScope.post('/admin/uploads', {
      schema: {
        tags: ['Admin Uploads'],
        summary: 'Upload one file to object storage and get its { url, key }',
        consumes: ['multipart/form-data'],
        querystring: {
          type: 'object',
          properties: {
            purpose: { type: 'string' },
            watermark: { type: 'string', enum: ['true', 'false'] },
          },
        },
        response: { 201: uploadResponseJsonSchema },
      },
      preHandler: [checkPermission('uploads:create')],
      handler: async (request, reply) => {
        const query = uploadQuerySchema.parse(request.query);
        const policy = getUploadPolicy(query.purpose);
        const file = await readFilePart(request, policy.maxBytes);

        const uploaded = await uploadsService.storeUpload({
          purpose: query.purpose,
          buffer: file.buffer,
          declaredMimeType: file.mimetype,
          filename: file.filename,
          watermark: query.watermark,
        });

        const access = await getRequestStaffAccess(request);
        await adminService.logAction({
          adminId: request.user.id,
          adminEmail: access.email || request.user.id,
          action: 'UPLOAD_FILE',
          resource: `Upload:${uploaded.key}`,
          details: `purpose=${uploaded.purpose} visibility=${uploaded.visibility} contentType=${uploaded.contentType} size=${uploaded.size}`,
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'],
        });

        return reply.status(201).send(uploaded);
      },
    });
  });

  // Public files live in the bucket in production and are served by S3 directly. This route only
  // exists so a developer without a bucket can see the images they upload.
  fastify.get('/uploads/local/*', {
    schema: { hide: true },
    handler: async (request, reply) => {
      const key = (request.params as { '*': string })['*'];
      if (process.env.NODE_ENV === 'production' || storageService.providerName !== 'local') {
        throw new NotFoundError('File not found');
      }
      const resolved = storageService.resolveKey(key);
      if (!resolved || classifyObjectKey(resolved).visibility !== 'public') {
        throw new NotFoundError('File not found');
      }
      const metadata = await storageService.getMetadata(resolved);
      if (!metadata) throw new NotFoundError('File not found');
      const buffer = await storageService.downloadBuffer(resolved);
      reply.header('Content-Type', metadata.contentType || 'application/octet-stream');
      reply.header('X-Content-Type-Options', 'nosniff');
      reply.header('Cross-Origin-Resource-Policy', 'cross-origin');
      reply.header('Cache-Control', 'public, max-age=300');
      return reply.send(buffer);
    },
  });
}
