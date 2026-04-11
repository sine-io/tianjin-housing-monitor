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

const TSX_PATH = resolve("node_modules/.bin/tsx");
const temporaryRoots: string[] = [];

function makeTempWorkspace(): { dataDir: string; privateRoot: string } {
  const tempRoot = mkdtempSync(resolve(tmpdir(), "build-household-recommendations-"));
  const dataDir = resolve(tempRoot, "data");
  const privateRoot = resolve(tempRoot, "private-root");

  mkdirSync(dataDir, { recursive: true });
  mkdirSync(privateRoot, { recursive: true });
  cpSync(resolve("data/config"), resolve(dataDir, "config"), { recursive: true });
  mkdirSync(resolve(dataDir, "series", "city-market"), { recursive: true });
  mkdirSync(resolve(dataDir, "reports"), { recursive: true });
  mkdirSync(resolve(privateRoot, "households", "current"), { recursive: true });

  temporaryRoots.push(tempRoot);
  return { dataDir, privateRoot };
}

function writeLatestMarketSnapshot(dataDir: string, generatedAt: string): void {
  writeFileSync(
    resolve(dataDir, "series", "city-market", "tianjin.json"),
    JSON.stringify(
      {
        city: "天津",
        series: [
          {
            date: "2026-04-11",
            generatedAt,
            sourceMonth: "2026-03",
            secondaryHomePriceIndexMom: 99.6,
            secondaryHomePriceIndexYoy: 95.2,
            verdict: "偏弱",
          },
        ],
      },
      null,
      2,
    ),
  );

  writeFileSync(
    resolve(dataDir, "reports", "2026-04-11.json"),
    JSON.stringify(
      {
        generatedAt,
        weekEnding: "2026-04-11",
        cityMarket: {
          date: "2026-04-11",
          generatedAt,
          sourceMonth: "2026-03",
          secondaryHomePriceIndexMom: 99.6,
          secondaryHomePriceIndexYoy: 95.2,
          verdict: "偏弱",
        },
        communities: {
          "mingquan-huayuan": {
            name: "鸣泉花园",
            district: "西青",
            segments: {
              "mingquan-2br-87-90": {
                label: "2居 87-90㎡",
                verdict: "下跌",
                latest: {
                  listingUnitPriceMedian: 22980,
                  listingUnitPriceMin: 22500,
                  listingsCount: 6,
                  suspectedDealCount: 1,
                  manualDealCount: 0,
                },
              },
            },
          },
        },
      },
      null,
      2,
    ),
  );
}

function writeCurrentHouseholdConfig(
  privateRoot: string,
  configVersion: string,
  householdId = "qinhe-to-meijiang",
): void {
  writeFileSync(
    resolve(privateRoot, "households", "current", `${householdId}.json`),
    JSON.stringify(
      {
        schemaVersion: 1,
        householdId,
        configVersion,
        updatedAt: configVersion,
        currentHome: {
          anchorPriceWan: 210,
          anchorUpdatedAt: "2026-04-10T12:00:00.000Z",
        },
        targetBasket: [{ communityId: "mingquan-huayuan" }],
        decisionWindowMonths: 6,
      },
      null,
      2,
    ),
  );
}

