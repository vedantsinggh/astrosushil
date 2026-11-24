/**
 * @astro/report-engine — the universal report platform is the only report
 * path. Every sellable ReportType is served by a module registered in
 * ./platform/registry.ts; see docs/report-system/PLATFORM.md.
 */
export * as reportPlatform from './platform';
export * as invoicePdf from './invoice';
