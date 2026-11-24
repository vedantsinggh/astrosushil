/**
 * API functions for the sales screens: shop orders, transactions ledger, GST report, invoices and
 * coupons. Backend contract: docs/integration/modules/money.md and shop.md.
 *
 * Every amount is an integer: INR paise, or minor units of the paid currency where the field name
 * says `Minor`. Nothing here calculates money; the screens only format what the server returns.
 */
import { apiFetch } from '../api-client';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const V1 = '/api/v1';

// ---------------------------------------------------------------------------
// Transport helpers (shared with lib/api/bookings.ts)
// ---------------------------------------------------------------------------

export class ApiError extends Error {
  public status?: number;
  public code?: string;

  constructor(message: string, status?: number, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

interface ErrorBody {
  error?: { code?: string; message?: string } | string;
  message?: string;
}

function messageFromBody(body: ErrorBody | undefined, status?: number): { message: string; code?: string } {
  const error = body?.error;
  if (error && typeof error === 'object') {
    return { message: error.message || `Request failed (HTTP ${status ?? '?'})`, code: error.code };
  }
  if (typeof error === 'string') return { message: error };
  if (typeof body?.message === 'string') return { message: body.message };
  return { message: `Request failed (HTTP ${status ?? '?'})` };
}

/** The backend's error format is `{ error: { code, message, requestId } }`; this reads it into one Error. */
export function toApiError(err: unknown): ApiError {
  if (err instanceof ApiError) return err;
  const raw = err as { status?: number; data?: ErrorBody; message?: string } | null;
  if (raw && raw.data && (raw.data.error || raw.data.message)) {
    const { message, code } = messageFromBody(raw.data, raw.status);
    return new ApiError(message, raw.status, code);
  }
  return new ApiError(raw?.message && raw.message !== '[object Object]' ? raw.message : 'Could not reach the server', raw?.status);
}

export function errorMessage(err: unknown): string {
  return toApiError(err).message;
}

/** A request whose JSON body is returned as it is. */
export async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  try {
    return await apiFetch<T>(`${V1}${path}`, init);
  } catch (err) {
    throw toApiError(err);
  }
}

interface Envelope<T> {
  statusCode: number;
  success: boolean;
  message: string;
  data: T;
}

/** A request answered with the `{ statusCode, success, message, data }` envelope; returns `data`. */
export async function callData<T>(path: string, init: RequestInit = {}): Promise<T> {
  const body = await call<Envelope<T>>(path, init);
  return body.data;
}

export function jsonBody(method: 'POST' | 'PUT' | 'PATCH' | 'DELETE', body?: unknown): RequestInit {
  // The shared client always sends `Content-Type: application/json`, and the server refuses that
  // header with an empty body, so a request without a payload still sends `{}`.
  return { method, body: JSON.stringify(body === undefined ? {} : body) };
}

export type QueryValue = string | number | boolean | null | undefined;

/** Builds `?a=1&b=2`, leaving out empty values. */
export function qs(params: Record<string, QueryValue>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : '';
}

/** Saves text as a file in the browser. */
export function saveTextFile(fileName: string, text: string, mime: string = 'text/csv;charset=utf-8'): void {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/** Downloads a CSV produced by a backend export endpoint (the request carries the staff token). */
export async function downloadCsv(path: string, fallbackName: string): Promise<void> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('admin_access_token') : null;
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${V1}${path}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  } catch {
    throw new ApiError('Could not reach the server');
  }
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as ErrorBody;
    const { message, code } = messageFromBody(body, response.status);
    throw new ApiError(message, response.status, code);
  }
  const text = await response.text();
  const disposition = response.headers.get('Content-Disposition') || '';
  const match = /filename="?([^";]+)"?/i.exec(disposition);
  saveTextFile(match?.[1] || fallbackName, text);
}

/** IST day bounds as timestamps, for endpoints that take a plain `Date` range. */
export function istDayStart(day: string): string {
  return day ? `${day}T00:00:00.000+05:30` : '';
}
export function istDayEnd(day: string): string {
  return day ? `${day}T23:59:59.999+05:30` : '';
}

