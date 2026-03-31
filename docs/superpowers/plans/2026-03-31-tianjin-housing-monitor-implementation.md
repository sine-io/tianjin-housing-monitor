# 天津楼市监测系统 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a free-first Tianjin housing monitor that collects public listing data, merges manual Beike samples, generates JSON trend datasets, and publishes a mobile-friendly static dashboard to GitHub Pages.

**Architecture:** Use a single TypeScript workspace. Playwright collectors fetch public sources, parser modules normalize them, aggregation scripts compute daily and weekly datasets under `data/`, and a Vite + React static site reads prebuilt JSON from `site/public/data`. GitHub Actions runs the collection/build pipeline and publishes the resulting static site to GitHub Pages.

**Tech Stack:** Node.js, npm, TypeScript, Vite, React, ECharts, Vitest, Playwright, Cheerio, Zod, GitHub Actions, GitHub Pages

---

## File Structure Lock-In

### Root tooling

- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `vitest.config.ts`
- Create: `playwright.config.ts`
- Create: `.gitignore`
- Create: `README.md`

### Shared runtime and contracts

- Create: `lib/types.ts`
- Create: `lib/schemas.ts`
- Create: `lib/paths.ts`
- Create: `lib/config.ts`
- Create: `lib/metrics.ts`
- Create: `lib/verdicts.ts`
- Create: `lib/city-market.ts`
- Create: `lib/manual-input.ts`

### Collectors and parsers

- Create: `collector/browser.ts`
- Create: `collector/fang-community.ts`
- Create: `collector/fang-weekreport.ts`
- Create: `collector/stats-gov.ts`
- Create: `parser/fang-community.ts`
- Create: `parser/fang-weekreport.ts`
- Create: `parser/stats-gov.ts`

### Build scripts

- Create: `scripts/collect.ts`
- Create: `scripts/promote-manual-inputs.ts`
- Create: `scripts/build-series.ts`
- Create: `scripts/build-weekly-report.ts`
- Create: `scripts/prepare-public-data.ts`
- Create: `scripts/ingest-manual-issue.ts`

### Static site

- Create: `site/index.html`
- Create: `site/src/main.tsx`
- Create: `site/src/App.tsx`
- Create: `site/src/styles.css`
- Create: `site/src/lib/load-json.ts`
- Create: `site/src/components/MarketCard.tsx`
- Create: `site/src/components/SegmentCard.tsx`
- Create: `site/src/components/TrendChart.tsx`
- Create: `site/src/components/DetailView.tsx`
- Create: `site/src/components/ManualInputCard.tsx`
- Create: `site/src/components/DataQualityCard.tsx`

### Data and config

- Create: `data/config/communities.json`
- Create: `data/config/segments.json`
- Create: `data/manual/incoming/.gitkeep`
- Create: `data/manual/accepted/.gitkeep`
- Create: `data/series/city-market/.gitkeep`
- Create: `data/series/communities/.gitkeep`
- Create: `data/reports/.gitkeep`
- Create: `data/runs/.gitkeep`

### Tests and fixtures

- Create: `tests/lib/config.test.ts`
- Create: `tests/lib/verdicts.test.ts`
- Create: `tests/parser/fang-community.test.ts`
- Create: `tests/parser/fang-weekreport.test.ts`
- Create: `tests/parser/stats-gov.test.ts`
- Create: `tests/scripts/collect.test.ts`
- Create: `tests/scripts/build-series.test.ts`
- Create: `tests/scripts/ingest-manual-issue.test.ts`
- Create: `tests/scripts/promote-manual-inputs.test.ts`
- Create: `tests/site/app.test.tsx`
- Create: `tests/e2e/site-smoke.spec.ts`
- Create: `tests/fixtures/fang/community/mingquan-huayuan.html`
- Create: `tests/fixtures/fang/weekreport/mingquan-huayuan.html`
- Create: `tests/fixtures/stats-gov/tianjin.html`
- Create: `tests/fixtures/issues/manual-sample.md`

### GitHub automation

- Create: `.github/workflows/collect.yml`
- Create: `.github/workflows/manual-input.yml`
- Create: `.github/workflows/weekly-report.yml`
- Create: `.github/workflows/deploy-pages.yml`
- Create: `.github/ISSUE_TEMPLATE/manual-sample.yml`

