import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { z } from "zod";

import { median } from "./metrics";

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

interface ManualSampleWindow {
  startAt: number;
  endAt: number;
}

function readJsonFile(filePath: string): unknown {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

export function validateManualInputFile(
  value: unknown,
  validCommunityIds: ReadonlySet<string>,
  validSegmentIds: ReadonlySet<string>,
): ManualInputFile {
  const parsed = manualInputFileSchema.parse(value);

  for (const sample of parsed.samples) {
    if (!validCommunityIds.has(sample.communityId)) {
      throw new Error(`Unknown communityId: ${sample.communityId}`);
    }

    if (!validSegmentIds.has(sample.segmentId)) {
      throw new Error(`Unknown segmentId: ${sample.segmentId}`);
    }
  }

  return parsed;
}

export function loadAcceptedManualInputFiles(
  acceptedDir: string,
  validCommunityIds: ReadonlySet<string>,
  validSegmentIds: ReadonlySet<string>,
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
  const windowStartDate = new Date(windowEndIso);
  windowStartDate.setUTCHours(0, 0, 0, 0);
  windowStartDate.setUTCDate(windowStartDate.getUTCDate() - 6);
  return summarizeManualSamplesInWindow(
    samples,
    communityId,
    segmentId,
    {
      startAt: windowStartDate.getTime(),
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
      startAt: Date.parse(`${windowStartDate}T00:00:00.000Z`),
      endAt: Date.parse(`${windowEndDate}T23:59:59.999Z`),
    },
  );
}

function summarizeManualSamplesInWindow(
  samples: ManualDealSample[],
  communityId: string,
  segmentId: string,
  window: ManualSampleWindow,
): ManualSampleSummary {
  const matchingSamples = samples.filter((sample) => {
    if (sample.communityId !== communityId || sample.segmentId !== segmentId) {
      return false;
    }

    const sampleAt = Date.parse(sample.sampleAt);
    return sampleAt >= window.startAt && sampleAt <= window.endAt;
  });

  if (matchingSamples.length === 0) {
    return {
      manualDealCount: 0,
      manualDealUnitPriceMedian: null,
      manualLatestSampleAt: null,
    };
  }

  const manualLatestSampleAt = matchingSamples
    .map((sample) => sample.sampleAt)
    .sort()
    .at(-1);

  return {
    manualDealCount: matchingSamples.reduce(
      (total, sample) => total + sample.dealCount,
      0,
    ),
    manualDealUnitPriceMedian: median(
      matchingSamples.map((sample) => sample.dealUnitPriceYuanPerSqm),
    ),
    manualLatestSampleAt: manualLatestSampleAt ?? null,
  };
}
