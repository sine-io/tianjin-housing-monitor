import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { resolve } from "node:path";

import { loadCommunities, loadSegments } from "../lib/config";
import {
  loadAcceptedManualInputFiles,
  summarizeManualSamplesInDateRange,
} from "../lib/manual-input";
import {
  aggregateSegmentWindow,
  type AggregatedSegmentWindow,
  type SegmentWindowObservation,
} from "../lib/metrics";
import { getSegmentVerdict } from "../lib/verdicts";
import { DATA_DIR, resolveDataPaths } from "../lib/paths";

interface CityMarketSeriesEntry {
  date: string;
  generatedAt: string;
  sourceMonth: string;
  secondaryHomePriceIndexMom: number;
  secondaryHomePriceIndexYoy: number;
  verdict: string;
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

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function shiftDate(dateString: string, offsetDays: number): string {
  const date = new Date(`${dateString}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return formatDate(date);
}

function hasAggregatedObservations(window: AggregatedSegmentWindow): boolean {
  return (
    window.listingUnitPriceMedian !== null ||
    window.listingUnitPriceMin !== null ||
    window.listingsCount > 0 ||
    window.suspectedDealCount > 0 ||
    window.manualDealCount > 0
  );
}

function buildWeeklySegmentWindowFromAcceptedManualSamples(
  observations: SegmentWindowObservation[],
  manualSamples: Parameters<typeof summarizeManualSamplesInDateRange>[0],
  communityId: string,
  segmentId: string,
  start: string,
  end: string,
): AggregatedSegmentWindow {
  const { manualDealCount: _storedSeriesManualDealCount, ...aggregatedWindow } =
    aggregateSegmentWindow(observations, start, end);
  // Weekly reports intentionally recompute manual counts from the current
  // accepted sample set so late-accepted backfills land in the correct window.
  const exactManualSummary = summarizeManualSamplesInDateRange(
    manualSamples,
    communityId,
    segmentId,
    start,
    end,
  );

  return {
    ...aggregatedWindow,
    manualDealCount: exactManualSummary.manualDealCount,
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
  const cityMarketPath = resolve(paths.seriesDir, "city-market", "tianjin.json");
  const cityMarketSeries = existsSync(cityMarketPath)
    ? readJsonFile<{ city: string; series: CityMarketSeriesEntry[] }>(cityMarketPath)
    : { city: "天津", series: [] };

  rmSync(paths.reportsDir, { recursive: true, force: true });
  mkdirSync(paths.reportsDir, { recursive: true });

  const latestDate = cityMarketSeries.series.at(-1)?.date;

  if (!latestDate) {
    return;
  }

  const validCommunityIds = new Set(communities.map((community) => community.id));
  const validSegmentIds = new Set(segments.map((segment) => segment.id));
  const manualSamples = existsSync(paths.manualAcceptedDir)
    ? loadAcceptedManualInputFiles(
        paths.manualAcceptedDir,
        validCommunityIds,
        validSegmentIds,
        segmentIdByCommunityId,
      )
    : [];

  const windows = {
    w0: {
      start: shiftDate(latestDate, -6),
      end: latestDate,
    },
    wMinus1: {
      start: shiftDate(latestDate, -13),
      end: shiftDate(latestDate, -7),
    },
    wMinus2: {
      start: shiftDate(latestDate, -20),
      end: shiftDate(latestDate, -14),
    },
  };

  const report = {
    generatedAt: new Date().toISOString(),
    weekEnding: latestDate,
    cityMarket: cityMarketSeries.series.at(-1) ?? null,
    communities: Object.fromEntries(
      communities.map((community) => {
        const segment = primarySegmentByCommunity.get(community.id);

        if (!segment) {
          throw new Error(`Missing primary segment for community: ${community.id}`);
        }

        const seriesPath = resolve(
          paths.seriesDir,
          "communities",
          community.id,
          `${segment.id}.json`,
        );
        const seriesFile = existsSync(seriesPath)
          ? readJsonFile<{ series: CommunitySegmentSeriesEntry[] }>(seriesPath)
          : { series: [] };
        const observations: SegmentWindowObservation[] = seriesFile.series.map(
          (entry) => ({
            date: entry.date,
            listingUnitPriceMedian: entry.listingUnitPriceMedian,
            listingUnitPriceMin: entry.listingUnitPriceMin,
            listingsCount: entry.listingsCount,
            suspectedDealCount: entry.suspectedDealCount,
            manualDealCount: entry.manualDealCount,
          }),
        );
        const wMinus2 = buildWeeklySegmentWindowFromAcceptedManualSamples(
          observations,
          manualSamples,
          community.id,
          segment.id,
          windows.wMinus2.start,
          windows.wMinus2.end,
        );
        const wMinus1 = buildWeeklySegmentWindowFromAcceptedManualSamples(
          observations,
          manualSamples,
          community.id,
          segment.id,
          windows.wMinus1.start,
          windows.wMinus1.end,
        );
        const w0 = buildWeeklySegmentWindowFromAcceptedManualSamples(
          observations,
          manualSamples,
          community.id,
          segment.id,
          windows.w0.start,
          windows.w0.end,
        );

        return [
          community.id,
          {
            name: community.name,
            district: community.district,
            segments: {
              [segment.id]: {
                label: segment.label,
                verdict: getSegmentVerdict([wMinus2, wMinus1, w0]),
                latest: hasAggregatedObservations(w0) ? w0 : null,
              },
            },
          },
        ];
      }),
    ),
  };

  writeFileSync(
    resolve(paths.reportsDir, `${latestDate}.json`),
    JSON.stringify(report, null, 2),
  );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
