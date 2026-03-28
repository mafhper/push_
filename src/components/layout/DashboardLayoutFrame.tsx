import { APP_ROUTES, SITE_NAME, SITE_REPOSITORY_URL } from "@/config/site";
import { useApp } from "@/contexts/useApp";
import { cn } from "@/lib/utils";
import { Github, Settings, ShieldAlert, SquareTerminal } from "lucide-react";
import { Link, NavLink, Outlet } from "react-router-dom";

function AppFooter({ modeLabel }: { modeLabel: string }) {
  const { t } = useApp();
  const syncLabel =
    modeLabel === "local-authenticated"
      ? t("localSessionAuthenticated")
      : modeLabel === "public-profile"
        ? t("sourcePublicGithubApi")
      : modeLabel === "authenticated-snapshot"
        ? t("lastSyncAuthenticatedSnapshot")
        : t("lastSyncStaticSnapshot");
  const clusterLabel =
    modeLabel === "local-authenticated"
      ? t("clusterBrowserApi")
      : modeLabel === "public-profile"
        ? t("clusterPublicApi")
        : t("clusterPagesEdge");
  const runtimeSummary =
    modeLabel === "local-authenticated"
      ? t("runtimeSummaryLocal")
      : modeLabel === "public-profile"
        ? t("runtimeSummaryPublicProfile")
        : modeLabel === "authenticated-snapshot"
          ? t("runtimeSummaryAuthenticatedSnapshot")
          : t("runtimeSummaryStaticSnapshot");

  return (
    <footer className="terminal-footer mt-auto overflow-hidden border-t border-white/5">
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center overflow-hidden">
        <div className="wordmark-ghost translate-y-[28%] text-[30vw] leading-none opacity-50 md:text-[24vw] lg:text-[20vw]">PUSH_</div>
      </div>
      <div className="editorial-frame relative grid gap-6 px-6 py-10 md:px-10 md:py-12 lg:grid-cols-[minmax(0,1.2fr)_22rem] lg:items-end">
        <div className="space-y-5">
          <div className="max-w-xl space-y-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-primary">{t("runtimeBand")}</p>
            <p className="text-lg font-semibold tracking-tight text-foreground">{t("failurePressureFirst")}</p>
            <p className="text-sm leading-6 text-foreground/58">{runtimeSummary}</p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              to="/faq"
              className="rounded-full border border-white/8 bg-white/[0.02] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.22em] text-foreground/58 transition-colors hover:border-white/14 hover:text-primary"
            >
              {t("privacy")}
            </Link>
            <Link
              to="/technology"
              className="rounded-full border border-white/8 bg-white/[0.02] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.22em] text-foreground/58 transition-colors hover:border-white/14 hover:text-primary"
            >
              {t("terms")}
            </Link>
            <Link
              to="/app/alerts"
              className="rounded-full border border-white/8 bg-white/[0.02] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.22em] text-foreground/58 transition-colors hover:border-white/14 hover:text-primary"
            >
              {t("security")}
            </Link>
            <Link
              to="/app"
              className="rounded-full border border-white/8 bg-white/[0.02] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.22em] text-foreground/58 transition-colors hover:border-white/14 hover:text-primary"
            >
              {t("systemStatus")}
            </Link>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
          <div className="rounded-[1.6rem] ops-surface-deep px-5 py-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-foreground/42">{t("source")}</p>
            <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.24em] text-primary">{syncLabel}</p>
            <p className="mt-3 text-sm leading-6 text-foreground/55">{t("currentDeliveryMode")}</p>
          </div>
          <div className="rounded-[1.6rem] ops-surface-deep px-5 py-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-foreground/42">{t("edgeCluster")}</p>
            <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.24em] text-foreground/72">{clusterLabel}</p>
            <a href={SITE_REPOSITORY_URL} className="mt-3 inline-flex text-sm font-semibold text-primary transition-colors hover:text-primary/80">
              {t("openRepositoryDocs")}
            </a>
          </div>
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
  const { t } = useApp();
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[15rem_minmax(0,1fr)]">
      <aside className="hidden border-r border-white/5 bg-[linear-gradient(180deg,rgba(8,8,8,0.96),rgba(11,11,11,0.82))] lg:flex lg:min-h-screen lg:flex-col lg:px-4 lg:py-6">
        <div className="space-y-4 px-2">
          <div className="rounded-[1.9rem] ops-surface px-4 py-4">
            <Link to="/app" className="block text-3xl font-black tracking-tighter text-primary">
              Push<span className="text-foreground">_</span>
            </Link>
            <div className="mt-4 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-primary shadow-[0_0_12px_rgba(0,255,65,0.8)]" />
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-foreground/38">{modeLabel}</p>
            </div>
          </div>

          <div className="rounded-[1.9rem] ops-surface-deep p-3">
            <p className="px-2 font-mono text-[10px] uppercase tracking-[0.22em] text-foreground/32">{t("navigate")}</p>
            <nav className="mt-3 space-y-2">
              {APP_ROUTES.map((route) => (
                <NavLink
                  key={route.href}
                  to={route.href}
                  end={route.href === "/app"}
                  className={({ isActive }) =>
                    cn(
                      "group relative flex items-center gap-3 rounded-[1.35rem] px-3 py-3 text-[14px] font-semibold text-foreground/46 transition-all duration-200",
                      "hover:bg-white/[0.04] hover:text-foreground/82",
                      isActive && "bg-primary/[0.08] text-primary shadow-[inset_0_0_0_1px_rgba(0,255,65,0.14)]",
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span
                        className={cn(
                          "flex h-10 w-10 items-center justify-center rounded-[1rem] bg-white/[0.025] text-foreground/46 transition-all duration-200 group-hover:bg-white/[0.05] group-hover:text-foreground/78",
                          isActive && "bg-primary/[0.12] text-primary",
                        )}
                      >
                        {route.labelKey === "dashboard" ? <SquareTerminal size={18} /> : route.labelKey === "alerts" ? <ShieldAlert size={18} /> : <Settings size={18} />}
                      </span>
                      <div className="min-w-0">
                        <p className={cn("tracking-[-0.01em]", isActive ? "text-primary" : "text-inherit")}>{t(route.labelKey)}</p>
                        <p className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.2em] text-foreground/28">
                          {t(route.metaKey)}
                        </p>
                      </div>
                    </>
                  )}
                </NavLink>
              ))}
            </nav>
          </div>

          <div className="rounded-[1.9rem] ops-surface-deep p-3">
            <p className="px-2 font-mono text-[10px] uppercase tracking-[0.22em] text-foreground/32">{t("control")}</p>
            <Link to="/app/settings" className="button-primary-terminal mt-3 w-full justify-center px-4 py-3.5 text-[11px] uppercase tracking-[0.22em]">
              <Github size={14} />
              {t("manageRepos")}
            </Link>
            <div className="mt-3 rounded-[1.2rem] bg-white/[0.03] px-3 py-3 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]">
              <p className="terminal-label">{t("runtime")}</p>
              <p className="mt-2 text-sm text-foreground/72">{modeLabel}</p>
            </div>
          </div>
        </div>

        <div className="mt-auto px-2 pb-3 pt-8">
          <div className="rounded-[1.7rem] ops-surface-soft px-4 py-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-foreground/28">{t("help")}</p>
            <div className="mt-3 space-y-2 font-mono text-[10px] uppercase tracking-[0.22em] text-foreground/34">
              <a href={SITE_REPOSITORY_URL} className="block transition-colors hover:text-foreground/72">{t("docs")}</a>
              <Link to="/faq" className="block transition-colors hover:text-foreground/72">{t("support")}</Link>
            </div>
          </div>
        </div>
      </aside>

      <div className="min-w-0 lg:flex lg:min-h-screen lg:flex-col">
        <header className="sticky top-0 z-30 border-b border-white/5 bg-background/92 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-4 px-6 py-4 md:px-8">
            <div className="space-y-1">
              <p className="font-headline text-xl font-bold tracking-tight text-foreground">
                {SITE_NAME} <span className="text-primary">Terminal</span>
              </p>
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-foreground/34">
                {t("attentionFirstCommandCenter")}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {identityLabel ? (
                <Link
                  to="/app/settings"
                  className="hidden rounded-full bg-primary/[0.1] px-3 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/[0.14] md:inline-flex"
                >
                  {identityLabel}
                </Link>
              ) : null}
              <Link to="/app/settings" className="button-secondary-terminal px-4 py-2.5 text-sm">
                {t("settings")}
              </Link>
              <a href={SITE_REPOSITORY_URL} className="button-secondary-terminal px-4 py-2.5 text-sm">
                <Github size={14} />
                {t("githubRepository")}
              </a>
            </div>
          </div>

          <div className="border-t border-white/[0.04] px-4 py-3 lg:hidden">
            <nav className="flex gap-2 overflow-x-auto pb-1">
              {APP_ROUTES.map((route) => (
                <NavLink
                  key={route.href}
                  to={route.href}
                  end={route.href === "/app"}
                  className={({ isActive }) =>
                    cn(
                      "flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-foreground/55 transition-colors",
                      isActive ? "bg-primary/[0.1] text-primary" : "bg-white/[0.03] hover:bg-white/[0.05] hover:text-foreground/84",
                    )
                  }
                >
                  {route.labelKey === "dashboard" ? <SquareTerminal size={15} /> : route.labelKey === "alerts" ? <ShieldAlert size={15} /> : <Settings size={15} />}
                  {t(route.labelKey)}
                </NavLink>
              ))}
            </nav>
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
