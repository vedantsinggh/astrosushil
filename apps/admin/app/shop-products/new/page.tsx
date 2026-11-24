'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ProductForm } from '../../../components/catalogue/ProductForm';
import { Breadcrumbs, PageHeader, PermissionGate } from '../../../components/catalogue/ui';

export default function NewShopProductPage() {
  const router = useRouter();
  return (
    <PermissionGate permission="products:create">
      <Breadcrumbs items={[{ label: 'Products', href: '/shop-products' }, { label: 'Add Product' }]} />
      <PageHeader title="Add Product" subtitle="Create a physical, digital or service product for the shop" />
      <ProductForm onSaved={(product) => router.push(`/shop-products/${product.id}?saved=created`)} />
    </PermissionGate>
  );
}
