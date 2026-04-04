import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { closeBrowser } from "../collector/browser";
import { collectAnjukeSaleSearchHtml } from "../collector/anjuke-sale-search";
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
import { median } from "../lib/metrics";
import { DATA_DIR } from "../lib/paths";
import type { Community } from "../lib/types";
import { parseAnjukeSaleSearch } from "../parser/anjuke-sale-search";
import { parseFangCommunity } from "../parser/fang-community";
import { parseFangWeekreport } from "../parser/fang-weekreport";
import { parseStatsGovCityMarket } from "../parser/stats-gov";

type SourceStatus = "success" | "failed" | "skipped";

interface StatsGovRunSource {
  status: SourceStatus;
  latestMonth?: string;
  city?: string;
  secondaryHomePriceIndexMom?: number | null;
  secondaryHomePriceIndexYoy?: number | null;
}

interface FangCommunityRunSource {
  status: SourceStatus;
  referenceUnitPrice?: number | null;
  listingCount?: number | null;
  recentDealHints?: string[];
  currentListingTeasers?: Array<{
    title: string | null;
    roomCount: number | null;
    areaSqm: number | null;
    totalPriceWan: number | null;
    unitPriceYuanPerSqm: number | null;
  }>;
}

interface FangWeekreportPoint {
  label: string;
  priceYuanPerSqm: number | null;
}

interface FangWeekreportRunSource {
  status: SourceStatus;
  pricePoints?: FangWeekreportPoint[];
  listingCount?: number | null;
  districtName?: string | null;
  districtPremiumPct?: number | null;
  momChangePct?: number | null;
  yoyChangePct?: number | null;
  availableRangeLabels?: string[];
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

const DEFAULT_RUNS_DIR = resolve(DATA_DIR, "runs");
const STATS_GOV_CITY = "天津";
const DEFAULT_FIXTURE_ROOT = resolve("tests/fixtures");
const RUNS_DIR_ENV_VAR = "ZHAOFANG_RUNS_DIR";

function resolveOptionalPath(value: string | undefined): string | undefined {
  if (!value || value.startsWith("-")) {
    return undefined;
  }

  return resolve(value);
}

function parseCommandLineArguments(argv: string[]): {
  fixtureRoot?: string;
  runsDir: string;
} {
  let fixtureRoot: string | undefined;
  let runsDir = process.env[RUNS_DIR_ENV_VAR]
    ? resolve(process.env[RUNS_DIR_ENV_VAR]!)
    : DEFAULT_RUNS_DIR;

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    if (argument === "--fixture") {
      const candidate = resolveOptionalPath(argv[index + 1]);
      fixtureRoot = candidate ?? DEFAULT_FIXTURE_ROOT;

      if (candidate) {
        index += 1;
      }
      continue;
    }

    if (argument === "--runs-dir") {
      const candidate = resolveOptionalPath(argv[index + 1]);

      if (!candidate) {
        throw new Error("--runs-dir requires a path");
      }

      runsDir = candidate;
      index += 1;
    }
  }

  return { fixtureRoot, runsDir };
}

function latestRunPath(runsDir: string): string {
  return resolve(runsDir, "latest.json");
}

function readPreviousRun(runsDir: string): RunArtifact | null {
  const latestPath = latestRunPath(runsDir);

  if (!existsSync(latestPath)) {
    return null;
  }

  try {
    return JSON.parse(readFileSync(latestPath, "utf8")) as RunArtifact;
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
      secondaryHomePriceIndexMom: next.secondaryHomePriceIndexMom,
      secondaryHomePriceIndexYoy: next.secondaryHomePriceIndexYoy,
    };
  }

  return {
    status: next.status,
    latestMonth: next.latestMonth ?? previous?.latestMonth,
    city: next.city ?? previous?.city,
    secondaryHomePriceIndexMom:
      next.secondaryHomePriceIndexMom ?? previous?.secondaryHomePriceIndexMom,
    secondaryHomePriceIndexYoy:
      next.secondaryHomePriceIndexYoy ?? previous?.secondaryHomePriceIndexYoy,
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
      listingCount: next.listingCount,
      recentDealHints: next.recentDealHints,
      currentListingTeasers: next.currentListingTeasers,
    };
  }

  return {
    status: next.status,
    referenceUnitPrice: next.referenceUnitPrice ?? previous?.referenceUnitPrice,
    listingCount: next.listingCount ?? previous?.listingCount,
    recentDealHints: next.recentDealHints ?? previous?.recentDealHints,
    currentListingTeasers:
      next.currentListingTeasers ?? previous?.currentListingTeasers,
  };
}

