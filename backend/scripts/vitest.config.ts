import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  root: path.resolve(__dirname, '..'),
  test: {
    environment: 'node',
    include: ['scripts/operations.test.ts'],
  },
});
