import { Activity, GitPullRequest, Package, ShieldAlert } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { SignalFieldHero } from "@/components/site/SignalFieldHero";
import { SITE_REPOSITORY_URL } from "@/config/site";

export default function HomePage() {
  return (
    <div className="bg-background">
      <SignalFieldHero />

      <section className="mx-auto grid max-w-6xl gap-10 px-6 py-16 md:grid-cols-[0.9fr_1.1fr] md:px-8">
        <div>
          <p className="text-micro font-semibold uppercase tracking-wider text-primary">Why it exists</p>
          <h2 className="mt-3 font-headline text-3xl font-semibold leading-tight text-foreground sm:text-4xl">
            Stop treating every repository as equally urgent.
          </h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <FeatureLine icon={<ShieldAlert size={17} />} title="Security first" body="Dependabot alerts and critical findings rise above ordinary repository activity." />
          <FeatureLine icon={<Activity size={17} />} title="CI pressure" body="Failed workflows and degraded health are visible before status becomes background noise." />
          <FeatureLine icon={<GitPullRequest size={17} />} title="Review load" body="Open PRs contribute to attention scoring so maintenance queues stay honest." />
          <FeatureLine icon={<Package size={17} />} title="Runtime-scoped packages" body="Package inventory and alert availability are explicit in public and local modes." />
        </div>
      </section>

      <section className="border-y border-border/60 bg-surface-1/45">
        <div className="mx-auto grid max-w-6xl gap-8 px-6 py-14 md:grid-cols-3 md:px-8">
          <Metric label="Published runtime" value="No browser token" />
          <Metric label="Local runtime" value="Memory-only token" />
          <Metric label="Primary workflow" value="Queue to inspector" />
        </div>
      </section>

      <section className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-16 md:flex-row md:items-end md:justify-between md:px-8">
        <div className="max-w-2xl">
          <h2 className="font-headline text-3xl font-semibold text-foreground">Open the console.</h2>
          <p className="mt-3 text-body text-foreground-muted">
            Inspect the public snapshot now, or run locally with a GitHub token for richer package, Dependabot, workflow, and repository selection data.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link to="/app" className="inline-flex h-11 items-center justify-center rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90">
            Open console
          </Link>
          <a href={SITE_REPOSITORY_URL} className="inline-flex h-11 items-center justify-center rounded-lg border border-border px-5 text-sm font-semibold text-foreground transition-colors hover:bg-surface-1">
            View source
          </a>
        </div>
      </section>
    </div>
  );
}

function FeatureLine({ icon, title, body }: { icon: ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-surface-1 p-4">
      <div className="flex items-center gap-2 text-primary">
        {icon}
        <h3 className="font-headline text-title font-semibold text-foreground">{title}</h3>
      </div>
      <p className="mt-3 text-body text-foreground-muted">{body}</p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-micro font-semibold uppercase tracking-wider text-foreground-subtle">{label}</p>
      <p className="mt-2 font-headline text-2xl font-semibold text-foreground">{value}</p>
    </div>
  );
}
