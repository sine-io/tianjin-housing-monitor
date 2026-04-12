import { CircleAlert, ArrowDownRight, ShieldAlert, Sparkles } from "lucide-react";

import type { PublicRecommendationDemoSectionItem } from "./dashboard-types";

interface PublicRecommendationDemoSectionProps {
  item: PublicRecommendationDemoSectionItem;
}

export function PublicRecommendationDemoSection({
  item,
}: PublicRecommendationDemoSectionProps): React.JSX.Element {
  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white">{item.title}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">{item.description}</p>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-violet-500/20 bg-violet-500/10 text-violet-300 ring-8 ring-violet-500/10">
          <Sparkles className="h-5 w-5" />
        </div>
      </div>

      <div className="mt-6 rounded-3xl border border-violet-500/20 bg-violet-500/10 p-5">
        <p className="text-sm font-medium text-violet-200">当前建议</p>
        <p className="mt-2 text-3xl font-semibold tracking-tight text-white">
          {item.action}
        </p>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-3">
        <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
            <ArrowDownRight className="h-4 w-4 text-emerald-300" />
            最强支持证据
          </h3>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-300">
            {item.strongestSupport.map((entry) => (
              <li key={entry}>{entry}</li>
            ))}
          </ul>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
            <CircleAlert className="h-4 w-4 text-amber-300" />
            最强反证
          </h3>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-300">
            {item.strongestCounterevidence.map((entry) => (
              <li key={entry}>{entry}</li>
            ))}
          </ul>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
            <ShieldAlert className="h-4 w-4 text-sky-300" />
            结论翻转条件
          </h3>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-300">
            {item.flipConditions.map((entry) => (
              <li key={entry}>{entry}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-6 rounded-3xl border border-slate-800 bg-slate-950/70 p-5">
        <h3 className="text-base font-semibold text-white">目标小区篮子排序</h3>
        <ol className="mt-4 space-y-3 text-sm leading-6 text-slate-300">
          {item.basketRanking.map((entry) => (
            <li key={`${entry.community}-${entry.reasoning}`}>
              <span className="font-medium text-white">{entry.community}</span>
              {"："}
              {entry.reasoning}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
