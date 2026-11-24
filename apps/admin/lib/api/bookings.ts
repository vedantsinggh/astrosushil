/**
 * API functions for consultation types, availability and bookings.
 * Backend contract: docs/integration/modules/bookings.md.
 *
 * The calendar is Indian Standard Time: a date is an IST day (YYYY-MM-DD), a time is HH:mm IST.
 * Money is INR paise; GST rates are basis points (1800 = 18%). Prices are never sent with a booking.
 */
import { callData, downloadCsv, jsonBody, qs, QueryValue } from './sales';

export type ConsultationMode = 'AUDIO' | 'VIDEO' | 'IN_PERSON';
export type GstType = 'INCLUSIVE' | 'EXCLUSIVE';

export const CONSULTATION_MODES: ConsultationMode[] = ['AUDIO', 'VIDEO', 'IN_PERSON'];
export const MODE_LABELS: Record<ConsultationMode, string> = { AUDIO: 'Audio', VIDEO: 'Video', IN_PERSON: 'In person' };

// ---------------------------------------------------------------------------
// Consultation types
// ---------------------------------------------------------------------------

export interface GstConfig {
  enabled: boolean;
  rateBasisPoints: number;
  type: GstType;
}

export interface ConsultationModeView {
  mode: ConsultationMode;
  catalogId: string;
  pricePaise: number;
  gst: GstConfig;
  priceWithGstPaise: number;
  gstPaise: number;
  taxablePaise: number;
}

export interface ConsultationType {
  id: string;
  legacyId: string | null;
  title: string;
  type: 'normal' | 'special';
  description: string | null;
  includes: string[];
  durationMinutes: number;
  responseDays: number;
  priceLabel: string | null;
  note: string | null;
  isActive: boolean;
  modes: ConsultationModeView[];
  unavailableDates: string[];
  createdAt: string | null;
  updatedAt: string | null;
}

export interface ConsultationModeInput {
  mode: ConsultationMode;
  pricePaise?: number;
  gst?: Partial<GstConfig>;
  /** On update: remove this mode. */
  _delete?: boolean;
}

export interface ConsultationTypeInput {
  title: string;
  type?: 'normal' | 'special';
  description?: string | null;
  responseDays?: number;
  includes?: string[];
  durationMinutes: number;
  priceLabel?: string | null;
  note?: string | null;
  isActive?: boolean;
  modes: ConsultationModeInput[];
}

/** One row per type and mode (booking forms). */
export interface ConsultationOption {
  id: string;
  consultationTypeId: string;
  catalogId: string;
  title: string;
  type: 'normal' | 'special';
  mode: ConsultationMode;
  pricePaise: number;
  priceWithGstPaise: number;
  gst: GstConfig;
  durationMinutes: number;
  isActive: boolean;
  createdAt: string | null;
}

export function listConsultationTypes(): Promise<ConsultationType[]> {
  return callData<ConsultationType[]>('/admin/consultation-types');
}

export function listConsultationOptions(): Promise<ConsultationOption[]> {
  return callData<ConsultationOption[]>('/admin/consultation-types/flat');
}

export function getConsultationType(id: string): Promise<ConsultationType> {
  return callData<ConsultationType>(`/admin/consultation-types/${encodeURIComponent(id)}`);
}

export function createConsultationType(body: ConsultationTypeInput): Promise<ConsultationType> {
  return callData<ConsultationType>('/admin/consultation-types', jsonBody('POST', body));
}

export function updateConsultationType(id: string, body: Partial<ConsultationTypeInput>): Promise<ConsultationType> {
  return callData<ConsultationType>(`/admin/consultation-types/${encodeURIComponent(id)}`, jsonBody('PUT', body));
}

export function deleteConsultationType(id: string): Promise<null> {
  return callData<null>(`/admin/consultation-types/${encodeURIComponent(id)}`, jsonBody('DELETE'));
}

/** Both return the type's full list of blocked dates after the change. */
export function blockConsultationTypeDate(id: string, date: string): Promise<string[]> {
  return callData<string[]>(`/admin/consultation-types/${encodeURIComponent(id)}/block-date`, jsonBody('POST', { date }));
}

export function unblockConsultationTypeDate(id: string, date: string): Promise<string[]> {
  return callData<string[]>(`/admin/consultation-types/${encodeURIComponent(id)}/unblock-date`, jsonBody('POST', { date }));
}

// ---------------------------------------------------------------------------
// Availability
// ---------------------------------------------------------------------------

export interface Availability {
  startTime: string;
  endTime: string;
  slotDuration: number;
  gap: number;
  breakStartTime: string | null;
  breakEndTime: string | null;
  /** 0 = Sunday ... 6 = Saturday. */
  blockedWeekdays: number[];
  bookingHorizonDays: number | null;
}

