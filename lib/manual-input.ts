import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { z } from "zod";

import { median } from "./metrics";
import type { Community, SegmentTemplate } from "./types";

const isoDateTimeSchema = z.string().refine((value) => !Number.isNaN(Date.parse(value)), {
  message: "Expected an ISO-8601 datetime string",
});

const manualDealSampleSchema = z
  .object({
    communityId: z.string().min(1),
    segmentId: z.string().min(1),
    sampleAt: isoDateTimeSchema,
    dealCount: z.number().int().positive(),
    dealUnitPriceYuanPerSqm: z.number().int().positive(),
  })
  .strict();

const manualInputFileSchema = z
  .object({
    source: z.string().min(1),
    submittedAt: isoDateTimeSchema,
    samples: z.array(manualDealSampleSchema).min(1),
  })
  .strict();

export type ManualDealSample = z.infer<typeof manualDealSampleSchema>;
export type ManualInputFile = z.infer<typeof manualInputFileSchema>;

export interface ManualSampleSummary {
  manualDealCount: number;
  manualDealUnitPriceMedian: number | null;
  manualLatestSampleAt: string | null;
}

export interface ManualInputValidationContext {
  validCommunityIds: ReadonlySet<string>;
  validSegmentIds: ReadonlySet<string>;
  segmentIdByCommunityId: ReadonlyMap<string, string>;
}

const TIANJIN_UTC_OFFSET_HOURS = 8;
const TIANJIN_UTC_OFFSET_MILLISECONDS =
  TIANJIN_UTC_OFFSET_HOURS * 60 * 60 * 1000;

interface ManualSampleWindow {
  startAt: number;
  endAt: number;
}

interface MatchingManualDealSample {
  sample: ManualDealSample;
  sampleAt: number;
}

export function createSegmentIdByCommunityId(
  segments: readonly SegmentTemplate[],
): ReadonlyMap<string, string> {
  return new Map(
    segments.map((segment) => [segment.communityId, segment.id] as const),
  );
}

export function createManualInputValidationContext(
  communities: readonly Community[],
  segments: readonly SegmentTemplate[],
): ManualInputValidationContext {
  return {
    validCommunityIds: new Set(communities.map((community) => community.id)),
    validSegmentIds: new Set(segments.map((segment) => segment.id)),
    segmentIdByCommunityId: createSegmentIdByCommunityId(segments),
  };
}

function readJsonFile(filePath: string): unknown {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function formatIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function shiftIsoDate(dateString: string, offsetDays: number): string {
  const date = new Date(`${dateString}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return formatIsoDate(date);
}

function getTianjinLocalDate(isoDateTime: string): string {
  const instant = Date.parse(isoDateTime);
  return formatIsoDate(new Date(instant + TIANJIN_UTC_OFFSET_MILLISECONDS));
}

function getTianjinDayWindow(dateString: string): ManualSampleWindow {
  return {
    startAt: Date.parse(`${dateString}T00:00:00.000+08:00`),
    endAt: Date.parse(`${dateString}T23:59:59.999+08:00`),
  };
}

export function validateManualInputFile(
  value: unknown,
  validCommunityIds: ReadonlySet<string>,
  validSegmentIds: ReadonlySet<string>,
  segmentIdByCommunityId?: ReadonlyMap<string, string>,
): ManualInputFile {
  const parsed = manualInputFileSchema.parse(value);

  for (const sample of parsed.samples) {
    if (!validCommunityIds.has(sample.communityId)) {
      throw new Error(`Unknown communityId: ${sample.communityId}`);
    }

    if (!validSegmentIds.has(sample.segmentId)) {
      throw new Error(`Unknown segmentId: ${sample.segmentId}`);
    }

    const expectedSegmentId = segmentIdByCommunityId?.get(sample.communityId);

    if (
      expectedSegmentId !== undefined &&
      sample.segmentId !== expectedSegmentId
    ) {
      throw new Error(
        `Segment ${sample.segmentId} does not belong to community ${sample.communityId}`,
      );
    }
  }

  return parsed;
}

export function loadAcceptedManualInputFiles(
  acceptedDir: string,
  validCommunityIds: ReadonlySet<string>,
  validSegmentIds: ReadonlySet<string>,
  segmentIdByCommunityId?: ReadonlyMap<string, string>,
): ManualDealSample[] {
  return readdirSync(acceptedDir)
    .filter((entry) => entry.endsWith(".json"))
    .sort()
    .flatMap((entry) => {
      const filePath = resolve(acceptedDir, entry);
      const parsed = validateManualInputFile(
        readJsonFile(filePath),
        validCommunityIds,
        validSegmentIds,
        segmentIdByCommunityId,
      );

      return parsed.samples;
    });
}

export function summarizeManualSamples(
  samples: ManualDealSample[],
  communityId: string,
  segmentId: string,
  windowEndIso: string,
): ManualSampleSummary {
  const windowEnd = Date.parse(windowEndIso);
  const windowEndDate = getTianjinLocalDate(windowEndIso);
  const windowStartDate = shiftIsoDate(windowEndDate, -6);
  return summarizeManualSamplesInWindow(
    samples,
    communityId,
    segmentId,
    {
      startAt: getTianjinDayWindow(windowStartDate).startAt,
      endAt: windowEnd,
    },
  );
}

export function summarizeManualSamplesInDateRange(
  samples: ManualDealSample[],
  communityId: string,
  segmentId: string,
  windowStartDate: string,
  windowEndDate: string,
): ManualSampleSummary {
  return summarizeManualSamplesInWindow(
    samples,
    communityId,
    segmentId,
    {
      startAt: getTianjinDayWindow(windowStartDate).startAt,
      endAt: getTianjinDayWindow(windowEndDate).endAt,
    },
  );
}

function summarizeManualSamplesInWindow(
  samples: ManualDealSample[],
  communityId: string,
  segmentId: string,
  window: ManualSampleWindow,
): ManualSampleSummary {
  const matchingSamples: MatchingManualDealSample[] = samples.flatMap((sample) => {
    if (sample.communityId !== communityId || sample.segmentId !== segmentId) {
      return [];
    }

    const sampleAt = Date.parse(sample.sampleAt);
    if (sampleAt < window.startAt || sampleAt > window.endAt) {
      return [];
    }

    return [{ sample, sampleAt }];
  });

  if (matchingSamples.length === 0) {
    return {
      manualDealCount: 0,
      manualDealUnitPriceMedian: null,
      manualLatestSampleAt: null,
    };
  }

  const latestSample = matchingSamples.reduce((latest, current) =>
    current.sampleAt > latest.sampleAt ? current : latest,
  );

  return {
    manualDealCount: matchingSamples.reduce(
      (total, { sample }) => total + sample.dealCount,
      0,
    ),
    manualDealUnitPriceMedian: median(
      matchingSamples.map(({ sample }) => sample.dealUnitPriceYuanPerSqm),
    ),
    manualLatestSampleAt: latestSample.sample.sampleAt,
  };
}
