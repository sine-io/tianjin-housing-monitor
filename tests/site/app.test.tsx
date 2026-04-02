/* @vitest-environment jsdom */

import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import App from "../../site/src/App";
import type { DashboardData } from "../../site/src/lib/load-json";

const issueFormUrl =
  "https://github.com/sine-io/tianjin-housing-monitor/issues/new?template=manual-sample.yml";

function makeSampleData(): DashboardData {
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
        id: "lianhai-yuan",
        name: "恋海园",
        city: "天津",
        district: "待确认",
        status: "pending_verification",
        sourceProvider: "none",
        sources: {
          fangCommunityUrl: null,
          fangWeekreportUrl: null,
          anjukeSaleSearchUrl: null,
        },
      },
      {
        id: "wanke-dongdi",
        name: "万科东第",
        city: "天津",
        district: "待确认",
        status: "pending_verification",
        sourceProvider: "none",
        sources: {
          fangCommunityUrl: null,
          fangWeekreportUrl: null,
          anjukeSaleSearchUrl: null,
        },
      },
      {
        id: "yijing-cun",
        name: "谊景村",
        city: "天津",
        district: "待确认",
        status: "pending_verification",
        sourceProvider: "none",
        sources: {
          fangCommunityUrl: null,
          fangWeekreportUrl: null,
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
        communityId: "lianhai-yuan",
        id: "lianhai-2br-90-110",
        label: "2居 90-110㎡",
        rooms: 2,
        areaMin: 90,
        areaMax: 110,
      },
      {
        communityId: "wanke-dongdi",
        id: "wanke-3br-100-105",
        label: "3居 100-105㎡",
        rooms: 3,
        areaMin: 100,
        areaMax: 105,
      },
      {
        communityId: "yijing-cun",
        id: "yijing-2br-75-90",
        label: "2居 75-90㎡",
        rooms: 2,
        areaMin: 75,
        areaMax: 90,
      },
    ],
    cityMarket: {
      city: "天津",
      series: [
        {
          date: "2026-02-28",
          generatedAt: "2026-03-01T00:00:00.000Z",
          sourceMonth: "2026-02",
          secondaryHomePriceIndexMom: 99.8,
          secondaryHomePriceIndexYoy: 94.8,
          verdict: "中性",
        },
        {
          date: "2026-04-01",
          generatedAt: "2026-04-01T07:32:04.312Z",
          sourceMonth: "2026-02",
          secondaryHomePriceIndexMom: 99.5,
          secondaryHomePriceIndexYoy: 94,
          verdict: "偏弱",
        },
      ],
    },
    latestReport: {
      generatedAt: "2026-04-01T07:52:16.764Z",
      weekEnding: "2026-04-01",
      cityMarket: {
        date: "2026-04-01",
        generatedAt: "2026-04-01T07:32:04.312Z",
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
                listingUnitPriceMedian: 23006,
                listingUnitPriceMin: 23006,
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
              verdict: "下跌",
              latest: {
                listingUnitPriceMedian: 25301,
                listingUnitPriceMin: 25301,
                listingsCount: 2,
                suspectedDealCount: 122,
                manualDealCount: 1,
              },
            },
          },
        },
        "lianhai-yuan": {
          name: "恋海园",
          district: "待确认",
          segments: {
            "lianhai-2br-90-110": {
              label: "2居 90-110㎡",
              verdict: "上涨",
              latest: {
                listingUnitPriceMedian: 21500,
                listingUnitPriceMin: 21300,
                listingsCount: 4,
                suspectedDealCount: 2,
                manualDealCount: 2,
              },
            },
          },
        },
        "wanke-dongdi": {
          name: "万科东第",
          district: "待确认",
          segments: {
            "wanke-3br-100-105": {
              label: "3居 100-105㎡",
              verdict: "横盘",
              latest: {
                listingUnitPriceMedian: 26800,
                listingUnitPriceMin: 26600,
                listingsCount: 3,
                suspectedDealCount: 1,
                manualDealCount: 1,
              },
            },
          },
        },
        "yijing-cun": {
          name: "谊景村",
          district: "待确认",
          segments: {
            "yijing-2br-75-90": {
              label: "2居 75-90㎡",
              verdict: "以价换量",
              latest: {
                listingUnitPriceMedian: 19800,
                listingUnitPriceMin: 19600,
                listingsCount: 5,
                suspectedDealCount: 2,
                manualDealCount: 1,
              },
            },
          },
        },
      },
    },
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
      "lianhai-yuan": {
        communityId: "lianhai-yuan",
        id: "lianhai-2br-90-110",
        label: "2居 90-110㎡",
        rooms: 2,
        areaMin: 90,
        areaMax: 110,
      },
      "wanke-dongdi": {
        communityId: "wanke-dongdi",
        id: "wanke-3br-100-105",
        label: "3居 100-105㎡",
        rooms: 3,
        areaMin: 100,
        areaMax: 105,
      },
      "yijing-cun": {
        communityId: "yijing-cun",
        id: "yijing-2br-75-90",
        label: "2居 75-90㎡",
        rooms: 2,
        areaMin: 75,
        areaMax: 90,
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
              date: "2026-03-01",
              generatedAt: "2026-03-01T00:00:00.000Z",
              derivedFrom: "community-fallback",
              listingUnitPriceMedian: 23120,
              listingUnitPriceMin: 23120,
              listingsCount: 2,
              suspectedDealCount: 171,
              manualDealCount: 0,
              manualDealUnitPriceMedian: null,
              manualLatestSampleAt: null,
            },
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
              date: "2026-04-01",
              generatedAt: "2026-04-01T07:32:04.312Z",
              derivedFrom: "segment-teasers",
              listingUnitPriceMedian: 25301,
              listingUnitPriceMin: 25301,
              listingsCount: 2,
              suspectedDealCount: 122,
              manualDealCount: 1,
              manualDealUnitPriceMedian: 25080,
              manualLatestSampleAt: "2026-03-30T09:00:00.000Z",
            },
          ],
        },
      },
      "lianhai-yuan": {
        "lianhai-2br-90-110": {
          communityId: "lianhai-yuan",
          communityName: "恋海园",
          segmentId: "lianhai-2br-90-110",
          segmentLabel: "2居 90-110㎡",
          rooms: 2,
          areaMin: 90,
          areaMax: 110,
          series: [
            {
              date: "2026-04-01",
              generatedAt: "2026-04-01T07:32:04.312Z",
              derivedFrom: "segment-teasers",
              listingUnitPriceMedian: 21500,
              listingUnitPriceMin: 21300,
              listingsCount: 4,
              suspectedDealCount: 2,
              manualDealCount: 2,
              manualDealUnitPriceMedian: 21400,
              manualLatestSampleAt: "2026-03-31T10:15:00.000Z",
            },
          ],
        },
      },
      "wanke-dongdi": {
        "wanke-3br-100-105": {
          communityId: "wanke-dongdi",
          communityName: "万科东第",
          segmentId: "wanke-3br-100-105",
          segmentLabel: "3居 100-105㎡",
          rooms: 3,
          areaMin: 100,
          areaMax: 105,
          series: [
            {
              date: "2026-04-01",
              generatedAt: "2026-04-01T07:32:04.312Z",
              derivedFrom: "segment-teasers",
              listingUnitPriceMedian: 26800,
              listingUnitPriceMin: 26600,
              listingsCount: 3,
              suspectedDealCount: 1,
              manualDealCount: 1,
              manualDealUnitPriceMedian: 26750,
              manualLatestSampleAt: "2026-03-30T12:00:00.000Z",
            },
          ],
        },
      },
      "yijing-cun": {
        "yijing-2br-75-90": {
          communityId: "yijing-cun",
          communityName: "谊景村",
          segmentId: "yijing-2br-75-90",
          segmentLabel: "2居 75-90㎡",
          rooms: 2,
          areaMin: 75,
          areaMax: 90,
          series: [
            {
              date: "2026-04-01",
              generatedAt: "2026-04-01T07:32:04.312Z",
              derivedFrom: "segment-teasers",
              listingUnitPriceMedian: 19800,
              listingUnitPriceMin: 19600,
              listingsCount: 5,
              suspectedDealCount: 2,
              manualDealCount: 1,
              manualDealUnitPriceMedian: 19700,
              manualLatestSampleAt: "2026-03-29T08:00:00.000Z",
            },
          ],
        },
      },
    },
  };
}

