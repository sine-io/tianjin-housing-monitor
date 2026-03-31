import { startTransition, useEffect, useState } from "react";

import DetailView from "./components/DetailView";
import ManualInputCard from "./components/ManualInputCard";
import MarketCard from "./components/MarketCard";
import SegmentCard from "./components/SegmentCard";
import {
  loadDashboardData,
  type CommunitySegmentSeriesEntry,
  type DashboardData,
} from "./lib/load-json";

const DEFAULT_ISSUE_FORM_URL =
  "https://github.com/example/tianjin-housing-monitor/issues/new?template=manual-sample.yml";
const DEFAULT_PRIMARY_COMMUNITY_ID = "mingquan-huayuan";

interface AppProps {
  loader?: () => Promise<DashboardData>;
  issueFormUrl?: string;
  primaryCommunityId?: string;
}

interface AnomalyItem {
  id: string;
  detail: string;
}

function formatPrice(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return "暂无";
  }

  return `${value.toLocaleString("zh-CN")} 元/㎡`;
}

function deriveLatestAnomalies(
  communityName: string,
  segments: Array<{
    segmentLabel: string;
    verdict: string | null;
    latest: {
      listingUnitPriceMedian: number | null;
      listingsCount: number;
      manualDealCount: number;
    } | null;
    latestEntry: CommunitySegmentSeriesEntry | null;
  }>,
): AnomalyItem[] {
  return segments.flatMap((segment) => {
    if (!segment.latest) {
      return [
        {
          id: `${segment.segmentLabel}-missing`,
          detail: `${communityName} ${segment.segmentLabel} 缺少最新周报快照，当前需要补全数据。`,
        },
      ];
    }

    const items: AnomalyItem[] = [];

    if (segment.latest.listingsCount < 3) {
      items.push({
        id: `${segment.segmentLabel}-inventory`,
        detail: `${segment.segmentLabel} 挂牌仅 ${segment.latest.listingsCount} 套，${segment.verdict ?? "当前结论"}需要谨慎解读。`,
      });
    }

    if (segment.latest.manualDealCount === 0) {
      items.push({
        id: `${segment.segmentLabel}-manual`,
        detail: `${segment.segmentLabel} 暂无人工成交补样，建议补一条手工样本核对价格。`,
      });
    }

    if (segment.latestEntry?.derivedFrom === "community-fallback") {
      items.push({
        id: `${segment.segmentLabel}-fallback`,
        detail: `${segment.segmentLabel} 当前采用小区级回退价格，并非户型独立挂牌样本。`,
      });
    }

    return items;
  });
}

function buildWeeklySummaryText(
  data: DashboardData,
  primaryCommunityName: string,
  insufficientSegmentCount: number,
): string {
  const currentMarketEntry =
    data.latestReport?.cityMarket ?? data.cityMarket.series.at(-1) ?? null;
  const summaryDate = data.latestReport?.weekEnding ?? currentMarketEntry?.date ?? null;

  if (!currentMarketEntry || !summaryDate) {
    return "暂无最新周报摘要，等待下一次数据构建。";
  }

  const communitySummary =
    insufficientSegmentCount > 0
      ? `；${primaryCommunityName} 当前有 ${insufficientSegmentCount} 个监控户型处于样本不足。`
      : "。";

  return `${summaryDate} ${data.cityMarket.city}二手房市场${currentMarketEntry.verdict}，环比指数 ${currentMarketEntry.secondaryHomePriceIndexMom.toFixed(
    1,
  )}，同比指数 ${currentMarketEntry.secondaryHomePriceIndexYoy.toFixed(
    1,
  )}${communitySummary}`;
}

function countInsufficientSegments(
  segments: Array<{
    verdict: string | null;
  }>,
): number {
  return segments.filter((segment) => segment.verdict === "样本不足").length;
}

