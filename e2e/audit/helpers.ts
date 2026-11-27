import { execFileSync } from "node:child_process";
import path from "node:path";
import { expect, type APIResponse, type Page, type Request, type Response } from "@playwright/test";

export const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3010";
export const API = process.env.E2E_API_URL ?? "http://localhost:3002";
export const DEMO = { email: "demo@aijob.local", password: "demo12345" };
export const ADMIN = { email: "admin@aijob.local", password: "admin12345" };
export const EVIDENCE_DIR = path.join(process.cwd(), "test-results", "audit");

export interface BrowserLog {
  pageErrors: string[];
  consoleErrors: string[];
  consoleWarnings: string[];
  failedRequests: string[];
  apiResponses: Array<{ status: number; method: string; url: string }>;
  badImages: string[];
}

/** Attach passive observers to a page. Never throws — findings are asserted explicitly. */
export function observe(page: Page): BrowserLog {
  const log: BrowserLog = {
    pageErrors: [],
    consoleErrors: [],
    consoleWarnings: [],
    failedRequests: [],
    apiResponses: [],
    badImages: [],
  };
  page.on("pageerror", (error) => log.pageErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") log.consoleErrors.push(message.text());
    if (message.type() === "warning") log.consoleWarnings.push(message.text());
  });
  page.on("requestfailed", (request: Request) => {
    const failure = request.failure()?.errorText ?? "unknown";
    if (!failure.includes("ERR_ABORTED")) {
      log.failedRequests.push(`${request.method()} ${request.url()} :: ${failure}`);
    }
  });
  page.on("response", (response: Response) => {
    if (response.url().startsWith(API)) {
      log.apiResponses.push({ status: response.status(), method: response.request().method(), url: response.url() });
    }
    if (response.request().resourceType() === "image" && response.status() >= 400) {
      log.badImages.push(`${response.status()} ${response.url()}`);
    }
  });
  return log;
}

export function expectCleanBrowser(log: BrowserLog, label: string): void {
  expect(log.pageErrors, `${label}: JavaScript runtime errors`).toEqual([]);
  expect(log.badImages, `${label}: broken images`).toEqual([]);
  expect(
    log.failedRequests.filter((entry) => !entry.includes("favicon")),
    `${label}: failed network requests`,
  ).toEqual([]);
}

/** Remove the Next.js dev overlay host so it cannot intercept pointer events. */
export async function hideDevOverlay(page: Page): Promise<void> {
  await page.locator("nextjs-portal").evaluateAll((elements) => elements.forEach((element) => element.remove())).catch(() => undefined);
}

/** Log in through the real UI. */
export async function login(page: Page, credentials = DEMO): Promise<void> {
  await page.goto("/login");
  await hideDevOverlay(page);
  await page.getByLabel("Email").fill(credentials.email);
  await page.getByLabel("Password").fill(credentials.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 20_000 });
  await hideDevOverlay(page);
}

export async function shot(page: Page, name: string): Promise<void> {
  const safe = name.replace(/[^a-z0-9-_]/gi, "-");
  await page.screenshot({ path: path.join(EVIDENCE_DIR, `${safe}.png`), fullPage: false });
}

export async function apiCall(
  page: Page,
  method: "GET" | "POST" | "PATCH" | "DELETE",
  endpoint: string,
  data?: unknown,
): Promise<APIResponse> {
  return page.request.fetch(`${API}${endpoint}`, {
    method,
    data,
    headers: data === undefined ? {} : { "Content-Type": "application/json" },
  });
}

/** Call the API from inside the page so browser-managed cookies are used exactly as a user would. */
export async function browserApi<T = unknown>(
  page: Page,
  method: "GET" | "POST" | "PATCH" | "DELETE",
  endpoint: string,
  data?: unknown,
): Promise<{ status: number; body: T }> {
  return page.evaluate(
    async ({ method: m, endpoint: path, data: payload, api }) => {
      const response = await fetch(`${api}${path}`, {
        method: m,
        credentials: "include",
        headers: payload === undefined ? {} : { "Content-Type": "application/json" },
        body: payload === undefined ? undefined : JSON.stringify(payload),
      });
      const text = await response.text();
      let body: unknown = text;
      try {
        body = JSON.parse(text);
      } catch {
        // non-JSON response
      }
      return { status: response.status, body };
    },
    { method, endpoint, data, api: API },
  ) as Promise<{ status: number; body: T }>;
}

export function dbCounts(): Record<string, number> {
  return JSON.parse(
    execFileSync(process.execPath, [path.join(process.cwd(), "scripts", "qa-db.cjs"), "counts"], {
      encoding: "utf8",
    }),
  ) as Record<string, number>;
}

export function unique(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

/** Guess=less helper: assert a page loaded real data (not an empty shell). */
export async function expectHeading(page: Page, name: string | RegExp): Promise<void> {
  await expect(page.getByRole("heading", { name }).first()).toBeVisible({ timeout: 20_000 });
}
