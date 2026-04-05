# Dashboard Focused Communities Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复左侧“重点关注小区”点击无反应的问题，并在首页新增真实数据驱动的小区摘要专区。

**Architecture:** 保持单页 Dashboard 结构，使用 hash 锚点完成侧边栏导航，用 `dashboard-view` 新增 focused communities 视图模型，再由新的展示组件负责渲染卡片区块。交互层不引入路由，只补齐当前缺失的目标 section 和可见反馈。

**Tech Stack:** React 19, TypeScript, Vite, Vitest, Playwright, Tailwind CSS

---

### Task 1: 为导航与专区补回归测试

**Files:**
- Modify: `tests/site/app.test.tsx`
- Test: `tests/site/app.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
it("navigates to focused communities and renders the focused section", async () => {
  await renderLoadedApp();

  const homeLink = screen.getByRole("link", { name: "首页" });
  const focusedLink = screen.getByRole("link", { name: "重点关注小区" });

  expect(focusedLink).toHaveAttribute("href", "#focus-communities");

  focusedLink.click();

  expect(window.location.hash).toBe("#focus-communities");
  expect(focusedLink).toHaveAttribute("aria-current", "page");
  expect(homeLink).not.toHaveAttribute("aria-current");
  expect(screen.getByRole("heading", { name: "重点关注小区" })).toBeInTheDocument();
  expect(screen.getByText("鸣泉花园")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/site/app.test.tsx`
Expected: FAIL，因为当前导航仍是 `href="#"`，且页面没有“重点关注小区”专区。

### Task 2: 扩展首页视图模型并新增专区组件

**Files:**
- Modify: `site/src/lib/dashboard-view.ts`
- Create: `site/src/components/dashboard/FocusedCommunitiesSection.tsx`
- Modify: `site/src/App.tsx`

- [ ] **Step 1: Add focused community summary model**

```ts
interface FocusedCommunitySummary {
  id: string;
  name: string;
  district: string;
  segmentLabel: string;
  verdict: string;
  latestPriceLabel: string;
  listingsLabel: string;
  statusLabel: string;
}
```

- [ ] **Step 2: Build the summaries from real data**

```ts
const focusedCommunities = data.communities.map((community) => {
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
    verdict: latestReportSegment?.verdict ?? "待观察",
    latestPriceLabel: formatPriceLabel(
      latestReportSegment?.latest?.listingUnitPriceMedian ??
        latestSeriesEntry?.listingUnitPriceMedian ??
        null,
    ),
    listingsLabel: formatListingCountLabel(
      latestReportSegment?.latest?.listingsCount ??
        latestSeriesEntry?.listingsCount ??
        null,
    ),
    statusLabel: community.status === "active" ? "正常监控" : "待复核",
  };
});
```

- [ ] **Step 3: Render the section in App**

```tsx
<section id="focus-communities" aria-label="重点关注小区专区">
  <FocusedCommunitiesSection items={viewModel?.focusedCommunities ?? []} />
</section>
```

- [ ] **Step 4: Update sidebar anchors**

```tsx
const navItems = [
  { label: "首页", href: "#overview" },
  { label: "重点关注小区", href: "#focus-communities" },
  { label: "房源全库", href: "#inventory" },
  { label: "降价雷达", href: "#price-radar" },
  { label: "系统设置", href: "#settings" },
];
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- tests/site/app.test.tsx`
Expected: PASS，新增测试和原有 App 测试全部通过。

### Task 3: 补浏览器级回归验证

**Files:**
- Modify: `tests/e2e/site-smoke.spec.ts`

- [ ] **Step 1: Write the E2E expectation**

```ts
await page.getByRole("link", { name: "重点关注小区" }).click();
await expect(page).toHaveURL(/#focus-communities$/);
await expect(
  page.getByRole("heading", { name: "重点关注小区" }),
).toBeVisible();
```

- [ ] **Step 2: Run focused verification**

Run: `npm run test:e2e -- tests/e2e/site-smoke.spec.ts`
Expected: PASS，桌面端点击左侧导航后能滚动到真实专区。

### Task 4: 完整验证

**Files:**
- Modify: `tests/site/app.test.tsx`
- Modify: `tests/e2e/site-smoke.spec.ts`
- Modify: `site/src/App.tsx`
- Modify: `site/src/components/dashboard/Sidebar.tsx`
- Modify: `site/src/lib/dashboard-view.ts`
- Create: `site/src/components/dashboard/FocusedCommunitiesSection.tsx`

- [ ] **Step 1: Run unit tests**

Run: `npm test -- tests/site/app.test.tsx tests/site/dashboard-view.test.ts`
Expected: PASS

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: Run focused e2e**

Run: `npm run test:e2e -- tests/e2e/site-smoke.spec.ts`
Expected: PASS
