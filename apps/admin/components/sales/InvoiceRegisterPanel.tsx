'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../lib/auth-context';
import {
  downloadInvoicePdf,
  downloadInvoiceZip,
  errorMessage,
  exportInvoiceRegister,
  getInvoiceRegister,
  InvoiceRegister,
  RegisterPeriodFilter,
} from '../../lib/api/sales';
import { basisPointsToPercent, formatDate, formatPaise } from './format';
import { EmptyRow, ErrorBanner, InfoBox, SectionTitle, SkeletonRows, StatCard, SuccessBanner, smallButton, tinyButton } from './ui';
import { Icon } from '../icons';

type Mode = 'month' | 'fy' | 'range';

const SALE_LABEL: Record<string, string> = { order: 'Product', consultation: 'Consultation', report: 'Report' };

/** Financial year of today in India, e.g. "2026-27". */
function currentFy(): string {
  const ist = new Date(Date.now() + 330 * 60_000);
  const start = ist.getUTCMonth() >= 3 ? ist.getUTCFullYear() : ist.getUTCFullYear() - 1;
  return `${start}-${String((start + 1) % 100).padStart(2, '0')}`;
}

function currentMonth(): string {
  const ist = new Date(Date.now() + 330 * 60_000);
  return `${ist.getUTCFullYear()}-${String(ist.getUTCMonth() + 1).padStart(2, '0')}`;
}

function recentFys(count = 6): string[] {
  const start = Number(currentFy().slice(0, 4));
  return Array.from({ length: count }, (_, i) => {
    const y = start - i;
    return `${y}-${String((y + 1) % 100).padStart(2, '0')}`;
  });
}

/**
 * Invoice register: every GST invoice of a month, a financial year or a date range, with the
 * totals a CA needs (taxable value, CGST, SGST, IGST) and one-click exports: the register as CSV,
 * the HSN/SAC summary (GSTR-1 table 12), the state-wise summary (GSTR-1 B2C) and a ZIP of every
 * invoice PDF with those CSVs.
 */
