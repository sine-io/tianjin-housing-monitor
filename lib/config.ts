import { readFileSync } from "node:fs";

import { communitiesSchema, segmentsSchema } from "./schemas";
import { COMMUNITIES_CONFIG_PATH, SEGMENTS_CONFIG_PATH } from "./paths";
import type { Community, SegmentTemplate } from "./types";

function readJsonFile(filePath: string): unknown {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

export function loadCommunities(): Community[] {
  return communitiesSchema.parse(readJsonFile(COMMUNITIES_CONFIG_PATH));
}

export function loadSegments(): SegmentTemplate[] {
  return segmentsSchema.parse(readJsonFile(SEGMENTS_CONFIG_PATH));
}
