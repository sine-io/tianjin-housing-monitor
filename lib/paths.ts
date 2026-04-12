import { dirname, posix, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const currentDirectory = dirname(fileURLToPath(import.meta.url));

export const REPO_ROOT = resolve(currentDirectory, "..");
export const DATA_DIR = resolve(REPO_ROOT, "data");
export const CONFIG_DIR = resolve(DATA_DIR, "config");
export const SERIES_DIR = resolve(DATA_DIR, "series");
export const COMMUNITIES_CONFIG_PATH = resolve(CONFIG_DIR, "communities.json");
export const SEGMENTS_CONFIG_PATH = resolve(CONFIG_DIR, "segments.json");

export interface DataPaths {
  dataDir: string;
  configDir: string;
  runsDir: string;
  reportsDir: string;
  publicDir: string;
  seriesDir: string;
  manualDir: string;
  manualIncomingDir: string;
  manualAcceptedDir: string;
  communitiesConfigPath: string;
  segmentsConfigPath: string;
}

export interface PrivateArtifactPaths {
  privateRoot: string;
  rawIntakeDir: string;
  householdsDir: string;
  householdsCurrentDir: string;
  householdsHistoryDir: string;
  recommendationsDir: string;
  auditDir: string;
  outputDir: string;
}

export function defaultPublicDataDir(dataDir: string = DATA_DIR): string {
  return resolve(dataDir, "..", "site", "public", "data");
}

export function resolveDataPaths(
  dataDir: string = DATA_DIR,
  publicDir: string = defaultPublicDataDir(dataDir),
): DataPaths {
  const resolvedDataDir = resolve(dataDir);
  const configDir = resolve(resolvedDataDir, "config");
  const manualDir = resolve(resolvedDataDir, "manual");

  return {
    dataDir: resolvedDataDir,
    configDir,
    runsDir: resolve(resolvedDataDir, "runs"),
    reportsDir: resolve(resolvedDataDir, "reports"),
    publicDir: resolve(publicDir),
    seriesDir: resolve(resolvedDataDir, "series"),
    manualDir,
    manualIncomingDir: resolve(manualDir, "incoming"),
    manualAcceptedDir: resolve(manualDir, "accepted"),
    communitiesConfigPath: resolve(configDir, "communities.json"),
    segmentsConfigPath: resolve(configDir, "segments.json"),
  };
}

export function resolvePrivateArtifactPaths(
  privateRoot: string,
): PrivateArtifactPaths {
  const resolvedPrivateRoot = resolve(privateRoot);
  const householdsDir = resolve(resolvedPrivateRoot, "households");

  return {
    privateRoot: resolvedPrivateRoot,
    rawIntakeDir: resolve(resolvedPrivateRoot, "raw-intake"),
    householdsDir,
    householdsCurrentDir: resolve(householdsDir, "current"),
    householdsHistoryDir: resolve(householdsDir, "history"),
    recommendationsDir: resolve(resolvedPrivateRoot, "recommendations"),
    auditDir: resolve(resolvedPrivateRoot, "audit"),
    outputDir: resolve(resolvedPrivateRoot, "output"),
  };
}

export function assertPathOutsideRoots(
  candidatePath: string,
  label: string,
  disallowedRoots: readonly string[],
): void {
  const resolvedCandidatePath = resolve(candidatePath);

  for (const root of disallowedRoots) {
    const resolvedRoot = resolve(root);
    const relativePath = relative(resolvedRoot, resolvedCandidatePath);

    if (
      resolvedCandidatePath === resolvedRoot ||
      (relativePath !== ".." &&
        !relativePath.startsWith("../") &&
        relativePath !== "." &&
        relativePath.length > 0)
    ) {
      throw new Error(`${label} must stay outside ${resolvedRoot}`);
    }
  }
}

export function communitySegmentPath(
  communityId: string,
  segmentId: string,
): string {
  return posix.join(communityId, segmentId);
}
