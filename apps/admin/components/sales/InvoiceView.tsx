'use client';

import React, { useEffect, useState } from 'react';
import { errorMessage, getOrderInvoice, InvoiceDocumentData } from '../../lib/api/sales';
import { basisPointsToPercent, formatDateTime, formatMinor, formatPaise, titleCase } from './format';
import { StatusPill } from './badges';
import { ErrorBanner, InfoBox, KeyValue, SectionTitle } from './ui';

/** Invoice data of one order (`GET /admin/invoices/orders/:orderId`, permission `transactions:read`). The PDF is not built in the backend yet. */
export function InvoiceView({ orderId }: { orderId: string }) {
  const [invoice, setInvoice] = useState<InvoiceDocumentData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    setInvoice(null);
    getOrderInvoice(orderId)
      .then((data) => {
        if (!cancelled) setInvoice(data);
      })
      .catch((err) => {
        if (!cancelled) setError(errorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  if (isLoading) return <div className="skeleton" style={{ height: '260px', width: '100%' }} />;
  if (error || !invoice) return <ErrorBanner message={error || 'Invoice data could not be loaded'} />;

  const { seller, customer, shippingAddress, payment, totals } = invoice;

  return (
    <div>
      {!invoice.numberAllocated && (
        <InfoBox tone="warning" title="No invoice number yet">
          This sale shows the label &ldquo;{invoice.invoiceNumber}&rdquo; instead of a number
          {invoice.allocationStatus ? ` (allocation status: ${titleCase(invoice.allocationStatus)})` : ''}. A pending invoice is numbered automatically once the
          invoice counter is initialised, or by a Super Admin with &ldquo;Allocate pending invoices&rdquo; on the Invoices screen.
        </InfoBox>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
        <div className="card">
          <SectionTitle>Invoice</SectionTitle>
          <KeyValue label="Invoice number">{invoice.invoiceNumber}</KeyValue>
          <KeyValue label="Sale type">{titleCase(invoice.saleType)}</KeyValue>
          <KeyValue label="Order reference">{invoice.orderReference}</KeyValue>
          <KeyValue label="Order date">{formatDateTime(invoice.orderDate)}</KeyValue>
          <KeyValue label="Order status">{titleCase(invoice.orderStatus)}</KeyValue>
          <KeyValue label="Place of supply">{invoice.placeOfSupply}</KeyValue>
          <KeyValue label="Reverse charge">{invoice.reverseCharge ? 'Yes' : 'No'}</KeyValue>
        </div>

        <div className="card">
          <SectionTitle>Seller</SectionTitle>
          <KeyValue label="Name">{seller.legalName}</KeyValue>
          {seller.tagline && <KeyValue label="Tagline">{seller.tagline}</KeyValue>}
          <KeyValue label="GSTIN">{seller.gstin}</KeyValue>
          <KeyValue label="State">{seller.state}</KeyValue>
          <KeyValue label="Address">{seller.address}</KeyValue>
          {seller.email && <KeyValue label="E-mail">{seller.email}</KeyValue>}
          {seller.phone && <KeyValue label="Phone">{seller.phone}</KeyValue>}
          {seller.website && <KeyValue label="Website">{seller.website}</KeyValue>}
        </div>

        <div className="card">
          <SectionTitle>Customer</SectionTitle>
          <KeyValue label="Name">{customer.name}</KeyValue>
          <KeyValue label="E-mail">{customer.email || '—'}</KeyValue>
          <KeyValue label="Phone">{customer.phone || '—'}</KeyValue>
          {shippingAddress && (
            <KeyValue label="Ship to">
              {[shippingAddress.fullName, shippingAddress.addressLine1, shippingAddress.addressLine2, shippingAddress.city, `${shippingAddress.state} ${shippingAddress.postalCode}`, shippingAddress.country, shippingAddress.phone]
                .filter(Boolean)
                .join(', ')}
            </KeyValue>
          )}
        </div>

        <div className="card">
          <SectionTitle>Payment</SectionTitle>
          <KeyValue label="Status">
            <StatusPill status={payment.status} />
          </KeyValue>
          <KeyValue label="Method">{titleCase(payment.method)}</KeyValue>
          <KeyValue label="Gateway payment ID">{payment.gatewayPaymentId || '—'}</KeyValue>
          <KeyValue label="Paid at">{formatDateTime(payment.paidAt)}</KeyValue>
          <KeyValue label="Charged">{formatMinor(payment.amountMinor, payment.currency)}</KeyValue>
          {payment.currency !== 'INR' && <KeyValue label={`Exchange rate (${payment.currency} per 1 INR)`}>{payment.exchangeRate}</KeyValue>}
        </div>
      </div>

      <div className="card">
        <SectionTitle>Lines</SectionTitle>
        <div className="table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Type</th>
                <th>Qty</th>
                <th>Unit price</th>
                <th>GST</th>
                <th>GST amount</th>
                <th>Line total</th>
              </tr>
            </thead>
            <tbody>
              {invoice.lines.map((line, index) => (
                <tr key={`${line.title}-${index}`}>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{line.title}</div>
                    {line.description && <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>{line.description}</div>}
                  </td>
                  <td style={{ fontSize: '0.8rem' }}>{titleCase(line.itemType)}</td>
                  <td>{line.quantity}</td>
                  <td>{formatPaise(line.unitPricePaise)}</td>
                  <td style={{ fontSize: '0.8rem' }}>
                    {basisPointsToPercent(line.taxRateBp)} {line.taxInclusive ? 'inclusive' : 'exclusive'}
                  </td>
                  <td>{formatPaise(line.taxPaise)}</td>
                  <td style={{ fontWeight: 600 }}>{formatPaise(line.lineTotalPaise)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ maxWidth: '360px', marginLeft: 'auto', marginTop: '1rem' }}>
          <KeyValue label="Subtotal">{formatPaise(totals.subTotalPaise)}</KeyValue>
          <KeyValue label="Discount">− {formatPaise(totals.discountPaise)}</KeyValue>
          <KeyValue label="Shipping">{formatPaise(totals.shippingPaise)}</KeyValue>
          {totals.taxByRate.map((row) => (
            <KeyValue key={`${row.rateBp}-${row.inclusive}`} label={`GST ${basisPointsToPercent(row.rateBp)} (${row.inclusive ? 'included in price' : 'added on top'})`}>
              {formatPaise(row.taxPaise)}
            </KeyValue>
          ))}
          <KeyValue label="Total GST">{formatPaise(totals.taxPaise)}</KeyValue>
          <KeyValue label="Grand total (INR)">{formatPaise(totals.grandTotalPaise)}</KeyValue>
        </div>
      </div>
    </div>
  );
}