export function InvoiceRegisterPanel() {
  const { hasPermission } = useAuth();
  const canExport = hasPermission('gst_report:export');
  const canPdf = hasPermission('transactions:read');

  const [mode, setMode] = useState<Mode>('month');
  const [month, setMonth] = useState(currentMonth());
  const [fy, setFy] = useState(currentFy());
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [search, setSearch] = useState('');

  const [data, setData] = useState<InvoiceRegister | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const filter: RegisterPeriodFilter = useMemo(() => {
    if (mode === 'fy') return { fy };
    if (mode === 'range') return { from, to };
    return { month };
  }, [mode, month, fy, from, to]);
  const ready = mode !== 'range' || (from !== '' && to !== '');

  const load = useCallback(async () => {
    if (!ready) return;
    setIsLoading(true);
    setError(null);
    try {
      setData(await getInvoiceRegister(filter));
    } catch (err) {
      setData(null);
      setError(errorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [filter, ready]);

  useEffect(() => {
    load();
  }, [load]);

  const run = async (key: string, action: () => Promise<void>, done: string) => {
    setBusy(key);
    setError(null);
    setNotice(null);
    try {
      await action();
      setNotice(done);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!data) return [];
    if (!q) return data.rows;
    return data.rows.filter((row) =>
      [row.invoiceNumber, row.customerName, row.customerEmail ?? '', row.customerPhone ?? '', row.placeOfSupply, row.gatewayPaymentId ?? '']
        .join(' ')
        .toLowerCase()
        .includes(q)
    );
  }, [data, search]);

  const columns = 11;

  return (
    <div className="card" style={{ marginBottom: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        <div>
          <SectionTitle>GST invoice register</SectionTitle>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.84rem', maxWidth: 720 }}>
            Every numbered invoice (INV-AS/…) of the period, dated by payment. Figures are the same as on the invoice PDFs. Give the ZIP or the CSVs to your CA for GSTR-1, GSTR-3B and the income-tax return.
          </p>
        </div>
        {canExport && (
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              className="btn btn-primary"
              style={smallButton}
              disabled={!ready || busy !== null || !data || data.rows.length === 0}
              onClick={() => run('zip', () => downloadInvoiceZip(filter), 'ZIP downloaded: every invoice PDF of the period with the register, HSN and state summaries.')}
            >
              <Icon name="download" size={14} />
              {busy === 'zip' ? 'Preparing ZIP… (can take a few minutes)' : 'Download all invoices (ZIP)'}
            </button>
            <button className="btn btn-secondary" style={smallButton} disabled={!ready || busy !== null} onClick={() => run('lines', () => exportInvoiceRegister(filter, 'lines'), 'Register CSV downloaded.')}>
              Register CSV
            </button>
            <button className="btn btn-secondary" style={smallButton} disabled={!ready || busy !== null} onClick={() => run('hsn', () => exportInvoiceRegister(filter, 'hsn'), 'HSN summary downloaded.')}>
              HSN summary
            </button>
            <button className="btn btn-secondary" style={smallButton} disabled={!ready || busy !== null} onClick={() => run('states', () => exportInvoiceRegister(filter, 'states'), 'State-wise summary downloaded.')}>
              State-wise summary
            </button>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: '1rem' }}>
        <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          Period
          <select className="input-control" value={mode} onChange={(e) => setMode(e.target.value as Mode)} style={{ display: 'block', marginTop: 4, width: 170 }}>
            <option value="month">Month</option>
            <option value="fy">Financial year</option>
            <option value="range">Date range</option>
          </select>
        </label>
        {mode === 'month' && (
          <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Month
            <input type="month" className="input-control" value={month} onChange={(e) => setMonth(e.target.value)} style={{ display: 'block', marginTop: 4, width: 180 }} />
          </label>
        )}
        {mode === 'fy' && (
          <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Financial year (Apr–Mar)
            <select className="input-control" value={fy} onChange={(e) => setFy(e.target.value)} style={{ display: 'block', marginTop: 4, width: 180 }}>
              {recentFys().map((value) => (
                <option key={value} value={value}>
                  FY {value}
                </option>
              ))}
            </select>
          </label>
        )}
        {mode === 'range' && (
          <>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              From
              <input type="date" className="input-control" value={from} onChange={(e) => setFrom(e.target.value)} style={{ display: 'block', marginTop: 4 }} />
            </label>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              To
              <input type="date" className="input-control" value={to} onChange={(e) => setTo(e.target.value)} style={{ display: 'block', marginTop: 4 }} />
            </label>
          </>
        )}
        <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', flex: '1 1 220px' }}>
          Search
          <input className="input-control" placeholder="Invoice no., customer, state, payment id" value={search} onChange={(e) => setSearch(e.target.value)} style={{ display: 'block', marginTop: 4 }} />
        </label>
        <button className="btn btn-secondary" style={smallButton} onClick={load} disabled={!ready || isLoading}>
          <Icon name="refresh" size={14} /> Refresh
        </button>
      </div>

      <ErrorBanner message={error} />
      <SuccessBanner message={notice} onClose={() => setNotice(null)} />

      {data && (
        <>
          <div className="card-grid">
            <StatCard title="Invoices" value={data.totals.invoices} sub={data.period.label.replace(/_/g, ' ')} />
            <StatCard title="Taxable value" value={formatPaise(data.totals.taxablePaise)} sub="Before GST" />
            <StatCard title="CGST + SGST" value={formatPaise(data.totals.cgstPaise + data.totals.sgstPaise)} sub={`CGST ${formatPaise(data.totals.cgstPaise)} · SGST ${formatPaise(data.totals.sgstPaise)}`} />
            <StatCard title="IGST" value={formatPaise(data.totals.igstPaise)} sub="Other states" />
            <StatCard title="Invoice total" value={formatPaise(data.totals.grandTotalPaise)} sub={data.totals.shippingPaise ? `incl. shipping ${formatPaise(data.totals.shippingPaise)}` : 'INR'} />
          </div>

          {data.missingNumbers.length > 0 && (
            <InfoBox tone="warning" title="Numbers missing from the series">
              {data.missingNumbers.slice(0, 20).join(', ')}
              {data.missingNumbers.length > 20 ? ` and ${data.missingNumbers.length - 20} more` : ''}. They may have been paid in another period; otherwise ask your CA how to report them.
            </InfoBox>
          )}
          {data.linesWithoutHsnSac > 0 && (
            <InfoBox tone="warning" title="HSN/SAC code missing">
              {data.linesWithoutHsnSac} invoice line(s) have no HSN/SAC code. Set the default codes in{' '}
              <Link href="/settings">Website Settings → GST invoice</Link>, or a code on each product or PDF report. New and re-downloaded invoices then print it.
            </InfoBox>
          )}

          {data.byRate.length > 0 && (
            <div className="table-container" style={{ marginBottom: '1rem' }}>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>GST rate</th>
                    <th style={{ textAlign: 'right' }}>Taxable value</th>
                    <th style={{ textAlign: 'right' }}>CGST</th>
                    <th style={{ textAlign: 'right' }}>SGST</th>
                    <th style={{ textAlign: 'right' }}>IGST</th>
                  </tr>
                </thead>
                <tbody>
                  {data.byRate.map((rate) => (
                    <tr key={rate.rateBp}>
                      <td>{basisPointsToPercent(rate.rateBp)}</td>
                      <td style={{ textAlign: 'right' }}>{formatPaise(rate.taxablePaise)}</td>
                      <td style={{ textAlign: 'right' }}>{formatPaise(rate.cgstPaise)}</td>
                      <td style={{ textAlign: 'right' }}>{formatPaise(rate.sgstPaise)}</td>
                      <td style={{ textAlign: 'right' }}>{formatPaise(rate.igstPaise)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      <div className="table-container" style={{ maxHeight: 620, overflowY: 'auto' }}>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Invoice no.</th>
              <th>Date</th>
              <th>Type</th>
              <th>Customer</th>
              <th>Place of supply</th>
              <th>HSN/SAC</th>
              <th style={{ textAlign: 'right' }}>Taxable</th>
              <th style={{ textAlign: 'right' }}>CGST + SGST</th>
              <th style={{ textAlign: 'right' }}>IGST</th>
              <th style={{ textAlign: 'right' }}>Total</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <SkeletonRows columns={columns} />
            ) : !ready ? (
              <EmptyRow columns={columns}>Choose a from and a to date.</EmptyRow>
            ) : rows.length === 0 ? (
              <EmptyRow columns={columns}>No invoices in this period.</EmptyRow>
            ) : (
              rows.map((row) => (
                <tr key={row.orderId}>
                  <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{row.invoiceNumber}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{formatDate(row.invoiceDate)}</td>
                  <td>{SALE_LABEL[row.saleType] ?? row.saleType}</td>
                  <td>
                    <div>{row.customerName}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{row.customerPhone || row.customerEmail || ''}</div>
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>{row.placeOfSupply}</td>
                  <td>{row.hsnSac.length ? row.hsnSac.join(', ') : <span className="badge badge-warning">Missing</span>}</td>
                  <td style={{ textAlign: 'right' }}>{formatPaise(row.taxablePaise)}</td>
                  <td style={{ textAlign: 'right' }}>{row.cgstPaise + row.sgstPaise ? formatPaise(row.cgstPaise + row.sgstPaise) : '—'}</td>
                  <td style={{ textAlign: 'right' }}>{row.igstPaise ? formatPaise(row.igstPaise) : '—'}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>
                    {formatPaise(row.grandTotalPaise)}
                    {row.currency !== 'INR' && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 400 }}>paid in {row.currency}</div>}
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    {canPdf && (
                      <button
                        className="btn btn-secondary"
                        style={tinyButton}
                        disabled={busy !== null}
                        onClick={() => run(row.orderId, () => downloadInvoicePdf(row.orderId), `${row.invoiceNumber} downloaded.`)}
                      >
                        {busy === row.orderId ? '…' : 'PDF'}
                      </button>
                    )}{' '}
                    <Link href={`/invoices/orders/${row.orderId}`} className="btn btn-secondary" style={tinyButton}>
                      View
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
