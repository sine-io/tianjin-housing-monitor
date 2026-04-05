import { ArrowDownRight } from "lucide-react";

import type { DroppedListing } from "./dashboard-types";

interface DroppedListingsTableProps {
  items: DroppedListing[];
}

export function DroppedListingsTable({
  items,
}: DroppedListingsTableProps): React.JSX.Element {
  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">今日高优降价房源榜</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            结合降幅、连续观测天数与板块均价偏离，优先筛出可快速跟进的降价样本。
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm font-medium text-emerald-300">
          <ArrowDownRight className="h-4 w-4" />
          价格信号偏积极
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-3xl border border-slate-800">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-800 text-sm">
            <caption className="sr-only">今日高优降价房源榜</caption>
            <thead className="bg-slate-950/80 text-left text-slate-400">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium">
                  小区
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  面积
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  原价
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  现价
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  降幅
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  连续观测天数
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 bg-slate-900/60">
              {items.map((item) => (
                <tr
                  key={item.id}
                  data-testid="dropped-listing-row"
                  className="text-slate-200"
                >
                  <td className="px-4 py-4">
                    <div className="font-medium text-white">{item.community}</div>
                    <div className="mt-1 text-xs text-slate-400">{item.note}</div>
                  </td>
                  <td className="px-4 py-4">{item.area}</td>
                  <td className="px-4 py-4 text-slate-400 line-through">
                    {item.originalPrice}
                  </td>
                  <td className="px-4 py-4 font-medium text-white">
                    {item.currentPrice}
                  </td>
                  <td className="px-4 py-4">
                    <span className="inline-flex rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-300">
                      {item.drop}
                    </span>
                  </td>
                  <td className="px-4 py-4">{item.daysOnMarket}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
