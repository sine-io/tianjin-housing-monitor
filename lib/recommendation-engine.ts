import {
  classifyAnchorFreshness,
  DEFAULT_ANCHOR_STALE_AFTER_DAYS,
} from "./household-config";
import {
  actionRules,
  blockingRules,
  evaluateRuleConditions,
  type RecommendationDerivedMetrics,
} from "./recommendation-rules";
import {
  RECOMMENDATION_RESULT_SCHEMA_VERSION,
  type BlockingReasonCode,
  type RecommendationAction,
  type RecommendationEvidenceItem,
  type RecommendationInput,
  type RecommendationResult,
  type RecommendationTargetInput,
  type TargetBasketRankingEntry,
} from "./recommendation-types";

function momentumScore(momentum: RecommendationTargetInput["momentum"]): number {
  switch (momentum) {
    case "improving":
      return 2;
    case "flat":
      return 1;
    case "weakening":
      return 0;
  }
}

function sortTargetBasket(targetBasket: RecommendationTargetInput[]): TargetBasketRankingEntry[] {
  return [...targetBasket]
    .sort((left, right) => {
      const leftSpread = left.relativeSpreadPct ?? Number.POSITIVE_INFINITY;
      const rightSpread = right.relativeSpreadPct ?? Number.POSITIVE_INFINITY;

      if (leftSpread !== rightSpread) {
        return leftSpread - rightSpread;
      }

      if (left.signalStrength !== right.signalStrength) {
        return left.signalStrength === "strong" ? -1 : 1;
      }

      return momentumScore(right.momentum) - momentumScore(left.momentum);
    })
    .map((entry) => ({
      communityId: entry.communityId,
      displayName: entry.displayName,
      score:
        (entry.relativeSpreadPct === null ? -100 : -entry.relativeSpreadPct) +
        (entry.signalStrength === "strong" ? 20 : 0) +
        momentumScore(entry.momentum) * 5,
      reasoning:
        entry.relativeSpreadPct === null
          ? "缺少可用的相对价差信号"
          : `相对价差 ${entry.relativeSpreadPct.toFixed(1)}%，${entry.signalStrength} 证据，动能 ${entry.momentum}`,
    }));
}

function deriveMetrics(input: RecommendationInput): RecommendationDerivedMetrics {
  const rankedTargets = sortTargetBasket(input.targetBasket);
  const firstRankedTarget = rankedTargets.find((entry) => Number.isFinite(entry.score));
  const matchingTopTarget = input.targetBasket.find(
    (entry) => entry.communityId === firstRankedTarget?.communityId,
  );

  return {
    anchorFreshness: classifyAnchorFreshness(
      input.currentHome.anchorUpdatedAt,
      input.generatedAt,
      DEFAULT_ANCHOR_STALE_AFTER_DAYS,
    ),
    decisionWindowMonths: input.decisionWindowMonths,
    strongTargetCount: input.targetBasket.filter(
      (entry) => entry.signalStrength === "strong" && entry.relativeSpreadPct !== null,
    ).length,
    bestRelativeSpreadPct: matchingTopTarget?.relativeSpreadPct ?? null,
    bestMomentum: matchingTopTarget?.momentum ?? null,
    marketMom: input.marketContext.secondaryHomePriceIndexMom,
    contradictorySignal:
      matchingTopTarget !== undefined &&
      matchingTopTarget.relativeSpreadPct !== null &&
      matchingTopTarget.relativeSpreadPct <= -3 &&
      (matchingTopTarget.momentum === "weakening" ||
        (input.marketContext.secondaryHomePriceIndexMom ?? 0) > 100),
  };
}

function buildBlockingExplanation(
  reasonCode: BlockingReasonCode,
): RecommendationResult["explanation"] {
  const nextStepByReason: Record<BlockingReasonCode, RecommendationEvidenceItem> = {
    invalid_input: {
      label: "输入需修正",
      summary: "当前住房锚点信息存在异常，先修正输入后再重新判断。",
    },
    stale_anchor: {
      label: "锚点过旧",
      summary: "当前住房价格锚点已经过期，刷新锚点后再重新判断。",
    },
    insufficient_evidence: {
      label: "样本不足",
      summary: "目标小区篮子缺少足够强样本，暂不建议依据本次结果行动。",
    },
    contradictory_signal: {
      label: "信号冲突",
      summary: "支持与反对信号强度过于接近，暂不输出动作建议。",
    },
  };

  return {
    strongestSupport: [],
    strongestCounterevidence: [nextStepByReason[reasonCode]],
    flipConditions: [
      {
        label: "恢复判断",
        summary: "补足输入或样本后重新生成 recommendation，系统再决定是否给出行动建议。",
      },
    ],
  };
}