export interface ScheduleDay {
  date: string;
  isBlocked: boolean;
  /** "HH:mm-HH:mm". */
  blockedSlots: string[];
}

export interface AdminSlot {
  slot: string;
  startTime: string;
  endTime: string;
  /** booked: a confirmed booking overlaps. held: a customer is paying for it right now. */
  status: 'available' | 'booked' | 'held';
  /** Blocked for customers. Staff may still book it. */
  blocked: boolean;
}

export function getAvailability(): Promise<Availability> {
  return callData<Availability>('/admin/availability');
}

export function saveAvailability(body: Availability): Promise<Availability> {
  return callData<Availability>('/admin/availability', jsonBody('PUT', body));
}

export function blockDay(date: string): Promise<ScheduleDay> {
  return callData<ScheduleDay>('/admin/availability/block-day', jsonBody('POST', { date }));
}

export function unblockDay(date: string): Promise<ScheduleDay> {
  return callData<ScheduleDay>('/admin/availability/unblock-day', jsonBody('POST', { date }));
}

export function blockRange(from: string, to: string): Promise<ScheduleDay[]> {
  return callData<ScheduleDay[]>('/admin/availability/block-range', jsonBody('POST', { from, to }));
}

export function unblockRange(from: string, to: string): Promise<ScheduleDay[]> {
  return callData<ScheduleDay[]>('/admin/availability/unblock-range', jsonBody('POST', { from, to }));
}

export function blockSlots(date: string, slots: string[]): Promise<ScheduleDay> {
  return callData<ScheduleDay>('/admin/availability/block-slots', jsonBody('POST', { date, slots }));
}

export function unblockSlots(date: string, slots: string[]): Promise<ScheduleDay> {
  return callData<ScheduleDay>('/admin/availability/unblock-slots', jsonBody('POST', { date, slots }));
}

export function getSchedule(date: string): Promise<ScheduleDay> {
  return callData<ScheduleDay>(`/admin/availability/schedule${qs({ date })}`);
}

/** Fully blocked dates (YYYY-MM-DD) of a month; `month` is 1 to 12. */
export function getBlockedDates(month: number, year: number): Promise<string[]> {
  return callData<string[]>(`/admin/availability/blocked-dates${qs({ month, year })}`);
}

/** Every slot of a date with its state. `consultationId` (a type id or catalog id) sets the slot length. */
export function getAdminSlots(date: string, consultationId?: string): Promise<AdminSlot[]> {
  return callData<AdminSlot[]>(`/admin/availability/slots${qs({ date, consultationId })}`);
}

// ---------------------------------------------------------------------------
// Bookings
// ---------------------------------------------------------------------------

export type BookingStatus = 'PENDING_PAYMENT' | 'CONFIRMED' | 'RESCHEDULED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW' | 'REFUNDED';

export interface BookingAdminNote {
  id: string;
  bookingId: string;
  action: string;
  note: string | null;
  changes: unknown;
  addedByName: string | null;
  addedById: string | null;
  createdAt: string;
}

export interface Booking {
  id: string;
  userId: string;
  orderId: string | null;
  consultationId: string;
  consultationTypeId: string | null;
  title: string;
  mode: ConsultationMode;
  durationMinutes: number;
  date: string;
  startTime: string;
  endTime: string;
  slot: string;
  timing: 'upcoming' | 'past';
  timezone: string;
  status: BookingStatus;
  source: 'USER' | 'ADMIN';
  paymentMethod: 'RAZORPAY' | 'MANUAL' | string | null;
  customerName: string;
  customerPhone: string | null;
  customerEmail: string | null;
  primaryQuestion: string | null;
  meetingLink: string | null;
  locationAddress: string | null;
  internalNotes: string | null;
  rescheduleReason: string | null;
  cancellationReason: string | null;
  cancelledAt: string | null;
  confirmedAt: string | null;
  completedAt: string | null;
  pricePaise: number | null;
  discountType: 'FLAT' | 'PERCENTAGE' | null;
  /** FLAT: paise. PERCENTAGE: basis points. */
  discountValue: number | null;
  discountPaise: number;
  gstRateBasisPoints: number | null;
  gstType: GstType | null;
  taxablePaise: number | null;
  gstPaise: number | null;
  amountPaise: number | null;
  paidCurrency: string | null;
  paidAmountMinor: number | null;
  exchangeRate: string | null;
  priceLabel: string | null;
  note: string | null;
  invoiceNumber: string | null;
  reminderSentAt: string | null;
  createdByAdminId: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  customer: { id: string; fullName: string | null; phoneNumber: string | null; email: string | null } | null;
  consultation: { id: string | null; title: string; durationMinutes: number; kind: string | null };
  order: { id: string; amount: number; currency: string; paymentStatus: string; status: string } | null;
  birthProfile: { id: string; name: string; dateOfBirth: string; timeOfBirth: string | null; placeName: string | null } | null;
  adminNotes: BookingAdminNote[];
}

