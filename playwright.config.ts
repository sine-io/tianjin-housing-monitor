import { defineConfig, devices } from "@playwright/test";

const PLAYWRIGHT_PORT = process.env.PLAYWRIGHT_PORT ?? "4317";
const PLAYWRIGHT_BASE_URL = `http://127.0.0.1:${PLAYWRIGHT_PORT}`;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  reporter: "html",
  use: {
    baseURL: PLAYWRIGHT_BASE_URL,
    trace: "on-first-retry",
  },
  webServer: {
    command: `npm run preview:e2e -- --host 127.0.0.1 --port ${PLAYWRIGHT_PORT} --strictPort`,
    reuseExistingServer: false,
    url: PLAYWRIGHT_BASE_URL,
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
      },
    },
  ],
});