function mergeFangWeekreportRun(
  previous: FangWeekreportRunSource | undefined,
  next: FangWeekreportRunSource,
): FangWeekreportRunSource {
  if (next.status === "success") {
    return {
      status: next.status,
      pricePoints: next.pricePoints,
      listingCount: next.listingCount,
      districtName: next.districtName,
      districtPremiumPct: next.districtPremiumPct,
      momChangePct: next.momChangePct,
      yoyChangePct: next.yoyChangePct,
      availableRangeLabels: next.availableRangeLabels,
    };
  }

  return {
    status: next.status,
    pricePoints: next.pricePoints ?? previous?.pricePoints,
    listingCount: next.listingCount ?? previous?.listingCount,
    districtName: next.districtName ?? previous?.districtName,
    districtPremiumPct: next.districtPremiumPct ?? previous?.districtPremiumPct,
    momChangePct: next.momChangePct ?? previous?.momChangePct,
    yoyChangePct: next.yoyChangePct ?? previous?.yoyChangePct,
    availableRangeLabels:
      next.availableRangeLabels ?? previous?.availableRangeLabels,
  };
}

function makeArchivedRunPath(runsDir: string, generatedAt: string): string {
  const baseName = `${generatedAt.replaceAll(":", "-")}.json`;
  let filePath = resolve(runsDir, baseName);
  let suffix = 1;

  while (existsSync(filePath)) {
    filePath = resolve(
      runsDir,
      `${generatedAt.replaceAll(":", "-")}-${suffix}.json`,
    );
    suffix += 1;
  }

  return filePath;
}

function writeRunArtifacts(runsDir: string, runArtifact: RunArtifact): void {
  mkdirSync(runsDir, { recursive: true });

  const serialized = JSON.stringify(runArtifact, null, 2);

  writeFileSync(latestRunPath(runsDir), serialized);
  writeFileSync(makeArchivedRunPath(runsDir, runArtifact.generatedAt), serialized);
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
      secondaryHomePriceIndexMom: parsed.secondaryHomePriceIndexMom,
      secondaryHomePriceIndexYoy: parsed.secondaryHomePriceIndexYoy,
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

  if (
    community.status === "pending_verification" ||
    community.sourceProvider === "none"
  ) {
    return {
      fangCommunity: fangCommunityRun,
      fangWeekreport: fangWeekreportRun,
    };
  }

  if (community.sourceProvider === "anjuke_sale_search") {
    try {
      const { html } = await collectAnjukeSaleSearchHtml(community, fixtureRoot);
      const parsed = parseAnjukeSaleSearch(html, community.name);

      if (parsed.pageState !== "results" || parsed.listings.length === 0) {
        fangCommunityRun = {
          status: "failed",
          referenceUnitPrice: null,
          listingCount: null,
          currentListingTeasers: [],
        };
      } else {
        const currentListingTeasers = parsed.listings.map((listing) => ({
          title: listing.title,
          roomCount: listing.roomCount,
          areaSqm: listing.areaSqm,
          totalPriceWan: listing.totalPriceWan,
          unitPriceYuanPerSqm: listing.unitPriceYuanPerSqm,
        }));

        fangCommunityRun = mergeFangCommunityRun(previousCommunity?.fangCommunity, {
          status: "success",
          referenceUnitPrice: median(
            currentListingTeasers.map(
              (listing) => listing.unitPriceYuanPerSqm ?? null,
            ).filter((value): value is number => value !== null),
          ),
          listingCount: currentListingTeasers.length,
          currentListingTeasers,
        });
      }
    } catch {
      fangCommunityRun = {
        status: "failed",
        referenceUnitPrice: null,
        listingCount: null,
        currentListingTeasers: [],
      };
    }

    return {
      fangCommunity: fangCommunityRun,
      fangWeekreport: fangWeekreportRun,
    };
  }

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
        listingCount: parsed.listingCount,
        recentDealHints: parsed.recentDealHints,
        currentListingTeasers: parsed.currentListingTeasers,
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
        pricePoints: parsed.pricePoints.map((point) => ({
          label: point.label,
          priceYuanPerSqm: point.priceYuanPerSqm,
        })),
        listingCount: parsed.listingCount,
        districtName: parsed.districtName,
        districtPremiumPct: parsed.districtPremiumPct,
        momChangePct: parsed.momChangePct,
        yoyChangePct: parsed.yoyChangePct,
        availableRangeLabels: parsed.availableRangeLabels,
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
  const { fixtureRoot, runsDir } = parseCommandLineArguments(process.argv.slice(2));
  const previousRun = readPreviousRun(runsDir);
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

  writeRunArtifacts(runsDir, {
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
