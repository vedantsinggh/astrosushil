import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import path from 'path';
import { reportsService } from './reports.service';
import { storageService } from '../../services/storage.service';
import { createReportSchema } from './reports.schemas';

export async function reportsRoutes(fastify: FastifyInstance, _options: FastifyPluginOptions) {
  fastify.addHook('onRequest', fastify.authenticate);

  function setNoCacheHeaders(reply: any) {
    reply.header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    reply.header('Pragma', 'no-cache');
    reply.header('Expires', '0');
  }

  // 1. Static POST routes
  // POST /api/v1/reports/career
  fastify.post('/career', {
    schema: {
      tags: ['Reports'],
      summary: 'Initiate async Career Report generation pipeline',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['birthProfileId'],
        properties: {
          birthProfileId: { type: 'string', format: 'uuid' },
          forceRegenerate: { type: 'boolean' },
        },
      },
    },
    handler: async (request, reply) => {
      setNoCacheHeaders(reply);
      const { birthProfileId, forceRegenerate } = request.body as {
        birthProfileId: string;
        forceRegenerate?: boolean;
      };
      const result = await reportsService.createCareerReportJob({ birthProfileId, forceRegenerate }, request.user);
      return reply.status(201).send(result);
    },
  });

  const generateSchema = {
    tags: ['Reports'],
    summary: 'Initiate legacy report generation pipeline',
    security: [{ bearerAuth: [] }],
    body: {
      type: 'object',
      required: ['birthProfileId', 'reportType'],
      properties: {
        birthProfileId: { type: 'string', format: 'uuid' },
        reportType: { type: 'string' },
        orderId: { type: 'string', format: 'uuid' },
      },
    },
  };

  const handleGenerate = async (request: any, reply: any) => {
    setNoCacheHeaders(reply);
    const input = createReportSchema.parse(request.body);
    const result = await reportsService.createReportJob(input, request.user);
    return reply.status(201).send(result);
  };

  // POST /api/v1/reports/generate
  fastify.post('/generate', { schema: generateSchema, handler: handleGenerate });

  // POST /api/v1/reports/ (Root generate)
  fastify.post('/', { schema: generateSchema, handler: handleGenerate });

  // 2. Multi-segment / Subpath POST routes
  // POST /api/v1/reports/career/:reportId/regenerate
  fastify.post('/career/:reportId/regenerate', {
    schema: {
      tags: ['Reports'],
      summary: 'Regenerate an existing Career Report',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          reportId: { type: 'string', format: 'uuid' },
        },
      },
    },
    handler: async (request, reply) => {
      setNoCacheHeaders(reply);
      const { reportId } = request.params as { reportId: string };
      const result = await reportsService.regenerateCareerReport(reportId, request.user);
      return reply.status(201).send(result);
    },
  });

  // 3. Static GET routes
  // GET /api/v1/reports/my-reports
  fastify.get('/my-reports', {
    schema: {
      tags: ['Reports'],
      summary: 'List reports generated for authenticated user',
      security: [{ bearerAuth: [] }],
    },
    handler: async (request, reply) => {
      setNoCacheHeaders(reply);
      const reports = await reportsService.getUserReports(request.user);
      return reply.status(200).send({ reports });
    },
  });

  // 4. Multi-segment / Subpath GET routes
  // GET /api/v1/reports/:id/status
  fastify.get('/:id/status', {
    schema: {
      tags: ['Reports'],
      summary: 'Get real-time report status and progress for polling',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
    },
    handler: async (request, reply) => {
      setNoCacheHeaders(reply);
      const { id } = request.params as { id: string };
      const status = await reportsService.getReportStatusOnly(id, request.user);
      return reply.status(200).send(status);
    },
  });

  const pdfSchema = {
    tags: ['Reports'],
    summary: 'Download generated report PDF file',
    security: [{ bearerAuth: [] }],
    params: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
      },
    },
  };

  const handlePdfDownload = async (request: any, reply: any) => {
    const { id } = request.params as { id: string };
    const { buffer } = await reportsService.generateReportPdfBuffer(id, request.user);

    reply.header('Content-Type', 'application/pdf');
    reply.header(
      'Content-Disposition',
      `attachment; filename="astro-sushil-career-${id}.pdf"`
    );
    return reply.send(buffer);
  };

  // GET /api/v1/reports/:id/access
  fastify.get('/:id/access', {
    schema: {
      tags: ['Reports'],
      summary: 'Get short-lived secure signed URL for report PDF download',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
    },
    handler: async (request, reply) => {
      setNoCacheHeaders(reply);
      const { id } = request.params as { id: string };
      const accessInfo = await reportsService.getReportAccessUrl(id, request.user);
      return reply.status(200).send(accessInfo);
    },
  });

  // GET /api/v1/reports/download-secure (Tokenized download URL for local fallback)
  fastify.get('/download-secure', {
    onRequest: [],
    handler: async (request, reply) => {
      const { key, expires, token } = request.query as { key: string; expires: string; token: string };
      if (!key || !expires || !token) {
        return reply.status(400).send({ error: 'Missing signature parameters' });
      }
      const expiresMs = parseInt(expires, 10);
      const isValid = storageService.verifyLocalSignedUrl(key, expiresMs, token);
      if (!isValid) {
        return reply.status(403).send({ error: 'Invalid or expired download signature' });
      }
      const buffer = await storageService.downloadBuffer(key);
      const filename = path.basename(key);
      reply.header('Content-Type', 'application/pdf');
      reply.header('Content-Disposition', `inline; filename="${filename}"`);
      return reply.send(buffer);
    },
  });

  // GET /api/v1/reports/:id/pdf
  fastify.get('/:id/pdf', { schema: pdfSchema, handler: handlePdfDownload });

  // GET /api/v1/reports/:id/download-file
  fastify.get('/:id/download-file', { schema: pdfSchema, handler: handlePdfDownload });

  // DELETE /api/v1/reports/:id
  fastify.delete('/:id', {
    schema: {
      tags: ['Reports'],
      summary: 'Delete report metadata and private object storage PDF',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
    },
    handler: async (request, reply) => {
      setNoCacheHeaders(reply);
      const { id } = request.params as { id: string };
      const result = await reportsService.deleteReport(id, request.user);
      return reply.status(200).send(result);
    },
  });

  // 5. Catch-all single-segment GET route (MUST BE LAST)
  // GET /api/v1/reports/:id
  fastify.get('/:id', {
    schema: {
      tags: ['Reports'],
      summary: 'Get report details and status',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
    },
    handler: async (request, reply) => {
      setNoCacheHeaders(reply);
      const { id } = request.params as { id: string };
      const report = await reportsService.getReportStatus(id, request.user);
      return reply.status(200).send(report);
    },
  });
}
