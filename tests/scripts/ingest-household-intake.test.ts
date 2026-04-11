import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { resolve } from "node:path";
import { tmpdir } from "node:os";

import { afterEach, describe, expect, it } from "vitest";

const TSX_PATH = resolve("node_modules/.bin/tsx");

const temporaryRoots: string[] = [];

function makeTempPrivateRoot(): string {
  const tempRoot = mkdtempSync(resolve(tmpdir(), "ingest-household-intake-"));
  temporaryRoots.push(tempRoot);
  return resolve(tempRoot, "private-root");
}

function makeInputPath(
  privateRoot: string,
  payload: Record<string, unknown>,
): string {
  mkdirSync(privateRoot, { recursive: true });
  const inputPath = resolve(privateRoot, "intake.json");
  writeFileSync(inputPath, JSON.stringify(payload, null, 2));
  return inputPath;
}

describe("scripts/ingest-household-intake.ts", () => {
  afterEach(() => {
    while (temporaryRoots.length > 0) {
      rmSync(temporaryRoots.pop()!, { recursive: true, force: true });
    }
  });

  it("writes one normalized raw-intake artifact for a valid private household payload", () => {
    const privateRoot = makeTempPrivateRoot();
    const inputPath = makeInputPath(privateRoot, {
      schemaVersion: 1,
      householdId: "qinhe-to-meijiang",
      submittedAt: "2026-04-11T12:00:00.000Z",
      currentHome: {
        anchorPriceWan: 210,
        anchorUpdatedAt: "2026-04-10T12:00:00.000Z",
      },
      targetBasket: [{ communityId: "mingquan-huayuan" }],
      decisionWindowMonths: 6,
    });

    execFileSync(
      TSX_PATH,
      [
        "scripts/ingest-household-intake.ts",
        "--input-path",
        inputPath,
        "--private-root",
        privateRoot,
      ],
      { cwd: resolve("."), stdio: "pipe" },
    );

    const outputPath = resolve(
      privateRoot,
      "raw-intake",
      "qinhe-to-meijiang-2026-04-11T12-00-00.000Z.json",
    );
    expect(existsSync(outputPath)).toBe(true);
    expect(JSON.parse(readFileSync(outputPath, "utf8"))).toEqual({
      schemaVersion: 1,
      householdId: "qinhe-to-meijiang",
      submittedAt: "2026-04-11T12:00:00.000Z",
      normalizedConfig: {
        schemaVersion: 1,
        householdId: "qinhe-to-meijiang",
        configVersion: "2026-04-11T12:00:00.000Z",
        updatedAt: "2026-04-11T12:00:00.000Z",
        currentHome: {
          anchorPriceWan: 210,
          anchorUpdatedAt: "2026-04-10T12:00:00.000Z",
        },
        targetBasket: [{ communityId: "mingquan-huayuan" }],
        decisionWindowMonths: 6,
      },
    });
  }, 15_000);

  it("does not overwrite an active confirmed household config when a new intake arrives", () => {
    const privateRoot = makeTempPrivateRoot();
    const currentDir = resolve(privateRoot, "households", "current");
    const currentConfigPath = resolve(currentDir, "qinhe-to-meijiang.json");
    mkdirSync(currentDir, { recursive: true });
    writeFileSync(
      currentConfigPath,
      JSON.stringify({ stable: true }, null, 2),
    );

    const inputPath = makeInputPath(privateRoot, {
      schemaVersion: 1,
      householdId: "qinhe-to-meijiang",
      submittedAt: "2026-04-11T13:00:00.000Z",
      currentHome: {
        anchorPriceWan: 215,
        anchorUpdatedAt: "2026-04-11T10:00:00.000Z",
      },
      targetBasket: [{ communityId: "boxi-huayuan" }],
      decisionWindowMonths: 3,
    });

    execFileSync(
      TSX_PATH,
      [
        "scripts/ingest-household-intake.ts",
        "--input-path",
        inputPath,
        "--private-root",
        privateRoot,
      ],
      { cwd: resolve("."), stdio: "pipe" },
    );

    expect(JSON.parse(readFileSync(currentConfigPath, "utf8"))).toEqual({
      stable: true,
    });
  }, 15_000);

  it("rejects malformed payloads without writing an output artifact", () => {
    const privateRoot = makeTempPrivateRoot();
    const inputPath = makeInputPath(privateRoot, {
      schemaVersion: 1,
      householdId: "qinhe-to-meijiang",
      submittedAt: "2026-04-11T12:00:00.000Z",
      currentHome: {
        anchorPriceWan: 5,
        anchorUpdatedAt: "2026-04-10T12:00:00.000Z",
      },
      targetBasket: [],
      decisionWindowMonths: 5,
    });

    expect(() =>
      execFileSync(
        TSX_PATH,
        [
          "scripts/ingest-household-intake.ts",
          "--input-path",
          inputPath,
          "--private-root",
          privateRoot,
        ],
        { cwd: resolve("."), stdio: "pipe" },
      ),
    ).toThrow();

    expect(existsSync(resolve(privateRoot, "raw-intake"))).toBe(false);
  }, 15_000);

  it("keeps private intake artifacts outside public data roots", () => {
    const privateRoot = makeTempPrivateRoot();
    const inputPath = makeInputPath(privateRoot, {
      schemaVersion: 1,
      householdId: "qinhe-to-meijiang",
      submittedAt: "2026-04-11T12:00:00.000Z",
      currentHome: {
        anchorPriceWan: 210,
        anchorUpdatedAt: "2026-04-10T12:00:00.000Z",
      },
      targetBasket: [{ communityId: "mingquan-huayuan" }],
      decisionWindowMonths: 12,
    });

    execFileSync(
      TSX_PATH,
      [
        "scripts/ingest-household-intake.ts",
        "--input-path",
        inputPath,
        "--private-root",
        privateRoot,
      ],
      { cwd: resolve("."), stdio: "pipe" },
    );

    expect(
      existsSync(resolve("data", "raw-intake", "qinhe-to-meijiang.json")),
    ).toBe(false);
    expect(
      existsSync(resolve("site", "public", "data", "raw-intake", "qinhe-to-meijiang.json")),
    ).toBe(false);
  }, 15_000);
});
