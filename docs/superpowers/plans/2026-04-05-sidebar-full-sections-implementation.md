# Sidebar Full Sections Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 补全 Dashboard 左侧“房源全库”和“系统设置”两个入口，让 5 个功能菜单都对应语义清晰的独立内容区。

**Architecture:** 保持当前单页 hash 导航结构，不引入路由。通过扩展 `dashboard-view` 输出两个新视图模型，再新增 `InventorySection` 和 `SettingsSection` 展示组件，由 `App.tsx` 统一编排各 section，最后补齐 App 与 E2E 导航验证。

**Tech Stack:** React 19, TypeScript, Vite, Vitest, Playwright, Tailwind CSS

---

## File Structure

- Modify: `site/src/components/dashboard/dashboard-types.ts`
  - 新增“房源全库”和“系统设置”展示类型
- Modify: `site/src/lib/dashboard-view.ts`
  - 构建 `inventoryCommunities` 和 `settingsItems`
- Create: `site/src/components/dashboard/InventorySection.tsx`
  - 渲染房源全库卡片区
- Create: `site/src/components/dashboard/SettingsSection.tsx`
  - 渲染系统设置说明卡片区
- Modify: `site/src/App.tsx`
  - 挂载 `#inventory` 与 `#settings` 主内容区
- Modify: `site/src/components/dashboard/Sidebar.tsx`
  - 移除 Sidebar 底部卡片上的 `id="settings"`，避免与主内容区锚点冲突
- Modify: `tests/site/dashboard-view.test.ts`
  - 为新增 view-model 输出写失败测试
- Modify: `tests/site/app.test.tsx`
  - 为两个新专区可见性和导航锚点写失败测试
- Modify: `tests/e2e/site-smoke.spec.ts`
  - 为“房源全库”“系统设置”导航补浏览器级验证

---

### Task 1: 扩展 dashboard view-model

**Files:**
- Modify: `site/src/components/dashboard/dashboard-types.ts`
- Modify: `site/src/lib/dashboard-view.ts`
- Test: `tests/site/dashboard-view.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
it("builds inventory community summaries from the latest dashboard data", () => {
  const viewModel = buildDashboardViewModel(makeDashboardData(), makeRunArtifacts());

  expect(viewModel.inventoryCommunities).toHaveLength(2);
  expect(viewModel.inventoryCommunities[0]).toMatchObject({
    name: "鸣泉花园",
    sourceProvider: "房天下小区",
    segmentLabel: "2居 87-90㎡",
    latestPrice: "22,980 元/㎡",
    listingsCount: "1 套",
  });
});

it("builds settings summary cards from dashboard state", () => {
  const viewModel = buildDashboardViewModel(makeDashboardData(), makeRunArtifacts());

  expect(viewModel.settingsItems.map((item) => item.title)).toEqual([
    "数据刷新",
    "监控覆盖",
    "验证命令",
  ]);
  expect(viewModel.settingsItems[0]?.value).toBe("10分钟前");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- tests/site/dashboard-view.test.ts
```

Expected:

```text
FAIL
Property 'inventoryCommunities' does not exist on type 'DashboardViewModel'
Property 'settingsItems' does not exist on type 'DashboardViewModel'
```

- [ ] **Step 3: Write minimal implementation**

Add new dashboard types:

```ts
export interface InventoryCommunitySummary {
  id: string;
  name: string;
  district: string;
  segmentLabel: string;
  latestPrice: string;
  listingsCount: string;
  verdict: string;
  status: string;
  sourceProvider: string;
  tone: FocusedCommunityTone;
}

export interface SettingsItem {
  id: string;
  title: string;
  value: string;
  description: string;
}
```

Extend `DashboardViewModel` and add helpers:

```ts
function formatSourceProviderLabel(provider: DashboardData["communities"][number]["sourceProvider"]): string {
  if (provider === "fang_mobile") return "房天下小区";
  if (provider === "anjuke_sale_search") return "安居客搜索";
  return "待补充";
}

const inventoryCommunities = data.communities.map((community) => {
  const primarySegment = data.primarySegmentsByCommunityId[community.id];
  const latestReportSegment =
    primarySegment && data.latestReport?.communities[community.id]?.segments[primarySegment.id];
  const latestSeriesEntry =
    primarySegment && data.communitySeries[community.id]?.[primarySegment.id]?.series.at(-1);

  return {
    id: community.id,
    name: community.name,
    district: community.district,
    segmentLabel: primarySegment?.label ?? "待配置",
    latestPrice: formatPriceLabel(
      latestReportSegment?.latest?.listingUnitPriceMedian ??
        latestSeriesEntry?.listingUnitPriceMedian ??
        null,
    ),
    listingsCount: formatListingCountLabel(
      latestReportSegment?.latest?.listingsCount ??
        latestSeriesEntry?.listingsCount ??
        null,
    ),
    verdict:
      latestReportSegment?.verdict ??
      (community.status === "pending_verification" ? "待复核" : "待观察"),
    status: community.status === "active" ? "正常监控" : "待复核",
    sourceProvider: formatSourceProviderLabel(community.sourceProvider),
    tone: community.status === "active" ? "active" : "pending",
  };
});

const settingsItems = [
  {
    id: "refresh",
    title: "数据刷新",
    value: latestRun
      ? formatRelativeUpdatedAt(latestRun.generatedAt)
      : "暂无更新",
    description: `最近读取 ${sortedRuns.length} 次 run artifact，并优先使用最新周报快照。`,
  },
  {
    id: "coverage",
    title: "监控覆盖",
    value: `${data.communities.length} 个小区 / ${data.communities.filter((item) => item.status === "active").length} 个正常监控`,
    description: "pending_verification 小区会继续展示，但状态标记为待复核。",
  },
  {
    id: "verification",
    title: "验证命令",
    value: "npm run build / npm run test:e2e",
    description: "本地预览、构建和 E2E 验证都通过这些命令完成。",
  },
];
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
npm test -- tests/site/dashboard-view.test.ts
```

