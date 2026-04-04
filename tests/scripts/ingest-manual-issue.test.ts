import { execFileSync } from "node:child_process";
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

const ISSUE_TEMPLATE_PATH = resolve(".github/ISSUE_TEMPLATE/manual-sample.yml");
const REPO_MANUAL_DIR = resolve("data/manual");
const TSX_PATH = resolve("node_modules/.bin/tsx");

const temporaryRoots: string[] = [];

function makeTempDataDir(): string {
  const tempRoot = mkdtempSync(resolve(tmpdir(), "ingest-manual-issue-"));
  const dataDir = resolve(tempRoot, "data");

  mkdirSync(dataDir, { recursive: true });
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

function buildIssueBody({
  community,
  segment,
  sampleDate = "2026-03-30",
  dealUnitPrice = "19300",
  evidenceUrl = "https://example.com/listings/123",
}: {
  community: string;
  segment: string;
  sampleDate?: string;
  dealUnitPrice?: string;
  evidenceUrl?: string;
}): string {
  return `### Community
${community}

### Segment
${segment}

### Sample date
${sampleDate}

### Deal unit price (yuan/sqm)
${dealUnitPrice}

### Evidence URL
${evidenceUrl}
`;
}

function extractDropdownOptions(template: string, dropdownId: string): string[] {
  const lines = template.split("\n");
  const options: string[] = [];
  let inDropdown = false;
  let inOptions = false;

  for (const line of lines) {
    if (line.startsWith("  - type: dropdown")) {
      inDropdown = false;
      inOptions = false;
    }

    if (line.trim() === `id: ${dropdownId}`) {
      inDropdown = true;
      continue;
    }

    if (!inDropdown) {
      continue;
    }

    if (line.trim() === "options:") {
      inOptions = true;
      continue;
    }

    if (inOptions) {
      if (line.startsWith("        - ")) {
        options.push(line.slice("        - ".length));
        continue;
      }

      if (!line.startsWith("        ")) {
        break;
      }
    }
  }

  return options;
}

describe("scripts/ingest-manual-issue.ts", () => {
  afterEach(() => {
    while (temporaryRoots.length > 0) {
      rmSync(temporaryRoots.pop()!, { recursive: true, force: true });
    }
  });

  it("writes one validated manual input JSON file from the GitHub issue form payload", () => {
    const dataDir = makeTempDataDir();
    const repoManualBefore = snapshotTree(REPO_MANUAL_DIR);
    const eventPath = resolve(dataDir, "..", "issues-event.json");

    writeFileSync(
      eventPath,
      JSON.stringify(
        {
          issue: {
            number: 321,
            created_at: "2026-03-31T09:30:00.000Z",
            body: buildIssueBody({
              community: "鸣泉花园 (mingquan-huayuan)",
              segment: "2居 87-90㎡ (mingquan-2br-87-90)",
            }),
          },
        },
        null,
        2,
      ),
    );

    execFileSync(
      TSX_PATH,
      [
        "scripts/ingest-manual-issue.ts",
        "--data-dir",
        dataDir,
        "--event-path",
        eventPath,
      ],
      {
        cwd: resolve("."),
        stdio: "pipe",
      },
    );

    expect(snapshotTree(REPO_MANUAL_DIR)).toEqual(repoManualBefore);

    const outputPath = resolve(dataDir, "manual", "incoming", "321.json");
    expect(existsSync(outputPath)).toBe(true);
    expect(JSON.parse(readFileSync(outputPath, "utf8"))).toEqual({
      source: "https://example.com/listings/123",
      submittedAt: "2026-03-31T09:30:00.000Z",
      samples: [
        {
          communityId: "mingquan-huayuan",
          segmentId: "mingquan-2br-87-90",
          sampleAt: "2026-03-30T00:00:00.000Z",
          dealCount: 1,
          dealUnitPriceYuanPerSqm: 19_300,
        },
      ],
    });
  }, 15_000);

  it("rejects mismatched community and segment pairs without writing an output file", () => {
    const dataDir = makeTempDataDir();
    const eventPath = resolve(dataDir, "..", "issues-event.json");

    writeFileSync(
      eventPath,
      JSON.stringify(
        {
          issue: {
            number: 322,
            created_at: "2026-03-31T09:30:00.000Z",
            body: buildIssueBody({
              community: "鸣泉花园 (mingquan-huayuan)",
              segment: "2居 100-120㎡ (boxi-2br-100-120)",
            }),
          },
        },
        null,
        2,
      ),
    );

    expect(() =>
      execFileSync(
        TSX_PATH,
        [
          "scripts/ingest-manual-issue.ts",
          "--data-dir",
          dataDir,
          "--event-path",
          eventPath,
        ],
        {
          cwd: resolve("."),
          stdio: "pipe",
        },
      ),
    ).toThrow();

    expect(existsSync(resolve(dataDir, "manual", "incoming", "322.json"))).toBe(
      false,
    );
  }, 15_000);

  it("rejects the retired Wanke segment without writing an output file", () => {
    const dataDir = makeTempDataDir();
    const eventPath = resolve(dataDir, "..", "issues-event.json");

    writeFileSync(
      eventPath,
      JSON.stringify(
        {
          issue: {
            number: 323,
            created_at: "2026-03-31T09:30:00.000Z",
            body: buildIssueBody({
              community: "万科东第 (wanke-dongdi)",
              segment: "3居 100-105㎡ (wanke-3br-100-105)",
            }),
          },
        },
        null,
        2,
      ),
    );

    expect(() =>
      execFileSync(
        TSX_PATH,
        [
          "scripts/ingest-manual-issue.ts",
          "--data-dir",
          dataDir,
          "--event-path",
          eventPath,
        ],
        {
          cwd: resolve("."),
          stdio: "pipe",
        },
      ),
    ).toThrow();

    expect(existsSync(resolve(dataDir, "manual", "incoming", "323.json"))).toBe(
      false,
    );
  }, 15_000);

  it("keeps the issue form options aligned with the 5 canonical communities and segment IDs", () => {
    const template = readFileSync(ISSUE_TEMPLATE_PATH, "utf8");

    expect(extractDropdownOptions(template, "community")).toEqual([
      "鸣泉花园 (mingquan-huayuan)",
      "柏溪花园 (boxi-huayuan)",
      "恋海园 (lianhai-yuan)",
      "万科东第 (wanke-dongdi)",
      "谊景村 (yijing-cun)",
    ]);

    expect(extractDropdownOptions(template, "segment")).toEqual([
      "2居 87-90㎡ (mingquan-2br-87-90)",
      "2居 100-120㎡ (boxi-2br-100-120)",
      "2居 90-110㎡ (lianhai-2br-90-110)",
      "2居 85-90㎡ (wanke-2br-85-90)",
      "2居 75-90㎡ (yijing-2br-75-90)",
    ]);
  });
});