describe("scripts/build-household-recommendations.ts", () => {
  afterEach(() => {
    while (temporaryRoots.length > 0) {
      rmSync(temporaryRoots.pop()!, { recursive: true, force: true });
    }
  });

  it("writes one versioned recommendation artifact for each confirmed household", () => {
    const { dataDir, privateRoot } = makeTempWorkspace();
    writeLatestMarketSnapshot(dataDir, "2026-04-11T12:00:00.000Z");
    writeCurrentHouseholdConfig(privateRoot, "2026-04-11T12:00:00.000Z");

    execFileSync(
      TSX_PATH,
      [
        "scripts/build-household-recommendations.ts",
        "--data-dir",
        dataDir,
        "--private-root",
        privateRoot,
      ],
      { cwd: resolve("."), stdio: "pipe" },
    );

    const recommendationDir = resolve(
      privateRoot,
      "recommendations",
      "qinhe-to-meijiang",
    );
    const files = readdirSync(recommendationDir).sort();

    expect(files).toEqual([
      "2026-04-11T12-00-00.000Z--2026-04-11T12-00-00.000Z.json",
    ]);

    const result = JSON.parse(readFileSync(resolve(recommendationDir, files[0]), "utf8"));
    expect(result).toMatchObject({
      schemaVersion: 1,
      householdId: "qinhe-to-meijiang",
      configVersion: "2026-04-11T12:00:00.000Z",
      sourceSnapshotId: "2026-04-11T12-00-00.000Z",
      blocking: {
        isBlocked: false,
        reasonCode: null,
      },
      action: "can_view",
    });
    expect(result.explanation.strongestSupport[0]?.summary).toContain("看房");
    expect(result.basketRanking[0]).toMatchObject({
      communityId: "mingquan-huayuan",
      displayName: "鸣泉花园",
    });
    expect(result.trace.notes).toContain("top-target:mingquan-huayuan");
  }, 15_000);

  it("preserves prior recommendation versions when configVersion changes", () => {
    const { dataDir, privateRoot } = makeTempWorkspace();
    writeLatestMarketSnapshot(dataDir, "2026-04-11T12:00:00.000Z");
    writeCurrentHouseholdConfig(privateRoot, "2026-04-11T12:00:00.000Z");

    execFileSync(
      TSX_PATH,
      [
        "scripts/build-household-recommendations.ts",
        "--data-dir",
        dataDir,
        "--private-root",
        privateRoot,
      ],
      { cwd: resolve("."), stdio: "pipe" },
    );

    writeCurrentHouseholdConfig(privateRoot, "2026-04-12T12:00:00.000Z");

    execFileSync(
      TSX_PATH,
      [
        "scripts/build-household-recommendations.ts",
        "--data-dir",
        dataDir,
        "--private-root",
        privateRoot,
      ],
      { cwd: resolve("."), stdio: "pipe" },
    );

    expect(
      readdirSync(resolve(privateRoot, "recommendations", "qinhe-to-meijiang")).sort(),
    ).toEqual([
      "2026-04-11T12-00-00.000Z--2026-04-11T12-00-00.000Z.json",
      "2026-04-12T12-00-00.000Z--2026-04-11T12-00-00.000Z.json",
    ]);
  }, 15_000);

  it("preserves prior recommendation versions when source snapshots change", () => {
    const { dataDir, privateRoot } = makeTempWorkspace();
    writeCurrentHouseholdConfig(privateRoot, "2026-04-11T12:00:00.000Z");
    writeLatestMarketSnapshot(dataDir, "2026-04-11T12:00:00.000Z");

    execFileSync(
      TSX_PATH,
      [
        "scripts/build-household-recommendations.ts",
        "--data-dir",
        dataDir,
        "--private-root",
        privateRoot,
      ],
      { cwd: resolve("."), stdio: "pipe" },
    );

    writeLatestMarketSnapshot(dataDir, "2026-04-12T12:00:00.000Z");

    execFileSync(
      TSX_PATH,
      [
        "scripts/build-household-recommendations.ts",
        "--data-dir",
        dataDir,
        "--private-root",
        privateRoot,
      ],
      { cwd: resolve("."), stdio: "pipe" },
    );

    expect(
      readdirSync(resolve(privateRoot, "recommendations", "qinhe-to-meijiang")).sort(),
    ).toEqual([
      "2026-04-11T12-00-00.000Z--2026-04-11T12-00-00.000Z.json",
      "2026-04-11T12-00-00.000Z--2026-04-12T12-00-00.000Z.json",
    ]);
  }, 15_000);

  it("fails closed when the private root points inside public data paths", () => {
    const { dataDir } = makeTempWorkspace();
    const unsafePrivateRoot = resolve(dataDir, "private-root");
    mkdirSync(resolve(unsafePrivateRoot, "households", "current"), { recursive: true });
    writeCurrentHouseholdConfig(unsafePrivateRoot, "2026-04-11T12:00:00.000Z");
    writeLatestMarketSnapshot(dataDir, "2026-04-11T12:00:00.000Z");

    expect(() =>
      execFileSync(
        TSX_PATH,
        [
          "scripts/build-household-recommendations.ts",
          "--data-dir",
          dataDir,
          "--private-root",
          unsafePrivateRoot,
        ],
        { cwd: resolve("."), stdio: "pipe" },
      ),
    ).toThrow();
  }, 15_000);

  it("treats manual samples as strong signal when listing count alone is thin", () => {
    const { dataDir, privateRoot } = makeTempWorkspace();
    writeCurrentHouseholdConfig(privateRoot, "2026-04-11T12:00:00.000Z");
    writeFileSync(
      resolve(dataDir, "series", "city-market", "tianjin.json"),
      JSON.stringify(
        {
          city: "天津",
          series: [
            {
              date: "2026-04-11",
              generatedAt: "2026-04-11T12:00:00.000Z",
              sourceMonth: "2026-03",
              secondaryHomePriceIndexMom: 99.8,
              secondaryHomePriceIndexYoy: 95.2,
              verdict: "偏弱",
            },
          ],
        },
        null,
        2,
      ),
    );
    writeFileSync(
      resolve(dataDir, "reports", "2026-04-11.json"),
      JSON.stringify(
        {
          generatedAt: "2026-04-11T12:00:00.000Z",
          weekEnding: "2026-04-11",
          cityMarket: {
            date: "2026-04-11",
            generatedAt: "2026-04-11T12:00:00.000Z",
            sourceMonth: "2026-03",
            secondaryHomePriceIndexMom: 99.8,
            secondaryHomePriceIndexYoy: 95.2,
            verdict: "偏弱",
          },
          communities: {
            "mingquan-huayuan": {
              name: "鸣泉花园",
              district: "西青",
              segments: {
                "mingquan-2br-87-90": {
                  label: "2居 87-90㎡",
                  verdict: "横盘",
                  latest: {
                    listingUnitPriceMedian: 22800,
                    listingUnitPriceMin: 22800,
                    listingsCount: 1,
                    suspectedDealCount: 0,
                    manualDealCount: 1,
                  },
                },
              },
            },
          },
        },
        null,
        2,
      ),
    );

    execFileSync(
      TSX_PATH,
      [
        "scripts/build-household-recommendations.ts",
        "--data-dir",
        dataDir,
        "--private-root",
        privateRoot,
      ],
      { cwd: resolve("."), stdio: "pipe" },
    );

    const recommendationFiles = readdirSync(
      resolve(privateRoot, "recommendations", "qinhe-to-meijiang"),
    );
    const result = JSON.parse(
      readFileSync(
        resolve(
          privateRoot,
          "recommendations",
          "qinhe-to-meijiang",
          recommendationFiles[0]!,
        ),
        "utf8",
      ),
    );

    expect(result.blocking.isBlocked).toBe(false);
    expect(result.action).toBe("can_view");
  }, 15_000);
});
