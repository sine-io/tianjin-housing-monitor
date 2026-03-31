import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { parseFangWeekreport } from "../../parser/fang-weekreport";

interface WeekreportFixtureExpectation {
  fileName: string;
  communityName: string;
  latestMonthLabel: string;
  latestPriceYuanPerSqm: number;
  districtName: string;
  districtPremiumPct: number;
  momChangePct: number;
  yoyChangePct: number;
}

const weekreportFixtures: WeekreportFixtureExpectation[] = [
  {
    fileName: "mingquan-huayuan.html",
    communityName: "富力津门湖鸣泉花园",
    latestMonthLabel: "3月",
    latestPriceYuanPerSqm: 23006,
    districtName: "西青",
    districtPremiumPct: 7.72,
    momChangePct: 0.99,
    yoyChangePct: -10.72,
  },
  {
    fileName: "jiajun-huayuan.html",
    communityName: "富力津门湖嘉郡花园",
    latestMonthLabel: "3月",
    latestPriceYuanPerSqm: 22233,
    districtName: "西青",
    districtPremiumPct: 8.69,
    momChangePct: -0.53,
    yoyChangePct: -6.83,
  },
  {
    fileName: "yunshu-huayuan.html",
    communityName: "富力津门湖云舒花园",
    latestMonthLabel: "3月",
    latestPriceYuanPerSqm: 23402,
    districtName: "西青",
    districtPremiumPct: 7.24,
    momChangePct: 2.69,
    yoyChangePct: -4.49,
  },
  {
    fileName: "boxi-huayuan.html",
    communityName: "富力津门湖柏溪花园",
    latestMonthLabel: "3月",
    latestPriceYuanPerSqm: 25301,
    districtName: "西青",
    districtPremiumPct: 5.91,
    momChangePct: 1.05,
    yoyChangePct: -7.32,
  },
  {
    fileName: "haiyi-changzhou-hanboyuan.html",
    communityName: "海逸长洲瀚波园",
    latestMonthLabel: "3月",
    latestPriceYuanPerSqm: 28064,
    districtName: "西青",
    districtPremiumPct: 4.1,
    momChangePct: -1.4,
    yoyChangePct: -11.19,
  },
];

function readFixtureHtml(fileName: string): string {
  return readFileSync(
    resolve("tests/fixtures/fang/weekreport", fileName),
    "utf8",
  );
}

describe("parseFangWeekreport", () => {
  it.each(weekreportFixtures)(
    "parses the mobile price fixture for $fileName",
    (fixture) => {
      const parsed = parseFangWeekreport(readFixtureHtml(fixture.fileName));

      expect(parsed.communityName).toBe(fixture.communityName);
      expect(parsed.pricePoints).toEqual([
        {
          label: fixture.latestMonthLabel,
          priceYuanPerSqm: fixture.latestPriceYuanPerSqm,
        },
      ]);
      expect(parsed.listingCount).toBeNull();
      expect(parsed.districtName).toBe(fixture.districtName);
      expect(parsed.districtPremiumPct).toBe(fixture.districtPremiumPct);
      expect(parsed.momChangePct).toBe(fixture.momChangePct);
      expect(parsed.yoyChangePct).toBe(fixture.yoyChangePct);
      expect(parsed.availableRangeLabels).toEqual(["近6月", "近1年", "近3年"]);
    },
  );

  it("throws when given a structurally wrong page", () => {
    const communityHtml = readFileSync(
      resolve("tests/fixtures/fang/community/mingquan-huayuan.html"),
      "utf8",
    );

    expect(() => parseFangWeekreport(communityHtml)).toThrow();
    expect(() => parseFangWeekreport("<html><body>blocked</body></html>")).toThrow();
  });
});
