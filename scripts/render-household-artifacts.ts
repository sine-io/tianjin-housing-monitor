import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { resolvePrivateArtifactPaths } from "../lib/paths";
import {
  validateRecommendationResult,
  type RecommendationResult,
} from "../lib/recommendation-types";

const PRIVATE_ROOT_ENV_VAR = "PROPPULSE_PRIVATE_ROOT";

interface CommandLineArguments {
  privateRoot: string;
}

function parseCommandLineArguments(argv: string[]): CommandLineArguments {
  let privateRoot = process.env[PRIVATE_ROOT_ENV_VAR];

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    if (argument === "--private-root") {
      const candidate = argv[index + 1];

      if (!candidate || candidate.startsWith("-")) {
        throw new Error("--private-root requires a path");
      }

      privateRoot = candidate;
      index += 1;
    }
  }

  if (!privateRoot) {
    throw new Error(`--private-root or ${PRIVATE_ROOT_ENV_VAR} is required`);
  }

  return {
    privateRoot: resolve(privateRoot),
  };
}

function readJsonFile<T>(filePath: string): T {
  return JSON.parse(readFileSync(filePath, "utf8")) as T;
}

function formatAction(action: RecommendationResult["action"]): string {
  switch (action) {
    case "continue_wait":
      return "继续等";
    case "can_view":
      return "可以看房";
    case "can_negotiate":
      return "可以谈价";
    case null:
      return "暂不判断";
  }
}

function formatEvidenceList(
  title: string,
  items: RecommendationResult["explanation"]["strongestSupport"],
): string {
  const content =
    items.length > 0
      ? `<ul>${items
          .map((item) => `<li><strong>${item.label}</strong>：${item.summary}</li>`)
          .join("")}</ul>`
      : "<p>暂无</p>";

  return `<section><h2>${title}</h2>${content}</section>`;
}

function renderMemoPage(result: RecommendationResult): string {
  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <title>${result.householdId} recommendation memo</title>
  </head>
  <body>
    <main>
      <h1>${formatAction(result.action)}</h1>
      <p>生成时间：${result.generatedAt}</p>
      ${
        result.blocking.isBlocked
          ? `<p>当前不建议依据这次结果行动。原因：${result.blocking.reasonCode}</p>`
          : "<p>这是当前家庭级置换动作建议。</p>"
      }
      ${formatEvidenceList("最强支持证据", result.explanation.strongestSupport)}
      ${formatEvidenceList("最强反证", result.explanation.strongestCounterevidence)}
      ${formatEvidenceList("结论翻转条件", result.explanation.flipConditions)}
      <section>
        <h2>目标小区篮子排序</h2>
        <ol>
          ${result.basketRanking
            .map(
              (entry) =>
                `<li><strong>${entry.displayName}</strong>：${entry.reasoning}</li>`,
            )
            .join("")}
        </ol>
      </section>
    </main>
  </body>
</html>`;
}

function renderFamilyBrief(result: RecommendationResult): string {
  const strongestSupport = result.explanation.strongestSupport.at(0)?.summary ?? "暂无";
  const strongestCounterevidence =
    result.explanation.strongestCounterevidence.at(0)?.summary ?? "暂无";
  const flipCondition = result.explanation.flipConditions.at(0)?.summary ?? "暂无";

  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <title>${result.householdId} family brief</title>
  </head>
  <body>
    <main>
      <h1>${formatAction(result.action)}</h1>
      <p>${result.blocking.isBlocked ? "当前先不要依据这次结果行动。" : "这是给家人看的简版结论。"}</p>
      <p>最强理由：${strongestSupport}</p>
      <p>主要风险：${strongestCounterevidence}</p>
      <p>如果情况变化：${flipCondition}</p>
    </main>
  </body>
</html>`;
}

function renderAuditArtifact(result: RecommendationResult): string {
  return `# Audit: ${result.householdId}

- Generated at: ${result.generatedAt}
- Action: ${formatAction(result.action)}
- Blocked: ${result.blocking.isBlocked}
- Blocking reason: ${result.blocking.reasonCode ?? "none"}
- Config version: ${result.configVersion}
- Source snapshot: ${result.sourceSnapshotId}

## Trace Notes

${result.trace.notes.map((note) => `- ${note}`).join("\n")}

## Matched Rules

${result.trace.matchedRuleIds.length > 0 ? result.trace.matchedRuleIds.map((ruleId) => `- ${ruleId}`).join("\n") : "- none"}
`;
}

async function main(): Promise<void> {
  const { privateRoot } = parseCommandLineArguments(process.argv.slice(2));
  const privatePaths = resolvePrivateArtifactPaths(privateRoot);

  for (const householdId of readdirSync(privatePaths.recommendationsDir).sort()) {
    const householdRecommendationDir = resolve(privatePaths.recommendationsDir, householdId);

    for (const entry of readdirSync(householdRecommendationDir).sort()) {
      if (!entry.endsWith(".json")) {
        continue;
      }

      const result = validateRecommendationResult(
        readJsonFile(resolve(householdRecommendationDir, entry)),
      );
      const versionSlug = entry.replace(/\.json$/, "");
      const outputDir = resolve(privatePaths.outputDir, householdId, versionSlug);
      const auditDir = resolve(privatePaths.auditDir, householdId);

      mkdirSync(outputDir, { recursive: true });
      mkdirSync(auditDir, { recursive: true });

      writeFileSync(resolve(outputDir, "memo.html"), renderMemoPage(result));
      writeFileSync(resolve(outputDir, "family-brief.html"), renderFamilyBrief(result));
      writeFileSync(resolve(auditDir, `${versionSlug}.md`), renderAuditArtifact(result));
    }
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
