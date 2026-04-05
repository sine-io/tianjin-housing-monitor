import type {
  Community,
  CommunityStatus,
  SegmentTemplate,
} from "../../../lib/types";
import type { RunArtifact } from "./dashboard-view";

export type CityMarketVerdict = "偏强" | "中性" | "偏弱";
export type SegmentVerdict =
  | "上涨"
  | "下跌"
  | "横盘"
  | "以价换量"
  | "假回暖"
  | "样本不足";

export interface CityMarketSeriesEntry {
  date: string;
  generatedAt: string;
  sourceMonth: string;
  secondaryHomePriceIndexMom: number;
  secondaryHomePriceIndexYoy: number;
  verdict: CityMarketVerdict;
}

export interface CityMarketSeriesFile {
  city: string;
  series: CityMarketSeriesEntry[];
}

export interface CommunitySegmentSeriesEntry {
  date: string;
  generatedAt: string;
  derivedFrom: "segment-teasers" | "community-fallback";
  listingUnitPriceMedian: number | null;
  listingUnitPriceMin: number | null;
  listingsCount: number;
  suspectedDealCount: number;
  manualDealCount: number;
  manualDealUnitPriceMedian: number | null;
  manualLatestSampleAt: string | null;
}

export interface CommunitySegmentSeriesFile {
  communityId: string;
  communityName: string;
  segmentId: string;
  segmentLabel: string;
  rooms: number;
  areaMin: number;
  areaMax: number;
  series: CommunitySegmentSeriesEntry[];
}

export interface WeeklyReportLatestSnapshot {
  listingUnitPriceMedian: number | null;
  listingUnitPriceMin: number | null;
  listingsCount: number;
  suspectedDealCount: number;
  manualDealCount: number;
}

export interface WeeklyReportSegmentSnapshot {
  label: string;
  verdict: SegmentVerdict;
  latest: WeeklyReportLatestSnapshot | null;
}

export interface WeeklyReportCommunitySnapshot {
  name: string;
  district: string;
  segments: Record<string, WeeklyReportSegmentSnapshot>;
}

export interface WeeklyReport {
  generatedAt: string;
  weekEnding: string;
  cityMarket: CityMarketSeriesEntry | null;
  communities: Record<string, WeeklyReportCommunitySnapshot>;
}

export interface DashboardData {
  communities: Community[];
  segments: SegmentTemplate[];
  primarySegmentsByCommunityId: Record<string, SegmentTemplate>;
  cityMarket: CityMarketSeriesFile;
  latestReport: WeeklyReport | null;
  communitySeries: Record<string, Record<string, CommunitySegmentSeriesFile>>;
}

type CommunityConfigEntry = Omit<Community, "status"> & {
  status?: CommunityStatus;
};

interface RunArtifactIndexFile {
  files: string[];
}

function resolvePublicPath(path: string): string {
  const normalized = path.replace(/^\/+/, "");
  return `${import.meta.env.BASE_URL}${normalized}`;
}

export async function loadJson<T>(path: string): Promise<T> {
  const response = await fetch(resolvePublicPath(path));

  if (!response.ok) {
    throw new Error(`Failed to load ${path}: ${response.status}`);
  }

  return (await response.json()) as T;
}

async function loadOptionalJson<T>(path: string): Promise<T | null> {
  const response = await fetch(resolvePublicPath(path));

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Failed to load ${path}: ${response.status}`);
  }

  return (await response.json()) as T;
}

function makeEmptySeriesFile(
  community: Community,
  segment: SegmentTemplate,
): CommunitySegmentSeriesFile {
  return {
    communityId: community.id,
    communityName: community.name,
    segmentId: segment.id,
    segmentLabel: segment.label,
    rooms: segment.rooms,
    areaMin: segment.areaMin,
    areaMax: segment.areaMax,
    series: [],
  };
}

function parseCommunityStatus(community: CommunityConfigEntry): CommunityStatus {
  if (community.status === "active" || community.status === "pending_verification") {
    return community.status;
  }

  if (community.status === undefined) {
    throw new Error(
      `Community ${community.id} is missing required status in public config`,
    );
  }

  throw new Error(`Community ${community.id} has unsupported status ${community.status}`);
}

function buildPrimarySegmentsByCommunityId(
  communities: Community[],
  segments: SegmentTemplate[],
): Record<string, SegmentTemplate> {
  const entries = communities.map((community) => {
    const communitySegments = segments.filter(
      (segment) => segment.communityId === community.id,
    );

    if (communitySegments.length !== 1) {
      throw new Error(
        `Community ${community.id} must have exactly one primary segment in public config`,
      );
    }

    return [community.id, communitySegments[0]] as const;
  });

  return Object.fromEntries(entries);
}

export async function loadDashboardData(): Promise<DashboardData> {
  const [communities, segments, cityMarket] = await Promise.all([
    loadJson<CommunityConfigEntry[]>("data/config/communities.json"),
    loadJson<SegmentTemplate[]>("data/config/segments.json"),
    loadJson<CityMarketSeriesFile>("data/series/city-market/tianjin.json"),
  ]);
  const normalizedCommunities = communities.map((community) => ({
    ...community,
    status: parseCommunityStatus(community),
  }));
  const primarySegmentsByCommunityId = buildPrimarySegmentsByCommunityId(
    normalizedCommunities,
    segments,
  );

  const latestDate = cityMarket.series.at(-1)?.date;
  const latestReport = latestDate
    ? await loadOptionalJson<WeeklyReport>(`data/reports/${latestDate}.json`)
    : null;

  const communitySeriesEntries = await Promise.all(
    normalizedCommunities.map(async (community) => {
      const communitySegment = primarySegmentsByCommunityId[community.id];

      return [
        community.id,
        Object.fromEntries(
          await Promise.all(
            [
              [
                communitySegment.id,
                (await loadOptionalJson<CommunitySegmentSeriesFile>(
                  `data/series/communities/${community.id}/${communitySegment.id}.json`,
                )) ?? makeEmptySeriesFile(community, communitySegment),
              ],
            ],
          ),
        ),
      ] as const;
    }),
  );

  return {
    communities: normalizedCommunities,
    segments,
    primarySegmentsByCommunityId,
    cityMarket,
    latestReport,
    communitySeries: Object.fromEntries(communitySeriesEntries),
  };
}

export async function loadRecentRunArtifacts(limit = 5): Promise<RunArtifact[]> {
  if (limit <= 0) {
    return [];
  }

  const indexFile = await loadOptionalJson<RunArtifactIndexFile>("data/runs/index.json");
  const indexedFiles = [...(indexFile?.files ?? [])].sort().slice(-limit);

  if (indexedFiles.length > 0) {
    const artifacts = (
      await Promise.all(
        indexedFiles.map((fileName) =>
          loadOptionalJson<RunArtifact>(`data/runs/${fileName}`),
        ),
      )
    ).filter((artifact): artifact is RunArtifact => artifact !== null);

    if (artifacts.length > 0) {
      return artifacts.sort((left, right) =>
        left.generatedAt.localeCompare(right.generatedAt),
      );
    }
  }

  const latestArtifact = await loadOptionalJson<RunArtifact>("data/runs/latest.json");

  return latestArtifact ? [latestArtifact] : [];
}
