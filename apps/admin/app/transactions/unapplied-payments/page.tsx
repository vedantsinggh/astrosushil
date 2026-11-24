'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { errorMessage, LedgerTransaction, listUnappliedPayments } from '../../../lib/api/sales';
import { formatDateTime, formatMinor, formatPaise, titleCase } from '../../../components/sales/format';
import { transactionCustomer, TransactionDetailModal, TransactionsTabs } from '../../../components/sales/TransactionParts';
import { EmptyRow, ErrorBanner, InfoBox, mono, PageHeader, RequirePermission, SkeletonRows, smallButton, tinyButton } from '../../../components/sales/ui';

function UnappliedPaymentsScreen() {
  const [rows, setRows] = useState<LedgerTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<LedgerTransaction | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await listUnappliedPayments();
      setRows(result.payments);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <PageHeader
        crumbs={[{ label: 'Transactions', href: '/transactions' }, { label: 'Unapplied payments' }]}
        title="Unapplied payments"
        subtitle="Money the gateway captured for an order that is not paid here"
        actions={
          <button type="button" className="btn btn-secondary" style={smallButton} onClick={load}>
            Refresh
          </button>
        }
      />

      <TransactionsTabs active="/transactions/unapplied-payments" />

      <InfoBox tone="warning" title="What this list is">
        <p>
          Each row is a payment that the gateway really captured, but for an order that was already cancelled (the customer cancelled it, or started a new checkout
          that replaced it) when the money arrived. The customer has paid; the order stays cancelled, has no invoice number, and nothing is being delivered for it.
        </p>
        <p style={{ marginTop: '0.4rem' }}>
          <strong>What to do:</strong> contact the customer and either refund the payment from the Razorpay dashboard (use the gateway payment ID shown here) or honour
          the purchase. Neither a refund nor reinstating the order can be done from this panel yet, and a row stays in this list afterwards. Until it is dealt with, the
          payment is counted in the GST report like any other successful payment.
        </p>
        <p style={{ marginTop: '0.4rem' }}>The newest 200 are shown.</p>
      </InfoBox>

      <ErrorBanner message={error} />

      <div className="card">
        <div className="table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Gateway payment ID</th>
                <th>Customer</th>
                <th>Type</th>
                <th>Charged</th>
                <th>Order state here</th>
                <th>Captured / updated</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <SkeletonRows columns={7} />
              ) : rows.length > 0 ? (
                rows.map((txn) => (
                  <tr key={txn.id}>
                    <td style={mono}>{txn.transactionId || '—'}</td>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{transactionCustomer(txn)}</div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>{txn.user?.email || ''}</div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>{txn.user?.phoneNumber || ''}</div>
                    </td>
                    <td style={{ fontSize: '0.8rem' }}>{titleCase(txn.transactionType)}</td>
                    <td style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                      {formatMinor(txn.amountMinor, txn.currency)}
                      {txn.currency !== 'INR' && <div style={{ color: 'var(--text-secondary)', fontSize: '0.72rem', fontWeight: 400 }}>{formatPaise(txn.baseAmountPaise)}</div>}
                    </td>
                    <td style={{ fontSize: '0.8rem' }}>
                      {txn.order ? (
                        <>
                          <span className="badge badge-danger">{titleCase(txn.order.status)}</span>
                          <div style={{ ...mono, color: 'var(--text-secondary)', marginTop: '0.2rem' }}>…{txn.order.id.slice(-8)}</div>
                        </>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{formatDateTime(txn.updatedAt)}</td>
                    <td>
                      <button type="button" className="btn btn-secondary" style={tinyButton} onClick={() => setSelected(txn)}>
                        View
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <EmptyRow columns={7}>No unapplied payments. Every captured payment belongs to a paid order.</EmptyRow>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selected && <TransactionDetailModal txn={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

export default function UnappliedPaymentsPage() {
  return (
    <RequirePermission permission="transactions:read">
      <UnappliedPaymentsScreen />
    </RequirePermission>
  );
}
