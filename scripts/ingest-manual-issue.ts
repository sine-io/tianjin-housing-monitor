import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { loadCommunities, loadSegments } from "../lib/config";
import {
  createManualInputValidationContext,
  validateManualInputFile,
} from "../lib/manual-input";
import { DATA_DIR, resolveDataPaths } from "../lib/paths";

interface CommandLineArguments {
  dataDir: string;
  eventPath?: string;
}

interface GitHubIssueEventPayload {
  issue?: {
    number?: number;
    created_at?: string;
    body?: string;
  };
}

interface ParsedIssuePayload {
  number: number;
  created_at: string;
  body: string;
}

const SECTION_LABELS = {
  community: "Community",
  segment: "Segment",
  sampleDate: "Sample date",
  dealUnitPrice: "Deal unit price (yuan/sqm)",
  evidenceUrl: "Evidence URL",
} as const;

function parseCommandLineArguments(argv: string[]): CommandLineArguments {
  let dataDir = DATA_DIR;
  let eventPath: string | undefined;

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    if (argument === "--data-dir") {
      const candidate = argv[index + 1];

      if (!candidate || candidate.startsWith("-")) {
        throw new Error("--data-dir requires a path");
      }

      dataDir = resolve(candidate);
      index += 1;
    }

    if (argument === "--event-path") {
      const candidate = argv[index + 1];

      if (!candidate || candidate.startsWith("-")) {
        throw new Error("--event-path requires a path");
      }

      eventPath = resolve(candidate);
      index += 1;
    }
  }

  return { dataDir, eventPath };
}

function parseIssueSections(body: string): Map<string, string> {
  const sections = new Map<string, string>();
  const normalizedBody = body.replace(/\r\n/g, "\n").trim();

  for (const block of normalizedBody.split(/^###\s+/m).filter(Boolean)) {
    const [rawLabel, ...valueLines] = block.split("\n");
    sections.set(rawLabel.trim(), valueLines.join("\n").trim());
  }

  return sections;
}

function requireSection(
  sections: ReadonlyMap<string, string>,
  label: string,
): string {
  const value = sections.get(label)?.trim();

  if (!value || value === "_No response_") {
    throw new Error(`Missing issue form field: ${label}`);
  }

  return value;
}

function extractIdentifier(value: string): string {
  const identifierMatch = value.match(/\(([^()]+)\)\s*$/);
  return (identifierMatch?.[1] ?? value).trim();
}

function parseIsoDate(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`Expected YYYY-MM-DD date, received: ${value}`);
  }

  const isoDate = `${value}T00:00:00.000Z`;

  if (new Date(isoDate).toISOString() !== isoDate) {
    throw new Error(`Invalid sample date: ${value}`);
  }

  return isoDate;
}

function parsePositiveInteger(value: string, fieldName: string): number {
  const normalizedValue = value.replace(/[,\s_，]/g, "");

  if (!/^\d+$/.test(normalizedValue)) {
    throw new Error(`Expected a whole number for ${fieldName}, received: ${value}`);
  }

  const parsedValue = Number.parseInt(normalizedValue, 10);

  if (!Number.isSafeInteger(parsedValue) || parsedValue <= 0) {
    throw new Error(`Expected a positive integer for ${fieldName}, received: ${value}`);
  }

  return parsedValue;
}

function parseEvidenceUrl(value: string): string {
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(value);
  } catch {
    throw new Error(`Invalid evidence URL: ${value}`);
  }

  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    throw new Error(`Evidence URL must use http or https: ${value}`);
  }

  return parsedUrl.toString();
}

function readIssuePayload(eventPath: string): ParsedIssuePayload {
  const payload = JSON.parse(readFileSync(eventPath, "utf8")) as GitHubIssueEventPayload;
  const issue = payload.issue;

  if (!issue) {
    throw new Error("Missing issue payload");
  }

  const issueNumber = issue.number;
  if (
    typeof issueNumber !== "number" ||
    !Number.isInteger(issueNumber) ||
    issueNumber <= 0
  ) {
    throw new Error("Issue payload is missing a valid issue number");
  }

  const createdAt = issue.created_at;
  if (typeof createdAt !== "string" || Number.isNaN(Date.parse(createdAt))) {
    throw new Error("Issue payload is missing a valid created_at timestamp");
  }

  const body = issue.body;
  if (typeof body !== "string" || body.trim().length === 0) {
    throw new Error("Issue payload is missing an issue body");
  }

  return {
    number: issueNumber,
    created_at: createdAt,
    body,
  };
}

async function main(): Promise<void> {
  const { dataDir, eventPath } = parseCommandLineArguments(process.argv.slice(2));
  const resolvedEventPath = eventPath ?? process.env.GITHUB_EVENT_PATH;

  if (!resolvedEventPath) {
    throw new Error("GITHUB_EVENT_PATH or --event-path is required");
  }

  const paths = resolveDataPaths(dataDir);
  const communities = loadCommunities(paths.communitiesConfigPath);
  const segments = loadSegments(paths.segmentsConfigPath, communities);
  const validationContext = createManualInputValidationContext(
    communities,
    segments,
  );
  const issue = readIssuePayload(resolve(resolvedEventPath));
  const sections = parseIssueSections(issue.body);
  const communityId = extractIdentifier(
    requireSection(sections, SECTION_LABELS.community),
  );
  const segmentId = extractIdentifier(requireSection(sections, SECTION_LABELS.segment));
  const sampleAt = parseIsoDate(requireSection(sections, SECTION_LABELS.sampleDate));
  const dealUnitPriceYuanPerSqm = parsePositiveInteger(
    requireSection(sections, SECTION_LABELS.dealUnitPrice),
    SECTION_LABELS.dealUnitPrice,
  );
  const evidenceUrl = parseEvidenceUrl(
    requireSection(sections, SECTION_LABELS.evidenceUrl),
  );

  const manualInput = validateManualInputFile(
    {
      source: evidenceUrl,
      submittedAt: issue.created_at,
      samples: [
        {
          communityId,
          segmentId,
          sampleAt,
          dealCount: 1,
          dealUnitPriceYuanPerSqm,
        },
      ],
    },
    validationContext.validCommunityIds,
    validationContext.validSegmentIds,
    validationContext.segmentIdByCommunityId,
  );

  mkdirSync(paths.manualIncomingDir, { recursive: true });

  writeFileSync(
    resolve(paths.manualIncomingDir, `${issue.number}.json`),
    JSON.stringify(manualInput, null, 2),
  );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
