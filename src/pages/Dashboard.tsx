import { Link } from "react-router-dom";
import { useDashboardSnapshot } from "@/hooks/useGitHub";
import { EmptyPanel, MetricTile, SectionHeading, StatusPill } from "@/components/site/TerminalPrimitives";
import { isLocalSecureRuntime } from "@/config/site";
import { useApp } from "@/contexts/useApp";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/utils/health";
import { ArrowRight, CircleOff, Zap } from "lucide-react";

export default function Dashboard() {
  const { session, selectedRepos } = useApp();
  const { data, isLoading, error } = useDashboardSnapshot();
  const localRuntime = isLocalSecureRuntime();
  const isLocalAuthenticated = localRuntime && Boolean(session?.token);

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (!data || error) {
    return <EmptyPanel title="Snapshot unavailable" body="The public dataset could not be loaded. Regenerate the snapshots locally or through GitHub Actions." />;
  }

  const repos = data.repos;
  const totalAlerts = repos.reduce((sum, entry) => sum + entry.health.dependabotOpenCount, 0);
  const averageScore = repos.length > 0 ? Math.round(repos.reduce((sum, entry) => sum + entry.health.score, 0) / repos.length) : 0;
  const activeCount = repos.filter((entry) => !entry.repo.archived).length;
  const reposWithWorkflowData = repos.filter((entry) => entry.availability.workflowRuns.available).length;

  return (
    <div className="space-y-10">
      <section className="space-y-6">
        <div className="flex items-end justify-between gap-6">
          <SectionHeading
            kicker="Dashboard Overview"
            title={
              <>
                <span className="text-foreground">FLEET_</span>
                <span className="text-primary">HEALTH</span>
              </>
            }
            body={
              isLocalAuthenticated
                ? "Live aggregate diagnostics rendered from your local authenticated session. The published Pages build remains snapshot-only."
                : "Aggregate diagnostics rendered from the secure snapshot pipeline. No browser credentials are required in the published runtime."
            }
          />
          <StatusPill tone={isLocalAuthenticated ? "warning" : "success"}>{isLocalAuthenticated ? "Local Auth" : "Snapshot Feed"}</StatusPill>
        </div>

        <div className="grid gap-4 xl:grid-cols-4">
          <MetricTile label="Tracked Repos" value={repos.length} hint={isLocalAuthenticated ? `${selectedRepos.length} selected` : "Published set"} />
          <MetricTile label="Active Repos" value={activeCount} hint="Non-archived" />
          <MetricTile label="Open Alerts" value={totalAlerts} hint="Dependabot total" tone={totalAlerts > 0 ? "warning" : "success"} />
          <MetricTile
            label="Average Health"
            value={`${averageScore}%`}
            hint={`${reposWithWorkflowData} repos with workflow data`}
            tone={averageScore >= 70 ? "success" : "warning"}
          />
        </div>
      </section>

      <section className="space-y-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h3 className="font-headline text-fluid-2xl font-bold uppercase">Active Repositories</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {isLocalAuthenticated
                ? selectedRepos.length > 0
                  ? "Only the repositories selected in settings are rendered here."
                  : "Select public repositories in settings to populate the local overview."
                : "Public repositories included in the current snapshot."}
            </p>
          </div>
          <Link to="/app/settings" className="font-mono text-[11px] uppercase tracking-[0.24em] text-primary">
            Manage repositories
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
                      <div className="rounded-lg bg-white/5 p-2 text-primary">
                        <Zap size={14} />
                      </div>
                      <StatusPill tone={tone === "critical" ? "critical" : tone === "warning" ? "warning" : "success"}>
                        {tone === "critical" ? "Failing" : tone === "warning" ? "Action Required" : "Stable"}
                      </StatusPill>
                    </div>
                    <h4 className="font-headline text-2xl font-bold tracking-tight">{entry.repo.name}</h4>
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-foreground/60">
                      {entry.repo.defaultBranch} / {entry.repo.language ?? "untyped"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="terminal-label">Integrity</p>
                    <p className="mt-2 text-2xl font-black text-primary">{entry.health.score}%</p>
                  </div>
                </div>

                <div className="mt-8 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-black/18 p-3">
                    <p className="terminal-label">Action Status</p>
                    <p className="mt-3 text-sm font-semibold">{entry.stats.latestWorkflowConclusion ?? "Awaiting first run"}</p>
                  </div>
                  <div className="rounded-2xl bg-black/18 p-3">
                    <p className="terminal-label">Dependabot</p>
                    <p className="mt-3 text-sm font-semibold">{entry.health.dependabotOpenCount} open alerts</p>
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
        <SectionHeading title="Granular Diagnostics" body="Real metrics only." />

        <div className="overflow-hidden rounded-3xl surface-panel-deep">
          <table className="w-full text-left">
            <thead className="bg-white/[0.02] font-mono text-[10px] uppercase tracking-[0.24em] text-foreground/55">
              <tr>
                <th className="px-6 py-4 font-medium">Repository Node</th>
                <th className="px-6 py-4 font-medium">Status &amp; Integrity</th>
                <th className="px-6 py-4 font-medium">Last Build</th>
                <th className="px-6 py-4 font-medium">Workflow Data</th>
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
                      {entry.health.status === "healthy" ? "STABLE" : entry.health.status === "warning" ? "DEGRADED" : "CRITICAL"} / {entry.health.score}%
                    </p>
                  </td>
                  <td className="px-6 py-5 text-sm text-muted-foreground">{entry.stats.latestWorkflowConclusion ?? "No workflows yet"}</td>
                  <td className="px-6 py-5 text-sm text-muted-foreground">
                    {entry.availability.workflowRuns.available ? `${entry.stats.totalCommitsTracked} commits tracked` : "Unavailable"}
                  </td>
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
              {isLocalAuthenticated
                ? "No selected public repositories are available for this local overview. Review the selection in Settings."
                : "Regenerate the snapshot dataset to repopulate the published overview."}
            </p>
          </div>
        ) : null}
      </section>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-10">
      <section className="space-y-6">
        <div className="flex items-end justify-between gap-6">
          <div className="space-y-4">
            <div className="h-3 w-32 rounded-full bg-white/8" />
            <div className="h-12 w-72 rounded-2xl bg-white/8" />
            <div className="h-5 w-[32rem] max-w-full rounded-full bg-white/8" />
          </div>
          <div className="h-7 w-24 rounded-full bg-primary/15" />
        </div>

        <div className="grid gap-4 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="rounded-3xl surface-panel p-5">
              <div className="h-3 w-24 rounded-full bg-white/8" />
              <div className="mt-4 h-10 w-24 rounded-2xl bg-white/8" />
              <div className="mt-4 h-4 w-28 rounded-full bg-white/8" />
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-6">
        <div className="flex items-end justify-between gap-4">
          <div className="space-y-3">
            <div className="h-8 w-72 rounded-2xl bg-white/8" />
            <div className="h-4 w-[28rem] max-w-full rounded-full bg-white/8" />
          </div>
          <div className="h-4 w-24 rounded-full bg-white/8" />
        </div>

        <div className="grid gap-5 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="rounded-3xl surface-panel p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-3">
                  <div className="h-8 w-32 rounded-full bg-white/8" />
                  <div className="h-8 w-28 rounded-2xl bg-white/8" />
                  <div className="h-3 w-32 rounded-full bg-white/8" />
                </div>
                <div className="space-y-3 text-right">
                  <div className="ml-auto h-3 w-16 rounded-full bg-white/8" />
                  <div className="ml-auto h-8 w-16 rounded-2xl bg-white/8" />
                </div>
              </div>

              <div className="mt-8 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-black/18 p-3">
                  <div className="h-3 w-20 rounded-full bg-white/8" />
                  <div className="mt-3 h-4 w-28 rounded-full bg-white/8" />
                </div>
                <div className="rounded-2xl bg-black/18 p-3">
                  <div className="h-3 w-20 rounded-full bg-white/8" />
                  <div className="mt-3 h-4 w-24 rounded-full bg-white/8" />
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between">
                <div className="h-3 w-24 rounded-full bg-white/8" />
                <div className="h-3 w-16 rounded-full bg-white/8" />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-6">
        <div className="space-y-3">
          <div className="h-9 w-64 rounded-2xl bg-white/8" />
          <div className="h-4 w-[34rem] max-w-full rounded-full bg-white/8" />
        </div>

        <div className="overflow-hidden rounded-3xl surface-panel-deep p-6">
          <div className="h-12 rounded-2xl bg-white/[0.03]" />
          <div className="mt-4 space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="h-16 rounded-2xl bg-white/[0.03]" />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
