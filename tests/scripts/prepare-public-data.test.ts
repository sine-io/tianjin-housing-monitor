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

function makeTempRoot(prefix: string): string {
  const tempRoot = mkdtempSync(resolve(tmpdir(), prefix));
  temporaryRoots.push(tempRoot);
  return tempRoot;
}

describe("scripts/prepare-public-data.ts", () => {
  afterEach(() => {
    while (temporaryRoots.length > 0) {
      rmSync(temporaryRoots.pop()!, { recursive: true, force: true });
    }
  });

  it("copies config, series, and reports into an override public data dir without creating a latest-report mirror", () => {
    const rootDir = makeTempRoot("prepare-public-data-");
    const dataDir = resolve(rootDir, "data");
    const publicDataDir = resolve(rootDir, "custom-public", "data");

    mkdirSync(resolve(dataDir, "config"), { recursive: true });
    mkdirSync(resolve(dataDir, "series", "city-market"), { recursive: true });
    mkdirSync(resolve(dataDir, "reports"), { recursive: true });

    writeFileSync(
      resolve(dataDir, "config", "communities.json"),
      JSON.stringify([{ id: "x" }], null, 2),
    );
    writeFileSync(
      resolve(dataDir, "config", "segments.json"),
      JSON.stringify([{ id: "y" }], null, 2),
    );
    writeFileSync(
      resolve(dataDir, "series", "city-market", "tianjin.json"),
      JSON.stringify({ city: "天津" }, null, 2),
    );
    writeFileSync(
      resolve(dataDir, "reports", "2026-03-31.json"),
      JSON.stringify({ weekEnding: "2026-03-31" }, null, 2),
    );

    execFileSync(
      TSX_PATH,
      [
        "scripts/prepare-public-data.ts",
        "--data-dir",
        dataDir,
        "--public-data-dir",
        publicDataDir,
      ],
      {
        cwd: resolve("."),
        stdio: "pipe",
      },
    );

    expect(
      readFileSync(resolve(publicDataDir, "config", "communities.json"), "utf8"),
    ).toBe(JSON.stringify([{ id: "x" }], null, 2));
    expect(
      readFileSync(resolve(publicDataDir, "config", "segments.json"), "utf8"),
    ).toBe(JSON.stringify([{ id: "y" }], null, 2));
    expect(
      readFileSync(
        resolve(publicDataDir, "series", "city-market", "tianjin.json"),
        "utf8",
      ),
    ).toBe(JSON.stringify({ city: "天津" }, null, 2));
    expect(
      readFileSync(resolve(publicDataDir, "reports", "2026-03-31.json"), "utf8"),
    ).toBe(JSON.stringify({ weekEnding: "2026-03-31" }, null, 2));
    expect(
      existsSync(resolve(publicDataDir, "config", "communities.json")),
    ).toBe(true);
    expect(
      existsSync(resolve(publicDataDir, "series", "city-market", "tianjin.json")),
    ).toBe(true);
    expect(existsSync(resolve(publicDataDir, "latest-report.json"))).toBe(false);
  });
});
