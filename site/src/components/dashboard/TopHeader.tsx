import { Clock3, Search } from "lucide-react";

interface TopHeaderProps {
  lastUpdatedLabel: string;
}

export function TopHeader({
  lastUpdatedLabel,
}: TopHeaderProps): React.JSX.Element {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-800 bg-slate-950/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <label className="relative block min-w-0 sm:w-80">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="search"
            aria-label="全局搜索"
            placeholder="全局搜索小区或房源..."
            className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-11 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-emerald-400"
          />
        </label>
        <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-slate-300">
          <Clock3 className="h-4 w-4 text-emerald-300" />
          <span>数据最后更新于: {lastUpdatedLabel}</span>
        </div>
      </div>
    </header>
  );
}
