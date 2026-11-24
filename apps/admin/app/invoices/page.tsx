'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/auth-context';
import {
  allocatePendingInvoices,
  AllocatePendingResult,
  errorMessage,
  getInvoiceCounter,
  initializeInvoiceCounter,
  InvoiceCounterState,
} from '../../lib/api/sales';
import {
  ConfirmDialog,
  ErrorBanner,
  Field,
  InfoBox,
  KeyValue,
  mono,
  PageHeader,
  SectionTitle,
  smallButton,
  StatCard,
  SuccessBanner,
} from '../../components/sales/ui';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function InvoiceLookup() {
  const router = useRouter();
  const [orderId, setOrderId] = useState('');
  const [error, setError] = useState<string | null>(null);

  const open = (event: React.FormEvent) => {
    event.preventDefault();
    const id = orderId.trim();
    if (!UUID.test(id)) {
      setError('Enter the full order ID (36 characters, as shown on the order or transaction).');
      return;
    }
    router.push(`/invoices/orders/${id}`);
  };

  return (
    <div className="card" style={{ marginBottom: '1.5rem' }}>
      <SectionTitle>View invoice data</SectionTitle>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
        Invoice data of any sale, by order ID. You can also open it from a shop order, a transaction or a booking. The printable PDF is not available yet.
      </p>
      <form onSubmit={open} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 320px' }}>
          <input
            className="input-control"
            placeholder="Order ID, e.g. 3f2c1e9a-…"
            value={orderId}
            onChange={(e) => {
              setOrderId(e.target.value);
              setError(null);
            }}
          />
          {error && <div style={{ fontSize: '0.72rem', color: 'var(--badge-danger-text)', marginTop: '0.2rem' }}>{error}</div>}
        </div>
        <button type="submit" className="btn btn-primary">
          Open invoice
        </button>
      </form>
    </div>
  );
}