// ---------------------------------------------------------------------------
// Shop orders
// ---------------------------------------------------------------------------

export const SHOP_ORDER_STATUSES = [
  'payment_pending',
  'placed',
  'confirmed',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
  'payment_failed',
] as const;
export type ShopOrderStatus = (typeof SHOP_ORDER_STATUSES)[number];

/** Statuses staff may set (backend `ADMIN_SETTABLE_STATUSES`). */
export const SHOP_ORDER_SETTABLE_STATUSES: ShopOrderStatus[] = ['placed', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];

export interface ShopOrderItem {
  id: string;
  product: string | null;
  slug: string | null;
  variantId: string | null;
  variantName: string | null;
  name: string;
  price: number;
  mrp: number;
  quantity: number;
  image: string | null;
  /** Percent. */
  taxRate: number;
  taxType: 'inclusive' | 'exclusive';
  taxAmount: number;
  discount: number;
  total: number;
}

export interface ShopOrderAddress {
  fullName?: string;
  phone?: string;
  addressLine1?: string;
  addressLine2?: string | null;
  landmark?: string | null;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  type?: string;
  [key: string]: unknown;
}

export interface ShopOrder {
  id: string;
  orderStatus: ShopOrderStatus | null;
  orderType: string | null;
  items: ShopOrderItem[];
  addressId: string | null;
  shippingAddress: ShopOrderAddress | null;
  subTotal: number;
  discount: number;
  shipping: number;
  tax: number;
  taxTotal: number;
  totalAmount: number;
  coupon: { code: string; discountAmount: number } | null;
  baseCurrency: string;
  exchangeRate: string;
  payment: {
    method: string;
    currency: string;
    amountMinor: number;
    status: 'pending' | 'paid' | 'failed';
    transactionId: string | null;
    razorpayOrderId: string | null;
  };
  trackingNumber: string | null;
  courierPartner: string | null;
  dispatchedAt: string | null;
  deliveredAt: string | null;
  cancelledAt: string | null;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
  user?: { id: string; fullName: string | null; email: string | null; phoneNumber: string | null } | null;
}

export interface ShopOrderDetail extends ShopOrder {
  stockShortfall: Array<{ orderItemId: string; productId: string; variantId: string | null; missing: number }> | null;
  notes: string | null;
}

export interface ShopOrderListResult {
  orders: ShopOrder[];
  pagination: { totalOrders: number; currentPage: number; totalPages: number; limit: number };
}

export interface ShopOrderFilters {
  search?: string;
  status?: string;
  productId?: string;
  /** IST days, YYYY-MM-DD. */
  fromDate?: string;
  toDate?: string;
}

function shopOrderQuery(filters: ShopOrderFilters, page: number, limit: number): string {
  return qs({
    page,
    limit,
    search: filters.search?.trim(),
    status: filters.status,
    productId: filters.productId,
    fromDate: istDayStart(filters.fromDate || ''),
    toDate: istDayEnd(filters.toDate || ''),
  });
}

export function listShopOrders(filters: ShopOrderFilters, page: number, limit: number): Promise<ShopOrderListResult> {
  return callData<ShopOrderListResult>(`/admin/shop-orders${shopOrderQuery(filters, page, limit)}`);
}

/** Every order matching the filters (the list endpoint, read page by page), up to `cap` rows. */
export async function listAllShopOrders(filters: ShopOrderFilters, cap: number = 5000): Promise<{ orders: ShopOrder[]; truncated: boolean }> {
  const pageSize = 200;
  const orders: ShopOrder[] = [];
  let page = 1;
  let totalPages = 1;
  do {
    const result = await listShopOrders(filters, page, pageSize);
    orders.push(...result.orders);
    totalPages = result.pagination.totalPages;
    page += 1;
  } while (page <= totalPages && orders.length < cap);
  return { orders: orders.slice(0, cap), truncated: page <= totalPages };
}

export function getShopOrder(orderId: string): Promise<ShopOrderDetail> {
  return callData<ShopOrderDetail>(`/admin/shop-orders/${encodeURIComponent(orderId)}`);
}

