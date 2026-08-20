import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { reportsService } from './reports.service';
import { createReportSchema } from './reports.schemas';

export async function reportsRoutes(fastify: FastifyInstance, _options: FastifyPluginOptions) {
  fastify.addHook('onRequest', fastify.authenticate);

  // POST /api/v1/reports/generate
  fastify.post('/generate', {
    schema: {
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
            enum: ['MARRIAGE_COMPATIBILITY', 'CAREER_PROSITY', 'CHILDBIRTH_FAMILY', 'GUPTA_NADI_DOSSIER'],
          },
          orderId: { type: 'string', format: 'uuid' },
        },
      },
    },
    handler: async (request, reply) => {
      const input = createReportSchema.parse(request.body);
      const result = await reportsService.createReportJob(input, request.user);
      return reply.status(201).send(result);
    },
  });

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

  // GET /api/v1/reports/:id/download-file
  fastify.get('/:id/download-file', {
    schema: {
      tags: ['Reports'],
      summary: 'Download generated report PDF file',
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

      reply.header('Content-Type', 'application/pdf');
      reply.header('Content-Disposition', `attachment; filename="astro-report-${report.id}.pdf"`);
      return reply.send(Buffer.from(`%PDF-1.4 Mock Astro Sushil PDF Report (${report.reportType}) for profile ${report.birthProfileId}`));
    },
  });
}
