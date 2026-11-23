export interface RenderedEmail {
  subject: string;
  html: string;
}

export interface OtpEmailData {
  otp: string;
  /** Shown as "This code expires in N minutes". The website read OTP_TTL_MINUTES (default 5). */
  expiryMinutes?: number;
}

export interface WelcomeEmailData {
  name: string;
}

export interface ResetPasswordEmailData {
  link: string;
}

export interface ContactAdminEmailData {
  name: string;
  email: string;
  phone?: string | null;
  subject?: string | null;
  message: string;
}

export interface ContactUserEmailData {
  name: string;
  message: string;
}

export interface EmailProductLine {
  name: string;
  quantity?: number;
  /** Major units (rupees), as the website's templates expect. */
  price?: number;
}

export interface EmailAddress {
  addressLine1: string;
  city: string;
  state: string;
  pincode: string;
}

export interface OrderEmailData {
  userName: string;
  orderStatus: string;
  orderId: string;
  products?: EmailProductLine[];
  subTotal?: number;
  totalAmount: number;
  shipping?: number;
  address?: EmailAddress | null;
  orderType?: string;
  currency?: string;
  downloadLink?: string | null;
}

export interface OrderAdminEmailData {
  userName: string;
  userEmail?: string | null;
  userPhone?: string | null;
  orderId: string;
  products?: EmailProductLine[];
  totalAmount: number;
  currency?: string;
  orderStatus: string;
}

export interface BookingEmailData {
  userName: string;
  bookingId: string;
  consultationTitle: string;
  includes?: string[];
  mode: string;
  date: string;
  slot: string;
  /** Major units (rupees). */
  amount?: number;
  currency?: string;
}

export interface BookingReminderEmailData {
  userName: string;
  bookingId: string;
  consultationTitle: string;
  mode: string;
  date: string;
  slot: string;
}

export interface BookingRescheduleEmailData {
  userName: string;
  bookingId: string;
  consultationTitle: string;
  oldDate: string;
  oldSlot: string;
  newDate: string;
  newSlot: string;
  mode: string;
  amount?: number;
  currency?: string;
}

export interface BookingAdminEmailData extends BookingEmailData {
  userEmail?: string | null;
  userPhone?: string | null;
}

export interface BookingRescheduleAdminEmailData extends BookingRescheduleEmailData {
  userEmail?: string | null;
  userPhone?: string | null;
}

export interface ReportOrderConfirmedEmailData {
  userName: string;
  reportName: string;
}

export interface ReportReadyEmailData {
  name: string;
  reportName: string;
  reportUrl: string;
}
