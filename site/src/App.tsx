import {
  Activity,
  BadgeDollarSign,
  Building2,
  Radar,
  ShieldAlert,
  TrendingDown,
} from "lucide-react";
import { useEffect, useState } from "react";

import { ChartPanel } from "./components/dashboard/ChartPanel";
import { DroppedListingsTable } from "./components/dashboard/DroppedListingsTable";
import { FocusedCommunitiesSection } from "./components/dashboard/FocusedCommunitiesSection";
import { InventorySection } from "./components/dashboard/InventorySection";
import { KpiCard } from "./components/dashboard/KpiCard";
import { PublicRecommendationDemoCard } from "./components/dashboard/PublicRecommendationDemoCard";
import { PublicRecommendationDemoSection } from "./components/dashboard/PublicRecommendationDemoSection";
import { SettingsSection } from "./components/dashboard/SettingsSection";
import { Sidebar } from "./components/dashboard/Sidebar";
import { TimelineFeed } from "./components/dashboard/TimelineFeed";
import { TopHeader } from "./components/dashboard/TopHeader";
import type { DashboardIconKey } from "./components/dashboard/dashboard-types";
import {
  buildDashboardViewModel,
  type DashboardViewModel,
} from "./lib/dashboard-view";
import { loadDashboardData, loadRecentRunArtifacts } from "./lib/load-json";

const iconMap: Record<DashboardIconKey, typeof TrendingDown> = {
  "badge-dollar-sign": BadgeDollarSign,
  "building-2": Building2,
  activity: Activity,
  "shield-alert": ShieldAlert,
};

export default function App(): React.JSX.Element {
  const [viewModel, setViewModel] = useState<DashboardViewModel | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    Promise.all([loadDashboardData(), loadRecentRunArtifacts()])
      .then(([data, runs]) => {
        if (cancelled) {
          return;
        }

        setViewModel(buildDashboardViewModel(data, runs));
        setErrorMessage(null);
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return;
        }

        setErrorMessage(
          error instanceof Error ? error.message : "Failed to load dashboard data",
        );
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const kpis = viewModel?.kpis ?? [];
  const publicRecommendationCard = viewModel?.publicRecommendationCard ?? {
    title: "改善型置换建议",
    action: "加载中",
    strongestReason: "正在生成公开 recommendation 参考。",
    href: "#recommendation-demo",
  };
  const publicRecommendationSection = viewModel?.publicRecommendationSection ?? {
    title: "改善型置换建议",
    description: "基于公开市场数据生成的改善型置换参考输出。",
    action: "加载中",
    strongestSupport: ["公开 recommendation 正在加载。"],
    strongestCounterevidence: ["请稍后查看完整 recommendation 内容。"],
    flipConditions: ["公开 recommendation 正在加载。"],
    basketRanking: [],
  };
  const focusedCommunities = viewModel?.focusedCommunities ?? [];
  const inventoryCommunities = viewModel?.inventoryCommunities ?? [];
  const droppedListings = viewModel?.droppedListings ?? [];
  const settingsItems = viewModel?.settingsItems ?? [];
  const timelineItems = viewModel?.timelineItems ?? [];

  return (
    <div className="h-screen overflow-hidden bg-slate-950 text-slate-100">
      <Sidebar />
      <div className="h-screen lg:pl-64">
        <div className="flex h-screen flex-col">
          <TopHeader lastUpdatedLabel={viewModel?.lastUpdatedLabel ?? "加载中"} />
          <main className="dashboard-scroll-area flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
            <div className="mx-auto flex max-w-7xl flex-col gap-6">
              <section
                id="overview"
                aria-label="首页概览"
                className="flex flex-col gap-6 scroll-mt-24"
              >
                {errorMessage ? (
                  <section className="rounded-3xl border border-rose-500/20 bg-rose-500/10 p-5 text-sm text-rose-200">
                    数据加载失败：{errorMessage}
                  </section>
                ) : null}

                <section
                  aria-label="核心指标"
                  className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"
                >
                  {kpis.map((item) => {
                    const { icon, ...rest } = item;
                    const Icon = iconMap[icon] ?? TrendingDown;

                    return <KpiCard key={item.title} icon={Icon} {...rest} />;
                  })}
                </section>

                <section
                  id="recommendation-entry"
                  aria-label="公开置换建议卡片"
                  className="scroll-mt-24"
                >
                  <PublicRecommendationDemoCard item={publicRecommendationCard} />
                </section>
              </section>

              <section
                id="recommendation-demo"
                aria-label="公开置换建议详情"
                className="scroll-mt-24"
              >
                <PublicRecommendationDemoSection item={publicRecommendationSection} />
              </section>

              <section
                id="price-radar"
                aria-label="降价雷达专区"
                className="grid gap-6 scroll-mt-24 lg:grid-cols-2"
              >
                <ChartPanel
                  title="核心小区挂牌均价走势 (近30天)"
                  subtitle="跟踪重点小区挂牌均价拐点，预留 Recharts 折线图容器。"
                  icon={TrendingDown}
                  accent="emerald"
                  placeholder="[ Recharts Line Chart Placeholder ]"
                />
                <ChartPanel
                  title="单价洼地雷达"
                  subtitle="对比面积、总价与楼层等维度，预留散点 / 气泡图容器。"
                  icon={Radar}
                  accent="sky"
                  placeholder="[ Recharts Scatter / Bubble Chart Placeholder ]"
                />
              </section>

              <section
                id="focus-communities"
                aria-label="重点关注小区专区"
                className="scroll-mt-24"
              >
                <FocusedCommunitiesSection items={focusedCommunities} />
              </section>

              <section
                id="inventory"
                aria-label="房源全库专区"
                className="scroll-mt-24"
              >
                <InventorySection items={inventoryCommunities} />
              </section>

              <section
                aria-label="底部区"
                className="grid gap-6 scroll-mt-24 xl:items-start xl:grid-cols-[minmax(0,2fr)_360px]"
              >
                <DroppedListingsTable items={droppedListings} />
                <TimelineFeed items={timelineItems} />
              </section>

              <section
                id="settings"
                aria-label="系统设置专区"
                className="scroll-mt-24"
              >
                <SettingsSection items={settingsItems} />
              </section>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