## Frozen Config Decisions

- Freeze the monitored communities in `data/config/communities.json`:
  - `mingquan-huayuan`
  - `jiajun-huayuan`
  - `yunshu-huayuan`
  - `boxi-huayuan`
  - `haiyi-changzhou-hanboyuan`
- Freeze the segment templates in `data/config/segments.json`:
  - `2br-87-90`
  - `3br-140-150`
- Freeze the auto-collected sources:
  - Fang community page
  - Fang week report page
  - NBS Tianjin monthly secondary-home dataset
- Freeze the manual source path:
  - GitHub Issue Form only
  - Beike URLs and screenshots are evidence only

### Frozen Community Source Mapping

`data/config/communities.json` must include the exact per-community source mapping below so collectors can iterate all 5 communities without inventing URLs:

```json
[
  {
    "id": "mingquan-huayuan",
    "name": "鸣泉花园",
    "sources": {
      "fangCommunityUrl": "https://tj.esf.fang.com/loupan/1110750643.htm",
      "fangWeekreportUrl": "https://tj.esf.fang.com/loupan/1110750643/weekreport.htm"
    }
  },
  {
    "id": "jiajun-huayuan",
    "name": "富力津门湖嘉郡花园",
    "sources": {
      "fangCommunityUrl": "https://tj.esf.fang.com/loupan/1110778195.htm",
      "fangWeekreportUrl": "https://tj.esf.fang.com/loupan/1110778195/weekreport.htm"
    }
  },
  {
    "id": "yunshu-huayuan",
    "name": "富力津门湖云舒花园",
    "sources": {
      "fangCommunityUrl": "https://tj.esf.fang.com/loupan/1110750641.htm",
      "fangWeekreportUrl": "https://tj.esf.fang.com/loupan/1110750641/weekreport.htm"
    }
  },
  {
    "id": "boxi-huayuan",
    "name": "富力津门湖柏溪花园",
    "sources": {
      "fangCommunityUrl": "https://tj.esf.fang.com/loupan/1110661679.htm",
      "fangWeekreportUrl": "https://tj.esf.fang.com/loupan/1110661679/weekreport.htm"
    }
  },
  {
    "id": "haiyi-changzhou-hanboyuan",
    "name": "海逸长洲瀚波园",
    "sources": {
      "fangCommunityUrl": "https://tj.esf.fang.com/loupan/1110676739.htm",
      "fangWeekreportUrl": "https://tj.esf.fang.com/loupan/1110676739/weekreport.htm"
    }
  }
]
```

### Frozen Intermediate JSON Contract

`scripts/collect.ts` must write `data/runs/latest.json` in this shape:

```json
{
  "generatedAt": "2026-03-31T13:30:00.000Z",
  "sources": {
    "stats-gov": {
      "status": "success",
      "latestMonth": "2026-02",
      "city": "天津"
    }
  },
  "communities": {
    "mingquan-huayuan": {
      "fangCommunity": { "status": "success", "referenceUnitPrice": 23007 },
      "fangWeekreport": { "status": "success", "weeklyPoints": [] }
    }
  }
}
```

Per-community series files must live at:

- `data/series/communities/<community-id>/<segment-id>.json`

Each segment series file must include:

- `communityId`
- `segmentId`
- `segmentLabel`
- `points`
- `latestVerdict`
- `latestConclusion`
- `latestAnomalies`

### Frozen Segment Aggregation Contract

`build-series.ts` must use this exact segment derivation order:

1. Parse current Fang listing teasers from the community page when they expose:
   - `rooms`
   - `area`
   - `totalPrice`
   - `unitPrice`
2. Assign a teaser to a segment only when both conditions match:
   - `rooms === segment.rooms`
   - `segment.areaMin <= area <= segment.areaMax`
3. If a community/segment has `>= 3` matched teasers in the current window:
   - compute `listing_unit_price_median`
   - compute `listing_unit_price_min`
   - set `listings_count` to the matched teaser count
   - set `derivedFrom` to `segment-teasers`
4. If a community/segment has `< 3` matched teasers:
   - use the Fang week-report community price point as both `listing_unit_price_median` and `listing_unit_price_min`
   - keep `listings_count` as the matched teaser count
   - set `derivedFrom` to `community-fallback`
