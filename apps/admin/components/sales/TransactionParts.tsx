'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '../../lib/auth-context';
import { LedgerTransaction } from '../../lib/api/sales';
import { basisPointsToPercent, formatDateTime, formatMinor, formatPaise, titleCase } from './format';
import { StatusPill } from './badges';
import { KeyValue, LinkTabs, Modal, SectionTitle } from './ui';

export function TransactionsTabs({ active }: { active: string }) {
  const { hasPermission } = useAuth();
  return (
    <LinkTabs
      active={active}
      tabs={[
        { href: '/transactions', label: 'All transactions' },
        { href: '/transactions/unapplied-payments', label: 'Unapplied payments' },
        { href: '/transactions/payment-conflicts', label: 'Booking payment conflicts', show: hasPermission('bookings:read') },
      ]}
    />
  );
}

export function transactionCustomer(txn: LedgerTransaction): string {
  return txn.customerName || txn.user?.fullName || txn.user?.email || '—';
}

export function TransactionDetailModal({ txn, onClose }: { txn: LedgerTransaction; onClose: () => void }) {
  const { hasPermission } = useAuth();
  const foreign = txn.currency !== txn.baseCurrency;
  return (
    <Modal
      title="Transaction details"
      onClose={onClose}
      width={720}
      footer={
        <>
          {txn.orderId && hasPermission('transactions:read') && (
            <Link href={`/invoices/orders/${txn.orderId}`} className="btn btn-secondary">
              Invoice data
            </Link>
          )}
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Close
          </button>
        </>
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem' }}>
        <div>
          <SectionTitle>Payment</SectionTitle>
          <KeyValue label="Status">
            <StatusPill status={txn.status} />
          </KeyValue>
          <KeyValue label="Type">{titleCase(txn.transactionType)}</KeyValue>
          <KeyValue label="Method">{titleCase(txn.method)}</KeyValue>
          <KeyValue label="Gateway payment ID">{txn.transactionId || '—'}</KeyValue>
          <KeyValue label="Razorpay order ID">{txn.razorpayOrderId || '—'}</KeyValue>
          <KeyValue label="Invoice">{txn.invoiceNo}</KeyValue>
          <KeyValue label="Created">{formatDateTime(txn.createdAt)}</KeyValue>
          <KeyValue label="Updated">{formatDateTime(txn.updatedAt)}</KeyValue>
          <KeyValue label="Ledger row ID">
            <span style={{ fontFamily: 'monospace', fontSize: '0.72rem' }}>{txn.id}</span>
          </KeyValue>
        </div>
        <div>
          <SectionTitle>Customer</SectionTitle>
          <KeyValue label="Name">{transactionCustomer(txn)}</KeyValue>
          <KeyValue label="E-mail">{txn.user?.email || '—'}</KeyValue>
          <KeyValue label="Phone">{txn.user?.phoneNumber || '—'}</KeyValue>
          <div style={{ height: '1rem' }} />
          <SectionTitle>Amounts</SectionTitle>
          <KeyValue label="Charged">{formatMinor(txn.amountMinor, txn.currency)}</KeyValue>
          {foreign && <KeyValue label={`Rate (${txn.currency} per 1 INR)`}>{txn.exchangeRate}</KeyValue>}
          <KeyValue label="INR value">{formatPaise(txn.baseAmountPaise)}</KeyValue>
          <KeyValue label="Subtotal">{formatPaise(txn.subtotalPaise)}</KeyValue>
          <KeyValue label="Discount">{formatPaise(txn.discountPaise)}</KeyValue>
          <KeyValue label="Shipping">{formatPaise(txn.shippingPaise)}</KeyValue>
          <KeyValue label={`GST (${basisPointsToPercent(txn.taxRateBp)} ${txn.taxInclusive ? 'inclusive' : 'exclusive'})`}>{formatPaise(txn.taxPaise)}</KeyValue>
        </div>
      </div>

      {txn.order && (
        <div style={{ marginTop: '1.25rem' }}>
          <SectionTitle>Linked order</SectionTitle>
          <KeyValue label="Order ID">
            <span style={{ fontFamily: 'monospace', fontSize: '0.72rem' }}>{txn.order.id}</span>
          </KeyValue>
          <KeyValue label="Order status">{titleCase(txn.order.status)}</KeyValue>
          <KeyValue label="Payment status">{titleCase(txn.order.paymentStatus)}</KeyValue>
          <KeyValue label="Fulfilment">{titleCase(txn.order.fulfillmentStatus)}</KeyValue>
        </div>
      )}

      {txn.rawResponse !== null && txn.rawResponse !== undefined && (
        <details style={{ marginTop: '1.25rem' }}>
          <summary style={{ cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>Gateway response (card, bank and contact details are never stored)</summary>
          <pre style={{ background: 'var(--bg-subtle)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', overflowX: 'auto', marginTop: '0.5rem' }}>
            {JSON.stringify(txn.rawResponse, null, 2)}
          </pre>
        </details>
      )}
    </Modal>
  );
}
