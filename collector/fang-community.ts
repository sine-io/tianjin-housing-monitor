import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import type { Community } from "../lib/types";

import { fetchHtmlWithBrowser } from "./browser";

export interface CollectedPage {
  html: string;
  sourceUrl: string;
}

function extractFangId(url: string): string | null {
  const matchedId = url.match(/\/(\d+)(?:\/weekreport)?\.htm$/)?.[1];

  return matchedId ?? null;
}

export function deriveFangCommunityMobileUrl(community: Community): string | null {
  const fangId = extractFangId(community.sources.fangCommunityUrl);

  if (!fangId) {
    return null;
  }

  return `https://m.fang.com/xiaoqu/tj/${fangId}.html`;
}

export async function collectFangCommunityHtml(
  community: Community,
  fixtureRoot?: string,
): Promise<CollectedPage> {
  if (fixtureRoot) {
    return {
      html: await readFile(
        resolve(fixtureRoot, "fang/community", `${community.id}.html`),
        "utf8",
      ),
      sourceUrl: resolve(fixtureRoot, "fang/community", `${community.id}.html`),
    };
  }

  const sourceUrl = deriveFangCommunityMobileUrl(community);

  if (!sourceUrl) {
    throw new Error(
      `Unable to derive Fang community mobile URL for ${community.id}`,
    );
  }

  return {
    html: await fetchHtmlWithBrowser(sourceUrl),
    sourceUrl,
  };
}
