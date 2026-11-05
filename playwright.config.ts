import { defineConfig, devices } from '@playwright/test';

// Test end-to-end sul sito compilato (npm run build), servito da vite preview.
// In locale usa il Chrome installato; in CI il Chromium scaricato da Playwright.
const browser = process.env.CI ? {} : { channel: 'chrome' };

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['github']] : 'list',
  use: {
    baseURL: 'http://localhost:4173/NoveDecimi/',
    locale: 'it-IT',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'telefono piccolo',
      use: { ...devices['Desktop Chrome'], ...browser, viewport: { width: 320, height: 568 }, isMobile: true, hasTouch: true },
    },
    {
      name: 'telefono',
      use: { ...devices['Desktop Chrome'], ...browser, viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
    },
    {
      name: 'telefono orizzontale',
      use: { ...devices['Desktop Chrome'], ...browser, viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true },
    },
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], ...browser, viewport: { width: 1280, height: 800 } },
    },
  ],
  webServer: {
    command: 'npx vite preview --port 4173 --strictPort',
    url: 'http://localhost:4173/NoveDecimi/',
    reuseExistingServer: !process.env.CI,
  },
});
