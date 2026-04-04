import * as cheerio from "cheerio";
import type { Element } from "domhandler";
import { z } from "zod";

const anjukeSaleSearchListingSchema = z
  .object({
    title: z.string().min(1),
    roomCount: z.number().int().positive(),
    areaSqm: z.number().positive(),
    totalPriceWan: z.number().positive(),
    unitPriceYuanPerSqm: z.number().int().positive(),
    detailUrl: z.string().url(),
  })
  .strict();

const anjukeSaleSearchResultSchema = z
  .object({
    pageState: z.enum(["results", "empty", "blocked"]),
    listings: z.array(anjukeSaleSearchListingSchema),
  })
  .strict();

export type AnjukeSaleSearchListing = z.infer<
  typeof anjukeSaleSearchListingSchema
>;
export type AnjukeSaleSearchResult = z.infer<
  typeof anjukeSaleSearchResultSchema
>;

const EMPTY_PAGE_PATTERNS = [
  /没有找到/i,
  /暂无(?:相关)?(?:房源|二手房)/i,
  /无结果/i,
];
const BLOCKED_PAGE_PATTERNS = [
  /访问过于频繁/i,
  /五分钟内完成验证/i,
  /验证码校验/i,
  /@@xxzlGatewayUrl/i,
  /esfcommon-captcha-geetest/i,
  /antibot\/verifycode/i,
];
const TITLE_SPLIT_PATTERN =
  /[\s\u00a0·•・丨|｜/\\,，.。:：;；!！?？"'“”‘’()[\]【】（）<>《》-]+/u;
const NORMALIZED_SEPARATOR_PATTERN =
  /[\s\u00a0·•・丨|｜/\\,，.。:：;；!！?？"'“”‘’()[\]【】（）<>《》_-]+/gu;

function normalizeText(value: string | undefined | null): string {
  return value?.replace(/\s+/g, " ").trim() ?? "";
}

function normalizeComparable(value: string): string {
  return value
    .normalize("NFKC")
    .replace(NORMALIZED_SEPARATOR_PATTERN, "")
    .trim();
}

function parseNullableInteger(value: string | undefined | null): number | null {
  if (!value) {
    return null;
  }

  const digits = value.match(/\d+/)?.[0];

  if (!digits) {
    return null;
  }

  const parsed = Number.parseInt(digits, 10);

  return Number.isFinite(parsed) ? parsed : null;
}

function parseNullableFloat(value: string | undefined | null): number | null {
  if (!value) {
    return null;
  }

  const digits = value.match(/\d+(?:\.\d+)?/)?.[0];

  if (!digits) {
    return null;
  }

  const parsed = Number.parseFloat(digits);

  return Number.isFinite(parsed) ? parsed : null;
}

function isBlockedHtml(html: string, bodyText: string): boolean {
  return BLOCKED_PAGE_PATTERNS.some(
    (pattern) => pattern.test(html) || pattern.test(bodyText),
  );
}

function isEmptyHtml(bodyText: string): boolean {
  return EMPTY_PAGE_PATTERNS.some((pattern) => pattern.test(bodyText));
}

function hasExactCommunityMatch(title: string, communityName: string): boolean {
  const target = normalizeComparable(communityName);
  const tokens = title
    .normalize("NFKC")
    .split(TITLE_SPLIT_PATTERN)
    .map((token) => normalizeComparable(token))
    .filter(Boolean);

  for (let start = 0; start < tokens.length; start += 1) {
    let combined = "";

    for (let end = start; end < tokens.length; end += 1) {
      combined += tokens[end];

      if (combined === target) {
        return true;
      }

      if (combined.length > target.length) {
        break;
      }
    }
  }

  return false;
}

function toAbsoluteDetailUrl(value: string | undefined): string | null {
  const href = normalizeText(value);

  if (!href) {
    return null;
  }

  try {
    return new URL(href, "https://m.anjuke.com").toString();
  } catch {
    return null;
  }
}

function parseListing(
  $: cheerio.CheerioAPI,
  listing: Element,
  communityName: string,
): AnjukeSaleSearchListing | null {
  const title = normalizeText($(listing).find(".content-title").first().text());

  if (!title || !hasExactCommunityMatch(title, communityName)) {
    return null;
  }

  const detailValues = $(listing)
    .find(".desc-wrap-community .content-desc")
    .map((_, element) => normalizeText($(element).text()))
    .get()
    .filter(Boolean);

  const parsed = {
    title,
    roomCount: parseNullableInteger(
      detailValues.find((value) => /\d+室/u.test(value)),
    ),
    areaSqm: parseNullableFloat(detailValues.find((value) => /㎡/u.test(value))),
    totalPriceWan: parseNullableFloat(
      $(listing).find(".content-price").first().text(),
    ),
    unitPriceYuanPerSqm: parseNullableInteger(
      $(listing).find(".house-avg-price").first().text(),
    ),
    detailUrl: toAbsoluteDetailUrl(
      $(listing).find("a.cell-wrap").first().attr("href"),
    ),
  };

  if (
    parsed.roomCount === null ||
    parsed.areaSqm === null ||
    parsed.totalPriceWan === null ||
    parsed.unitPriceYuanPerSqm === null ||
    parsed.detailUrl === null
  ) {
    return null;
  }

  return anjukeSaleSearchListingSchema.parse(parsed);
}

function dedupeListings(
  listings: AnjukeSaleSearchListing[],
): AnjukeSaleSearchListing[] {
  const seen = new Set<string>();

  return listings.filter((listing) => {
    const dedupeKey = [
      listing.title,
      listing.roomCount,
      listing.areaSqm,
      listing.totalPriceWan,
    ].join("|");

    if (seen.has(dedupeKey)) {
      return false;
    }

    seen.add(dedupeKey);
    return true;
  });
}

export function parseAnjukeSaleSearch(
  html: string,
  communityName: string,
): AnjukeSaleSearchResult {
  const $ = cheerio.load(html);
  const bodyText = normalizeText($("body").text());

  if (isBlockedHtml(html, bodyText)) {
    return anjukeSaleSearchResultSchema.parse({
      pageState: "blocked",
      listings: [],
    });
  }

  const cards = $("li.item-wrap").toArray();

  if (cards.length === 0) {
    if (isEmptyHtml(bodyText)) {
      return anjukeSaleSearchResultSchema.parse({
        pageState: "empty",
        listings: [],
      });
    }

    throw new Error("Invalid Anjuke sale search fixture structure");
  }

  return anjukeSaleSearchResultSchema.parse({
    pageState: "results",
    listings: dedupeListings(
      cards
        .map((listing) => parseListing($, listing, communityName))
        .filter((listing): listing is AnjukeSaleSearchListing => listing !== null),
    ),
  });
}