function CounterPanel() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const [state, setState] = useState<InvoiceCounterState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [confirmValue, setConfirmValue] = useState('');
  const [allowEmpty, setAllowEmpty] = useState(false);
  const [ownerApproved, setOwnerApproved] = useState(false);
  const [initOpen, setInitOpen] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [isInitialising, setIsInitialising] = useState(false);

  const [allocateOpen, setAllocateOpen] = useState(false);
  const [allocateError, setAllocateError] = useState<string | null>(null);
  const [isAllocating, setIsAllocating] = useState(false);
  const [allocateResult, setAllocateResult] = useState<AllocatePendingResult | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setState(await getInvoiceCounter());
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const initialise = async () => {
    setIsInitialising(true);
    setInitError(null);
    try {
      const result = await initializeInvoiceCounter({ confirmLastValue: confirmValue.trim(), ...(allowEmpty ? { allowEmpty: true } : {}) });
      setInitOpen(false);
      setConfirmValue('');
      setOwnerApproved(false);
      setAllowEmpty(false);
      setNotice(`Invoice counter initialised at ${result.lastValue}. The next invoice will be ${result.nextNumber}.`);
      await load();
    } catch (err) {
      setInitError(errorMessage(err));
    } finally {
      setIsInitialising(false);
    }
  };

  const allocate = async () => {
    setIsAllocating(true);
    setAllocateError(null);
    try {
      const result = await allocatePendingInvoices();
      setAllocateResult(result);
      setAllocateOpen(false);
      setNotice(`Allocated ${result.allocated.length} invoice number(s); ${result.stillPending.length} still pending; ${result.failures.length} failed.`);
      await load();
    } catch (err) {
      setAllocateError(errorMessage(err));
    } finally {
      setIsAllocating(false);
    }
  };

  if (isLoading) return <div className="skeleton" style={{ height: '240px', width: '100%' }} />;
  if (error || !state) {
    return (
      <>
        <ErrorBanner message={error || 'The invoice counter could not be loaded'} />
        <button type="button" className="btn btn-secondary" style={smallButton} onClick={load}>
          Try again
        </button>
      </>
    );
  }

  const { analysis } = state;
  const historyEmpty = analysis.highest === '0';
  const valueIsNumber = /^\d+$/.test(confirmValue.trim());
  const valueMatches = valueIsNumber && BigInt(confirmValue.trim()) === BigInt(analysis.highest);
  const canSubmitInit = valueMatches && ownerApproved && (!historyEmpty || allowEmpty);

  return (
    <>
      <SuccessBanner message={notice} onClose={() => setNotice(null)} />

      <div className="card-grid">
        <StatCard
          title="Counter"
          value={state.initialised ? 'Initialised' : 'Not initialised'}
          sub={state.initialised ? `Last number issued: ${state.lastValue}` : 'No invoice numbers are being issued'}
        />
        <StatCard title="Next invoice number" value={state.nextNumber ?? '—'} sub="One series (INV-AS/n) for orders, consultations and reports" />
        <StatCard title="Pending invoices" value={state.pendingInvoices} sub="Paid sales still labelled “Invoice being prepared”" />
        <StatCard title="Numbering" value={state.paused ? 'Paused' : 'On'} sub={state.paused ? 'Paused in server configuration: sales stay pending' : 'Numbers are issued when a sale is paid'} />
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <SectionTitle>Stored invoice numbers</SectionTitle>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
          A report on every invoice number in the database (including those migrated from the website). Duplicates and malformed values are reported, never repaired.
        </p>
        <KeyValue label="Numbers stored">{analysis.total}</KeyValue>
        <KeyValue label="Well-formed (INV-AS/n)">{analysis.wellFormed}</KeyValue>
        <KeyValue label="Highest number">{analysis.highest}</KeyValue>
        <KeyValue label="Next after the highest">{analysis.nextNumber}</KeyValue>
        <KeyValue label="Duplicated values">{analysis.duplicates.length}</KeyValue>
        <KeyValue label="Malformed values">{analysis.malformed.length}</KeyValue>
        {analysis.duplicates.length > 0 && (
          <details style={{ marginTop: '0.75rem' }}>
            <summary style={{ cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>Duplicates ({analysis.duplicates.length})</summary>
            <ul style={{ fontSize: '0.8rem', margin: '0.5rem 0 0 1.25rem' }}>
              {analysis.duplicates.map((d) => (
                <li key={d.value}>
                  Value {d.value} used {d.count} times: <span style={mono}>{d.numbers.join(', ')}</span>
                </li>
              ))}
            </ul>
          </details>
        )}
        {analysis.malformed.length > 0 && (
          <details style={{ marginTop: '0.75rem' }}>
            <summary style={{ cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>Malformed ({analysis.malformed.length})</summary>
            <div style={{ ...mono, marginTop: '0.5rem', wordBreak: 'break-word' }}>{analysis.malformed.join(', ')}</div>
          </details>
        )}
      </div>

      {!state.initialised && (
        <div className="card" style={{ marginBottom: '1.5rem', borderLeft: '4px solid var(--badge-warning-text)' }}>
          <SectionTitle>Initialise the invoice counter · Super Admin only · once</SectionTitle>
          <InfoBox tone="warning" title="Read before using">
            <p>
              Until the counter is initialised no invoice number is issued: paid sales are left &ldquo;Invoice being prepared&rdquo; and are numbered afterwards.
              Initialising sets where the INV-AS series continues from. It can be done <strong>once</strong> and cannot be undone or changed from this panel.
            </p>
            <ol style={{ margin: '0.5rem 0 0 1.25rem' }}>
              <li>The website&rsquo;s invoices must already be imported, so that every past invoice number is in the database.</li>
              <li>Review the report above: the highest number, the duplicates and the malformed values.</li>
              <li>Get the owner&rsquo;s approval that the highest number shown is the last invoice really issued.</li>
              <li>Type that approved number below. Then use &ldquo;Allocate pending invoices&rdquo; to number sales paid in the meantime.</li>
            </ol>
            <p style={{ marginTop: '0.5rem' }}>
              The server refuses the request if the number you type differs from the highest stored number, if the counter already exists, or if no imported invoice
              number is found at all.
            </p>
          </InfoBox>

          {!isSuperAdmin ? (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Only a Super Admin can initialise the counter.</p>
          ) : (
            <div style={{ display: 'grid', gap: '0.75rem', maxWidth: '520px' }}>
              <Field
                label="Last invoice number already issued (digits only)"
                hint={`It must equal the highest stored number (${analysis.highest}). The next invoice would then be ${analysis.nextNumber}.`}
                error={confirmValue && !valueIsNumber ? 'Digits only, for example 118' : confirmValue && !valueMatches ? `This is not the highest stored number (${analysis.highest}); the server will refuse it.` : null}
              >
                <input className="input-control" inputMode="numeric" value={confirmValue} onChange={(e) => setConfirmValue(e.target.value)} placeholder={analysis.highest} />
              </Field>
              <label style={{ display: 'flex', gap: '0.5rem', fontSize: '0.85rem', alignItems: 'flex-start' }}>
                <input type="checkbox" checked={ownerApproved} onChange={(e) => setOwnerApproved(e.target.checked)} />
                <span>The owner has approved this number as the last invoice issued.</span>
              </label>
              {historyEmpty && (
                <label style={{ display: 'flex', gap: '0.5rem', fontSize: '0.85rem', alignItems: 'flex-start', color: 'var(--badge-danger-text)' }}>
                  <input type="checkbox" checked={allowEmpty} onChange={(e) => setAllowEmpty(e.target.checked)} />
                  <span>
                    No imported invoice number was found. Start an empty series from INV-AS/01 anyway. <strong>For a development database only</strong>: on the live system
                    import the website invoices first, because the series must continue from its last number.
                  </span>
                </label>
              )}
              <div>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={!canSubmitInit}
                  onClick={() => {
                    setInitError(null);
                    setInitOpen(true);
                  }}
                >
                  Initialise counter…
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {state.initialised && (
        <div className="card" style={{ marginBottom: '1.5rem', borderLeft: '4px solid var(--badge-warning-text)' }}>
          <SectionTitle>Allocate pending invoices · Super Admin only</SectionTitle>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '0.75rem', lineHeight: 1.5 }}>
            Gives the next invoice numbers, in order of payment, to paid sales that have none yet (up to 200 per run), and creates a ledger row for a paid sale that is
            missing one. Numbers already issued are never changed, and a number once given cannot be taken back. The server also does this by itself every few minutes,
            so this button is only needed to hurry it up. Currently pending: <strong>{state.pendingInvoices}</strong>.
            {state.paused ? ' Numbering is paused in the server configuration, so the server will refuse this.' : ''}
          </p>
          {isSuperAdmin ? (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                setAllocateError(null);
                setAllocateOpen(true);
              }}
            >
              Allocate pending invoices…
            </button>
          ) : (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Only a Super Admin can run this.</p>
          )}

          {allocateResult && (
            <div style={{ marginTop: '1rem' }}>
              <SectionTitle>Last run</SectionTitle>
              {allocateResult.allocated.length === 0 && allocateResult.stillPending.length === 0 && allocateResult.failures.length === 0 && (
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Nothing needed a number.</p>
              )}
              {allocateResult.allocated.length > 0 && (
                <div className="table-container">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Invoice number</th>
                        <th>Order</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allocateResult.allocated.map((row) => (
                        <tr key={row.orderId}>
                          <td style={{ fontWeight: 600 }}>{row.number}</td>
                          <td>
                            <Link href={`/invoices/orders/${row.orderId}`} style={mono}>
                              {row.orderId}
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {allocateResult.stillPending.length > 0 && (
                <p style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>
                  Still pending: <span style={mono}>{allocateResult.stillPending.join(', ')}</span>
                </p>
              )}
              {allocateResult.failures.length > 0 && (
                <ul style={{ fontSize: '0.8rem', margin: '0.5rem 0 0 1.25rem', color: 'var(--badge-danger-text)' }}>
                  {allocateResult.failures.map((f) => (
                    <li key={f.orderId}>
                      <span style={mono}>{f.orderId}</span>: {f.message}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}

      {initOpen && (
        <ConfirmDialog
          title="Initialise the invoice counter?"
          confirmLabel={`Initialise at ${confirmValue.trim()}`}
          danger
          busy={isInitialising}
          error={initError}
          onConfirm={initialise}
          onCancel={() => setInitOpen(false)}
        >
          The INV-AS series will continue from <strong>{confirmValue.trim()}</strong>: the next invoice issued will be <strong>{analysis.nextNumber}</strong>. This can be
          done only once and cannot be undone from this panel. The action is recorded in the audit log under your account.
        </ConfirmDialog>
      )}

      {allocateOpen && (
        <ConfirmDialog
          title="Allocate pending invoices?"
          confirmLabel="Allocate numbers"
          busy={isAllocating}
          error={allocateError}
          onConfirm={allocate}
          onCancel={() => setAllocateOpen(false)}
        >
          Up to 200 paid sales without an invoice number will each receive the next number, starting at <strong>{state.nextNumber}</strong>, oldest payment first. Issued
          numbers are permanent. The action is recorded in the audit log under your account.
        </ConfirmDialog>
      )}
    </>
  );
}

export default function InvoicesPage() {
  const { hasPermission } = useAuth();
  const canSeeCounter = hasPermission('gst_report:read');
  const canSeeInvoices = hasPermission('transactions:read');

  if (!canSeeCounter && !canSeeInvoices) {
    return (
      <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--badge-danger-text)', marginBottom: '0.5rem' }}>No access</h2>
        <p style={{ color: 'var(--text-secondary)' }}>
          This screen needs the <code>transactions:read</code> permission (invoice data) or <code>gst_report:read</code> (invoice counter).
        </p>
      </div>
    );
  }

  return (
    <div>
      <PageHeader crumbs={[{ label: 'Invoices' }]} title="Invoices" subtitle="Invoice data of a sale, and the INV-AS invoice number series" />
      {canSeeInvoices && <InvoiceLookup />}
      {canSeeCounter ? (
        <CounterPanel />
      ) : (
        <InfoBox>The invoice counter is shown to staff with the gst_report:read permission.</InfoBox>
      )}
    </div>
  );
}
