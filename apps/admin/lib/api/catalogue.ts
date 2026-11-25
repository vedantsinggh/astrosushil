/**
 * API functions for the catalogue and customer screens: categories, shop products, course links,
 * customers, the read-only report catalogue and the product-order summary used on the dashboard.
 *
 * Backend: docs/integration/modules/shop.md. The shop modules answer with the envelope
 * `{ statusCode, success, message, data }`; `unwrap` returns `data`. Every amount is integer paise.
 */
import { apiFetch } from '../api-client';
import type { UploadedFileRef } from './uploads';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const ADMIN = '/api/v1/admin';

interface Envelope<T> {
  statusCode: number;
  success: boolean;
  message: string;
  data: T;
}

async function unwrap<T>(endpoint: string, init?: RequestInit): Promise<T> {
  const res = await apiFetch<Envelope<T>>(endpoint, init);
  return res.data;
}

/** As `unwrap`, but also returns the server's message (delete answers differ by outcome). */
async function unwrapWithMessage<T>(endpoint: string, init?: RequestInit): Promise<{ data: T; message: string }> {
  const res = await apiFetch<Envelope<T>>(endpoint, init);
  return { data: res.data, message: res.message };
}

function queryString(params: Record<string, string | number | boolean | undefined | null>): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    query.set(key, String(value));
  }
  const text = query.toString();
  return text ? `?${text}` : '';
}

export interface ShopPagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ------------------------------------------------------------------------------- money helpers

/** Rupees typed by staff ("499", "499.50") to integer paise, or null when it is not a valid amount. */
export function rupeesToPaise(text: string): number | null {
  const trimmed = text.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return null;
  return Math.round(Number(trimmed) * 100);
}

export function paiseToRupeesText(paise: number | null | undefined): string {
  if (paise === null || paise === undefined) return '';
  return (paise / 100).toFixed(paise % 100 === 0 ? 0 : 2);
}

export function formatPaise(paise: number | null | undefined, currency = 'INR'): string {
  if (paise === null || paise === undefined) return '—';
  try {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: paise % 100 === 0 ? 0 : 2 }).format(paise / 100);
  } catch {
    return `${currency} ${(paise / 100).toFixed(2)}`;
  }
}

// ---------------------------------------------------------------------------------- categories

export type CategoryProductType = 'physical' | 'digital';

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  parent: { id: string; name: string } | null;
  productType: CategoryProductType;
  image: { url: string; key: string | null } | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryTreeNode extends Omit<Category, 'parent'> {
  parentId: string | null;
  children: CategoryTreeNode[];
}

export interface CategoryInput {
  name?: string;
  description?: string;
  parent?: string | null;
  productType?: CategoryProductType;
  image?: UploadedFileRef | null;
  isActive?: boolean;
}

export function fetchCategoryTree(): Promise<CategoryTreeNode[]> {
  return unwrap<CategoryTreeNode[]>(`${ADMIN}/categories/tree`);
}

export function createCategory(input: CategoryInput): Promise<Category> {
  return unwrap<Category>(`${ADMIN}/categories`, { method: 'POST', body: JSON.stringify(input) });
}

export function updateCategory(id: string, input: CategoryInput): Promise<Category> {
  return unwrap<Category>(`${ADMIN}/categories/${id}`, { method: 'PUT', body: JSON.stringify(input) });
}

export function deleteCategory(id: string): Promise<{ deleted: true; uncategorisedProducts: number }> {
  return unwrap(`${ADMIN}/categories/${id}`, { method: 'DELETE', body: JSON.stringify({}) });
}

/** The tree as a flat list in display order, with the depth of each row. */
export function flattenCategoryTree(nodes: CategoryTreeNode[], depth = 0): Array<{ node: CategoryTreeNode; depth: number }> {
  const out: Array<{ node: CategoryTreeNode; depth: number }> = [];
  for (const node of nodes) {
    out.push({ node, depth });
    out.push(...flattenCategoryTree(node.children, depth + 1));
  }
  return out;
}

// ------------------------------------------------------------------------------------ products

export type ShopProductType = 'physical' | 'digital' | 'service';
export type ShopDiscountType = 'percentage' | 'fixed';

