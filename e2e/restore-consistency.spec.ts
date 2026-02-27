import { test, expect } from "@playwright/test";

const enabled = process.env.E2E_ENABLED === "true";

test("soft delete and restore consistency", async ({ page }) => {
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
  await page.fill('input[type="text"]', "Restore Node");
  await page.fill("textarea", "restore content");
  await page.click('button:has-text("保存")');

  await page.click('button:has-text("软删除")');
  await page.click('button:has-text("恢复")');

  await expect(page.locator('button:has-text("软删除")')).toBeVisible();
});
