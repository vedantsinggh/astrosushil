import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

// Load environment variables from .env file if available
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const configSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  HOST: z.string().default('0.0.0.0'),
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid connection string'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters long for security'),
  JWT_ACCESS_EXPIRES_IN: z.string().default(process.env.ACCESS_TOKEN_EXPIRES_IN || process.env.JWT_ACCESS_EXPIRES_IN || '30m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default(process.env.REFRESH_TOKEN_EXPIRES_IN || process.env.JWT_REFRESH_EXPIRES_IN || '60d'),

  // Development Master OTP Configuration
  DEV_MASTER_OTP: z.string().optional().default('4444'),
  ALLOW_DEV_MASTER_OTP: z
    .string()
    .optional()
    .transform((val) => val === 'true' || val === '1'),

  // Email Transport Configuration
  EMAIL_HOST: z.string().optional(),
  EMAIL_PORT: z.coerce.number().int().optional(),
  EMAIL_USER: z.string().optional(),
  EMAIL_PASSWORD: z.string().optional(),
  EMAIL_FROM: z.string().default('Astro Sushil <noreply@astrosushil.com>'),

  // Gemini & Jyoti AI Assistant Configuration
  GEMINI_API_KEY: z.string().optional().default(''),
  GEMINI_MODEL: z.string().default('gemini-3.6-flash'),
  JYOTI_RATE_LIMIT_PER_MINUTE: z.coerce.number().int().positive().default(20),
  JYOTI_DAILY_LIMIT: z.coerce.number().int().positive().default(200),
});

export type Config = z.infer<typeof configSchema>;

function loadConfig(): Config {
  const result = configSchema.safeParse(process.env);

  if (!result.success) {
    console.error('❌ Invalid environment variable configuration:');
    const formattedErrors = result.error.format();
    for (const [key, value] of Object.entries(formattedErrors)) {
      if (key !== '_errors' && value && '_errors' in value && Array.isArray(value._errors) && value._errors.length > 0) {
        console.error(`  - ${key}: ${value._errors.join(', ')}`);
      }
    }
    throw new Error('Environment variable validation failed. Application cannot start.');
  }

  return result.data;
}

export const config = loadConfig();
