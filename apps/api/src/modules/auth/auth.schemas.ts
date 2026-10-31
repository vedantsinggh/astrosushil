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

// Phone Number + OTP Schemas
export const phoneSendOtpSchema = z.object({
  phoneNumber: z.string().min(8, 'Phone number is required'),
});

export const phoneVerifyOtpSchema = z.object({
  phoneNumber: z.string().min(8, 'Phone number is required'),
  otp: z.string().min(4, 'OTP must be at least 4 digits').max(8, 'OTP must not exceed 8 digits'),
  birthProfile: birthProfileInputSchema.optional(),
});

// Google Sign-In Schemas
export const googleAuthSchema = z.object({
  idToken: z.string().min(1, 'Google ID token is required'),
  birthProfile: birthProfileInputSchema.optional(),
});

// Account Linking Schemas
export const linkPhoneSchema = z.object({
  phoneNumber: z.string().min(8, 'Phone number is required'),
  otp: z.string().min(4, 'OTP must be at least 4 digits').max(8, 'OTP must not exceed 8 digits'),
});

export const linkGoogleSchema = z.object({
  idToken: z.string().min(1, 'Google ID token is required'),
});

// Legacy Email Auth Schemas (Preserved for compatibility)
export const registerSchema = z.object({
  email: z.string().email('Invalid email address format').toLowerCase().trim(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .max(100, 'Password must not exceed 100 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9!@#$%^&*(),.?":{}|<>]/, 'Password must contain at least one number or special character'),
  fullName: z.string().optional(),
  phoneNumber: z.string().optional(),
  birthProfile: birthProfileInputSchema.optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address format').toLowerCase().trim(),
  password: z.string().min(1, 'Password is required'),
});

export const verifyEmailSchema = z.object({
  email: z.string().email('Invalid email address format').toLowerCase().trim(),
  otp: z.string().length(6, 'Verification code must be exactly 6 digits'),
});

export const resendVerificationSchema = z.object({
  email: z.string().email('Invalid email address format').toLowerCase().trim(),
});

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
export type GoogleAuthInput = z.infer<typeof googleAuthSchema>;
export type LinkPhoneInput = z.infer<typeof linkPhoneSchema>;
export type LinkGoogleInput = z.infer<typeof linkGoogleSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
export type ResendVerificationInput = z.infer<typeof resendVerificationSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
export type LogoutInput = z.infer<typeof logoutSchema>;
