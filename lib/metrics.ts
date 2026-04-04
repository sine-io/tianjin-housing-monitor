export function median(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }

  const sorted = [...values].sort((left, right) => left - right);
  const middleIndex = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 1) {
    return sorted[middleIndex] ?? null;
  }

  const left = sorted[middleIndex - 1];
  const right = sorted[middleIndex];

  if (left === undefined || right === undefined) {
    return null;
  }

  return (left + right) / 2;
}

export function percentageChange(
  previous: number | null | undefined,
  next: number | null | undefined,
): number | null {
  if (
    previous === null ||
    previous === undefined ||
    next === null ||
    next === undefined ||
    previous === 0
  ) {
    return null;
  }

  return ((next - previous) / previous) * 100;
}

export function inventoryDelta(previous: number, next: number): {
  difference: number;
  percent: number | null;
  isSignificant: boolean;
  isRise: boolean;
  isFall: boolean;
} {
  const difference = next - previous;
  const percent = previous === 0 ? null : (difference / previous) * 100;
  const isSignificant =
    Math.abs(difference) >= 2 || (percent !== null && Math.abs(percent) >= 10);

  return {
    difference,
    percent,
    isSignificant,
    isRise: isSignificant && difference > 0,
    isFall: isSignificant && difference < 0,
  };
}

export interface SegmentWindowObservation {
  date: string;
  listingUnitPriceMedian: number | null;
  listingUnitPriceMin: number | null;
  listingsCount: number;
  suspectedDealCount?: number | null;
  manualDealCount?: number | null;
}

export interface AggregatedSegmentWindow {
  listingUnitPriceMedian: number | null;
  listingUnitPriceMin: number | null;
  listingsCount: number;
  suspectedDealCount: number;
  manualDealCount: number;
}

function maxOrZero(values: Array<number | null | undefined>): number {
  return values.reduce<number>((maximum, value) => {
    if (value === null || value === undefined) {
      return maximum;
    }

    return Math.max(maximum, value);
  }, 0);
}

function aggregateListingsCount(entries: SegmentWindowObservation[]): number {
  const medianCount = Math.round(median(entries.map((entry) => entry.listingsCount)) ?? 0);

  if (medianCount > 0) {
    return medianCount;
  }

  return maxOrZero(entries.map((entry) => entry.listingsCount));
}

export function aggregateSegmentWindow(
  entries: SegmentWindowObservation[],
  windowStart: string,
  windowEnd: string,
): AggregatedSegmentWindow {
  const windowEntries = entries.filter(
    (entry) => entry.date >= windowStart && entry.date <= windowEnd,
  );

  if (windowEntries.length === 0) {
    return {
      listingUnitPriceMedian: null,
      listingUnitPriceMin: null,
      listingsCount: 0,
      suspectedDealCount: 0,
      manualDealCount: 0,
    };
  }

  return {
    listingUnitPriceMedian: median(
      windowEntries
        .map((entry) => entry.listingUnitPriceMedian)
        .filter((value): value is number => value !== null),
    ),
    listingUnitPriceMin: median(
      windowEntries
        .map((entry) => entry.listingUnitPriceMin)
        .filter((value): value is number => value !== null),
    ),
    listingsCount: aggregateListingsCount(windowEntries),
    suspectedDealCount: maxOrZero(
      windowEntries.map((entry) => entry.suspectedDealCount),
    ),
    manualDealCount: maxOrZero(
      windowEntries.map((entry) => entry.manualDealCount),
    ),
  };
}