export interface BookingFilters {
  search?: string;
  /** Booked-on range (IST days). */
  fromDate?: string;
  toDate?: string;
  /** Appointment date. */
  date?: string;
  consultationTypeId?: string;
  mode?: ConsultationMode | '';
  source?: 'USER' | 'ADMIN' | '';
}

export interface BookingListResult {
  items: Booking[];
  total: number;
  page: number;
  limit: number;
  counts: { upcoming: number; past: number };
}

function bookingQuery(filters: BookingFilters): Record<string, QueryValue> {
  return {
    search: filters.search?.trim(),
    fromDate: filters.fromDate,
    toDate: filters.toDate,
    date: filters.date,
    consultationTypeId: filters.consultationTypeId,
    mode: filters.mode,
    source: filters.source,
  };
}

export function listBookings(tab: 'upcoming' | 'past', filters: BookingFilters, page: number, limit: number): Promise<BookingListResult> {
  return callData<BookingListResult>(`/admin/bookings${qs({ ...bookingQuery(filters), tab, page, limit })}`);
}

/** CSV of every booking matching the filters, upcoming and past together (written by the server). */
export function exportBookingsCsv(filters: BookingFilters): Promise<void> {
  return downloadCsv(`/admin/bookings/export${qs({ ...bookingQuery(filters), format: 'csv' })}`, 'bookings.csv');
}

export function listBookingsByDate(date: string): Promise<Booking[]> {
  return callData<Booking[]>(`/admin/bookings/by-date${qs({ date })}`);
}

/** Paid orders whose booking holds no slot. */
export function listPaymentConflicts(): Promise<Booking[]> {
  return callData<Booking[]>('/admin/bookings/payment-conflicts');
}

export function getBooking(id: string): Promise<Booking> {
  return callData<Booking>(`/admin/bookings/${encodeURIComponent(id)}`);
}

export interface ManualBookingInput {
  /** A consultation type id or a mode's catalog id. */
  consultationId: string;
  mode?: ConsultationMode;
  date: string;
  /** "HH:mm-HH:mm". */
  slot: string;
  userId?: string;
  name?: string;
  phone?: string;
  email?: string;
  discountType?: 'FLAT' | 'PERCENTAGE';
  /** FLAT: paise. PERCENTAGE: basis points (1250 = 12.5%). */
  discountValue?: number;
  note?: string;
}

export function createManualBooking(body: ManualBookingInput): Promise<Booking> {
  return callData<Booking>('/admin/bookings', jsonBody('POST', body));
}

export function rescheduleBooking(id: string, body: { date: string; slot: string; adminNote?: string }): Promise<Booking> {
  return callData<Booking>(`/admin/bookings/${encodeURIComponent(id)}/reschedule`, jsonBody('PATCH', body));
}

export function changeBookingPlan(
  id: string,
  body: { consultationId: string; mode?: ConsultationMode; adminNote?: string }
): Promise<Booking> {
  return callData<Booking>(`/admin/bookings/${encodeURIComponent(id)}/change-plan`, jsonBody('PATCH', body));
}

export function addBookingNote(id: string, note: string): Promise<Booking> {
  return callData<Booking>(`/admin/bookings/${encodeURIComponent(id)}/notes`, jsonBody('POST', { note }));
}

export function deleteBooking(id: string): Promise<Booking> {
  return callData<Booking>(`/admin/bookings/${encodeURIComponent(id)}`, jsonBody('DELETE'));
}

export interface BookingInvoiceData {
  bookingId: string;
  invoiceNumber: string | null;
  invoiceStatus: 'allocated' | 'pending';
  issuedAt: string;
  paymentMethod: string | null;
  orderId: string | null;
  customer: { id: string; name: string | null; phone: string | null; email: string | null };
  consultation: {
    title: string;
    mode: ConsultationMode;
    durationMinutes: number;
    priceLabel: string | null;
    date: string;
    slot: string;
    timezone: string;
  };
  amounts: {
    currency: string;
    pricePaise: number | null;
    discountType: 'FLAT' | 'PERCENTAGE' | null;
    discountValue: number | null;
    discountPaise: number;
    taxablePaise: number | null;
    gstRateBasisPoints: number | null;
    gstType: GstType | null;
    gstPaise: number | null;
    totalPaise: number | null;
    paidCurrency: string;
    paidAmountMinor: number | null;
    exchangeRate: string;
  };
  note: string | null;
}

export function getBookingInvoice(id: string): Promise<BookingInvoiceData> {
  return callData<BookingInvoiceData>(`/admin/bookings/${encodeURIComponent(id)}/invoice`);
}
