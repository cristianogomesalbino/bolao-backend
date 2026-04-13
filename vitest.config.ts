import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'node',
    root: 'src',
    include: ['**/*.spec.ts'],
    alias: {
      src: path.resolve(__dirname, 'src'),
    },
    coverage: {
      provider: 'v8',
      reportsDirectory: '../coverage',
    },
  },
});
