import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const NODE24_ACTIONS_ENV_BLOCK = `env:
  FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: true`;

function readWorkflow(relativePath: string): string {
  return readFileSync(resolve(relativePath), "utf8");
}

describe("GitHub workflow Node24 opt-in", () => {
  it("requires workflow-dispatched JavaScript actions to opt into Node24", () => {
    const workflowPaths = [
      ".github/workflows/manual-input.yml",
      ".github/workflows/collect.yml",
      ".github/workflows/weekly-report.yml",
      ".github/workflows/deploy-pages.yml",
    ];

    for (const workflowPath of workflowPaths) {
      expect(readWorkflow(workflowPath)).toContain(NODE24_ACTIONS_ENV_BLOCK);
    }
  });
});
