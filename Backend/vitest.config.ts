import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    env: {
      NODE_ENV: 'test',
      CORS_ORIGINS: 'http://localhost:5173',
      PUBLIC_SITE_URL: 'http://localhost:5173',
      ENQUIRY_IP_SALT: 'test-salt-value-1234',
    },
  },
});