5. Accepted manual inputs never overwrite listing metrics directly. They only populate:
   - `manual_deal_count`
   - `manual_deal_unit_price_median`
   - `manual_latest_sample_at`
6. Verdict generation continues to use the spec-defined listing metrics, even when `derivedFrom` is `community-fallback`

This fallback behavior is deliberate for phase 1 so every community x segment pair yields a deterministic series file.

## Shared Command Contract

These scripts must exist by the end of Task 1 and remain stable:

```bash
npm run test
npm run typecheck
npm run collect
npm run build:data
npm run build:site
npm run build
npm run test:e2e
npm run preview
```

Recommended script values:

```json
{
  "scripts": {
    "test": "vitest run",
    "typecheck": "tsc --noEmit",
    "collect": "tsx scripts/collect.ts",
    "promote:manual": "tsx scripts/promote-manual-inputs.ts",
    "build:data": "tsx scripts/promote-manual-inputs.ts && tsx scripts/build-series.ts && tsx scripts/build-weekly-report.ts && tsx scripts/prepare-public-data.ts",
    "build:site": "vite build",
    "build": "npm run build:data && npm run build:site",
    "test:e2e": "playwright test",
    "preview": "vite preview"
  }
}
```

### Task 1: Bootstrap the Workspace and Freeze Config

**Files:**
- Create: `.gitignore`
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `vitest.config.ts`
- Create: `playwright.config.ts`
- Create: `README.md`
- Create: `lib/types.ts`
- Create: `lib/schemas.ts`
- Create: `lib/paths.ts`
- Create: `lib/config.ts`
- Create: `data/config/communities.json`
- Create: `data/config/segments.json`
- Create: `data/manual/incoming/.gitkeep`
- Create: `data/manual/accepted/.gitkeep`
- Create: `data/series/city-market/.gitkeep`
- Create: `data/series/communities/.gitkeep`
- Create: `data/reports/.gitkeep`
- Create: `data/runs/.gitkeep`
- Test: `tests/lib/config.test.ts`

- [ ] **Step 1: Initialize git and npm**

Run:

```bash
git init
npm init -y
npm install react react-dom echarts zod cheerio
npm install -D typescript vite vitest @vitejs/plugin-react tsx @types/node @types/react @types/react-dom playwright @playwright/test jsdom @testing-library/react @testing-library/jest-dom
npx playwright install --with-deps chromium
```

Expected: `.git/` exists, `package.json` exists, dependencies install without errors.

- [ ] **Step 2: Write the failing config loader test**

Add `tests/lib/config.test.ts` with assertions that:

```ts
import { describe, expect, it } from "vitest";
import { loadCommunities, loadSegments } from "../../lib/config";

describe("config loading", () => {
  it("loads the frozen community list", () => {
    const communities = loadCommunities();
    expect(communities.map((item) => item.id)).toEqual([
      "mingquan-huayuan",
      "jiajun-huayuan",
      "yunshu-huayuan",
      "boxi-huayuan",
      "haiyi-changzhou-hanboyuan"
    ]);
  });

  it("loads the two frozen segment templates", () => {
    const segments = loadSegments();
    expect(segments.map((item) => item.id)).toEqual(["2br-87-90", "3br-140-150"]);
  });
});
```

- [ ] **Step 3: Run the test to confirm failure**

Run:

```bash
npm run test -- tests/lib/config.test.ts
```

Expected: FAIL because `lib/config.ts` and the JSON files do not exist yet.

- [ ] **Step 4: Implement the shared config contract**

Create `lib/types.ts`, `lib/schemas.ts`, `lib/paths.ts`, `lib/config.ts` and the config JSON files.

`data/config/communities.json` must include all 5 frozen communities and their exact source URLs from the "Frozen Community Source Mapping" section. The first entry must look like:

```json
[
  {
    "id": "mingquan-huayuan",
    "name": "鸣泉花园",
    "city": "天津",
    "district": "西青",
    "sources": {
      "fangCommunityUrl": "https://tj.esf.fang.com/loupan/1110750643.htm",
      "fangWeekreportUrl": "https://tj.esf.fang.com/loupan/1110750643/weekreport.htm"
    }
  }
]
```

`data/config/segments.json` must include:

```json
[
  { "id": "2br-87-90", "label": "两居 87-90㎡", "rooms": 2, "areaMin": 87, "areaMax": 90 },
  { "id": "3br-140-150", "label": "三居 140-150㎡", "rooms": 3, "areaMin": 140, "areaMax": 150 }
]
```

