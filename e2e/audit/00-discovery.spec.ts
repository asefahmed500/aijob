import fs from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { EVIDENCE_DIR, apiCall, expectCleanBrowser, login, observe, shot } from "./helpers";

interface RouteAudit {
  path: string;
  public: boolean;
  unauthenticatedUrl: string;
  authenticatedUrl: string;
  heading: string | null;
  pageErrors: string[];
  overflow1440: number;
}

const PUBLIC_ROUTES = ["/", "/login", "/register", "/apply/invalid-token", "/invitations/invalid-token"];
const PROTECTED_ROUTES = [
  "/dashboard",
  "/org",
  "/org/jobs",
  "/org/candidates",
  "/org/analytics",
  "/org/notifications",
  "/org/team",
  "/admin",
];

async function overflow(page: Page): Promise<number> {
  return page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
}

test.describe("PHASE 1-2: application discovery and real-browser sweep", () => {
  const inventory: RouteAudit[] = [];

  test("discovers all routes, loads them and records browser errors (@inventory)", async ({ page }) => {
    test.setTimeout(240_000);
    const log = observe(page);

    for (const route of PUBLIC_ROUTES) {
      await page.goto(route);
      await page.waitForLoadState("domcontentloaded");
      const heading = (await page.locator("h1").first().textContent().catch(() => null))?.trim() ?? null;
      inventory.push({
        path: route,
        public: true,
        unauthenticatedUrl: page.url(),
        authenticatedUrl: "-",
        heading,
        pageErrors: [...log.pageErrors],
        overflow1440: await overflow(page),
      });
    }

    await login(page);
    const appResponse = await apiCall(page, "GET", "/applications");
    expect(appResponse.ok()).toBeTruthy();
    const applications = (await appResponse.json()) as Array<{ id: string }>;
    const jobsResponse = await apiCall(page, "GET", "/jobs");
    const jobs = (await jobsResponse.json()) as Array<{ id: string; publicToken: string | null }>;
    const candidatesResponse = await apiCall(page, "GET", "/candidates");
    const candidates = (await candidatesResponse.json()) as Array<{ id: string }>;

    const dynamicRoutes = [
      ...(applications[0] ? [`/applications/${applications[0].id}`] : []),
      ...(jobs[0] ? [`/org/jobs/${jobs[0].id}`] : []),
      ...(candidates[0] ? [`/org/candidates/${candidates[0].id}`, `/org/candidates/${candidates[0].id}/cv`] : []),
      ...(jobs.find((job) => job.publicToken) ? [`/apply/${jobs.find((job) => job.publicToken)!.publicToken}`] : []),
    ];

    for (const route of [...PROTECTED_ROUTES, ...dynamicRoutes]) {
      await page.goto(route);
      await page.waitForLoadState("domcontentloaded");
      const isApply = route.startsWith("/apply/");
      const headingTarget = route === "/admin" || isApply
        ? page.getByText(isApply ? "Apply for this role" : "Access denied").first()
        : page.locator("h1").first();
      await headingTarget.waitFor({ state: "visible", timeout: 15_000 }).catch(() => undefined);
      const heading = (await page.locator("h1").first().textContent().catch(() => null))?.trim() ?? null;
      inventory.push({
        path: route.startsWith("/apply/") ? "/apply/[token]" : route,
        public: route.startsWith("/apply/"),
        unauthenticatedUrl: "-",
        authenticatedUrl: page.url(),
        heading,
        pageErrors: [...log.pageErrors],
        overflow1440: await overflow(page),
      });
      // /admin (non-admin) and /apply intentionally use card titles instead of h1.
      if (route !== "/admin" && !route.startsWith("/apply/")) {
        expect(heading, `route ${route} rendered a heading`).toBeTruthy();
      }
      await expect(headingTarget, `route ${route} rendered its primary content`).toBeVisible();
      await shot(page, `discovery-${route.replace(/[^a-z0-9]+/gi, "-")}`);
    }

    fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
    fs.writeFileSync(
      path.join(EVIDENCE_DIR, "route-inventory.json"),
      JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          totalRoutes: inventory.length,
          publicRoutes: PUBLIC_ROUTES.length,
          protectedRoutes: PROTECTED_ROUTES.length + dynamicRoutes.length,
          routes: inventory,
        },
        null,
        2,
      ),
    );

    console.log(`[discovery] routes=${inventory.length} headings=${inventory.filter((r) => r.heading).length}`);
    expectCleanBrowser(log, "route discovery");
  });

  test("sweep of every page reports no console errors or failed requests (@inventory)", async ({ page }) => {
    const log = observe(page);
    await login(page);
    for (const route of PROTECTED_ROUTES) {
      await page.goto(route);
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(200);
    }
    const api5xx = log.apiResponses.filter((entry) => entry.status >= 500);
    // Next.js 16 dev emits an instant-navigation validation diagnostic for
    // client-component segments; `instant` cannot be exported from them.
    const nextDevDiagnostic = "Could not validate that a segment in your UI has instant navigation";
    const appConsoleErrors = log.consoleErrors.filter((entry) => !entry.includes(nextDevDiagnostic));
    console.log(
      `[sweep] apiCalls=${log.apiResponses.length} 5xx=${api5xx.length} appConsoleErrors=${appConsoleErrors.length} nextDevDiagnostics=${log.consoleErrors.length - appConsoleErrors.length}`,
    );
    expect(api5xx, "no backend 5xx during navigation").toEqual([]);
    expect(log.pageErrors, "no React/runtime errors").toEqual([]);
    expect(appConsoleErrors, "no application console errors during navigation").toEqual([]);
  });

  test("all four required viewports have no horizontal overflow on core pages", async ({ page }) => {
    const sizes = [
      { width: 1440, height: 1000 },
      { width: 1366, height: 768 },
      { width: 768, height: 1024 },
      { width: 390, height: 844 },
    ];
    await login(page);
    for (const size of sizes) {
      await page.setViewportSize(size);
      for (const route of ["/", "/dashboard", "/org/jobs", "/org/candidates", "/admin"]) {
        await page.goto(route);
        await page.waitForLoadState("domcontentloaded");
        const extra = await overflow(page);
        expect(extra, `${route} @ ${size.width}px horizontal overflow`).toBeLessThanOrEqual(1);
      }
    }
  });
});
