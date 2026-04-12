export type DashboardIconKey =
  | "badge-dollar-sign"
  | "building-2"
  | "activity"
  | "shield-alert";

export type KpiCardTone = "highlight" | "positive" | "neutral" | "negative";
export type TimelineTone = "positive" | "negative" | "neutral";
export type FocusedCommunityTone = "active" | "pending";

export interface DashboardKpi {
  title: string;
  value: string;
  change: string;
  hint: string;
  tone: KpiCardTone;
  icon: DashboardIconKey;
}

export interface DroppedListing {
  id: string;
  community: string;
  area: string;
  originalPrice: string;
  currentPrice: string;
  drop: string;
  daysOnMarket: number;
  note: string;
}

export interface TimelineItem {
  id: string;
  title: string;
  description: string;
  time: string;
  tone: TimelineTone;
}

export interface FocusedCommunitySummary {
  id: string;
  name: string;
  district: string;
  segmentLabel: string;
  latestPrice: string;
  listingsCount: string;
  verdict: string;
  status: string;
  tone: FocusedCommunityTone;
}

export interface InventoryCommunitySummary {
  id: string;
  name: string;
  district: string;
  segmentLabel: string;
  latestPrice: string;
  listingsCount: string;
  verdict: string;
  status: string;
  sourceProvider: string;
  tone: FocusedCommunityTone;
}

export interface SettingsItem {
  id: string;
  title: string;
  value: string;
  description: string;
}

export interface PublicRecommendationDemoCardItem {
  title: string;
  action: string;
  strongestReason: string;
  href: string;
}

export interface PublicRecommendationDemoSectionItem {
  title: string;
  description: string;
  action: string;
  strongestSupport: string[];
  strongestCounterevidence: string[];
  flipConditions: string[];
  basketRanking: Array<{
    community: string;
    reasoning: string;
  }>;
}
