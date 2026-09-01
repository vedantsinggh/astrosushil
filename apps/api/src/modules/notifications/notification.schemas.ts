import { z } from 'zod';

export const registerDeviceTokenSchema = z.object({
  fcmToken: z.string().min(1, 'FCM token is required'),
  deviceType: z.enum(['ANDROID', 'IOS', 'WEB']).optional().default('ANDROID'),
});

export const updateNotificationPreferencesSchema = z.object({
  pushEnabled: z.boolean().optional(),
  emailEnabled: z.boolean().optional(),
  astrologyReminders: z.boolean().optional(),
  reportAlerts: z.boolean().optional(),
  promotions: z.boolean().optional(),
});

export const sendTestNotificationSchema = z.object({
  title: z.string().optional(),
  body: z.string().optional(),
});

export type RegisterDeviceTokenInput = z.infer<typeof registerDeviceTokenSchema>;
export type UpdateNotificationPreferencesInput = z.infer<typeof updateNotificationPreferencesSchema>;
export type SendTestNotificationInput = z.infer<typeof sendTestNotificationSchema>;
