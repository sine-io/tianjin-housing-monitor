import { Activity, ArrowUpRight, ShieldAlert } from "lucide-react";

import type { TimelineItem } from "./dashboard-data";

interface TimelineFeedProps {
  items: TimelineItem[];
}

const toneClasses: Record<
  TimelineItem["tone"],
  { container: string; icon: typeof Activity }
> = {
  positive: {
    container: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
    icon: Activity,
  },
  negative: {
    container: "border-rose-500/20 bg-rose-500/10 text-rose-300",
    icon: ShieldAlert,
  },
  neutral: {
    container: "border-slate-700 bg-slate-800 text-slate-300",
    icon: ArrowUpRight,
  },
};

export function TimelineFeed({
  items,
}: TimelineFeedProps): React.JSX.Element {
  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white">最新动态信息流</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            用窄列展示调价、信号切换和数据刷新等关键变化。
          </p>
        </div>
        <div className="rounded-2xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-xs uppercase tracking-[0.28em] text-slate-400">
          Live Feed
        </div>
      </div>

      <ol className="mt-6 space-y-4">
        {items.map((item) => {
          const { container, icon: Icon } = toneClasses[item.tone];

          return (
            <li
              key={item.id}
              data-testid="timeline-item"
              className="rounded-3xl border border-slate-800 bg-slate-950/70 p-4"
            >
              <div className="flex gap-3">
                <div
                  className={[
                    "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border",
                    container,
                  ].join(" ")}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center justify-between gap-4">
                    <h3 className="text-sm font-medium text-white">{item.title}</h3>
                    <span className="shrink-0 text-xs text-slate-500">
                      {item.time}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    {item.description}
                  </p>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
