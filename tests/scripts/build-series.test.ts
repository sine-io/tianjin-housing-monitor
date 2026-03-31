import { execFileSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdtempSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { resolve } from "node:path";
import { tmpdir } from "node:os";

import { afterEach, describe, expect, it } from "vitest";

import { loadCommunities, loadSegments } from "../../lib/config";

const DEFAULT_FIXTURE_ROOT = resolve("tests/fixtures");
const REPO_REPORTS_DIR = resolve("data/reports");
const REPO_SERIES_DIR = resolve("data/series");
const REPO_SITE_PUBLIC_DATA_DIR = resolve("site/public/data");
const TSX_PATH = resolve("node_modules/.bin/tsx");

const temporaryRoots: string[] = [];

interface TempWorkspace {
  rootDir: string;
  dataDir: string;
  fixtureRoot: string;
  runsDir: string;
}

function makeTempRoot(prefix: string): string {
  const tempRoot = mkdtempSync(resolve(tmpdir(), prefix));
  temporaryRoots.push(tempRoot);
  return tempRoot;
}

function makeWorkspace(): TempWorkspace {
  const tempRoot = makeTempRoot("build-series-");
  const dataDir = resolve(tempRoot, "data");
  const fixtureRoot = resolve(tempRoot, "fixtures");
  const runsDir = resolve(dataDir, "runs");

  mkdirSync(dataDir, { recursive: true });
  mkdirSync(runsDir, { recursive: true });
  mkdirSync(resolve(dataDir, "manual", "accepted"), { recursive: true });
  mkdirSync(resolve(dataDir, "manual", "incoming"), { recursive: true });
  cpSync(resolve("data/config"), resolve(dataDir, "config"), { recursive: true });
  cpSync(DEFAULT_FIXTURE_ROOT, fixtureRoot, { recursive: true });

  return {
    rootDir: tempRoot,
    dataDir,
    fixtureRoot,
    runsDir,
  };
}

function readJsonFile<T>(filePath: string): T {
  return JSON.parse(readFileSync(filePath, "utf8")) as T;
}

function listJsonFiles(directory: string): string[] {
  if (!existsSync(directory)) {
    return [];
  }

  return readdirSync(directory)
    .filter((entry) => entry.endsWith(".json"))
    .sort();
}

function snapshotTree(root: string): Record<string, string> | null {
  if (!existsSync(root)) {
    return null;
  }

  const entries = new Map<string, string>();

  function walk(currentPath: string, relativePath: string): void {
    const stats = statSync(currentPath);

    if (stats.isDirectory()) {
      for (const entry of readdirSync(currentPath).sort()) {
        walk(resolve(currentPath, entry), resolve(relativePath, entry));
      }
      return;
    }

    entries.set(relativePath, readFileSync(currentPath, "utf8"));
  }

  walk(root, ".");
  return Object.fromEntries(entries);
}

function runScript(scriptPath: string, ...args: string[]): void {
  execFileSync(TSX_PATH, [scriptPath, ...args], {
    cwd: resolve("."),
    stdio: "pipe",
  });
}

function collectFixturesIntoRuns({
  fixtureRoot,
  runsDir,
}: TempWorkspace): void {
  runScript("scripts/collect.ts", "--fixture", fixtureRoot, "--runs-dir", runsDir);
}

function overwriteRunArtifactsForTeaserCoverage(runsDir: string): void {
  for (const fileName of listJsonFiles(runsDir)) {
    const filePath = resolve(runsDir, fileName);
    const runArtifact = readJsonFile<{
      communities: Record<
        string,
        {
          fangCommunity: {
            currentListingTeasers?: unknown[];
          };
        }
      >;
    }>(filePath);

    runArtifact.communities["yunshu-huayuan"]!.fangCommunity.currentListingTeasers =
      [
        {
          title: "两居样本 A",
          roomCount: 2,
          areaSqm: 89,
          totalPriceWan: 173,
          unitPriceYuanPerSqm: 19_438,
        },
        {
          title: "两居样本 B",
          roomCount: 2,
          areaSqm: 88,
          totalPriceWan: 178,
          unitPriceYuanPerSqm: 20_200,
        },
        {
          title: "两居样本 C",
          roomCount: 2,
          areaSqm: 87.5,
          totalPriceWan: 184,
          unitPriceYuanPerSqm: 21_000,
        },
      ];

    writeFileSync(filePath, JSON.stringify(runArtifact, null, 2));
  }
}

function writeAcceptedManualInput(dataDir: string): void {
  writeFileSync(
    resolve(dataDir, "manual", "accepted", "fixture-sample.json"),
    JSON.stringify(
      {
        source: "fixture-test",
        submittedAt: "2026-03-31T09:00:00.000Z",
        samples: [
          {
            communityId: "yunshu-huayuan",
            segmentId: "2br-87-90",
            sampleAt: "2026-03-30T12:00:00.000Z",
            dealCount: 1,
            dealUnitPriceYuanPerSqm: 19_300,
          },
        ],
      },
      null,
      2,
    ),
  );
}

describe("scripts/build-series.ts", () => {
  afterEach(() => {
    while (temporaryRoots.length > 0) {
      rmSync(temporaryRoots.pop()!, { recursive: true, force: true });
    }
  });

  it("builds the city market series, all community segment series, and one weekly report inside a temp data dir", () => {
    const workspace = makeWorkspace();
    const repoSeriesBefore = snapshotTree(REPO_SERIES_DIR);
    const repoReportsBefore = snapshotTree(REPO_REPORTS_DIR);
    const repoPublicDataBefore = snapshotTree(REPO_SITE_PUBLIC_DATA_DIR);

    collectFixturesIntoRuns(workspace);
    overwriteRunArtifactsForTeaserCoverage(workspace.runsDir);
    writeAcceptedManualInput(workspace.dataDir);

    runScript("scripts/build-series.ts", "--data-dir", workspace.dataDir);
    runScript("scripts/build-weekly-report.ts", "--data-dir", workspace.dataDir);
    runScript("scripts/prepare-public-data.ts", "--data-dir", workspace.dataDir);

    expect(snapshotTree(REPO_SERIES_DIR)).toEqual(repoSeriesBefore);
    expect(snapshotTree(REPO_REPORTS_DIR)).toEqual(repoReportsBefore);
    expect(snapshotTree(REPO_SITE_PUBLIC_DATA_DIR)).toEqual(repoPublicDataBefore);

    const cityMarketPath = resolve(
      workspace.dataDir,
      "series",
      "city-market",
      "tianjin.json",
    );
    expect(existsSync(cityMarketPath)).toBe(true);

    const cityMarketSeries = readJsonFile<{
      city: string;
      series: Array<{
        sourceMonth: string;
        secondaryHomePriceIndexMom: number;
        verdict: string;
      }>;
    }>(cityMarketPath);

    expect(cityMarketSeries.city).toBe("天津");
    expect(cityMarketSeries.series).toHaveLength(1);
    expect(cityMarketSeries.series[0]).toEqual(
      expect.objectContaining({
        sourceMonth: "2026-02",
        secondaryHomePriceIndexMom: 99.5,
        verdict: "偏弱",
      }),
    );

    for (const community of loadCommunities(resolve(workspace.dataDir, "config", "communities.json"))) {
      for (const segment of loadSegments(resolve(workspace.dataDir, "config", "segments.json"))) {
        expect(
          existsSync(
            resolve(
              workspace.dataDir,
              "series",
              "communities",
              community.id,
              `${segment.id}.json`,
            ),
          ),
        ).toBe(true);
      }
    }

    const teaserDerivedSeries = readJsonFile<{
      series: Array<{
        derivedFrom: string;
        listingUnitPriceMedian: number;
        listingUnitPriceMin: number;
        listingsCount: number;
        manualDealCount: number;
        manualDealUnitPriceMedian: number;
        manualLatestSampleAt: string;
      }>;
    }>(
      resolve(
        workspace.dataDir,
        "series",
        "communities",
        "yunshu-huayuan",
        "2br-87-90.json",
      ),
    );

    expect(teaserDerivedSeries.series).toHaveLength(1);
    expect(teaserDerivedSeries.series[0]).toEqual(
      expect.objectContaining({
        derivedFrom: "segment-teasers",
        listingUnitPriceMedian: 20_200,
        listingUnitPriceMin: 19_438,
        listingsCount: 3,
        manualDealCount: 1,
        manualDealUnitPriceMedian: 19_300,
        manualLatestSampleAt: "2026-03-30T12:00:00.000Z",
      }),
    );

    const fallbackSeries = readJsonFile<{
      series: Array<{
        derivedFrom: string;
        listingUnitPriceMedian: number;
        listingUnitPriceMin: number;
        listingsCount: number;
      }>;
    }>(
      resolve(
        workspace.dataDir,
        "series",
        "communities",
        "mingquan-huayuan",
        "3br-140-150.json",
      ),
    );

    expect(fallbackSeries.series).toHaveLength(1);
    expect(fallbackSeries.series[0]).toEqual(
      expect.objectContaining({
        derivedFrom: "community-fallback",
        listingUnitPriceMedian: 23_006,
        listingUnitPriceMin: 23_006,
        listingsCount: 0,
      }),
    );

    const reportFiles = listJsonFiles(resolve(workspace.dataDir, "reports"));
    expect(reportFiles).toHaveLength(1);

    const weeklyReport = readJsonFile<{
      cityMarket: {
        verdict: string;
      };
      communities: Record<
        string,
        {
          segments: Record<
            string,
            {
              verdict: string;
            }
          >;
        }
      >;
    }>(resolve(workspace.dataDir, "reports", reportFiles[0]!));

    expect(weeklyReport.cityMarket.verdict).toBe("偏弱");
    expect(
      weeklyReport.communities["yunshu-huayuan"]?.segments["2br-87-90"]?.verdict,
    ).toBe("样本不足");

    const publicDataDir = resolve(workspace.rootDir, "site", "public", "data");
    expect(existsSync(resolve(publicDataDir, "config", "communities.json"))).toBe(
      true,
    );
    expect(existsSync(resolve(publicDataDir, "config", "segments.json"))).toBe(
      true,
    );
    expect(existsSync(resolve(publicDataDir, "series", "city-market", "tianjin.json"))).toBe(
      true,
    );
    expect(
      existsSync(resolve(publicDataDir, "reports", reportFiles[0]!)),
    ).toBe(true);
    expect(existsSync(resolve(publicDataDir, "latest-report.json"))).toBe(false);
  }, 15_000);
});
