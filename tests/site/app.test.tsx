/* @vitest-environment jsdom */

import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import App from "../../site/src/App";
import {
  dashboardKpis,
  droppedListings,
  timelineItems,
} from "../../site/src/components/dashboard/dashboard-data";

function renderApp(): void {
  render(<App />);
}

const expectedKpiTitles = [
  "监控小区总数",
  "在售房源总数",
  "今日降价套数",
  "市场均价走势",
];

describe("site App", () => {
  it("renders the housing dashboard shell", () => {
    renderApp();

    expect(screen.getByText("房脉 PropPulse")).toBeInTheDocument();
    expect(screen.getByText("房源监测与价格雷达")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "首页" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "重点关注小区" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "房源全库" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "降价雷达" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "系统设置" })).toBeInTheDocument();
    expect(
      screen.getByRole("searchbox", { name: "全局搜索" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("searchbox", { name: "全局搜索" }),
    ).toHaveAttribute("placeholder", "全局搜索小区或房源...");
    expect(screen.getByText("数据最后更新于: 10分钟前")).toBeInTheDocument();
    expect(screen.queryByText("静态看板准备中")).not.toBeInTheDocument();
    expect(screen.queryByText("静态看板无法读取 JSON")).not.toBeInTheDocument();
    expect(screen.queryByText("首页概览")).not.toBeInTheDocument();
    expect(screen.queryByText("价格信号与高优房源监控")).not.toBeInTheDocument();
    expect(screen.queryByText("Housing Dashboard")).not.toBeInTheDocument();
    expect(screen.queryByText("天津核心小区降价线索总览")).not.toBeInTheDocument();
  });

  it("renders KPI cards and dashboard content sections", () => {
    renderApp();

    expectedKpiTitles.forEach((title) => {
      expect(screen.getByText(title)).toBeInTheDocument();
    });
    expect(screen.queryByText("重点小区均价偏离")).not.toBeInTheDocument();
    expect(screen.queryByText("新增预警小区")).not.toBeInTheDocument();
    expect(screen.queryByText("在监控活跃房源")).not.toBeInTheDocument();
    expect(screen.getByText("核心小区挂牌均价走势 (近30天)")).toBeInTheDocument();
    expect(screen.getByText("单价洼地雷达")).toBeInTheDocument();
    expect(
      screen.getByText("[ Recharts Line Chart Placeholder ]"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("[ Recharts Scatter / Bubble Chart Placeholder ]"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "今日高优降价房源榜" }),
    ).toBeInTheDocument();
    expect(screen.getByText("小区")).toBeInTheDocument();
    expect(screen.getByText("面积")).toBeInTheDocument();
    expect(screen.getByText("原价")).toBeInTheDocument();
    expect(screen.getByText("现价")).toBeInTheDocument();
    expect(screen.getByText("降幅")).toBeInTheDocument();
    expect(screen.getByText("上架天数")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "最新动态信息流" }),
    ).toBeInTheDocument();
  });

  it("matches the static fixture counts for KPI cards, listings, and timeline", () => {
    renderApp();

    expect(dashboardKpis.map((item) => item.title)).toEqual(expectedKpiTitles);
    expect(screen.getAllByTestId("kpi-card")).toHaveLength(
      dashboardKpis.length,
    );
    expect(screen.getAllByTestId("dropped-listing-row")).toHaveLength(
      droppedListings.length,
    );
    expect(screen.getAllByTestId("timeline-item")).toHaveLength(
      timelineItems.length,
    );
  });
});
