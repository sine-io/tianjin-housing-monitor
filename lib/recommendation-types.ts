export const RECOMMENDATION_RESULT_SCHEMA_VERSION = 1;

export type RecommendationAction =
  | "continue_wait"
  | "can_view"
  | "can_negotiate";

export type RecommendationSignalStrength = "strong" | "weak";
export type RecommendationMomentum = "improving" | "flat" | "weakening";

export type BlockingReasonCode =
  | "invalid_input"
  | "stale_anchor"
  | "insufficient_evidence"
  | "contradictory_signal";

export interface RecommendationEvidenceItem {
  label: string;
  summary: string;
  value?: string;
}

export interface TargetBasketRankingEntry {
  communityId: string;
  displayName: string;
  score: number;
  reasoning: string;
}

export interface RecommendationTargetInput {
  communityId: string;
  displayName: string;
  relativeSpreadPct: number | null;
  listingCount: number;
  signalStrength: RecommendationSignalStrength;
  momentum: RecommendationMomentum;
}

export interface RecommendationInput {
  householdId: string;
  configVersion: string;
  sourceSnapshotId: string;
  generatedAt: string;
  decisionWindowMonths: 3 | 6 | 12;
  currentHome: {
    anchorPriceWan: number;
    anchorUpdatedAt: string;
  };
  marketContext: {
    secondaryHomePriceIndexMom: number | null;
    verdict?: string;
  };
  targetBasket: RecommendationTargetInput[];
}

export interface RecommendationExplanation {
  strongestSupport: RecommendationEvidenceItem[];
  strongestCounterevidence: RecommendationEvidenceItem[];
  flipConditions: RecommendationEvidenceItem[];
}

export interface RecommendationTrace {
  matchedRuleIds: string[];
  blockingChecks: Array<{
    reasonCode: BlockingReasonCode;
    triggered: boolean;
  }>;
  notes: string[];
}

export interface RecommendationResult {
  schemaVersion: typeof RECOMMENDATION_RESULT_SCHEMA_VERSION;
  householdId: string;
  configVersion: string;
  sourceSnapshotId: string;
  generatedAt: string;
  blocking: {
    isBlocked: boolean;
    reasonCode: BlockingReasonCode | null;
  };
  action: RecommendationAction | null;
  explanation: RecommendationExplanation;
  basketRanking: TargetBasketRankingEntry[];
  trace: RecommendationTrace;
}
