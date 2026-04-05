/* @vitest-environment jsdom */

import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import App from "../../site/src/App";

describe("site App", () => {
  beforeEach(() => {
    vi.spyOn(globalThis, "fetch").mockImplementation(
      () => new Promise(() => undefined as never),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the housing dashboard shell", () => {
    render(<App />);

    expect(screen.getByText("Tianjin Housing Monitor")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "首页" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(
      screen.getByPlaceholderText("全局搜索小区或房源..."),
    ).toBeInTheDocument();
    expect(screen.getByText("数据最后更新于: 10分钟前")).toBeInTheDocument();
  });

  it("renders KPI cards and dashboard content sections", () => {
    render(<App />);

    expect(screen.getByText("今日降价套数")).toBeInTheDocument();
    expect(screen.getByText("核心小区挂牌均价走势 (近30天)")).toBeInTheDocument();
    expect(
      screen.getByText("[ Recharts Scatter / Bubble Chart Placeholder ]"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "今日高优降价房源榜" }),
    ).toBeInTheDocument();
    expect(screen.getByText("万科新里程")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "最新动态信息流" }),
    ).toBeInTheDocument();
  });
});