function buildActionSupport(
  action: RecommendationAction,
  topTarget: RecommendationTargetInput,
): RecommendationEvidenceItem[] {
  switch (action) {
    case "can_negotiate":
      return [
        {
          label: "相对价差已进入谈价区",
          summary: `${topTarget.displayName} 的相对价差已到 ${topTarget.relativeSpreadPct?.toFixed(1)}%，达到谈价阈值。`,
        },
      ];
    case "can_view":
      return [
        {
          label: "相对价差已进入看房区",
          summary: `${topTarget.displayName} 的相对价差已到 ${topTarget.relativeSpreadPct?.toFixed(1)}%，可以开始看房验证。`,
        },
      ];
    case "continue_wait":
      return [
        {
          label: "当前仍应等待",
          summary: `${topTarget.displayName} 的相对价差尚未进入行动区间，继续等待比仓促动作更稳。`,
        },
      ];
  }
}

function buildCounterevidence(
  input: RecommendationInput,
  topTarget: RecommendationTargetInput,
): RecommendationEvidenceItem[] {
  return [
    {
      label: "主要反证",
      summary:
        input.marketContext.secondaryHomePriceIndexMom !== null &&
        input.marketContext.secondaryHomePriceIndexMom > 100
          ? "城市层面月度读数仍偏强，说明买方窗口未完全打开。"
          : `目标小区当前动能为 ${topTarget.momentum}，需要警惕走势再次转弱。`,
    },
  ];
}

function buildFlipConditions(
  action: RecommendationAction,
): RecommendationEvidenceItem[] {
  switch (action) {
    case "can_negotiate":
      return [
        {
          label: "结论降级条件",
          summary: "如果最佳目标盘相对价差回升到 -3% 以上，或强样本显著减少，结论应退回到看房或继续等待。",
        },
      ];
    case "can_view":
      return [
        {
          label: "结论升级条件",
          summary: "如果最佳目标盘相对价差进一步进入 -8% 及以下，且市场没有回暖，可升级到可以谈价。",
        },
      ];
    case "continue_wait":
      return [
        {
          label: "结论升级条件",
          summary: "如果最佳目标盘相对价差进入 -3% 及以下且保持强样本，结论可升级到可以看房。",
        },
      ];
  }
}

function buildActionTraceNotes(
  action: RecommendationAction,
  topTarget: RecommendationTargetInput,
): string[] {
  return [
    `top-target:${topTarget.communityId}`,
    `top-target-spread:${topTarget.relativeSpreadPct ?? "na"}`,
    `action:${action}`,
  ];
}

export function buildRecommendation(input: RecommendationInput): RecommendationResult {
  const rankedTargets = sortTargetBasket(input.targetBasket);
  const topTarget = input.targetBasket.find(
    (entry) => entry.communityId === rankedTargets[0]?.communityId,
  );
  const derivedMetrics = deriveMetrics(input);
  const matchedBlockingRule = blockingRules.find((rule) =>
    evaluateRuleConditions(derivedMetrics, rule.conditions),
  );

  if (!topTarget || matchedBlockingRule) {
    const reasonCode = matchedBlockingRule?.reasonCode ?? "insufficient_evidence";

    return {
      schemaVersion: RECOMMENDATION_RESULT_SCHEMA_VERSION,
      householdId: input.householdId,
      configVersion: input.configVersion,
      sourceSnapshotId: input.sourceSnapshotId,
      generatedAt: input.generatedAt,
      blocking: {
        isBlocked: true,
        reasonCode,
      },
      action: null,
      explanation: buildBlockingExplanation(reasonCode),
      basketRanking: rankedTargets,
      trace: {
        matchedRuleIds: matchedBlockingRule ? [matchedBlockingRule.id] : [],
        blockingChecks: blockingRules.map((rule) => ({
          reasonCode: rule.reasonCode,
          triggered: matchedBlockingRule?.id === rule.id,
        })),
        notes: topTarget ? [`top-target:${topTarget.communityId}`] : ["top-target:none"],
      },
    };
  }

  const matchedActionRule = actionRules.find((rule) =>
    evaluateRuleConditions(derivedMetrics, rule.conditions),
  );
  const action: RecommendationAction = matchedActionRule?.action ?? "continue_wait";

  return {
    schemaVersion: RECOMMENDATION_RESULT_SCHEMA_VERSION,
    householdId: input.householdId,
    configVersion: input.configVersion,
    sourceSnapshotId: input.sourceSnapshotId,
    generatedAt: input.generatedAt,
    blocking: {
      isBlocked: false,
      reasonCode: null,
    },
    action,
    explanation: {
      strongestSupport: buildActionSupport(action, topTarget),
      strongestCounterevidence: buildCounterevidence(input, topTarget),
      flipConditions: buildFlipConditions(action),
    },
    basketRanking: rankedTargets,
    trace: {
      matchedRuleIds: [matchedActionRule?.id ?? "default-continue-wait"],
      blockingChecks: blockingRules.map((rule) => ({
        reasonCode: rule.reasonCode,
        triggered: false,
      })),
      notes: buildActionTraceNotes(action, topTarget),
    },
  };
}
