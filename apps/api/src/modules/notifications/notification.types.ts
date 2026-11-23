export type NotificationChannel = 'PUSH' | 'EMAIL' | 'IN_APP';

export type NotificationType =
  | 'REPORT_READY'
  | 'REPORT_STARTED'
  | 'REPORT_DELAYED'
  | 'REPORT_FAILED'
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
  /**
   * Set to false when the caller raises the website's SMS / WhatsApp / e-mail event
   * itself (notification.events.ts), so notification.bridge.ts does not raise it too.
   * Default: the bridge adds the website's channels for the types it knows.
   */
  websiteChannels?: boolean;
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
    /** QUEUED: accepted by the outbox; delivery (with retries) is recorded in outbound_messages. */
    email?: { status: 'SENT' | 'QUEUED' | 'SKIPPED' | 'FAILED' };
  };
}
