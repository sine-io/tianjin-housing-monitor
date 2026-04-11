import { z } from "zod";

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

const recommendationEvidenceItemSchema: z.ZodType<RecommendationEvidenceItem> = z
  .object({
    label: z.string().min(1),
    summary: z.string().min(1),
    value: z.string().min(1).optional(),
  })
  .strict();

const targetBasketRankingEntrySchema: z.ZodType<TargetBasketRankingEntry> = z
  .object({
    communityId: z.string().min(1),
    displayName: z.string().min(1),
    score: z.number(),
    reasoning: z.string().min(1),
  })
  .strict();

const recommendationTraceSchema: z.ZodType<RecommendationTrace> = z
  .object({
    matchedRuleIds: z.array(z.string().min(1)),
    blockingChecks: z.array(
      z
        .object({
          reasonCode: z.union([
            z.literal("invalid_input"),
            z.literal("stale_anchor"),
            z.literal("insufficient_evidence"),
            z.literal("contradictory_signal"),
          ]),
          triggered: z.boolean(),
        })
        .strict(),
    ),
    notes: z.array(z.string()),
  })
  .strict();

export const recommendationResultSchema: z.ZodType<RecommendationResult> = z
  .object({
    schemaVersion: z.literal(RECOMMENDATION_RESULT_SCHEMA_VERSION),
    householdId: z.string().min(1),
    configVersion: z.string().min(1),
    sourceSnapshotId: z.string().min(1),
    generatedAt: z.string().min(1),
    blocking: z
      .object({
        isBlocked: z.boolean(),
        reasonCode: z
          .union([
            z.literal("invalid_input"),
            z.literal("stale_anchor"),
            z.literal("insufficient_evidence"),
            z.literal("contradictory_signal"),
          ])
          .nullable(),
      })
      .strict(),
    action: z
      .union([
        z.literal("continue_wait"),
        z.literal("can_view"),
        z.literal("can_negotiate"),
      ])
      .nullable(),
    explanation: z
      .object({
        strongestSupport: z.array(recommendationEvidenceItemSchema),
        strongestCounterevidence: z.array(recommendationEvidenceItemSchema),
        flipConditions: z.array(recommendationEvidenceItemSchema),
      })
      .strict(),
    basketRanking: z.array(targetBasketRankingEntrySchema),
    trace: recommendationTraceSchema,
  })
  .strict();

export function validateRecommendationResult(value: unknown): RecommendationResult {
  return recommendationResultSchema.parse(value);
}
