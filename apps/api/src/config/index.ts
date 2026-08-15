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
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
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
