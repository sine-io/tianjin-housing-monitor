---
title: Private household recommendation pipelines must fail closed
date: 2026-04-12
category: security-issues
module: household-recommendation-pipeline
problem_type: security_issue
component: tooling
related_components:
  - brief_system
  - documentation
symptoms:
  - Pilot household artifacts could be written into public output trees when `privateRoot` was misconfigured
  - Missing market context could silently degrade into a confident `continue_wait` recommendation
  - The pipeline declared `contradictory_signal` as a blocking reason but could never actually emit it
  - User-facing memo and family brief output exposed internal enum values like `improving` and `strong`
root_cause: missing_validation
resolution_type: code_fix
severity: high
tags:
  - household-recommendations
  - private-public-boundary
  - fail-closed
  - blocking-state
  - renderer-safety
  - html-escaping
---

# Private household recommendation pipelines must fail closed

## Problem

This learning captures the hardening work implemented on branch `feat-replacement-decision-engine-v1` in PR `#5`.

The first version of the private household recommendation pipeline handled the happy path, but not the failure path. A misconfigured `privateRoot` could route pilot artifacts into public trees, missing market context could silently become a confident `continue_wait`, and user-facing artifacts could leak internal implementation language instead of trustworthy recommendation copy.

The key lesson is simple: for private recommendation systems, **privacy boundaries and “do not pretend to know” semantics belong to the same fail-closed design problem**.

## Symptoms

- A private artifact root could be pointed at a public tree such as `data/` or `site/public/data/`, allowing pilot artifacts to be written into served paths.
- `buildRecommendation()` could return `continue_wait` when market context was missing, which made “we do not know” look like a valid household recommendation.
- `contradictory_signal` existed in the type system and explanations but had no rule path, so consumers had to support a state the engine could never produce.
- Private memo and family brief pages displayed internal enum values like `improving`, `flat`, and `strong`, which made the output feel like debug data instead of a trustworthy recommendation.

## What Didn't Work

- **Relying on convention for privacy boundaries.** “Just point `privateRoot` somewhere private” is not a safety mechanism. Scripts need explicit path assertions.
- **Using `continue_wait` as a fallback for unknown state.** A default action is not the same thing as an explicit “暂不判断”.
- **Declaring states without rule paths.** A blocking reason that only exists in types and templates is dead contract weight.
- **Letting renderers interpolate raw internal values.** Even when logic is correct, leaking internal enums into household copy breaks trust.
- **Writing outputs as soon as each file validates.** If a later recommendation file is malformed, the renderer can leave partial output on disk.

## Solution

### 1. Add path-level fail-closed assertions

All private pipeline scripts now reject roots that resolve inside public output trees.

- `lib/paths.ts`
- `scripts/ingest-household-intake.ts`
- `scripts/build-household-recommendations.ts`
- `scripts/render-household-artifacts.ts`

The critical pattern is:

```ts
assertPathOutsideRoots(privateRoot, "Private artifact root", [
  DATA_DIR,
  defaultPublicDataDir(),
]);
```

This makes privacy a runtime guarantee instead of a documentation note.

### 2. Treat missing context as blocking, not as a recommendation

The recommendation rules now include an explicit missing-market-context block:

```ts
{
  id: "block-missing-market-context",
  reasonCode: "insufficient_evidence",
  conditions: [{ evaluator: "marketMom", operator: "eq", value: null }],
}
```

That keeps `continue_wait` reserved for cases where the engine has enough context to issue a valid “wait” recommendation.

### 3. Make contradictory blocking real

`contradictory_signal` is now derived from actual metrics instead of living only in the schema. The engine computes it when the top target looks favorable on spread but the surrounding signals argue against action, then routes that through `blockingRules`.

Relevant files:

- `lib/recommendation-engine.ts`
- `lib/recommendation-rules.ts`
- `tests/lib/recommendation-engine.test.ts`

### 4. Keep user-visible copy separate from internal enums

The renderer no longer exposes `improving`, `flat`, `weakening`, `strong`, or `weak` directly. The engine maps them to human-readable Chinese phrasing before rendering.

Examples:
- `走强`
- `强信号`

This made the private memo and family brief feel like decision artifacts instead of leaked internal state.

### 5. Escape dynamic output and validate the full render queue before writing

The renderer now:

- escapes dynamic strings before HTML interpolation
- validates all recommendation inputs up front
- only starts writing files after the full render queue is known-valid

That prevents two common failure modes:

1. untrusted strings becoming executable markup in memo or brief output
2. malformed later files causing partial output to be written for earlier households or versions

Relevant file:

- `scripts/render-household-artifacts.ts`

## Why This Works

- **Privacy is enforced at the boundary.** If a path is wrong, the script fails closed before any artifact is written.
- **Recommendation semantics stay honest.** Unknown or incomplete context becomes blocking, not a fake action state.
- **Contracts now match behavior.** `contradictory_signal` is no longer a dead branch in the type system.
- **User-facing copy is translated out of internal state.** The system can remain explicit internally while still sounding trustworthy externally.
- **Rendering is safer as a batch step.** Validating the full queue first removes the most obvious partial-write failure mode.

## Prevention

- Reuse `resolvePrivateArtifactPaths()` and `assertPathOutsideRoots()` for any new private artifact script. Do not hand-roll output paths.
- When adding a new blocking reason, update all three of:
  - rule derivation
  - rule declaration
  - explanation copy
- Keep `continue_wait` for known, low-action contexts only. Missing or contradictory inputs should block.
- Validate target basket community IDs against known config, not just shape.
- Encode or escape dynamic strings according to the output context before rendering user-visible artifacts.
- Prefer full-queue validation before writing artifacts; if the renderer later handles larger batches or concurrent writes, promote this to temp-file-or-temp-dir + rename semantics.
- Add script-level tests for:
  - public/private boundary rejection
  - missing-market blocking
  - contradictory blocking
  - no-partial-output behavior
  - user-facing copy that must not leak internal enums

## Related Issues

- Requirements: `docs/brainstorms/2026-04-11-replacement-decision-engine-requirements.md`
- Implementation plan: `docs/plans/2026-04-11-001-feat-replacement-decision-engine-v1-plan.md`
- Related follow-up work: `TODOS.md`
- Related PR: `#5`
