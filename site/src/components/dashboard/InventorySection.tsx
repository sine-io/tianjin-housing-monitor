import { CircleAlert, Database, BadgeDollarSign, Tags } from "lucide-react";

import type { InventoryCommunitySummary } from "./dashboard-types";

interface InventorySectionProps {
  items: InventoryCommunitySummary[];
}

export function InventorySection({
  items,
}: InventorySectionProps): React.JSX.Element {
  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white">房源全库</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            汇总全部监控小区的主户型状态，作为全量盘点视图。
          </p>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-sky-500/20 bg-sky-500/10 text-sky-300 ring-8 ring-sky-500/10">
          <Database className="h-5 w-5" />
        </div>
      </div>

      {items.length > 0 ? (
        <div className="mt-6 grid gap-4 xl:grid-cols-2">
          {items.map((item) => (
            <article
              key={item.id}
              data-testid="inventory-community-card"
              className="rounded-3xl border border-slate-800 bg-slate-950/70 p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-white">{item.name}</h3>
                  <p className="mt-1 text-sm text-slate-400">
                    {item.district} · {item.segmentLabel}
                  </p>
                </div>
                <span className="inline-flex rounded-full border border-slate-700 bg-slate-900/80 px-3 py-1 text-xs font-medium text-slate-200">
                  {item.sourceProvider}
                </span>
              </div>

              <dl className="mt-5 grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
                  <dt className="flex items-center gap-2 text-xs uppercase tracking-wide text-slate-500">
                    <BadgeDollarSign className="h-4 w-4" />
                    中位价
                  </dt>
                  <dd className="mt-3 text-sm font-semibold text-white">
                    {item.latestPrice}
                  </dd>
                </div>
                <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
                  <dt className="flex items-center gap-2 text-xs uppercase tracking-wide text-slate-500">
                    <Tags className="h-4 w-4" />
                    挂牌套数
                  </dt>
                  <dd className="mt-3 text-sm font-semibold text-white">
                    {item.listingsCount}
                  </dd>
                </div>
                <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
                  <dt className="flex items-center gap-2 text-xs uppercase tracking-wide text-slate-500">
                    <CircleAlert className="h-4 w-4" />
                    最新结论
                  </dt>
                  <dd className="mt-3 text-sm font-semibold text-white">
                    {item.verdict}
                  </dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-6 rounded-3xl border border-dashed border-slate-700 bg-slate-950/70 px-6 py-10 text-center text-sm text-slate-400">
          暂无可展示的房源全库数据。
        </div>
      )}
    </section>
  );
}