export function updateShopOrderStatus(
  orderId: string,
  body: { orderStatus: ShopOrderStatus; trackingNumber?: string; courierPartner?: string }
): Promise<ShopOrder> {
  return callData<ShopOrder>(`/admin/shop-orders/${encodeURIComponent(orderId)}/status`, jsonBody('PATCH', body));
}

export interface ShopOrderReports {
  totalOrders: number;
  totalSales: number;
  avgOrderValue: number;
  currency: string;
  paidByCurrency: Array<{ currency: string; paidMinor: number; orders: number }>;
  statusWiseOrders: Array<{ status: ShopOrderStatus; count: number }>;
  paymentMethodBreakdown: Array<{ method: string; count: number }>;
  paymentStatusBreakdown: Array<{ status: string; count: number }>;
  orderTypeBreakdown: Array<{ orderType: string; count: number }>;
  dailyRevenue: Array<{ date: string; revenue: number; orders: number }>;
  monthlyRevenue: Array<{ month: string; revenue: number; orders: number }>;
  recentOrders: ShopOrder[];
}

export function getShopOrderReports(): Promise<ShopOrderReports> {
  return callData<ShopOrderReports>('/admin/shop-orders/reports');
}

/** Products for the order list's product filter (needs `products:read`). */
export interface ProductOption {
  id: string;
  name: string;
}

export async function listProductOptions(): Promise<ProductOption[]> {
  const data = await callData<{ products: Array<{ id: string; name?: string | null; title?: string | null }> }>(
    `/admin/shop-products${qs({ page: 1, limit: 200 })}`
  );
  return data.products.map((p) => ({ id: p.id, name: p.name || p.title || p.id }));
}

// ---------------------------------------------------------------------------
// Customers (lookups for coupons and manual bookings; needs `customers:read`)
// ---------------------------------------------------------------------------

export interface CustomerOption {
  id: string;
  fullName: string | null;
  email: string | null;
  phoneNumber: string | null;
  status?: 'ACTIVE' | 'BLOCKED';
}

export async function searchCustomers(search: string, limit: number = 10): Promise<CustomerOption[]> {
  const data = await callData<{ users: CustomerOption[] }>(`/admin/customers${qs({ search: search.trim(), limit, page: 1 })}`);
  return data.users;
}

// ---------------------------------------------------------------------------
// Transactions ledger
// ---------------------------------------------------------------------------

export type LedgerStatus = 'pending' | 'success' | 'failed';
export type LedgerMethod = 'razorpay' | 'manual' | 'cod';
export type LedgerType = 'order' | 'consultation' | 'report';

export interface LedgerTransaction {
  id: string;
  transactionType: LedgerType;
  user: { id: string; fullName: string | null; email: string | null; phoneNumber: string | null } | null;
  customerName: string | null;
  orderId: string | null;
  order: { id: string; status: string; paymentStatus: string; fulfillmentStatus: string } | null;
  invoiceNo: string;
  amountMinor: number;
  /** Decimal text in the paid currency. */
  amount: string;
  currency: string;
  baseCurrency: string;
  baseAmountPaise: number;
  subtotalPaise: number;
  shippingPaise: number;
  taxPaise: number;
  taxRateBp: number;
  taxInclusive: boolean;
  discountPaise: number;
  exchangeRate: string;
  method: LedgerMethod;
  status: LedgerStatus;
  transactionId: string | null;
  razorpayOrderId: string | null;
  rawResponse: unknown;
  createdAt: string;
  updatedAt: string;
}

export interface TransactionFilters {
  status?: LedgerStatus | '';
  method?: LedgerMethod | '';
  fromDate?: string;
  toDate?: string;
  search?: string;
}

