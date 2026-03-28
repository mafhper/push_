import { PROMO_ROUTES, SITE_NAME, SITE_REPOSITORY_URL } from "@/config/site";
import { useApp } from "@/contexts/useApp";
import { cn } from "@/lib/utils";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";

function PromoFooter() {
  const { t } = useApp();

  return (
    <footer className="terminal-footer mt-auto overflow-hidden border-t border-white/5">
      <div className="wordmark-ghost absolute inset-x-0 bottom-0 text-center text-[34vw] leading-none opacity-50 md:text-[20vw]">Push_</div>
      <div className="editorial-frame relative grid gap-6 px-6 py-10 md:px-10 md:py-16 lg:grid-cols-[minmax(0,1.15fr)_24rem] lg:items-end">
        <div className="space-y-5">
          <div className="max-w-xl space-y-3">
            <p className="terminal-label text-primary">{t("publicRuntime")}</p>
            <p className="text-4xl font-black tracking-tighter text-foreground">{t("snapshotSafeDashboard")}</p>
            <p className="max-w-lg text-base leading-6 text-foreground/60">
              {t("publicRuntimeBody")}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <a
              href={SITE_REPOSITORY_URL}
              className="rounded-full border border-white/8 bg-white/[0.02] px-4 py-2 text-sm text-foreground/60 transition-colors hover:border-white/14 hover:text-primary"
            >
              {t("githubRepository")}
            </a>
            <Link
              to="/technology"
              className="rounded-full border border-white/8 bg-white/[0.02] px-4 py-2 text-sm text-foreground/60 transition-colors hover:border-white/14 hover:text-primary"
            >
              {t("technology")}
            </Link>
            <Link
              to="/app"
              className="rounded-full border border-white/8 bg-white/[0.02] px-4 py-2 text-sm text-foreground/60 transition-colors hover:border-white/14 hover:text-primary"
            >
              {t("dashboard")}
            </Link>
            <Link
              to="/faq"
              className="rounded-full border border-white/8 bg-white/[0.02] px-4 py-2 text-sm text-foreground/60 transition-colors hover:border-white/14 hover:text-primary"
            >
              {t("faq")}
            </Link>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
          <div className="rounded-[1.6rem] ops-surface-deep px-5 py-4">
            <p className="terminal-label">{t("systemReady")}</p>
            <p className="mt-3 text-sm leading-6 text-foreground/58">{t("systemReadyBody")}</p>
          </div>
          <div className="rounded-[1.6rem] ops-surface-deep px-5 py-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-primary">{t("networkOnline")}</p>
            <p className="mt-3 text-sm leading-6 text-foreground/58">{t("networkOnlineBody")}</p>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-white/5 pt-5 text-xs tracking-[0.18em] text-foreground/55 sm:flex-row sm:items-center sm:justify-between lg:col-span-2">
          <span>{t("semanticTerminal")}</span>
          <span className="inline-flex items-center gap-2 text-primary"><span className="h-2 w-2 rounded-full bg-primary" />{t("networkOnline")}</span>
        </div>
      </div>
    </footer>
  );
}

export function PromoLayout() {
  const location = useLocation();
  const { t } = useApp();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-white/5 bg-background/85 backdrop-blur-xl">
        <div className="editorial-frame flex items-center justify-between gap-4 px-6 py-5 md:px-10">
          <div className="space-y-1">
            <Link to="/" className="text-lg font-black tracking-tighter">{SITE_NAME}<span className="text-primary">_</span></Link>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-foreground/34">{t("publicGitHubMonitoring")}</p>
          </div>
          <nav className="hidden items-center gap-2 md:flex">
            {PROMO_ROUTES.map((route) => (
              <NavLink
                key={route.href}
                to={route.href}
                className={({ isActive }) =>
                  cn(
                    "rounded-full px-4 py-2 text-sm font-semibold text-foreground/60 transition-colors hover:bg-white/[0.04] hover:text-foreground",
                    (isActive || location.pathname === route.href) && "bg-primary/[0.08] text-primary",
                  )
                }
              >
                {t(route.labelKey)}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <Link to="/app" className="button-secondary-terminal hidden md:inline-flex">{t("openApp")}</Link>
            <a href={SITE_REPOSITORY_URL} className="button-primary-terminal px-4 py-2.5 text-sm">
              {t("viewOnGitHub")}
            </a>
          </div>
        </div>

        <div className="editorial-frame px-6 pb-3 md:hidden md:px-10">
          <nav className="flex gap-2 overflow-x-auto">
            {PROMO_ROUTES.map((route) => (
              <NavLink
                key={route.href}
                to={route.href}
                className={({ isActive }) =>
                  cn(
                    "shrink-0 rounded-full px-4 py-2 text-sm font-semibold text-foreground/60 transition-colors",
                    (isActive || location.pathname === route.href) ? "bg-primary/[0.08] text-primary" : "bg-white/[0.03] hover:text-foreground",
                  )
                }
              >
                {t(route.labelKey)}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main className="editorial-frame flex flex-1 flex-col px-6 py-12 md:px-10 md:py-16">
        <Outlet />
      </main>
      <PromoFooter />
    </div>
  );
}
