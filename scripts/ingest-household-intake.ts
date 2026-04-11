import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  buildRawHouseholdIntakeArtifact,
  validateHouseholdIntake,
} from "../lib/household-config";
import { resolvePrivateArtifactPaths } from "../lib/paths";

const PRIVATE_ROOT_ENV_VAR = "PROPPULSE_PRIVATE_ROOT";

interface CommandLineArguments {
  inputPath: string;
  privateRoot: string;
}

function parseCommandLineArguments(argv: string[]): CommandLineArguments {
  let inputPath: string | undefined;
  let privateRoot = process.env[PRIVATE_ROOT_ENV_VAR];

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    if (argument === "--input-path") {
      const candidate = argv[index + 1];

      if (!candidate || candidate.startsWith("-")) {
        throw new Error("--input-path requires a path");
      }

      inputPath = resolve(candidate);
      index += 1;
      continue;
    }

    if (argument === "--private-root") {
      const candidate = argv[index + 1];

      if (!candidate || candidate.startsWith("-")) {
        throw new Error("--private-root requires a path");
      }

      privateRoot = candidate;
      index += 1;
    }
  }

  if (!inputPath) {
    throw new Error("--input-path is required");
  }

  if (!privateRoot) {
    throw new Error(`--private-root or ${PRIVATE_ROOT_ENV_VAR} is required`);
  }

  return {
    inputPath,
    privateRoot: resolve(privateRoot),
  };
}

function readJsonFile(filePath: string): unknown {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function makeRawArtifactPath(
  rawIntakeDir: string,
  householdId: string,
  submittedAt: string,
): string {
  const safeTimestamp = submittedAt.replaceAll(":", "-");
  return resolve(rawIntakeDir, `${householdId}-${safeTimestamp}.json`);
}

async function main(): Promise<void> {
  const { inputPath, privateRoot } = parseCommandLineArguments(process.argv.slice(2));
  const artifactPaths = resolvePrivateArtifactPaths(privateRoot);
  const intake = validateHouseholdIntake(readJsonFile(inputPath));
  const rawArtifact = buildRawHouseholdIntakeArtifact(intake);
  const outputPath = makeRawArtifactPath(
    artifactPaths.rawIntakeDir,
    rawArtifact.householdId,
    rawArtifact.submittedAt,
  );

  mkdirSync(artifactPaths.rawIntakeDir, { recursive: true });
  writeFileSync(outputPath, JSON.stringify(rawArtifact, null, 2));
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
