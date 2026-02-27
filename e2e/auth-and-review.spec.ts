import { test, expect } from "@playwright/test";

const enabled = process.env.E2E_ENABLED === "true";

test("login -> create node -> review -> dashboard", async ({ page }) => {
  test.skip(!enabled, "Set E2E_ENABLED=true and provide seeded DB for E2E run.");

  await page.goto("/login");
  await page.fill('input[type="email"]', process.env.SEED_ADMIN_EMAIL || "admin@example.com");
  await page.fill(
    'input[type="password"]',
    process.env.SEED_ADMIN_PASSWORD || "ChangeThisPassword123!",
  );
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/dashboard/);

  await page.goto("/nodes/new");
  await page.fill('input[type="text"]', "E2E Node");
  await page.fill("textarea", "E2E content");
  await page.click('button:has-text("保存")');

  await page.goto("/review");
  await page.click('button:has-text("显示内容")');
  await page.click('button:has-text("3")');

  await page.goto("/dashboard");
  await expect(page.locator("text=今日完成")).toBeVisible();
});
