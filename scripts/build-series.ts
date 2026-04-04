import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { resolve } from "node:path";

import { buildCityMarketSeriesEntry, citySlug } from "../lib/city-market";
import { loadCommunities, loadSegments } from "../lib/config";
import { summarizeManualSamples, loadAcceptedManualInputFiles } from "../lib/manual-input";
import { median } from "../lib/metrics";
import { DATA_DIR, resolveDataPaths } from "../lib/paths";

type SourceStatus = "success" | "failed" | "skipped";

interface StatsGovRunSource {
  status: SourceStatus;
  latestMonth?: string;
  city?: string;
  secondaryHomePriceIndexMom?: number | null;
  secondaryHomePriceIndexYoy?: number | null;
}

interface FangCommunityListingTeaser {
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

interface RunArtifact {
  generatedAt: string;
  sources: {
    "stats-gov"?: StatsGovRunSource;
  };
  communities: Record<string, CommunityRunSources>;
}

interface CommunitySegmentSeriesEntry {
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

function parseCommandLineArguments(argv: string[]): { dataDir: string } {
  let dataDir = DATA_DIR;

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    if (argument === "--data-dir") {
      const candidate = argv[index + 1];

      if (!candidate || candidate.startsWith("-")) {
        throw new Error("--data-dir requires a path");
      }

      dataDir = resolve(candidate);
      index += 1;
    }
  }

