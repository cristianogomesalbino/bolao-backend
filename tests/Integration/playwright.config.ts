import { defineConfig } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({
  path: path.resolve(__dirname, '../../docker/playwright/.env'),
});

export default defineConfig({
  testDir: './specs',
  timeout: 60_000,
  retries: 0,
  workers: 1,
  reporter: [
    ['./clean-reporter.js'],
    ['html', { outputFolder: './results/html', open: 'never' }],
    [
      'allure-playwright',
      {
        resultsDir: './results/allure-results',
        detail: true,
        suiteTitle: false,
        environmentInfo: {
          API_URL: process.env.RESOURCES_URL || 'http://localhost:3002/',
          DB_HOST: process.env.DB_HOST || 'localhost',
          NODE_ENV: 'test',
        },
      },
    ],
  ],
  globalSetup: './global-setup.ts',
  globalTeardown: './global-teardown.ts',
  use: {
    baseURL: process.env.RESOURCES_URL || 'http://localhost:3002/',
    extraHTTPHeaders: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    trace: 'on-first-retry',
  },
});
