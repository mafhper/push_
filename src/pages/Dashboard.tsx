import { Link } from "react-router-dom";
import { useDashboardSnapshot } from "@/hooks/useGitHub";
import { formatRelativeTime } from "@/utils/health";
import { useApp } from "@/contexts/AppContext";
import { Activity, ArrowRight, FolderKanban, ShieldAlert, Sparkle, Workflow } from "lucide-react";

export default function Dashboard() {
  const { data, isLoading, error } = useDashboardSnapshot();
  const { t } = useApp();

  if (isLoading) {
    return <LoadingState label="Loading snapshot overview" />;
  }

  if (!data || error) {
    return <EmptyState title="Snapshot unavailable" body="The secure dataset could not be loaded. Run the local sync or regenerate the Pages snapshot." />;
  }

  const averageHealth = Math.round(
    data.repos.reduce((sum, repo) => sum + repo.health.score, 0) / Math.max(data.repos.length, 1),
  );
  const totalAlerts = data.repos.reduce((sum, repo) => sum + repo.health.dependabotOpenCount, 0);
  const featured = data.repos.find((repo) => repo.repo.fullName === data.featuredRepo) || data.repos[0];

  return (
    <div className="mx-auto max-w-[1440px] space-y-10">
      <section className="grid gap-6 xl:grid-cols-[1.4fr,1fr]">
        <div className="rounded-[2rem] bg-surface-container p-7 shadow-[0_0_40px_rgba(0,0,0,0.18)]">
          <p className="text-xs uppercase tracking-[0.3em] text-primary">Fleet health</p>
          <h1 className="mt-4 max-w-3xl text-fluid-4xl font-headline font-bold text-balance">
            Dashboard overview for the repositories that define your public surface area.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
            The Pages build consumes static JSON snapshots only. Public deployments remain secret-free while local sync can enrich the dataset.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <MetricPanel label="Average integrity" value={`${averageHealth}%`} icon={Sparkle} />
            <MetricPanel label="Tracked repos" value={String(data.repos.length)} icon={FolderKanban} />
            <MetricPanel label="Open alerts" value={String(totalAlerts)} icon={ShieldAlert} tone={totalAlerts > 0 ? "warning" : "success"} />
          </div>
        </div>
        <div className="rounded-[2rem] bg-surface-container-low p-7">
          <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">Snapshot status</p>
          <dl className="mt-5 space-y-5">
            <StatusRow label="Generated" value={new Date(data.status.generatedAt).toLocaleString()} />
            <StatusRow label="Mode" value={data.status.dataMode} />
            <StatusRow label="Origin" value={data.status.generatedBy} />
            <StatusRow label="Freshness" value={featured ? formatRelativeTime(featured.repo.lastPushAt, t) : "n/a"} />
          </dl>
        </div>
      </section>

      {featured && (
        <section className="grid gap-6 xl:grid-cols-[1.3fr,0.9fr]">
          <div className="rounded-[2rem] bg-surface-container p-7">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-secondary">Featured repository</p>
                <h2 className="mt-3 text-4xl font-headline font-bold">{featured.repo.name}</h2>
                <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
                  {featured.repo.description || "Public repository with generated overview data."}
                </p>
              </div>
              <div className="rounded-2xl bg-surface-container-high px-5 py-4 text-right">
                <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Health</p>
                <p className="mt-2 text-4xl font-headline font-bold text-primary">{featured.health.score}</p>
              </div>
            </div>
            <div className="mt-7 grid gap-4 md:grid-cols-4">
              <MetricChip label="Stars" value={featured.repo.stars} />
              <MetricChip label="Forks" value={featured.repo.forks} />
              <MetricChip label="CI" value={featured.health.workflowSuccessRate ? `${featured.health.workflowSuccessRate}%` : "--"} />
              <MetricChip label="Alerts" value={featured.health.dependabotOpenCount} />
            </div>
            <div className="mt-7 flex flex-wrap gap-3">
              {featured.repo.topics.map((topic) => (
                <span key={topic} className="rounded-full bg-surface-container-high px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  {topic}
                </span>
              ))}
            </div>
            <Link
              to={`/app/repo/${featured.repo.owner}/${featured.repo.name}`}
              className="mt-8 inline-flex items-center gap-2 text-sm font-bold text-primary"
            >
              Open repository detail
              <ArrowRight size={14} />
            </Link>
          </div>

          <div className="rounded-[2rem] bg-surface-container-lowest p-7 editorial-grid">
            <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">Availability matrix</p>
            <div className="mt-5 space-y-3 rounded-[1.5rem] bg-surface-container/90 p-5">
              {Object.entries(featured.availability).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between text-sm">
                  <span className="capitalize text-muted-foreground">{key.replace(/([A-Z])/g, " $1")}</span>
                  <span className={value.available ? "text-success" : "text-warning"}>
                    {value.available ? value.source : value.reason || "Unavailable"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-headline font-bold">Repository matrix</h2>
          <Link to="/app/alerts" className="inline-flex items-center gap-2 text-sm font-bold text-primary">
            Review alerts
            <ArrowRight size={14} />
          </Link>
        </div>
        <div className="grid gap-5 xl:grid-cols-3">
          {data.repos.map((item) => (
            <Link
              key={item.repo.id}
              to={`/app/repo/${item.repo.owner}/${item.repo.name}`}
              className="rounded-[1.75rem] bg-surface-container p-6 transition-colors hover:bg-surface-container-high"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.22em] text-muted-foreground">{item.repo.owner}</p>
                  <h3 className="mt-2 text-2xl font-headline font-bold">{item.repo.name}</h3>
                </div>
                <span className="rounded-full bg-surface-container-high px-3 py-1 text-sm font-bold text-primary">
                  {item.health.score}
                </span>
              </div>
              <p className="mt-4 min-h-[72px] text-sm leading-6 text-muted-foreground">
                {item.repo.description || "Public repository snapshot."}
              </p>
              <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
                <MiniStat icon={Workflow} label="CI" value={item.health.workflowSuccessRate ? `${item.health.workflowSuccessRate}%` : "--"} />
                <MiniStat icon={ShieldAlert} label="Alerts" value={item.health.dependabotOpenCount} />
                <MiniStat icon={Activity} label="Stale" value={`${item.health.stalenessDays}d`} />
                <MiniStat icon={FolderKanban} label="Commits" value={item.stats.totalCommitsTracked} />
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="rounded-[2rem] bg-surface-container-low p-4 sm:p-6">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left">
            <thead className="text-xs uppercase tracking-[0.26em] text-muted-foreground">
              <tr>
                <th className="pb-4 font-medium">Repository</th>
                <th className="pb-4 font-medium">Health</th>
                <th className="pb-4 font-medium">Last run</th>
                <th className="pb-4 font-medium">Languages</th>
                <th className="pb-4 font-medium">Alerts</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {data.repos.map((item) => (
                <tr key={item.repo.id}>
                  <td className="py-4 pr-6">
                    <Link to={`/app/repo/${item.repo.owner}/${item.repo.name}`} className="font-semibold hover:text-primary">
                      {item.repo.fullName}
                    </Link>
                  </td>
                  <td className="py-4 pr-6 font-bold text-primary">{item.health.score}</td>
                  <td className="py-4 pr-6 text-muted-foreground">{item.stats.latestWorkflowConclusion ?? "unavailable"}</td>
                  <td className="py-4 pr-6 text-muted-foreground">{item.stats.languagesTracked}</td>
                  <td className="py-4 font-semibold text-warning">{item.health.dependabotOpenCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function MetricPanel({ label, value, icon: Icon, tone = "default" }: { label: string; value: string; icon: typeof Sparkle; tone?: "default" | "warning" | "success"; }) {
  return (
    <div className="rounded-[1.5rem] bg-surface-container-high p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">{label}</p>
        <Icon size={16} className={tone === "warning" ? "text-secondary" : tone === "success" ? "text-success" : "text-primary"} />
      </div>
      <p className="mt-4 text-3xl font-headline font-bold">{value}</p>
    </div>
  );
}

function MetricChip({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-[1.25rem] bg-surface-container-low p-4">
      <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-xl font-headline font-bold">{value}</p>
    </div>
  );
}

function MiniStat({ icon: Icon, label, value }: { icon: typeof Activity; label: string; value: string | number }) {
  return (
    <div className="rounded-2xl bg-surface-container-low px-4 py-3">
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-muted-foreground">
        <Icon size={12} />
        {label}
      </div>
      <p className="mt-2 text-lg font-bold">{value}</p>
    </div>
  );
}

function StatusRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-outline-variant/10 pb-3 text-sm">
      <span className="uppercase tracking-[0.18em] text-muted-foreground">{label}</span>
      <span className="font-semibold text-foreground">{value}</span>
    </div>
  );
}

function LoadingState({ label }: { label: string }) {
  return (
    <div className="rounded-[2rem] bg-surface-container p-8 text-sm text-muted-foreground">
      {label}
    </div>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-[2rem] bg-surface-container p-8">
      <h1 className="text-3xl font-headline font-bold">{title}</h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">{body}</p>
    </div>
  );
}
