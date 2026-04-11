import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { loadCommunities, loadSegments } from "../lib/config";
import {
  assertKnownTargetBasketCommunityIds,
  validateHouseholdConfig,
} from "../lib/household-config";
import { buildRecommendation } from "../lib/recommendation-engine";
import {
  assertPathOutsideRoots,
  resolveDataPaths,
  resolvePrivateArtifactPaths,
} from "../lib/paths";
import type { SegmentTemplate } from "../lib/types";

const PRIVATE_ROOT_ENV_VAR = "PROPPULSE_PRIVATE_ROOT";

interface CommandLineArguments {
  dataDir: string;
  privateRoot: string;
}

interface CityMarketSeriesEntry {
  date: string;
  generatedAt: string;
  sourceMonth: string;
  secondaryHomePriceIndexMom: number;
  secondaryHomePriceIndexYoy: number;
  verdict: string;
}

interface CityMarketSeriesFile {
  city: string;
  series: CityMarketSeriesEntry[];
}

interface WeeklyReportLatestSnapshot {
  listingUnitPriceMedian: number | null;
  listingUnitPriceMin: number | null;
  listingsCount: number;
  suspectedDealCount: number;
  manualDealCount: number;
}

interface WeeklyReportSegmentSnapshot {
  label: string;
  verdict: string;
  latest: WeeklyReportLatestSnapshot | null;
}

interface WeeklyReportCommunitySnapshot {
  name: string;
  district: string;
  segments: Record<string, WeeklyReportSegmentSnapshot>;
}

interface WeeklyReport {
  generatedAt: string;
  weekEnding: string;
  cityMarket: CityMarketSeriesEntry | null;
  communities: Record<string, WeeklyReportCommunitySnapshot>;
}

function parseCommandLineArguments(argv: string[]): CommandLineArguments {
  let dataDir: string | undefined;
  let privateRoot = process.env[PRIVATE_ROOT_ENV_VAR];

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    if (argument === "--data-dir") {
      const candidate = argv[index + 1];

      if (!candidate || candidate.startsWith("-")) {
        throw new Error("--data-dir requires a path");
      }

      dataDir = candidate;
      index += 1;
      continue;
    }

    if (argument === "--private-root") {
      const candidate = argv[index + 1];

      if (!candidate || candidate.startsWith("-")) {
        throw new Error("--private-root requires a path");
      }

      privateRoot = candidate;
      index += 1;
    }
  }

  if (!dataDir) {
    throw new Error("--data-dir is required");
  }

  if (!privateRoot) {
    throw new Error(`--private-root or ${PRIVATE_ROOT_ENV_VAR} is required`);
  }

  return {
    dataDir: resolve(dataDir),
    privateRoot: resolve(privateRoot),
  };
}

function readJsonFile<T>(filePath: string): T {
  return JSON.parse(readFileSync(filePath, "utf8")) as T;
}

function sanitizeFileComponent(value: string): string {
  return value.replaceAll(/[^\w.-]+/g, "-");
}

function estimateTargetTotalPriceWan(
  listingUnitPriceMedian: number,
  segment: SegmentTemplate,
): number {
  const midpointArea = (segment.areaMin + segment.areaMax) / 2;
  return (listingUnitPriceMedian * midpointArea) / 10_000;
}

