import { z } from 'zod';

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD');
/** An empty query value means "no filter", as on the website. */
const blankToUndefined = (value: unknown) => (value === '' || value === null ? undefined : value);
const lower = (value: unknown) => (typeof value === 'string' ? value.trim().toLowerCase() : value);

const statusFilter = z.preprocess((v) => blankToUndefined(lower(v)), z.enum(['pending', 'success', 'failed']).optional());
const methodFilter = z.preprocess((v) => blankToUndefined(lower(v)), z.enum(['razorpay', 'manual', 'cod']).optional());
const typeFilter = z.preprocess((v) => blankToUndefined(lower(v)), z.enum(['order', 'consultation', 'report']).optional());
const dayFilter = z.preprocess(blankToUndefined, day.optional());

/** Website `GET /transactions`: status, method, fromDate, toDate, search, page (1), limit (10, at most 100). */
export const transactionsQuerySchema = z.object({
  status: statusFilter,
  method: methodFilter,
  fromDate: dayFilter,
  toDate: dayFilter,
  search: z.preprocess(blankToUndefined, z.string().trim().min(1).max(100).optional()),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

/**
 * Website `GET /transactions/gst-report`: fromDate, toDate, status, transactionType.
 * `status` defaults to "success" when the parameter is absent; an empty value means all statuses.
 */
export const gstReportQuerySchema = z.object({
  fromDate: dayFilter,
  toDate: dayFilter,
  status: z.preprocess(
    (v) => (v === undefined ? 'success' : blankToUndefined(lower(v))),
    z.enum(['pending', 'success', 'failed']).optional()
  ),
  transactionType: typeFilter,
});

export type TransactionsQuery = z.infer<typeof transactionsQuerySchema>;
export type GstReportQuery = z.infer<typeof gstReportQuerySchema>;
