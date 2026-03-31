import { dirname, posix, resolve } from "node:path";
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

export function communitySegmentPath(
  communityId: string,
  segmentId: string,
): string {
  return posix.join(communityId, segmentId);
}
