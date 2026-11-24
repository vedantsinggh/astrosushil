'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiErrorMessage } from '../../../../lib/api/uploads';
import { ShopProduct, fetchShopProduct } from '../../../../lib/api/catalogue';
import { ProductForm } from '../../../../components/catalogue/ProductForm';
import { Breadcrumbs, Notice, PageHeader, PermissionGate } from '../../../../components/catalogue/ui';

function EditShopProductScreen() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;
  const [product, setProduct] = useState<ShopProduct | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: 'Products', href: '/shop-products' },
          { label: product?.name || 'Product', href: `/shop-products/${id}` },
          { label: 'Edit' },
        ]}
      />
      <PageHeader title="Edit Product" subtitle={product ? product.name : undefined} />
      {error && <Notice kind="error">{error}</Notice>}
      {!product && !error && <div className="skeleton" style={{ height: '320px', width: '100%' }} />}
      {product && <ProductForm product={product} onSaved={(saved) => router.push(`/shop-products/${saved.id}?saved=updated`)} />}
    </div>
  );
}

export default function EditShopProductPage() {
  return (
    <PermissionGate permission="products:update">
      <EditShopProductScreen />
    </PermissionGate>
  );
}