Expected:

```text
PASS
All dashboard-view tests green
```

- [ ] **Step 5: Commit**

```bash
git add site/src/components/dashboard/dashboard-types.ts site/src/lib/dashboard-view.ts tests/site/dashboard-view.test.ts
git commit -m "feat: extend dashboard view model for sidebar sections"
```

---

### Task 2: 新增房源全库展示组件

**Files:**
- Create: `site/src/components/dashboard/InventorySection.tsx`
- Modify: `site/src/App.tsx`
- Modify: `tests/site/app.test.tsx`

- [ ] **Step 1: Write the failing App test**

```tsx
it("renders the inventory section with all monitored communities", async () => {
  await renderLoadedApp();

  const inventorySection = screen.getByRole("region", { name: "房源全库专区" });

  expect(
    within(inventorySection).getByRole("heading", { name: "房源全库" }),
  ).toBeInTheDocument();
  expect(
    within(inventorySection).getAllByTestId("inventory-community-card"),
  ).toHaveLength(2);
  expect(within(inventorySection).getByText("房天下小区")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- tests/site/app.test.tsx
```

Expected:

```text
FAIL
Unable to find role "region" with name "房源全库专区"
```

- [ ] **Step 3: Write minimal implementation**

Create `InventorySection.tsx`:

```tsx
import { Database, Tags } from "lucide-react";

import type { InventoryCommunitySummary } from "./dashboard-types";

interface InventorySectionProps {
  items: InventoryCommunitySummary[];
}

export function InventorySection({ items }: InventorySectionProps): React.JSX.Element {
  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white">房源全库</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            汇总全部监控小区的主户型状态，作为全量盘点视图。
          </p>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-sky-500/20 bg-sky-500/10 text-sky-300 ring-8 ring-sky-500/10">
          <Database className="h-5 w-5" />
        </div>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        {items.map((item) => (
          <article
            key={item.id}
            data-testid="inventory-community-card"
            className="rounded-3xl border border-slate-800 bg-slate-950/70 p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-white">{item.name}</h3>
                <p className="mt-1 text-sm text-slate-400">
                  {item.district} · {item.segmentLabel}
                </p>
              </div>
              <span className="inline-flex rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs text-slate-300">
                {item.sourceProvider}
              </span>
            </div>
            <dl className="mt-5 grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
                <dt className="text-xs uppercase tracking-wide text-slate-500">中位价</dt>
                <dd className="mt-3 text-sm font-semibold text-white">{item.latestPrice}</dd>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
                <dt className="flex items-center gap-2 text-xs uppercase tracking-wide text-slate-500">
                  <Tags className="h-4 w-4" />
                  挂牌套数
                </dt>
                <dd className="mt-3 text-sm font-semibold text-white">{item.listingsCount}</dd>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
                <dt className="text-xs uppercase tracking-wide text-slate-500">最新结论</dt>
                <dd className="mt-3 text-sm font-semibold text-white">{item.verdict}</dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
    </section>
  );
}
```

Mount it in `App.tsx`:

```tsx
const inventoryCommunities = viewModel?.inventoryCommunities ?? [];

<section
  id="inventory"
  aria-label="房源全库专区"
  className="scroll-mt-24"
>
  <InventorySection items={inventoryCommunities} />
</section>
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
npm test -- tests/site/app.test.tsx
```

Expected:

```text
PASS
App tests include inventory section
```

- [ ] **Step 5: Commit**

```bash
git add site/src/components/dashboard/InventorySection.tsx site/src/App.tsx tests/site/app.test.tsx
git commit -m "feat: add inventory section to dashboard"
```

---

### Task 3: 新增系统设置展示组件并修正锚点

**Files:**
- Create: `site/src/components/dashboard/SettingsSection.tsx`
- Modify: `site/src/App.tsx`
- Modify: `site/src/components/dashboard/Sidebar.tsx`
- Modify: `tests/site/app.test.tsx`

