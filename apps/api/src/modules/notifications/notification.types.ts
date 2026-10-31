export type NotificationChannel = 'PUSH' | 'EMAIL' | 'IN_APP';

export type NotificationType =
  | 'REPORT_READY'
  | 'PAYMENT_SUCCESS'
  | 'SECURITY_ALERT'
  | 'ASTROLOGY_REMINDER'
  | 'WELCOME_EMAIL'
  | 'PASSWORD_RESET'
  | 'PROMOTIONAL'
  | 'SYSTEM'
  | 'BOOKING_CONFIRMED'
  | 'BOOKING_RESCHEDULED'
  | 'BOOKING_CANCELLED'
  | 'CONSULTATION_REMINDER';

export interface SendNotificationOptions {
  userId: string;
  type: NotificationType;
  entityId?: string;
  route?: string;
  customTitle?: string;
  customBody?: string;
  templateData?: Record<string, any>;
  channels?: NotificationChannel[];
  idempotencyKey?: string;
}

export interface FcmPushPayload {
  token: string;
  notification: {
    title: string;
    body: string;
  };
  data: {
    type: string;
    entityId?: string;
    route?: string;
    [key: string]: string | undefined;
  };
}

export interface NotificationSendResult {
  notificationId?: string;
  channels: {
    inApp?: { status: 'SENT' | 'SKIPPED' | 'FAILED' };
    push?: { status: 'SENT' | 'SKIPPED' | 'FAILED'; sentCount: number; failedCount: number };
    email?: { status: 'SENT' | 'SKIPPED' | 'FAILED' };
  };
}
