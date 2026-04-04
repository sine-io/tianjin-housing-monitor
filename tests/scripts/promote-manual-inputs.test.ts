import { spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { resolve } from "node:path";
import { tmpdir } from "node:os";

import { afterEach, describe, expect, it } from "vitest";

const REPO_MANUAL_DIR = resolve("data/manual");
const TSX_PATH = resolve("node_modules/.bin/tsx");

const temporaryRoots: string[] = [];

function makeTempDataDir(): string {
  const tempRoot = mkdtempSync(resolve(tmpdir(), "promote-manual-"));
  const dataDir = resolve(tempRoot, "data");

  mkdirSync(resolve(dataDir, "manual", "incoming"), { recursive: true });
  mkdirSync(resolve(dataDir, "manual", "accepted"), { recursive: true });
  cpSync(resolve("data/config"), resolve(dataDir, "config"), { recursive: true });

  temporaryRoots.push(tempRoot);
  return dataDir;
}

function snapshotTree(root: string): Record<string, string> | null {
  if (!existsSync(root)) {
    return null;
  }

  const entries = new Map<string, string>();

  function walk(currentPath: string, relativePath: string): void {
    const stats = statSync(currentPath);

    if (stats.isDirectory()) {
      for (const entry of ["accepted", "incoming"]) {
        const nextPath = resolve(currentPath, entry);
        if (existsSync(nextPath)) {
          walk(nextPath, resolve(relativePath, entry));
        }
      }
      return;
    }

    entries.set(relativePath, readFileSync(currentPath, "utf8"));
  }

  walk(root, ".");
  return Object.fromEntries(entries);
}

describe("scripts/promote-manual-inputs.ts", () => {
  afterEach(() => {
    while (temporaryRoots.length > 0) {
      rmSync(temporaryRoots.pop()!, { recursive: true, force: true });
    }
  });

  it("moves valid incoming files into accepted and leaves mismatched pairs in place with a logged error", () => {
    const dataDir = makeTempDataDir();
    const repoManualBefore = snapshotTree(REPO_MANUAL_DIR);

    writeFileSync(
      resolve(dataDir, "manual", "incoming", "valid.json"),
      JSON.stringify(
        {
          source: "fixture-test",
          submittedAt: "2026-03-31T09:00:00.000Z",
          samples: [
            {
              communityId: "mingquan-huayuan",
              segmentId: "mingquan-2br-87-90",
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

    writeFileSync(
      resolve(dataDir, "manual", "incoming", "invalid.json"),
      JSON.stringify(
        {
          source: "fixture-test",
          submittedAt: "2026-03-31T09:00:00.000Z",
          samples: [
            {
              communityId: "mingquan-huayuan",
              segmentId: "boxi-2br-100-120",
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

    const result = spawnSync(
      TSX_PATH,
      ["scripts/promote-manual-inputs.ts", "--data-dir", dataDir],
      {
        cwd: resolve("."),
        encoding: "utf8",
      },
    );

    expect(result.status).toBe(0);
    expect(snapshotTree(REPO_MANUAL_DIR)).toEqual(repoManualBefore);

    expect(existsSync(resolve(dataDir, "manual", "accepted", "valid.json"))).toBe(
      true,
    );
    expect(existsSync(resolve(dataDir, "manual", "incoming", "valid.json"))).toBe(
      false,
    );
    expect(existsSync(resolve(dataDir, "manual", "incoming", "invalid.json"))).toBe(
      true,
    );
    expect(result.stderr).toContain("invalid.json");
    expect(result.stderr).toContain(
      "Segment boxi-2br-100-120 does not belong to community mingquan-huayuan",
    );
  }, 15_000);

  it("leaves files with the retired Wanke segment in incoming and logs the validation error", () => {
    const dataDir = makeTempDataDir();
    const repoManualBefore = snapshotTree(REPO_MANUAL_DIR);

    writeFileSync(
      resolve(dataDir, "manual", "incoming", "wanke-old.json"),
      JSON.stringify(
        {
          source: "fixture-test",
          submittedAt: "2026-03-31T09:00:00.000Z",
          samples: [
            {
              communityId: "wanke-dongdi",
              segmentId: "wanke-3br-100-105",
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

    const result = spawnSync(
      TSX_PATH,
      ["scripts/promote-manual-inputs.ts", "--data-dir", dataDir],
      {
        cwd: resolve("."),
        encoding: "utf8",
      },
    );

    expect(result.status).toBe(0);
    expect(snapshotTree(REPO_MANUAL_DIR)).toEqual(repoManualBefore);
    expect(
      existsSync(resolve(dataDir, "manual", "accepted", "wanke-old.json")),
    ).toBe(false);
    expect(
      existsSync(resolve(dataDir, "manual", "incoming", "wanke-old.json")),
    ).toBe(true);
    expect(result.stderr).toContain("wanke-old.json");
    expect(result.stderr).toContain("Unknown segmentId: wanke-3br-100-105");
  }, 15_000);
});
