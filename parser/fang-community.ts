import * as cheerio from "cheerio";
import { z } from "zod";

const fangCommunityListingTeaserSchema = z
  .object({
    title: z.string().min(1).nullable(),
    roomCount: z.number().int().nonnegative().nullable(),
    areaSqm: z.number().nonnegative().nullable(),
    totalPriceWan: z.number().nonnegative().nullable(),
    unitPriceYuanPerSqm: z.number().int().nonnegative().nullable(),
  })
  .strict();

const fangCommunitySchema = z
  .object({
    communityName: z.string().min(1).nullable(),
    referencePriceYuanPerSqm: z.number().int().nonnegative().nullable(),
    listingCount: z.number().int().nonnegative().nullable(),
    recentDealHints: z.array(z.string().min(1)),
    currentListingTeasers: z.array(fangCommunityListingTeaserSchema),
  })
  .strict();

export type FangCommunityListingTeaser = z.infer<
  typeof fangCommunityListingTeaserSchema
>;
export type FangCommunity = z.infer<typeof fangCommunitySchema>;

function normalizeText(value: string | undefined | null): string {
  return value?.replace(/\s+/g, " ").trim() ?? "";
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

function dedupe(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function assertCommunityFixtureShape($: cheerio.CheerioAPI): void {
  const communityName = normalizeText($("h1").first().text());
  const referencePrice = normalizeText($(".r-trend-price strong").first().text());
  const listingCount = $('.xqhouselist .firstnav[data-type="esfallhouse"]').attr(
    "data-allcount",
  );
  const teaserCount = $(".houseList2 ul.esfallhouse li").length;

  if (communityName && referencePrice && listingCount && teaserCount > 0) {
    return;
  }

  throw new Error("Invalid Fang community fixture structure");
}

export function parseFangCommunity(html: string): FangCommunity {
  const $ = cheerio.load(html);
  assertCommunityFixtureShape($);
  const bodyText = normalizeText($("body").text());

  const hotHints = $(".xq-hot-box2 .txt")
    .map((_, element) => normalizeText($(element).text()))
    .get()
    .filter(Boolean);

  const historyHints =
    bodyText.match(/(?:二手房历史成交|法拍房历史成交)\(\d+\)/g) ?? [];

  const currentListingTeasers = $(".houseList2 ul.esfallhouse li")
    .toArray()
    .map((listing) => {
      const detail = normalizeText($(listing).find("p").first().text());
      const priceText = normalizeText($(listing).find(".price").first().text());

      return {
        title: normalizeText($(listing).find("h3").first().text()) || null,
        roomCount: parseNullableInteger(detail.match(/(\d+)室/)?.[1] ?? null),
        areaSqm: parseNullableFloat(
          detail.match(/建面:(\d+(?:\.\d+)?)㎡/)?.[1] ?? null,
        ),
        totalPriceWan: parseNullableFloat(
          priceText.match(/(\d+(?:\.\d+)?)万/)?.[1] ?? null,
        ),
        unitPriceYuanPerSqm: parseNullableInteger(
          priceText.match(/(\d+)元\/㎡/)?.[1] ?? null,
        ),
      };
    });

  return fangCommunitySchema.parse({
    communityName: normalizeText($("h1").first().text()) || null,
    referencePriceYuanPerSqm: parseNullableInteger(
      $(".r-trend-price strong").first().text(),
    ),
    listingCount: parseNullableInteger(
      $('.xqhouselist .firstnav[data-type="esfallhouse"]').attr("data-allcount"),
    ),
    recentDealHints: dedupe([...hotHints, ...historyHints]),
    currentListingTeasers,
  });
}
