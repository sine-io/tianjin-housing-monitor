/* @vitest-environment jsdom */

import "@testing-library/jest-dom/vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../site/src/lib/load-json", async () => {
  const actual =
    await vi.importActual<typeof import("../../site/src/lib/load-json")>(
      "../../site/src/lib/load-json",
    );

  return {
    ...actual,
    loadDashboardData: vi.fn(),
    loadRecentRunArtifacts: vi.fn(),
  };
});

import App from "../../site/src/App";
import type { DashboardData } from "../../site/src/lib/load-json";
import {
  loadDashboardData,
  loadRecentRunArtifacts,
} from "../../site/src/lib/load-json";
import type { RunArtifact } from "../../site/src/lib/dashboard-view";

const NOW = new Date("2026-04-05T04:20:00.000Z");

const mockedLoadDashboardData = vi.mocked(loadDashboardData);
const mockedLoadRecentRunArtifacts = vi.mocked(loadRecentRunArtifacts);

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
          fangCommunityUrl: "https://example.com/boxi/community",
          fangWeekreportUrl: "https://example.com/boxi/weekreport",
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
        communityId: "boxi-huayuan",
        id: "boxi-2br-100-120",
        label: "2居 100-120㎡",
        rooms: 2,
        areaMin: 100,
        areaMax: 120,
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
                suspectedDealCount: 2,
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
      "boxi-huayuan": {
        "boxi-2br-100-120": {
          communityId: "boxi-huayuan",
          communityName: "柏溪花园",
          segmentId: "boxi-2br-100-120",
          segmentLabel: "2居 100-120㎡",
          rooms: 2,
          areaMin: 100,
          areaMax: 120,
          series: [
            {
              date: "2026-04-04",
              generatedAt: "2026-04-04T03:43:21.849Z",
              derivedFrom: "community-fallback",
              listingUnitPriceMedian: 23300,
              listingUnitPriceMin: 23300,
              listingsCount: 3,
              suspectedDealCount: 2,
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

async function renderLoadedApp() {
  mockedLoadDashboardData.mockResolvedValue(makeDashboardData());
  mockedLoadRecentRunArtifacts.mockResolvedValue(makeRunArtifacts());

  const view = render(<App />);

  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });

  return view;
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  window.location.hash = "";
});

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe("site App", () => {
  it("renders the housing dashboard shell and hydrates it from real data loaders", async () => {
    await renderLoadedApp();

    expect(screen.getByText("房脉 PropPulse")).toBeInTheDocument();
    expect(screen.getByText("房源监测与价格雷达")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "首页" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "重点关注小区" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "房源全库" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "降价雷达" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "系统设置" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "置换建议" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "改善型置换建议" })).toBeInTheDocument();
    expect(
      screen.getByRole("searchbox", { name: "全局搜索" }),
    ).toHaveAttribute("placeholder", "全局搜索小区或房源...");
    expect(screen.getByText("核心小区挂牌均价走势 (近30天)")).toBeInTheDocument();
    expect(screen.getByText("单价洼地雷达")).toBeInTheDocument();
    expect(
      screen.getByText("[ Recharts Line Chart Placeholder ]"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("[ Recharts Scatter / Bubble Chart Placeholder ]"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "今日高优降价房源榜" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "目标小区篮子排序" }),
    ).toBeInTheDocument();
    expect(screen.getByText("小区")).toBeInTheDocument();
    expect(screen.getByText("面积")).toBeInTheDocument();
    expect(screen.getByText("原价")).toBeInTheDocument();
    expect(screen.getByText("现价")).toBeInTheDocument();
    expect(screen.getByText("降幅")).toBeInTheDocument();
    expect(screen.getByText("连续观测天数")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "最新动态信息流" }),
    ).toBeInTheDocument();

    expect(mockedLoadDashboardData).toHaveBeenCalledTimes(1);
    expect(mockedLoadRecentRunArtifacts).toHaveBeenCalledTimes(1);
    expect(screen.getByText("数据最后更新于: 10分钟前")).toBeInTheDocument();

    const communityCountCard = screen.getByText("监控小区总数").closest("article");
    const listingCountCard = screen.getByText("在售房源总数").closest("article");
    const droppedCountCard = screen.getByText("今日降价套数").closest("article");
    const marketTrendCard = screen.getByText("市场均价走势").closest("article");

    expect(communityCountCard).not.toBeNull();
    expect(listingCountCard).not.toBeNull();
    expect(droppedCountCard).not.toBeNull();
    expect(marketTrendCard).not.toBeNull();
    expect(within(communityCountCard!).getByText("3")).toBeInTheDocument();
    expect(within(listingCountCard!).getByText("96")).toBeInTheDocument();
    expect(within(droppedCountCard!).getByText("1")).toBeInTheDocument();
    expect(within(marketTrendCard!).getByText("-0.5%")).toBeInTheDocument();

    expect(screen.getAllByTestId("kpi-card")).toHaveLength(4);
    expect(screen.getAllByTestId("dropped-listing-row")).toHaveLength(1);
    expect(screen.getAllByTestId("timeline-item").length).toBeGreaterThanOrEqual(3);
    expect(screen.queryByText("静态看板准备中")).not.toBeInTheDocument();
    expect(screen.queryByText("静态看板无法读取 JSON")).not.toBeInTheDocument();
    expect(screen.queryByText("首页概览")).not.toBeInTheDocument();
    expect(screen.queryByText("价格信号与高优房源监控")).not.toBeInTheDocument();
    expect(screen.queryByText("Housing Dashboard")).not.toBeInTheDocument();
    expect(screen.queryByText("天津核心小区降价线索总览")).not.toBeInTheDocument();
  });

  it("keeps page scrolling disabled and uses the main content area as the only scroll container", () => {
    mockedLoadDashboardData.mockResolvedValue(makeDashboardData());
    mockedLoadRecentRunArtifacts.mockResolvedValue(makeRunArtifacts());

    const { container } = render(<App />);

    const appShell = container.firstElementChild;
    const contentScrollArea = container.querySelector("main");
    const inventorySection = screen.getByRole("region", { name: "底部区" });

    expect(appShell).toHaveClass("h-screen", "overflow-hidden");
    expect(contentScrollArea).toHaveClass(
      "dashboard-scroll-area",
      "overflow-y-auto",
    );
    expect(inventorySection).toHaveClass("xl:items-start");
  });

  it("navigates to focused communities and renders the focused section", async () => {
    await renderLoadedApp();

    const homeLink = screen.getByRole("link", { name: "首页" });
    const focusedLink = screen.getByRole("link", { name: "重点关注小区" });

    expect(focusedLink).toHaveAttribute("href", "#focus-communities");

    fireEvent.click(focusedLink);

    expect(window.location.hash).toBe("#focus-communities");
    expect(focusedLink).toHaveAttribute("aria-current", "page");
    expect(homeLink).not.toHaveAttribute("aria-current");

    const focusedSection = screen.getByRole("region", { name: "重点关注小区专区" });

    expect(
      within(focusedSection).getByRole("heading", { name: "重点关注小区" }),
    ).toBeInTheDocument();
    expect(within(focusedSection).getAllByTestId("focused-community-card")).toHaveLength(
      3,
    );
    expect(within(focusedSection).getByRole("heading", { name: "鸣泉花园" })).toBeInTheDocument();
    expect(within(focusedSection).getByRole("heading", { name: "柏溪花园" })).toBeInTheDocument();
    expect(within(focusedSection).getByRole("heading", { name: "万科东第" })).toBeInTheDocument();
  });

  it("navigates to inventory and renders the inventory section", async () => {
    await renderLoadedApp();

    const homeLink = screen.getByRole("link", { name: "首页" });
    const inventoryLink = screen.getByRole("link", { name: "房源全库" });

    expect(inventoryLink).toHaveAttribute("href", "#inventory");

    fireEvent.click(inventoryLink);

    expect(window.location.hash).toBe("#inventory");
    expect(inventoryLink).toHaveAttribute("aria-current", "page");
    expect(homeLink).not.toHaveAttribute("aria-current");

    const inventorySection = screen.getByRole("region", { name: "房源全库专区" });

    expect(
      within(inventorySection).getByRole("heading", { name: "房源全库" }),
    ).toBeInTheDocument();
  });

  it("navigates to the public recommendation detail section", async () => {
    await renderLoadedApp();

    const recommendationLink = screen.getByRole("link", { name: "置换建议" });

    expect(recommendationLink).toHaveAttribute("href", "#recommendation-demo");

    fireEvent.click(recommendationLink);

    expect(window.location.hash).toBe("#recommendation-demo");

    const recommendationSection = screen.getByRole("region", {
      name: "公开置换建议详情",
    });

    expect(recommendationSection).toHaveAttribute("id", "recommendation-demo");
    expect(
      within(recommendationSection).getByRole("heading", {
        name: "改善型置换建议",
      }),
    ).toBeInTheDocument();
    expect(
      within(recommendationSection).getByText("最强支持证据"),
    ).toBeInTheDocument();
  });

  it("navigates to overview and price radar regions from the sidebar", async () => {
    await renderLoadedApp();

    const homeLink = screen.getByRole("link", { name: "首页" });
    const radarLink = screen.getByRole("link", { name: "降价雷达" });

    expect(homeLink).toHaveAttribute("href", "#overview");
    fireEvent.click(homeLink);
    expect(window.location.hash).toBe("#overview");

    const overviewSection = screen.getByRole("region", { name: "首页概览" });
    expect(overviewSection).toHaveAttribute("id", "overview");
    expect(overviewSection.querySelector("#price-radar")).toBeNull();
    expect(overviewSection.querySelector("#focus-communities")).toBeNull();
    expect(overviewSection.querySelector("#inventory")).toBeNull();
    expect(overviewSection.querySelector("#settings")).toBeNull();

    expect(radarLink).toHaveAttribute("href", "#price-radar");
    fireEvent.click(radarLink);
    expect(window.location.hash).toBe("#price-radar");

    const radarSection = screen.getByRole("region", { name: "降价雷达专区" });
    expect(radarSection).toHaveAttribute("id", "price-radar");
  });

  it("renders the inventory section with all monitored communities", async () => {
    await renderLoadedApp();

    const inventorySection = screen.getByRole("region", { name: "房源全库专区" });

    expect(
      within(inventorySection).getByRole("heading", { name: "房源全库" }),
    ).toBeInTheDocument();
    expect(
      within(inventorySection).getAllByTestId("inventory-community-card"),
    ).toHaveLength(3);
    expect(
      within(inventorySection).getByRole("heading", { name: "鸣泉花园" }),
    ).toBeInTheDocument();
    expect(
      within(inventorySection).getByRole("heading", { name: "柏溪花园" }),
    ).toBeInTheDocument();
    expect(
      within(inventorySection).getByRole("heading", { name: "万科东第" }),
    ).toBeInTheDocument();
    expect(within(inventorySection).getAllByText("房天下小区").length).toBeGreaterThan(0);
  });

  it("renders the settings section with dashboard maintenance guidance", async () => {
    await renderLoadedApp();

    const settingsLink = screen.getByRole("link", { name: "系统设置" });

    expect(settingsLink).toHaveAttribute("href", "#settings");

    fireEvent.click(settingsLink);

    expect(window.location.hash).toBe("#settings");
    expect(document.querySelectorAll("#settings")).toHaveLength(1);

    const settingsSection = screen.getByRole("region", { name: "系统设置专区" });
    const strategyCard = screen.getByText("今日策略").closest("div");

    expect(settingsSection).toHaveAttribute("id", "settings");
    expect(strategyCard).not.toBeNull();
    expect(strategyCard).not.toHaveAttribute("id", "settings");

    expect(
      within(settingsSection).getByRole("heading", { name: "系统设置" }),
    ).toBeInTheDocument();
    expect(within(settingsSection).getByText("数据刷新")).toBeInTheDocument();
    expect(
      within(settingsSection).getByText("npm run build / npm run test:e2e"),
    ).toBeInTheDocument();
  });
});
