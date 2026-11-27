import { messagingEnv } from '../config';
import type { WhatsAppTemplateKey } from '../config';

/**
 * WhatChimp template variables, exactly as the website sends them
 * (src/service/sendWhatsapp.js): same variable names, same positions, same
 * fallbacks. The approved template ids come from the environment
 * (see WHATSAPP_TEMPLATE_ENV in ../config).
 */

export interface WhatsAppTemplatePayload {
  template: WhatsAppTemplateKey;
  variables: Record<string, string>;
}

/** Fixed support number written into the approved booking templates' call instructions. */
const SUPPORT_CALL_PHONE = '+91 9125000013';

/**
 * Booking slots are a "HH:mm-HH:mm" range. Only in-person bookings show just the
 * start time; audio/video keep the full range.
 */
export const formatSlotTime = (slot: string | undefined | null, mode: string | undefined | null): string =>
  slot && mode === 'in_person' ? String(slot).split('-')[0] : slot || '';

export const capitalizeMode = (mode: string | undefined | null): string => {
  if (!mode) return '-';
  return mode
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export const buildCallInstructions = (mode: string | undefined | null): string => {
  if (mode === 'video') {
    return `On the day and time of your appointment, please make a WhatsApp or Botim video call to ${SUPPORT_CALL_PHONE}`;
  }
  if (mode === 'in_person') {
    return `For meeting coordination, please call this number ${SUPPORT_CALL_PHONE}`;
  }
  return `Please call this number ${SUPPORT_CALL_PHONE} on the date and time of your appointment. (You may also use WhatsApp or Botim for voice call)`;
};

export interface BookingWhatsAppData {
  userName?: string | null;
  consultationTitle?: string | null;
  date?: string | null;
  mode?: string | null;
  slot?: string | null;
  /** Display amount in major units, e.g. "1500" or "1499.50". */
  amount?: string | number | null;
  includes?: string[];
}

const bookingVariables = (d: BookingWhatsAppData): Record<string, string> => ({
  'templateVariable-Username-1': d.userName || 'User',
  'templateVariable-Consultation-2': d.consultationTitle || 'Consultation',
  'templateVariable-Date-3': d.date || '-',
  'templateVariable-ServiceMode-4': capitalizeMode(d.mode),
  'templateVariable-slot-5': formatSlotTime(d.slot, d.mode) || '-',
  'templateVariable-ordervalue-6': String(d.amount || 0),
  'templateVariable-Include-7': d.includes && d.includes.length > 0 ? d.includes.join(', ') : '-',
  'templateVariable-CallInstructions-8': buildCallInstructions(d.mode),
});

const dashboard = (tab: string): string => `${messagingEnv().frontendUrl}/dashboard?tab=${tab}`;

export const whatsappTemplates = {
  /** Variables of the approved WhatChimp "announcement" template: the customer's name and the message. */
  ANNOUNCEMENT: ({ name, message }: { name: string; message: string }): WhatsAppTemplatePayload => ({
    template: 'ANNOUNCEMENT',
    variables: { 'templateVariable-Name-1': name, 'templateVariable-Message-2': message },
  }),

  OTP: ({ otp }: { otp: string }): WhatsAppTemplatePayload => ({
    template: 'OTP',
    variables: { 'templateVariable-otp-2': otp },
  }),

  /** Uses the digital-order template (with a 6th variable) when a download link is given. */
  ORDER: ({
    name,
    orderId,
    productName,
    status = 'Confirmed',
    downloadLink,
  }: {
    name: string;
    orderId: string;
    productName: string;
    status?: string;
    downloadLink?: string | null;
  }): WhatsAppTemplatePayload => ({
    template: downloadLink ? 'DIGITAL_ORDER' : 'ORDER',
    variables: {
      'templateVariable-Username-1': name,
      'templateVariable-OrderID-2': orderId,
      'templateVariable-ProductorServiceName-3': productName,
      'templateVariable-OrderStatus-4': status,
      'templateVariable-Invoicelink-5': dashboard('orders'),
      ...(downloadLink ? { 'templateVariable-Downloadlink-6': downloadLink } : {}),
    },
  }),

  REPORT_ORDER_CONFIRMED: ({ userName }: { userName?: string | null }): WhatsAppTemplatePayload => ({
    template: 'REPORT_ORDER_CONFIRMED',
    variables: { 'templateVariable-User-Name-1': userName || 'User' },
  }),

  REPORT_READY: ({ reportName, reportUrl }: { reportName: string; reportUrl: string }): WhatsAppTemplatePayload => ({
    template: 'REPORT_READY',
    variables: {
      'templateVariable-ReportName-1': reportName,
      'templateVariable-Reportlink-2': reportUrl,
      'templateVariable-Invoicelink-3': dashboard('reports'),
    },
  }),

  BOOKING_CONFIRMED: (d: BookingWhatsAppData): WhatsAppTemplatePayload => ({
    template: 'BOOKING_CONFIRMED',
    variables: { ...bookingVariables(d), 'templateVariable-Invoicelink-9': dashboard('consultations') },
  }),

  BOOKING_UPDATED: (d: BookingWhatsAppData): WhatsAppTemplatePayload => ({
    template: 'BOOKING_UPDATED',
    variables: { ...bookingVariables(d), 'templateVariable-Invoicelink-9': dashboard('consultations') },
  }),

  /** The reschedule template has 8 variables (no invoice link), as on the website. */
  CONSULTATION_RESCHEDULE: (d: BookingWhatsAppData): WhatsAppTemplatePayload => ({
    template: 'CONSULTATION_RESCHEDULE',
    variables: bookingVariables(d),
  }),

  CONSULTATION_REMINDER: ({
    userName,
    consultationTitle,
    date,
    slot,
    mode,
  }: {
    userName: string;
    consultationTitle: string;
    date: string;
    slot: string;
    mode: string;
  }): WhatsAppTemplatePayload => ({
    template: 'CONSULTATION_REMINDER',
    variables: {
      'templateVariable-User-Name-1': userName,
      'templateVariable-consultationTitle-2': consultationTitle,
      'templateVariable-Date-3': `${date} at ${formatSlotTime(slot, mode)}`,
    },
  }),
};
