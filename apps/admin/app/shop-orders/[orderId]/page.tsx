'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAuth } from '../../../lib/auth-context';
import {
  errorMessage,
  getShopOrder,
  refundOrder,
  SHOP_ORDER_SETTABLE_STATUSES,
  ShopOrderDetail,
  ShopOrderStatus,
  updateShopOrderStatus,
} from '../../../lib/api/sales';
import { formatDateTime, formatMinor, formatPaise, shortId, titleCase } from '../../../components/sales/format';
import { StatusPill } from '../../../components/sales/badges';
import {
  ConfirmDialog,
  dangerButton,
  Field,
  InfoBox,
  KeyValue,
  PageHeader,
  RequirePermission,
  SectionTitle,
  smallButton,
  SuccessBanner,
} from '../../../components/sales/ui';

interface TimelineStep {
  label: string;
  at: string | null;
  done: boolean;
  current: boolean;
}

const PHYSICAL_STEPS: ShopOrderStatus[] = ['placed', 'confirmed', 'processing', 'shipped', 'delivered'];
const DIGITAL_STEPS: ShopOrderStatus[] = ['placed', 'confirmed', 'delivered'];
const STEP_LABELS: Record<string, string> = {
  placed: 'Order placed',
  confirmed: 'Confirmed',
  processing: 'Processing',
  shipped: 'Shipped',
  delivered: 'Delivered',
};

/** The website's "Order Tracking" steps, with the dates this backend stores (paid, dispatched, delivered). */
function buildTimeline(order: ShopOrderDetail): TimelineStep[] {
  const steps = order.orderType === 'digital' ? DIGITAL_STEPS : PHYSICAL_STEPS;
  const status = order.orderStatus;
  const currentIndex = status ? steps.indexOf(status) : -1;
  const dates: Record<string, string | null> = {
    placed: order.paidAt || order.createdAt,
    shipped: order.dispatchedAt,
    delivered: order.deliveredAt,
  };
  return steps.map((step, index) => ({
    label: STEP_LABELS[step],
    at: index <= currentIndex ? dates[step] ?? null : null,
    done: currentIndex >= 0 && index < currentIndex,
    current: index === currentIndex,
  }));
}

