import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres_password@localhost:5432/astro_sushil_test?schema=public',
      JWT_SECRET: 'super_secret_jwt_key_that_is_at_least_32_characters_long_for_testing_1234567890',
    },
    alias: {
      '@astro/shared': path.resolve(__dirname, '../../packages/shared/src/index.ts'),
      '@astro/astrology-engine': path.resolve(__dirname, '../../packages/astrology-engine/src/index.ts'),
    },
  },
});
