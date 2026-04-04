import { execFileSync } from "node:child_process";
import {
  cpSync,
  mkdtempSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { resolve } from "node:path";
import { tmpdir } from "node:os";

import { afterEach, describe, expect, it } from "vitest";

import { loadCommunities } from "../../lib/config";

const REPO_RUNS_DIR = resolve("data/runs");
const DEFAULT_FIXTURE_ROOT = resolve("tests/fixtures");
const TSX_PATH = resolve("node_modules/.bin/tsx");
const WANKE_FIXTURE_PATH = resolve(
  DEFAULT_FIXTURE_ROOT,
  "anjuke/sale-search/wanke-dongdi.html",
);
const WANKE_EMPTY_FIXTURE_PATH = resolve(
  DEFAULT_FIXTURE_ROOT,
  "anjuke/sale-search/wanke-dongdi-empty.html",
);
const WANKE_BLOCKED_FIXTURE_PATH = resolve(
  DEFAULT_FIXTURE_ROOT,
  "anjuke/sale-search/wanke-dongdi-blocked.html",
);

const expectedActiveCommunities = {
  "mingquan-huayuan": {
    referenceUnitPrice: 23007,
    listingCount: 90,
    recentDealHints: [
      "西青热搜小区榜第60名",
      "关注量超过同城98%的楼盘",
      "二手房历史成交(177)",
    ],
    firstListing: {
      title: "富力津门湖鸣泉花园 2室1厅!可议价!",
      roomCount: 2,
      areaSqm: 88.42,
      totalPriceWan: 199,
      unitPriceYuanPerSqm: 22506,
    },
    pricePoints: [{ label: "3月", priceYuanPerSqm: 23006 }],
    districtName: "西青",
    districtPremiumPct: 7.72,
    momChangePct: 0.99,
    yoyChangePct: -10.72,
  },
  "boxi-huayuan": {
    referenceUnitPrice: 25302,
    listingCount: 58,
    recentDealHints: [
      "西青热搜小区榜第37名",
      "关注量超过同城98%的楼盘",
      "二手房历史成交(122)",
    ],
    firstListing: {
      title: "采光棒能观湖新装修3个月拎包入住给孩子换房出售",
      roomCount: 3,
      areaSqm: 160.08,
      totalPriceWan: 418,
      unitPriceYuanPerSqm: 26112,
    },
    pricePoints: [{ label: "3月", priceYuanPerSqm: 25301 }],
    districtName: "西青",
    districtPremiumPct: 5.91,
    momChangePct: 1.05,
    yoyChangePct: -7.32,
  },
} as const;

const temporaryRoots: string[] = [];

function makeFixtureRoot(): string {
  const tempBase = mkdtempSync(resolve(tmpdir(), "collect-fixtures-"));
  const fixtureRoot = resolve(tempBase, "fixtures");
  cpSync(DEFAULT_FIXTURE_ROOT, fixtureRoot, { recursive: true });
  temporaryRoots.push(tempBase);
  return fixtureRoot;
}

function makeRunsDir(): string {
  const tempBase = mkdtempSync(resolve(tmpdir(), "collect-runs-"));
  const runsDir = resolve(tempBase, "runs");
  mkdirSync(runsDir, { recursive: true });
  temporaryRoots.push(tempBase);
  return runsDir;
}

function runCollect(...args: string[]): void {
  execFileSync(TSX_PATH, ["scripts/collect.ts", ...args], {
    cwd: resolve("."),
    stdio: "pipe",
  });
}

function readJsonFile<T>(filePath: string): T {
  return JSON.parse(readFileSync(filePath, "utf8")) as T;
}

function readLatestRun(runsDir: string): unknown {
  return readJsonFile(resolve(runsDir, "latest.json"));
}

function listArchivedRuns(runsDir: string): string[] {
  return readdirSync(runsDir)
    .filter((entry) => entry.endsWith(".json") && entry !== "latest.json")
    .sort();
}

function listRunFiles(runsDir: string): string[] {
  return readdirSync(runsDir).sort();
}

function overwriteWankeFixture(fixtureRoot: string, html: string): void {
  writeFileSync(
    resolve(fixtureRoot, "anjuke/sale-search/wanke-dongdi.html"),
    html,
    "utf8",
  );
}

function snapshotRunFiles(runsDir: string): Record<string, string> {
  return Object.fromEntries(
    listRunFiles(runsDir).map((entry) => [
      entry,
      readFileSync(resolve(runsDir, entry), "utf8"),
    ]),
  );
}

describe("scripts/collect.ts", () => {
  const expectedWankeListingTeasers = [
    {
      title: "万科东第 南北通透两居",
      roomCount: 2,
      areaSqm: 89.3,
      totalPriceWan: 155,
      unitPriceYuanPerSqm: 17357,
    },
    {
      title: "万科·东第 精装三室",
      roomCount: 3,
      areaSqm: 127.1,
      totalPriceWan: 238,
      unitPriceYuanPerSqm: 18726,
    },
    {
      title: "万科 东第 高楼层采光好",
      roomCount: 2,
      areaSqm: 88,
      totalPriceWan: 162,
      unitPriceYuanPerSqm: 18410,
    },
  ] as const;

  afterEach(() => {
    while (temporaryRoots.length > 0) {
      rmSync(temporaryRoots.pop()!, { force: true, recursive: true });
    }
  });

  it("dispatches Wanke to the Anjuke provider while keeping pending-verification communities skipped", () => {
    const fixtureRoot = makeFixtureRoot();
    const runsDir = makeRunsDir();
    const repoRunsBefore = snapshotRunFiles(REPO_RUNS_DIR);

    runCollect("--fixture", fixtureRoot, "--runs-dir", runsDir);

    expect(snapshotRunFiles(REPO_RUNS_DIR)).toEqual(repoRunsBefore);
    expect(listRunFiles(runsDir)).toContain("latest.json");

    const latestRun = readLatestRun(runsDir) as {
      generatedAt: string;
      sources: Record<string, unknown>;
      communities: Record<
        string,
        {
          fangCommunity: {
            status: string;
            referenceUnitPrice?: number;
            listingCount?: number;
            recentDealHints?: string[];
            currentListingTeasers?: Array<{
              title: string | null;
              roomCount: number | null;
              areaSqm: number | null;
              totalPriceWan: number | null;
              unitPriceYuanPerSqm: number | null;
            }>;
          };
          fangWeekreport: {
            status: string;
            pricePoints?: Array<{ label: string; priceYuanPerSqm: number | null }>;
            listingCount?: number | null;
            districtName?: string | null;
            districtPremiumPct?: number | null;
            momChangePct?: number | null;
            yoyChangePct?: number | null;
            availableRangeLabels?: string[];
          };
        }
      >;
    };

    expect(Number.isNaN(Date.parse(latestRun.generatedAt))).toBe(false);
    expect(latestRun.sources).toEqual({
      "stats-gov": {
        status: "success",
        latestMonth: "2026-02",
        city: "天津",
        secondaryHomePriceIndexMom: 99.5,
        secondaryHomePriceIndexYoy: 94,
      },
    });

    const communities = loadCommunities();

    expect(Object.keys(latestRun.communities).sort()).toEqual(
      communities.map((community) => community.id).sort(),
    );

    for (const community of communities) {
      if (
        community.status === "pending_verification" ||
        community.sourceProvider === "none"
      ) {
        expect(latestRun.communities[community.id]).toEqual({
          fangCommunity: {
            status: "skipped",
          },
          fangWeekreport: {
            status: "skipped",
          },
        });
        continue;
      }

      if (community.sourceProvider === "anjuke_sale_search") {
        expect(latestRun.communities[community.id]).toEqual({
          fangCommunity: {
            status: "success",
            referenceUnitPrice: 18_410,
            listingCount: 3,
            currentListingTeasers: expectedWankeListingTeasers,
          },
          fangWeekreport: {
            status: "skipped",
          },
        });
        continue;
      }

      const expected = expectedActiveCommunities[
        community.id as keyof typeof expectedActiveCommunities
      ];

      expect(expected).toBeDefined();
      expect(latestRun.communities[community.id]).toEqual({
        fangCommunity: {
          status: "success",
          referenceUnitPrice: expected.referenceUnitPrice,
          listingCount: expected.listingCount,
          recentDealHints: expected.recentDealHints,
          currentListingTeasers: expect.arrayContaining([
            expect.objectContaining(expected.firstListing),
          ]),
        },
        fangWeekreport: {
          status: "success",
          pricePoints: expected.pricePoints,
          listingCount: null,
          districtName: expected.districtName,
          districtPremiumPct: expected.districtPremiumPct,
          momChangePct: expected.momChangePct,
          yoyChangePct: expected.yoyChangePct,
          availableRangeLabels: ["近6月", "近1年", "近3年"],
        },
      });
    }

    const archivedRuns = listArchivedRuns(runsDir);

    expect(archivedRuns).toHaveLength(1);
    expect(readJsonFile(resolve(runsDir, archivedRuns[0]))).toEqual(latestRun);
  }, 15_000);

  it("preserves the last successful normalized values when an active Fang source fails", () => {
    const fixtureRoot = makeFixtureRoot();
    const runsDir = makeRunsDir();
    const repoRunsBefore = snapshotRunFiles(REPO_RUNS_DIR);

    runCollect("--fixture", fixtureRoot, "--runs-dir", runsDir);

    writeFileSync(
      resolve(fixtureRoot, "fang/community/mingquan-huayuan.html"),
      "<html><body>blocked</body></html>",
      "utf8",
    );

    runCollect("--fixture", fixtureRoot, "--runs-dir", runsDir);

    expect(snapshotRunFiles(REPO_RUNS_DIR)).toEqual(repoRunsBefore);

    const latestRun = readLatestRun(runsDir) as {
      communities: Record<
        string,
        {
          fangCommunity: {
            status: string;
            referenceUnitPrice?: number;
            listingCount?: number;
            recentDealHints?: string[];
            currentListingTeasers?: Array<{
              title: string | null;
              roomCount: number | null;
              areaSqm: number | null;
              totalPriceWan: number | null;
              unitPriceYuanPerSqm: number | null;
            }>;
          };
          fangWeekreport: {
            status: string;
            pricePoints?: Array<{ label: string; priceYuanPerSqm: number | null }>;
            listingCount?: number | null;
            districtName?: string | null;
            districtPremiumPct?: number | null;
            momChangePct?: number | null;
            yoyChangePct?: number | null;
            availableRangeLabels?: string[];
          };
        }
      >;
    };

    expect(listArchivedRuns(runsDir)).toHaveLength(2);
    expect(latestRun.communities["mingquan-huayuan"]).toEqual({
      fangCommunity: {
        status: "failed",
        referenceUnitPrice: 23007,
        listingCount: 90,
        recentDealHints: [
          "西青热搜小区榜第60名",
          "关注量超过同城98%的楼盘",
          "二手房历史成交(177)",
        ],
        currentListingTeasers: expect.arrayContaining([
          expect.objectContaining({
            title: "富力津门湖鸣泉花园 2室1厅!可议价!",
            roomCount: 2,
            areaSqm: 88.42,
            totalPriceWan: 199,
            unitPriceYuanPerSqm: 22506,
          }),
        ]),
      },
      fangWeekreport: {
        status: "success",
        pricePoints: [{ label: "3月", priceYuanPerSqm: 23006 }],
        listingCount: null,
        districtName: "西青",
        districtPremiumPct: 7.72,
        momChangePct: 0.99,
        yoyChangePct: -10.72,
        availableRangeLabels: ["近6月", "近1年", "近3年"],
      },
    });
    expect(latestRun.communities["lianhai-yuan"]).toEqual({
      fangCommunity: {
        status: "skipped",
      },
      fangWeekreport: {
        status: "skipped",
      },
    });
    expect(latestRun.communities["wanke-dongdi"]).toEqual({
      fangCommunity: {
        status: "success",
        referenceUnitPrice: 18_410,
        listingCount: 3,
        currentListingTeasers: expectedWankeListingTeasers,
      },
      fangWeekreport: {
        status: "skipped",
      },
    });
  }, 15_000);

  it("clears stale Wanke teaser-derived fields after a failed rerun in the same runs directory", () => {
    const fixtureRoot = makeFixtureRoot();
    const runsDir = makeRunsDir();

    runCollect("--fixture", fixtureRoot, "--runs-dir", runsDir);
    overwriteWankeFixture(
      fixtureRoot,
      readFileSync(WANKE_BLOCKED_FIXTURE_PATH, "utf8"),
    );

    runCollect("--fixture", fixtureRoot, "--runs-dir", runsDir);

    const latestRun = readLatestRun(runsDir) as {
      communities: Record<
        string,
        {
          fangCommunity: {
            status: string;
            referenceUnitPrice?: number | null;
            listingCount?: number | null;
            currentListingTeasers?: Array<{
              title: string | null;
              roomCount: number | null;
              areaSqm: number | null;
              totalPriceWan: number | null;
              unitPriceYuanPerSqm: number | null;
            }>;
          };
          fangWeekreport: {
            status: string;
          };
        }
      >;
    };

    expect(latestRun.communities["wanke-dongdi"]).toEqual({
      fangCommunity: {
        status: "failed",
        referenceUnitPrice: null,
        listingCount: null,
        currentListingTeasers: [],
      },
      fangWeekreport: {
        status: "skipped",
      },
    });
  }, 15_000);

  it.each([
    [
      "empty-result fixture",
      readFileSync(WANKE_EMPTY_FIXTURE_PATH, "utf8"),
    ],
    [
      "blocked fixture",
      readFileSync(WANKE_BLOCKED_FIXTURE_PATH, "utf8"),
    ],
    [
      "results page with zero surviving valid listings",
      readFileSync(WANKE_FIXTURE_PATH, "utf8")
        .replaceAll("万科东第 南北通透两居", "万科 精装两居 急售")
        .replaceAll("万科·东第 精装三室", "万科 花园 精装三室")
        .replaceAll("万科 东第 高楼层采光好", "东第附近 高楼层采光好"),
    ],
  ])(
    "marks Wanke collection as failed for %s",
    (_scenario, html) => {
      const fixtureRoot = makeFixtureRoot();
      const runsDir = makeRunsDir();

      overwriteWankeFixture(fixtureRoot, html);
      runCollect("--fixture", fixtureRoot, "--runs-dir", runsDir);

      const latestRun = readLatestRun(runsDir) as {
        communities: Record<
          string,
          {
            fangCommunity: {
              status: string;
            };
            fangWeekreport: {
              status: string;
            };
          }
        >;
      };

      expect(latestRun.communities["wanke-dongdi"]).toEqual({
        fangCommunity: {
          status: "failed",
          referenceUnitPrice: null,
          listingCount: null,
          currentListingTeasers: [],
        },
        fangWeekreport: {
          status: "skipped",
        },
      });
    },
    15_000,
  );
});
