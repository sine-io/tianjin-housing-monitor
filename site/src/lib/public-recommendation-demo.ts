import { buildRecommendation } from "../../../lib/recommendation-engine";
import type {
  RecommendationAction,
  RecommendationInput,
} from "../../../lib/recommendation-types";

import type {
  DashboardData,
  WeeklyReportCommunitySnapshot,
  WeeklyReportSegmentSnapshot,
} from "./load-json";
import type {
  PublicRecommendationDemoCardItem,
  PublicRecommendationDemoSectionItem,
} from "../components/dashboard/dashboard-types";

const PUBLIC_DEMO_SCENARIO = {
  householdId: "public-improvement-scenario",
  configVersion: "public-demo-v1",
  decisionWindowMonths: 6 as const,
  currentHome: {
    anchorPriceWan: 210,
    anchorUpdatedAt: "2026-04-10T12:00:00.000Z",
  },
  targetCommunityIds: ["mingquan-huayuan", "boxi-huayuan"],
};

function estimateTargetTotalPriceWan(
  listingUnitPriceMedian: number,
  areaMin: number,
  areaMax: number,
): number {
  const midpointArea = (areaMin + areaMax) / 2;
  return (listingUnitPriceMedian * midpointArea) / 10_000;
}

function mapVerdictToMomentum(
  verdict: string,
): "improving" | "flat" | "weakening" {
  switch (verdict) {
    case "下跌":
    case "以价换量":
      return "improving";
    case "上涨":
    case "假回暖":
      return "weakening";
    case "横盘":
    case "样本不足":
    default:
      return "flat";
  }
}

function formatAction(action: RecommendationAction | null): string {
  switch (action) {
    case "continue_wait":
      return "继续等";
    case "can_view":
      return "可以看房";
    case "can_negotiate":
      return "可以谈价";
    case null:
      return "暂不判断";
  }
}

function buildTargetInput(
  data: DashboardData,
  communityId: string,
): RecommendationInput["targetBasket"][number] | null {
  const community = data.communities.find((entry) => entry.id === communityId);
  const segment = data.primarySegmentsByCommunityId[communityId];
  const reportCommunity = data.latestReport?.communities[communityId];
  const reportSegment = segment ? reportCommunity?.segments[segment.id] : undefined;

  if (!community || !segment) {
    return null;
  }

  const latest = reportSegment?.latest;
  const listingUnitPriceMedian = latest?.listingUnitPriceMedian ?? null;
  const relativeSpreadPct =
    listingUnitPriceMedian === null
      ? null
      : ((estimateTargetTotalPriceWan(
          listingUnitPriceMedian,
          segment.areaMin,
          segment.areaMax,
        ) -
          PUBLIC_DEMO_SCENARIO.currentHome.anchorPriceWan) /
          PUBLIC_DEMO_SCENARIO.currentHome.anchorPriceWan) *
        100;

  return {
    communityId,
    displayName: community.name,
    relativeSpreadPct,
    listingCount: latest?.listingsCount ?? 0,
    signalStrength:
      (latest?.listingsCount ?? 0) >= 3 || (latest?.manualDealCount ?? 0) > 0
        ? "strong"
        : "weak",
    momentum: mapVerdictToMomentum(reportSegment?.verdict ?? "样本不足"),
  };
}

function firstSummaryReason(
  section: PublicRecommendationDemoSectionItem,
): string {
  return (
    section.strongestSupport[0] ??
    section.strongestCounterevidence[0] ??
    section.flipConditions[0] ??
    "基于公开市场数据生成的改善型置换参考。"
  );
}

export function buildPublicRecommendationDemo(
  data: DashboardData,
): {
  card: PublicRecommendationDemoCardItem;
  section: PublicRecommendationDemoSectionItem;
} {
  const targetBasket = PUBLIC_DEMO_SCENARIO.targetCommunityIds
    .map((communityId) => buildTargetInput(data, communityId))
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null);
  const generatedAt =
    data.latestReport?.generatedAt ??
    data.cityMarket.series.at(-1)?.generatedAt ??
    new Date().toISOString();

  const result = buildRecommendation({
    householdId: PUBLIC_DEMO_SCENARIO.householdId,
    configVersion: PUBLIC_DEMO_SCENARIO.configVersion,
    sourceSnapshotId:
      data.latestReport?.generatedAt ??
      data.cityMarket.series.at(-1)?.generatedAt ??
      "public-demo-fallback",
    generatedAt,
    decisionWindowMonths: PUBLIC_DEMO_SCENARIO.decisionWindowMonths,
    currentHome: PUBLIC_DEMO_SCENARIO.currentHome,
    marketContext: {
      secondaryHomePriceIndexMom:
        data.latestReport?.cityMarket?.secondaryHomePriceIndexMom ??
        data.cityMarket.series.at(-1)?.secondaryHomePriceIndexMom ??
        null,
      verdict:
        data.latestReport?.cityMarket?.verdict ??
        data.cityMarket.series.at(-1)?.verdict,
    },
    targetBasket,
  });

  const section: PublicRecommendationDemoSectionItem = {
    title: "改善型置换建议",
    description: "基于公开市场数据生成的改善型置换参考输出。",
    action: formatAction(result.action),
    strongestSupport: result.explanation.strongestSupport.map(
      (entry) => `${entry.label}：${entry.summary}`,
    ),
    strongestCounterevidence: result.explanation.strongestCounterevidence.map(
      (entry) => `${entry.label}：${entry.summary}`,
    ),
    flipConditions: result.explanation.flipConditions.map(
      (entry) => `${entry.label}：${entry.summary}`,
    ),
    basketRanking: result.basketRanking.map((entry) => ({
      community: entry.displayName,
      reasoning: entry.reasoning,
    })),
  };

  return {
    card: {
      title: "改善型置换建议",
      action: section.action,
      strongestReason: firstSummaryReason(section),
      href: "#recommendation-demo",
    },
    section,
  };
}
