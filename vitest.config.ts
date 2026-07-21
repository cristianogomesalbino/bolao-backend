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
      reporter: ['text', 'lcov'],
      reportsDirectory: 'coverage',
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.spec.ts',
        'src/**/*.module.ts',
        'src/main.ts',
        'src/**/prisma-*.ts',
        'src/prisma/**',
        'src/**/*.constants.ts',
        'src/**/*.dto.ts',
        'src/**/*.decorator.ts',
        'src/**/*.filter.ts',
        'src/**/*.pipe.ts',
        'src/**/*.middleware.ts',
        'src/**/*.presenter.ts',
        'src/common/errors/**',
      ],
    },
  },
});
