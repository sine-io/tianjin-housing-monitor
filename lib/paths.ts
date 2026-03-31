import { dirname, posix, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const currentDirectory = dirname(fileURLToPath(import.meta.url));

export const REPO_ROOT = resolve(currentDirectory, "..");
export const DATA_DIR = resolve(REPO_ROOT, "data");
export const CONFIG_DIR = resolve(DATA_DIR, "config");
export const SERIES_DIR = resolve(DATA_DIR, "series");
export const COMMUNITIES_CONFIG_PATH = resolve(CONFIG_DIR, "communities.json");
export const SEGMENTS_CONFIG_PATH = resolve(CONFIG_DIR, "segments.json");

export function communitySegmentPath(
  communityId: string,
  segmentId: string,
): string {
  return posix.join(communityId, segmentId);
}
