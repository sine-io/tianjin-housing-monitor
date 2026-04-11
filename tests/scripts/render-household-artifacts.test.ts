import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { resolve } from "node:path";
import { tmpdir } from "node:os";

import { afterEach, describe, expect, it } from "vitest";

const TSX_PATH = resolve("node_modules/.bin/tsx");
const temporaryRoots: string[] = [];

function makeTempPrivateRoot(): string {
  const tempRoot = mkdtempSync(resolve(tmpdir(), "render-household-artifacts-"));
  const privateRoot = resolve(tempRoot, "private-root");
  mkdirSync(resolve(privateRoot, "recommendations", "qinhe-to-meijiang"), {
    recursive: true,
  });
  temporaryRoots.push(tempRoot);
  return privateRoot;
}

function writeRecommendation(privateRoot: string, body: Record<string, unknown>): string {
  const filePath = resolve(
    privateRoot,
    "recommendations",
    "qinhe-to-meijiang",
    "2026-04-11T12-00-00.000Z--snapshot-2026-04-11.json",
  );
  writeFileSync(filePath, JSON.stringify(body, null, 2));
  return filePath;
}

describe("scripts/render-household-artifacts.ts", () => {
  afterEach(() => {
    while (temporaryRoots.length > 0) {
      rmSync(temporaryRoots.pop()!, { recursive: true, force: true });
    }
  });

  it("renders a memo page with recommendation-first hierarchy and a shorter family brief", () => {
    const privateRoot = makeTempPrivateRoot();
    writeRecommendation(privateRoot, {
      schemaVersion: 1,
      householdId: "qinhe-to-meijiang",
      configVersion: "2026-04-11T12:00:00.000Z",
      sourceSnapshotId: "snapshot-2026-04-11",
      generatedAt: "2026-04-11T12:00:00.000Z",
      blocking: { isBlocked: false, reasonCode: null },
      action: "can_view",
      explanation: {
        strongestSupport: [{ label: "支持", summary: "相对价差已进入看房区。" }],
        strongestCounterevidence: [{ label: "反证", summary: "市场仍可能反复。" }],
        flipConditions: [{ label: "翻转", summary: "相对价差进入更深折让区后可升级。" }],
      },
      basketRanking: [
        {
          communityId: "mingquan-huayuan",
          displayName: "鸣泉花园",
          score: 24,
          reasoning: "相对价差 -4.0%，strong 证据，动能 flat",
        },
      ],
      trace: {
        matchedRuleIds: ["action-can-view"],
        blockingChecks: [{ reasonCode: "insufficient_evidence", triggered: false }],
        notes: ["top-target:mingquan-huayuan"],
      },
    });

    execFileSync(
      TSX_PATH,
      ["scripts/render-household-artifacts.ts", "--private-root", privateRoot],
      { cwd: resolve("."), stdio: "pipe" },
    );

    const memoPath = resolve(
      privateRoot,
      "output",
      "qinhe-to-meijiang",
      "2026-04-11T12-00-00.000Z--snapshot-2026-04-11",
      "memo.html",
    );
    const briefPath = resolve(
      privateRoot,
      "output",
      "qinhe-to-meijiang",
      "2026-04-11T12-00-00.000Z--snapshot-2026-04-11",
      "family-brief.html",
    );

    expect(readFileSync(memoPath, "utf8")).toContain("<h1>可以看房</h1>");
    expect(readFileSync(memoPath, "utf8")).toContain("最强支持证据");
    expect(readFileSync(briefPath, "utf8")).toContain("这是给家人看的简版结论。");
    expect(readFileSync(briefPath, "utf8")).toContain("最强理由");
  }, 15_000);

  it("renders blocking outputs without stale action advice", () => {
    const privateRoot = makeTempPrivateRoot();
    writeRecommendation(privateRoot, {
      schemaVersion: 1,
      householdId: "qinhe-to-meijiang",
      configVersion: "2026-04-11T12:00:00.000Z",
      sourceSnapshotId: "snapshot-2026-04-11",
      generatedAt: "2026-04-11T12:00:00.000Z",
      blocking: { isBlocked: true, reasonCode: "insufficient_evidence" },
      action: null,
      explanation: {
        strongestSupport: [],
        strongestCounterevidence: [{ label: "样本不足", summary: "当前不建议依据这次结果行动。" }],
        flipConditions: [{ label: "恢复判断", summary: "补足样本后重算。" }],
      },
      basketRanking: [],
      trace: {
        matchedRuleIds: [],
        blockingChecks: [{ reasonCode: "insufficient_evidence", triggered: true }],
        notes: ["top-target:none"],
      },
    });

    execFileSync(
      TSX_PATH,
      ["scripts/render-household-artifacts.ts", "--private-root", privateRoot],
      { cwd: resolve("."), stdio: "pipe" },
    );

    const memoPath = resolve(
      privateRoot,
      "output",
      "qinhe-to-meijiang",
      "2026-04-11T12-00-00.000Z--snapshot-2026-04-11",
      "memo.html",
    );
    const briefPath = resolve(
      privateRoot,
      "output",
      "qinhe-to-meijiang",
      "2026-04-11T12-00-00.000Z--snapshot-2026-04-11",
      "family-brief.html",
    );

    expect(readFileSync(memoPath, "utf8")).toContain("暂不判断");
    expect(readFileSync(memoPath, "utf8")).not.toContain("可以看房");
    expect(readFileSync(briefPath, "utf8")).toContain("当前先不要依据这次结果行动。");
  }, 15_000);

  it("writes an operator audit artifact with trace details", () => {
    const privateRoot = makeTempPrivateRoot();
    writeRecommendation(privateRoot, {
      schemaVersion: 1,
      householdId: "qinhe-to-meijiang",
      configVersion: "2026-04-11T12:00:00.000Z",
      sourceSnapshotId: "snapshot-2026-04-11",
      generatedAt: "2026-04-11T12:00:00.000Z",
      blocking: { isBlocked: false, reasonCode: null },
      action: "continue_wait",
      explanation: {
        strongestSupport: [{ label: "支持", summary: "继续等待更稳。" }],
        strongestCounterevidence: [{ label: "反证", summary: "也许会错过窗口。" }],
        flipConditions: [{ label: "翻转", summary: "价差进入 -3% 及以下时升级。" }],
      },
      basketRanking: [],
      trace: {
        matchedRuleIds: ["default-continue-wait"],
        blockingChecks: [{ reasonCode: "insufficient_evidence", triggered: false }],
        notes: ["top-target:mingquan-huayuan", "action:continue_wait"],
      },
    });

    execFileSync(
      TSX_PATH,
      ["scripts/render-household-artifacts.ts", "--private-root", privateRoot],
      { cwd: resolve("."), stdio: "pipe" },
    );

    const auditPath = resolve(
      privateRoot,
      "audit",
      "qinhe-to-meijiang",
      "2026-04-11T12-00-00.000Z--snapshot-2026-04-11.md",
    );

    expect(existsSync(auditPath)).toBe(true);
    expect(readFileSync(auditPath, "utf8")).toContain("Matched Rules");
    expect(readFileSync(auditPath, "utf8")).toContain("default-continue-wait");
  }, 15_000);

  it("fails cleanly on malformed recommendation results without generating partial output", () => {
    const privateRoot = makeTempPrivateRoot();
    writeRecommendation(privateRoot, {
      schemaVersion: 1,
      householdId: "qinhe-to-meijiang",
      generatedAt: "2026-04-11T12:00:00.000Z",
    });

    expect(() =>
      execFileSync(
        TSX_PATH,
        ["scripts/render-household-artifacts.ts", "--private-root", privateRoot],
        { cwd: resolve("."), stdio: "pipe" },
      ),
    ).toThrow();

    expect(existsSync(resolve(privateRoot, "output", "qinhe-to-meijiang"))).toBe(
      false,
    );
  }, 15_000);
});
