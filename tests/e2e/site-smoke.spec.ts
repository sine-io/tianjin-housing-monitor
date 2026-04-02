import { expect, test } from "@playwright/test";

test.use({
  hasTouch: true,
  isMobile: true,
  viewport: {
    width: 390,
    height: 844,
  },
});

test("shows the built dashboard smoke path on mobile", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByTestId("market-card")).toBeVisible();

  const segmentGrid = page.getByTestId("segment-grid");
  await expect(segmentGrid.locator(".segment-card")).toHaveCount(1);

  const mingquanSegmentCard = segmentGrid.locator(".segment-card").first();

  await expect(mingquanSegmentCard).toBeVisible();
  await expect(
    mingquanSegmentCard.getByRole("heading", {
      name: "2居 87-90㎡",
    }),
  ).toBeVisible();
  await expect(mingquanSegmentCard).toContainText("鸣泉花园");

  await mingquanSegmentCard
    .getByRole("button", { name: "查看 2居 87-90㎡ 详情" })
    .click();

  const comparisonView = page.getByTestId("comparison-communities");
  await expect(comparisonView).toContainText("柏溪花园");
  await expect(comparisonView).toContainText("恋海园");
  await expect(comparisonView).toContainText("万科东第");
  await expect(comparisonView).toContainText("谊景村");

  const lianhaiRow = page.getByTestId("comparison-community-lianhai-yuan");
  await expect(lianhaiRow).toContainText("2居 90-110㎡");
  await expect(lianhaiRow).toContainText("待复核");

  const wankeRow = page.getByTestId("comparison-community-wanke-dongdi");
  await expect(wankeRow).toContainText("2居 85-90㎡");
  await expect(wankeRow).toContainText("样本不足");
  await expect(wankeRow).not.toContainText("待复核");

  const yijingRow = page.getByTestId("comparison-community-yijing-cun");
  await expect(yijingRow).toContainText("2居 75-90㎡");
  await expect(yijingRow).toContainText("待复核");

  await expect(page.getByRole("link", { name: "新增一条样本" })).toBeVisible();
});
