import type { DashboardData } from "./load-json";
import type {
  DashboardIconKey,
  DashboardKpi,
  DroppedListing,
  TimelineItem,
  TimelineTone,
} from "../components/dashboard/dashboard-data";

type SourceStatus = "success" | "failed" | "skipped";

interface StatsGovRunSource {
  status: SourceStatus;
  latestMonth?: string;
  city?: string;
  secondaryHomePriceIndexMom?: number | null;
  secondaryHomePriceIndexYoy?: number | null;
}

export interface FangCommunityListingTeaser {
  title?: string | null;
  roomCount?: number | null;
  areaSqm?: number | null;
  totalPriceWan?: number | null;
  unitPriceYuanPerSqm?: number | null;
}

interface FangCommunityRunSource {
  status: SourceStatus;
  referenceUnitPrice?: number | null;
  listingCount?: number | null;
  recentDealHints?: string[];
  currentListingTeasers?: FangCommunityListingTeaser[];
}

interface FangWeekreportPoint {
  label: string;
  priceYuanPerSqm: number | null;
}

interface FangWeekreportRunSource {
  status: SourceStatus;
  pricePoints?: FangWeekreportPoint[];
  listingCount?: number | null;
  districtName?: string | null;
  districtPremiumPct?: number | null;
  momChangePct?: number | null;
  yoyChangePct?: number | null;
  availableRangeLabels?: string[];
}

interface CommunityRunSources {
  fangCommunity: FangCommunityRunSource;
  fangWeekreport: FangWeekreportRunSource;
}

export interface RunArtifact {
  generatedAt: string;
  sources: {
    "stats-gov"?: StatsGovRunSource;
  };
  communities: Record<string, CommunityRunSources>;
}

export interface DashboardViewModel {
  kpis: DashboardKpi[];
  droppedListings: DroppedListing[];
  timelineItems: TimelineItem[];
  lastUpdatedLabel: string;
}

interface MatchedListingDrop {
  id: string;
  communityId: string;
  communityName: string;
  areaSqm: number;
  previousPriceWan: number;
  currentPriceWan: number;
  dropPct: number;
  daysOnMarket: number;
}

const MINUTE_IN_MS = 60 * 1000;
const HOUR_IN_MS = 60 * MINUTE_IN_MS;
const DAY_IN_MS = 24 * HOUR_IN_MS;

function sortRuns(runArtifacts: RunArtifact[]): RunArtifact[] {
  return [...runArtifacts].sort((left, right) =>
    left.generatedAt.localeCompare(right.generatedAt),
  );
}

function formatSignedPercent(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function normalizeTitle(title: string | null | undefined): string {
  return (title ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s\-_,.，。！？!?:：;；]+/g, "");
}

function buildListingKey(communityId: string, teaser: FangCommunityListingTeaser): string {
  return [
    communityId,
    teaser.roomCount ?? "na",
    Math.round(teaser.areaSqm ?? 0),
    normalizeTitle(teaser.title),
  ].join(":");
}

function formatWanPrice(priceWan: number): string {
  return `${priceWan}万`;
}

function formatArea(areaSqm: number): string {
  return `${Math.round(areaSqm)}㎡`;
}

function daysBetweenInclusive(startAt: string, endAt: string): number {
  const diffMs = new Date(endAt).getTime() - new Date(startAt).getTime();
  return Math.max(1, Math.floor(diffMs / DAY_IN_MS) + 1);
}

function resolveFallbackListingCount(data: DashboardData, communityId: string): number {
  const segmentId = data.primarySegmentsByCommunityId[communityId]?.id;
  const reportCommunity = data.latestReport?.communities[communityId];
  const reportSegment = segmentId ? reportCommunity?.segments[segmentId] : undefined;
  return reportSegment?.latest?.listingsCount ?? 0;
}

