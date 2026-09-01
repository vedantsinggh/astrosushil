import { describe, it, expect } from 'vitest';
import { renderNotificationTemplate } from '../../src/modules/notifications/notification.templates';
import { fcmProvider } from '../../src/modules/notifications/fcm.provider';

describe('Notifications Module Unit Tests', () => {
  it('should render REPORT_READY template correctly', () => {
    const rendered = renderNotificationTemplate('REPORT_READY', {
      userName: 'Astro Client',
      reportName: 'Career Dossier',
      reportId: 'rep-12345',
    });

    expect(rendered.title).toContain('Career Report is Ready');
    expect(rendered.body).toContain('Career Dossier');
    expect(rendered.emailSubject).toContain('Career Dossier');
    expect(rendered.emailHtml).toContain('rep-12345');
    expect(rendered.route).toBe('OPEN_REPORT');
  });

  it('should render PAYMENT_SUCCESS template correctly', () => {
    const rendered = renderNotificationTemplate('PAYMENT_SUCCESS', {
      userName: 'Kundli Buyer',
      amountRupees: '499.00',
      orderId: 'ord-888999',
    });

    expect(rendered.title).toContain('Payment Verified');
    expect(rendered.body).toContain('499.00');
    expect(rendered.emailHtml).toContain('ord-888999');
    expect(rendered.route).toBe('OPEN_PAYMENTS');
  });

  it('should render PASSWORD_RESET template correctly', () => {
    const rendered = renderNotificationTemplate('PASSWORD_RESET', {
      userName: 'User X',
      otp: '778899',
    });

    expect(rendered.title).toContain('Password Reset');
    expect(rendered.body).toContain('778899');
    expect(rendered.emailHtml).toContain('778899');
    expect(rendered.route).toBe('OPEN_LOGIN');
  });

  it('should simulate FCM push delivery cleanly in dev mode', async () => {
    const result = await fcmProvider.sendPushNotification({
      token: 'mock-fcm-device-token-123',
      notification: { title: 'Test Title', body: 'Test Body' },
      data: { type: 'REPORT_READY', entityId: 'r-1', route: 'OPEN_REPORT' },
    });

    expect(result.success).toBe(true);
  });
});
