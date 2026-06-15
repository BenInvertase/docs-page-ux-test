import { defineConfig, devices } from "@playwright/test";
import { PLATFORMS } from "./lib/audit/constants.mjs";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: "playwright-report" }],
  ],
  timeout: 60_000,
  use: {
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    actionTimeout: 15_000,
  },
  projects: [
    {
      name: "docspage-regression",
      testMatch: /regression\/docspage\.fixture\.spec\.mjs/,
      use: {
        baseURL: `${PLATFORMS.docspage.replace(/\/$/, "")}/`,
        ...devices["Desktop Chrome"],
      },
    },
  ],
});
