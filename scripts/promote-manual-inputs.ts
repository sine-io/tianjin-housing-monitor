import { mkdirSync, readdirSync, readFileSync, renameSync } from "node:fs";
import { resolve } from "node:path";

import { loadCommunities, loadSegments } from "../lib/config";
import { DATA_DIR, resolveDataPaths } from "../lib/paths";
import {
  createManualInputValidationContext,
  validateManualInputFile,
} from "../lib/manual-input";

function parseCommandLineArguments(argv: string[]): { dataDir: string } {
  let dataDir = DATA_DIR;

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
  }

  return { dataDir };
}

async function main(): Promise<void> {
  const { dataDir } = parseCommandLineArguments(process.argv.slice(2));
  const paths = resolveDataPaths(dataDir);
  const communities = loadCommunities(paths.communitiesConfigPath);
  const segments = loadSegments(paths.segmentsConfigPath, communities);
  const validationContext = createManualInputValidationContext(
    communities,
    segments,
  );

  mkdirSync(paths.manualIncomingDir, { recursive: true });
  mkdirSync(paths.manualAcceptedDir, { recursive: true });

  for (const entry of readdirSync(paths.manualIncomingDir).sort()) {
    if (!entry.endsWith(".json")) {
      continue;
    }

    const sourcePath = resolve(paths.manualIncomingDir, entry);
    const targetPath = resolve(paths.manualAcceptedDir, entry);

    try {
      validateManualInputFile(
        JSON.parse(readFileSync(sourcePath, "utf8")) as unknown,
        validationContext.validCommunityIds,
        validationContext.validSegmentIds,
        validationContext.segmentIdByCommunityId,
      );
      renameSync(sourcePath, targetPath);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[promote-manual-inputs] ${entry}: ${message}`);
    }
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
