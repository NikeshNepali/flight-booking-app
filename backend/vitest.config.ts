import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    env: {
      NODE_ENV: 'test',
      DUFFEL_MODE: 'test',
      DUFFEL_ACCESS_TOKEN: 'duffel_test_unit_tests_only',
      DUFFEL_WEBHOOK_SECRET: 'whsec_unit_test_secret',
      DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/flightbooking_test',
    },
  },
});
