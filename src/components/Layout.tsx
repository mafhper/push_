import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useSnapshotManifest } from "@/hooks/useGitHub";
import { cn } from "@/lib/utils";
import { Compass, Home, PanelTop, Settings, ShieldAlert, TerminalSquare } from "lucide-react";

const promoLinks = [
  { to: "/", label: "Home" },
  { to: "/technology", label: "Technology" },
  { to: "/faq", label: "FAQ" },
  { to: "/about", label: "About" },
];

const appLinks = [
  { to: "/app", label: "Overview", icon: PanelTop },
  { to: "/app/alerts", label: "Alerts", icon: ShieldAlert },
  { to: "/app/settings", label: "Settings", icon: Settings },
];

export function Layout() {
  const location = useLocation();
  const { data: manifest } = useSnapshotManifest();
  const isAppRoute = location.pathname.startsWith("/app");

  return (
    <div className="min-h-screen bg-background text-foreground">
      {isAppRoute ? <AppChrome /> : <PromoChrome />}
      <div className={cn(isAppRoute ? "lg:pl-72" : "")}>
        <main className={cn(isAppRoute ? "px-5 py-8 sm:px-8 lg:px-10" : "px-5 pt-28 sm:px-8 lg:px-12")}>
          <Outlet />
        </main>
        <footer className={cn(
          "border-t border-outline-variant/15 px-5 py-10 sm:px-8 lg:px-12",
          isAppRoute ? "bg-surface-container-lowest" : "bg-surface-container-lowest/80"
        )}>
          <div className="mx-auto flex max-w-[1440px] flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <p className="font-headline text-3xl font-bold tracking-tight text-foreground/15">Push_</p>
              <p className="max-w-md text-sm text-muted-foreground">
                Semantic Terminal for public repository health, delivered as a secure snapshot application on GitHub Pages.
              </p>
            </div>
            <div className="space-y-2 text-xs uppercase tracking-[0.24em] text-muted-foreground">
              <p>Snapshot mode: {manifest?.status.dataMode ?? "loading"}</p>
              <p>Generated: {manifest?.status.generatedAt ? new Date(manifest.status.generatedAt).toLocaleString() : "pending"}</p>
              <div className="flex gap-4 text-[11px] tracking-[0.18em]">
                <Link to="/" className="hover:text-primary">Home</Link>
                <Link to="/app" className="hover:text-primary">App</Link>
                <a href="https://github.com/mafhper/push_" target="_blank" rel="noreferrer" className="hover:text-primary">GitHub</a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

function PromoChrome() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-outline-variant/10 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between px-5 py-5 sm:px-8 lg:px-12">
        <Link to="/" className="font-headline text-2xl font-bold tracking-tight text-foreground">
          Push<span className="text-primary">_</span>
        </Link>
        <nav className="hidden items-center gap-7 md:flex">
          {promoLinks.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "text-sm font-semibold tracking-tight text-muted-foreground transition-colors hover:text-foreground",
                  isActive && "text-primary"
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <Link
          to="/app"
          className="rounded-full bg-gradient-to-br from-primary to-success px-4 py-2 text-sm font-bold text-primary-foreground shadow-[0_0_30px_rgba(0,255,65,0.22)] transition-transform hover:scale-[0.98]"
        >
          Open App
        </Link>
      </div>
    </header>
  );
}

function AppChrome() {
  return (
    <>
      <aside className="fixed inset-y-0 left-0 hidden w-72 border-r border-outline-variant/10 bg-surface-container-lowest px-6 py-8 lg:flex lg:flex-col">
        <div className="space-y-2">
          <Link to="/" className="inline-flex items-center gap-3 font-headline text-2xl font-bold tracking-tight">
            <TerminalSquare className="text-primary" />
            <span>Push_</span>
          </Link>
          <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Semantic Terminal</p>
        </div>
        <nav className="mt-10 space-y-2">
          {appLinks.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/app"}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-muted-foreground transition-colors hover:bg-surface-container hover:text-foreground",
                  isActive && "bg-surface-container text-primary"
                )
              }
            >
              <item.icon size={16} />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto rounded-[1.5rem] bg-surface-container p-5">
          <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Deployment</p>
          <p className="mt-3 text-sm leading-6 text-foreground">
            Static Pages build with local-only secure sync support for richer GitHub signals.
          </p>
          <Link to="/app/settings" className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-primary">
            <Compass size={14} />
            Local mode setup
          </Link>
        </div>
      </aside>
      <div className="sticky top-0 z-40 border-b border-outline-variant/10 bg-background/82 backdrop-blur-xl lg:hidden">
        <div className="flex items-center justify-between px-5 py-4">
          <Link to="/app" className="font-headline text-xl font-bold tracking-tight text-foreground">
            Push<span className="text-primary">_</span>
          </Link>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <Link to="/" className="inline-flex items-center gap-1 hover:text-primary"><Home size={14} /> Site</Link>
            <Link to="/app/alerts" className="inline-flex items-center gap-1 hover:text-primary"><ShieldAlert size={14} /> Alerts</Link>
          </div>
        </div>
      </div>
    </>
  );
}
