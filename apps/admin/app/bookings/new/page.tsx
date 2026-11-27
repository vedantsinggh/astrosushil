'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Booking, ConsultationMode, ConsultationOption, createManualBooking, listConsultationOptions, ManualBookingInput, MODE_LABELS } from '../../../lib/api/bookings';
import { CustomerOption, errorMessage } from '../../../lib/api/sales';
import { basisPointsToPercent, formatDay, formatPaise, percentInputToBasisPoints, rupeeInputToPaise, todayIst } from '../../../components/sales/format';
import { CustomerSearch } from '../../../components/sales/CustomerSearch';
import { SlotPicker } from '../../../components/sales/SlotPicker';
import { ConfirmDialog, ErrorBanner, Field, InfoBox, KeyValue, PageHeader, RequirePermission, SectionTitle, smallButton } from '../../../components/sales/ui';

type DiscountKind = 'NONE' | 'FLAT' | 'PERCENTAGE';

function NewBookingScreen() {
  const [options, setOptions] = useState<ConsultationOption[]>([]);
  const [optionsError, setOptionsError] = useState<string | null>(null);
  const [isLoadingOptions, setIsLoadingOptions] = useState(true);

  const [customerKind, setCustomerKind] = useState<'existing' | 'new'>('existing');
  const [customer, setCustomer] = useState<CustomerOption | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  const [typeId, setTypeId] = useState('');
  const [mode, setMode] = useState<ConsultationMode | ''>('');
  const [date, setDate] = useState('');
  const [slot, setSlot] = useState('');

  const [discountKind, setDiscountKind] = useState<DiscountKind>('NONE');
  const [discountText, setDiscountText] = useState('');
  const [note, setNote] = useState('');

  const [errors, setErrors] = useState<string[]>([]);
  const [pendingBody, setPendingBody] = useState<ManualBookingInput | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [created, setCreated] = useState<Booking | null>(null);

  useEffect(() => {
    listConsultationOptions()
      .then(setOptions)
      .catch((err) => setOptionsError(errorMessage(err)))
      .finally(() => setIsLoadingOptions(false));
  }, []);

  const typeOptions = useMemo(() => {
    const seen = new Map<string, ConsultationOption>();
    for (const option of options) if (!seen.has(option.consultationTypeId)) seen.set(option.consultationTypeId, option);
    return [...seen.values()];
  }, [options]);
  const modeOptions = options.filter((o) => o.consultationTypeId === typeId);
  const chosen = modeOptions.find((o) => o.mode === mode) ?? null;

  const build = (): { errors: string[]; body: ManualBookingInput | null } => {
    const problems: string[] = [];
    if (customerKind === 'existing') {
      if (!customer) problems.push('Choose an existing customer, or switch to “New customer”');
    } else {
      if (!name.trim()) problems.push('Full name is required for a new customer');
      if (phone.trim().length < 6 || phone.trim().length > 20) problems.push('Phone is required for a new customer (6 to 20 characters, with country code)');
      if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) problems.push('The e-mail address is not valid');
    }
    if (!chosen) problems.push('Choose a consultation and a mode');
    // A WhatsApp message consultation has no date or slot.
    const isMessage = chosen?.mode === 'MESSAGE';
    if (!isMessage && !date) problems.push('Choose a date');
    if (!isMessage && !slot) problems.push('Choose a slot');

    let discountValue: number | undefined;
    if (discountKind === 'FLAT') {
      const paise = rupeeInputToPaise(discountText);
      if (paise === null || paise <= 0) problems.push('Enter the flat discount in rupees');
      else if (chosen && paise > chosen.pricePaise) problems.push('The discount cannot be more than the service price');
      else discountValue = paise;
    } else if (discountKind === 'PERCENTAGE') {
      const bp = percentInputToBasisPoints(discountText);
      if (bp === null || bp <= 0 || bp > 10000) problems.push('Enter a percentage above 0 and up to 100');
      else discountValue = bp;
    }
    if (note.length > 1000) problems.push('The note can be at most 1000 characters');

    if (problems.length > 0 || !chosen) return { errors: problems, body: null };
    return {
      errors: problems,
      body: {
        consultationId: chosen.consultationTypeId,
        mode: chosen.mode,
        ...(chosen.mode === 'MESSAGE' ? {} : { date, slot }),
        ...(customerKind === 'existing' && customer ? { userId: customer.id } : { name: name.trim(), phone: phone.trim(), ...(email.trim() ? { email: email.trim() } : {}) }),
        ...(discountKind !== 'NONE' && discountValue !== undefined ? { discountType: discountKind, discountValue } : {}),
        ...(note.trim() ? { note: note.trim() } : {}),
      },
    };
  };

  const review = (event: React.FormEvent) => {
    event.preventDefault();
    const result = build();
    setErrors(result.errors);
    setSaveError(null);
    if (result.body) setPendingBody(result.body);
  };

  const confirm = async () => {
    if (!pendingBody) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      const booking = await createManualBooking(pendingBody);
      setCreated(booking);
      setPendingBody(null);
    } catch (err) {
      setSaveError(errorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  if (created) {
    return (
      <div>
        <PageHeader crumbs={[{ label: 'Bookings', href: '/bookings' }, { label: 'New booking' }]} title="Booking successful" />
        <div className="card" style={{ maxWidth: 560 }}>
          <SectionTitle>
            {created.title} ({MODE_LABELS[created.mode] ?? created.mode})
          </SectionTitle>
          <KeyValue label="Customer">{created.customer?.fullName || created.customerName}</KeyValue>
          <KeyValue label="Date">{formatDay(created.date)}</KeyValue>
          <KeyValue label="Slot (IST)">{created.slot}</KeyValue>
          <KeyValue label="Service price">{formatPaise(created.pricePaise)}</KeyValue>
          <KeyValue label="Discount">− {formatPaise(created.discountPaise)}</KeyValue>
          <KeyValue label="GST">{created.gstPaise === null ? '—' : `${formatPaise(created.gstPaise)} (${basisPointsToPercent(created.gstRateBasisPoints)} ${(created.gstType || '').toLowerCase()})`}</KeyValue>
          <KeyValue label="Total amount">{formatPaise(created.amountPaise)}</KeyValue>
          <KeyValue label="Invoice number">{created.invoiceNumber || 'Invoice being prepared'}</KeyValue>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '0.75rem' }}>
            The booking is confirmed and recorded as a manual payment. The customer has been sent the booking confirmation.
          </p>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
            <Link href={`/bookings/${created.id}`} className="btn btn-primary">
              Open booking
            </Link>
            <Link href="/bookings" className="btn btn-secondary">
              Back to bookings
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={review}>
      <PageHeader
        crumbs={[{ label: 'Bookings', href: '/bookings' }, { label: 'New booking' }]}
        title="New booking"
        subtitle="Book a consultation for a customer who paid outside the website (cash, bank transfer, complimentary)"
        actions={
          <Link href="/bookings" className="btn btn-secondary" style={smallButton}>
            Cancel
          </Link>
        }
      />

      {errors.length > 0 && (
        <div role="alert" className="badge badge-danger" style={{ display: 'block', padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem', whiteSpace: 'normal', textTransform: 'none' }}>
          <div style={{ fontWeight: 700 }}>Please fix the following:</div>
          <ul style={{ margin: '0.25rem 0 0 1.25rem' }}>
            {errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <SectionTitle>1. Customer</SectionTitle>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          <button type="button" className={`btn ${customerKind === 'existing' ? 'btn-primary' : 'btn-secondary'}`} style={smallButton} onClick={() => setCustomerKind('existing')}>
            Existing customer
          </button>
          <button type="button" className={`btn ${customerKind === 'new' ? 'btn-primary' : 'btn-secondary'}`} style={smallButton} onClick={() => setCustomerKind('new')}>
            New customer
          </button>
        </div>
        {customerKind === 'existing' ? (
          customer ? (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', background: 'var(--bg-subtle)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: '0.9rem' }}>
                <strong>{customer.fullName || 'No name'}</strong>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{[customer.phoneNumber, customer.email].filter(Boolean).join(' · ') || '—'}</div>
              </div>
              <button type="button" className="btn btn-secondary" style={smallButton} onClick={() => setCustomer(null)}>
                Change
              </button>
            </div>
          ) : (
            <CustomerSearch onPick={setCustomer} />
          )
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
              <Field label="Full name *">
                <input className="input-control" maxLength={100} value={name} onChange={(e) => setName(e.target.value)} />
              </Field>
              <Field label="Phone * (with country code)">
                <input className="input-control" maxLength={20} placeholder="+919876543210" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </Field>
              <Field label="E-mail">
                <input type="email" className="input-control" maxLength={254} value={email} onChange={(e) => setEmail(e.target.value)} />
              </Field>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.5rem' }}>
              A customer account is created without a password; the customer signs in with a one-time code. If the phone or e-mail already belongs to an account the
              booking is refused: choose that customer under “Existing customer” instead.
            </p>
          </>
        )}
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <SectionTitle>2. Consultation and time</SectionTitle>
        <ErrorBanner message={optionsError ? `Consultations could not be loaded: ${optionsError}` : null} />
        {isLoadingOptions ? (
          <div className="skeleton" style={{ height: '60px', width: '100%' }} />
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
              <Field label="Consultation *">
                <select
                  className="input-control"
                  value={typeId}
                  onChange={(e) => {
                    setTypeId(e.target.value);
                    setMode('');
                    setSlot('');
                  }}
                >
                  <option value="">Choose…</option>
                  {typeOptions.map((o) => (
                    <option key={o.consultationTypeId} value={o.consultationTypeId}>
                      {o.title} · {o.durationMinutes} min{o.isActive ? '' : ' (inactive)'}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Mode *">
                <select className="input-control" value={mode} disabled={!typeId} onChange={(e) => setMode(e.target.value as ConsultationMode | '')}>
                  <option value="">Choose…</option>
                  {modeOptions.map((o) => (
                    <option key={o.mode} value={o.mode}>
                      {MODE_LABELS[o.mode]} — {formatPaise(o.priceWithGstPaise)}
                    </option>
                  ))}
                </select>
              </Field>
              {chosen?.mode !== 'MESSAGE' && <Field label="Date (IST) *" hint={date && date < todayIst() ? 'This date is in the past. Staff may record a past booking.' : undefined}>
                <input
                  type="date"
                  className="input-control"
                  value={date}
                  onChange={(e) => {
                    setDate(e.target.value);
                    setSlot('');
                  }}
                />
              </Field>}
            </div>
            {chosen?.mode === 'MESSAGE' ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>A WhatsApp message consultation has no date or slot. Answer it from the booking page.</p>
            ) : typeId && date ? <SlotPicker date={date} consultationId={typeId} value={slot} onChange={setSlot} /> : <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Choose a consultation and a date to see the slots.</p>}
          </>
        )}
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <SectionTitle>3. Discount and note</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
          <Field label="Discount (optional)">
            <select
              className="input-control"
              value={discountKind}
              onChange={(e) => {
                setDiscountKind(e.target.value as DiscountKind);
                setDiscountText('');
              }}
            >
              <option value="NONE">No discount</option>
              <option value="FLAT">₹ Flat</option>
              <option value="PERCENTAGE">% Off</option>
            </select>
          </Field>
          {discountKind !== 'NONE' && (
            <Field label={discountKind === 'FLAT' ? 'Discount amount (₹)' : 'Discount (%)'} hint={discountKind === 'FLAT' ? 'Taken off the service price' : 'Up to 100, at most two decimals'}>
              <input className="input-control" inputMode="decimal" value={discountText} onChange={(e) => setDiscountText(e.target.value)} />
            </Field>
          )}
          <Field label="Booking note (optional)" hint="Shown to the customer with the booking" span={2}>
            <textarea className="input-control" rows={2} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
        </div>
        {chosen && (
          <div style={{ maxWidth: 420, marginTop: '1rem' }}>
            <KeyValue label="Service price">{formatPaise(chosen.pricePaise)}</KeyValue>
            <KeyValue label="GST">{chosen.gst.enabled ? `${basisPointsToPercent(chosen.gst.rateBasisPoints)} ${chosen.gst.type === 'INCLUSIVE' ? 'included in the price' : 'added on top'}` : 'Not charged'}</KeyValue>
            <KeyValue label="Customer pays without a discount">{formatPaise(chosen.priceWithGstPaise)}</KeyValue>
          </div>
        )}
        <InfoBox>
          The final amount (price, less the discount, with GST) is calculated by the server when the booking is saved, and shown to you straight after. Prices are never
          sent from this form.
        </InfoBox>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
        <Link href="/bookings" className="btn btn-secondary">
          Cancel
        </Link>
        <button type="submit" className="btn btn-primary">
          Review booking
        </button>
      </div>

      {pendingBody && chosen && (
        <ConfirmDialog title="Confirm this booking?" confirmLabel="Confirm booking" busy={isSaving} error={saveError} onConfirm={confirm} onCancel={() => setPendingBody(null)}>
          <KeyValue label="Customer">{customerKind === 'existing' ? customer?.fullName || customer?.phoneNumber || customer?.email : `${name.trim()} (new, ${phone.trim()})`}</KeyValue>
          <KeyValue label="Consultation">
            {chosen.title} ({MODE_LABELS[chosen.mode]})
          </KeyValue>
          <KeyValue label="Date">{formatDay(pendingBody.date)}</KeyValue>
          <KeyValue label="Slot (IST)">{pendingBody.slot}</KeyValue>
          <KeyValue label="Discount">
            {pendingBody.discountType === 'FLAT' ? formatPaise(pendingBody.discountValue) : pendingBody.discountType === 'PERCENTAGE' ? basisPointsToPercent(pendingBody.discountValue) : 'None'}
          </KeyValue>
          <p style={{ marginTop: '0.75rem' }}>
            The booking is confirmed at once and recorded as a <strong>manual payment already received</strong>: it enters the transactions ledger and the GST report and
            gets an invoice number. The customer is sent a confirmation.
          </p>
        </ConfirmDialog>
      )}
    </form>
  );
}

export default function NewBookingPage() {
  return (
    <RequirePermission permission="bookings:create">
      <NewBookingScreen />
    </RequirePermission>
  );
}
