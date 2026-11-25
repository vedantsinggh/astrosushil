'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../lib/auth-context';
import {
  countTransactions,
  errorMessage,
  exportTransactionsCsv,
  getGstReport,
  LedgerMethod,
  LedgerStatus,
  LedgerTransaction,
  listTransactions,
  TransactionFilters,
} from '../../lib/api/sales';
import { formatDateTime, formatMinor, formatPaise, titleCase } from '../../components/sales/format';
import { StatusPill } from '../../components/sales/badges';
import { transactionCustomer, TransactionDetailModal, TransactionsTabs } from '../../components/sales/TransactionParts';
import {
  EmptyRow,
  ErrorBanner,
  Field,
  filterGrid,
  mono,
  PageHeader,
  Pagination,
  RequirePermission,
  SkeletonRows,
  smallButton,
  StatCard,
  SuccessBanner,
  tinyButton,
  useDebounced,
} from '../../components/sales/ui';

const PAGE_SIZE = 10;

interface Totals {
  all: number;
  success: number;
  pending: number;
  failed: number;
  /** INR paise collected by successful payments in the date range; null when the user may not read the GST report. */
  collectedPaise: number | null;
}

function TransactionsScreen() {
  const { hasPermission } = useAuth();
  const canExport = hasPermission('transactions:export');
  const canReadGst = hasPermission('gst_report:read');

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<LedgerStatus | ''>('');
  const [method, setMethod] = useState<LedgerMethod | ''>('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounced(search, 400);

  const [rows, setRows] = useState<LedgerTransaction[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [selected, setSelected] = useState<LedgerTransaction | null>(null);

  const [totals, setTotals] = useState<Totals | null>(null);
  const [totalsError, setTotalsError] = useState<string | null>(null);

  const filters: TransactionFilters = { status, method, fromDate, toDate, search: debouncedSearch };
  const filterKey = JSON.stringify(filters);
  // The cards ignore the status filter (they are the per-status split) but follow every other filter.
  const totalsKey = JSON.stringify({ method, fromDate, toDate, search: debouncedSearch });

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await listTransactions(JSON.parse(filterKey) as TransactionFilters, page, PAGE_SIZE);
      setRows(result.transactions);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [filterKey, page]);

  const loadTotals = useCallback(async () => {
    setTotalsError(null);
    const base = JSON.parse(totalsKey) as TransactionFilters;
    try {
      const [all, success, pending, failed, gst] = await Promise.all([
        countTransactions(base, ''),
        countTransactions(base, 'success'),
        countTransactions(base, 'pending'),
        countTransactions(base, 'failed'),
        canReadGst ? getGstReport({ fromDate: base.fromDate, toDate: base.toDate, status: 'success' }) : Promise.resolve(null),
      ]);
      setTotals({ all, success, pending, failed, collectedPaise: gst ? gst.summary.grandTotal : null });
    } catch (err) {
      setTotals(null);
      setTotalsError(errorMessage(err));
    }
  }, [totalsKey, canReadGst]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    loadTotals();
  }, [loadTotals]);

  useEffect(() => {
    setPage(1);
  }, [filterKey]);

  const exportCsv = async () => {
    setIsExporting(true);
    setError(null);
    try {
      await exportTransactionsCsv(filters);
      setNotice('The transactions CSV was downloaded. The export is recorded in the audit log.');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setIsExporting(false);
    }
  };

  const rangeText = fromDate || toDate ? `${fromDate || 'the start'} to ${toDate || 'today'}` : 'all time';

  return (
    <div>
      <PageHeader
        crumbs={[{ label: 'Transactions' }]}
        title="Transactions"
        subtitle="All payment transactions across the platform: product orders, consultations and reports"
        actions={
          <>
            {canExport && (
              <button type="button" className="btn btn-secondary" style={smallButton} onClick={exportCsv} disabled={isExporting}>
                {isExporting ? 'Exporting…' : 'Export CSV'}
              </button>
            )}
            <button
              type="button"
              className="btn btn-secondary"
              style={smallButton}
              onClick={() => {
                load();
                loadTotals();
              }}
            >
              Refresh
            </button>
          </>
        }
      />

      <TransactionsTabs active="/transactions" />

      <ErrorBanner message={error} />
      <SuccessBanner message={notice} onClose={() => setNotice(null)} />

      <div className="card-grid">
        <StatCard title="Transactions" value={totals ? totals.all : '—'} sub={`Every attempt, ${rangeText}`} />
        <StatCard title="Successful" value={totals ? totals.success : '—'} sub="Payment captured" />
        <StatCard title="Pending" value={totals ? totals.pending : '—'} sub="Customer has not finished paying" />
        <StatCard title="Failed" value={totals ? totals.failed : '—'} sub="Gateway reported a failure" />
        {canReadGst && (
          <StatCard
            title="Collected (INR)"
            value={totals && totals.collectedPaise !== null ? formatPaise(totals.collectedPaise) : '—'}
            sub={`Successful payments, ${rangeText}. Follows the dates only, not the search or method filter.`}
          />
        )}
      </div>
      <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '-0.75rem 0 1.25rem' }}>
        {totalsError
          ? `The totals could not be loaded: ${totalsError}`
          : 'These totals are counted by the server over every matching transaction, not only the rows on this page.'}
      </p>

      <div className="card" style={{ marginBottom: '1.5rem', padding: '1.25rem' }}>
        <div style={filterGrid}>
          <Field label="Search" span={2}>
            <input type="text" className="input-control" placeholder="Customer name, phone or e-mail" maxLength={100} value={search} onChange={(e) => setSearch(e.target.value)} />
          </Field>
          <Field label="Status">
            <select className="input-control" value={status} onChange={(e) => setStatus(e.target.value as LedgerStatus | '')}>
              <option value="">All statuses</option>
              <option value="success">Success</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
            </select>
          </Field>
          <Field label="Method">
            <select className="input-control" value={method} onChange={(e) => setMethod(e.target.value as LedgerMethod | '')}>
              <option value="">All methods</option>
              <option value="razorpay">Razorpay</option>
              <option value="manual">Manual (staff booking)</option>
              <option value="cod">Cash on delivery (migrated)</option>
            </select>
          </Field>
          <Field label="From (Indian date)">
            <input type="date" className="input-control" value={fromDate} max={toDate || undefined} onChange={(e) => setFromDate(e.target.value)} />
          </Field>
          <Field label="To (Indian date)">
            <input type="date" className="input-control" value={toDate} min={fromDate || undefined} onChange={(e) => setToDate(e.target.value)} />
          </Field>
        </div>
      </div>

      <div className="card">
        <div className="table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Txn ID</th>
                <th>Customer</th>
                <th>Type</th>
                <th>Amount</th>
                <th>Method</th>
                <th>Razorpay order</th>
                <th>Invoice</th>
                <th>Status</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <SkeletonRows columns={10} />
              ) : rows.length > 0 ? (
                rows.map((txn) => (
                  <tr key={txn.id}>
                    <td style={mono} title={txn.id}>
                      <Link href={`/transactions/${txn.id}`} style={{ fontFamily: 'monospace' }}>
                        {txn.transactionId || `…${txn.id.slice(-8)}`}
                      </Link>
                    </td>
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
                    <td style={{ fontSize: '0.8rem' }}>{titleCase(txn.method)}</td>
                    <td style={{ ...mono, color: 'var(--text-secondary)' }}>{txn.razorpayOrderId || '—'}</td>
                    <td style={{ fontSize: '0.8rem' }}>{txn.invoiceNo}</td>
                    <td>
                      <StatusPill status={txn.status} />
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{formatDateTime(txn.createdAt)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.35rem' }}>
                        <Link href={`/transactions/${txn.id}`} className="btn btn-secondary" style={tinyButton}>
                          Details
                        </Link>
                        <button type="button" className="btn btn-secondary" style={tinyButton} onClick={() => setSelected(txn)}>
                          Quick view
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <EmptyRow columns={10}>No transactions match these filters.</EmptyRow>
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={page} totalPages={totalPages} total={total} noun="transactions" disabled={isLoading} onChange={setPage} />
      </div>

      {selected && <TransactionDetailModal txn={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

export default function TransactionsPage() {
  return (
    <RequirePermission permission="transactions:read">
      <TransactionsScreen />
    </RequirePermission>
  );
}
