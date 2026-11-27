/**
 * Admin screen "PDF Reports" (website admin `/pdfreports`, owner decision 2026-11-26): staff edit
 * the report catalogue. The report types are fixed (the engine generates them): staff cannot add a
 * report type or delete one, only take it off sale (`isActive: false`).
 *
 *   GET  /api/v1/admin/report-catalogue            every report item, with its edits   pdf_reports:read
 *   GET  /api/v1/admin/report-catalogue/:catalogId one item                            pdf_reports:read
 *   PUT  /api/v1/admin/report-catalogue/:catalogId save edits (partial)               pdf_reports:update
 *   POST /api/v1/admin/report-catalogue/:catalogId/reset  back to the code values     pdf_reports:update
 *
 * Every write is recorded with `adminService.logAction` (AGENTS.md section 6.3).
 */
import { FastifyInstance } from 'fastify';
import { OrderItemType, Prisma } from '@prisma/client';
import { z } from 'zod/v3';
import { prisma } from '../../services/prisma.service';
import { ConflictError, NotFoundError } from '../../errors/app-error';
import { adminActor, audit, protectAdminScope, requirePermission, sendOk } from '../products/shop-http';
import type { AdminActor } from '../products/shop-http';
import { COMMERCE_CATALOG, CatalogItem, commerceCatalog } from './commerce.catalog';
import { basePriceOf, ReportCatalogOverride, reportCatalogOverrides } from './report-catalog.overrides';
import { WEBSITE_REPORT_PRODUCTS } from '../web-astrology/web-reports.service';
import { platformReportLanguages } from '../../services/platform-report.runner';
import { hsnSac } from '../content/content.schemas';

const text = (max: number) => z.string().trim().max(max);
const nullableText = (max: number) => z.union([text(max), z.null()]);
const block = z.object({ title: text(200).min(1), description: text(2000), icon: text(500).optional() }).strict();
const faq = z.object({ question: text(500).min(1), answer: text(5000).min(1) }).strict();

