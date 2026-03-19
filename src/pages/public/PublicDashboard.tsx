import { Link } from "react-router-dom";
import { ArrowRight, CircleOff, ShieldAlert, Workflow } from "lucide-react";
import { EmptyPanel, MetricTile, SectionHeading, StatusPill } from "@/components/site/TerminalPrimitives";
import { usePublicDashboardSnapshot } from "@/hooks/useGitHubPublic";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/utils/health";

export default function PublicDashboard() {
  const { data, isLoading, error } = usePublicDashboardSnapshot();

  if (isLoading) {
    return <EmptyPanel title="Loading dashboard" body="Resolving the published snapshot dataset." />;
  }

  if (!data || error) {
    return <EmptyPanel title="Snapshot unavailable" body="The published dataset could not be loaded." />;
  }

  const repos = data.repos;
  const totalAlerts = repos.reduce((sum, entry) => sum + entry.health.dependabotOpenCount, 0);
  const averageScore = repos.length > 0
    ? Math.round(repos.reduce((sum, entry) => sum + entry.health.score, 0) / repos.length)
    : 0;
  const archivedCount = repos.filter((entry) => entry.repo.archived).length;
  const reposWithWorkflowData = repos.filter((entry) => entry.availability.workflowRuns.available).length;

  return (
    <div className="space-y-10">
      <section className="space-y-6">
        <div className="flex items-end justify-between gap-6">
          <SectionHeading
            kicker="Dashboard Overview"
            title={
              <>
                <span className="text-foreground">Published_</span>
                <span className="text-primary">Snapshot</span>
              </>
            }
            body="Public repository health from the current published snapshot."
          />
          <StatusPill tone="success">Snapshot Only</StatusPill>
        </div>

        <div className="grid gap-4 xl:grid-cols-4">
          <MetricTile label="Tracked Repos" value={repos.length} hint="Published set" />
          <MetricTile label="Average Health" value={`${averageScore}%`} hint="Across tracked repos" tone={averageScore >= 70 ? "success" : "warning"} />
          <MetricTile label="Open Alerts" value={totalAlerts} hint="Dependabot total" tone={totalAlerts > 0 ? "warning" : "success"} />
          <MetricTile label="Archived" value={archivedCount} hint={`${reposWithWorkflowData} repos with workflow data`} />
        </div>
      </section>

      <section className="space-y-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h3 className="font-headline text-fluid-2xl font-bold uppercase">Tracked Repositories</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Public repositories included in the current snapshot.
            </p>
          </div>
          <Link to="/app/settings" className="font-mono text-[11px] uppercase tracking-[0.24em] text-primary">
            Snapshot status
          </Link>
        </div>

        <div
          className={cn(
            "grid gap-5",
            repos.length <= 1 ? "xl:grid-cols-1" : repos.length === 2 ? "xl:grid-cols-2" : "xl:grid-cols-3",
          )}
        >
          {repos.map((entry) => {
            const tone = entry.health.status === "critical" ? "critical" : entry.health.status === "warning" ? "warning" : "success";
            return (
              <Link key={entry.repo.id} to={`/app/repo/${entry.repo.owner}/${entry.repo.name}`} className="rounded-3xl surface-panel p-6 transition-colors hover:bg-[rgba(36,36,36,1)]">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <StatusPill tone={tone === "critical" ? "critical" : tone === "warning" ? "warning" : "success"}>
                        {entry.health.status}
                      </StatusPill>
                    </div>
                    <h4 className="font-headline text-2xl font-bold tracking-tight">{entry.repo.name}</h4>
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-foreground/60">
                      {entry.repo.defaultBranch} / {entry.repo.language ?? "unknown"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="terminal-label">Health</p>
                    <p className="mt-2 text-2xl font-black text-primary">{entry.health.score}%</p>
                  </div>
                </div>

                <div className="mt-8 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-black/18 p-3">
                    <p className="terminal-label">Workflows</p>
                    <p className="mt-3 text-sm font-semibold">{entry.stats.latestWorkflowConclusion ?? "Unavailable"}</p>
                  </div>
                  <div className="rounded-2xl bg-black/18 p-3">
                    <p className="terminal-label">Alerts</p>
                    <p className="mt-3 text-sm font-semibold">{entry.health.dependabotOpenCount} open</p>
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-between text-xs text-muted-foreground">
                  <span>Updated {formatRelativeTime(entry.repo.lastPushAt, (value) => value)}</span>
                  <span className="inline-flex items-center gap-2 text-primary">
                    Open detail
                    <ArrowRight size={13} />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="space-y-6">
        <SectionHeading title="Repository Table" body="Real metrics only." />

        <div className="overflow-hidden rounded-3xl surface-panel-deep">
          <table className="w-full text-left">
            <thead className="bg-white/[0.02] font-mono text-[10px] uppercase tracking-[0.24em] text-foreground/55">
              <tr>
                <th className="px-6 py-4 font-medium">Repository</th>
                <th className="px-6 py-4 font-medium">Health</th>
                <th className="px-6 py-4 font-medium">Last Workflow</th>
                <th className="px-6 py-4 font-medium">Alerts</th>
                <th className="px-6 py-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {repos.map((entry) => (
                <tr key={entry.repo.id} className="border-t border-white/[0.03]">
                  <td className="px-6 py-5">
                    <p className="font-semibold">{entry.repo.name}</p>
                    <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-foreground/55">
                      {entry.repo.defaultBranch} / {entry.repo.owner}
                    </p>
                  </td>
                  <td className="px-6 py-5">
                    <p className={entry.health.status === "healthy" ? "text-primary" : entry.health.status === "warning" ? "text-secondary" : "text-destructive"}>
                      {entry.health.status.toUpperCase()} / {entry.health.score}%
                    </p>
                  </td>
                  <td className="px-6 py-5 text-sm text-muted-foreground">{entry.stats.latestWorkflowConclusion ?? "Unavailable"}</td>
                  <td className="px-6 py-5 text-sm text-muted-foreground">{entry.health.dependabotOpenCount}</td>
                  <td className="px-6 py-5">
                    <Link to={`/app/repo/${entry.repo.owner}/${entry.repo.name}`} className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.24em] text-foreground/45 hover:text-primary">
                      Inspect
                      <ArrowRight size={12} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {repos.length === 0 ? (
          <div className="rounded-3xl surface-panel p-10 text-center">
            <CircleOff className="mx-auto text-foreground/25" size={28} />
            <p className="mt-4 text-sm text-muted-foreground">
              The published snapshot currently has no tracked repositories.
            </p>
          </div>
        ) : null}
      </section>
    </div>
  );
}
