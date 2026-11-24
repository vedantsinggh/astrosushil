'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../lib/auth-context';
import { errorMessage, exportGstReportCsv, getGstReport, GstReportFilters, GstReportRow, GstReportSummary, LedgerStatus, LedgerType } from '../../lib/api/sales';
import { formatDate, formatPaise } from '../../components/sales/format';
import { StatusPill } from '../../components/sales/badges';
import { EmptyRow, ErrorBanner, Field, filterGrid, PageHeader, RequirePermission, SkeletonRows, smallButton, StatCard, SuccessBanner } from '../../components/sales/ui';

const TYPE_LABELS: Record<LedgerType, string> = { order: 'Product Order', consultation: 'Consultation', report: 'Astrology Report' };

function GstReportScreen() {
  const { hasPermission } = useAuth();
  const canExport = hasPermission('gst_report:export');

  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [transactionType, setTransactionType] = useState<LedgerType | ''>('');
  const [status, setStatus] = useState<LedgerStatus | ''>('success');
  const [newestFirst, setNewestFirst] = useState(false);

  const [rows, setRows] = useState<GstReportRow[]>([]);
  const [summary, setSummary] = useState<GstReportSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const filters: GstReportFilters = { fromDate, toDate, status, transactionType };
  const filterKey = JSON.stringify(filters);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getGstReport(JSON.parse(filterKey) as GstReportFilters);
      setRows(result.rows);
      setSummary(result.summary);
    } catch (err) {
      setRows([]);
      setSummary(null);
      setError(errorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [filterKey]);

  useEffect(() => {
    load();
  }, [load]);

  // The server sends oldest first; this only reverses the order shown.
  const shown = useMemo(() => (newestFirst ? [...rows].reverse() : rows), [rows, newestFirst]);

  const exportCsv = async () => {
    setIsExporting(true);
    setError(null);
    try {
      await exportGstReportCsv(filters);
      setNotice('The GST report CSV was downloaded (oldest first). The export is recorded in the audit log.');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div>
      <PageHeader
        crumbs={[{ label: 'GST Report' }]}
        title="GST Sales Register"
        subtitle="Invoice-wise tax breakdown across orders, consultations and reports. All amounts are in INR; dates are Indian calendar days."
        actions={
          <>
            {canExport && (
              <button type="button" className="btn btn-secondary" style={smallButton} onClick={exportCsv} disabled={isExporting || isLoading || rows.length === 0}>
                {isExporting ? 'Exporting…' : 'Export CSV'}
              </button>
            )}
            <button type="button" className="btn btn-secondary" style={smallButton} onClick={load}>
              Refresh
            </button>
          </>
        }
      />

      <ErrorBanner message={error} />
      <SuccessBanner message={notice} onClose={() => setNotice(null)} />

      <div className="card" style={{ marginBottom: '1.5rem', padding: '1.25rem' }}>
        <div style={filterGrid}>
          <Field label="From">
            <input type="date" className="input-control" value={fromDate} max={toDate || undefined} onChange={(e) => setFromDate(e.target.value)} />
          </Field>
          <Field label="To">
            <input type="date" className="input-control" value={toDate} min={fromDate || undefined} onChange={(e) => setToDate(e.target.value)} />
          </Field>
          <Field label="Type">
            <select className="input-control" value={transactionType} onChange={(e) => setTransactionType(e.target.value as LedgerType | '')}>
              <option value="">All types</option>
              <option value="order">Product orders</option>
              <option value="consultation">Consultations</option>
              <option value="report">Astrology reports</option>
            </select>
          </Field>
          <Field label="Payment status" hint="A GST return uses paid sales only.">
            <select className="input-control" value={status} onChange={(e) => setStatus(e.target.value as LedgerStatus | '')}>
              <option value="success">Paid only</option>
              <option value="pending">Pending only</option>
              <option value="failed">Failed only</option>
              <option value="">All statuses</option>
            </select>
          </Field>
        </div>
      </div>

      <div className="card-grid">
        <StatCard title="Invoices" value={summary ? summary.count : '—'} sub="Rows in this report" />
        <StatCard title="Taxable value" value={summary ? formatPaise(summary.taxableTotal) : '—'} />
        <StatCard title="GST collected" value={summary ? formatPaise(summary.gstTotal) : '—'} />
        <StatCard title="Grand total" value={summary ? formatPaise(summary.grandTotal) : '—'} />
      </div>
      <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '-0.75rem 0 1.25rem' }}>
        Totals are calculated by the server. A sale stays in this register even if its order was later cancelled: it records what was collected at the time of sale.
      </p>

      <div className="card">
        <div className="table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>
                  <button
                    type="button"
                    onClick={() => setNewestFirst((v) => !v)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', font: 'inherit', color: 'inherit', padding: 0 }}
                    title="Reverse the order"
                  >
                    Date {newestFirst ? '↓' : '↑'}
                  </button>
                </th>
                <th>Invoice No</th>
                <th>Type</th>
                <th>Customer</th>
                <th>Place of supply</th>
                <th>Taxable value</th>
                <th>GST rate</th>
                <th>GST type</th>
                <th>GST amount</th>
                <th>Total</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <SkeletonRows columns={11} />
              ) : shown.length > 0 ? (
                shown.map((row) => (
                  <tr key={row.transactionId}>
                    <td style={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>{formatDate(row.date)}</td>
                    <td style={{ fontSize: '0.8rem', fontWeight: 600 }}>{row.invoiceNo}</td>
                    <td style={{ fontSize: '0.8rem' }}>{TYPE_LABELS[row.type] ?? row.type}</td>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{row.customerName}</div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>{row.customerEmail}</div>
                    </td>
                    <td style={{ fontSize: '0.8rem' }}>{row.placeOfSupply}</td>
                    <td>{formatPaise(row.taxableAmount)}</td>
                    <td style={{ fontSize: '0.8rem' }}>{row.gstRateLabel}</td>
                    <td style={{ fontSize: '0.8rem' }}>{row.gstType}</td>
                    <td>{formatPaise(row.gstAmount)}</td>
                    <td style={{ fontWeight: 600 }}>{formatPaise(row.totalAmount)}</td>
                    <td>
                      <StatusPill status={row.paymentStatus} />
                    </td>
                  </tr>
                ))
              ) : (
                <EmptyRow columns={11}>No transactions in this period.</EmptyRow>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function GstReportPage() {
  return (
    <RequirePermission permission="gst_report:read">
      <GstReportScreen />
    </RequirePermission>
  );
}