describe("site App", () => {
  it("uses the repository manual issue form as the default CTA target", async () => {
    render(
      <App loader={async () => makeSampleData()} primaryCommunityId="mingquan-huayuan" />,
    );

    const manualInputLink = await screen.findByRole("link", {
      name: "新增一条样本",
    });
    expect(manualInputLink).toHaveAttribute("href", issueFormUrl);
  });

  it("renders the new five-community homepage and compares each community by its own primary segment", async () => {
    render(
      <App
        issueFormUrl={issueFormUrl}
        loader={async () => makeSampleData()}
        primaryCommunityId="mingquan-huayuan"
      />,
    );

    const marketCard = await screen.findByTestId("market-card");
    expect(within(marketCard).getByText("中性")).toBeInTheDocument();
    expect(within(marketCard).getAllByText("偏弱").length).toBeGreaterThan(0);
    expect(screen.getByTestId("current-market-verdict")).toHaveTextContent("偏弱");

    const segmentGrid = screen.getByTestId("segment-grid");
    expect(screen.getByRole("heading", { name: "鸣泉花园" })).toBeInTheDocument();
    expect(within(segmentGrid).getAllByText("鸣泉花园")).toHaveLength(1);
    expect(segmentGrid.querySelectorAll(".segment-card")).toHaveLength(1);
    expect(within(segmentGrid).getByText("2居 87-90㎡")).toBeInTheDocument();
    expect(within(segmentGrid).queryByText("2居 100-120㎡")).not.toBeInTheDocument();

    const anomalyCard = screen.getByTestId("anomaly-card");
    expect(within(anomalyCard).getByText(/挂牌仅 1 套/)).toBeInTheDocument();

    const weeklySummary = screen.getByTestId("weekly-summary");
    expect(within(weeklySummary).getByText(/2026-04-01/)).toBeInTheDocument();
    expect(within(weeklySummary).getByText(/天津二手房市场偏弱/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "查看 2居 87-90㎡ 详情" }));

    expect(await screen.findByTestId("trend-chart")).toBeInTheDocument();
    expect(
      screen.getByText(/鸣泉花园 2居 87-90㎡ 当前判定为样本不足/),
    ).toBeInTheDocument();

    const comparisonView = screen.getByTestId("comparison-communities");

    const boxiRow = within(comparisonView).getByText("柏溪花园").closest("li");
    expect(boxiRow).not.toBeNull();
    expect(within(boxiRow!).getByText("2居 100-120㎡")).toBeInTheDocument();
    expect(within(boxiRow!).getByText("下跌")).toBeInTheDocument();
    expect(within(boxiRow!).getByText("25,301 元/㎡")).toBeInTheDocument();

    const lianhaiRow = within(comparisonView).getByText("恋海园").closest("li");
    expect(lianhaiRow).not.toBeNull();
    expect(within(lianhaiRow!).getByText("2居 90-110㎡")).toBeInTheDocument();
    expect(within(lianhaiRow!).getByText("待复核")).toBeInTheDocument();
    expect(within(lianhaiRow!).queryByText("上涨")).not.toBeInTheDocument();

    const wankeRow = within(comparisonView).getByText("万科东第").closest("li");
    expect(wankeRow).not.toBeNull();
    expect(within(wankeRow!).getByText("3居 100-105㎡")).toBeInTheDocument();
    expect(within(wankeRow!).getByText("待复核")).toBeInTheDocument();
    expect(within(wankeRow!).queryByText("横盘")).not.toBeInTheDocument();

    const yijingRow = within(comparisonView).getByText("谊景村").closest("li");
    expect(yijingRow).not.toBeNull();
    expect(within(yijingRow!).getByText("2居 75-90㎡")).toBeInTheDocument();
    expect(within(yijingRow!).getByText("待复核")).toBeInTheDocument();
    expect(within(yijingRow!).queryByText("以价换量")).not.toBeInTheDocument();

    const manualInputLink = screen.getByRole("link", {
      name: "新增一条样本",
    });
    expect(manualInputLink).toHaveAttribute("href", issueFormUrl);
  });

  it("shows pending_verification communities as 待复核 even when manual data exists", async () => {
    render(
      <App
        issueFormUrl={issueFormUrl}
        loader={async () => makeSampleData()}
        primaryCommunityId="lianhai-yuan"
      />,
    );

    const segmentGrid = await screen.findByTestId("segment-grid");
    expect(screen.getByRole("heading", { name: "恋海园" })).toBeInTheDocument();
    expect(segmentGrid.querySelectorAll(".segment-card")).toHaveLength(1);
    expect(within(segmentGrid).getByText("待复核")).toBeInTheDocument();
    expect(within(segmentGrid).queryByText("上涨")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "查看 2居 90-110㎡ 详情" }));

    expect(
      await screen.findByText(/恋海园 2居 90-110㎡ 当前状态为待复核/),
    ).toBeInTheDocument();

    const qualityCard = screen.getByTestId("data-quality-card");
    expect(within(qualityCard).getByText("2")).toBeInTheDocument();
    expect(within(qualityCard).getByText(/来源待复核/)).toBeInTheDocument();
  });

  it("shows 暂无 instead of 0 套 when a comparison community is missing listing counts", async () => {
    const sampleData = makeSampleData();

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
                  "boxi-huayuan": {
                    ...sampleData.latestReport.communities["boxi-huayuan"],
                    segments: {
                      "boxi-2br-100-120": {
                        ...sampleData.latestReport.communities["boxi-huayuan"].segments[
                          "boxi-2br-100-120"
                        ],
                        latest: null,
                      },
                    },
                  },
                },
              }
            : null,
          communitySeries: {
            ...sampleData.communitySeries,
            "boxi-huayuan": {
              "boxi-2br-100-120": {
                ...sampleData.communitySeries["boxi-huayuan"]["boxi-2br-100-120"],
                series: [],
              },
            },
          },
        })}
        primaryCommunityId="mingquan-huayuan"
      />,
    );

    fireEvent.click(
      await screen.findByRole("button", { name: "查看 2居 87-90㎡ 详情" }),
    );

    const comparisonView = await screen.findByTestId("comparison-communities");
    const boxiRow = within(comparisonView).getByText("柏溪花园").closest("li");

    expect(boxiRow).not.toBeNull();
    expect(within(boxiRow!).getAllByText("暂无").length).toBeGreaterThanOrEqual(2);
    expect(within(boxiRow!).queryByText("0 套")).not.toBeInTheDocument();
  });

  it("shows a config error instead of inferring a primary segment from array order", async () => {
    const sampleData = makeSampleData();

    render(
      <App
        issueFormUrl={issueFormUrl}
        loader={async () => ({
          ...sampleData,
          primarySegmentsByCommunityId: {
            ...sampleData.primarySegmentsByCommunityId,
            "mingquan-huayuan": undefined as never,
          },
        })}
        primaryCommunityId="mingquan-huayuan"
      />,
    );

    const alert = await screen.findByRole("alert");
    expect(within(alert).getByText("配置异常")).toBeInTheDocument();
    expect(
      within(alert).getByText(/鸣泉花园 缺少唯一主监控户型映射/),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("segment-grid")).not.toBeInTheDocument();
  });

  it("falls back to the latest city-market series entry when the report market snapshot is missing", async () => {
    const sampleData = makeSampleData();

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
    expect(within(weeklySummary).getByText(/2026-04-01/)).toBeInTheDocument();
    expect(within(weeklySummary).getByText(/天津二手房市场偏弱/)).toBeInTheDocument();
    expect(
      within(weeklySummary).queryByText(/暂无最新周报摘要/),
    ).not.toBeInTheDocument();
  });

  it("derives the detail conclusion from the latest series entry when the weekly snapshot latest block is missing", async () => {
    const sampleData = makeSampleData();

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
                      "mingquan-2br-87-90": {
                        ...sampleData.latestReport.communities["mingquan-huayuan"]
                          .segments["mingquan-2br-87-90"],
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
      await screen.findByRole("button", { name: "查看 2居 87-90㎡ 详情" }),
    );

    expect(
      await screen.findByText(
        /最新挂牌中位价 23,006 元\/㎡，挂牌 1 套，疑似成交 177 套/,
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(/当前缺少最新结论/)).not.toBeInTheDocument();
  });
});
