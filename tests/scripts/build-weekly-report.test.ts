import { execFileSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { resolve } from "node:path";
import { tmpdir } from "node:os";

import { afterEach, describe, expect, it } from "vitest";

import { loadCommunities, loadSegments } from "../../lib/config";

const TSX_PATH = resolve("node_modules/.bin/tsx");
const PRIMARY_COMMUNITY_ID = "mingquan-huayuan";
const PRIMARY_SEGMENT_ID = "mingquan-2br-87-90";
const WANKE_COMMUNITY_ID = "wanke-dongdi";
const WANKE_SEGMENT_ID = "wanke-2br-85-90";
const temporaryRoots: string[] = [];

function makeTempRoot(prefix: string): string {
  const tempRoot = mkdtempSync(resolve(tmpdir(), prefix));
  temporaryRoots.push(tempRoot);
  return tempRoot;
}

function readJsonFile<T>(filePath: string): T {
  return JSON.parse(readFileSync(filePath, "utf8")) as T;
}

function setupDataDir(rootDir: string): string {
  const dataDir = resolve(rootDir, "data");
  cpSync(resolve("data/config"), resolve(dataDir, "config"), { recursive: true });
  mkdirSync(resolve(dataDir, "series", "city-market"), { recursive: true });
  mkdirSync(resolve(dataDir, "series", "communities", PRIMARY_COMMUNITY_ID), {
    recursive: true,
  });
  return dataDir;
}

function writeCityMarketSeries(dataDir: string): void {
  writeFileSync(
    resolve(dataDir, "series", "city-market", "tianjin.json"),
    JSON.stringify(
      {
        city: "天津",
        series: [
          {
            date: "2026-03-31",
            generatedAt: "2026-03-31T00:00:00.000Z",
            sourceMonth: "2026-02",
            secondaryHomePriceIndexMom: 99.5,
            secondaryHomePriceIndexYoy: 94,
            verdict: "偏弱",
          },
        ],
      },
      null,
      2,
    ),
  );
}

function writeSegmentSeries(
  dataDir: string,
  communityId: string,
  segmentId: string,
  dailySeries: unknown[],
): void {
  mkdirSync(resolve(dataDir, "series", "communities", communityId), {
    recursive: true,
  });
  writeFileSync(
    resolve(
      dataDir,
      "series",
      "communities",
      communityId,
      `${segmentId}.json`,
    ),
    JSON.stringify(
      {
        communityId,
        segmentId,
        series: dailySeries,
      },
      null,
      2,
    ),
  );
}

function runBuildWeeklyReport(dataDir: string): void {
  execFileSync(
    TSX_PATH,
    ["scripts/build-weekly-report.ts", "--data-dir", dataDir],
    {
      cwd: resolve("."),
      stdio: "pipe",
    },
  );
}

describe("scripts/build-weekly-report.ts", () => {
  afterEach(() => {
    while (temporaryRoots.length > 0) {
      rmSync(temporaryRoots.pop()!, { recursive: true, force: true });
    }
  });

  it("writes exactly one primary segment entry per community under segments", () => {
    const rootDir = makeTempRoot("build-weekly-report-primary-");
    const dataDir = setupDataDir(rootDir);

    writeCityMarketSeries(dataDir);
    writeSegmentSeries(dataDir, PRIMARY_COMMUNITY_ID, PRIMARY_SEGMENT_ID, [
      {
        date: "2026-03-31",
        generatedAt: "2026-03-31T12:00:00.000Z",
        derivedFrom: "segment-teasers",
        listingUnitPriceMedian: 10_100,
        listingUnitPriceMin: 9_600,
        listingsCount: 9,
        suspectedDealCount: 1,
        manualDealCount: 0,
        manualDealUnitPriceMedian: null,
        manualLatestSampleAt: null,
      },
    ]);

    runBuildWeeklyReport(dataDir);

    const reportPath = resolve(dataDir, "reports", "2026-03-31.json");
    expect(existsSync(reportPath)).toBe(true);

    const communities = loadCommunities(resolve(dataDir, "config", "communities.json"));
    const segments = loadSegments(
      resolve(dataDir, "config", "segments.json"),
      communities,
    );
    const primarySegmentByCommunity = new Map(
      segments.map((segment) => [segment.communityId, segment]),
    );
    const report = readJsonFile<{
      communities: Record<
        string,
        {
          segments: Record<
            string,
            {
              verdict: string;
              latest: {
                listingUnitPriceMedian: number;
              } | null;
            }
          >;
        }
      >;
    }>(reportPath);

    for (const community of communities) {
      const primarySegment = primarySegmentByCommunity.get(community.id);
      expect(Object.keys(report.communities[community.id]!.segments)).toEqual([
        primarySegment!.id,
      ]);
    }

    expect(
      report.communities[PRIMARY_COMMUNITY_ID]?.segments[PRIMARY_SEGMENT_ID]?.latest,
    ).toEqual(
      expect.objectContaining({
        listingUnitPriceMedian: 10_100,
      }),
    );
  });

  it("keeps a Wanke community-fallback entry with null pricing visible to downstream reports", () => {
    const rootDir = makeTempRoot("build-weekly-report-wanke-");
    const dataDir = setupDataDir(rootDir);

    writeCityMarketSeries(dataDir);
    writeSegmentSeries(dataDir, WANKE_COMMUNITY_ID, WANKE_SEGMENT_ID, [
      {
        date: "2026-03-31",
        generatedAt: "2026-03-31T12:00:00.000Z",
        derivedFrom: "community-fallback",
        listingUnitPriceMedian: null,
        listingUnitPriceMin: null,
        listingsCount: 2,
        suspectedDealCount: 0,
        manualDealCount: 0,
        manualDealUnitPriceMedian: null,
        manualLatestSampleAt: null,
      },
    ]);

    runBuildWeeklyReport(dataDir);

    const report = readJsonFile<{
      communities: Record<
        string,
        {
          segments: Record<
            string,
            {
              verdict: string;
              latest: {
                listingUnitPriceMedian: number | null;
                listingsCount: number;
              } | null;
            }
          >;
        }
      >;
    }>(resolve(dataDir, "reports", "2026-03-31.json"));

    expect(
      report.communities[WANKE_COMMUNITY_ID]?.segments[WANKE_SEGMENT_ID],
    ).toEqual({
      verdict: "样本不足",
      latest: {
        listingUnitPriceMedian: null,
        listingsCount: 2,
        listingUnitPriceMin: null,
        suspectedDealCount: 0,
        manualDealCount: 0,
      },
      label: "2居 85-90㎡",
    });
  });

  it("keeps a sparse Wanke-like W0 fallback window visible when daily counts are 0 0 2", () => {
    const rootDir = makeTempRoot("build-weekly-report-wanke-sparse-");
    const dataDir = setupDataDir(rootDir);

    writeCityMarketSeries(dataDir);
    writeSegmentSeries(dataDir, WANKE_COMMUNITY_ID, WANKE_SEGMENT_ID, [
      {
        date: "2026-03-29",
        generatedAt: "2026-03-29T12:00:00.000Z",
        derivedFrom: "community-fallback",
        listingUnitPriceMedian: null,
        listingUnitPriceMin: null,
        listingsCount: 0,
        suspectedDealCount: 0,
        manualDealCount: 0,
        manualDealUnitPriceMedian: null,
        manualLatestSampleAt: null,
      },
      {
        date: "2026-03-30",
        generatedAt: "2026-03-30T12:00:00.000Z",
        derivedFrom: "community-fallback",
        listingUnitPriceMedian: null,
        listingUnitPriceMin: null,
        listingsCount: 0,
        suspectedDealCount: 0,
        manualDealCount: 0,
        manualDealUnitPriceMedian: null,
        manualLatestSampleAt: null,
      },
      {
        date: "2026-03-31",
        generatedAt: "2026-03-31T12:00:00.000Z",
        derivedFrom: "community-fallback",
        listingUnitPriceMedian: null,
        listingUnitPriceMin: null,
        listingsCount: 2,
        suspectedDealCount: 0,
        manualDealCount: 0,
        manualDealUnitPriceMedian: null,
        manualLatestSampleAt: null,
      },
    ]);

    runBuildWeeklyReport(dataDir);

    const report = readJsonFile<{
      communities: Record<
        string,
        {
          segments: Record<
            string,
            {
              latest: {
                listingUnitPriceMedian: number | null;
                listingUnitPriceMin: number | null;
                listingsCount: number;
                suspectedDealCount: number;
                manualDealCount: number;
              } | null;
            }
          >;
        }
      >;
    }>(resolve(dataDir, "reports", "2026-03-31.json"));

    expect(
      report.communities[WANKE_COMMUNITY_ID]?.segments[WANKE_SEGMENT_ID]?.latest,
    ).toEqual({
      listingUnitPriceMedian: null,
      listingUnitPriceMin: null,
      listingsCount: 2,
      suspectedDealCount: 0,
      manualDealCount: 0,
    });
  });

  it("builds segment verdicts from aggregated W-2, W-1, and W0 windows instead of the latest single entry in each range", () => {
    const rootDir = makeTempRoot("build-weekly-report-");
    const dataDir = setupDataDir(rootDir);

    writeCityMarketSeries(dataDir);

    const dailySeries = [
      ...[
        "2026-03-11",
        "2026-03-12",
        "2026-03-13",
        "2026-03-14",
        "2026-03-15",
        "2026-03-16",
        "2026-03-17",
      ].map((date) => ({
        date,
        generatedAt: `${date}T12:00:00.000Z`,
        derivedFrom: "segment-teasers",
        listingUnitPriceMedian: 10_000,
        listingUnitPriceMin: 9_500,
        listingsCount: 10,
        suspectedDealCount: 1,
        manualDealCount: 0,
        manualDealUnitPriceMedian: null,
        manualLatestSampleAt: null,
      })),
      ...[
        "2026-03-18",
        "2026-03-19",
        "2026-03-20",
        "2026-03-21",
        "2026-03-22",
        "2026-03-23",
      ].map((date) => ({
        date,
        generatedAt: `${date}T12:00:00.000Z`,
        derivedFrom: "segment-teasers",
        listingUnitPriceMedian: 10_300,
        listingUnitPriceMin: 9_800,
        listingsCount: 8,
        suspectedDealCount: 2,
        manualDealCount: 0,
        manualDealUnitPriceMedian: null,
        manualLatestSampleAt: null,
      })),
      {
        date: "2026-03-24",
        generatedAt: "2026-03-24T12:00:00.000Z",
        derivedFrom: "segment-teasers",
        listingUnitPriceMedian: 10_050,
        listingUnitPriceMin: 9_500,
        listingsCount: 10,
        suspectedDealCount: 1,
        manualDealCount: 0,
        manualDealUnitPriceMedian: null,
        manualLatestSampleAt: null,
      },
      ...[
        "2026-03-25",
        "2026-03-26",
        "2026-03-27",
        "2026-03-28",
        "2026-03-29",
        "2026-03-30",
      ].map((date) => ({
        date,
        generatedAt: `${date}T12:00:00.000Z`,
        derivedFrom: "segment-teasers",
        listingUnitPriceMedian: 10_600,
        listingUnitPriceMin: 10_200,
        listingsCount: 6,
        suspectedDealCount: 3,
        manualDealCount: 1,
        manualDealUnitPriceMedian: null,
        manualLatestSampleAt: null,
      })),
      {
        date: "2026-03-31",
        generatedAt: "2026-03-31T12:00:00.000Z",
        derivedFrom: "segment-teasers",
        listingUnitPriceMedian: 10_100,
        listingUnitPriceMin: 9_600,
        listingsCount: 9,
        suspectedDealCount: 1,
        manualDealCount: 0,
        manualDealUnitPriceMedian: null,
        manualLatestSampleAt: null,
      },
    ];

    writeSegmentSeries(dataDir, PRIMARY_COMMUNITY_ID, PRIMARY_SEGMENT_ID, dailySeries);
    runBuildWeeklyReport(dataDir);

    const reportPath = resolve(dataDir, "reports", "2026-03-31.json");
    expect(existsSync(reportPath)).toBe(true);

    const report = readJsonFile<{
      communities: Record<
        string,
        {
          segments: Record<
            string,
            {
              verdict: string;
              latest: {
                listingUnitPriceMedian: number;
                listingUnitPriceMin: number;
                listingsCount: number;
                suspectedDealCount: number;
                manualDealCount: number;
              } | null;
            }
          >;
        }
      >;
    }>(reportPath);

    const segmentReport =
      report.communities[PRIMARY_COMMUNITY_ID]?.segments[PRIMARY_SEGMENT_ID];

    expect(segmentReport?.verdict).toBe("上涨");
    expect(segmentReport?.latest).toEqual({
      listingUnitPriceMedian: 10_600,
      listingUnitPriceMin: 10_200,
      listingsCount: 6,
      suspectedDealCount: 3,
      manualDealCount: 0,
    });
  });

  it("recomputes weekly manual counts from current accepted samples instead of stored daily snapshots", () => {
    const rootDir = makeTempRoot("build-weekly-report-backfill-");
    const dataDir = setupDataDir(rootDir);

    writeCityMarketSeries(dataDir);
    mkdirSync(resolve(dataDir, "manual", "accepted"), { recursive: true });

    writeFileSync(
      resolve(dataDir, "manual", "accepted", "samples.json"),
      JSON.stringify(
        {
          source: "test",
          submittedAt: "2026-03-31T12:00:00.000Z",
          samples: [
            {
              communityId: PRIMARY_COMMUNITY_ID,
              segmentId: PRIMARY_SEGMENT_ID,
              sampleAt: "2026-03-31T00:15:00.000+08:00",
              dealCount: 1,
              dealUnitPriceYuanPerSqm: 10_000,
            },
          ],
        },
        null,
        2,
      ),
    );

    writeSegmentSeries(
      dataDir,
      PRIMARY_COMMUNITY_ID,
      PRIMARY_SEGMENT_ID,
      [
        "2026-03-25",
        "2026-03-26",
        "2026-03-27",
        "2026-03-28",
        "2026-03-29",
        "2026-03-30",
        "2026-03-31",
      ].map((date) => ({
        date,
        generatedAt: `${date}T12:00:00.000Z`,
        derivedFrom: "segment-teasers",
        listingUnitPriceMedian: 10_000,
        listingUnitPriceMin: 9_800,
        listingsCount: 8,
        suspectedDealCount: 1,
        manualDealCount: 9,
        manualDealUnitPriceMedian: null,
        manualLatestSampleAt: null,
      })),
    );

    runBuildWeeklyReport(dataDir);

    const report = readJsonFile<{
      communities: Record<
        string,
        {
          segments: Record<
            string,
            {
              latest: {
                manualDealCount: number;
              } | null;
            }
          >;
        }
      >;
    }>(resolve(dataDir, "reports", "2026-03-31.json"));

    const segmentReport =
      report.communities[PRIMARY_COMMUNITY_ID]?.segments[PRIMARY_SEGMENT_ID];

    expect(segmentReport?.latest?.manualDealCount).toBe(1);
  });

  it("rejects accepted manual samples whose segment does not belong to the community", () => {
    const rootDir = makeTempRoot("build-weekly-report-invalid-manual-");
    const dataDir = setupDataDir(rootDir);

    writeCityMarketSeries(dataDir);
    mkdirSync(resolve(dataDir, "manual", "accepted"), { recursive: true });
    writeSegmentSeries(dataDir, PRIMARY_COMMUNITY_ID, PRIMARY_SEGMENT_ID, [
      {
        date: "2026-03-31",
        generatedAt: "2026-03-31T12:00:00.000Z",
        derivedFrom: "segment-teasers",
        listingUnitPriceMedian: 10_100,
        listingUnitPriceMin: 9_600,
        listingsCount: 9,
        suspectedDealCount: 1,
        manualDealCount: 0,
        manualDealUnitPriceMedian: null,
        manualLatestSampleAt: null,
      },
    ]);
    writeFileSync(
      resolve(dataDir, "manual", "accepted", "invalid-sample.json"),
      JSON.stringify(
        {
          source: "test",
          submittedAt: "2026-03-31T12:00:00.000Z",
          samples: [
            {
              communityId: PRIMARY_COMMUNITY_ID,
              segmentId: WANKE_SEGMENT_ID,
              sampleAt: "2026-03-31T12:00:00.000Z",
              dealCount: 1,
              dealUnitPriceYuanPerSqm: 10_100,
            },
          ],
        },
        null,
        2,
      ),
    );

    expect(() => runBuildWeeklyReport(dataDir)).toThrowError(
      /does not belong to community/i,
    );
  });

  it("clears stale reports when there is no latest city-market date", () => {
    const rootDir = makeTempRoot("build-weekly-report-empty-");
    const dataDir = resolve(rootDir, "data");

    cpSync(resolve("data/config"), resolve(dataDir, "config"), { recursive: true });
    mkdirSync(resolve(dataDir, "series", "city-market"), { recursive: true });
    mkdirSync(resolve(dataDir, "reports"), { recursive: true });

    writeFileSync(
      resolve(dataDir, "series", "city-market", "tianjin.json"),
      JSON.stringify(
        {
          city: "天津",
          series: [],
        },
        null,
        2,
      ),
    );
    writeFileSync(
      resolve(dataDir, "reports", "stale.json"),
      JSON.stringify({ stale: true }, null, 2),
    );

    runBuildWeeklyReport(dataDir);

    expect(readdirSync(resolve(dataDir, "reports"))).toEqual([]);
  });
});
