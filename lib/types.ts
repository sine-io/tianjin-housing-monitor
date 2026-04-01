export interface CommunitySources {
  fangCommunityUrl: string | null;
  fangWeekreportUrl: string | null;
}

export type CommunityStatus = "active" | "pending_verification";

export interface Community {
  id: string;
  name: string;
  city: string;
  district: string;
  status: CommunityStatus;
  sources: CommunitySources;
}

export interface SegmentTemplate {
  communityId: string;
  id: string;
  label: string;
  rooms: number;
  areaMin: number;
  areaMax: number;
}
