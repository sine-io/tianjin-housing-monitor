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

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { loadCommunities } from "../../lib/config";

const REPO_RUNS_DIR = resolve("data/runs");
const DEFAULT_FIXTURE_ROOT = resolve("tests/fixtures");
const TSX_PATH = resolve("node_modules/.bin/tsx");

const expectedCommunities = {
  "mingquan-huayuan": {
    referenceUnitPrice: 23007,
    weeklyPoints: [{ label: "3月", priceYuanPerSqm: 23006 }],
  },
  "jiajun-huayuan": {
    referenceUnitPrice: 22234,
    weeklyPoints: [{ label: "3月", priceYuanPerSqm: 22233 }],
  },
  "yunshu-huayuan": {
    referenceUnitPrice: 23403,
    weeklyPoints: [{ label: "3月", priceYuanPerSqm: 23402 }],
  },
  "boxi-huayuan": {
    referenceUnitPrice: 25302,
    weeklyPoints: [{ label: "3月", priceYuanPerSqm: 25301 }],
  },
  "haiyi-changzhou-hanboyuan": {
    referenceUnitPrice: 28064,
    weeklyPoints: [{ label: "3月", priceYuanPerSqm: 28064 }],
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

describe("scripts/collect.ts", () => {
  afterEach(() => {
    while (temporaryRoots.length > 0) {
      rmSync(temporaryRoots.pop()!, { force: true, recursive: true });
    }
  });

  it("writes normalized latest and archived run artifacts for all configured sources", () => {
    const fixtureRoot = makeFixtureRoot();
    const runsDir = makeRunsDir();

    runCollect("--fixture", fixtureRoot, "--runs-dir", runsDir);

    expect(listRunFiles(REPO_RUNS_DIR)).toEqual([".gitkeep"]);
    expect(listRunFiles(runsDir)).toContain("latest.json");

    const latestRun = readLatestRun(runsDir) as {
      generatedAt: string;
      sources: Record<string, unknown>;
      communities: Record<string, unknown>;
    };

    expect(Number.isNaN(Date.parse(latestRun.generatedAt))).toBe(false);
    expect(latestRun.sources).toEqual({
      "stats-gov": {
        status: "success",
        latestMonth: "2026-02",
        city: "天津",
      },
    });

    expect(Object.keys(latestRun.communities).sort()).toEqual(
      loadCommunities()
        .map((community) => community.id)
        .sort(),
    );

    for (const [communityId, expected] of Object.entries(expectedCommunities)) {
      expect(latestRun.communities[communityId]).toEqual({
        fangCommunity: {
          status: "success",
          referenceUnitPrice: expected.referenceUnitPrice,
        },
        fangWeekreport: {
          status: "success",
          weeklyPoints: expected.weeklyPoints,
        },
      });
    }

    const archivedRuns = listArchivedRuns(runsDir);

    expect(archivedRuns).toHaveLength(1);
    expect(readJsonFile(resolve(runsDir, archivedRuns[0]))).toEqual(latestRun);
  }, 15_000);

  it("preserves the last successful normalized values in latest.json when a source fails", () => {
    const fixtureRoot = makeFixtureRoot();
    const runsDir = makeRunsDir();

    runCollect("--fixture", fixtureRoot, "--runs-dir", runsDir);

    writeFileSync(
      resolve(fixtureRoot, "fang/community/mingquan-huayuan.html"),
      "<html><body>blocked</body></html>",
      "utf8",
    );

    runCollect("--fixture", fixtureRoot, "--runs-dir", runsDir);

    expect(listRunFiles(REPO_RUNS_DIR)).toEqual([".gitkeep"]);

    const latestRun = readLatestRun(runsDir) as {
      communities: Record<
        string,
        {
          fangCommunity: {
            status: string;
            referenceUnitPrice?: number;
          };
          fangWeekreport: {
            status: string;
            weeklyPoints?: Array<{ label: string; priceYuanPerSqm: number | null }>;
          };
        }
      >;
    };

    expect(listArchivedRuns(runsDir)).toHaveLength(2);
    expect(latestRun.communities["mingquan-huayuan"]).toEqual({
      fangCommunity: {
        status: "failed",
        referenceUnitPrice: 23007,
      },
      fangWeekreport: {
        status: "success",
        weeklyPoints: [{ label: "3月", priceYuanPerSqm: 23006 }],
      },
    });
  }, 15_000);
});