export default function App({
  loader = loadDashboardData,
  issueFormUrl = DEFAULT_ISSUE_FORM_URL,
  primaryCommunityId = DEFAULT_PRIMARY_COMMUNITY_ID,
}: AppProps): React.JSX.Element {
  const [data, setData] = useState<DashboardData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    loader()
      .then((nextData) => {
        if (cancelled) {
          return;
        }

        setData(nextData);
        setErrorMessage(null);
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return;
        }

        setErrorMessage(
          error instanceof Error ? error.message : "Failed to load dashboard data",
        );
      });

    return () => {
      cancelled = true;
    };
  }, [loader]);

  if (errorMessage) {
    return (
      <main className="app-shell">
        <div className="shell">
          <section className="card error-card" role="alert">
            <div className="eyebrow">加载失败</div>
            <h1>静态看板无法读取 JSON</h1>
            <p>{errorMessage}</p>
          </section>
        </div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="app-shell">
        <div className="shell">
          <section className="card loading-card">
            <div className="eyebrow">正在载入</div>
            <h1>静态看板准备中</h1>
            <p className="muted">读取社区配置、周报快照和趋势 JSON。</p>
          </section>
        </div>
      </main>
    );
  }

  const primaryCommunity =
    data.communities.find((community) => community.id === primaryCommunityId) ??
    data.communities[0] ??
    null;

  if (!primaryCommunity) {
    return (
      <main className="app-shell">
        <div className="shell">
          <section className="card error-card" role="alert">
            <div className="eyebrow">缺少配置</div>
            <h1>未找到监控小区</h1>
            <p>请先生成 `communities.json` 后再打开静态看板。</p>
          </section>
        </div>
      </main>
    );
  }

  const primaryReport = data.latestReport?.communities[primaryCommunity.id] ?? null;
  const primarySegments = data.segments.map((segment) => {
    const snapshot = primaryReport?.segments[segment.id] ?? null;
    const latestEntry =
      data.communitySeries[primaryCommunity.id]?.[segment.id]?.series.at(-1) ?? null;

    return {
      segment,
      segmentLabel: segment.label,
      verdict: snapshot?.verdict ?? null,
      latest: snapshot?.latest ?? null,
      latestEntry,
    };
  });

  const latestAnomalies = deriveLatestAnomalies(
    primaryCommunity.name,
    primarySegments,
  ).slice(0, 3);
  const insufficientSegmentCount = countInsufficientSegments(primarySegments);
  const currentMarketEntry =
    data.latestReport?.cityMarket ?? data.cityMarket.series.at(-1) ?? null;
  const weeklySummaryText = buildWeeklySummaryText(
    data,
    primaryCommunity.name,
    insufficientSegmentCount,
  );
  const selectedSegment =
    primarySegments.find((segment) => segment.segment.id === selectedSegmentId) ?? null;

  return (
    <main className="app-shell">
      <div className="shell">
        <header className="hero">
          <div className="eyebrow">天津住房监测</div>
          <h1>用一页静态看板盯住鸣泉花园</h1>
          <p className="hero-copy">
            首页先给出市场方向、异常提醒和周报摘要，再下钻到具体户型趋势与对比小区。
          </p>
        </header>

        {selectedSegment ? (
          <DetailView
            communityName={primaryCommunity.name}
            comparisonCommunities={data.communities
              .filter((community) => community.id !== primaryCommunity.id)
              .map((community) => {
                const snapshot =
                  data.latestReport?.communities[community.id]?.segments[
                    selectedSegment.segment.id
                  ] ?? null;
                const latestEntry =
                  data.communitySeries[community.id]?.[selectedSegment.segment.id]?.series.at(
                    -1,
                  ) ?? null;

                return {
                  id: community.id,
                  name: community.name,
                  district: community.district,
                  verdict: snapshot?.verdict ?? null,
                  latestPrice:
                    snapshot?.latest?.listingUnitPriceMedian ??
                    latestEntry?.listingUnitPriceMedian ??
                    null,
                  listingsCount:
                    snapshot?.latest?.listingsCount ?? latestEntry?.listingsCount ?? null,
                };
              })}
            issueFormUrl={issueFormUrl}
            latest={selectedSegment.latest}
            latestSeriesEntry={selectedSegment.latestEntry}
            onBack={() => setSelectedSegmentId(null)}
            segmentLabel={selectedSegment.segmentLabel}
            seriesFile={
              data.communitySeries[primaryCommunity.id]?.[selectedSegment.segment.id] ??
              null
            }
            verdict={selectedSegment.verdict}
          />
        ) : (
          <>
            <div className="summary-stack">
              <MarketCard latestEntry={currentMarketEntry} />

              <section className="card" data-testid="anomaly-card">
                <div className="eyebrow">异常提醒</div>
                <h2>本周先看这些缺口</h2>
                <ul className="summary-list">
                  {latestAnomalies.length > 0 ? (
                    latestAnomalies.map((item) => (
                      <li key={item.id}>{item.detail}</li>
                    ))
                  ) : (
                    <li>暂无异常提醒，本周数据完整度维持正常。</li>
                  )}
                </ul>
              </section>

              <section className="card" data-testid="weekly-summary">
                <div className="eyebrow">最新周报</div>
                <h2>摘要</h2>
                <p className="narrative">{weeklySummaryText}</p>
              </section>

              <ManualInputCard issueFormUrl={issueFormUrl} />
            </div>

            <section className="panel">
              <div className="section-title">
                <div>
                  <div className="eyebrow">监控户型</div>
                  <h2>{primaryCommunity.name}</h2>
                </div>
                <p className="muted">两张卡片分别对应当前关注的两个主力户型。</p>
              </div>
              <div className="segment-grid" data-testid="segment-grid">
                {primarySegments.map((segment) => (
                  <SegmentCard
                    key={segment.segment.id}
                    communityName={primaryCommunity.name}
                    latestEntry={segment.latestEntry}
                    onSelect={() =>
                      startTransition(() => {
                        setSelectedSegmentId(segment.segment.id);
                      })
                    }
                    segmentLabel={segment.segmentLabel}
                    snapshot={
                      primaryReport?.segments[segment.segment.id] ?? null
                    }
                  />
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
