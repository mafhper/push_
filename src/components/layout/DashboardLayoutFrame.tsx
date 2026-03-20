import { APP_ROUTES, SITE_NAME, SITE_REPOSITORY_URL } from "@/config/site";
import { cn } from "@/lib/utils";
import { Github, Settings, ShieldAlert, SquareTerminal } from "lucide-react";
import { Link, NavLink, Outlet } from "react-router-dom";

function AppFooter({ modeLabel }: { modeLabel: string }) {
  const syncLabel =
    modeLabel === "local-authenticated"
      ? "LOCAL_SESSION: AUTHENTICATED"
      : modeLabel === "authenticated-snapshot"
        ? "LAST_SYNC: AUTHENTICATED SNAPSHOT"
        : "LAST_SYNC: STATIC SNAPSHOT";
  const clusterLabel = modeLabel === "local-authenticated" ? "CLUSTER: BROWSER-GH-API" : "CLUSTER: GH-PAGES-EDGE-1";

  return (
    <footer className="terminal-footer full-bleed mt-auto py-12">
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="wordmark-ghost text-[28vw] leading-none">PUSH_</div>
      </div>
      <div className="editorial-frame relative flex flex-col justify-between gap-8 px-6 md:flex-row md:items-end md:px-10">
        <div className="space-y-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-foreground/55">
            2026 PUSH_ SEMANTIC TERMINAL. ALL SYSTEMS OPERATIONAL.
          </p>
          <div className="flex flex-wrap gap-6 font-mono text-[10px] uppercase tracking-[0.24em] text-foreground/55">
            <Link to="/faq" className="hover:text-primary">Privacy</Link>
            <Link to="/technology" className="hover:text-primary">Terms</Link>
            <Link to="/app/alerts" className="hover:text-primary">Security</Link>
            <Link to="/app" className="hover:text-primary">System Status</Link>
          </div>
        </div>
        <div className="space-y-2 text-right">
          <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-primary">{syncLabel}</p>
          <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-foreground/55">{clusterLabel}</p>
        </div>
      </div>
    </footer>
  );
}

export function DashboardLayoutFrame({
  modeLabel,
  identityLabel,
}: {
  modeLabel: string;
  identityLabel?: string | null;
}) {
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[16rem_minmax(0,1fr)]">
      <aside className="hidden border-r border-white/5 bg-[rgba(10,10,10,0.7)] lg:flex lg:min-h-screen lg:flex-col lg:px-4 lg:py-8">
        <div className="space-y-5 px-3">
          <div className="rounded-[1.85rem] border border-white/[0.05] bg-white/[0.015] px-4 py-4">
            <Link to="/app" className="block text-3xl font-black tracking-tighter text-primary">
              Push<span className="text-foreground">_</span>
            </Link>
            <div className="mt-4 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-primary shadow-[0_0_12px_rgba(0,255,65,0.8)]" />
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-foreground/38">{modeLabel}</p>
            </div>
          </div>
        </div>

        <nav className="mt-14 space-y-3">
          {APP_ROUTES.map((route) => (
            <NavLink
              key={route.href}
              to={route.href}
              end={route.href === "/app"}
              className={({ isActive }) =>
                cn(
                  "group relative flex items-center gap-3.5 overflow-hidden rounded-[1.65rem] px-4 py-4 pl-6 text-[15px] font-semibold text-foreground/42 transition-all duration-200",
                  "hover:bg-white/[0.035] hover:text-foreground/78",
                  isActive && "bg-[linear-gradient(90deg,rgba(0,255,65,0.11),rgba(0,255,65,0.035))] text-primary shadow-[0_0_0_1px_rgba(0,255,65,0.2),0_18px_28px_rgba(0,255,65,0.07)]",
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive ? (
                    <>
                      <span className="absolute inset-y-3 left-3 w-px rounded-full bg-[linear-gradient(180deg,rgba(0,255,65,0.08),rgba(0,255,65,0.95),rgba(0,255,65,0.08))]" />
                      <span className="absolute left-1 top-1/2 h-9 w-9 -translate-y-1/2 rounded-full bg-primary/16 blur-xl" />
                    </>
                  ) : null}
                  <span
                    className={cn(
                      "relative z-[1] flex h-10 w-10 items-center justify-center rounded-[1.1rem] border border-white/6 bg-white/[0.018] text-foreground/42 transition-all duration-200 group-hover:border-white/12 group-hover:bg-white/[0.045] group-hover:text-foreground/72",
                      isActive && "border-primary/28 bg-primary/[0.11] text-primary shadow-[0_0_22px_rgba(0,255,65,0.12)]",
                    )}
                  >
                    {route.label === "Painel" ? <SquareTerminal size={18} /> : route.label === "Alertas" ? <ShieldAlert size={18} /> : <Settings size={18} />}
                  </span>
                  <span className={cn("relative z-[1] tracking-[-0.01em]", isActive ? "text-primary" : "text-inherit")}>
                    {route.label}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="mt-10 px-3">
          <div className="rounded-[1.85rem] border border-white/[0.05] bg-white/[0.015] p-3">
            <p className="px-2 font-mono text-[10px] uppercase tracking-[0.22em] text-foreground/32">Control</p>
            <Link to="/app/settings" className="button-primary-terminal mt-3 w-full justify-center px-4 py-3.5 text-xs uppercase tracking-[0.22em]">
              <Github size={14} />
              Manage Repositories
            </Link>
          </div>
        </div>

        <div className="mt-auto px-3 pb-4 pt-12">
          <div className="rounded-[1.7rem] border border-white/[0.05] bg-white/[0.012] px-4 py-4 font-mono text-[10px] uppercase tracking-[0.22em] text-foreground/30">
            <a href={SITE_REPOSITORY_URL} className="block transition-colors hover:text-foreground/68">Docs</a>
            <div className="my-3 h-px bg-white/[0.04]" />
            <Link to="/faq" className="block transition-colors hover:text-foreground/68">Support</Link>
          </div>
        </div>
      </aside>

      <div className="min-w-0 lg:flex lg:min-h-screen lg:flex-col">
        <header className="sticky top-0 z-30 border-b border-white/5 bg-background/92 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-4 px-6 py-4 md:px-8">
            <div className="space-y-1">
              <p className="font-headline text-xl font-bold tracking-tight text-foreground">
                {SITE_NAME}_<span className="text-primary">Terminal</span>
              </p>
            </div>
            <div className="flex items-center gap-3">
              {identityLabel ? (
                <Link
                  to="/app/settings"
                  className="hidden rounded-xl border border-primary/18 bg-primary/[0.08] px-3 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/[0.12] md:inline-flex"
                >
                  {identityLabel}
                </Link>
              ) : null}
              <Link to="/app/settings" className="button-secondary-terminal px-4 py-2.5 text-sm">
                Settings
              </Link>
              <a href={SITE_REPOSITORY_URL} className="button-secondary-terminal px-4 py-2.5 text-sm">
                <Github size={14} />
                Repository
              </a>
            </div>
          </div>
        </header>

        <main className="flex min-h-0 flex-1 flex-col px-6 py-8 md:px-8">
          <Outlet />
        </main>
        <AppFooter modeLabel={modeLabel} />
      </div>
    </div>
  );
}