function mapVerdictToMomentum(verdict: string): "improving" | "flat" | "weakening" {
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

function loadLatestReport(dataDir: string): { report: WeeklyReport; snapshotId: string } {
  const paths = resolveDataPaths(dataDir);
  const cityMarket = readJsonFile<CityMarketSeriesFile>(
    resolve(paths.seriesDir, "city-market", "tianjin.json"),
  );
  const latestDate = cityMarket.series.at(-1)?.date;

  if (!latestDate) {
    throw new Error("City market series is empty");
  }

  const report = readJsonFile<WeeklyReport>(resolve(paths.reportsDir, `${latestDate}.json`));

  return {
    report,
    snapshotId: sanitizeFileComponent(report.generatedAt),
  };
}

function loadConfirmedHouseholdConfigs(privateRoot: string) {
  const artifactPaths = resolvePrivateArtifactPaths(privateRoot);

  if (!existsSync(artifactPaths.householdsCurrentDir)) {
    return [];
  }

  return readdirSync(artifactPaths.householdsCurrentDir)
    .filter((entry) => entry.endsWith(".json"))
    .sort()
    .map((entry) =>
      validateHouseholdConfig(
        readJsonFile(resolve(artifactPaths.householdsCurrentDir, entry)),
      ),
    );
}

async function main(): Promise<void> {
  const { dataDir, privateRoot } = parseCommandLineArguments(process.argv.slice(2));
  const dataPaths = resolveDataPaths(dataDir);
  const privatePaths = resolvePrivateArtifactPaths(privateRoot);
  const communities = loadCommunities(dataPaths.communitiesConfigPath);
  const segments = loadSegments(dataPaths.segmentsConfigPath, communities);
  const segmentsByCommunityId = new Map(
    segments.map((segment) => [segment.communityId, segment]),
  );
  const { report, snapshotId } = loadLatestReport(dataDir);

  assertPathOutsideRoots(privatePaths.privateRoot, "Private artifact root", [
    dataPaths.dataDir,
    dataPaths.publicDir,
  ]);

  mkdirSync(privatePaths.recommendationsDir, { recursive: true });

  for (const householdConfig of loadConfirmedHouseholdConfigs(privateRoot)) {
    assertKnownTargetBasketCommunityIds(
      householdConfig.targetBasket,
      new Set(communities.map((community) => community.id)),
    );
    const targetBasket = householdConfig.targetBasket.map((entry) => {
      const segment = segmentsByCommunityId.get(entry.communityId);
      const reportCommunity = report.communities[entry.communityId];
      const reportSegment = segment
        ? reportCommunity?.segments[segment.id]
        : undefined;
      const latest = reportSegment?.latest;
      const listingUnitPriceMedian = latest?.listingUnitPriceMedian ?? null;
      const relativeSpreadPct =
        listingUnitPriceMedian === null || !segment
          ? null
          : ((estimateTargetTotalPriceWan(listingUnitPriceMedian, segment) -
              householdConfig.currentHome.anchorPriceWan) /
              householdConfig.currentHome.anchorPriceWan) *
            100;

      return {
        communityId: entry.communityId,
        displayName: reportCommunity?.name ?? entry.communityId,
        relativeSpreadPct,
        listingCount: latest?.listingsCount ?? 0,
        signalStrength:
          (latest?.listingsCount ?? 0) >= 3 || (latest?.manualDealCount ?? 0) > 0
            ? ("strong" as const)
            : ("weak" as const),
        momentum: mapVerdictToMomentum(reportSegment?.verdict ?? "样本不足"),
      };
    });

    const result = buildRecommendation({
      householdId: householdConfig.householdId,
      configVersion: householdConfig.configVersion,
      sourceSnapshotId: snapshotId,
      generatedAt: report.generatedAt,
      decisionWindowMonths: householdConfig.decisionWindowMonths,
      currentHome: householdConfig.currentHome,
      marketContext: {
        secondaryHomePriceIndexMom: report.cityMarket?.secondaryHomePriceIndexMom ?? null,
        verdict: report.cityMarket?.verdict,
      },
      targetBasket,
    });

    const householdRecommendationDir = resolve(
      privatePaths.recommendationsDir,
      householdConfig.householdId,
    );
    const outputPath = resolve(
      householdRecommendationDir,
      `${sanitizeFileComponent(householdConfig.configVersion)}--${snapshotId}.json`,
    );

    assertPathOutsideRoots(outputPath, "Recommendation artifact", [
      dataPaths.dataDir,
      dataPaths.publicDir,
    ]);

    mkdirSync(householdRecommendationDir, { recursive: true });
    writeFileSync(outputPath, JSON.stringify(result, null, 2));
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