- [ ] **Step 1: Write the failing App test**

```tsx
it("renders the settings section with dashboard maintenance guidance", async () => {
  await renderLoadedApp();

  const settingsLink = screen.getByRole("link", { name: "系统设置" });

  expect(settingsLink).toHaveAttribute("href", "#settings");

  fireEvent.click(settingsLink);

  const settingsSection = screen.getByRole("region", { name: "系统设置专区" });

  expect(
    within(settingsSection).getByRole("heading", { name: "系统设置" }),
  ).toBeInTheDocument();
  expect(within(settingsSection).getByText("数据刷新")).toBeInTheDocument();
  expect(
    within(settingsSection).getByText("npm run build / npm run test:e2e"),
  ).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- tests/site/app.test.tsx
```

Expected:

```text
FAIL
Unable to find role "region" with name "系统设置专区"
```

- [ ] **Step 3: Write minimal implementation**

Create `SettingsSection.tsx`:

```tsx
import { Settings } from "lucide-react";

import type { SettingsItem } from "./dashboard-types";

interface SettingsSectionProps {
  items: SettingsItem[];
}

export function SettingsSection({ items }: SettingsSectionProps): React.JSX.Element {
  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white">系统设置</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            说明当前数据刷新、监控覆盖和本地验证方式。
          </p>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-violet-500/20 bg-violet-500/10 text-violet-300 ring-8 ring-violet-500/10">
          <Settings className="h-5 w-5" />
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {items.map((item) => (
          <article
            key={item.id}
            className="rounded-3xl border border-slate-800 bg-slate-950/70 p-5"
          >
            <p className="text-sm font-medium text-slate-300">{item.title}</p>
            <p className="mt-3 text-lg font-semibold text-white">{item.value}</p>
            <p className="mt-3 text-sm leading-6 text-slate-400">{item.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
```

Update `App.tsx` and `Sidebar.tsx`:

```tsx
const settingsItems = viewModel?.settingsItems ?? [];

<section
  id="settings"
  aria-label="系统设置专区"
  className="scroll-mt-24"
>
  <SettingsSection items={settingsItems} />
</section>
```

```tsx
<div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-4 text-sm text-slate-300">
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
npm test -- tests/site/app.test.tsx
```

Expected:

```text
PASS
App tests include settings section and settings anchor
```

- [ ] **Step 5: Commit**

```bash
git add site/src/components/dashboard/SettingsSection.tsx site/src/App.tsx site/src/components/dashboard/Sidebar.tsx tests/site/app.test.tsx
git commit -m "feat: add settings section to dashboard"
```

---

### Task 4: 补齐 E2E 与最终验证

**Files:**
- Modify: `tests/e2e/site-smoke.spec.ts`
- Modify: `tests/site/app.test.tsx`
- Modify: `tests/site/dashboard-view.test.ts`
- Create: `site/src/components/dashboard/InventorySection.tsx`
- Create: `site/src/components/dashboard/SettingsSection.tsx`
- Modify: `site/src/App.tsx`
- Modify: `site/src/components/dashboard/Sidebar.tsx`
- Modify: `site/src/components/dashboard/dashboard-types.ts`
- Modify: `site/src/lib/dashboard-view.ts`

- [ ] **Step 1: Write the E2E navigation expectations**

```ts
test("navigates to inventory and settings sections from the sidebar", async ({
  page,
}) => {
  await page.goto("/");

  await page.getByRole("link", { name: "房源全库" }).click();
  await expect(page).toHaveURL(/#inventory$/);
  await expect(page.getByRole("heading", { name: "房源全库" })).toBeVisible();

  await page.getByRole("link", { name: "系统设置" }).click();
  await expect(page).toHaveURL(/#settings$/);
  await expect(page.getByRole("heading", { name: "系统设置" })).toBeVisible();
});
```

- [ ] **Step 2: Run focused E2E to verify it fails**

Run:

```bash
npm run test:e2e -- tests/e2e/site-smoke.spec.ts
```

Expected:

```text
FAIL
Unable to find heading "房源全库" or "系统设置"
```

- [ ] **Step 3: Run the full verification suite after implementation**

Run:

```bash
npm test -- tests/site/app.test.tsx tests/site/dashboard-view.test.ts tests/playwright-config.test.ts
npm run typecheck
npm run build
npm run test:e2e -- tests/e2e/site-smoke.spec.ts
```

Expected:

```text
All targeted tests PASS
typecheck exits 0
build exits 0
Playwright smoke tests PASS
```

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/site-smoke.spec.ts
git commit -m "test: cover sidebar inventory and settings navigation"
```

- [ ] **Step 5: Final integration commit (if squashing task commits is not requested, skip)**

```bash
git status --short
git log --oneline -4
```

Expected:

```text
Working tree clean
Recent commits reflect view-model, inventory section, settings section, and e2e coverage
```
