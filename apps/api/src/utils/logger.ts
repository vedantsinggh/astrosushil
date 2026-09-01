import pino from 'pino';
import { config } from '../config';

/**
 * Sensitive fields to automatically redact from all backend log records.
 */
export const LOG_REDACT_KEYS = [
  'req.headers.authorization',
  'headers.authorization',
  'authorization',
  'password',
  'confirmPassword',
  'newPassword',
  'oldPassword',
  'otp',
  'code',
  'codeHash',
  'refreshToken',
  'accessToken',
  'jwt',
  'token',
  'secret',
  'apiKey',
  'razorpayKeySecret',
  'razorpaySignature',
  'geminiApiKey',
  'cookie',
];

/**
 * Root Application Pino Logger Instance.
 * Produces structured JSON logs with sensitive key redaction.
 */
export const logger = pino({
  level: config.NODE_ENV === 'test' ? 'silent' : config.NODE_ENV === 'production' ? 'info' : 'debug',
  redact: {
    paths: LOG_REDACT_KEYS,
    censor: '[REDACTED]',
  },
  base: {
    service: 'astro-api',
    environment: config.NODE_ENV,
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

/**
 * Creates a contextualized child logger attaching request correlation metadata.
 */
export function createRequestLogger(meta: {
  requestId?: string;
  userId?: string;
  adminId?: string;
  route?: string;
  method?: string;
}) {
  return logger.child(meta);
}
