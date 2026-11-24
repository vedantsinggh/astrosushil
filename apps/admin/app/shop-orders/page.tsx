'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../lib/auth-context';
import {
  errorMessage,
  listAllShopOrders,
  listProductOptions,
  listShopOrders,
  ProductOption,
  saveTextFile,
  ShopOrder,
  ShopOrderFilters,
} from '../../lib/api/sales';
import { buildCsv, formatDateTime, formatMinor, formatPaise, shortId, titleCase } from '../../components/sales/format';
import { StatusPill } from '../../components/sales/badges';
import {
  EmptyRow,
  ErrorBanner,
  Field,
  filterGrid,
  InfoBox,
  PageHeader,
  Pagination,
  RequirePermission,
  SkeletonRows,
  smallButton,
  SuccessBanner,
  tinyButton,
  useDebounced,
} from '../../components/sales/ui';

const PAGE_SIZE = 10;
const STATUS_OPTIONS = ['placed', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'payment_pending', 'payment_failed'];
const EXPORT_CAP = 10000;

function customerName(order: ShopOrder): string {
  return order.shippingAddress?.fullName || order.user?.fullName || '—';
}

function ShopOrdersScreen() {
  const { hasPermission } = useAuth();
  const canExport = hasPermission('orders:export');
  const canListProducts = hasPermission('products:read');

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [productId, setProductId] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounced(search, 400);

  const [orders, setOrders] = useState<ShopOrder[]>([]);
  const [pagination, setPagination] = useState({ totalOrders: 0, totalPages: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const [products, setProducts] = useState<ProductOption[]>([]);
  const [productsError, setProductsError] = useState<string | null>(null);

  const filters: ShopOrderFilters = { search: debouncedSearch, status, productId, fromDate, toDate };
  const filterKey = JSON.stringify(filters);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await listShopOrders(JSON.parse(filterKey) as ShopOrderFilters, page, PAGE_SIZE);
      setOrders(result.orders);
      setPagination({ totalOrders: result.pagination.totalOrders, totalPages: result.pagination.totalPages });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [filterKey, page]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [filterKey]);

  useEffect(() => {
    if (!canListProducts) return;
    listProductOptions()
      .then(setProducts)
      .catch((err) => setProductsError(errorMessage(err)));
  }, [canListProducts]);

  const clearFilters = () => {
    setSearch('');
    setStatus('');
    setProductId('');
    setFromDate('');
    setToDate('');
  };

  const exportCsv = async () => {
    setIsExporting(true);
    setError(null);
    setNotice(null);
    try {
      const { orders: all, truncated } = await listAllShopOrders(filters, EXPORT_CAP);
      const rows: Array<Array<string | number>> = [];
      for (const order of all) {
        // One row per item, as on the website; with a product filter only that product's items.
        const items = productId ? order.items.filter((item) => item.product === productId) : order.items;
        for (const item of items) {
          rows.push([
            order.id,
            customerName(order),
            order.user?.email ?? '',
            order.shippingAddress?.phone || order.user?.phoneNumber || '',
            item.variantName ? `${item.name} (${item.variantName})` : item.name,
            item.quantity,
            (item.price / 100).toFixed(2),
            order.orderType ?? '',
            order.orderStatus ?? '',
            order.payment.status,
            order.baseCurrency,
            (order.totalAmount / 100).toFixed(2),
            formatDateTime(order.createdAt),
          ]);
        }
      }
      const productName = products.find((p) => p.id === productId)?.name;
      const suffix = productName ? `_${productName.replace(/[^a-zA-Z0-9]+/g, '-')}` : '';
      saveTextFile(
        `orders_by_product${suffix}.csv`,
        buildCsv(
          ['Order ID', 'Customer Name', 'Email', 'Phone', 'Product', 'Quantity', 'Item Price', 'Order Type', 'Order Status', 'Payment Status', 'Currency', 'Order Total', 'Date'],
          rows
        )
      );
      setNotice(
        truncated
          ? `Exported the first ${all.length} orders (${rows.length} item rows). More orders match: narrow the filters to export the rest.`
          : `Exported ${all.length} orders (${rows.length} item rows).`
      );
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div>
      <PageHeader
        crumbs={[{ label: 'Shop Orders' }]}
        title="Shop Orders"
        subtitle="Product orders placed on the website and the app"
        actions={
          <>
            {canExport && (
              <Link href="/shop-orders/reports" className="btn btn-secondary" style={smallButton}>
                Order reports
              </Link>
            )}
            {canExport && (
              <button type="button" className="btn btn-secondary" style={smallButton} onClick={exportCsv} disabled={isExporting || isLoading}>
                {isExporting ? 'Exporting…' : 'Export CSV'}
              </button>
            )}
            <button type="button" className="btn btn-secondary" style={smallButton} onClick={load}>
              Refresh
            </button>
          </>
        }
      />

      <ErrorBanner message={error} />
      <SuccessBanner message={notice} onClose={() => setNotice(null)} />

      <div className="card" style={{ marginBottom: '1.5rem', padding: '1.25rem' }}>
        <div style={filterGrid}>
          <Field label="Search" span={2}>
            <input
              type="text"
              className="input-control"
              placeholder="Customer name, phone, e-mail, product or full order ID"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </Field>
          <Field label="Status">
            <select className="input-control" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All statuses</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {titleCase(s)}
                </option>
              ))}
            </select>
          </Field>
          <Field
            label="Product"
            hint={!canListProducts ? 'Needs the products:read permission' : productsError ? `Products could not be loaded: ${productsError}` : undefined}
          >
            <select className="input-control" value={productId} onChange={(e) => setProductId(e.target.value)} disabled={!canListProducts}>
              <option value="">All products</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Ordered from">
            <input type="date" className="input-control" value={fromDate} max={toDate || undefined} onChange={(e) => setFromDate(e.target.value)} />
          </Field>
          <Field label="Ordered to">
            <input type="date" className="input-control" value={toDate} min={fromDate || undefined} onChange={(e) => setToDate(e.target.value)} />
          </Field>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button type="button" className="btn btn-secondary" style={smallButton} onClick={clearFilters}>
              Clear filters
            </button>
          </div>
        </div>
      </div>

      {canExport && (
        <InfoBox>
          Export CSV writes one row per ordered item for every order matching the filters above (not only this page), up to {EXPORT_CAP} orders.
        </InfoBox>
      )}

      <div className="card">
        <div className="table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Items</th>
                <th>Type</th>
                <th>Amount</th>
                <th>Payment</th>
                <th>Status</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <SkeletonRows columns={9} />
              ) : orders.length > 0 ? (
                orders.map((order) => (
                  <tr key={order.id}>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.8rem', fontWeight: 600 }} title={order.id}>
                      {shortId(order.id)}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{customerName(order)}</div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>{order.user?.email || '—'}</div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>{order.shippingAddress?.phone || order.user?.phoneNumber || ''}</div>
                    </td>
                    <td style={{ fontSize: '0.8rem' }}>
                      {order.items.slice(0, 2).map((item) => (
                        <div key={item.id}>
                          {item.name}
                          {item.variantName ? ` (${item.variantName})` : ''} × {item.quantity}
                        </div>
                      ))}
                      {order.items.length > 2 && <div style={{ color: 'var(--text-muted)' }}>+{order.items.length - 2} more</div>}
                    </td>
                    <td style={{ fontSize: '0.8rem' }}>{titleCase(order.orderType)}</td>
                    <td style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                      {formatPaise(order.totalAmount)}
                      {order.payment.currency !== 'INR' && (
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.72rem', fontWeight: 400 }}>
                          charged {formatMinor(order.payment.amountMinor, order.payment.currency)}
                        </div>
                      )}
                    </td>
                    <td>
                      <StatusPill status={order.payment.status} />
                    </td>
                    <td>
                      <StatusPill status={order.orderStatus} />
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{formatDateTime(order.createdAt)}</td>
                    <td>
                      <Link href={`/shop-orders/${order.id}`} className="btn btn-secondary" style={tinyButton}>
                        View →
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <EmptyRow columns={9}>No orders found.</EmptyRow>
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={page} totalPages={pagination.totalPages} total={pagination.totalOrders} noun="orders" disabled={isLoading} onChange={setPage} />
      </div>
    </div>
  );
}

export default function ShopOrdersPage() {
  return (
    <RequirePermission permission="orders:read">
      <ShopOrdersScreen />
    </RequirePermission>
  );
}
