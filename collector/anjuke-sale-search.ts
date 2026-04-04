import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import type { Community } from "../lib/types";

import { fetchHtmlWithBrowser } from "./browser";

export interface CollectedPage {
  html: string;
  sourceUrl: string;
}

export async function collectAnjukeSaleSearchHtml(
  community: Community,
  fixtureRoot?: string,
): Promise<CollectedPage> {
  if (fixtureRoot) {
    const fixturePath = resolve(
      fixtureRoot,
      "anjuke/sale-search",
      `${community.id}.html`,
    );

    return {
      html: await readFile(fixturePath, "utf8"),
      sourceUrl: fixturePath,
    };
  }

  const sourceUrl = community.sources.anjukeSaleSearchUrl;

  if (!sourceUrl) {
    throw new Error(
      `Unable to determine Anjuke sale search URL for ${community.id}`,
    );
  }

  return {
    html: await fetchHtmlWithBrowser(sourceUrl),
    sourceUrl,
  };
}
