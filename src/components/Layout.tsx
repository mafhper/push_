import { SITE_NAME, SITE_REPOSITORY_URL } from "@/config/site";
import { Link, Outlet } from "react-router-dom";

export function PromoLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-xl">
        <div className="flex items-center justify-between px-6 py-4 max-w-5xl mx-auto">
          <Link to="/" className="font-headline text-xl font-bold tracking-tight">
            {SITE_NAME}<span className="text-primary">_</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link
              to="/app"
              className="rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-surface-1 transition-colors"
            >
              Dashboard
            </Link>
            <a
              href={SITE_REPOSITORY_URL}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              GitHub
            </a>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
