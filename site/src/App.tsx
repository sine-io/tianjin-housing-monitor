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
import { KpiCard } from "./components/dashboard/KpiCard";
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
  const droppedListings = viewModel?.droppedListings ?? [];
  const timelineItems = viewModel?.timelineItems ?? [];

  return (
    <div className="h-screen overflow-hidden bg-slate-950 text-slate-100">
      <Sidebar />
      <div className="h-screen lg:pl-64">
        <div className="flex h-screen flex-col">
          <TopHeader lastUpdatedLabel={viewModel?.lastUpdatedLabel ?? "加载中"} />
          <main className="dashboard-scroll-area flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
            <div className="mx-auto flex max-w-7xl flex-col gap-6">
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
                aria-label="图表区"
                className="grid gap-6 lg:grid-cols-2"
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
                aria-label="底部区"
                className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_360px]"
              >
                <DroppedListingsTable items={droppedListings} />
                <TimelineFeed items={timelineItems} />
              </section>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
