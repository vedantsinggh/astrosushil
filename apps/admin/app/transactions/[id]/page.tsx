'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { errorMessage, getTransaction, LedgerTransaction } from '../../../lib/api/sales';
import { formatDateTime, formatMinor, formatPaise, shortId, titleCase } from '../../../components/sales/format';
import { StatusPill } from '../../../components/sales/badges';
import {
  ErrorBanner,
  KeyValue,
  PageHeader,
  RequirePermission,
  SectionTitle,
  smallButton,
} from '../../../components/sales/ui';

function TransactionDetailScreen() {
  const params = useParams();
  const id = params.id as string;

  const [txn, setTxn] = useState<LedgerTransaction | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setTxn(await getTransaction(id));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (isLoading) {
    return (
      <div>
        <div className="skeleton" style={{ height: '30px', width: '260px', marginBottom: '1rem' }} />
        <div className="skeleton" style={{ height: '220px', width: '100%' }} />
      </div>
    );
  }

  if (error || !txn) {
    return (
      <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
        <ErrorBanner message={error || 'Transaction not found'} />
        <Link href="/transactions" className="btn btn-secondary">
          ← Back to Transactions
        </Link>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        crumbs={[{ label: 'Transactions', href: '/transactions' }, { label: txn.transactionId || shortId(txn.id) }]}
        title={`Transaction ${txn.transactionId || shortId(txn.id)}`}
        subtitle={
          <>
            {titleCase(txn.transactionType)} · {formatDateTime(txn.createdAt)} · <StatusPill status={txn.status} />
          </>
        }
        actions={
          <>
            {txn.orderId && txn.transactionType === 'order' && (
              <Link href={`/shop-orders/${txn.orderId}`} className="btn btn-secondary" style={smallButton}>
                Open Shop Order
              </Link>
            )}
            <Link href="/transactions" className="btn btn-secondary" style={smallButton}>
              ← Back to Transactions
            </Link>
            <button type="button" className="btn btn-secondary" style={smallButton} onClick={load}>
              Refresh
            </button>
          </>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
        <div className="card">
          <SectionTitle>Payment Summary</SectionTitle>
          <KeyValue label="Transaction ID">
            <span style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{txn.id}</span>
          </KeyValue>
          <KeyValue label="Gateway Txn ID">
            <span style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{txn.transactionId || '—'}</span>
          </KeyValue>
          <KeyValue label="Razorpay Order ID">
            <span style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{txn.razorpayOrderId || '—'}</span>
          </KeyValue>
          <KeyValue label="Invoice No">{txn.invoiceNo || '—'}</KeyValue>
          <KeyValue label="Method">{titleCase(txn.method)}</KeyValue>
          <KeyValue label="Type">{titleCase(txn.transactionType)}</KeyValue>
          <KeyValue label="Status">
            <StatusPill status={txn.status} />
          </KeyValue>
          <KeyValue label="Created">{formatDateTime(txn.createdAt)}</KeyValue>
          <KeyValue label="Updated">{formatDateTime(txn.updatedAt)}</KeyValue>
        </div>

        <div className="card">
          <SectionTitle>Amounts &amp; Tax</SectionTitle>
          <KeyValue label="Charged">{formatMinor(txn.amountMinor, txn.currency)}</KeyValue>
          {txn.currency !== txn.baseCurrency && (
            <>
              <KeyValue label="INR Equivalent">{formatPaise(txn.baseAmountPaise)}</KeyValue>
              <KeyValue label={`Exchange Rate (${txn.currency} / INR)`}>{txn.exchangeRate}</KeyValue>
            </>
          )}
          <KeyValue label="Subtotal (INR)">{formatPaise(txn.subtotalPaise)}</KeyValue>
          <KeyValue label="Shipping (INR)">{formatPaise(txn.shippingPaise)}</KeyValue>
          <KeyValue label="Discount (INR)">{formatPaise(txn.discountPaise)}</KeyValue>
          <KeyValue label={`Tax / GST (${(txn.taxRateBp / 100).toFixed(2)}%${txn.taxInclusive ? ' incl.' : ''})`}>
            {formatPaise(txn.taxPaise)}
          </KeyValue>
        </div>

        <div className="card">
          <SectionTitle>Customer &amp; Order</SectionTitle>
          <KeyValue label="Name">{txn.customerName || txn.user?.fullName || '—'}</KeyValue>
          <KeyValue label="Email">{txn.user?.email || '—'}</KeyValue>
          <KeyValue label="Phone">{txn.user?.phoneNumber || '—'}</KeyValue>
          {txn.user && (
            <KeyValue label="User Profile">
              <Link href={`/users/${txn.user.id}`}>View User →</Link>
            </KeyValue>
          )}
          {txn.order && (
            <>
              <KeyValue label="Order Status">{titleCase(txn.order.status)}</KeyValue>
              <KeyValue label="Order Payment">{titleCase(txn.order.paymentStatus)}</KeyValue>
              <KeyValue label="Fulfillment">{titleCase(txn.order.fulfillmentStatus)}</KeyValue>
            </>
          )}
        </div>
      </div>

      {txn.rawResponse !== null && txn.rawResponse !== undefined && (
        <div className="card">
          <SectionTitle>Gateway Raw Response</SectionTitle>
          <pre
            style={{
              background: 'var(--bg-subtle)',
              padding: '1rem',
              borderRadius: 'var(--radius-sm)',
              overflowX: 'auto',
              fontSize: '0.78rem',
              margin: 0,
            }}
          >
            {JSON.stringify(txn.rawResponse, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

export default function TransactionDetailPage() {
  return (
    <RequirePermission permission="transactions:read">
      <TransactionDetailScreen />
    </RequirePermission>
  );
}
