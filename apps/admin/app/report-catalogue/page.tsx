'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../lib/auth-context';
import { apiErrorMessage } from '../../lib/api/uploads';
import { CatalogItem, fetchReportCatalogue, formatPaise } from '../../lib/api/catalogue';
import { Breadcrumbs, EmptyRow, Notice, PageHeader, PermissionGate, SkeletonRows } from '../../components/catalogue/ui';

const LANGUAGE_NAMES: Record<string, string> = { en: 'English', hi: 'Hindi' };

function ReportCatalogueScreen() {
  const { hasPermission } = useAuth();
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setItems(await fetchReportCatalogue());
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to load the report catalogue'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const columns = 7;

  return (
    <div>
      <Breadcrumbs items={[{ label: 'PDF Reports' }]} />
      <PageHeader
        title="PDF Reports Catalogue"
        subtitle="The reports customers can buy, with their server prices"
        actions={
          <>
            {hasPermission('reports:read') && (
              <Link href="/reports" className="btn btn-primary" style={{ fontSize: '0.85rem' }}>
                Report Orders
              </Link>
            )}
            {hasPermission('payments:read') && (
              <Link href="/payments" className="btn btn-secondary" style={{ fontSize: '0.85rem' }}>
                Payments
              </Link>
            )}
            <button onClick={load} className="btn btn-secondary" style={{ fontSize: '0.85rem' }}>
              Refresh
            </button>
          </>
        }
      />

      <Notice kind="info">
        This list is read-only. Report names, prices, languages and availability are defined in the backend code and are
        changed by a release, not from the admin.
      </Notice>
      {error && <Notice kind="error">{error}</Notice>}

      <div className="card">
        <div className="table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Report</th>
                <th>Type</th>
                <th>Price</th>
                <th>Original Price</th>
                <th>GST</th>
                <th>Languages</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <SkeletonRows columns={columns} />
              ) : items.length > 0 ? (
                items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{item.title}</div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', maxWidth: '420px' }}>{item.description}</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', fontFamily: 'monospace' }}>{item.id}</div>
                    </td>
                    <td>{item.legacyReportType ? <span className="badge badge-info">{item.legacyReportType}</span> : <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                    <td style={{ fontWeight: 600, fontSize: '0.85rem' }}>{formatPaise(item.pricePaise, item.currency)}</td>
                    <td style={{ fontSize: '0.85rem' }}>
                      {item.originalPricePaise !== undefined ? (
                        <span style={{ textDecoration: 'line-through', color: 'var(--text-muted)' }}>{formatPaise(item.originalPricePaise, item.currency)}</span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>—</span>
                      )}
                    </td>
                    <td style={{ fontSize: '0.8rem' }}>
                      {item.taxRateBasisPoints / 100}% {item.taxIncluded ? 'inclusive' : 'exclusive'}
                    </td>
                    <td style={{ fontSize: '0.85rem' }}>
                      {item.languages && item.languages.length > 0 ? (
                        item.languages.map((code) => LANGUAGE_NAMES[code] || code).join(', ')
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>—</span>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${item.isActive ? 'badge-success' : 'badge-warning'}`}>{item.isActive ? 'Active' : 'Inactive'}</span>
                    </td>
                  </tr>
                ))
              ) : (
                <EmptyRow columns={columns}>No report offerings are defined.</EmptyRow>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function ReportCataloguePage() {
  return (
    <PermissionGate permission={['pdf_reports:read', 'reports:read']}>
      <ReportCatalogueScreen />
    </PermissionGate>
  );
}
