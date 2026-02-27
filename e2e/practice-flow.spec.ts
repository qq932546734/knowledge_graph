import { test, expect } from "@playwright/test";

const enabled = process.env.E2E_ENABLED === "true";

test("random question full flow", async ({ page }) => {
  test.skip(!enabled, "Set E2E_ENABLED=true and provide seeded DB for E2E run.");

  await page.goto("/login");
  await page.fill('input[type="email"]', process.env.SEED_ADMIN_EMAIL || "admin@example.com");
  await page.fill(
    'input[type="password"]',
    process.env.SEED_ADMIN_PASSWORD || "ChangeThisPassword123!",
  );
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/dashboard/);

  await page.goto("/practice/question");
  await page.click('button:has-text("抽取随机题目")');
  await page.click('button:has-text("显示参考答案")');
  await page.click('button:has-text("4")');
  await expect(page.locator("text=抽取随机题目")).toBeVisible();
});
