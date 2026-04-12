import { describe, expect, it } from "vitest";

import {
  assertKnownTargetBasketCommunityIds,
  classifyAnchorFreshness,
  HOUSEHOLD_CONFIG_SCHEMA_VERSION,
  validateHouseholdConfig,
} from "../../lib/household-config";
import { defaultPublicDataDir, resolveDataPaths, resolvePrivateArtifactPaths } from "../../lib/paths";

describe("lib/household-config validateHouseholdConfig", () => {
  it("accepts a canonical household config", () => {
    expect(
      validateHouseholdConfig({
        schemaVersion: HOUSEHOLD_CONFIG_SCHEMA_VERSION,
        householdId: "qinhe-to-meijiang",
        configVersion: "2026-04-11T12:00:00.000Z",
        updatedAt: "2026-04-11T12:00:00.000Z",
        currentHome: {
          anchorPriceWan: 210,
          anchorUpdatedAt: "2026-04-10T12:00:00.000Z",
        },
        targetBasket: [
          { communityId: "mingquan-huayuan" },
          { communityId: "boxi-huayuan" },
        ],
        decisionWindowMonths: 6,
      }),
    ).toEqual({
      schemaVersion: HOUSEHOLD_CONFIG_SCHEMA_VERSION,
      householdId: "qinhe-to-meijiang",
      configVersion: "2026-04-11T12:00:00.000Z",
      updatedAt: "2026-04-11T12:00:00.000Z",
      currentHome: {
        anchorPriceWan: 210,
        anchorUpdatedAt: "2026-04-10T12:00:00.000Z",
      },
      targetBasket: [
        { communityId: "mingquan-huayuan" },
        { communityId: "boxi-huayuan" },
      ],
      decisionWindowMonths: 6,
    });
  });

  it("rejects duplicate target basket communities", () => {
    expect(() =>
      validateHouseholdConfig({
        schemaVersion: HOUSEHOLD_CONFIG_SCHEMA_VERSION,
        householdId: "qinhe-to-meijiang",
        configVersion: "2026-04-11T12:00:00.000Z",
        updatedAt: "2026-04-11T12:00:00.000Z",
        currentHome: {
          anchorPriceWan: 210,
          anchorUpdatedAt: "2026-04-10T12:00:00.000Z",
        },
        targetBasket: [
          { communityId: "mingquan-huayuan" },
          { communityId: "mingquan-huayuan" },
        ],
        decisionWindowMonths: 6,
      }),
    ).toThrow("Duplicate target basket communityId: mingquan-huayuan");
  });

  it("rejects missing anchor price, invalid windows, and empty baskets", () => {
    expect(() =>
      validateHouseholdConfig({
        schemaVersion: HOUSEHOLD_CONFIG_SCHEMA_VERSION,
        householdId: "qinhe-to-meijiang",
        configVersion: "2026-04-11T12:00:00.000Z",
        updatedAt: "2026-04-11T12:00:00.000Z",
        currentHome: {
          anchorUpdatedAt: "2026-04-10T12:00:00.000Z",
        },
        targetBasket: [],
        decisionWindowMonths: 5,
      }),
    ).toThrow();
  });
});

describe("lib/household-config assertKnownTargetBasketCommunityIds", () => {
  it("accepts community ids present in the allowlist", () => {
    expect(() =>
      assertKnownTargetBasketCommunityIds(
        [{ communityId: "mingquan-huayuan" }],
        new Set(["mingquan-huayuan"]),
      ),
    ).not.toThrow();
  });

  it("rejects unknown community ids", () => {
    expect(() =>
      assertKnownTargetBasketCommunityIds(
        [{ communityId: "unknown-community" }],
        new Set(["mingquan-huayuan"]),
      ),
    ).toThrow("Unknown target basket communityId: unknown-community");
  });
});

describe("lib/household-config classifyAnchorFreshness", () => {
  it("marks recent anchors as fresh", () => {
    expect(
      classifyAnchorFreshness(
        "2026-04-10T12:00:00.000Z",
        "2026-04-11T12:00:00.000Z",
      ),
    ).toBe("fresh");
  });

  it("marks old anchors as stale", () => {
    expect(
      classifyAnchorFreshness(
        "2025-12-31T12:00:00.000Z",
        "2026-04-11T12:00:00.000Z",
      ),
    ).toBe("stale");
  });

  it("marks future anchors explicitly instead of coercing them", () => {
    expect(
      classifyAnchorFreshness(
        "2026-04-12T12:00:00.000Z",
        "2026-04-11T12:00:00.000Z",
      ),
    ).toBe("future");
  });
});

describe("lib/paths private artifact helpers", () => {
  it("resolves private artifact paths without changing existing public data paths", () => {
    expect(resolveDataPaths()).toMatchObject({
      publicDir: defaultPublicDataDir(),
    });

    expect(resolvePrivateArtifactPaths(".tmp/private-root")).toEqual({
      privateRoot: expect.stringMatching(/\.tmp\/private-root$/),
      rawIntakeDir: expect.stringMatching(/\.tmp\/private-root\/raw-intake$/),
      householdsDir: expect.stringMatching(/\.tmp\/private-root\/households$/),
      householdsCurrentDir: expect.stringMatching(
        /\.tmp\/private-root\/households\/current$/,
      ),
      householdsHistoryDir: expect.stringMatching(
        /\.tmp\/private-root\/households\/history$/,
      ),
      recommendationsDir: expect.stringMatching(
        /\.tmp\/private-root\/recommendations$/,
      ),
      auditDir: expect.stringMatching(/\.tmp\/private-root\/audit$/),
      outputDir: expect.stringMatching(/\.tmp\/private-root\/output$/),
    });
  });
});
