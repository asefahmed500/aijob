import path from "node:path";
import { expect, test } from "@playwright/test";
import { EVIDENCE_DIR, expectCleanBrowser, login, observe, shot } from "./helpers";

const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 1000 },
  { name: "laptop", width: 1366, height: 768 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "mobile", width: 390, height: 844 },
];

test.describe("PHASE 9: responsive layout, visual evidence and accessibility basics", () => {
  for (const viewport of VIEWPORTS) {
    test(`${viewport.name} ${viewport.width}x${viewport.height}: core pages render without overflow`, async ({ page }) => {
      const log = observe(page);
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await login(page);
      for (const route of ["/dashboard", "/org", "/org/jobs", "/org/candidates", "/org/analytics", "/org/notifications", "/org/team"]) {
        await page.goto(route);
        await page.waitForLoadState("domcontentloaded");
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        );
        expect(overflow, `${route} overflow at ${viewport.width}px`).toBeLessThanOrEqual(1);
        await shot(page, `responsive-${viewport.name}-${route.replace(/\//g, "-")}`);
      }
      expectCleanBrowser(log, `${viewport.name} responsive sweep`);
    });
  }

  test("mobile shell drawer opens and navigates", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await login(page);
    await page.goto("/org/jobs");
    const trigger = page.getByRole("button", { name: "Toggle Sidebar" }).first();
    await expect(trigger).toBeVisible();
    await trigger.click();
    await expect(page.getByRole("link", { name: "Overview" }).first()).toBeVisible();
    await shot(page, "responsive-mobile-drawer");
  });

  test("accessible names exist for interactive controls", async ({ page }) => {
    await login(page);
    for (const route of ["/dashboard", "/org/jobs", "/org/candidates", "/org/team"]) {
      await page.goto(route);
      const unnamed = await page.evaluate(() => {
        const controls = Array.from(document.querySelectorAll("button, a[href], input, textarea, [role='combobox']"));
        return controls
          .filter((element) => {
            const aria = element.getAttribute("aria-label");
            const text = element.textContent?.trim();
            const labelledBy = element.getAttribute("aria-labelledby");
            const id = element.getAttribute("id");
            const label = id ? document.querySelector(`label[for="${id}"]`) : null;
            return !aria && !text && !labelledBy && !label;
          })
          .map((element) => element.outerHTML.slice(0, 160));
      });
      expect(unnamed, `${route} unnamed interactive controls`).toEqual([]);
    }
  });

  test("evidence directory contains screenshots", async () => {
    const { readdirSync, statSync } = await import("node:fs");
    const files = readdirSync(EVIDENCE_DIR).filter((file) => file.endsWith(".png"));
    expect(files.length, "screenshot evidence was captured").toBeGreaterThan(3);
    const sample = files[0];
    expect(statSync(path.join(EVIDENCE_DIR, sample)).size).toBeGreaterThan(1000);
  });
});
