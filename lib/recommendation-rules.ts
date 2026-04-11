import type { AnchorFreshness } from "./household-config";
import type {
  BlockingReasonCode,
  RecommendationAction,
  RecommendationMomentum,
} from "./recommendation-types";

export interface RecommendationDerivedMetrics {
  anchorFreshness: AnchorFreshness;
  strongTargetCount: number;
  bestRelativeSpreadPct: number | null;
  bestMomentum: RecommendationMomentum | null;
  marketMom: number | null;
}

type EvaluatorKey = keyof RecommendationDerivedMetrics;

type RuleOperator = "eq" | "lte" | "gte";

export interface RuleCondition {
  evaluator: EvaluatorKey;
  operator: RuleOperator;
  value: string | number | null;
}

export interface BlockingRule {
  id: string;
  reasonCode: BlockingReasonCode;
  conditions: RuleCondition[];
}

export interface ActionRule {
  id: string;
  action: RecommendationAction;
  conditions: RuleCondition[];
}

export const blockingRules: BlockingRule[] = [
  {
    id: "block-stale-anchor",
    reasonCode: "stale_anchor",
    conditions: [{ evaluator: "anchorFreshness", operator: "eq", value: "stale" }],
  },
  {
    id: "block-future-anchor",
    reasonCode: "invalid_input",
    conditions: [{ evaluator: "anchorFreshness", operator: "eq", value: "future" }],
  },
  {
    id: "block-insufficient-targets",
    reasonCode: "insufficient_evidence",
    conditions: [{ evaluator: "strongTargetCount", operator: "lte", value: 0 }],
  },
  {
    id: "block-missing-relative-spread",
    reasonCode: "insufficient_evidence",
    conditions: [{ evaluator: "bestRelativeSpreadPct", operator: "eq", value: null }],
  },
];

export const actionRules: ActionRule[] = [
  {
    id: "action-can-negotiate",
    action: "can_negotiate",
    conditions: [
      { evaluator: "bestRelativeSpreadPct", operator: "lte", value: -8 },
      { evaluator: "strongTargetCount", operator: "gte", value: 1 },
      { evaluator: "marketMom", operator: "lte", value: 99.8 },
    ],
  },
  {
    id: "action-can-view",
    action: "can_view",
    conditions: [
      { evaluator: "bestRelativeSpreadPct", operator: "lte", value: -3 },
      { evaluator: "strongTargetCount", operator: "gte", value: 1 },
      { evaluator: "marketMom", operator: "lte", value: 100.2 },
    ],
  },
];

export function evaluateRuleConditions(
  metrics: RecommendationDerivedMetrics,
  conditions: RuleCondition[],
): boolean {
  return conditions.every((condition) => {
    const currentValue = metrics[condition.evaluator];

    switch (condition.operator) {
      case "eq":
        return currentValue === condition.value;
      case "lte":
        return (
          typeof currentValue === "number" &&
          typeof condition.value === "number" &&
          currentValue <= condition.value
        );
      case "gte":
        return (
          typeof currentValue === "number" &&
          typeof condition.value === "number" &&
          currentValue >= condition.value
        );
    }
  });
}
