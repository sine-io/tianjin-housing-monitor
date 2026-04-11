import { describe, expect, it } from "vitest";

import { buildRecommendation } from "../../lib/recommendation-engine";
import type { RecommendationInput } from "../../lib/recommendation-types";

function makeInput(
  overrides: Partial<RecommendationInput> = {},
): RecommendationInput {
  return {
    householdId: "qinhe-to-meijiang",
    configVersion: "2026-04-11T12:00:00.000Z",
    sourceSnapshotId: "snapshot-2026-04-11",
    generatedAt: "2026-04-11T12:00:00.000Z",
    decisionWindowMonths: 6,
    currentHome: {
      anchorPriceWan: 210,
      anchorUpdatedAt: "2026-04-10T12:00:00.000Z",
    },
    marketContext: {
      secondaryHomePriceIndexMom: 99.7,
      verdict: "偏弱",
    },
    targetBasket: [
      {
        communityId: "mingquan-huayuan",
        displayName: "鸣泉花园",
        relativeSpreadPct: -4.5,
        listingCount: 6,
        signalStrength: "strong",
        momentum: "flat",
      },
      {
        communityId: "boxi-huayuan",
        displayName: "柏溪花园",
        relativeSpreadPct: -2.2,
        listingCount: 4,
        signalStrength: "weak",
        momentum: "flat",
      },
    ],
    ...overrides,
  };
}

