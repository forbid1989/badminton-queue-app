import { defineConfig, devices } from '@playwright/test';

// Not 3000, so a test run never reuses a normal dev server that has real env vars
const PORT = 3100;
// A fake backend: the fixtures answer every request to it, so nothing leaves the machine
const FAKE_SUPABASE = { url: 'http://supabase.test', key: 'test-anon-key' };
const mobileSpecs = /\.mobile\.spec\.ts$/;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] }, testIgnore: mobileSpecs },
    { name: 'mobile', use: { ...devices['iPhone 13'] }, testMatch: mobileSpecs },
  ],
  webServer: {
    // CI tests the static export that gets deployed (`output: "export"`, so no `next start`)
    command: process.env.CI
      ? `npm run build && npx serve out -l ${PORT}`
      : `npm run dev -- -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    // Overrides any real values, keeping test runs away from the real Supabase project
    env: {
      NEXT_PUBLIC_SUPABASE_URL: FAKE_SUPABASE.url,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: FAKE_SUPABASE.key,
    },
  },
});
