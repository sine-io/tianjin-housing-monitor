import { describe, expect, it, vi } from "vitest";

import type { DashboardData } from "../../site/src/lib/load-json";
import {
  buildDashboardViewModel,
  formatRelativeUpdatedAt,
  type RunArtifact,
} from "../../site/src/lib/dashboard-view";

const NOW = new Date("2026-04-05T04:20:00.000Z");

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
        id: "wanke-dongdi",
        name: "万科东第",
        city: "天津",
        district: "西青",
        status: "active",
        sourceProvider: "fang_mobile",
        sources: {
          fangCommunityUrl: "https://example.com/wanke/community",
          fangWeekreportUrl: "https://example.com/wanke/weekreport",
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
        communityId: "wanke-dongdi",
        id: "wanke-2br-85-90",
        label: "2居 85-90㎡",
        rooms: 2,
        areaMin: 85,
        areaMax: 90,
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
      "wanke-dongdi": {
        communityId: "wanke-dongdi",
        id: "wanke-2br-85-90",
        label: "2居 85-90㎡",
        rooms: 2,
        areaMin: 85,
        areaMax: 90,
      },
    },
    cityMarket: {
      city: "天津",
      series: [
        {
          date: "2026-04-04",
          generatedAt: "2026-04-04T03:43:21.849Z",
          sourceMonth: "2026-02",
          secondaryHomePriceIndexMom: 99.5,
          secondaryHomePriceIndexYoy: 94,
          verdict: "偏弱",
        },
      ],
    },
    latestReport: {
      generatedAt: "2026-04-05T04:12:33.914Z",
      weekEnding: "2026-04-04",
      cityMarket: {
        date: "2026-04-04",
        generatedAt: "2026-04-04T03:43:21.849Z",
        sourceMonth: "2026-02",
        secondaryHomePriceIndexMom: 99.5,
        secondaryHomePriceIndexYoy: 94,
        verdict: "偏弱",
      },
      communities: {
        "mingquan-huayuan": {
          name: "鸣泉花园",
          district: "西青",
          segments: {
            "mingquan-2br-87-90": {
              label: "2居 87-90㎡",
              verdict: "样本不足",
              latest: {
                listingUnitPriceMedian: 22980,
                listingUnitPriceMin: 22980,
                listingsCount: 1,
                suspectedDealCount: 177,
                manualDealCount: 0,
              },
            },
          },
        },
        "wanke-dongdi": {
          name: "万科东第",
          district: "西青",
          segments: {
            "wanke-2br-85-90": {
              label: "2居 85-90㎡",
              verdict: "样本不足",
              latest: {
                listingUnitPriceMedian: 24500,
                listingUnitPriceMin: 24300,
                listingsCount: 3,
                suspectedDealCount: 12,
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
          series: [
            {
              date: "2026-04-04",
              generatedAt: "2026-04-04T03:43:21.849Z",
              derivedFrom: "community-fallback",
              listingUnitPriceMedian: 22980,
              listingUnitPriceMin: 22980,
              listingsCount: 1,
              suspectedDealCount: 177,
              manualDealCount: 0,
              manualDealUnitPriceMedian: null,
              manualLatestSampleAt: null,
            },
          ],
        },
      },
      "wanke-dongdi": {
        "wanke-2br-85-90": {
          communityId: "wanke-dongdi",
          communityName: "万科东第",
          segmentId: "wanke-2br-85-90",
          segmentLabel: "2居 85-90㎡",
          rooms: 2,
          areaMin: 85,
          areaMax: 90,
          series: [
            {
              date: "2026-04-04",
              generatedAt: "2026-04-04T03:43:21.849Z",
              derivedFrom: "community-fallback",
              listingUnitPriceMedian: 24500,
              listingUnitPriceMin: 24300,
              listingsCount: 3,
              suspectedDealCount: 12,
              manualDealCount: 0,
              manualDealUnitPriceMedian: null,
              manualLatestSampleAt: null,
            },
          ],
        },
      },
    },
  };
}

function makeRunArtifacts(): RunArtifact[] {
  return [
    {
      generatedAt: "2026-04-05T04:00:00.000Z",
      sources: {},
      communities: {
        "mingquan-huayuan": {
          fangCommunity: {
            status: "success",
            listingCount: 88,
            currentListingTeasers: [
              {
                title: "鸣泉花园 2室1厅 可议价",
                roomCount: 2,
                areaSqm: 88.4,
                totalPriceWan: 205,
                unitPriceYuanPerSqm: 23190,
              },
            ],
          },
          fangWeekreport: {
            status: "success",
            pricePoints: [{ label: "4月", priceYuanPerSqm: 22980 }],
          },
        },
        "wanke-dongdi": {
          fangCommunity: {
            status: "success",
            listingCount: 3,
            currentListingTeasers: [
              {
                title: "万科东第 2室1厅 南北通透",
                roomCount: 2,
                areaSqm: 87.6,
                totalPriceWan: 214,
                unitPriceYuanPerSqm: 24429,
              },
            ],
          },
          fangWeekreport: {
            status: "success",
            pricePoints: [{ label: "4月", priceYuanPerSqm: 24500 }],
          },
        },
      },
    },
    {
      generatedAt: "2026-04-05T04:10:00.000Z",
      sources: {},
      communities: {
        "mingquan-huayuan": {
          fangCommunity: {
            status: "success",
            listingCount: 90,
            currentListingTeasers: [
              {
                title: "鸣泉花园 2室1厅 可议价",
                roomCount: 2,
                areaSqm: 88.4,
                totalPriceWan: 199,
                unitPriceYuanPerSqm: 22506,
              },
            ],
          },
          fangWeekreport: {
            status: "success",
            pricePoints: [{ label: "4月", priceYuanPerSqm: 22980 }],
          },
        },
        "wanke-dongdi": {
          fangCommunity: {
            status: "failed",
            listingCount: 999,
            currentListingTeasers: [],
          },
          fangWeekreport: {
            status: "skipped",
            pricePoints: [{ label: "4月", priceYuanPerSqm: 24500 }],
          },
        },
      },
    },
  ];
}

describe("dashboard-view", () => {
  it("formats relative update labels", () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);

    expect(formatRelativeUpdatedAt("2026-04-05T04:10:00.000Z")).toBe("10分钟前");

    vi.useRealTimers();
  });

  it("derives KPI cards from dashboard data and latest runs", () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);

    const viewModel = buildDashboardViewModel(makeDashboardData(), makeRunArtifacts());

    expect(viewModel.kpis.map((item) => item.title)).toEqual([
      "监控小区总数",
      "在售房源总数",
      "今日降价套数",
      "市场均价走势",
    ]);
    expect(viewModel.kpis[0]).toMatchObject({ value: "2" });
    expect(viewModel.kpis[1]).toMatchObject({ value: "93" });
    expect(viewModel.kpis[2]).toMatchObject({ value: "1" });
    expect(viewModel.kpis[3]).toMatchObject({ value: "-0.5%" });
    expect(viewModel.lastUpdatedLabel).toBe("10分钟前");

    vi.useRealTimers();
  });

  it("derives dropped listings from price reductions between the latest two runs", () => {
    const viewModel = buildDashboardViewModel(makeDashboardData(), makeRunArtifacts());

    expect(viewModel.droppedListings).toHaveLength(1);
    expect(viewModel.droppedListings[0]).toMatchObject({
      community: "鸣泉花园",
      area: "88㎡",
      originalPrice: "205万",
      currentPrice: "199万",
      drop: "-2.9%",
      daysOnMarket: 1,
    });
  });

  it("falls back to latest report listing counts when the latest run failed with stale totals", () => {
    const viewModel = buildDashboardViewModel(makeDashboardData(), makeRunArtifacts());

    expect(viewModel.kpis[1]).toMatchObject({
      title: "在售房源总数",
      value: "93",
    });
  });

  it("builds focused community summaries from the latest report data", () => {
    const viewModel = buildDashboardViewModel(makeDashboardData(), makeRunArtifacts());

    expect(viewModel.focusedCommunities).toHaveLength(2);
    expect(viewModel.focusedCommunities[0]).toMatchObject({
      name: "鸣泉花园",
      district: "西青",
      segmentLabel: "2居 87-90㎡",
      latestPrice: "22,980 元/㎡",
      listingsCount: "1 套",
      verdict: "样本不足",
      status: "正常监控",
      tone: "active",
    });
  });

  it("derives timeline items for drop, alert, and refresh events", () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);

    const viewModel = buildDashboardViewModel(makeDashboardData(), makeRunArtifacts());

    const dropItem = viewModel.timelineItems.find((item) => item.id.startsWith("drop:"));
    const alertItem = viewModel.timelineItems.find((item) =>
      item.id.startsWith("alert:"),
    );
    const refreshItem = viewModel.timelineItems.find((item) =>
      item.id.startsWith("refresh:"),
    );

    expect(dropItem).toMatchObject({
      tone: "positive",
    });
    expect(dropItem?.title).toContain("降价");
    expect(alertItem).toMatchObject({
      tone: "negative",
      title: "万科东第 数据抓取异常",
    });
    expect(alertItem?.description).toContain("fangCommunity / fangWeekreport");
    expect(refreshItem).toMatchObject({
      tone: "neutral",
      title: "最新监控样本已刷新完成",
    });

    vi.useRealTimers();
  });
});