Each community must materialize both segment templates at build time using the same `<community-id>/<segment-id>` path rule.

- [ ] **Step 5: Add project scripts and ignore rules**

Set up:

- `package.json` scripts from the shared command contract
- `.gitignore` entries for `node_modules/`, `dist/`, `playwright-report/`, `test-results/`
- `vite.config.ts` with `base: "./"` so GitHub Pages works from any repo name

- [ ] **Step 6: Run tests and typecheck**

Run:

```bash
npm run test -- tests/lib/config.test.ts
npm run typecheck
```

Expected: PASS for config test, PASS for TypeScript check.

- [ ] **Step 7: Commit bootstrap**

Run:

```bash
git add .
git commit -m "chore: bootstrap tianjin housing monitor"
```

### Task 2: Parse Public Source Fixtures

**Files:**
- Create: `parser/fang-community.ts`
- Create: `parser/fang-weekreport.ts`
- Create: `parser/stats-gov.ts`
- Create: `tests/fixtures/fang/community/mingquan-huayuan.html`
- Create: `tests/fixtures/fang/community/jiajun-huayuan.html`
- Create: `tests/fixtures/fang/community/yunshu-huayuan.html`
- Create: `tests/fixtures/fang/community/boxi-huayuan.html`
- Create: `tests/fixtures/fang/community/haiyi-changzhou-hanboyuan.html`
- Create: `tests/fixtures/fang/weekreport/mingquan-huayuan.html`
- Create: `tests/fixtures/fang/weekreport/jiajun-huayuan.html`
- Create: `tests/fixtures/fang/weekreport/yunshu-huayuan.html`
- Create: `tests/fixtures/fang/weekreport/boxi-huayuan.html`
- Create: `tests/fixtures/fang/weekreport/haiyi-changzhou-hanboyuan.html`
- Create: `tests/fixtures/stats-gov/tianjin.html`
- Test: `tests/parser/fang-community.test.ts`
- Test: `tests/parser/fang-weekreport.test.ts`
- Test: `tests/parser/stats-gov.test.ts`

- [ ] **Step 1: Save real-world HTML fixtures**

Save one current HTML page for each of the 5 monitored communities for both Fang source types, plus one Tianjin NBS page. Do not sanitize away the fields the parsers need.

- [ ] **Step 2: Write failing parser tests**

Add parser tests that assert:

- `parseFangCommunity()` returns community name, reference price, listing count, recent deal hints, and current listing teasers with room/area/price fields when exposed
- `parseFangWeekreport()` returns weekly price points, listing count and any heat/ratio fields when present
- `parseStatsGovCityMarket()` returns the latest Tianjin month with `secondary_home_price_index_mom` and `secondary_home_price_index_yoy`
- collector-facing parser contracts work for all 5 communities, not just Mingquan

Example expectation:

```ts
expect(parsed.city).toBe("天津");
expect(parsed.marketVerdict).toBeDefined();
```

- [ ] **Step 3: Run parser tests to confirm failure**

Run:

```bash
npm run test -- tests/parser/fang-community.test.ts
npm run test -- tests/parser/fang-weekreport.test.ts
npm run test -- tests/parser/stats-gov.test.ts
```

Expected: FAIL because parser modules do not exist yet.

- [ ] **Step 4: Implement parser modules with strict return types**

Use `cheerio` and `zod` to:

- parse the fixture HTML
- normalize missing values to `null`
- keep extraction logic source-specific
- avoid mixing parsing with file I/O

- [ ] **Step 5: Re-run parser tests**

Run:

