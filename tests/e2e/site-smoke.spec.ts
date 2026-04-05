import { expect, test } from "@playwright/test";

test.use({
  viewport: {
    width: 1440,
    height: 960,
  },
});

test("shows the built dashboard shell on desktop", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "房脉 PropPulse" }),
  ).toBeVisible();
  await expect(page.getByText("房源监测与价格雷达")).toBeVisible();
  await expect(page.getByRole("searchbox", { name: "全局搜索" })).toBeVisible();
  await expect(page.getByText(/^数据最后更新于:/)).toBeVisible();
  await expect(page.getByText("今日降价套数")).toBeVisible();
  await expect(page.getByRole("link", { name: "重点关注小区" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "核心小区挂牌均价走势 (近30天)" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "单价洼地雷达" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "今日高优降价房源榜" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "最新动态信息流" }),
  ).toBeVisible();

  const droppedListingsTable = page.getByRole("table", {
    name: "今日高优降价房源榜",
  });
  await expect(droppedListingsTable).toBeVisible();
  await expect(
    droppedListingsTable.getByRole("columnheader", { name: "小区" }),
  ).toBeVisible();
  await expect(
    droppedListingsTable.getByRole("columnheader", { name: "面积" }),
  ).toBeVisible();
  await expect(
    droppedListingsTable.getByRole("columnheader", { name: "原价" }),
  ).toBeVisible();
  await expect(
    droppedListingsTable.getByRole("columnheader", { name: "现价" }),
  ).toBeVisible();
  await expect(
    droppedListingsTable.getByRole("columnheader", { name: "降幅" }),
  ).toBeVisible();
  await expect(
    droppedListingsTable.getByRole("columnheader", { name: "连续观测天数" }),
  ).toBeVisible();
  const columnHeaders = droppedListingsTable.getByRole("columnheader");
  await expect(columnHeaders).toHaveCount(6);
  await expect(columnHeaders).toHaveText([
    "小区",
    "面积",
    "原价",
    "现价",
    "降幅",
    "连续观测天数",
  ]);
  expect(await page.getByTestId("dropped-listing-row").count()).toBeGreaterThanOrEqual(0);

  await expect(page.getByTestId("timeline-item").first()).toBeVisible();
  expect(await page.getByTestId("timeline-item").count()).toBeGreaterThanOrEqual(1);
  await expect(page.getByText("Live Feed")).toBeVisible();
});

test("navigates to the focused communities section from the sidebar", async ({
  page,
}) => {
  await page.goto("/");

  await page.getByRole("link", { name: "重点关注小区" }).click();

  await expect(page).toHaveURL(/#focus-communities$/);
  await expect(
    page.getByRole("region", { name: "重点关注小区专区" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "重点关注小区" }),
  ).toBeVisible();
});

test("navigates to inventory and settings sections from the sidebar", async ({
  page,
}) => {
  await page.goto("/");

  await page.getByRole("link", { name: "房源全库" }).click();
  const inventorySection = page.locator("#inventory");
  await expect(page).toHaveURL(/#inventory$/);
  await expect(inventorySection).toHaveCount(1);
  await expect(inventorySection).toHaveAttribute("aria-label", "房源全库专区");
  await expect(inventorySection).toBeInViewport();
  await expect(
    page.getByRole("region", { name: "房源全库专区" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "房源全库" }),
  ).toBeVisible();

  await page.getByRole("link", { name: "系统设置" }).click();
  const settingsSection = page.locator("#settings");
  await expect(page).toHaveURL(/#settings$/);
  await expect(settingsSection).toHaveCount(1);
  await expect(settingsSection).toHaveAttribute("aria-label", "系统设置专区");
  await expect(settingsSection).toBeInViewport();
  await expect(
    page.getByRole("region", { name: "系统设置专区" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "系统设置" }),
  ).toBeVisible();
});