export interface ShopProductVariant {
  /** Stable code the app uses; equals `variantId` for variants created in the admin. */
  id: string;
  /** Row id: this is what an update sends back as the variant's `id`. */
  variantId: string;
  name: string;
  value: string;
  price: number;
  mrp: number;
  priceWithGst: number;
  stock: number;
  metaTitle: string | null;
  metaDescription: string | null;
  downloadableFile: { key: string; name: string | null } | null;
}

export interface ShopProduct {
  id: string;
  slug: string;
  name: string;
  hindiTitle: string | null;
  shortDescription: string | null;
  description: string | null;
  hindiDescription: string | null;
  category: string;
  categoryId: string | null;
  categoryInfo: { id: string; name: string; slug: string } | null;
  type: ShopProductType;
  mrp: number;
  price: number;
  priceWithGst: number;
  discountType: ShopDiscountType;
  /** As stored: basis points for a percentage (1000 = 10%), paise for a fixed amount. */
  discountValue: number;
  /** Whole-percent saving against MRP. */
  discount: number;
  currency: string;
  stock: number;
  sku: string | null;
  isAvailable: boolean;
  isPublished: boolean;
  isFeatured: boolean;
  isTrending: boolean;
  isBestSeller: boolean;
  managedByAdmin: boolean;
  imageUrl: string | null;
  thumbnail: string | null;
  thumbnailKey: string | null;
  images: string[];
  hasVariants: boolean;
  variants: ShopProductVariant[];
  gst: { enabled: boolean; rate: number; type: 'inclusive' | 'exclusive' };
  rating: number | null;
  reviewsCount: number | null;
  metaTitle: string | null;
  metaDescription: string | null;
  keywords: string[];
  weightGrams: number | null;
  dimensions: { length?: number; width?: number; height?: number } | null;
  downloadableFile: { key: string } | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface PrivateFileInput {
  key: string;
  name?: string;
}

export interface ShopProductVariantInput {
  id?: string;
  name: string;
  value: string;
  mrpPaise: number;
  stock?: number;
  /** Left out: keep the stored file. null: remove it. */
  downloadableFile?: PrivateFileInput | null;
  metaTitle?: string;
  metaDescription?: string;
}

export interface ShopProductInput {
  name?: string;
  hindiTitle?: string | null;
  shortDescription?: string | null;
  description?: string | null;
  hindiDescription?: string | null;
  type?: ShopProductType;
  categoryId?: string | null;
  images?: UploadedFileRef[];
  thumbnail?: UploadedFileRef | null;
  hasVariants?: boolean;
  mrpPaise?: number;
  discountType?: ShopDiscountType;
  /** Percent (0 to 100) for "percentage"; paise for "fixed". */
  discountValue?: number;
  stock?: number;
  sku?: string | null;
  variants?: ShopProductVariantInput[];
  downloadableFile?: PrivateFileInput | null;
  gst?: { enabled?: boolean; rate?: number; type?: 'inclusive' | 'exclusive' };
  weightGrams?: number | null;
  dimensions?: { length?: number; width?: number; height?: number } | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  keywords?: string[];
  isFeatured?: boolean;
  isTrending?: boolean;
  isBestSeller?: boolean;
  isPublished?: boolean;
  isAvailable?: boolean;
}

export interface ShopProductListQuery {
  page?: number;
  limit?: number;
  search?: string;
  type?: ShopProductType | '';
  category?: string;
  isPublished?: 'true' | 'false' | '';
  isFeatured?: 'true' | 'false' | '';
}

export function fetchShopProducts(query: ShopProductListQuery): Promise<{ products: ShopProduct[]; pagination: ShopPagination }> {
  return unwrap(`${ADMIN}/shop-products${queryString({ ...query })}`);
}

export function fetchShopProduct(id: string): Promise<ShopProduct> {
  return unwrap<ShopProduct>(`${ADMIN}/shop-products/${id}`);
}

export function createShopProduct(input: ShopProductInput): Promise<ShopProduct> {
  return unwrap<ShopProduct>(`${ADMIN}/shop-products`, { method: 'POST', body: JSON.stringify(input) });
}

export function updateShopProduct(id: string, input: ShopProductInput): Promise<ShopProduct> {
  return unwrap<ShopProduct>(`${ADMIN}/shop-products/${id}`, { method: 'PUT', body: JSON.stringify(input) });
}

/** The backend decides: a product that was bought (or is part of the seeded catalogue) is archived, not deleted. */
export function deleteShopProduct(id: string): Promise<{ data: { deleted: boolean; archived: boolean }; message: string }> {
  return unwrapWithMessage(`${ADMIN}/shop-products/${id}`, { method: 'DELETE', body: JSON.stringify({}) });
}

/** The product discount as staff type it: percent for "percentage", rupees for "fixed". */
export function discountInputText(product: Pick<ShopProduct, 'discountType' | 'discountValue'>): string {
  if (!product.discountValue) return '';
  return product.discountType === 'fixed' ? paiseToRupeesText(product.discountValue) : String(product.discountValue / 100);
}

export function discountLabel(product: Pick<ShopProduct, 'discountType' | 'discountValue'>): string {
  if (!product.discountValue) return 'None';
  return product.discountType === 'fixed' ? `${formatPaise(product.discountValue)} off` : `${product.discountValue / 100}% off`;
}

// -------------------------------------------------------------------------------- course links

export type CourseLinkStatus = 'ACTIVE' | 'INACTIVE';
export type CourseLevel = string;

export interface CourseLink {
  id: string;
  title: string;
  slug: string;
  shortDescription: string | null;
  category: string | null;
  tags: string[];
  instructorName: string | null;
  language: string | null;
  level: CourseLevel | null;
  pricePaise: number;
  originalPricePaise: number | null;
  discountPercentage: number | null;
  currency: string;
  isFree: boolean;
  rating: number;
  totalReviews: number;
  totalLessons: number | null;
  totalDurationMinutes: number | null;
  thumbnail: string | null;
  thumbnailKey: string | null;
  previewVideo: string | null;
  platformName: string | null;
  redirectUrl: string;
  isFeatured: boolean;
  status: CourseLinkStatus;
  metaTitle: string | null;
  metaDescription: string | null;
  courseId: string | null;
  clickCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CourseLinkInput {
  title?: string;
  shortDescription?: string | null;
  category?: string | null;
  tags?: string[];
  instructorName?: string | null;
  language?: string | null;
  level?: CourseLevel | null;
  pricePaise?: number;
  originalPricePaise?: number | null;
  isFree?: boolean;
  rating?: number;
  totalReviews?: number;
  totalLessons?: number | null;
  totalDurationMinutes?: number | null;
  thumbnail?: UploadedFileRef | null;
  previewVideo?: string | null;
  platformName?: string | null;
  redirectUrl?: string;
  isFeatured?: boolean;
  status?: CourseLinkStatus;
  metaTitle?: string | null;
  metaDescription?: string | null;
}

export interface CourseLinkListQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: CourseLinkStatus | '';
  featured?: 'true' | 'false' | '';
}

export function fetchCourseLinks(query: CourseLinkListQuery): Promise<{ courses: CourseLink[]; pagination: ShopPagination }> {
  return unwrap(`${ADMIN}/course-links${queryString({ ...query })}`);
}

export function fetchCourseLink(id: string): Promise<CourseLink> {
  return unwrap<CourseLink>(`${ADMIN}/course-links/${id}`);
}

export function createCourseLink(input: CourseLinkInput): Promise<CourseLink> {
  return unwrap<CourseLink>(`${ADMIN}/course-links`, { method: 'POST', body: JSON.stringify(input) });
}

export function updateCourseLink(id: string, input: CourseLinkInput): Promise<CourseLink> {
  return unwrap<CourseLink>(`${ADMIN}/course-links/${id}`, { method: 'PUT', body: JSON.stringify(input) });
}

export function deleteCourseLink(id: string): Promise<{ deleted: true }> {
  return unwrap(`${ADMIN}/course-links/${id}`, { method: 'DELETE', body: JSON.stringify({}) });
}

// ----------------------------------------------------------------------------------- customers

export type CustomerStatus = 'ACTIVE' | 'BLOCKED';

export interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string | null;
  username: string | null;
  email: string | null;
  phoneNumber: string | null;
  dob: string | null;
  gender: string | null;
  birthPlace: string | null;
  birthTime: string | null;
  bio: string | null;
  profilePhoto: string | null;
  isVerified: boolean;
  status: CustomerStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerListQuery {
  page?: number;
  limit?: number;
  search?: string;
  fromDate?: string;
  toDate?: string;
  status?: CustomerStatus | '';
}

export interface CustomerInput {
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneNumber?: string;
  username?: string;
  dob?: string;
  gender?: string;
  birthPlace?: string;
  birthTime?: string;
  bio?: string;
  status?: CustomerStatus;
  reason?: string;
}

export function fetchCustomers(query: CustomerListQuery): Promise<{ users: Customer[]; total: number; page: number; limit: number }> {
  return unwrap(`${ADMIN}/customers${queryString({ ...query })}`);
}

export function updateCustomer(id: string, input: CustomerInput): Promise<Customer> {
  return unwrap<Customer>(`${ADMIN}/customers/${id}`, { method: 'PATCH', body: JSON.stringify(input) });
}

export interface CustomerDeleteResult {
  deleted: true;
  /** "hard": the account is gone. "anonymised": personal data removed, the row kept for its paid orders. */
  mode: 'hard' | 'anonymised';
  paidOrders: number;
}

export function deleteCustomer(id: string): Promise<CustomerDeleteResult> {
  return unwrap<CustomerDeleteResult>(`${ADMIN}/customers/${id}`, { method: 'DELETE', body: JSON.stringify({}) });
}

/** Downloads the filtered customers as a CSV file built by the server (the export is audited there). */
export async function downloadCustomersCsv(query: Omit<CustomerListQuery, 'page' | 'limit'>): Promise<void> {
  const response = await fetch(`${API_BASE}${ADMIN}/customers/export${queryString({ ...query })}`, {
    credentials: 'include',
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const err = new Error(`HTTP ${response.status} Error`) as Error & { status: number; data: unknown };
    err.status = response.status;
    err.data = data;
    throw err;
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `customers-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------- report catalogue

/** One offering of `GET /payments/catalog` (the catalogue is code: apps/api commerce.catalog.ts). */
export interface CatalogItem {
  id: string;
  itemType: 'REPORT' | 'CONSULTATION' | 'COURSE' | 'PRODUCT';
  title: string;
  description: string;
  pricePaise: number;
  originalPricePaise?: number;
  currency: string;
  taxRateBasisPoints: number;
  taxIncluded: boolean;
  fulfillmentType: string;
  isActive: boolean;
  legacyReportType?: string;
  responseDays?: number;
  languages?: string[];
}

/** Report offerings, inactive ones included. Read-only: nothing here can be edited from the admin. */
export async function fetchReportCatalogue(): Promise<CatalogItem[]> {
  const res = await apiFetch<{ items: CatalogItem[] }>('/api/v1/payments/catalog?itemType=REPORT&includeInactive=true');
  return (res.items || []).filter((item) => item.itemType === 'REPORT');
}

// -------------------------------------------------------------- product orders summary (dashboard)

export interface ShopOrderSummaryRow {
  id: string;
  orderStatus: string | null;
  totalAmount: number;
  createdAt: string;
  payment: { status: string; currency: string; amountMinor: number };
  user?: { id: string; fullName: string | null; email: string | null; phoneNumber: string | null } | null;
  items: Array<{ id: string; name: string; quantity: number }>;
}

/** `GET /admin/shop-orders/reports` (permission `orders:export`): product orders only, INR paise. */
export interface ShopOrdersSummary {
  totalOrders: number;
  totalSales: number;
  avgOrderValue: number;
  currency: string;
  paidByCurrency: Array<{ currency: string; paidMinor: number; orders: number }>;
  statusWiseOrders: Array<{ status: string; count: number }>;
  paymentStatusBreakdown: Array<{ status: string; count: number }>;
  dailyRevenue: Array<{ date: string; revenue: number; orders: number }>;
  monthlyRevenue: Array<{ month: string; revenue: number; orders: number }>;
  recentOrders: ShopOrderSummaryRow[];
}

export function fetchShopOrdersSummary(): Promise<ShopOrdersSummary> {
  return unwrap<ShopOrdersSummary>(`${ADMIN}/shop-orders/reports`);
}