export interface TransactionListResult {
  transactions: LedgerTransaction[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

function transactionQuery(filters: TransactionFilters): Record<string, QueryValue> {
  return {
    status: filters.status,
    method: filters.method,
    fromDate: filters.fromDate,
    toDate: filters.toDate,
    search: filters.search?.trim(),
  };
}

export function listTransactions(filters: TransactionFilters, page: number, limit: number): Promise<TransactionListResult> {
  return call<TransactionListResult>(`/admin/transactions${qs({ ...transactionQuery(filters), page, limit })}`);
}

/** The server's count of ledger rows matching the filters with one status (not a count of the visible page). */
export async function countTransactions(filters: TransactionFilters, status: LedgerStatus | ''): Promise<number> {
  const result = await listTransactions({ ...filters, status }, 1, 1);
  return result.total;
}

export function exportTransactionsCsv(filters: TransactionFilters): Promise<void> {
  return downloadCsv(`/admin/transactions/export${qs(transactionQuery(filters))}`, 'transactions.csv');
}

export function listUnappliedPayments(): Promise<{ payments: LedgerTransaction[]; total: number }> {
  return call<{ payments: LedgerTransaction[]; total: number }>('/admin/transactions/unapplied-payments');
}

// ---------------------------------------------------------------------------
// GST report
// ---------------------------------------------------------------------------

export interface GstReportRow {
  transactionId: string;
  date: string;
  invoiceNo: string;
  type: LedgerType;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  placeOfSupply: string;
  taxableAmount: number;
  gstRateLabel: string;
  gstType: string;
  gstAmount: number;
  totalAmount: number;
  currency: string;
  paymentMethod: string;
  paymentStatus: string;
  razorpayTransactionId: string;
}

export interface GstReportSummary {
  taxableTotal: number;
  gstTotal: number;
  grandTotal: number;
  count: number;
}

export interface GstReportFilters {
  fromDate?: string;
  toDate?: string;
  /** '' means every status. The backend's default (parameter absent) is `success`. */
  status: LedgerStatus | '';
  transactionType?: LedgerType | '';
}

function gstQuery(filters: GstReportFilters): string {
  // `status` is always sent: an absent parameter means "success" on the server, an empty one means all.
  const base = qs({ fromDate: filters.fromDate, toDate: filters.toDate, transactionType: filters.transactionType });
  return `${base}${base ? '&' : '?'}status=${encodeURIComponent(filters.status)}`;
}

export function getGstReport(filters: GstReportFilters): Promise<{ rows: GstReportRow[]; summary: GstReportSummary }> {
  return call<{ rows: GstReportRow[]; summary: GstReportSummary }>(`/admin/gst-report${gstQuery(filters)}`);
}

export function exportGstReportCsv(filters: GstReportFilters): Promise<void> {
  return downloadCsv(`/admin/gst-report/export${gstQuery(filters)}`, 'gst-report.csv');
}

// ---------------------------------------------------------------------------
// Invoices
// ---------------------------------------------------------------------------

export interface InvoiceDocumentData {
  invoiceNumber: string;
  numberAllocated: boolean;
  allocationStatus: 'PENDING' | 'ALLOCATED' | 'NOT_REQUIRED' | null;
  saleType: LedgerType;
  orderId: string;
  orderReference: string;
  orderDate: string;
  orderStatus: string;
  seller: {
    legalName: string;
    tagline: string | null;
    address: string;
    gstin: string;
    state: string;
    email: string | null;
    phone: string | null;
    website: string | null;
  };
  placeOfSupply: string;
  reverseCharge: boolean;
  customer: { name: string; email: string | null; phone: string | null };
  shippingAddress: {
    fullName: string;
    phone: string;
    addressLine1: string;
    addressLine2: string | null;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  } | null;
  payment: {
    status: 'pending' | 'paid' | 'failed';
    method: string;
    gatewayPaymentId: string | null;
    paidAt: string | null;
    currency: string;
    amountMinor: number;
    exchangeRate: string;
  };
  lines: Array<{
    title: string;
    description: string | null;
    itemType: string;
    quantity: number;
    unitPricePaise: number;
    lineTotalPaise: number;
    taxRateBp: number;
    taxInclusive: boolean;
    taxPaise: number;
  }>;
  totals: {
    subTotalPaise: number;
    discountPaise: number;
    shippingPaise: number;
    taxByRate: Array<{ rateBp: number; taxPaise: number; inclusive: boolean }>;
    taxPaise: number;
    grandTotalPaise: number;
  };
}

export async function getOrderInvoice(orderId: string): Promise<InvoiceDocumentData> {
  const body = await call<{ invoice: InvoiceDocumentData }>(`/admin/invoices/orders/${encodeURIComponent(orderId)}`);
  return body.invoice;
}

export interface InvoiceNumberAnalysis {
  total: number;
  wellFormed: number;
  highest: string;
  nextNumber: string;
  duplicates: Array<{ value: string; numbers: string[]; count: number }>;
  malformed: string[];
}

export interface InvoiceCounterState {
  initialised: boolean;
  paused: boolean;
  lastValue: string | null;
  nextNumber: string | null;
  pendingInvoices: number;
  analysis: InvoiceNumberAnalysis;
}

export function getInvoiceCounter(): Promise<InvoiceCounterState> {
  return call<InvoiceCounterState>('/admin/invoices/counter');
}

export function initializeInvoiceCounter(body: {
  confirmLastValue: string;
  allowEmpty?: boolean;
}): Promise<{ lastValue: string; nextNumber: string; analysis: InvoiceNumberAnalysis }> {
  return call('/admin/invoices/counter/initialize', jsonBody('POST', body));
}

export interface AllocatePendingResult {
  allocated: Array<{ orderId: string; number: string }>;
  stillPending: string[];
  failures: Array<{ orderId: string; message: string }>;
}

export function allocatePendingInvoices(): Promise<AllocatePendingResult> {
  return call<AllocatePendingResult>('/admin/invoices/allocate-pending', jsonBody('POST', {}));
}

// ---------------------------------------------------------------------------
// Coupons
// ---------------------------------------------------------------------------

export type CouponDiscountType = 'PERCENTAGE' | 'FLAT';
export type CouponAudience = 'GLOBAL' | 'INDIVIDUAL';

export interface Coupon {
  id: string;
  code: string;
  description: string | null;
  type: CouponDiscountType;
  /** Percent for PERCENTAGE, paise for FLAT. */
  discount: number;
  maxDiscountPaise: number | null;
  minOrderPaise: number;
  usageLimit: number | null;
  usedCount: number;
  validFrom: string;
  validTill: string;
  couponType: CouponAudience;
  assignedUsers: Array<{ id: string; fullName: string | null; email: string | null }>;
  oneTimePerUser: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CouponInput {
  code: string;
  description?: string | null;
  type: CouponDiscountType;
  discount: number;
  maxDiscountPaise?: number | null;
  minOrderPaise?: number;
  usageLimit?: number | null;
  validFrom?: string;
  validTill: string;
  couponType: CouponAudience;
  assignedUsers?: string[];
  oneTimePerUser?: boolean;
  isActive?: boolean;
}

export interface CouponListResult {
  coupons: Coupon[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export function listCoupons(search: string, page: number, limit: number): Promise<CouponListResult> {
  return callData<CouponListResult>(`/admin/coupons${qs({ search: search.trim(), page, limit })}`);
}

export function createCoupon(body: CouponInput): Promise<Coupon> {
  return callData<Coupon>('/admin/coupons', jsonBody('POST', body));
}

export function updateCoupon(id: string, body: Partial<CouponInput>): Promise<Coupon> {
  return callData<Coupon>(`/admin/coupons/${encodeURIComponent(id)}`, jsonBody('PUT', body));
}

export function toggleCoupon(id: string): Promise<{ isActive: boolean }> {
  return callData<{ isActive: boolean }>(`/admin/coupons/${encodeURIComponent(id)}/toggle`, jsonBody('PATCH', {}));
}

/** A coupon that has been used is switched off instead of removed; the result says which happened. */
export function deleteCoupon(id: string): Promise<{ deleted: boolean; deactivated: boolean }> {
  return callData<{ deleted: boolean; deactivated: boolean }>(`/admin/coupons/${encodeURIComponent(id)}`, jsonBody('DELETE'));
}
