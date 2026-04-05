import type { LucideIcon } from "lucide-react";

import type { DashboardKpi } from "./dashboard-data";

interface KpiCardProps extends Omit<DashboardKpi, "icon"> {
  icon: LucideIcon;
}

const toneClasses: Record<DashboardKpi["tone"], string> = {
  highlight:
    "border-emerald-500/30 bg-emerald-500/10 shadow-lg shadow-emerald-950/30",
  positive: "border-emerald-500/20 bg-slate-900/80",
  neutral: "border-slate-800 bg-slate-900/80",
  negative: "border-rose-500/20 bg-slate-900/80",
};

const toneTextClasses: Record<DashboardKpi["tone"], string> = {
  highlight: "text-emerald-300",
  positive: "text-emerald-300",
  neutral: "text-slate-300",
  negative: "text-rose-300",
};

export function KpiCard({
  title,
  value,
  change,
  hint,
  tone,
  icon: Icon,
}: KpiCardProps): React.JSX.Element {
  return (
    <article
      data-testid="kpi-card"
      className={[
        "rounded-3xl border p-5 transition hover:-translate-y-0.5",
        toneClasses[tone],
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-300">{title}</p>
          <p className="text-3xl font-semibold tracking-tight text-white">
            {value}
          </p>
        </div>
        <div
          className={[
            "flex h-11 w-11 items-center justify-center rounded-2xl border",
            tone === "negative"
              ? "border-rose-500/20 bg-rose-500/10"
              : "border-slate-700 bg-slate-950/60",
          ].join(" ")}
        >
          <Icon className={["h-5 w-5", toneTextClasses[tone]].join(" ")} />
        </div>
      </div>
      <div className="mt-6 space-y-2">
        <p className={["text-sm font-medium", toneTextClasses[tone]].join(" ")}>
          {change}
        </p>
        <p className="text-sm leading-6 text-slate-400">{hint}</p>
      </div>
    </article>
  );
}
