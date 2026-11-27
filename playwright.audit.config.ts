import { defineConfig } from "@playwright/test";

/**
 * Full end-to-end audit configuration.
 * Uses a headed, real Chromium browser against the local dev stack.
 * Frontend: http://localhost:3010  API: http://localhost:3002
 */
export default defineConfig({
  testDir: "./e2e",
  grepInvert: /@skipaudit/,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  outputDir: "test-results/audit-artifacts",
  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-report-audit", open: "never" }],
  ],
  timeout: 90_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3010",
    browserName: "chromium",
    headless: false,
    viewport: { width: 1440, height: 1000 },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 15_000,
  },
});
