/* @vitest-environment jsdom */

import "@testing-library/jest-dom/vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { DashboardData } from "../../site/src/lib/load-json";

const { mockLoadDashboardData } = vi.hoisted(() => ({
  mockLoadDashboardData: vi.fn(),
}));

vi.mock("../../site/src/lib/load-json", async () => {
  const actual =
    await vi.importActual<typeof import("../../site/src/lib/load-json")>(
      "../../site/src/lib/load-json",
    );

  return {
    ...actual,
    loadDashboardData: mockLoadDashboardData,
  };
});

import App from "../../site/src/App";

function makeSampleData(): DashboardData {
  const cityMarketEntry = {
    date: "2026-04-01",
    generatedAt: "2026-04-01T07:32:04.312Z",
    sourceMonth: "2026-02",
    secondaryHomePriceIndexMom: 99.5,
    secondaryHomePriceIndexYoy: 94,
    verdict: "偏弱" as const,
  };

  const primarySegment = {
    communityId: "mingquan-huayuan",
    id: "mingquan-2br-87-90",
    label: "2居 87-90㎡",
    rooms: 2,
    areaMin: 87,
    areaMax: 90,
  };

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
          fangCommunityUrl: "https://example.com/mingquan/community",
          fangWeekreportUrl: "https://example.com/mingquan/weekreport",
          anjukeSaleSearchUrl: null,
        },
      },
    ],
    segments: [primarySegment],
    primarySegmentsByCommunityId: {
      "mingquan-huayuan": primarySegment,
    },
    cityMarket: {
      city: "天津",
      series: [cityMarketEntry],
    },
    latestReport: {
      generatedAt: "2026-04-01T07:52:16.764Z",
      weekEnding: "2026-04-01",
      cityMarket: cityMarketEntry,
      communities: {
        "mingquan-huayuan": {
          name: "鸣泉花园",
          district: "西青",
          segments: {
            "mingquan-2br-87-90": {
              label: "2居 87-90㎡",
              verdict: "样本不足",
              latest: {
                listingUnitPriceMedian: 23006,
                listingUnitPriceMin: 23006,
                listingsCount: 1,
                suspectedDealCount: 177,
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
              date: "2026-04-01",
              generatedAt: "2026-04-01T07:32:04.312Z",
              derivedFrom: "community-fallback",
              listingUnitPriceMedian: 23006,
              listingUnitPriceMin: 23006,
              listingsCount: 1,
              suspectedDealCount: 177,
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

async function renderAppWithMockedData(): Promise<void> {
  render(<App />);

  await waitFor(() => {
    expect(mockLoadDashboardData).toHaveBeenCalledTimes(1);
  });

  const loadResult = mockLoadDashboardData.mock.results[0];

  if (!loadResult || loadResult.type !== "return") {
    throw new Error("loadDashboardData did not return a promise");
  }

  await act(async () => {
    await loadResult.value;
  });
}

describe("site App", () => {
  beforeEach(() => {
    mockLoadDashboardData.mockReset();
    mockLoadDashboardData.mockResolvedValue(makeSampleData());
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders the housing dashboard shell", async () => {
    await renderAppWithMockedData();

    expect(screen.getByText("Tianjin Housing Monitor")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "首页" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(
      screen.getByPlaceholderText("全局搜索小区或房源..."),
    ).toBeInTheDocument();
    expect(screen.getByText("数据最后更新于: 10分钟前")).toBeInTheDocument();
  });

  it("renders KPI cards and dashboard content sections", async () => {
    await renderAppWithMockedData();

    expect(screen.getByText("今日降价套数")).toBeInTheDocument();
    expect(screen.getByText("核心小区挂牌均价走势 (近30天)")).toBeInTheDocument();
    expect(
      screen.getByText("[ Recharts Scatter / Bubble Chart Placeholder ]"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "今日高优降价房源榜" }),
    ).toBeInTheDocument();
    expect(screen.getByText("万科新里程")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "最新动态信息流" }),
    ).toBeInTheDocument();
  });
});