function buildDroppedListings(
  data: DashboardData,
  sortedRuns: RunArtifact[],
): MatchedListingDrop[] {
  const latestRun = sortedRuns.at(-1);
  const previousRun = sortedRuns.at(-2);

  if (!latestRun || !previousRun) {
    return [];
  }

  const firstSeenByKey = new Map<string, string>();

  for (const run of sortedRuns) {
    for (const [communityId, communityRun] of Object.entries(run.communities)) {
      for (const teaser of communityRun.fangCommunity.currentListingTeasers ?? []) {
        const key = buildListingKey(communityId, teaser);

        if (!firstSeenByKey.has(key)) {
          firstSeenByKey.set(key, run.generatedAt);
        }
      }
    }
  }

  const previousTeasersByKey = new Map<string, FangCommunityListingTeaser>();

  for (const [communityId, communityRun] of Object.entries(previousRun.communities)) {
    for (const teaser of communityRun.fangCommunity.currentListingTeasers ?? []) {
      previousTeasersByKey.set(buildListingKey(communityId, teaser), teaser);
    }
  }

  const drops: MatchedListingDrop[] = [];

  for (const [communityId, communityRun] of Object.entries(latestRun.communities)) {
    const communityName =
      data.communities.find((community) => community.id === communityId)?.name ?? communityId;

    for (const teaser of communityRun.fangCommunity.currentListingTeasers ?? []) {
      const key = buildListingKey(communityId, teaser);
      const previousTeaser = previousTeasersByKey.get(key);
      const previousPriceWan = previousTeaser?.totalPriceWan;
      const currentPriceWan = teaser.totalPriceWan;
      const areaSqm = teaser.areaSqm;

      if (
        previousPriceWan === null ||
        previousPriceWan === undefined ||
        currentPriceWan === null ||
        currentPriceWan === undefined ||
        areaSqm === null ||
        areaSqm === undefined ||
        currentPriceWan >= previousPriceWan
      ) {
        continue;
      }

      drops.push({
        id: key,
        communityId,
        communityName,
        areaSqm,
        previousPriceWan,
        currentPriceWan,
        dropPct: ((currentPriceWan - previousPriceWan) / previousPriceWan) * 100,
        daysOnMarket: daysBetweenInclusive(
          firstSeenByKey.get(key) ?? latestRun.generatedAt,
          latestRun.generatedAt,
        ),
      });
    }
  }

  return drops.sort((left, right) => left.dropPct - right.dropPct);
}

function buildKpi(
  title: string,
  value: string,
  change: string,
  hint: string,
  tone: DashboardKpi["tone"],
  icon: DashboardIconKey,
): DashboardKpi {
  return { title, value, change, hint, tone, icon };
}

function buildTimelineItem(
  id: string,
  title: string,
  description: string,
  time: string,
  tone: TimelineTone,
): TimelineItem {
  return { id, title, description, time, tone };
}

export function formatRelativeUpdatedAt(
  timestamp: string,
  now: Date = new Date(),
): string {
  const diffMs = Math.max(0, now.getTime() - new Date(timestamp).getTime());

  if (diffMs < MINUTE_IN_MS) {
    return "刚刚";
  }

  if (diffMs < HOUR_IN_MS) {
    return `${Math.floor(diffMs / MINUTE_IN_MS)}分钟前`;
  }

  if (diffMs < DAY_IN_MS) {
    return `${Math.floor(diffMs / HOUR_IN_MS)}小时前`;
  }

  return `${Math.floor(diffMs / DAY_IN_MS)}天前`;
}

