import { chromium, type Browser } from "playwright";

let browserPromise: Promise<Browser> | null = null;

async function getBrowser(): Promise<Browser> {
  if (!browserPromise) {
    browserPromise = chromium.launch({
      headless: true,
    });
  }

  return browserPromise;
}

export async function fetchHtmlWithBrowser(url: string): Promise<string> {
  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    const response = await page.goto(url, {
      timeout: 30_000,
      waitUntil: "domcontentloaded",
    });

    if (!response) {
      throw new Error(`No response received for ${url}`);
    }

    if (!response.ok()) {
      throw new Error(`Request failed for ${url} with ${response.status()}`);
    }

    await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => {});

    return await page.content();
  } finally {
    await page.close();
  }
}

export async function closeBrowser(): Promise<void> {
  if (!browserPromise) {
    return;
  }

  const browser = await browserPromise;
  browserPromise = null;
  await browser.close();
}
