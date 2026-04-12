import { ArrowRight, Sparkles } from "lucide-react";

import type { PublicRecommendationDemoCardItem } from "./dashboard-types";

interface PublicRecommendationDemoCardProps {
  item: PublicRecommendationDemoCardItem;
}

export function PublicRecommendationDemoCard({
  item,
}: PublicRecommendationDemoCardProps): React.JSX.Element {
  return (
    <section className="rounded-3xl border border-violet-500/20 bg-violet-500/10 p-5 text-slate-100">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-violet-200">改善型置换建议</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">{item.action}</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-200">
            {item.strongestReason}
          </p>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-violet-400/20 bg-slate-950/30 text-violet-200 ring-8 ring-violet-500/10">
          <Sparkles className="h-5 w-5" />
        </div>
      </div>

      <div className="mt-5">
        <a
          href={item.href}
          className="inline-flex items-center gap-2 rounded-full border border-violet-300/20 bg-slate-950/30 px-4 py-2 text-sm font-medium text-violet-100 transition hover:bg-slate-950/50"
        >
          看完整建议
          <ArrowRight className="h-4 w-4" />
        </a>
      </div>
    </section>
  );
}
