import { afterEach, describe, expect, it, vi } from "vitest";

const ORIGINAL_ENV = { ...process.env };

async function loadPlaywrightConfig() {
  vi.resetModules();
  const module = await import("../playwright.config");
  return module.default;
}

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("playwright config", () => {
  it("does not reuse an existing local preview server", async () => {
    delete process.env.PLAYWRIGHT_PORT;

    const config = await loadPlaywrightConfig();

    expect(config.webServer).toMatchObject({
      reuseExistingServer: false,
    });
  });

  it("uses the configured preview port consistently", async () => {
    process.env.PLAYWRIGHT_PORT = "4317";

    const config = await loadPlaywrightConfig();

    expect(config.use).toMatchObject({
      baseURL: "http://127.0.0.1:4317",
    });
    expect(config.webServer).toMatchObject({
      url: "http://127.0.0.1:4317",
    });
    expect((config.webServer as { command: string }).command).toContain(
      "--port 4317",
    );
  });

  it("builds fresh assets before starting the preview server", async () => {
    const config = await loadPlaywrightConfig();

    expect((config.webServer as { command: string }).command).toContain(
      "npm run preview:e2e",
    );
  });
});
