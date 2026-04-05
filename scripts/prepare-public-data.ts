import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { resolve } from "node:path";

import { DATA_DIR, resolveDataPaths } from "../lib/paths";

function parseCommandLineArguments(argv: string[]): {
  dataDir: string;
  publicDataDir?: string;
} {
  let dataDir = DATA_DIR;
  let publicDataDir: string | undefined;

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

    if (argument === "--public-data-dir") {
      const candidate = argv[index + 1];

      if (!candidate || candidate.startsWith("-")) {
        throw new Error("--public-data-dir requires a path");
      }

      publicDataDir = resolve(candidate);
      index += 1;
    }
  }

  return { dataDir, publicDataDir };
}

async function main(): Promise<void> {
  const { dataDir, publicDataDir } = parseCommandLineArguments(
    process.argv.slice(2),
  );
  const paths = resolveDataPaths(dataDir, publicDataDir);
  const legacyPublicDir = resolve(paths.dataDir, "public");

  if (legacyPublicDir !== paths.publicDir) {
    rmSync(legacyPublicDir, { recursive: true, force: true });
  }

  rmSync(paths.publicDir, { recursive: true, force: true });
  mkdirSync(paths.publicDir, { recursive: true });

  if (existsSync(paths.configDir)) {
    cpSync(paths.configDir, resolve(paths.publicDir, "config"), { recursive: true });
  }

  if (existsSync(paths.seriesDir)) {
    cpSync(paths.seriesDir, resolve(paths.publicDir, "series"), { recursive: true });
  }

  if (existsSync(paths.reportsDir)) {
    cpSync(paths.reportsDir, resolve(paths.publicDir, "reports"), {
      recursive: true,
    });
  }

  if (existsSync(paths.runsDir)) {
    const publicRunsDir = resolve(paths.publicDir, "runs");
    const runFiles = readdirSync(paths.runsDir)
      .filter((entry) => entry.endsWith(".json") && entry !== "index.json")
      .sort();
    const indexedRunFiles = runFiles.filter((entry) => entry !== "latest.json");
    const runIndexJson = JSON.stringify({ files: indexedRunFiles }, null, 2);

    cpSync(paths.runsDir, publicRunsDir, { recursive: true });
    writeFileSync(resolve(paths.runsDir, "index.json"), runIndexJson);
    writeFileSync(resolve(publicRunsDir, "index.json"), runIndexJson);
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
