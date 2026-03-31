import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { parseStatsGovCityMarket } from "../../parser/stats-gov";

function readFixtureHtml(): string {
  return readFileSync(resolve("tests/fixtures/stats-gov/tianjin.html"), "utf8");
}

describe("parseStatsGovCityMarket", () => {
  it("returns the latest Tianjin secondary-home row from the official stats page", () => {
    expect(parseStatsGovCityMarket(readFixtureHtml(), "天津")).toEqual({
      city: "天津",
      month: "2026-02",
      secondaryHomePriceIndexMom: 99.5,
      secondaryHomePriceIndexYoy: 94.0,
    });
  });

  it("throws when the target city row cannot be found", () => {
    expect(() =>
      parseStatsGovCityMarket(readFixtureHtml(), "不存在市"),
    ).toThrow();
  });
});
