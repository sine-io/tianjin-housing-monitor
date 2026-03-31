import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { tmpdir } from "node:os";

import { afterEach, describe, expect, it } from "vitest";

const TSX_PATH = resolve("node_modules/.bin/tsx");
const temporaryRoots: string[] = [];

function makeTempRoot(prefix: string): string {
  const tempRoot = mkdtempSync(resolve(tmpdir(), prefix));
  temporaryRoots.push(tempRoot);
  return tempRoot;
}

function readJsonFile<T>(filePath: string): T {
  return JSON.parse(readFileSync(filePath, "utf8")) as T;
}

describe("scripts/build-weekly-report.ts", () => {
  afterEach(() => {
    while (temporaryRoots.length > 0) {
      rmSync(temporaryRoots.pop()!, { recursive: true, force: true });
    }
  });

  it("builds segment verdicts from aggregated W-2, W-1, and W0 windows instead of the latest single entry in each range", () => {
    const rootDir = makeTempRoot("build-weekly-report-");
    const dataDir = resolve(rootDir, "data");

    cpSync(resolve("data/config"), resolve(dataDir, "config"), { recursive: true });
    mkdirSync(resolve(dataDir, "series", "city-market"), { recursive: true });
    mkdirSync(
      resolve(dataDir, "series", "communities", "yunshu-huayuan"),
      { recursive: true },
    );

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

    writeFileSync(
      resolve(dataDir, "series", "communities", "yunshu-huayuan", "2br-87-90.json"),
      JSON.stringify(
        {
          communityId: "yunshu-huayuan",
          segmentId: "2br-87-90",
          series: dailySeries,
        },
        null,
        2,
      ),
    );

    execFileSync(
      TSX_PATH,
      ["scripts/build-weekly-report.ts", "--data-dir", dataDir],
      {
        cwd: resolve("."),
        stdio: "pipe",
      },
    );

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
      report.communities["yunshu-huayuan"]?.segments["2br-87-90"];

    expect(segmentReport?.verdict).toBe("上涨");
    expect(segmentReport?.latest).toEqual({
      listingUnitPriceMedian: 10_600,
      listingUnitPriceMin: 10_200,
      listingsCount: 6,
      suspectedDealCount: 3,
      manualDealCount: 0,
    });
  });

  it("does not let manual counts from an earlier window leak into the W-1 or W0 verdict inputs", () => {
    const rootDir = makeTempRoot("build-weekly-report-manual-");
    const dataDir = resolve(rootDir, "data");

    cpSync(resolve("data/config"), resolve(dataDir, "config"), { recursive: true });
    mkdirSync(resolve(dataDir, "series", "city-market"), { recursive: true });
    mkdirSync(
      resolve(dataDir, "series", "communities", "yunshu-huayuan"),
      { recursive: true },
    );
    mkdirSync(resolve(dataDir, "manual", "accepted"), { recursive: true });

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

    writeFileSync(
      resolve(dataDir, "manual", "accepted", "samples.json"),
      JSON.stringify(
        {
          source: "test",
          submittedAt: "2026-03-31T12:00:00.000Z",
          samples: [
            {
              communityId: "yunshu-huayuan",
              segmentId: "2br-87-90",
              sampleAt: "2026-03-17T12:00:00.000Z",
              dealCount: 1,
              dealUnitPriceYuanPerSqm: 10_000,
            },
            {
              communityId: "yunshu-huayuan",
              segmentId: "2br-87-90",
              sampleAt: "2026-03-28T12:00:00.000Z",
              dealCount: 1,
              dealUnitPriceYuanPerSqm: 9_700,
            },
          ],
        },
        null,
        2,
      ),
    );

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
        listingUnitPriceMin: 9_800,
        listingsCount: 8,
        suspectedDealCount: 0,
        manualDealCount: 1,
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
        "2026-03-24",
      ].map((date) => ({
        date,
        generatedAt: `${date}T12:00:00.000Z`,
        derivedFrom: "segment-teasers",
        listingUnitPriceMedian: 10_000,
        listingUnitPriceMin: 9_800,
        listingsCount: 8,
        suspectedDealCount: 0,
        manualDealCount: 1,
        manualDealUnitPriceMedian: null,
        manualLatestSampleAt: null,
      })),
      ...[
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
        listingUnitPriceMedian: 9_700,
        listingUnitPriceMin: 9_500,
        listingsCount: 8,
        suspectedDealCount: 0,
        manualDealCount: 1,
        manualDealUnitPriceMedian: null,
        manualLatestSampleAt: null,
      })),
    ];

    writeFileSync(
      resolve(dataDir, "series", "communities", "yunshu-huayuan", "2br-87-90.json"),
      JSON.stringify(
        {
          communityId: "yunshu-huayuan",
          segmentId: "2br-87-90",
          series: dailySeries,
        },
        null,
        2,
      ),
    );

    execFileSync(
      TSX_PATH,
      ["scripts/build-weekly-report.ts", "--data-dir", dataDir],
      {
        cwd: resolve("."),
        stdio: "pipe",
      },
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
                manualDealCount: number;
              } | null;
            }
          >;
        }
      >;
    }>(resolve(dataDir, "reports", "2026-03-31.json"));

    const segmentReport =
      report.communities["yunshu-huayuan"]?.segments["2br-87-90"];

    expect(segmentReport?.verdict).toBe("以价换量");
    expect(segmentReport?.latest?.manualDealCount).toBe(1);
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

    execFileSync(
      TSX_PATH,
      ["scripts/build-weekly-report.ts", "--data-dir", dataDir],
      {
        cwd: resolve("."),
        stdio: "pipe",
      },
    );

    expect(existsSync(resolve(dataDir, "reports", "stale.json"))).toBe(false);
  });
});