describe("lib/recommendation-engine buildRecommendation", () => {
  it("blocks when the current-home anchor is stale", () => {
    const result = buildRecommendation(
      makeInput({
        currentHome: {
          anchorPriceWan: 210,
          anchorUpdatedAt: "2025-12-01T12:00:00.000Z",
        },
      }),
    );

    expect(result.blocking).toEqual({
      isBlocked: true,
      reasonCode: "stale_anchor",
    });
    expect(result.action).toBeNull();
  });

  it("blocks when no strong target evidence exists", () => {
    const result = buildRecommendation(
      makeInput({
        targetBasket: [
          {
            communityId: "mingquan-huayuan",
            displayName: "鸣泉花园",
            relativeSpreadPct: null,
            listingCount: 1,
            signalStrength: "weak",
            momentum: "weakening",
          },
        ],
      }),
    );

    expect(result.blocking.isBlocked).toBe(true);
    expect(result.blocking.reasonCode).toBe("insufficient_evidence");
  });

  it("blocks on future anchors as invalid input", () => {
    const result = buildRecommendation(
      makeInput({
        currentHome: {
          anchorPriceWan: 210,
          anchorUpdatedAt: "2026-04-12T12:00:00.000Z",
        },
      }),
    );

    expect(result.blocking).toEqual({
      isBlocked: true,
      reasonCode: "invalid_input",
    });
    expect(result.action).toBeNull();
  });

  it("blocks when market context is missing instead of defaulting to continue_wait", () => {
    const result = buildRecommendation(
      makeInput({
        marketContext: {
          secondaryHomePriceIndexMom: null,
        },
      }),
    );

    expect(result.blocking).toEqual({
      isBlocked: true,
      reasonCode: "insufficient_evidence",
    });
    expect(result.action).toBeNull();
  });

  it("blocks on contradictory signals", () => {
    const result = buildRecommendation(
      makeInput({
        marketContext: {
          secondaryHomePriceIndexMom: 100.4,
          verdict: "中性",
        },
        targetBasket: [
          {
            communityId: "mingquan-huayuan",
            displayName: "鸣泉花园",
            relativeSpreadPct: -4.5,
            listingCount: 5,
            signalStrength: "strong",
            momentum: "weakening",
          },
        ],
      }),
    );

    expect(result.blocking).toEqual({
      isBlocked: true,
      reasonCode: "contradictory_signal",
    });
    expect(result.action).toBeNull();
  });

  it.each([
    {
      name: "returns can_negotiate when spread is deeply favorable",
      input: makeInput({
        decisionWindowMonths: 3,
        marketContext: {
          secondaryHomePriceIndexMom: 99.4,
          verdict: "偏弱",
        },
        targetBasket: [
          {
            communityId: "mingquan-huayuan",
            displayName: "鸣泉花园",
            relativeSpreadPct: -9.5,
            listingCount: 7,
            signalStrength: "strong",
            momentum: "improving",
          },
        ],
      }),
      expectedAction: "can_negotiate",
    },
    {
      name: "returns can_view when spread is favorable but not yet in negotiation range",
      input: makeInput({
        targetBasket: [
          {
            communityId: "mingquan-huayuan",
            displayName: "鸣泉花园",
            relativeSpreadPct: -4,
            listingCount: 5,
            signalStrength: "strong",
            momentum: "flat",
          },
        ],
      }),
      expectedAction: "can_view",
    },
    {
      name: "returns continue_wait when spread is not yet favorable enough",
      input: makeInput({
        marketContext: {
          secondaryHomePriceIndexMom: 100.3,
          verdict: "中性",
        },
        targetBasket: [
          {
            communityId: "mingquan-huayuan",
            displayName: "鸣泉花园",
            relativeSpreadPct: -1.2,
            listingCount: 5,
            signalStrength: "strong",
            momentum: "flat",
          },
        ],
      }),
      expectedAction: "continue_wait",
    },
  ])("$name", ({ input, expectedAction }) => {
    const result = buildRecommendation(input);

    expect(result.blocking.isBlocked).toBe(false);
    expect(result.action).toBe(expectedAction);
  });

  it("builds strongest support, counterevidence, and flip conditions from the same result", () => {
    const result = buildRecommendation(makeInput());

    expect(result.explanation.strongestSupport.length).toBeGreaterThan(0);
    expect(result.explanation.strongestCounterevidence.length).toBeGreaterThan(0);
    expect(result.explanation.flipConditions.length).toBeGreaterThan(0);
  });

  it("ranks the target basket from most favorable to least favorable", () => {
    const result = buildRecommendation(
      makeInput({
        targetBasket: [
          {
            communityId: "boxi-huayuan",
            displayName: "柏溪花园",
            relativeSpreadPct: -2,
            listingCount: 3,
            signalStrength: "weak",
            momentum: "flat",
          },
          {
            communityId: "mingquan-huayuan",
            displayName: "鸣泉花园",
            relativeSpreadPct: -5,
            listingCount: 6,
            signalStrength: "strong",
            momentum: "improving",
          },
          {
            communityId: "wanke-dongdi",
            displayName: "万科东第",
            relativeSpreadPct: null,
            listingCount: 0,
            signalStrength: "weak",
            momentum: "weakening",
          },
        ],
      }),
    );

    expect(result.basketRanking.map((entry) => entry.communityId)).toEqual([
      "mingquan-huayuan",
      "boxi-huayuan",
      "wanke-dongdi",
    ]);
  });

  it("changes recommendation thresholds by decision window", () => {
    const fastWindowResult = buildRecommendation(
      makeInput({
        decisionWindowMonths: 3,
        targetBasket: [
          {
            communityId: "mingquan-huayuan",
            displayName: "鸣泉花园",
            relativeSpreadPct: -2.5,
            listingCount: 5,
            signalStrength: "strong",
            momentum: "flat",
          },
        ],
      }),
    );
    const slowWindowResult = buildRecommendation(
      makeInput({
        decisionWindowMonths: 12,
        targetBasket: [
          {
            communityId: "mingquan-huayuan",
            displayName: "鸣泉花园",
            relativeSpreadPct: -2.5,
            listingCount: 5,
            signalStrength: "strong",
            momentum: "flat",
          },
        ],
      }),
    );

    expect(fastWindowResult.action).toBe("can_view");
    expect(slowWindowResult.action).toBe("continue_wait");
  });
});
