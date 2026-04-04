import { describe, expect, it } from "vitest";

import { aggregateSegmentWindow } from "../../lib/metrics";

describe("lib/metrics aggregateSegmentWindow", () => {
  it("aggregates daily segment entries into a 7-day verdict window", () => {
    const aggregated = aggregateSegmentWindow(
      [
        {
          date: "2026-03-18",
          listingUnitPriceMedian: 10_300,
          listingUnitPriceMin: 9_800,
          listingsCount: 8,
          suspectedDealCount: 2,
          manualDealCount: 0,
        },
        {
          date: "2026-03-19",
          listingUnitPriceMedian: 10_300,
          listingUnitPriceMin: 9_800,
          listingsCount: 8,
          suspectedDealCount: 2,
          manualDealCount: 0,
        },
        {
          date: "2026-03-20",
          listingUnitPriceMedian: 10_300,
          listingUnitPriceMin: 9_800,
          listingsCount: 8,
          suspectedDealCount: 2,
          manualDealCount: 0,
        },
        {
          date: "2026-03-21",
          listingUnitPriceMedian: 10_300,
          listingUnitPriceMin: 9_800,
          listingsCount: 8,
          suspectedDealCount: 2,
          manualDealCount: 1,
        },
        {
          date: "2026-03-22",
          listingUnitPriceMedian: 10_300,
          listingUnitPriceMin: 9_800,
          listingsCount: 8,
          suspectedDealCount: 2,
          manualDealCount: 1,
        },
        {
          date: "2026-03-23",
          listingUnitPriceMedian: 10_300,
          listingUnitPriceMin: 9_800,
          listingsCount: 8,
          suspectedDealCount: 2,
          manualDealCount: 1,
        },
        {
          date: "2026-03-24",
          listingUnitPriceMedian: 10_050,
          listingUnitPriceMin: 9_500,
          listingsCount: 10,
          suspectedDealCount: 1,
          manualDealCount: 0,
        },
      ],
      "2026-03-18",
      "2026-03-24",
    );

    expect(aggregated).toEqual({
      listingUnitPriceMedian: 10_300,
      listingUnitPriceMin: 9_800,
      listingsCount: 8,
      suspectedDealCount: 2,
      manualDealCount: 1,
    });
  });

  it("preserves sparse fallback listing visibility for a Wanke-like 0 0 2 window", () => {
    const aggregated = aggregateSegmentWindow(
      [
        {
          date: "2026-03-29",
          listingUnitPriceMedian: null,
          listingUnitPriceMin: null,
          listingsCount: 0,
          suspectedDealCount: 0,
          manualDealCount: 0,
        },
        {
          date: "2026-03-30",
          listingUnitPriceMedian: null,
          listingUnitPriceMin: null,
          listingsCount: 0,
          suspectedDealCount: 0,
          manualDealCount: 0,
        },
        {
          date: "2026-03-31",
          listingUnitPriceMedian: null,
          listingUnitPriceMin: null,
          listingsCount: 2,
          suspectedDealCount: 0,
          manualDealCount: 0,
        },
      ],
      "2026-03-25",
      "2026-03-31",
    );

    expect(aggregated).toEqual({
      listingUnitPriceMedian: null,
      listingUnitPriceMin: null,
      listingsCount: 2,
      suspectedDealCount: 0,
      manualDealCount: 0,
    });
  });
});
