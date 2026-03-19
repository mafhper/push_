import { PROMO_ROUTES, SITE_NAME, SITE_REPOSITORY_URL } from "@/config/site";
import { cn } from "@/lib/utils";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";

function PromoFooter() {
  return (
    <footer className="terminal-footer full-bleed mt-auto min-h-[24rem]">
      <div className="wordmark-ghost absolute -bottom-16 left-6 text-[8rem] md:-bottom-24 md:left-10 md:text-[18rem]">Push_</div>
      <div className="editorial-frame relative flex min-h-[24rem] flex-col justify-between gap-10 px-6 py-10 md:px-10 md:py-16">
        <div className="flex flex-col justify-between gap-10 md:flex-row md:items-end">
          <div className="max-w-sm space-y-6">
            <div>
              <p className="text-4xl font-black tracking-tighter text-foreground">Push_ Terminal</p>
              <p className="mt-4 text-base leading-7 text-foreground/60">
                Public GitHub dashboard. Fast to scan. Safe to publish.
              </p>
            </div>
            <div className="flex flex-wrap gap-5 text-sm text-foreground/60">
              <a href={SITE_REPOSITORY_URL} className="hover:text-primary">GitHub Repository</a>
              <Link to="/technology" className="hover:text-primary">Technology</Link>
              <Link to="/app" className="hover:text-primary">Dashboard</Link>
              <Link to="/faq" className="hover:text-primary">FAQ</Link>
            </div>
          </div>
          <div className="space-y-3 text-left md:text-right">
            <p className="terminal-label">Push_ Ready</p>
            <p className="text-sm text-foreground/55">Selected public repositories. One view.</p>
            <p className="text-sm font-semibold text-primary">© 2026 Push_ Terminal.</p>
          </div>
        </div>
        <div className="flex items-center justify-between border-t border-white/5 pt-5 text-xs tracking-[0.18em] text-foreground/55">
          <span>Semantic Terminal</span>
          <span className="inline-flex items-center gap-2 text-primary"><span className="h-2 w-2 rounded-full bg-primary" />Network Online</span>
        </div>
      </div>
    </footer>
  );
}

export function PromoLayout() {
  const location = useLocation();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-white/5 bg-background/85 backdrop-blur-xl">
        <div className="editorial-frame flex items-center justify-between px-6 py-5 md:px-10">
          <Link to="/" className="text-lg font-black tracking-tighter">{SITE_NAME}<span className="text-primary">_</span></Link>
          <nav className="hidden items-center gap-6 md:flex">
            {PROMO_ROUTES.map((route) => (
              <NavLink
                key={route.href}
                to={route.href}
                className={({ isActive }) =>
                  cn("text-sm font-semibold text-foreground/60 hover:text-foreground", (isActive || location.pathname === route.href) && "text-primary")
                }
              >
                {route.label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <Link to="/app" className="button-secondary-terminal hidden md:inline-flex">Open App</Link>
            <a href={SITE_REPOSITORY_URL} className="button-primary-terminal px-4 py-2.5 text-sm">
              View on GitHub
            </a>
          </div>
        </div>
      </header>

      <main className="editorial-frame flex flex-1 flex-col px-6 py-12 md:px-10 md:py-16">
        <Outlet />
      </main>
      <PromoFooter />
    </div>
  );
}
