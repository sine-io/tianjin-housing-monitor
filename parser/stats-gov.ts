import * as cheerio from "cheerio";
import { z } from "zod";

const statsGovCityMarketSchema = z
  .object({
    city: z.string().min(1),
    month: z.string().regex(/^\d{4}-\d{2}$/),
    secondaryHomePriceIndexMom: z.number().nullable(),
    secondaryHomePriceIndexYoy: z.number().nullable(),
  })
  .strict();

export type StatsGovCityMarket = z.infer<typeof statsGovCityMarketSchema>;

function normalizeText(value: string | undefined | null): string {
  return value?.replace(/\s+/g, " ").trim() ?? "";
}

function normalizeCityName(value: string): string {
  return value.replace(/\s+/g, "");
}

function parseNullableFloat(value: string | undefined | null): number | null {
  if (!value) {
    return null;
  }

  const parsed = Number.parseFloat(value);

  return Number.isFinite(parsed) ? parsed : null;
}

function parseReportMonth($: cheerio.CheerioAPI): string {
  const monthSource =
    $('meta[name="ArticleTitle"]').attr("content") ??
    normalizeText($("title").first().text());
  const match = monthSource.match(/(\d{4})年(\d{1,2})月份/);

  if (!match) {
    throw new Error("Unable to locate stats-gov report month");
  }

  return `${match[1]}-${match[2].padStart(2, "0")}`;
}

function findSecondaryHomeTable($: cheerio.CheerioAPI): cheerio.Cheerio<any> {
  const heading = $("p")
    .filter((_, element) =>
      normalizeText($(element).text())
        .replace(/\s+/g, "")
        .includes("70个大中城市二手住宅销售价格指数"),
    )
    .first();

  if (!heading.length) {
    throw new Error("Unable to locate the secondary-home heading");
  }

  const tableWrapper = heading.nextAll("div.ue_table, table").first();
  const table = tableWrapper.is("table")
    ? tableWrapper
    : tableWrapper.find("table").first();

  if (!table.length) {
    throw new Error("Unable to locate the secondary-home table");
  }

  return table;
}

export function parseStatsGovCityMarket(
  html: string,
  city: string,
): StatsGovCityMarket {
  const $ = cheerio.load(html);
  const targetCity = normalizeCityName(city);
  const month = parseReportMonth($);
  const table = findSecondaryHomeTable($);

  let secondaryHomePriceIndexMom: number | null = null;
  let secondaryHomePriceIndexYoy: number | null = null;

  for (const row of table.find("tr").toArray()) {
    const cells = $(row)
      .find("td,th")
      .toArray()
      .map((cell) => normalizeText($(cell).text()))
      .filter(Boolean);

    if (cells.length < 4) {
      continue;
    }

    const firstCity = normalizeCityName(cells[0] ?? "");
    const secondCity = normalizeCityName(cells[4] ?? "");

    if (firstCity === targetCity) {
      secondaryHomePriceIndexMom = parseNullableFloat(cells[1] ?? null);
      secondaryHomePriceIndexYoy = parseNullableFloat(cells[2] ?? null);
      break;
    }

    if (secondCity === targetCity) {
      secondaryHomePriceIndexMom = parseNullableFloat(cells[5] ?? null);
      secondaryHomePriceIndexYoy = parseNullableFloat(cells[6] ?? null);
      break;
    }
  }

  if (secondaryHomePriceIndexMom === null || secondaryHomePriceIndexYoy === null) {
    throw new Error(`Unable to locate stats-gov city row for ${city}`);
  }

  return statsGovCityMarketSchema.parse({
    city,
    month,
    secondaryHomePriceIndexMom,
    secondaryHomePriceIndexYoy,
  });
}
