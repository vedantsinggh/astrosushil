import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { reportsService } from './reports.service';
import { createReportSchema } from './reports.schemas';

export async function reportsRoutes(fastify: FastifyInstance, _options: FastifyPluginOptions) {
  fastify.addHook('onRequest', fastify.authenticate);

  const generateSchema = {
    tags: ['Reports'],
    summary: 'Initiate report generation pipeline',
    security: [{ bearerAuth: [] }],
    body: {
      type: 'object',
      required: ['birthProfileId', 'reportType'],
      properties: {
        birthProfileId: { type: 'string', format: 'uuid' },
        reportType: {
          type: 'string',
          enum: ['KUNDLI', 'PLANETARY_SUMMARY'],
        },
        orderId: { type: 'string', format: 'uuid' },
      },
    },
  };

  const handleGenerate = async (request: any, reply: any) => {
    const input = createReportSchema.parse(request.body);
    const result = await reportsService.createReportJob(input, request.user);
    return reply.status(201).send(result);
  };

  // POST /api/v1/reports
  fastify.post('/', { schema: generateSchema, handler: handleGenerate });

  // POST /api/v1/reports/generate
  fastify.post('/generate', { schema: generateSchema, handler: handleGenerate });

  // GET /api/v1/reports/my-reports
  fastify.get('/my-reports', {
    schema: {
      tags: ['Reports'],
      summary: 'List reports generated for authenticated user',
      security: [{ bearerAuth: [] }],
    },
    handler: async (request, reply) => {
      const reports = await reportsService.getUserReports(request.user);
      return reply.status(200).send({ reports });
    },
  });

  // GET /api/v1/reports/:id
  fastify.get('/:id', {
    schema: {
      tags: ['Reports'],
      summary: 'Get report status and details',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
    },
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };
      const report = await reportsService.getReportStatus(id, request.user);
      return reply.status(200).send(report);
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
    const { buffer, report } = await reportsService.generateReportPdfBuffer(id, request.user);

    reply.header('Content-Type', 'application/pdf');
    reply.header(
      'Content-Disposition',
      `attachment; filename="astro-sushil-${report.reportType.toLowerCase()}-${id}.pdf"`
    );
    return reply.send(buffer);
  };

  // GET /api/v1/reports/:id/pdf
  fastify.get('/:id/pdf', { schema: pdfSchema, handler: handlePdfDownload });

  // GET /api/v1/reports/:id/download-file
  fastify.get('/:id/download-file', { schema: pdfSchema, handler: handlePdfDownload });
}
