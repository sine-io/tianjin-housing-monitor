import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const SHARED_WRITE_CONCURRENCY_BLOCK = `concurrency:
  group: repo-main-write-serialization
  cancel-in-progress: false`;
const HARDENED_INSTALL_STEP = `      - name: Install dependencies
        run: |
          npm install -g npm@10.9.4
          npm cache clean --force
          npm install --no-fund --no-audit`;

function readWorkflow(relativePath: string): string {
  return readFileSync(resolve(relativePath), "utf8");
}

describe("GitHub automation workflows", () => {
  it("gates manual-input writes to trusted issue authors", () => {
    const workflow = readWorkflow(".github/workflows/manual-input.yml");

    expect(workflow).toContain("github.event.issue.author_association");
    expect(workflow).toContain("OWNER");
    expect(workflow).toContain("MEMBER");
    expect(workflow).toContain("COLLABORATOR");
  });

  it("serializes mutating workflows through one shared concurrency group", () => {
    const workflowPaths = [
      ".github/workflows/manual-input.yml",
      ".github/workflows/collect.yml",
      ".github/workflows/weekly-report.yml",
    ];

    for (const workflowPath of workflowPaths) {
      expect(readWorkflow(workflowPath)).toContain(SHARED_WRITE_CONCURRENCY_BLOCK);
    }
  });

  it("pins npm before running clean installs in node-based workflows", () => {
    const workflowPaths = [
      ".github/workflows/manual-input.yml",
      ".github/workflows/collect.yml",
      ".github/workflows/weekly-report.yml",
      ".github/workflows/deploy-pages.yml",
    ];

    for (const workflowPath of workflowPaths) {
      const workflow = readWorkflow(workflowPath);

      expect(workflow).not.toContain("cache: npm");
      expect(workflow).not.toContain("npm ci");
      expect(workflow).toContain(HARDENED_INSTALL_STEP);
    }
  });

  it("builds pages before configuring the pages environment", () => {
    const workflow = readWorkflow(".github/workflows/deploy-pages.yml");
    const expectedStepOrder = [
      "      - name: Check out main",
      "      - name: Set up Node.js",
      "      - name: Install dependencies",
      "      - name: Build static site",
      "      - name: Configure Pages",
      "      - name: Upload Pages artifact",
    ];

    const stepPositions = expectedStepOrder.map((step) => workflow.indexOf(step));

    for (const position of stepPositions) {
      expect(position).toBeGreaterThanOrEqual(0);
    }

    for (let index = 1; index < stepPositions.length; index += 1) {
      expect(stepPositions[index]).toBeGreaterThan(stepPositions[index - 1]);
    }
  });
});
