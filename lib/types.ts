export interface CommunitySources {
  fangCommunityUrl: string;
  fangWeekreportUrl: string;
}

export interface Community {
  id: string;
  name: string;
  city: string;
  district: string;
  sources: CommunitySources;
}

export interface SegmentTemplate {
  id: string;
  label: string;
  rooms: number;
  areaMin: number;
  areaMax: number;
}