export const updateReportCatalogSchema = z
  .object({
    name: nullableText(200),
    slug: z.union([z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, digits and hyphens').max(120), z.null()]),
    shortDescription: nullableText(500),
    description: nullableText(20000),
    coverImageUrl: z.union([z.string().trim().url().max(2048), z.literal(''), z.null()]),
    coverImageKey: nullableText(1024),
    salePricePaise: z.union([z.number().int().min(0).max(100_000_000), z.null()]),
    /** true: salePricePaise is the final price with GST inside; false: GST is added on top. */
    priceIncludesGst: z.boolean(),
    originalPricePaise: z.union([z.number().int().min(0).max(100_000_000), z.null()]),
    gstRateBp: z.union([z.number().int().min(0).max(2800), z.null()]),
    isActive: z.union([z.boolean(), z.null()]),
    isPremium: z.boolean(),
    benefits: z.array(block).max(30),
    features: z.array(block).max(30),
    faqs: z.array(faq).max(50),
    hsnSac: z.union([hsnSac, z.null()]),
  })
  .partial()
  .strict();

export type UpdateReportCatalogInput = z.infer<typeof updateReportCatalogSchema>;

export interface ReportCatalogAdminView {
  catalogId: string;
  reportType: string | null;
  /** The website product this item is sold as, if any. */
  websiteProduct: { slug: string; name: string; reportType: string } | null;
  languages: string[];
  /** What is sold now (code values with the edits applied). */
  effective: {
    name: string;
    slug: string | null;
    description: string;
    salePricePaise: number;
    gstRateBp: number;
    gstPaise: number;
    priceWithGstPaise: number;
    originalPricePaise: number | null;
    isActive: boolean;
  };
  /** The code values, for "reset". */
  defaults: { name: string; description: string; salePricePaise: number; gstRateBp: number; originalPricePaise: number | null; isActive: boolean };
  edits: ReportCatalogOverride | null;
}

function reportItems(): CatalogItem[] {
  return Object.values(COMMERCE_CATALOG).filter((item) => item.itemType === OrderItemType.REPORT);
}

function codeItem(catalogId: string): CatalogItem {
  const item = Object.prototype.hasOwnProperty.call(COMMERCE_CATALOG, catalogId) ? COMMERCE_CATALOG[catalogId] : undefined;
  if (!item || item.itemType !== OrderItemType.REPORT) throw new NotFoundError('Report not found in the catalogue');
  return item;
}

function toView(code: CatalogItem): ReportCatalogAdminView {
  const effective = commerceCatalog.getItem(code.id) ?? code;
  const edits = reportCatalogOverrides.get(code.id) ?? null;
  const website = WEBSITE_REPORT_PRODUCTS.find((p) => p.catalogId === code.id) ?? null;
  const base = basePriceOf(effective);
  return {
    catalogId: code.id,
    reportType: code.legacyReportType ?? null,
    websiteProduct: website ? { slug: website.slug, name: website.name, reportType: website.reportType } : null,
    languages: code.legacyReportType ? platformReportLanguages(code.legacyReportType) : [],
    effective: {
      name: edits?.name?.trim() || (website ? website.name : effective.title),
      slug: edits?.slug?.trim() || website?.slug || null,
      description: effective.description,
      salePricePaise: base,
      gstRateBp: effective.taxRateBasisPoints,
      gstPaise: effective.taxIncluded ? effective.pricePaise - base : Math.floor((base * effective.taxRateBasisPoints + 5000) / 10000),
      priceWithGstPaise: effective.taxIncluded ? effective.pricePaise : base + Math.floor((base * effective.taxRateBasisPoints + 5000) / 10000),
      originalPricePaise: effective.originalPricePaise ?? null,
      isActive: effective.isActive,
    },
    defaults: {
      name: website ? website.name : code.title,
      description: code.description,
      salePricePaise: basePriceOf(code),
      gstRateBp: code.taxRateBasisPoints,
      originalPricePaise: code.originalPricePaise ?? null,
      isActive: code.isActive,
    },
    edits,
  };
}

function describeChange(input: UpdateReportCatalogInput): string {
  return Object.keys(input).sort().join(', ') || 'nothing';
}

export class ReportCatalogAdminService {
  public async list(): Promise<ReportCatalogAdminView[]> {
    await commerceCatalog.refresh({ force: true });
    return reportItems().map(toView);
  }

  public async get(catalogId: string): Promise<ReportCatalogAdminView> {
    const code = codeItem(catalogId);
    await commerceCatalog.refresh({ force: true });
    return toView(code);
  }

  public async update(catalogId: string, input: UpdateReportCatalogInput, actor: AdminActor): Promise<ReportCatalogAdminView> {
    const code = codeItem(catalogId);
    if (input.slug) {
      const taken = WEBSITE_REPORT_PRODUCTS.some((p) => p.catalogId !== catalogId && p.slug === input.slug);
      if (taken) throw new ConflictError('Another report already uses this slug');
    }
    const data: Prisma.ReportCatalogEntryUncheckedCreateInput = { catalogId: code.id, updatedById: actor.id };
    const assign = <K extends keyof UpdateReportCatalogInput>(key: K, value: unknown) => {
      if (input[key] !== undefined) (data as Record<string, unknown>)[key] = value;
    };
    assign('name', input.name || null);
    assign('slug', input.slug || null);
    assign('shortDescription', input.shortDescription || null);
    assign('description', input.description || null);
    assign('coverImageUrl', input.coverImageUrl || null);
    assign('coverImageKey', input.coverImageKey || null);
    assign('salePricePaise', input.salePricePaise);
    assign('priceIncludesGst', input.priceIncludesGst);
    assign('originalPricePaise', input.originalPricePaise);
    assign('gstRateBp', input.gstRateBp);
    assign('isActive', input.isActive);
    assign('isPremium', input.isPremium);
    assign('benefits', input.benefits);
    assign('features', input.features);
    assign('faqs', input.faqs);
    assign('hsnSac', input.hsnSac || null);

    const { catalogId: _id, ...update } = data;
    try {
      await prisma.reportCatalogEntry.upsert({ where: { catalogId: code.id }, create: data, update });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictError('Another report already uses this slug');
      }
      throw err;
    }
    await commerceCatalog.refresh({ force: true });
    await audit(actor, 'REPORT_CATALOG_UPDATE', `ReportCatalog:${code.id}`, `Updated ${describeChange(input)}`);
    return toView(code);
  }

  public async reset(catalogId: string, actor: AdminActor): Promise<ReportCatalogAdminView> {
    const code = codeItem(catalogId);
    await prisma.reportCatalogEntry.deleteMany({ where: { catalogId: code.id } });
    await commerceCatalog.refresh({ force: true });
    await audit(actor, 'REPORT_CATALOG_RESET', `ReportCatalog:${code.id}`, 'Edits removed; code values apply');
    return toView(code);
  }
}

export const reportCatalogAdminService = new ReportCatalogAdminService();

export async function adminReportCatalogRoutes(fastify: FastifyInstance) {
  protectAdminScope(fastify);

  fastify.get('/report-catalogue', { preHandler: [requirePermission('pdf_reports:read')] }, async (_request, reply) => {
    return sendOk(reply, await reportCatalogAdminService.list(), 'Report catalogue fetched');
  });

  fastify.get('/report-catalogue/:catalogId', { preHandler: [requirePermission('pdf_reports:read')] }, async (request, reply) => {
    const { catalogId } = request.params as { catalogId: string };
    return sendOk(reply, await reportCatalogAdminService.get(String(catalogId).slice(0, 100)), 'Report fetched');
  });

  fastify.put('/report-catalogue/:catalogId', { preHandler: [requirePermission('pdf_reports:update')] }, async (request, reply) => {
    const { catalogId } = request.params as { catalogId: string };
    const body = updateReportCatalogSchema.parse(request.body);
    return sendOk(reply, await reportCatalogAdminService.update(String(catalogId).slice(0, 100), body, await adminActor(request)), 'Report updated');
  });

  fastify.post('/report-catalogue/:catalogId/reset', { preHandler: [requirePermission('pdf_reports:update')] }, async (request, reply) => {
    const { catalogId } = request.params as { catalogId: string };
    return sendOk(reply, await reportCatalogAdminService.reset(String(catalogId).slice(0, 100), await adminActor(request)), 'Report reset');
  });
}
