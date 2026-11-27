import { chromium, expect, test } from "@playwright/test";

test("headed chromium smoke: real browser opens the app", async () => {
  const browser = await chromium.launch({ headless: false, args: ["--start-maximized"] });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("http://localhost:3010/");
  await expect(page.getByRole("heading", { name: "Hiring, grounded in evidence." })).toBeVisible();
  await page.screenshot({ path: "test-results/audit/smoke-home.png", fullPage: true });
  console.log(`[smoke] title=${await page.title()} pageerrors=${JSON.stringify(errors)}`);
  expect(errors).toEqual([]);
  await browser.close();
});
