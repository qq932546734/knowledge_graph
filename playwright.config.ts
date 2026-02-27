import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  retries: 0,
  use: {
    baseURL: process.env.E2E_BASE_URL || "http://127.0.0.1:3000",
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "iphone-se2", use: { ...devices["iPhone SE"] } },
    { name: "iphone-13", use: { ...devices["iPhone 13"] } },
    { name: "pixel-7", use: { ...devices["Pixel 7"] } },
  ],
  webServer:
    process.env.E2E_ENABLED === "true" && !process.env.E2E_BASE_URL
      ? {
          command:
            "AUTH_TRUST_HOST=true AUTH_SECRET=e2e_secret DATABASE_URL=postgresql://postgres:postgres@localhost:5432/knowledge_graph?schema=public npm run dev",
          url: "http://127.0.0.1:3000",
          reuseExistingServer: true,
        }
      : undefined,
});
