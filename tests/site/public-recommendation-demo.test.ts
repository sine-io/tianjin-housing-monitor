import { describe, expect, it } from "vitest";

import { buildPublicRecommendationDemo } from "../../site/src/lib/public-recommendation-demo";
import type { DashboardData } from "../../site/src/lib/load-json";

function makeDashboardData(): DashboardData {
  return {
    communities: [
      {
        id: "mingquan-huayuan",
        name: "鸣泉花园",
        city: "天津",
        district: "西青",
        status: "active",
        sourceProvider: "fang_mobile",
        sources: {
          fangCommunityUrl: "https://example.com/community",
          fangWeekreportUrl: "https://example.com/weekreport",
          anjukeSaleSearchUrl: null,
        },
      },
      {
        id: "boxi-huayuan",
        name: "柏溪花园",
        city: "天津",
        district: "西青",
        status: "active",
        sourceProvider: "fang_mobile",
        sources: {
          fangCommunityUrl: "https://example.com/boxi-community",
          fangWeekreportUrl: "https://example.com/boxi-weekreport",
          anjukeSaleSearchUrl: null,
        },
      },
    ],
    segments: [
      {
        communityId: "mingquan-huayuan",
        id: "mingquan-2br-87-90",
        label: "2居 87-90㎡",
        rooms: 2,
        areaMin: 87,
        areaMax: 90,
      },
      {
        communityId: "boxi-huayuan",
        id: "boxi-2br-100-120",
        label: "2居 100-120㎡",
        rooms: 2,
        areaMin: 100,
        areaMax: 120,
      },
    ],
    primarySegmentsByCommunityId: {
      "mingquan-huayuan": {
        communityId: "mingquan-huayuan",
        id: "mingquan-2br-87-90",
        label: "2居 87-90㎡",
        rooms: 2,
        areaMin: 87,
        areaMax: 90,
      },
      "boxi-huayuan": {
        communityId: "boxi-huayuan",
        id: "boxi-2br-100-120",
        label: "2居 100-120㎡",
        rooms: 2,
        areaMin: 100,
        areaMax: 120,
      },
    },
    cityMarket: {
      city: "天津",
      series: [
        {
          date: "2026-04-11",
          generatedAt: "2026-04-11T12:00:00.000Z",
          sourceMonth: "2026-03",
          secondaryHomePriceIndexMom: 99.6,
          secondaryHomePriceIndexYoy: 95.2,
          verdict: "偏弱",
        },
      ],
    },
    latestReport: {
      generatedAt: "2026-04-11T12:00:00.000Z",
      weekEnding: "2026-04-11",
      cityMarket: {
        date: "2026-04-11",
        generatedAt: "2026-04-11T12:00:00.000Z",
        sourceMonth: "2026-03",
        secondaryHomePriceIndexMom: 99.6,
        secondaryHomePriceIndexYoy: 95.2,
        verdict: "偏弱",
      },
      communities: {
        "mingquan-huayuan": {
          name: "鸣泉花园",
          district: "西青",
          segments: {
            "mingquan-2br-87-90": {
              label: "2居 87-90㎡",
              verdict: "下跌",
              latest: {
                listingUnitPriceMedian: 22980,
                listingUnitPriceMin: 22500,
                listingsCount: 6,
                suspectedDealCount: 1,
                manualDealCount: 0,
              },
            },
          },
        },
        "boxi-huayuan": {
          name: "柏溪花园",
          district: "西青",
          segments: {
            "boxi-2br-100-120": {
              label: "2居 100-120㎡",
              verdict: "横盘",
              latest: {
                listingUnitPriceMedian: 23300,
                listingUnitPriceMin: 23300,
                listingsCount: 3,
                suspectedDealCount: 0,
                manualDealCount: 0,
              },
            },
          },
        },
      },
    },
    communitySeries: {
      "mingquan-huayuan": {
        "mingquan-2br-87-90": {
          communityId: "mingquan-huayuan",
          communityName: "鸣泉花园",
          segmentId: "mingquan-2br-87-90",
          segmentLabel: "2居 87-90㎡",
          rooms: 2,
          areaMin: 87,
          areaMax: 90,
          series: [],
        },
      },
      "boxi-huayuan": {
        "boxi-2br-100-120": {
          communityId: "boxi-huayuan",
          communityName: "柏溪花园",
          segmentId: "boxi-2br-100-120",
          segmentLabel: "2居 100-120㎡",
          rooms: 2,
          areaMin: 100,
          areaMax: 120,
          series: [],
        },
      },
    },
  };
}

describe("site/src/lib/public-recommendation-demo", () => {
  it("builds one stable public recommendation demo from public market data", () => {
    const demo = buildPublicRecommendationDemo(makeDashboardData());

    expect(demo.card).toEqual({
      title: "改善型置换建议",
      action: "可以看房",
      strongestReason: expect.stringContaining("看房"),
      href: "#recommendation-demo",
    });
    expect(demo.section.title).toBe("改善型置换建议");
    expect(demo.section.strongestSupport[0]).toContain("相对价差已进入看房区");
    expect(demo.section.basketRanking).toHaveLength(2);
  });

  it("returns a stable fallback result when report data is weak or missing", () => {
    const data = makeDashboardData();
    data.latestReport = null;

    const demo = buildPublicRecommendationDemo(data);

    expect(demo.card.action).toBe("暂不判断");
    expect(demo.section.strongestCounterevidence[0]).toContain("样本不足");
  });
});
