import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import { testDatabaseUrl } from './test/env.js';

const SERVER_ROOT = fileURLToPath(new URL('.', import.meta.url));
const INTEGRATION_GLOB = 'src/**/*.integration.test.ts';

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'unit',
          root: SERVER_ROOT,
          include: ['src/**/*.test.ts'],
          exclude: [INTEGRATION_GLOB],
        },
      },
      {
        test: {
          name: 'integration',
          root: SERVER_ROOT,
          include: [INTEGRATION_GLOB],
          globalSetup: ['./test/globalSetup.ts'],
          // Integration tests share one database schema: run files sequentially.
          env: { DATABASE_URL: testDatabaseUrl() },
          fileParallelism: false,
        },
      },
    ],
  },
});
