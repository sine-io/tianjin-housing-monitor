/* @vitest-environment jsdom */

import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import App from "../../site/src/App";
import type { DashboardData } from "../../site/src/lib/load-json";

const issueFormUrl =
  "https://github.com/sine-io/tianjin-housing-monitor/issues/new?template=manual-sample.yml";

const sampleData: DashboardData = {
  communities: [
    {
      id: "mingquan-huayuan",
      name: "鸣泉花园",
      city: "天津",
      district: "西青",
      status: "active",
      sources: {
        fangCommunityUrl: "https://example.com/mingquan/community",
        fangWeekreportUrl: "https://example.com/mingquan/weekreport",
      },
    },
    {
      id: "jiajun-huayuan",
      name: "富力津门湖嘉郡花园",
      city: "天津",
      district: "西青",
      status: "active",
      sources: {
        fangCommunityUrl: "https://example.com/jiajun/community",
        fangWeekreportUrl: "https://example.com/jiajun/weekreport",
      },
    },
    {
      id: "yunshu-huayuan",
      name: "富力津门湖云舒花园",
      city: "天津",
      district: "西青",
      status: "active",
      sources: {
        fangCommunityUrl: "https://example.com/yunshu/community",
        fangWeekreportUrl: "https://example.com/yunshu/weekreport",
      },
    },
    {
      id: "boxi-huayuan",
      name: "富力津门湖柏溪花园",
      city: "天津",
      district: "西青",
      status: "active",
      sources: {
        fangCommunityUrl: "https://example.com/boxi/community",
        fangWeekreportUrl: "https://example.com/boxi/weekreport",
      },
    },
    {
      id: "haiyi-changzhou-hanboyuan",
      name: "海逸长洲瀚波园",
      city: "天津",
      district: "西青",
      status: "active",
      sources: {
        fangCommunityUrl: "https://example.com/haiyi/community",
        fangWeekreportUrl: "https://example.com/haiyi/weekreport",
      },
    },
  ],
  segments: [
    {
      communityId: "mingquan-huayuan",
      id: "2br-87-90",
      label: "两居 87-90㎡",
      rooms: 2,
      areaMin: 87,
      areaMax: 90,
    },
    {
      communityId: "haiyi-changzhou-hanboyuan",
      id: "3br-140-150",
      label: "三居 140-150㎡",
      rooms: 3,
      areaMin: 140,
      areaMax: 150,
    },
  ],
  cityMarket: {
    city: "天津",
    series: [
      {
        date: "2026-01-31",
        generatedAt: "2026-02-01T00:00:00.000Z",
        sourceMonth: "2026-01",
        secondaryHomePriceIndexMom: 100.1,
        secondaryHomePriceIndexYoy: 95.5,
        verdict: "偏强",
      },
      {
        date: "2026-02-28",
        generatedAt: "2026-03-01T00:00:00.000Z",
        sourceMonth: "2026-02",
        secondaryHomePriceIndexMom: 99.8,
        secondaryHomePriceIndexYoy: 94.8,
        verdict: "中性",
      },
      {
        date: "2026-03-31",
        generatedAt: "2026-03-31T13:34:33.572Z",
        sourceMonth: "2026-03",
        secondaryHomePriceIndexMom: 99.5,
        secondaryHomePriceIndexYoy: 94,
        verdict: "偏弱",
      },
    ],
  },
  latestReport: {
    generatedAt: "2026-03-31T14:20:06.801Z",
    weekEnding: "2026-03-31",
    cityMarket: {
      date: "2026-03-31",
      generatedAt: "2026-03-31T13:34:33.572Z",
      sourceMonth: "2026-03",
      secondaryHomePriceIndexMom: 99.5,
      secondaryHomePriceIndexYoy: 94,
      verdict: "偏弱",
    },
    communities: {
      "mingquan-huayuan": {
        name: "鸣泉花园",
        district: "西青",
        segments: {
          "2br-87-90": {
            label: "两居 87-90㎡",
            verdict: "样本不足",
            latest: {
              listingUnitPriceMedian: 23006,
              listingUnitPriceMin: 23006,
              listingsCount: 1,
              suspectedDealCount: 177,
              manualDealCount: 0,
            },
          },
          "3br-140-150": {
            label: "三居 140-150㎡",
            verdict: "样本不足",
            latest: {
              listingUnitPriceMedian: 23006,
              listingUnitPriceMin: 23006,
              listingsCount: 0,
              suspectedDealCount: 177,
              manualDealCount: 0,
            },
          },
        },
      },
      "jiajun-huayuan": {
        name: "富力津门湖嘉郡花园",
        district: "西青",
        segments: {
          "2br-87-90": {
            label: "两居 87-90㎡",
            verdict: "样本不足",
            latest: {
              listingUnitPriceMedian: 22233,
              listingUnitPriceMin: 22233,
              listingsCount: 0,
              suspectedDealCount: 193,
              manualDealCount: 0,
            },
          },
          "3br-140-150": {
            label: "三居 140-150㎡",
            verdict: "样本不足",
            latest: {
              listingUnitPriceMedian: 22233,
              listingUnitPriceMin: 22233,
              listingsCount: 0,
              suspectedDealCount: 193,
              manualDealCount: 0,
            },
          },
        },
      },
      "yunshu-huayuan": {
        name: "富力津门湖云舒花园",
        district: "西青",
        segments: {
          "2br-87-90": {
            label: "两居 87-90㎡",
            verdict: "样本不足",
            latest: {
              listingUnitPriceMedian: 23402,
              listingUnitPriceMin: 23402,
              listingsCount: 1,
              suspectedDealCount: 235,
              manualDealCount: 0,
            },
          },
          "3br-140-150": {
            label: "三居 140-150㎡",
            verdict: "样本不足",
            latest: {
              listingUnitPriceMedian: 23402,
              listingUnitPriceMin: 23402,
              listingsCount: 1,
              suspectedDealCount: 235,
              manualDealCount: 0,
            },
          },
        },
      },
      "boxi-huayuan": {
        name: "富力津门湖柏溪花园",
        district: "西青",
        segments: {
          "2br-87-90": {
            label: "两居 87-90㎡",
            verdict: "样本不足",
            latest: {
              listingUnitPriceMedian: 25301,
              listingUnitPriceMin: 25301,
              listingsCount: 0,
              suspectedDealCount: 122,
              manualDealCount: 0,
            },
          },
          "3br-140-150": {
            label: "三居 140-150㎡",
            verdict: "样本不足",
            latest: {
              listingUnitPriceMedian: 25301,
              listingUnitPriceMin: 25301,
              listingsCount: 0,
              suspectedDealCount: 122,
              manualDealCount: 0,
            },
          },
        },
      },
      "haiyi-changzhou-hanboyuan": {
        name: "海逸长洲瀚波园",
        district: "西青",
        segments: {
          "2br-87-90": {
            label: "两居 87-90㎡",
            verdict: "样本不足",
            latest: {
              listingUnitPriceMedian: 28064,
              listingUnitPriceMin: 28064,
              listingsCount: 1,
              suspectedDealCount: 210,
              manualDealCount: 0,
            },
          },
          "3br-140-150": {
            label: "三居 140-150㎡",
            verdict: "样本不足",
            latest: {
              listingUnitPriceMedian: 28064,
              listingUnitPriceMin: 28064,
              listingsCount: 0,
              suspectedDealCount: 210,
              manualDealCount: 0,
            },
          },
        },
      },
    },
  },
  communitySeries: {
    "mingquan-huayuan": {
      "2br-87-90": {
        communityId: "mingquan-huayuan",
        communityName: "鸣泉花园",
        segmentId: "2br-87-90",
        segmentLabel: "两居 87-90㎡",
        rooms: 2,
        areaMin: 87,
        areaMax: 90,
        series: [
          {
            date: "2026-01-31",
            generatedAt: "2026-02-01T00:00:00.000Z",
            derivedFrom: "community-fallback",
            listingUnitPriceMedian: 23200,
            listingUnitPriceMin: 23200,
            listingsCount: 2,
            suspectedDealCount: 165,
            manualDealCount: 0,
            manualDealUnitPriceMedian: null,
            manualLatestSampleAt: null,
          },
          {
            date: "2026-02-28",
            generatedAt: "2026-03-01T00:00:00.000Z",
            derivedFrom: "community-fallback",
            listingUnitPriceMedian: 23120,
            listingUnitPriceMin: 23120,
            listingsCount: 1,
            suspectedDealCount: 171,
            manualDealCount: 0,
            manualDealUnitPriceMedian: null,
            manualLatestSampleAt: null,
          },
          {
            date: "2026-03-31",
            generatedAt: "2026-03-31T13:34:33.572Z",
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
      "3br-140-150": {
        communityId: "mingquan-huayuan",
        communityName: "鸣泉花园",
        segmentId: "3br-140-150",
        segmentLabel: "三居 140-150㎡",
        rooms: 3,
        areaMin: 140,
        areaMax: 150,
        series: [
          {
            date: "2026-01-31",
            generatedAt: "2026-02-01T00:00:00.000Z",
            derivedFrom: "community-fallback",
            listingUnitPriceMedian: 23200,
            listingUnitPriceMin: 23200,
            listingsCount: 1,
            suspectedDealCount: 165,
            manualDealCount: 0,
            manualDealUnitPriceMedian: null,
            manualLatestSampleAt: null,
          },
          {
            date: "2026-02-28",
            generatedAt: "2026-03-01T00:00:00.000Z",
            derivedFrom: "community-fallback",
            listingUnitPriceMedian: 23120,
            listingUnitPriceMin: 23120,
            listingsCount: 0,
            suspectedDealCount: 171,
            manualDealCount: 0,
            manualDealUnitPriceMedian: null,
            manualLatestSampleAt: null,
          },
          {
            date: "2026-03-31",
            generatedAt: "2026-03-31T13:34:33.572Z",
            derivedFrom: "community-fallback",
            listingUnitPriceMedian: 23006,
            listingUnitPriceMin: 23006,
            listingsCount: 0,
            suspectedDealCount: 177,
            manualDealCount: 0,
            manualDealUnitPriceMedian: null,
            manualLatestSampleAt: null,
          },
        ],
      },
    },
    "jiajun-huayuan": {
      "2br-87-90": {
        communityId: "jiajun-huayuan",
        communityName: "富力津门湖嘉郡花园",
        segmentId: "2br-87-90",
        segmentLabel: "两居 87-90㎡",
        rooms: 2,
        areaMin: 87,
        areaMax: 90,
        series: [
          {
            date: "2026-03-31",
            generatedAt: "2026-03-31T13:34:33.572Z",
            derivedFrom: "community-fallback",
            listingUnitPriceMedian: 22233,
            listingUnitPriceMin: 22233,
            listingsCount: 0,
            suspectedDealCount: 193,
            manualDealCount: 0,
            manualDealUnitPriceMedian: null,
            manualLatestSampleAt: null,
          },
        ],
      },
      "3br-140-150": {
        communityId: "jiajun-huayuan",
        communityName: "富力津门湖嘉郡花园",
        segmentId: "3br-140-150",
        segmentLabel: "三居 140-150㎡",
        rooms: 3,
        areaMin: 140,
        areaMax: 150,
        series: [
          {
            date: "2026-03-31",
            generatedAt: "2026-03-31T13:34:33.572Z",
            derivedFrom: "community-fallback",
            listingUnitPriceMedian: 22233,
            listingUnitPriceMin: 22233,
            listingsCount: 0,
            suspectedDealCount: 193,
            manualDealCount: 0,
            manualDealUnitPriceMedian: null,
            manualLatestSampleAt: null,
          },
        ],
      },
    },
    "yunshu-huayuan": {
      "2br-87-90": {
        communityId: "yunshu-huayuan",
        communityName: "富力津门湖云舒花园",
        segmentId: "2br-87-90",
        segmentLabel: "两居 87-90㎡",
        rooms: 2,
        areaMin: 87,
        areaMax: 90,
        series: [
          {
            date: "2026-03-31",
            generatedAt: "2026-03-31T13:34:33.572Z",
            derivedFrom: "community-fallback",
            listingUnitPriceMedian: 23402,
            listingUnitPriceMin: 23402,
            listingsCount: 1,
            suspectedDealCount: 235,
            manualDealCount: 0,
            manualDealUnitPriceMedian: null,
            manualLatestSampleAt: null,
          },
        ],
      },
      "3br-140-150": {
        communityId: "yunshu-huayuan",
        communityName: "富力津门湖云舒花园",
        segmentId: "3br-140-150",
        segmentLabel: "三居 140-150㎡",
        rooms: 3,
        areaMin: 140,
        areaMax: 150,
        series: [
          {
            date: "2026-03-31",
            generatedAt: "2026-03-31T13:34:33.572Z",
            derivedFrom: "community-fallback",
            listingUnitPriceMedian: 23402,
            listingUnitPriceMin: 23402,
            listingsCount: 1,
            suspectedDealCount: 235,
            manualDealCount: 0,
            manualDealUnitPriceMedian: null,
            manualLatestSampleAt: null,
          },
        ],
      },
    },
    "boxi-huayuan": {
      "2br-87-90": {
        communityId: "boxi-huayuan",
        communityName: "富力津门湖柏溪花园",
        segmentId: "2br-87-90",
        segmentLabel: "两居 87-90㎡",
        rooms: 2,
        areaMin: 87,
        areaMax: 90,
        series: [
          {
            date: "2026-03-31",
            generatedAt: "2026-03-31T13:34:33.572Z",
            derivedFrom: "community-fallback",
            listingUnitPriceMedian: 25301,
            listingUnitPriceMin: 25301,
            listingsCount: 0,
            suspectedDealCount: 122,
            manualDealCount: 0,
            manualDealUnitPriceMedian: null,
            manualLatestSampleAt: null,
          },
        ],
      },
      "3br-140-150": {
        communityId: "boxi-huayuan",
        communityName: "富力津门湖柏溪花园",
        segmentId: "3br-140-150",
        segmentLabel: "三居 140-150㎡",
        rooms: 3,
        areaMin: 140,
        areaMax: 150,
        series: [
          {
            date: "2026-03-31",
            generatedAt: "2026-03-31T13:34:33.572Z",
            derivedFrom: "community-fallback",
            listingUnitPriceMedian: 25301,
            listingUnitPriceMin: 25301,
            listingsCount: 0,
            suspectedDealCount: 122,
            manualDealCount: 0,
            manualDealUnitPriceMedian: null,
            manualLatestSampleAt: null,
          },
        ],
      },
    },
    "haiyi-changzhou-hanboyuan": {
      "2br-87-90": {
        communityId: "haiyi-changzhou-hanboyuan",
        communityName: "海逸长洲瀚波园",
        segmentId: "2br-87-90",
        segmentLabel: "两居 87-90㎡",
        rooms: 2,
        areaMin: 87,
        areaMax: 90,
        series: [
          {
            date: "2026-03-31",
            generatedAt: "2026-03-31T13:34:33.572Z",
            derivedFrom: "community-fallback",
            listingUnitPriceMedian: 28064,
            listingUnitPriceMin: 28064,
            listingsCount: 1,
            suspectedDealCount: 210,
            manualDealCount: 0,
            manualDealUnitPriceMedian: null,
            manualLatestSampleAt: null,
          },
        ],
      },
      "3br-140-150": {
        communityId: "haiyi-changzhou-hanboyuan",
        communityName: "海逸长洲瀚波园",
        segmentId: "3br-140-150",
        segmentLabel: "三居 140-150㎡",
        rooms: 3,
        areaMin: 140,
        areaMax: 150,
        series: [
          {
            date: "2026-03-31",
            generatedAt: "2026-03-31T13:34:33.572Z",
            derivedFrom: "community-fallback",
            listingUnitPriceMedian: 28064,
            listingUnitPriceMin: 28064,
            listingsCount: 0,
            suspectedDealCount: 210,
            manualDealCount: 0,
            manualDealUnitPriceMedian: null,
            manualLatestSampleAt: null,
          },
        ],
      },
    },
  },
};

describe("site App", () => {
  it("uses the repository manual issue form as the default CTA target", async () => {
    render(
      <App loader={async () => sampleData} primaryCommunityId="mingquan-huayuan" />,
    );

    const manualInputLink = await screen.findByRole("link", {
      name: "新增一条样本",
    });
    expect(manualInputLink).toHaveAttribute("href", issueFormUrl);
  });

  it("renders homepage summary cards and a segment detail view from static json", async () => {
    render(
      <App
        issueFormUrl={issueFormUrl}
        loader={async () => sampleData}
        primaryCommunityId="mingquan-huayuan"
      />,
    );

    const marketCard = await screen.findByTestId("market-card");
    expect(within(marketCard).getByText("偏强")).toBeInTheDocument();
    expect(within(marketCard).getByText("中性")).toBeInTheDocument();
    expect(within(marketCard).getAllByText("偏弱").length).toBeGreaterThan(0);
    expect(screen.getByTestId("current-market-verdict")).toHaveTextContent("偏弱");

    const segmentGrid = screen.getByTestId("segment-grid");
    expect(within(segmentGrid).getAllByText("鸣泉花园")).toHaveLength(2);
    expect(within(segmentGrid).getByText("两居 87-90㎡")).toBeInTheDocument();
    expect(within(segmentGrid).getByText("三居 140-150㎡")).toBeInTheDocument();

    const anomalyCard = screen.getByTestId("anomaly-card");
    expect(within(anomalyCard).getByText("异常提醒")).toBeInTheDocument();
    expect(within(anomalyCard).getByText(/挂牌仅 1 套/)).toBeInTheDocument();

    const weeklySummary = screen.getByTestId("weekly-summary");
    expect(within(weeklySummary).getByText(/2026-03-31/)).toBeInTheDocument();
    expect(
      within(weeklySummary).getByText(/天津二手房市场偏弱/),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "查看 两居 87-90㎡ 详情" }),
    );

    expect(await screen.findByTestId("trend-chart")).toBeInTheDocument();
    expect(
      screen.getByText(/鸣泉花园 两居 87-90㎡ 当前判定为样本不足/),
    ).toBeInTheDocument();

    const comparisonView = screen.getByTestId("comparison-communities");
    expect(
      within(comparisonView).getByText("富力津门湖嘉郡花园"),
    ).toBeInTheDocument();
    expect(
      within(comparisonView).getByText("富力津门湖云舒花园"),
    ).toBeInTheDocument();
    expect(
      within(comparisonView).getByText("富力津门湖柏溪花园"),
    ).toBeInTheDocument();
    expect(within(comparisonView).getByText("海逸长洲瀚波园")).toBeInTheDocument();

    const manualInputLink = screen.getByRole("link", {
      name: "新增一条样本",
    });
    expect(manualInputLink).toHaveAttribute("href", issueFormUrl);
  });

  it("falls back to the latest city-market series entry when the report market snapshot is missing", async () => {
    render(
      <App
        issueFormUrl={issueFormUrl}
        loader={async () => ({
          ...sampleData,
          latestReport: sampleData.latestReport
            ? {
                ...sampleData.latestReport,
                cityMarket: null,
              }
            : null,
        })}
        primaryCommunityId="mingquan-huayuan"
      />,
    );

    expect(await screen.findByTestId("current-market-verdict")).toHaveTextContent(
      "偏弱",
    );

    const weeklySummary = screen.getByTestId("weekly-summary");
    expect(within(weeklySummary).getByText(/2026-03-31/)).toBeInTheDocument();
    expect(
      within(weeklySummary).getByText(/天津二手房市场偏弱/),
    ).toBeInTheDocument();
    expect(
      within(weeklySummary).queryByText(/暂无最新周报摘要/),
    ).not.toBeInTheDocument();
  });

  it("derives the detail conclusion from the latest series entry when the weekly snapshot latest block is missing", async () => {
    render(
      <App
        issueFormUrl={issueFormUrl}
        loader={async () => ({
          ...sampleData,
          latestReport: sampleData.latestReport
            ? {
                ...sampleData.latestReport,
                communities: {
                  ...sampleData.latestReport.communities,
                  "mingquan-huayuan": {
                    ...sampleData.latestReport.communities["mingquan-huayuan"],
                    segments: {
                      ...sampleData.latestReport.communities["mingquan-huayuan"]
                        .segments,
                      "2br-87-90": {
                        ...sampleData.latestReport.communities["mingquan-huayuan"]
                          .segments["2br-87-90"],
                        latest: null,
                      },
                    },
                  },
                },
              }
            : null,
        })}
        primaryCommunityId="mingquan-huayuan"
      />,
    );

    fireEvent.click(
      await screen.findByRole("button", { name: "查看 两居 87-90㎡ 详情" }),
    );

    expect(
      await screen.findByText(
        /最新挂牌中位价 23,006 元\/㎡，挂牌 1 套，疑似成交 177 套/,
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(/当前缺少最新结论/)).not.toBeInTheDocument();
  });
});