  return { dataDir };
}

function readJsonFile<T>(filePath: string): T {
  return JSON.parse(readFileSync(filePath, "utf8")) as T;
}

function writeJsonFile(filePath: string, value: unknown): void {
  mkdirSync(resolve(filePath, ".."), { recursive: true });
  writeFileSync(filePath, JSON.stringify(value, null, 2));
}

function readRunArtifacts(runsDir: string): RunArtifact[] {
  if (!existsSync(runsDir)) {
    return [];
  }

  const dedupedRuns = new Map<string, RunArtifact>();

  for (const entry of readdirSync(runsDir).sort()) {
    if (!entry.endsWith(".json")) {
      continue;
    }

    const runArtifact = readJsonFile<RunArtifact>(resolve(runsDir, entry));
    dedupedRuns.set(runArtifact.generatedAt, runArtifact);
  }

  return [...dedupedRuns.values()].sort((left, right) =>
    left.generatedAt.localeCompare(right.generatedAt),
  );
}

function dedupeLatestEntryPerDate<T extends { date: string; generatedAt: string }>(
  entries: T[],
): T[] {
  const byDate = new Map<string, T>();

  for (const entry of entries.sort((left, right) =>
    left.generatedAt.localeCompare(right.generatedAt),
  )) {
    byDate.set(entry.date, entry);
  }

  return [...byDate.values()].sort((left, right) =>
    left.generatedAt.localeCompare(right.generatedAt),
  );
}

function latestCityName(runArtifacts: RunArtifact[]): string {
  for (let index = runArtifacts.length - 1; index >= 0; index -= 1) {
    const city = runArtifacts[index]?.sources["stats-gov"]?.city;

    if (city) {
      return city;
    }
  }

  return "天津";
}

function extractSuspectedDealCount(recentDealHints: string[] | undefined): number {
  return (recentDealHints ?? []).reduce((total, hint) => {
    const match = hint.match(/成交\((\d+)\)/);
    return total + (match ? Number.parseInt(match[1], 10) : 0);
  }, 0);
}

function selectCommunityPricePoint(source: FangWeekreportRunSource): number | null {
  for (const point of source.pricePoints ?? []) {
    if (point.priceYuanPerSqm !== null && point.priceYuanPerSqm !== undefined) {
      return point.priceYuanPerSqm;
    }
  }

  return null;
}

function matchSegmentTeasers(
  teasers: FangCommunityListingTeaser[] | undefined,
  rooms: number,
  areaMin: number,
  areaMax: number,
): FangCommunityListingTeaser[] {
  return (teasers ?? []).filter((teaser) => {
    if (
      teaser.roomCount === null ||
      teaser.roomCount === undefined ||
      teaser.areaSqm === null ||
      teaser.areaSqm === undefined ||
      teaser.totalPriceWan === null ||
      teaser.totalPriceWan === undefined ||
      teaser.unitPriceYuanPerSqm === null ||
      teaser.unitPriceYuanPerSqm === undefined
    ) {
      return false;
    }

    return (
      teaser.roomCount === rooms &&
      teaser.areaSqm >= areaMin &&
      teaser.areaSqm <= areaMax
    );
  });
}

function buildCommunitySegmentSeriesEntry(
  runArtifact: RunArtifact,
  communityId: string,
  rooms: number,
  areaMin: number,
  areaMax: number,
  manualSamples: ReturnType<typeof loadAcceptedManualInputFiles>,
  segmentId: string,
): CommunitySegmentSeriesEntry {
  const communityRun = runArtifact.communities[communityId];
  const matchedTeasers = matchSegmentTeasers(
    communityRun?.fangCommunity.currentListingTeasers,
    rooms,
    areaMin,
    areaMax,
  );
  const teaserUnitPrices = matchedTeasers
    .map((teaser) => teaser.unitPriceYuanPerSqm)
    .filter((value): value is number => value !== null && value !== undefined);
  const communityPricePoint = selectCommunityPricePoint(
    communityRun?.fangWeekreport ?? { status: "skipped" },
  );
  const manualSummary = summarizeManualSamples(
    manualSamples,
    communityId,
    segmentId,
    runArtifact.generatedAt,
  );

  if (matchedTeasers.length >= 3) {
    return {
      date: runArtifact.generatedAt.slice(0, 10),
      generatedAt: runArtifact.generatedAt,
      derivedFrom: "segment-teasers",
      listingUnitPriceMedian: median(teaserUnitPrices),
      listingUnitPriceMin:
        teaserUnitPrices.length > 0 ? Math.min(...teaserUnitPrices) : null,
      listingsCount: matchedTeasers.length,
      suspectedDealCount: extractSuspectedDealCount(
        communityRun?.fangCommunity.recentDealHints,
      ),
      manualDealCount: manualSummary.manualDealCount,
      manualDealUnitPriceMedian: manualSummary.manualDealUnitPriceMedian,
      manualLatestSampleAt: manualSummary.manualLatestSampleAt,
    };
  }

  return {
    date: runArtifact.generatedAt.slice(0, 10),
    generatedAt: runArtifact.generatedAt,
    derivedFrom: "community-fallback",
    listingUnitPriceMedian: communityPricePoint,
    listingUnitPriceMin: communityPricePoint,
    listingsCount: matchedTeasers.length,
    suspectedDealCount: extractSuspectedDealCount(
      communityRun?.fangCommunity.recentDealHints,
    ),
    manualDealCount: manualSummary.manualDealCount,
    manualDealUnitPriceMedian: manualSummary.manualDealUnitPriceMedian,
    manualLatestSampleAt: manualSummary.manualLatestSampleAt,
  };
}

async function main(): Promise<void> {
  const { dataDir } = parseCommandLineArguments(process.argv.slice(2));
  const paths = resolveDataPaths(dataDir);
  const communities = loadCommunities(paths.communitiesConfigPath);
  const segments = loadSegments(paths.segmentsConfigPath, communities);
  const primarySegmentByCommunity = new Map(
    segments.map((segment) => [segment.communityId, segment]),
  );
  const segmentIdByCommunityId = new Map(
    segments.map((segment) => [segment.communityId, segment.id] as const),
  );
  const validCommunityIds = new Set(communities.map((community) => community.id));
  const validSegmentIds = new Set(segments.map((segment) => segment.id));
  const runArtifacts = readRunArtifacts(paths.runsDir);
  const manualSamples = existsSync(paths.manualAcceptedDir)
    ? loadAcceptedManualInputFiles(
        paths.manualAcceptedDir,
        validCommunityIds,
        validSegmentIds,
        segmentIdByCommunityId,
      )
    : [];

  rmSync(paths.seriesDir, { recursive: true, force: true });
  mkdirSync(paths.seriesDir, { recursive: true });

  const cityRuns = runArtifacts
    .map((runArtifact) =>
      buildCityMarketSeriesEntry(
        runArtifact.generatedAt,
        runArtifact.sources["stats-gov"],
      ),
    )
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

  if (cityRuns.length > 0) {
    const citySeriesEntries = dedupeLatestEntryPerDate(cityRuns);
    const cityName = latestCityName(runArtifacts);

    writeJsonFile(
      resolve(paths.seriesDir, "city-market", `${citySlug(cityName)}.json`),
      {
        city: cityName,
        series: citySeriesEntries,
      },
    );
  }

  for (const community of communities) {
    const segment = primarySegmentByCommunity.get(community.id);

    if (!segment) {
      throw new Error(`Missing primary segment for community: ${community.id}`);
    }

    const seriesEntries = dedupeLatestEntryPerDate(
      runArtifacts.map((runArtifact) =>
        buildCommunitySegmentSeriesEntry(
          runArtifact,
          community.id,
          segment.rooms,
          segment.areaMin,
          segment.areaMax,
          manualSamples,
          segment.id,
        ),
      ),
    );

    writeJsonFile(
      resolve(
        paths.seriesDir,
        "communities",
        community.id,
        `${segment.id}.json`,
      ),
      {
        communityId: community.id,
        communityName: community.name,
        segmentId: segment.id,
        segmentLabel: segment.label,
        rooms: segment.rooms,
        areaMin: segment.areaMin,
        areaMax: segment.areaMax,
        series: seriesEntries,
      },
    );
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
