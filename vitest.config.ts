import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'node',
    root: '.',
    include: ['test/**/*.spec.ts'],
    alias: {
      '@src': path.resolve(__dirname, 'src'),
    },
    coverage: {
      provider: 'v8',
      reportsDirectory: 'coverage',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.spec.ts', 'src/**/*.module.ts', 'src/main.ts'],
    },
  },
});
