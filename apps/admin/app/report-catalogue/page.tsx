'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../lib/auth-context';
import { apiErrorMessage } from '../../lib/api/uploads';
import { formatPaise, listReportCatalog, ReportCatalogEntry, updateReportCatalogEntry } from '../../lib/api/catalogue';
import { Breadcrumbs, EmptyRow, Notice, PageHeader, PermissionGate, SkeletonRows } from '../../components/catalogue/ui';

const LANGUAGE_NAMES: Record<string, string> = { en: 'English', hi: 'Hindi' };

/**
 * PDF Reports (website admin `/pdfreports`): the reports customers can buy. Staff edit the name,
 * texts, cover, prices, GST, HSN/SAC and availability; the report types themselves are fixed.
 */
function ReportCatalogueScreen() {
  const { hasPermission } = useAuth();
  const canEdit = hasPermission('pdf_reports:update');
  const [items, setItems] = useState<ReportCatalogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [filter, setFilter] = useState<'website' | 'all'>('website');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setItems(await listReportCatalog());
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to load the report catalogue'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const shown = useMemo(() => {
    const list = filter === 'website' ? items.filter((item) => item.websiteProduct) : items;
    return [...list].sort((a, b) => Number(!!b.websiteProduct) - Number(!!a.websiteProduct) || a.effective.name.localeCompare(b.effective.name));
  }, [items, filter]);

  const toggleActive = async (item: ReportCatalogEntry) => {
    setBusyId(item.catalogId);
    setError(null);
    setNotice(null);
    try {
      const updated = await updateReportCatalogEntry(item.catalogId, { isActive: !item.effective.isActive });
      setItems((current) => current.map((entry) => (entry.catalogId === item.catalogId ? updated : entry)));
      setNotice(`${updated.effective.name} is now ${updated.effective.isActive ? 'on sale' : 'off sale'}.`);
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not change the status'));
    } finally {
      setBusyId(null);
    }
  };

  const columns = 7;

  return (
    <div>
      <Breadcrumbs items={[{ label: 'PDF Reports' }]} />
      <PageHeader
        title="PDF Reports"
        subtitle="Name, price, GST, product page content and availability of each report customers can buy"
        actions={
          <>
            <select className="input-control" value={filter} onChange={(e) => setFilter(e.target.value as 'website' | 'all')} style={{ width: 'auto' }}>
              <option value="website">Website reports</option>
              <option value="all">All reports (website and app)</option>
            </select>
            {hasPermission('reports:read') && (
              <Link href="/reports" className="btn btn-secondary">
                Report orders
              </Link>
            )}
            <button onClick={load} className="btn btn-secondary">
              Refresh
            </button>
          </>
        }
      />

      {error && <Notice kind="error">{error}</Notice>}
      {notice && (
        <Notice kind="success" onDismiss={() => setNotice(null)}>
          {notice}
        </Notice>
      )}

      <div className="table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Report</th>
              <th>Generated as</th>
              <th style={{ textAlign: 'right' }}>Price</th>
              <th style={{ textAlign: 'right' }}>GST</th>
              <th style={{ textAlign: 'right' }}>Customer pays</th>
              <th>Languages</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <SkeletonRows columns={columns} />
            ) : shown.length === 0 ? (
              <EmptyRow columns={columns}>No reports.</EmptyRow>
            ) : (
              shown.map((item) => (
                <tr key={item.catalogId}>
                  <td>
                    <Link href={`/report-catalogue/${encodeURIComponent(item.catalogId)}`} style={{ fontWeight: 600 }}>
                      {item.effective.name}
                    </Link>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {item.websiteProduct ? `Website: /${item.effective.slug}` : 'App only'}
                      {item.edits ? ' · edited' : ''}
                    </div>
                  </td>
                  <td style={{ fontSize: '0.82rem' }}>{item.reportType ?? '—'}</td>
                  <td style={{ textAlign: 'right' }}>
                    {formatPaise(item.effective.salePricePaise)}
                    {item.effective.originalPricePaise ? (
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textDecoration: 'line-through' }}>{formatPaise(item.effective.originalPricePaise)}</div>
                    ) : null}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {item.effective.gstRateBp / 100}%<div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{formatPaise(item.effective.gstPaise)}</div>
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatPaise(item.effective.priceWithGstPaise)}</td>
                  <td style={{ fontSize: '0.82rem' }}>{item.languages.map((code) => LANGUAGE_NAMES[code] ?? code).join(', ') || '—'}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <span className={`badge ${item.effective.isActive ? 'badge-success' : 'badge-danger'}`}>{item.effective.isActive ? 'On sale' : 'Off sale'}</span>{' '}
                    {canEdit && (
                      <>
                        <button className="btn btn-secondary" style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }} disabled={busyId !== null} onClick={() => toggleActive(item)}>
                          {busyId === item.catalogId ? '…' : item.effective.isActive ? 'Take off sale' : 'Put on sale'}
                        </button>{' '}
                        <Link href={`/report-catalogue/${encodeURIComponent(item.catalogId)}`} className="btn btn-secondary" style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}>
                          Edit
                        </Link>
                      </>
                    )}
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

export default function ReportCataloguePage() {
  return (
    <PermissionGate permission="pdf_reports:read">
      <ReportCatalogueScreen />
    </PermissionGate>
  );
}
