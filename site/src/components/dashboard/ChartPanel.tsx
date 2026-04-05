import type { LucideIcon } from "lucide-react";

interface ChartPanelProps {
  title: string;
  subtitle: string;
  placeholder: string;
  icon: LucideIcon;
  accent?: "emerald" | "sky";
}

const accentClasses = {
  emerald:
    "border-emerald-500/20 bg-emerald-500/10 text-emerald-300 ring-emerald-500/10",
  sky: "border-sky-500/20 bg-sky-500/10 text-sky-300 ring-sky-500/10",
};

export function ChartPanel({
  title,
  subtitle,
  placeholder,
  icon: Icon,
  accent = "emerald",
}: ChartPanelProps): React.JSX.Element {
  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">{subtitle}</p>
        </div>
        <div
          className={[
            "flex h-11 w-11 items-center justify-center rounded-2xl border ring-8",
            accentClasses[accent],
          ].join(" ")}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className="mt-6 flex min-h-72 items-center justify-center rounded-3xl border border-dashed border-slate-700 bg-slate-950/70 px-6 py-10 text-center text-sm font-medium text-slate-400">
        {placeholder}
      </div>
    </section>
  );
}
