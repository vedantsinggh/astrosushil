'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '../../../lib/auth-context';
import { apiErrorMessage } from '../../../lib/api/uploads';
import { ShopProduct, deleteShopProduct, discountLabel, fetchShopProduct, formatPaise } from '../../../lib/api/catalogue';
import {
  Breadcrumbs,
  ConfirmDialog,
  Notice,
  PageHeader,
  PermissionGate,
  SectionCard,
  formatDateTime,
} from '../../../components/catalogue/ui';

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: '0.75rem', padding: '0.4rem 0', borderBottom: '1px solid var(--border-color)', fontSize: '0.875rem' }}>
      <div style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{label}</div>
      <div style={{ minWidth: 0, wordBreak: 'break-word' }}>{children}</div>
    </div>
  );
}

const none = <span style={{ color: 'var(--text-muted)' }}>—</span>;

function ShopProductViewScreen() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { hasPermission } = useAuth();
  const id = params.id;

  const [product, setProduct] = useState<ShopProduct | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const saved = new URLSearchParams(window.location.search).get('saved');
    if (saved === 'created') setMessage('Product created.');
    if (saved === 'updated') setMessage('Product updated.');
  }, []);

  useEffect(() => {
    let cancelled = false;
    setProduct(null);
    setError(null);
    fetchShopProduct(id)
      .then((result) => {
        if (!cancelled) setProduct(result);
      })
      .catch((err) => {
        if (!cancelled) setError(apiErrorMessage(err, 'Failed to load the product'));
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleDelete = async () => {
    if (!product) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const result = await deleteShopProduct(product.id);
      if (result.data.archived) {
        setConfirmDelete(false);
        setMessage('The product was archived, not deleted: it has purchases or is part of the built-in catalogue. It is now unpublished and unavailable.');
        setProduct(await fetchShopProduct(product.id));
      } else {
        router.push('/shop-products');
      }
    } catch (err) {
      setDeleteError(apiErrorMessage(err, 'Failed to delete the product'));
    } finally {
      setIsDeleting(false);
    }
  };

  const assetName = typeof product?.metadata?.digitalAssetName === 'string' ? (product.metadata.digitalAssetName as string) : null;

  return (
    <div>
      <Breadcrumbs items={[{ label: 'Products', href: '/shop-products' }, { label: product?.name || 'Product' }]} />
      <PageHeader
        title={product?.name || 'Product'}
        subtitle={product ? `/${product.slug}` : undefined}
        actions={
          product && (
            <>
              {hasPermission('products:update') && (
                <Link href={`/shop-products/${product.id}/edit`} className="btn btn-primary" style={{ fontSize: '0.85rem' }}>
                  Edit
                </Link>
              )}
              {hasPermission('products:delete') && (
                <button
                  onClick={() => {
                    setDeleteError(null);
                    setConfirmDelete(true);
                  }}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.85rem', color: 'var(--badge-danger-text)' }}
                >
                  Delete
                </button>
              )}
            </>
          )
        }
      />

      {message && <Notice kind="success" onDismiss={() => setMessage(null)}>{message}</Notice>}
      {error && <Notice kind="error">{error}</Notice>}
      {!product && !error && <div className="skeleton" style={{ height: '320px', width: '100%' }} />}

      {product && (
        <>
          <SectionCard title="Overview">
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
              <span className="badge badge-info">{product.type}</span>
              <span className={`badge ${product.isPublished ? 'badge-success' : 'badge-warning'}`}>{product.isPublished ? 'Published' : 'Unpublished'}</span>
              <span className={`badge ${product.isAvailable ? 'badge-success' : 'badge-danger'}`}>{product.isAvailable ? 'Available' : 'Unavailable'}</span>
              {product.isFeatured && <span className="badge badge-info">Featured</span>}
              {product.isTrending && <span className="badge badge-info">Trending</span>}
              {product.isBestSeller && <span className="badge badge-info">Best Seller</span>}
            </div>
            <Row label="Category">{product.categoryInfo?.name || none}</Row>
            <Row label="SKU">{product.sku || none}</Row>
            <Row label="Hindi Title">{product.hindiTitle || none}</Row>
            <Row label="Short Description">{product.shortDescription || none}</Row>
            <Row label="Full Description">
              {product.description ? <div style={{ whiteSpace: 'pre-wrap', maxHeight: '260px', overflowY: 'auto' }}>{product.description}</div> : none}
            </Row>
            <Row label="Hindi Description">
              {product.hindiDescription ? <div style={{ whiteSpace: 'pre-wrap', maxHeight: '260px', overflowY: 'auto' }}>{product.hindiDescription}</div> : none}
            </Row>
            <Row label="Created At">{formatDateTime(product.createdAt)}</Row>
            <Row label="Last Updated">{formatDateTime(product.updatedAt)}</Row>
          </SectionCard>

          <SectionCard title="Pricing & Tax">
            <Row label={product.hasVariants ? 'Lowest MRP' : 'MRP'}>{formatPaise(product.mrp, product.currency)}</Row>
            <Row label="Discount">{discountLabel(product)}</Row>
            <Row label={product.hasVariants ? 'Lowest Selling Price' : 'Selling Price'}>{formatPaise(product.price, product.currency)}</Row>
            <Row label="Price incl. GST">{formatPaise(product.priceWithGst, product.currency)}</Row>
            <Row label="GST">
              {product.gst.enabled ? `${product.gst.rate}% (${product.gst.type})` : 'Not applied'}
            </Row>
            {!product.hasVariants && <Row label="Stock">{product.stock < 0 ? 'Not tracked' : product.stock}</Row>}
          </SectionCard>

          {product.hasVariants && (
            <SectionCard title={`Variants (${product.variants.length})`}>
              <div className="table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Option</th>
                      <th>MRP</th>
                      <th>Selling Price</th>
                      <th>Incl. GST</th>
                      <th>Stock</th>
                      {product.type === 'digital' && <th>Downloadable File</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {product.variants.map((v) => (
                      <tr key={v.variantId}>
                        <td>
                          <strong>{v.name}</strong>: {v.value}
                        </td>
                        <td>{formatPaise(v.mrp, product.currency)}</td>
                        <td>{formatPaise(v.price, product.currency)}</td>
                        <td>{formatPaise(v.priceWithGst, product.currency)}</td>
                        <td>{v.stock}</td>
                        {product.type === 'digital' && (
                          <td style={{ fontSize: '0.8rem' }}>
                            {v.downloadableFile ? v.downloadableFile.name || v.downloadableFile.key.split('/').pop() : <span className="badge badge-danger">Missing</span>}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          )}

          {product.type === 'digital' && !product.hasVariants && (
            <SectionCard title="Downloadable File">
              {product.downloadableFile ? (
                <p style={{ fontSize: '0.875rem' }}>
                  {assetName || product.downloadableFile.key.split('/').pop()}{' '}
                  <span style={{ color: 'var(--text-muted)' }}>(stored privately; customers get a short-lived link after buying)</span>
                </p>
              ) : (
                <span className="badge badge-warning">No file attached</span>
              )}
            </SectionCard>
          )}

          <SectionCard title="Images">
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              {product.thumbnail && (
                <figure style={{ margin: 0 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={product.thumbnail} alt="Thumbnail" style={{ width: '120px', height: '120px', objectFit: 'cover', borderRadius: 'var(--radius-sm)', border: '2px solid var(--accent-primary)' }} />
                  <figcaption style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'center' }}>Thumbnail</figcaption>
                </figure>
              )}
              {product.images.map((url, index) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={`${url}-${index}`} src={url} alt={`Gallery image ${index + 1}`} style={{ width: '120px', height: '120px', objectFit: 'cover', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }} />
              ))}
              {!product.thumbnail && product.images.length === 0 && <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No images.</span>}
            </div>
          </SectionCard>

          {product.type === 'physical' && (
            <SectionCard title="Shipping Details">
              <Row label="Weight">{product.weightGrams !== null && product.weightGrams !== undefined ? `${product.weightGrams} g` : none}</Row>
              <Row label="Dimensions (L×W×H)">
                {product.dimensions
                  ? `${product.dimensions.length ?? '—'} × ${product.dimensions.width ?? '—'} × ${product.dimensions.height ?? '—'} cm`
                  : none}
              </Row>
            </SectionCard>
          )}

          <SectionCard title="SEO">
            <Row label="Meta Title">{product.metaTitle || none}</Row>
            <Row label="Meta Description">{product.metaDescription || none}</Row>
            <Row label="Keywords / Tags">
              {product.keywords?.length > 0
                ? product.keywords.map((k) => (
                    <span key={k} className="badge badge-info" style={{ textTransform: 'none', marginRight: '0.3rem' }}>
                      {k}
                    </span>
                  ))
                : none}
            </Row>
          </SectionCard>
        </>
      )}

      {confirmDelete && product && (
        <ConfirmDialog
          title={`Delete "${product.name}"?`}
          confirmLabel="Delete Product"
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(false)}
          busy={isDeleting}
          error={deleteError}
        >
          If a customer has bought this product, or it belongs to the built-in catalogue, the server archives it
          (unpublished, unavailable, removed from carts) and purchases keep working. Otherwise it is deleted permanently
          with its images and files.
        </ConfirmDialog>
      )}
    </div>
  );
}

export default function ShopProductViewPage() {
  return (
    <PermissionGate permission="products:read">
      <ShopProductViewScreen />
    </PermissionGate>
  );
}
