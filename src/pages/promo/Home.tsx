import { Link } from "react-router-dom";
import { useDashboardSnapshot } from "@/hooks/useGitHub";
import { ArrowRight, PanelTop, ShieldAlert, Workflow } from "lucide-react";

const capabilities = [
  {
    title: "Intentional asymmetry",
    body: "Editorial spacing and tonal zoning keep dense repository metrics readable without falling into generic SaaS card layouts.",
  },
  {
    title: "Static-first security",
    body: "GitHub Pages ships snapshot JSON only. No PAT is stored in localStorage, no browser auth flow remains in production.",
  },
  {
    title: "Local secure sync",
    body: "Use `.env.local` and the Node sync script to enrich the dataset locally while keeping secrets out of the client bundle.",
  },
];

export default function HomePage() {
  const { data } = useDashboardSnapshot();
  const featured = data?.repos[0];

  return (
    <div className="mx-auto max-w-[1440px] space-y-28 pb-12">
      <section className="grid gap-10 xl:grid-cols-[1.1fr,0.9fr]">
        <div className="space-y-8">
          <span className="inline-flex rounded-full bg-surface-container-high px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-secondary">
            Public repo observability
          </span>
          <div className="space-y-5">
            <h1 className="max-w-4xl text-fluid-5xl font-headline font-bold text-balance">
              A semantic command center for your public GitHub footprint.
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-muted-foreground">
              Push_ turns published repositories into a promo site and snapshot dashboard that can live entirely on GitHub Pages without exposing API keys or tokens.
            </p>
          </div>
          <div className="flex flex-wrap gap-4">
            <Link to="/app" className="rounded-full bg-gradient-to-br from-primary to-success px-6 py-3 text-sm font-bold text-primary-foreground shadow-[0_0_30px_rgba(0,255,65,0.22)]">
              Open dashboard
            </Link>
            <Link to="/technology" className="rounded-full bg-surface-container-low px-6 py-3 text-sm font-bold text-foreground">
              Inspect stack
            </Link>
          </div>
        </div>

        <div className="rounded-[2rem] bg-surface-container p-7 shadow-[0_0_40px_rgba(0,0,0,0.18)]">
          <div className="flex items-center justify-between text-xs uppercase tracking-[0.28em] text-muted-foreground">
            <span>Snapshot preview</span>
            <span>{data?.status.dataMode ?? "pending"}</span>
          </div>
          <div className="mt-7 rounded-[1.6rem] bg-surface-container-low p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.22em] text-muted-foreground">Featured node</p>
                <h2 className="mt-2 text-3xl font-headline font-bold">{featured?.repo.name ?? "push_"}</h2>
              </div>
              <span className="rounded-full bg-surface-container-high px-4 py-2 text-sm font-bold text-primary">
                {featured?.health.score ?? 93}
              </span>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <PreviewStat icon={PanelTop} label="Repos" value={data?.repos.length ?? 1} />
              <PreviewStat icon={Workflow} label="CI" value={featured?.health.workflowSuccessRate ? `${featured.health.workflowSuccessRate}%` : "96%"} />
              <PreviewStat icon={ShieldAlert} label="Alerts" value={featured?.health.dependabotOpenCount ?? 0} />
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-3">
        {capabilities.map((item) => (
          <article key={item.title} className="rounded-[1.75rem] bg-surface-container p-6">
            <p className="text-xs uppercase tracking-[0.26em] text-secondary">Capability</p>
            <h2 className="mt-4 text-2xl font-headline font-bold">{item.title}</h2>
            <p className="mt-4 text-sm leading-7 text-muted-foreground">{item.body}</p>
          </article>
        ))}
      </section>

      <section className="rounded-[2.4rem] bg-surface-container-lowest p-8 sm:p-12">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-xs uppercase tracking-[0.28em] text-secondary">Single repository, shared system</p>
          <h2 className="mt-4 text-fluid-4xl font-headline font-bold">Promo and app, one semantic surface.</h2>
          <p className="mt-4 text-base leading-8 text-muted-foreground">
            Marketing copy, technology pages, FAQ, about and the repository dashboard all live in one Vite app, with one design system and one GitHub Pages deployment.
          </p>
          <Link to="/faq" className="mt-8 inline-flex items-center gap-2 text-sm font-bold text-primary">
            Review how the secure snapshot works
            <ArrowRight size={14} />
          </Link>
        </div>
      </section>
    </div>
  );
}

function PreviewStat({ icon: Icon, label, value }: { icon: typeof PanelTop; label: string; value: string | number }) {
  return (
    <div className="rounded-[1.3rem] bg-surface-container p-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
        <Icon size={12} />
        {label}
      </div>
      <p className="mt-3 text-2xl font-headline font-bold">{value}</p>
    </div>
  );
}
