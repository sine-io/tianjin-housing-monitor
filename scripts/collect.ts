import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { closeBrowser } from "../collector/browser";
import {
  collectFangCommunityHtml,
  deriveFangCommunityMobileUrl,
} from "../collector/fang-community";
import {
  collectFangWeekreportHtml,
  deriveFangWeekreportMobileUrl,
} from "../collector/fang-weekreport";
import { collectStatsGovHtml } from "../collector/stats-gov";
import { loadCommunities } from "../lib/config";
import { DATA_DIR } from "../lib/paths";
import type { Community } from "../lib/types";
import { parseFangCommunity } from "../parser/fang-community";
import { parseFangWeekreport } from "../parser/fang-weekreport";
import { parseStatsGovCityMarket } from "../parser/stats-gov";

type SourceStatus = "success" | "failed" | "skipped";

interface StatsGovRunSource {
  status: SourceStatus;
  latestMonth?: string;
  city?: string;
}

interface FangCommunityRunSource {
  status: SourceStatus;
  referenceUnitPrice?: number | null;
}

interface FangWeekreportPoint {
  label: string;
  priceYuanPerSqm: number | null;
}

interface FangWeekreportRunSource {
  status: SourceStatus;
  weeklyPoints?: FangWeekreportPoint[];
}

interface CommunityRunSources {
  fangCommunity: FangCommunityRunSource;
  fangWeekreport: FangWeekreportRunSource;
}

interface RunArtifact {
  generatedAt: string;
  sources: {
    "stats-gov"?: StatsGovRunSource;
  };
  communities: Record<string, CommunityRunSources>;
}

const RUNS_DIR = resolve(DATA_DIR, "runs");
const LATEST_RUN_PATH = resolve(RUNS_DIR, "latest.json");
const STATS_GOV_CITY = "天津";
const DEFAULT_FIXTURE_ROOT = resolve("tests/fixtures");

function parseCommandLineArguments(argv: string[]): { fixtureRoot?: string } {
  const fixtureFlagIndex = argv.indexOf("--fixture");

  if (fixtureFlagIndex === -1) {
    return {};
  }

  const fixtureRootCandidate = argv[fixtureFlagIndex + 1];

  if (!fixtureRootCandidate || fixtureRootCandidate.startsWith("-")) {
    return { fixtureRoot: DEFAULT_FIXTURE_ROOT };
  }

  return { fixtureRoot: resolve(fixtureRootCandidate) };
}

function readPreviousRun(): RunArtifact | null {
  if (!existsSync(LATEST_RUN_PATH)) {
    return null;
  }

  try {
    return JSON.parse(readFileSync(LATEST_RUN_PATH, "utf8")) as RunArtifact;
  } catch {
    return null;
  }
}

function mergeStatsGovRun(
  previous: StatsGovRunSource | undefined,
  next: StatsGovRunSource,
): StatsGovRunSource {
  if (next.status === "success") {
    return {
      status: next.status,
      latestMonth: next.latestMonth,
      city: next.city,
    };
  }

  return {
    status: next.status,
    latestMonth: next.latestMonth ?? previous?.latestMonth,
    city: next.city ?? previous?.city,
  };
}

function mergeFangCommunityRun(
  previous: FangCommunityRunSource | undefined,
  next: FangCommunityRunSource,
): FangCommunityRunSource {
  if (next.status === "success") {
    return {
      status: next.status,
      referenceUnitPrice: next.referenceUnitPrice,
    };
  }

  return {
    status: next.status,
    referenceUnitPrice: next.referenceUnitPrice ?? previous?.referenceUnitPrice,
  };
}

function mergeFangWeekreportRun(
  previous: FangWeekreportRunSource | undefined,
  next: FangWeekreportRunSource,
): FangWeekreportRunSource {
  if (next.status === "success") {
    return {
      status: next.status,
      weeklyPoints: next.weeklyPoints,
    };
  }

  return {
    status: next.status,
    weeklyPoints: next.weeklyPoints ?? previous?.weeklyPoints,
  };
}

function makeArchivedRunPath(generatedAt: string): string {
  const baseName = `${generatedAt.replaceAll(":", "-")}.json`;
  let filePath = resolve(RUNS_DIR, baseName);
  let suffix = 1;

  while (existsSync(filePath)) {
    filePath = resolve(
      RUNS_DIR,
      `${generatedAt.replaceAll(":", "-")}-${suffix}.json`,
    );
    suffix += 1;
  }

  return filePath;
}

