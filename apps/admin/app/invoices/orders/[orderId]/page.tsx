'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { InvoiceView } from '../../../../components/sales/InvoiceView';
import { PageHeader, RequirePermission } from '../../../../components/sales/ui';

export default function OrderInvoicePage() {
  const params = useParams();
  const orderId = params.orderId as string;

  return (
    <RequirePermission permission="transactions:read">
      <PageHeader
        crumbs={[{ label: 'Invoices', href: '/invoices' }, { label: `Order …${orderId.slice(-8)}` }]}
        title="Invoice data"
        subtitle="What the invoice of this sale states. The printable PDF is not available yet."
      />
      <InvoiceView orderId={orderId} />
    </RequirePermission>
  );
}
