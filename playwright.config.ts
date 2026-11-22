import { defineConfig } from "@playwright/test";

/**
 * Browser E2E runs against the already-running dev server and API.
 * Override with E2E_BASE_URL when the app is served elsewhere.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "list",
  timeout: 60_000,
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3010",
    channel: "chrome",
    headless: true,
    viewport: { width: 1365, height: 900 },
    trace: "retain-on-failure",
  },
});
