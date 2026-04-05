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
    page.getByRole("heading", { name: "Tianjin Housing Monitor" }),
  ).toBeVisible();
  await expect(page.getByRole("searchbox", { name: "全局搜索" })).toBeVisible();
  await expect(page.getByText("数据最后更新于: 10分钟前")).toBeVisible();
  await expect(page.getByText("今日降价套数")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "核心小区挂牌均价走势 (近30天)" }),
  ).toBeVisible();
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
    droppedListingsTable.getByRole("columnheader", { name: "现价" }),
  ).toBeVisible();
  await expect(
    droppedListingsTable.getByRole("columnheader", { name: "上架天数" }),
  ).toBeVisible();
  await expect(page.getByTestId("dropped-listing-row")).toHaveCount(4);

  await expect(droppedListingsTable.getByText("奥城公馆", { exact: true })).toBeVisible();
  await expect(page.getByTestId("timeline-item")).toHaveCount(4);
  await expect(page.getByText("Live Feed")).toBeVisible();
});
