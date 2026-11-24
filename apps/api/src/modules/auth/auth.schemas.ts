import { z } from 'zod';

export const birthProfileInputSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date of birth must be YYYY-MM-DD'),
  timeOfBirth: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Time of birth must be HH:mm or HH:mm:ss'),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  timezone: z.string().min(1, 'Timezone is required'),
  placeName: z.string().optional(),
});

const otpCodeSchema = z.string().min(4, 'OTP must be at least 4 digits').max(8, 'OTP must not exceed 8 digits');
const emailAddressSchema = z.string().trim().toLowerCase().email('Invalid email address format').max(254);
const fullNameSchema = z.string().trim().min(1, 'Enter your full name.').max(100, 'Full name must not exceed 100 characters');

// Customer sign-in by one-time code: phone channel
export const phoneSendOtpSchema = z.object({
  phoneNumber: z.string().min(8, 'Phone number is required'),
});

export const phoneVerifyOtpSchema = z.object({
  phoneNumber: z.string().min(8, 'Phone number is required'),
  otp: otpCodeSchema,
  // Used only when the account has no name yet (first sign-in).
  fullName: fullNameSchema.optional(),
  birthProfile: birthProfileInputSchema.optional(),
});

// Customer sign-in by one-time code: e-mail channel
export const emailSendOtpSchema = z.object({
  email: emailAddressSchema,
});

export const emailVerifyOtpSchema = z.object({
  email: emailAddressSchema,
  otp: otpCodeSchema,
  fullName: fullNameSchema.optional(),
  birthProfile: birthProfileInputSchema.optional(),
});

// Account linking (signed-in customer adds and verifies the other identifier)
export const linkPhoneSchema = z.object({
  phoneNumber: z.string().min(8, 'Phone number is required'),
  otp: otpCodeSchema,
});

export const linkEmailSchema = z.object({
  email: emailAddressSchema,
  otp: otpCodeSchema,
});

// Profile completion (name only; phone numbers are linked via OTP)
export const updateProfileSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(1, 'Enter your full name.')
      .max(100, 'Full name must not exceed 100 characters'),
  })
  .strict();

// Staff password reset by e-mailed code (staff accounts only; customers have no password)
export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address format').toLowerCase().trim(),
});

export const resetPasswordSchema = z.object({
  email: z.string().email('Invalid email address format').toLowerCase().trim(),
  otp: z.string().length(6, 'Reset code must be exactly 6 digits'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .max(100, 'Password must not exceed 100 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9!@#$%^&*(),.?":{}|<>]/, 'Password must contain at least one number or special character'),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export const logoutSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export type PhoneSendOtpInput = z.infer<typeof phoneSendOtpSchema>;
export type PhoneVerifyOtpInput = z.infer<typeof phoneVerifyOtpSchema>;
export type EmailSendOtpInput = z.infer<typeof emailSendOtpSchema>;
export type EmailVerifyOtpInput = z.infer<typeof emailVerifyOtpSchema>;
export type LinkPhoneInput = z.infer<typeof linkPhoneSchema>;
export type LinkEmailInput = z.infer<typeof linkEmailSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
export type LogoutInput = z.infer<typeof logoutSchema>;
