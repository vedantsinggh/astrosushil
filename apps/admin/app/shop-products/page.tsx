'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../lib/auth-context';
import { apiErrorMessage } from '../../lib/api/uploads';
import {
  CategoryTreeNode,
  ShopPagination,
  ShopProduct,
  ShopProductType,
  deleteShopProduct,
  discountLabel,
  fetchCategoryTree,
  fetchShopProducts,
  flattenCategoryTree,
  formatPaise,
} from '../../lib/api/catalogue';
import {
  Breadcrumbs,
  ConfirmDialog,
  EmptyRow,
  Notice,
  PageHeader,
  Pagination,
  PermissionGate,
  SkeletonRows,
  labelStyle,
  smallButton,
} from '../../components/catalogue/ui';

function stockText(product: ShopProduct): string {
  if (product.hasVariants) return `${product.variants.reduce((sum, v) => sum + Math.max(0, v.stock), 0)} (variants)`;
  return product.stock < 0 ? 'Not tracked' : String(product.stock);
}

function ShopProductsScreen() {
  const { hasPermission } = useAuth();
  const canCreate = hasPermission('products:create');
  const canUpdate = hasPermission('products:update');
  const canDelete = hasPermission('products:delete');

  const [items, setItems] = useState<ShopProduct[]>([]);
  const [pagination, setPagination] = useState<ShopPagination>({ total: 0, page: 1, limit: 20, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<ShopProductType | ''>('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [publishedFilter, setPublishedFilter] = useState<'true' | 'false' | ''>('');
  const [featuredFilter, setFeaturedFilter] = useState<'true' | 'false' | ''>('');
  const [pageSize, setPageSize] = useState(20);
  const [categories, setCategories] = useState<CategoryTreeNode[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [deleting, setDeleting] = useState<ShopProduct | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const load = useCallback(
    async (page: number) => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetchShopProducts({
          page,
          limit: pageSize,
          search: search.trim(),
          type: typeFilter,
          category: categoryFilter,
          isPublished: publishedFilter,
          isFeatured: featuredFilter,
        });
        setItems(res.products);
        setPagination(res.pagination);
      } catch (err) {
        setError(apiErrorMessage(err, 'Failed to load products'));
      } finally {
        setIsLoading(false);
      }
    },
    [pageSize, search, typeFilter, categoryFilter, publishedFilter, featuredFilter]
  );

  useEffect(() => {
    const timer = setTimeout(() => load(1), 300);
    return () => clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    // The category filter is optional: without `categories:read` the list still works.
    fetchCategoryTree().then(setCategories).catch(() => setCategories([]));
  }, []);

  const handleDelete = async () => {
    if (!deleting) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const result = await deleteShopProduct(deleting.id);
      setMessage(
        result.data.archived
          ? `"${deleting.name}" was archived, not deleted: it has purchases or is part of the built-in catalogue. It is now unpublished and unavailable, and was removed from customers' carts.`
          : `"${deleting.name}" was deleted with its images and files.`
      );
      setDeleting(null);
      await load(pagination.page);
    } catch (err) {
      setDeleteError(apiErrorMessage(err, 'Failed to delete the product'));
    } finally {
      setIsDeleting(false);
    }
  };

  const columns = 8;

  return (
    <div>
      <Breadcrumbs items={[{ label: 'Products' }]} />
      <PageHeader
        title="Shop Products"
        subtitle="Physical and digital products sold in the shop"
        actions={
          <>
            {canCreate && (
              <Link href="/shop-products/new" className="btn btn-primary" style={{ fontSize: '0.85rem' }}>
                Add Product
              </Link>
            )}
            <button onClick={() => load(pagination.page)} className="btn btn-secondary" style={{ fontSize: '0.85rem' }}>
              Refresh
            </button>
          </>
        }
      />

      {message && <Notice kind="success" onDismiss={() => setMessage(null)}>{message}</Notice>}
      {error && <Notice kind="error">{error}</Notice>}

      <div className="card" style={{ marginBottom: '1.5rem', padding: '1.25rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '1rem' }}>
          <div style={{ gridColumn: 'span 2' }}>
            <label style={labelStyle}>Search</label>
            <input type="text" className="input-control" placeholder="Search by name, SKU or slug..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Type</label>
            <select className="input-control" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as ShopProductType | '')}>
              <option value="">All types</option>
              <option value="physical">Physical</option>
              <option value="digital">Digital</option>
              <option value="service">Service</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Category</label>
            <select className="input-control" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
              <option value="">All categories</option>
              {flattenCategoryTree(categories).map(({ node, depth }) => (
                <option key={node.id} value={node.id}>
                  {'— '.repeat(depth)}
                  {node.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Published</label>
            <select className="input-control" value={publishedFilter} onChange={(e) => setPublishedFilter(e.target.value as 'true' | 'false' | '')}>
              <option value="">All</option>
              <option value="true">Published</option>
              <option value="false">Unpublished</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Featured</label>
            <select className="input-control" value={featuredFilter} onChange={(e) => setFeaturedFilter(e.target.value as 'true' | 'false' | '')}>
              <option value="">All</option>
              <option value="true">Featured</option>
              <option value="false">Not featured</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Per Page</label>
            <select className="input-control" value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Type</th>
                <th>Category</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Status</th>
                <th>Updated</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <SkeletonRows columns={columns} />
              ) : items.length > 0 ? (
                items.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                        {p.thumbnail ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.thumbnail} alt="" style={{ width: '44px', height: '44px', objectFit: 'cover', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', flexShrink: 0 }} />
                        ) : (
                          <div style={{ width: '44px', height: '44px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', background: 'var(--bg-subtle)', flexShrink: 0 }} />
                        )}
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{p.name}</div>
                          <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                            {p.sku ? `SKU ${p.sku}` : 'No SKU'}
                            {p.hasVariants ? ` · ${p.variants.length} variant(s)` : ''}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-info">{p.type}</span>
                    </td>
                    <td style={{ fontSize: '0.85rem' }}>{p.categoryInfo?.name || <span style={{ color: 'var(--text-muted)' }}>None</span>}</td>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                        {p.hasVariants ? 'From ' : ''}
                        {formatPaise(p.price, p.currency)}
                      </div>
                      {p.mrp > p.price && (
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                          <span style={{ textDecoration: 'line-through' }}>{formatPaise(p.mrp, p.currency)}</span> · {discountLabel(p)}
                        </div>
                      )}
                    </td>
                    <td style={{ fontSize: '0.85rem' }}>{stockText(p)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                        <span className={`badge ${p.isPublished ? 'badge-success' : 'badge-warning'}`}>{p.isPublished ? 'Published' : 'Unpublished'}</span>
                        {!p.isAvailable && <span className="badge badge-danger">Unavailable</span>}
                        {p.isFeatured && <span className="badge badge-info">Featured</span>}
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{new Date(p.updatedAt).toLocaleDateString()}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                        <Link href={`/shop-products/${p.id}`} className="btn btn-secondary" style={smallButton}>
                          View
                        </Link>
                        {canUpdate && (
                          <Link href={`/shop-products/${p.id}/edit`} className="btn btn-secondary" style={smallButton}>
                            Edit
                          </Link>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => {
                              setDeleteError(null);
                              setDeleting(p);
                            }}
                            className="btn btn-secondary"
                            style={{ ...smallButton, color: 'var(--badge-danger-text)' }}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <EmptyRow columns={columns}>No products found matching your filters.</EmptyRow>
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={pagination.page} totalPages={pagination.totalPages} total={pagination.total} noun="products" onPage={load} disabled={isLoading} />
      </div>

      {deleting && (
        <ConfirmDialog
          title={`Delete "${deleting.name}"?`}
          confirmLabel="Delete Product"
          onConfirm={handleDelete}
          onCancel={() => setDeleting(null)}
          busy={isDeleting}
          error={deleteError}
        >
          <p>The server decides what happens:</p>
          <ul style={{ margin: '0.5rem 0 0 1.1rem' }}>
            <li>
              If a customer has bought this product, or it belongs to the built-in catalogue, it is <strong>archived</strong>:
              unpublished, made unavailable and removed from carts. Purchases and downloads keep working.
            </li>
            <li>
              Otherwise it is <strong>deleted permanently</strong>, together with its images and files.
            </li>
          </ul>
        </ConfirmDialog>
      )}
    </div>
  );
}

export default function ShopProductsPage() {
  return (
    <PermissionGate permission="products:read">
      <ShopProductsScreen />
    </PermissionGate>
  );
}
