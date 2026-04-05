import {
  Building2,
  Database,
  Home,
  Radar,
  Settings,
} from "lucide-react";
import { useEffect, useState } from "react";

interface NavItem {
  label: string;
  href: string;
  icon: typeof Home;
}

const navItems: NavItem[] = [
  { label: "首页", href: "#overview", icon: Home },
  { label: "重点关注小区", href: "#focus-communities", icon: Building2 },
  { label: "房源全库", href: "#inventory", icon: Database },
  { label: "降价雷达", href: "#price-radar", icon: Radar },
  { label: "系统设置", href: "#settings", icon: Settings },
];

function resolveActiveHref(hash: string): string {
  return navItems.some((item) => item.href === hash) ? hash : "#overview";
}

export function Sidebar(): React.JSX.Element {
  const [activeHref, setActiveHref] = useState<string>(() =>
    typeof window === "undefined" ? "#overview" : resolveActiveHref(window.location.hash),
  );

  const handleNavClick = (
    event: React.MouseEvent<HTMLAnchorElement>,
    href: string,
  ) => {
    event.preventDefault();

    const targetId = href.replace(/^#/, "");
    const targetElement = document.getElementById(targetId);

    setActiveHref(href);
    window.location.hash = href;

    if (
      targetElement &&
      "scrollIntoView" in targetElement &&
      typeof targetElement.scrollIntoView === "function"
    ) {
      targetElement.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  useEffect(() => {
    const syncActiveHref = () => {
      setActiveHref(resolveActiveHref(window.location.hash));
    };

    syncActiveHref();
    window.addEventListener("hashchange", syncActiveHref);

    return () => {
      window.removeEventListener("hashchange", syncActiveHref);
    };
  }, []);

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-slate-800 bg-slate-950 lg:flex">
      <div className="flex w-full flex-col px-4 py-6">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-300">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400">
                房源监测与价格雷达
              </p>
              <h2 className="text-base font-semibold text-white">
                房脉 PropPulse
              </h2>
            </div>
          </div>
        </div>

        <nav className="mt-8 flex flex-1 flex-col gap-2" aria-label="主导航">
          {navItems.map((item) => {
            const Icon = item.icon;

            return (
              <a
                key={item.label}
                href={item.href}
                onClick={(event) => {
                  handleNavClick(event, item.href);
                }}
                aria-current={item.href === activeHref ? "page" : undefined}
                className={[
                  "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition",
                  item.href === activeHref
                    ? "bg-emerald-500/15 text-emerald-300"
                    : "text-slate-300 hover:bg-slate-900 hover:text-white",
                ].join(" ")}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </a>
            );
          })}
        </nav>

        <div
          id="settings"
          className="rounded-3xl border border-slate-800 bg-slate-900/70 p-4 text-sm text-slate-300"
        >
          <p className="font-medium text-white">今日策略</p>
          <p className="mt-2 leading-6 text-slate-400">
            优先复核最近两次抓取中的真实降价样本，并结合连续观测天数关注需要人工跟进的异常变化。
          </p>
        </div>
      </div>
    </aside>
  );
}
