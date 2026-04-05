import {
  Activity,
  BadgeDollarSign,
  Building2,
  Radar,
  ShieldAlert,
  TrendingDown,
} from "lucide-react";

import { ChartPanel } from "./components/dashboard/ChartPanel";
import {
  type DashboardIconKey,
  dashboardKpis,
  droppedListings,
  timelineItems,
} from "./components/dashboard/dashboard-data";
import { DroppedListingsTable } from "./components/dashboard/DroppedListingsTable";
import { KpiCard } from "./components/dashboard/KpiCard";
import { Sidebar } from "./components/dashboard/Sidebar";
import { TimelineFeed } from "./components/dashboard/TimelineFeed";
import { TopHeader } from "./components/dashboard/TopHeader";

const iconMap: Record<DashboardIconKey, typeof TrendingDown> = {
  "badge-dollar-sign": BadgeDollarSign,
  "building-2": Building2,
  activity: Activity,
  "shield-alert": ShieldAlert,
};

export default function App(): React.JSX.Element {
  return (
    <div className="h-screen overflow-hidden bg-slate-950 text-slate-100">
      <Sidebar />
      <div className="h-screen lg:pl-64">
        <div className="flex h-screen flex-col">
          <TopHeader lastUpdatedLabel="10分钟前" />
          <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
            <div className="mx-auto flex max-w-7xl flex-col gap-6">
              <section
                aria-label="核心指标"
                className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"
              >
                {dashboardKpis.map((item) => {
                  const { icon, ...rest } = item;

                  return (
                    <KpiCard key={item.title} icon={iconMap[icon]} {...rest} />
                  );
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
