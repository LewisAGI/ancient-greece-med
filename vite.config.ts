import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';
import { SECURITY_HEADERS } from './src/securityHeaders';
import { stripExcludedContent } from './vite.strip';

export default defineConfig({
  plugins: [react(), stripExcludedContent()],
  server: { host: '127.0.0.1' },
  preview: {
    host: '127.0.0.1',
    headers: SECURITY_HEADERS,
  },
  test: {
    include: ['tests/**/*.test.ts'],
  },
});