function writeRunArtifacts(runArtifact: RunArtifact): void {
  mkdirSync(RUNS_DIR, { recursive: true });

  const serialized = JSON.stringify(runArtifact, null, 2);

  writeFileSync(LATEST_RUN_PATH, serialized);
  writeFileSync(makeArchivedRunPath(runArtifact.generatedAt), serialized);
}

async function collectStatsGovRun(
  previousRun: RunArtifact | null,
  fixtureRoot?: string,
): Promise<StatsGovRunSource> {
  const previousSource = previousRun?.sources["stats-gov"];

  try {
    const { html } = await collectStatsGovHtml(fixtureRoot);
    const parsed = parseStatsGovCityMarket(html, STATS_GOV_CITY);

    return mergeStatsGovRun(previousSource, {
      status: "success",
      latestMonth: parsed.month,
      city: parsed.city,
    });
  } catch {
    return mergeStatsGovRun(previousSource, { status: "failed" });
  }
}

async function collectCommunityRun(
  community: Community,
  previousRun: RunArtifact | null,
  fixtureRoot: string | undefined,
): Promise<CommunityRunSources> {
  const previousCommunity = previousRun?.communities[community.id];
  let fangCommunityRun = mergeFangCommunityRun(previousCommunity?.fangCommunity, {
    status: "skipped",
  });
  let fangWeekreportRun = mergeFangWeekreportRun(previousCommunity?.fangWeekreport, {
    status: "skipped",
  });

  const communitySourceUrl = fixtureRoot
    ? resolve(fixtureRoot, "fang/community", `${community.id}.html`)
    : deriveFangCommunityMobileUrl(community);

  if (!communitySourceUrl) {
    fangCommunityRun = mergeFangCommunityRun(previousCommunity?.fangCommunity, {
      status: "skipped",
    });
  } else {
    try {
      const { html } = await collectFangCommunityHtml(community, fixtureRoot);
      const parsed = parseFangCommunity(html);

      fangCommunityRun = mergeFangCommunityRun(previousCommunity?.fangCommunity, {
        status: "success",
        referenceUnitPrice: parsed.referencePriceYuanPerSqm,
      });
    } catch {
      fangCommunityRun = mergeFangCommunityRun(previousCommunity?.fangCommunity, {
        status: "failed",
      });
    }
  }

  const weekreportSourceUrl = fixtureRoot
    ? resolve(fixtureRoot, "fang/weekreport", `${community.id}.html`)
    : deriveFangWeekreportMobileUrl(community);

  if (!weekreportSourceUrl) {
    fangWeekreportRun = mergeFangWeekreportRun(previousCommunity?.fangWeekreport, {
      status: "skipped",
    });
  } else {
    try {
      const { html } = await collectFangWeekreportHtml(community, fixtureRoot);
      const parsed = parseFangWeekreport(html);

      fangWeekreportRun = mergeFangWeekreportRun(previousCommunity?.fangWeekreport, {
        status: "success",
        weeklyPoints: parsed.pricePoints.map((point) => ({
          label: point.label,
          priceYuanPerSqm: point.priceYuanPerSqm,
        })),
      });
    } catch {
      fangWeekreportRun = mergeFangWeekreportRun(previousCommunity?.fangWeekreport, {
        status: "failed",
      });
    }
  }

  return {
    fangCommunity: fangCommunityRun,
    fangWeekreport: fangWeekreportRun,
  };
}

async function main(): Promise<void> {
  const { fixtureRoot } = parseCommandLineArguments(process.argv.slice(2));
  const previousRun = readPreviousRun();
  const generatedAt = new Date().toISOString();
  const communities = loadCommunities();
  const communityRuns: Record<string, CommunityRunSources> = {};

  const statsGovRun = await collectStatsGovRun(previousRun, fixtureRoot);

  for (const community of communities) {
    communityRuns[community.id] = await collectCommunityRun(
      community,
      previousRun,
      fixtureRoot,
    );
  }

  writeRunArtifacts({
    generatedAt,
    sources: {
      "stats-gov": statsGovRun,
    },
    communities: communityRuns,
  });
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeBrowser();
  });
