import * as cheerio from "cheerio";
import { z } from "zod";

const fangWeekreportPricePointSchema = z
  .object({
    label: z.string().min(1),
    priceYuanPerSqm: z.number().int().nonnegative().nullable(),
  })
  .strict();

const fangWeekreportSchema = z
  .object({
    communityName: z.string().min(1).nullable(),
    pricePoints: z.array(fangWeekreportPricePointSchema),
    listingCount: z.number().int().nonnegative().nullable(),
    districtName: z.string().min(1).nullable(),
    districtPremiumPct: z.number().nonnegative().nullable(),
    momChangePct: z.number().nullable(),
    yoyChangePct: z.number().nullable(),
    availableRangeLabels: z.array(z.string().min(1)),
  })
  .strict();

export type FangWeekreportPricePoint = z.infer<
  typeof fangWeekreportPricePointSchema
>;
export type FangWeekreport = z.infer<typeof fangWeekreportSchema>;

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

function parseSignedPercentage(
  direction: string | undefined,
  value: string | undefined,
): number | null {
  const parsed = parseNullableFloat(value ?? null);

  if (parsed === null) {
    return null;
  }

  if (direction === "下跌") {
    return -parsed;
  }

  return parsed;
}

function assertWeekreportFixtureShape($: cheerio.CheerioAPI): void {
  const communityName =
    normalizeText($(".cfj-tit h2").eq(1).text()) ||
    normalizeText($("header .cent span").first().text());
  const summary = normalizeText($(".cfj-data-intbox").first().text());
  const referencePrice = normalizeText($(".cfj-data .data-num i").first().text());
  const rangeCount = $(".cfj-gxdb-t .tab a").length;

  if (communityName && summary && referencePrice && rangeCount > 0) {
    return;
  }

  throw new Error("Invalid Fang weekreport fixture structure");
}

export function parseFangWeekreport(html: string): FangWeekreport {
  const $ = cheerio.load(html);
  assertWeekreportFixtureShape($);
  const summary = normalizeText($(".cfj-data-intbox").first().text());
  const summaryMatch = summary.match(
    /本小区(?<label>\d+月)挂牌均价为(?<price>\d+)元\/m²，超过(?<district>.+?)(?<premium>\d+(?:\.\d+)?)%小区价格，环比上月(?<momDirection>上涨|下跌)(?<momValue>\d+(?:\.\d+)?)%，同比去年(?<yoyDirection>上涨|下跌)(?<yoyValue>\d+(?:\.\d+)?)%/,
  );

  const latestLabel = summaryMatch?.groups?.label ?? null;
  const latestPrice =
    parseNullableInteger(summaryMatch?.groups?.price ?? null) ??
    parseNullableInteger($(".cfj-data .data-num i").first().text());

  const pricePoints =
    latestLabel || latestPrice !== null
      ? [
          {
            label: latestLabel ?? "最新",
            priceYuanPerSqm: latestPrice,
          },
        ]
      : [];

  return fangWeekreportSchema.parse({
    communityName:
      normalizeText($(".cfj-tit h2").eq(1).text()) ||
      normalizeText($("header .cent span").first().text()) ||
      null,
    pricePoints,
    listingCount: null,
    districtName: summaryMatch?.groups?.district ?? null,
    districtPremiumPct: parseNullableFloat(summaryMatch?.groups?.premium ?? null),
    momChangePct: parseSignedPercentage(
      summaryMatch?.groups?.momDirection,
      summaryMatch?.groups?.momValue,
    ),
    yoyChangePct: parseSignedPercentage(
      summaryMatch?.groups?.yoyDirection,
      summaryMatch?.groups?.yoyValue,
    ),
    availableRangeLabels: $(".cfj-gxdb-t .tab a")
      .map((_, element) => normalizeText($(element).text()))
      .get()
      .filter(Boolean),
  });
}