function ShopOrderDetailScreen() {
  const params = useParams();
  const orderId = params.orderId as string;
  const { hasPermission } = useAuth();
  const canUpdate = hasPermission('orders:update');
  const canSeeInvoice = hasPermission('transactions:read');
  const canRefund = hasPermission('payments:refund');

  const [order, setOrder] = useState<ShopOrderDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [nextStatus, setNextStatus] = useState<ShopOrderStatus | ''>('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [courierPartner, setCourierPartner] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [refundOpen, setRefundOpen] = useState(false);
  const [refundReason, setRefundReason] = useState('');
  const [partialAmountInr, setPartialAmountInr] = useState('');
  const [refundBusy, setRefundBusy] = useState(false);
  const [refundError, setRefundError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getShopOrder(orderId);
      setOrder(data);
      setTrackingNumber(data.trackingNumber || '');
      setCourierPartner(data.courierPartner || '');
      setNextStatus('');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    load();
  }, [load]);

  const saveStatus = async () => {
    if (!nextStatus) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      await updateShopOrderStatus(orderId, {
        orderStatus: nextStatus,
        ...(trackingNumber.trim() ? { trackingNumber: trackingNumber.trim() } : {}),
        ...(courierPartner.trim() ? { courierPartner: courierPartner.trim() } : {}),
      });
      setConfirmOpen(false);
      setNotice('Order status updated successfully');
      await load();
    } catch (err) {
      setSaveError(errorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  const handleRefund = async () => {
    if (refundReason.trim().length < 3) {
      setRefundError('A refund reason (minimum 3 characters) is required.');
      return;
    }
    let amountPaise: number | undefined;
    if (partialAmountInr.trim()) {
      const parsed = Number(partialAmountInr.trim());
      if (!Number.isFinite(parsed) || parsed <= 0) {
        setRefundError('Partial refund amount must be a positive number.');
        return;
      }
      amountPaise = Math.round(parsed * 100);
    }

    setRefundBusy(true);
    setRefundError(null);
    try {
      const result = await refundOrder(orderId, {
        reason: refundReason.trim(),
        ...(amountPaise ? { amountPaise } : {}),
      });
      setRefundOpen(false);
      setNotice(`Refund ${result.refund.id} issued (${result.refund.status}). Order status is now ${result.order.status}.`);
      await load();
    } catch (err) {
      setRefundError(errorMessage(err));
    } finally {
      setRefundBusy(false);
    }
  };

  if (isLoading) {
    return (
      <div>
        <div className="skeleton" style={{ height: '30px', width: '250px', marginBottom: '1rem' }} />
        <div className="skeleton" style={{ height: '180px', width: '100%', marginBottom: '1.5rem' }} />
        <div className="skeleton" style={{ height: '300px', width: '100%' }} />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--badge-danger-text)', marginBottom: '0.5rem' }}>Order not available</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>{error || 'Unable to load this order'}</p>
        <Link href="/shop-orders" className="btn btn-secondary">
          ← Back to Shop Orders
        </Link>
      </div>
    );
  }

  const isCancelled = order.orderStatus === 'cancelled';
  const isPaid = order.payment.status === 'paid';
  const address = order.shippingAddress;
  const timeline = buildTimeline(order);
  // An unpaid order can only be cancelled (the server enforces this).
  const statusOptions = SHOP_ORDER_SETTABLE_STATUSES.filter((s) => s !== order.orderStatus && (isPaid || s === 'cancelled'));

  return (
    <div>
      <PageHeader
        crumbs={[{ label: 'Shop Orders', href: '/shop-orders' }, { label: shortId(order.id) }]}
        title={`Order ${shortId(order.id)}`}
        subtitle={
          <>
            Placed on {formatDateTime(order.createdAt)} · <StatusPill status={order.orderStatus} /> <span className="badge badge-info">{titleCase(order.orderType)}</span>
          </>
        }
        actions={
          <>
            {canSeeInvoice && (
              <Link href={`/invoices/orders/${order.id}`} className="btn btn-secondary" style={smallButton}>
                Invoice data
              </Link>
            )}
            <button type="button" className="btn btn-secondary" style={smallButton} onClick={load}>
              Refresh
            </button>
          </>
        }
      />

      <SuccessBanner message={notice} onClose={() => setNotice(null)} />

      {order.stockShortfall && order.stockShortfall.length > 0 && (
        <InfoBox tone="warning" title="Stock shortfall on this order">
          When this order was paid there was not enough stock for {order.stockShortfall.length} item(s):{' '}
          {order.stockShortfall
            .map((s) => {
              const item = order.items.find((i) => i.id === s.orderItemId);
              return `${item?.name ?? s.productId} (short by ${s.missing})`;
            })
            .join(', ')}
          . Arrange the stock or contact the customer before shipping.
        </InfoBox>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(280px, 1fr)', gap: '1.5rem', alignItems: 'start' }}>
        <div style={{ display: 'grid', gap: '1.5rem' }}>
          <div className="card">
            <SectionTitle>Order items</SectionTitle>
            <div className="table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Qty</th>
                    <th>MRP</th>
                    <th>Price</th>
                    <th>GST</th>
                    <th>Coupon share</th>
                    <th>Line total</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                          {item.image && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={item.image} alt="" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 'var(--radius-sm)' }} />
                          )}
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{item.name}</div>
                            {item.variantName && <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>{item.variantName}</div>}
                          </div>
                        </div>
                      </td>
                      <td>{item.quantity}</td>
                      <td style={{ color: 'var(--text-secondary)', textDecoration: item.mrp > item.price ? 'line-through' : 'none' }}>{formatPaise(item.mrp)}</td>
                      <td>{formatPaise(item.price)}</td>
                      <td style={{ fontSize: '0.8rem' }}>
                        {item.taxRate}% {item.taxType}
                        <div style={{ color: 'var(--text-secondary)' }}>{formatPaise(item.taxAmount)}</div>
                      </td>
                      <td>{item.discount ? `− ${formatPaise(item.discount)}` : '—'}</td>
                      <td style={{ fontWeight: 600 }}>{formatPaise(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ maxWidth: '340px', marginLeft: 'auto', marginTop: '1rem' }}>
              <KeyValue label="Items subtotal">{formatPaise(order.subTotal)}</KeyValue>
              <KeyValue label={order.coupon ? `Discount (coupon ${order.coupon.code})` : 'Discount'}>− {formatPaise(order.discount)}</KeyValue>
              <KeyValue label="Shipping">{formatPaise(order.shipping)}</KeyValue>
              <KeyValue label="GST added on top">{formatPaise(order.tax)}</KeyValue>
              <KeyValue label="GST in total (incl. in prices)">{formatPaise(order.taxTotal)}</KeyValue>
              <KeyValue label="Total amount (INR)">{formatPaise(order.totalAmount)}</KeyValue>
            </div>
          </div>

          <div className="card">
            <SectionTitle>Order tracking</SectionTitle>
            {isCancelled ? (
              <div>
                <div style={{ fontWeight: 700, color: 'var(--badge-danger-text)' }}>Order cancelled{order.cancelledAt ? ` on ${formatDateTime(order.cancelledAt)}` : ''}</div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                  This order was cancelled and will not be processed further.
                  {isPaid ? ' The payment was captured and is not refunded automatically.' : ''}
                </p>
              </div>
            ) : order.orderStatus === 'payment_pending' || order.orderStatus === 'payment_failed' ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                {order.orderStatus === 'payment_pending' ? 'Waiting for the customer to pay. Tracking starts once the payment is captured.' : 'The payment failed. Nothing will be shipped.'}
              </p>
            ) : (
              <ol style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {timeline.map((step) => (
                  <li key={step.label} style={{ display: 'flex', gap: '0.75rem', alignItems: 'baseline', padding: '0.4rem 0' }}>
                    <span
                      aria-hidden
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        flexShrink: 0,
                        background: step.done || step.current ? 'var(--accent-primary)' : 'var(--border-color)',
                      }}
                    />
                    <span style={{ fontWeight: step.current ? 700 : 500, color: step.done || step.current ? 'var(--text-primary)' : 'var(--text-muted)', fontSize: '0.9rem' }}>
                      {step.label}
                      {step.current && <span style={{ color: 'var(--accent-primary)', fontSize: '0.75rem', marginLeft: '0.5rem' }}>Current status</span>}
                    </span>
                    {step.at && <span style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', marginLeft: 'auto' }}>{formatDateTime(step.at)}</span>}
                  </li>
                ))}
              </ol>
            )}
            {(order.trackingNumber || order.courierPartner) && (
              <div style={{ marginTop: '0.75rem' }}>
                <KeyValue label="Courier">{order.courierPartner || '—'}</KeyValue>
                <KeyValue label="Tracking number">{order.trackingNumber || '—'}</KeyValue>
              </div>
            )}
          </div>

          {order.notes && (
            <div className="card">
              <SectionTitle>Order notes</SectionTitle>
              <p style={{ fontSize: '0.85rem', whiteSpace: 'pre-wrap' }}>{order.notes}</p>
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gap: '1.5rem' }}>
          {canUpdate && (
            <div className="card">
              <SectionTitle>Update status</SectionTitle>
              {isCancelled ? (
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>This order has been cancelled and cannot be updated.</p>
              ) : (
                <div style={{ display: 'grid', gap: '0.75rem' }}>
                  <Field label="New status" hint={!isPaid ? 'An order that has not been paid can only be cancelled.' : undefined}>
                    <select className="input-control" value={nextStatus} onChange={(e) => setNextStatus(e.target.value as ShopOrderStatus | '')}>
                      <option value="">Choose…</option>
                      {statusOptions.map((s) => (
                        <option key={s} value={s}>
                          {titleCase(s)}
                        </option>
                      ))}
                    </select>
                  </Field>
                  {nextStatus === 'shipped' && (
                    <>
                      <Field label="Courier partner (optional)">
                        <input className="input-control" maxLength={100} value={courierPartner} onChange={(e) => setCourierPartner(e.target.value)} />
                      </Field>
                      <Field label="Tracking number (optional)">
                        <input className="input-control" maxLength={100} value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} />
                      </Field>
                    </>
                  )}
                  {nextStatus && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      Change: {titleCase(order.orderStatus)} → {titleCase(nextStatus)}
                    </div>
                  )}
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={!nextStatus}
                    onClick={() => {
                      setSaveError(null);
                      setConfirmOpen(true);
                    }}
                  >
                    Update status
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="card">
            <SectionTitle>Payment</SectionTitle>
            <KeyValue label="Status">
              <StatusPill status={order.payment.status} />
            </KeyValue>
            <KeyValue label="Method">{titleCase(order.payment.method)}</KeyValue>
            <KeyValue label="Charged">{formatMinor(order.payment.amountMinor, order.payment.currency)}</KeyValue>
            {order.payment.currency !== order.baseCurrency && <KeyValue label={`Rate (${order.payment.currency} per 1 INR)`}>{order.exchangeRate}</KeyValue>}
            <KeyValue label="Paid at">{formatDateTime(order.paidAt)}</KeyValue>
            <KeyValue label="Razorpay order ID">{order.payment.razorpayOrderId || '—'}</KeyValue>
            <KeyValue label="Transaction ID">{order.payment.transactionId || '—'}</KeyValue>
            {canRefund && isPaid && (
              <div style={{ marginTop: '1rem' }}>
                <button
                  type="button"
                  className="btn"
                  style={{ ...dangerButton, ...smallButton, width: '100%' }}
                  onClick={() => {
                    setRefundReason('');
                    setPartialAmountInr('');
                    setRefundError(null);
                    setRefundOpen(true);
                  }}
                >
                  Issue Staff Refund
                </button>
              </div>
            )}
          </div>

          <div className="card">
            <SectionTitle>Customer</SectionTitle>
            <KeyValue label="Name">{order.user?.fullName || '—'}</KeyValue>
            <KeyValue label="E-mail">{order.user?.email || '—'}</KeyValue>
            <KeyValue label="Phone">{order.user?.phoneNumber || '—'}</KeyValue>
            <KeyValue label="User ID">{order.user ? shortId(order.user.id) : '—'}</KeyValue>
          </div>

          {address && (
            <div className="card">
              <SectionTitle>Shipping address</SectionTitle>
              <div style={{ fontSize: '0.85rem', lineHeight: 1.6 }}>
                <div style={{ fontWeight: 600 }}>{address.fullName}</div>
                <div>{address.addressLine1}</div>
                {address.addressLine2 && <div>{address.addressLine2}</div>}
                {address.landmark && <div>Landmark: {address.landmark}</div>}
                <div>
                  {[address.city, address.state].filter(Boolean).join(', ')} {address.postalCode ? `– ${address.postalCode}` : ''}
                </div>
                {address.country && <div>{address.country}</div>}
                {address.phone && <div>Phone: {address.phone}</div>}
              </div>
            </div>
          )}

          <div className="card">
            <SectionTitle>Order info</SectionTitle>
            <KeyValue label="Order ID">
              <span style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{order.id}</span>
            </KeyValue>
            <KeyValue label="Type">{titleCase(order.orderType)}</KeyValue>
            <KeyValue label="Created">{formatDateTime(order.createdAt)}</KeyValue>
            <KeyValue label="Updated">{formatDateTime(order.updatedAt)}</KeyValue>
          </div>
        </div>
      </div>

      {confirmOpen && nextStatus && (
        <ConfirmDialog
          title={nextStatus === 'cancelled' ? 'Cancel this order?' : 'Update order status?'}
          confirmLabel={nextStatus === 'cancelled' ? 'Cancel order' : 'Update status'}
          danger={nextStatus === 'cancelled'}
          busy={isSaving}
          error={saveError}
          onConfirm={saveStatus}
          onCancel={() => setConfirmOpen(false)}
        >
          {nextStatus === 'cancelled' ? (
            <>
              The order will be marked cancelled and cannot be changed again.
              {isPaid ? ' The customer has already paid: cancelling does not refund the payment.' : ''} The customer is notified of the new status.
            </>
          ) : (
            <>
              The order will move from <strong>{titleCase(order.orderStatus)}</strong> to <strong>{titleCase(nextStatus)}</strong> and the customer is notified.
            </>
          )}
        </ConfirmDialog>
      )}

      {refundOpen && (
        <ConfirmDialog
          title="Issue Staff Refund"
          confirmLabel="Issue Refund"
          danger
          busy={refundBusy}
          error={refundError}
          onConfirm={handleRefund}
          onCancel={() => setRefundOpen(false)}
        >
          <p style={{ marginBottom: '0.75rem' }}>
            Issue a refund for order <code>{shortId(order.id)}</code> (charged {formatMinor(order.payment.amountMinor, order.payment.currency)}).
          </p>
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            <Field label="Reason (required, min 3 chars)">
              <input
                type="text"
                className="input-control"
                placeholder="e.g. Order cancelled / item damaged"
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
              />
            </Field>
            <Field label="Partial amount in INR (optional)" hint="Leave blank to refund the full refundable balance.">
              <input
                type="number"
                step="0.01"
                min="0.01"
                className="input-control"
                placeholder="Leave blank for full refund"
                value={partialAmountInr}
                onChange={(e) => setPartialAmountInr(e.target.value)}
              />
            </Field>
          </div>
        </ConfirmDialog>
      )}

    </div>
  );
}

export default function ShopOrderDetailPage() {
  return (
    <RequirePermission permission="orders:read">
      <ShopOrderDetailScreen />
    </RequirePermission>
  );
}