export function buildDashboardViewModel(
  data: DashboardData,
  runArtifacts: RunArtifact[],
): DashboardViewModel {
  const sortedRuns = sortRuns(runArtifacts);
  const latestRun = sortedRuns.at(-1);
  const latestMarketEntry = data.cityMarket.series.at(-1);
  const droppedSamples = buildDroppedListings(data, sortedRuns);

  const totalListings = data.communities.reduce((total, community) => {
    const listingCount = latestRun?.communities[community.id]?.fangCommunity.listingCount;

    return total + (listingCount ?? resolveFallbackListingCount(data, community.id));
  }, 0);

  const marketTrendValue = latestMarketEntry
    ? formatSignedPercent(latestMarketEntry.secondaryHomePriceIndexMom - 100)
    : "--";

  const kpis: DashboardKpi[] = [
    buildKpi(
      "监控小区总数",
      String(data.communities.length),
      `${data.communities.length} 个在监控`,
      "按真实社区配置统计当前纳入看板的小区数量。",
      "neutral",
      "building-2",
    ),
    buildKpi(
      "在售房源总数",
      String(totalListings),
      "优先使用最新抓取的挂牌总数",
      "抓取缺失时回退到最新周报里的挂牌样本数。",
      "positive",
      "activity",
    ),
    buildKpi(
      "今日降价套数",
      String(droppedSamples.length),
      "基于最近两次 run 的房源匹配结果",
      "仅统计匹配成功且总价确实下降的样本。",
      "highlight",
      "badge-dollar-sign",
    ),
    buildKpi(
      "市场均价走势",
      marketTrendValue,
      latestMarketEntry?.verdict ?? "暂无数据",
      "按最新城市市场指数月环比折算展示。",
      latestMarketEntry && latestMarketEntry.secondaryHomePriceIndexMom < 100
        ? "negative"
        : "neutral",
      "shield-alert",
    ),
  ];

  const droppedListings: DroppedListing[] = droppedSamples.map((sample) => ({
    id: sample.id,
    community: sample.communityName,
    area: formatArea(sample.areaSqm),
    originalPrice: formatWanPrice(sample.previousPriceWan),
    currentPrice: formatWanPrice(sample.currentPriceWan),
    drop: `${sample.dropPct.toFixed(1)}%`,
    daysOnMarket: sample.daysOnMarket,
    note: "最近两次抓取中识别到真实降价。",
  }));

  const timelineItems: TimelineItem[] = droppedSamples.map((sample) =>
    buildTimelineItem(
      `drop:${sample.id}`,
      `${sample.communityName} ${formatArea(sample.areaSqm)} 房源降价`,
      `总价从 ${formatWanPrice(sample.previousPriceWan)} 降至 ${formatWanPrice(sample.currentPriceWan)}，跌幅 ${Math.abs(sample.dropPct).toFixed(1)}%。`,
      latestRun ? formatRelativeUpdatedAt(latestRun.generatedAt) : "暂无更新",
      "positive",
    ),
  );

  if (latestRun) {
    for (const community of data.communities) {
      const communityRun = latestRun.communities[community.id];

      if (!communityRun) {
        continue;
      }

      const failedSources = [
        communityRun.fangCommunity.status !== "success" ? "fangCommunity" : null,
        communityRun.fangWeekreport.status !== "success" ? "fangWeekreport" : null,
      ].filter((value): value is string => value !== null);

      if (failedSources.length === 0) {
        continue;
      }

      timelineItems.push(
        buildTimelineItem(
          `alert:${community.id}`,
          `${community.name} 数据抓取异常`,
          `最新 run 中 ${failedSources.join(" / ")} 状态异常，请优先排查。`,
          formatRelativeUpdatedAt(latestRun.generatedAt),
          "negative",
        ),
      );
    }

    timelineItems.push(
      buildTimelineItem(
        `refresh:${latestRun.generatedAt}`,
        "最新监控样本已刷新完成",
        "挂牌样本与周报快照已同步到首页 view-model。",
        formatRelativeUpdatedAt(latestRun.generatedAt),
        "neutral",
      ),
    );
  }

  return {
    kpis,
    droppedListings,
    timelineItems,
    lastUpdatedLabel: latestRun
      ? formatRelativeUpdatedAt(latestRun.generatedAt)
      : data.latestReport
        ? formatRelativeUpdatedAt(data.latestReport.generatedAt)
        : "暂无更新",
  };
}
