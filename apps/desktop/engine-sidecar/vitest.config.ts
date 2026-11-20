import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    testTimeout: 60000,
  },
  resolve: {
    alias: [
      { find: '@astro/astrology-engine', replacement: path.resolve(__dirname, '../../../packages/astrology-engine/src/index.ts') },
      { find: '@astro/shared', replacement: path.resolve(__dirname, '../../../packages/shared/src/index.ts') },
    ],
  },
});
