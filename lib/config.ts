import { readFileSync } from "node:fs";

import { communitiesSchema, segmentsSchema } from "./schemas";
import { COMMUNITIES_CONFIG_PATH, SEGMENTS_CONFIG_PATH } from "./paths";
import type { Community, SegmentTemplate } from "./types";

const WANKe_COMMUNITY_ID = "wanke-dongdi";
const WANKe_PRIMARY_SEGMENT_ID = "wanke-2br-85-90";

function readJsonFile(filePath: string): unknown {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

export function loadCommunities(
  filePath: string = COMMUNITIES_CONFIG_PATH,
): Community[] {
  return communitiesSchema.parse(readJsonFile(filePath));
}

function validateSegmentsForCommunities(
  segments: SegmentTemplate[],
  communities: Community[],
): SegmentTemplate[] {
  const knownCommunityIds = new Set(communities.map((community) => community.id));
  const segmentCounts = new Map<string, number>();

  for (const segment of segments) {
    if (!knownCommunityIds.has(segment.communityId)) {
      throw new Error(`Unknown segment communityId: ${segment.communityId}`);
    }

    if (
      segment.communityId === WANKe_COMMUNITY_ID &&
      segment.id !== WANKe_PRIMARY_SEGMENT_ID
    ) {
      throw new Error(
        `Unexpected primary segment id for community ${segment.communityId}: ${segment.id}`,
      );
    }

    segmentCounts.set(
      segment.communityId,
      (segmentCounts.get(segment.communityId) ?? 0) + 1,
    );
  }

  for (const community of communities) {
    const segmentCount = segmentCounts.get(community.id) ?? 0;

    if (segmentCount !== 1) {
      throw new Error(
        `Expected exactly one segment for community: ${community.id}`,
      );
    }
  }

  return segments;
}

export function loadSegments(
  filePath: string = SEGMENTS_CONFIG_PATH,
  communities: Community[] = loadCommunities(),
): SegmentTemplate[] {
  return validateSegmentsForCommunities(
    segmentsSchema.parse(readJsonFile(filePath)),
    communities,
  );
}
