import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import * as cheerio from "cheerio";

import { fetchHtmlWithBrowser } from "./browser";

export interface CollectedPage {
  html: string;
  sourceUrl: string;
}

const STATS_GOV_RELEASES_URL = "https://www.stats.gov.cn/sj/zxfb/";
const STATS_GOV_FALLBACK_RELEASES_URL = "https://www.stats.gov.cn/sj/zxfbhjd/";

function normalizeText(value: string | undefined | null): string {
  return value?.replace(/\s+/g, " ").trim() ?? "";
}

function toAbsoluteUrl(url: string, baseUrl: string): string {
  return new URL(url, baseUrl).toString();
}

export function findLatestStatsGovReportUrl(
  html: string,
  baseUrl: string,
): string | null {
  const $ = cheerio.load(html);

  for (const link of $("a").toArray()) {
    const label = normalizeText($(link).text());
    const href = $(link).attr("href");

    if (!href || !label.includes("70个大中城市商品住宅销售价格变动情况")) {
      continue;
    }

    return toAbsoluteUrl(href, baseUrl);
  }

  const matchedHref =
    html.match(
      /href="(?<href>[^"]+)"[^>]*>\s*[^<]*70个大中城市商品住宅销售价格变动情况/,
    )?.groups?.href ?? null;

  return matchedHref ? toAbsoluteUrl(matchedHref, baseUrl) : null;
}

async function fetchLatestStatsGovReportPage(): Promise<CollectedPage> {
  try {
    const primaryIndexHtml = await fetchHtmlWithBrowser(STATS_GOV_RELEASES_URL);
    const primaryReportUrl = findLatestStatsGovReportUrl(
      primaryIndexHtml,
      STATS_GOV_RELEASES_URL,
    );

    if (primaryReportUrl) {
      return {
        html: await fetchHtmlWithBrowser(primaryReportUrl),
        sourceUrl: primaryReportUrl,
      };
    }
  } catch {
    // Fall through to the alternate releases index.
  }

  const fallbackIndexHtml = await fetchHtmlWithBrowser(STATS_GOV_FALLBACK_RELEASES_URL);
  const fallbackReportUrl = findLatestStatsGovReportUrl(
    fallbackIndexHtml,
    STATS_GOV_FALLBACK_RELEASES_URL,
  );

  if (!fallbackReportUrl) {
    throw new Error("Unable to locate the latest stats-gov report URL");
  }

  return {
    html: await fetchHtmlWithBrowser(fallbackReportUrl),
    sourceUrl: fallbackReportUrl,
  };
}

export async function collectStatsGovHtml(
  fixtureRoot?: string,
): Promise<CollectedPage> {
  if (fixtureRoot) {
    return {
      html: await readFile(resolve(fixtureRoot, "stats-gov/tianjin.html"), "utf8"),
      sourceUrl: resolve(fixtureRoot, "stats-gov/tianjin.html"),
    };
  }

  return fetchLatestStatsGovReportPage();
}
