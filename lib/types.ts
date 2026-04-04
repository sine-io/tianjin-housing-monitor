export interface CommunitySources {
  fangCommunityUrl: string | null;
  fangWeekreportUrl: string | null;
  anjukeSaleSearchUrl: string | null;
}

export type CommunityStatus = "active" | "pending_verification";
export type CommunitySourceProvider =
  | "fang_mobile"
  | "anjuke_sale_search"
  | "none";

export interface Community {
  id: string;
  name: string;
  city: string;
  district: string;
  status: CommunityStatus;
  sourceProvider: CommunitySourceProvider;
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