```bash
npm run test -- tests/parser/fang-community.test.ts tests/parser/fang-weekreport.test.ts tests/parser/stats-gov.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit source parsers**

Run:

```bash
git add parser tests/fixtures tests/parser
git commit -m "feat: add public source parsers"
```

### Task 3: Implement Collectors and Run Logging

**Files:**
- Create: `collector/browser.ts`
- Create: `collector/fang-community.ts`
- Create: `collector/fang-weekreport.ts`
- Create: `collector/stats-gov.ts`
- Create: `scripts/collect.ts`
- Modify: `data/runs/.gitkeep`
- Test: `tests/scripts/collect.test.ts`

- [ ] **Step 1: Write a failing collector orchestration test**

Create `tests/scripts/collect.test.ts` that injects local fixture HTML and asserts `collect.ts` writes normalized run artifacts to `data/runs/latest.json` for all 5 monitored communities plus the Tianjin city-market source.

- [ ] **Step 2: Run the failing collector test**

Run:

```bash
npm run test -- tests/scripts/collect.test.ts
```

Expected: FAIL because collector modules and run logging do not exist.

- [ ] **Step 3: Implement the collector layer**

Implement:

- `collector/browser.ts` for Playwright browser lifecycle
- one collector per source that fetches raw HTML
- `scripts/collect.ts` to orchestrate all collectors and write:
  - `data/runs/latest.json`
  - timestamped JSON under `data/runs/`

Collector requirements:

- support a `--fixture` mode to read local fixture HTML during tests
- write status per source: `success`, `failed`, `skipped`
- iterate `data/config/communities.json` instead of hardcoding Mingquan
- never overwrite last successful parsed data if a source fails

- [ ] **Step 4: Re-run the collector test**

Run:

```bash
npm run test -- tests/scripts/collect.test.ts
```

Expected: PASS.

- [ ] **Step 5: Smoke the collection script in fixture mode**

Run:

```bash
npm run collect -- --fixture
```

Expected: `data/runs/latest.json` exists, includes `stats-gov`, and contains Fang source entries for all 5 monitored communities.

- [ ] **Step 6: Commit collectors**

Run:

```bash
git add collector scripts/collect.ts tests/scripts/collect.test.ts data/runs
git commit -m "feat: add collectors and run logging"
```

### Task 4: Build Daily Series, Weekly Reports, and Verdict Logic

**Files:**
- Create: `lib/metrics.ts`
- Create: `lib/verdicts.ts`
- Create: `lib/city-market.ts`
- Create: `lib/manual-input.ts`
- Create: `scripts/promote-manual-inputs.ts`
- Create: `scripts/build-series.ts`
- Create: `scripts/build-weekly-report.ts`
- Create: `scripts/prepare-public-data.ts`
- Test: `tests/lib/verdicts.test.ts`
- Test: `tests/scripts/build-series.test.ts`
- Test: `tests/scripts/promote-manual-inputs.test.ts`

- [ ] **Step 1: Write failing tests for market verdicts and segment verdicts**

`tests/lib/verdicts.test.ts` must cover:

- `market_verdict` thresholds:
  - `>= 100.0` => `偏强`
  - `99.8 <= x < 100.0` => `中性`
  - `< 99.8` => `偏弱`
- `W-2`, `W-1`, `W0` logic for:
  - `上涨`
  - `下跌`
  - `横盘`
  - `以价换量`
  - `假回暖`
  - `样本不足`

- [ ] **Step 2: Run the failing verdict test**

Run:

```bash
npm run test -- tests/lib/verdicts.test.ts
```

Expected: FAIL because the verdict modules do not exist.

- [ ] **Step 3: Implement verdict and metric helpers**

Implement:

- `lib/metrics.ts` for windowing and medians
- `lib/verdicts.ts` for segment verdicts
- `lib/city-market.ts` for homepage market verdict
- `lib/manual-input.ts` for validated manual sample reads

- [ ] **Step 4: Write a failing build-series test**

`tests/scripts/build-series.test.ts` must assert that from fixture collection output plus a sample accepted manual input, the build scripts create:

- `data/series/city-market/tianjin.json`
- all `5 x 2` segment JSON files under `data/series/communities/<community-id>/`
- one weekly report JSON under `data/reports/`

- [ ] **Step 5: Run the failing build-series test**

Run:

```bash
npm run test -- tests/scripts/build-series.test.ts
```

Expected: FAIL because build scripts do not exist.

- [ ] **Step 6: Write and run a failing manual-promotion test**

`tests/scripts/promote-manual-inputs.test.ts` must assert that a valid JSON file in `data/manual/incoming/` moves to `data/manual/accepted/` and invalid samples remain in `incoming/` with a logged error.

Run:

```bash
npm run test -- tests/scripts/promote-manual-inputs.test.ts
```

Expected: FAIL because the promotion script does not exist.

- [ ] **Step 7: Implement build and promotion scripts**

Implement:

- `scripts/promote-manual-inputs.ts`
- `scripts/build-series.ts`
- `scripts/build-weekly-report.ts`
- `scripts/prepare-public-data.ts`

Contract:

- `promote-manual-inputs.ts` validates `data/manual/incoming/*.json` and moves valid samples into `data/manual/accepted/`
- `build-series.ts` reads latest collected raw data and accepted manual inputs
- writes city market JSON and per-community/per-segment series JSON
- `build-weekly-report.ts` writes one report JSON per monitored community/segment
- `prepare-public-data.ts` copies `data/config`, `data/series`, and `data/reports` into `site/public/data`

- [ ] **Step 8: Re-run tests and build the data**

Run:

```bash
npm run test -- tests/lib/verdicts.test.ts tests/scripts/build-series.test.ts tests/scripts/promote-manual-inputs.test.ts
npm run build:data
```

Expected: PASS and `site/public/data/` populated.

- [ ] **Step 9: Commit data pipeline**

Run:

```bash
git add lib scripts/promote-manual-inputs.ts scripts/build-series.ts scripts/build-weekly-report.ts scripts/prepare-public-data.ts tests/lib tests/scripts data
git commit -m "feat: add aggregation and report pipeline"
```

### Task 5: Build the Static Dashboard

**Files:**
- Create: `site/index.html`
- Create: `site/src/main.tsx`
- Create: `site/src/App.tsx`
- Create: `site/src/styles.css`
- Create: `site/src/lib/load-json.ts`
- Create: `site/src/components/MarketCard.tsx`
- Create: `site/src/components/SegmentCard.tsx`
- Create: `site/src/components/TrendChart.tsx`
- Create: `site/src/components/DetailView.tsx`
- Create: `site/src/components/ManualInputCard.tsx`
- Create: `site/src/components/DataQualityCard.tsx`
- Test: `tests/site/app.test.tsx`

- [ ] **Step 1: Write a failing UI smoke test**

`tests/site/app.test.tsx` must render the app against sample JSON and assert:

- homepage market card shows `偏强` / `中性` / `偏弱`
- homepage shows the two Mingquan segment cards
- homepage shows an anomaly reminder card
- homepage shows the latest weekly report summary entry
- detail view renders a trend chart container
- detail view renders the latest conclusion text
- detail view renders a comparison-community view for the other 4 monitored communities
- manual input card renders a GitHub Issue Form link

- [ ] **Step 2: Run the failing UI test**

Run:

```bash
npm run test -- tests/site/app.test.tsx
```

Expected: FAIL because the site components do not exist.

- [ ] **Step 3: Implement the mobile-first site**

Implementation requirements:

- use a single-column default layout
- render homepage summary cards first
- allow tapping into a detail view for a selected segment
- render the chart with ECharts using prebuilt JSON only
- render a homepage anomaly reminder based on `latestAnomalies`
- render the latest weekly report summary on the homepage
- render the latest conclusion in the detail view
- render a comparison chart or comparison list for the 4 comparator communities in the detail view
- render data quality and missing-data states explicitly
- add a visible “新增一条样本” button linking to the GitHub Issue Form

- [ ] **Step 4: Re-run the UI test**

Run:

```bash
npm run test -- tests/site/app.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Build the site**

Run:

```bash
npm run build:site
```

Expected: `dist/` exists and includes compiled static assets.

- [ ] **Step 6: Commit static site**

Run:

```bash
git add site tests/site vite.config.ts
git commit -m "feat: add static housing dashboard"
```

### Task 6: Add Manual Input Ingestion and GitHub Automation

**Files:**
- Create: `scripts/ingest-manual-issue.ts`
- Create: `.github/ISSUE_TEMPLATE/manual-sample.yml`
- Create: `.github/workflows/collect.yml`
- Create: `.github/workflows/manual-input.yml`
- Create: `.github/workflows/weekly-report.yml`
- Create: `.github/workflows/deploy-pages.yml`
- Test: `tests/scripts/ingest-manual-issue.test.ts`

- [ ] **Step 1: Write a failing issue-ingestion test**

`tests/scripts/ingest-manual-issue.test.ts` must assert that a fixture issue body becomes one JSON file under `data/manual/incoming/` with the expected community, segment, date, price, and evidence URL fields.

- [ ] **Step 2: Run the failing issue-ingestion test**

Run:

```bash
npm run test -- tests/scripts/ingest-manual-issue.test.ts
```

Expected: FAIL because the ingestion script does not exist.

- [ ] **Step 3: Implement the manual issue ingestion path**

Implement:

- `.github/ISSUE_TEMPLATE/manual-sample.yml` with the required structured fields
- `scripts/ingest-manual-issue.ts` that reads issue form content from the GitHub Actions event payload and writes validated JSON to `data/manual/incoming/`

- [ ] **Step 4: Add GitHub workflows**

Implement:

- `collect.yml`
  - triggers on `schedule` twice daily and `workflow_dispatch`
  - installs dependencies
  - runs `npm run collect`
  - runs `npm run build:data`
  - commits updated `data/runs/latest.json`, `data/series/`, `data/reports/`, `site/public/data/`, and both manual-input directories back to `main` when files changed
- `manual-input.yml`
  - triggers on `issues` and rejects non-template issues
  - runs `scripts/ingest-manual-issue.ts`
  - commits created `data/manual/incoming/<issue-id>.json` to `main`
- `weekly-report.yml`
  - triggers weekly
  - runs the report build path and commits updated report JSON to `main` when files changed
- `deploy-pages.yml`
  - triggers on pushes to `main` that touch `site/**`, `data/config/**`, `data/series/**`, `data/reports/**`, or `site/public/data/**`
  - runs `npm run build:site`
  - publishes `dist/` to GitHub Pages

Permissions contract:

- `collect.yml` and `weekly-report.yml` need `contents: write`
- `manual-input.yml` needs `contents: write` and `issues: read`
- `deploy-pages.yml` needs `contents: read`, `pages: write`, and `id-token: write`

Commit contract:

- workflow commit steps must use `git add -A data/manual/incoming data/manual/accepted data/runs data/series data/reports site/public/data`
- this is required so promoted manual samples remove their old `incoming/` files on `main`

- [ ] **Step 5: Re-run issue-ingestion test and local workflow smoke commands**

Run:

```bash
npm run test -- tests/scripts/ingest-manual-issue.test.ts
npm run collect -- --fixture
npm run promote:manual
npm run build
```

Expected: PASS and no build errors.

- [ ] **Step 6: Commit automation**

Run:

```bash
git add .github scripts/ingest-manual-issue.ts tests/scripts/ingest-manual-issue.test.ts
git commit -m "feat: add issue ingestion and github automation"
```

### Task 7: End-to-End Verification and Mobile Smoke

**Files:**
- Modify: `README.md`
- Test: `tests/e2e/site-smoke.spec.ts`

- [ ] **Step 1: Write a failing mobile smoke test**

`tests/e2e/site-smoke.spec.ts` must:

- start from the built static app
- use a mobile viewport
- verify the market card appears
- verify one Mingquan segment card appears
- verify the “新增一条样本” link is visible

- [ ] **Step 2: Run the failing smoke test**

Run:

```bash
npm run test:e2e -- tests/e2e/site-smoke.spec.ts
```

Expected: FAIL until preview wiring and UI details are complete.

- [ ] **Step 3: Implement any missing preview/test harness pieces**

Add whatever small glue is needed so the smoke test can run against the built static app without relying on external network access.

- [ ] **Step 4: Re-run the full verification suite**

Run:

```bash
npm run test
npm run typecheck
npm run collect -- --fixture
npm run build
npm run test:e2e -- tests/e2e/site-smoke.spec.ts
```

Expected:

- unit tests PASS
- typecheck PASS
- fixture collection PASS
- site build PASS
- mobile smoke PASS

- [ ] **Step 5: Update README with local dev and GitHub setup**

Document:

- required Node version
- local commands
- how to enable GitHub Pages
- how to configure issue forms
- how to run fixture mode safely

- [ ] **Step 6: Commit verification and docs**

Run:

```bash
git add README.md tests/e2e/site-smoke.spec.ts
git commit -m "docs: add setup guide and verification coverage"
```

## Final Verification Gate

Before calling the project complete, re-run:

```bash
npm run test
npm run typecheck
npm run collect -- --fixture
npm run build
npm run test:e2e -- tests/e2e/site-smoke.spec.ts
```

Only finish after all commands pass and the built dashboard renders the homepage summary, detail view, and GitHub Issue Form entry path.
