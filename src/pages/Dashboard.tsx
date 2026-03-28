import { Link } from "react-router-dom";
import { RepositoryShowcase, RepositoryShowcaseSkeleton, type ShowcaseItem } from "@/components/dashboard/RepositoryShowcase";
import { useDashboardSnapshot } from "@/hooks/useGitHub";
import { EmptyPanel, MetricTile, SectionHeading, StatusPill } from "@/components/site/TerminalPrimitives";
import { isLocalSecureRuntime } from "@/config/site";
import { useApp } from "@/contexts/useApp";
import { sortSnapshotRepos } from "@/lib/dashboard";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/utils/health";
import { ArrowRight, CircleOff, Zap } from "lucide-react";
import type { OverviewRepoSnapshot } from "@/types";

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
  const prioritizedRepos = sortSnapshotRepos(repos);
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

        <RepositoryShowcase
          items={buildSnapshotShowcaseItems(prioritizedRepos)}
          storageKey="gl_dashboard_active_repo"
          emptyState={
            <div className="rounded-3xl surface-panel p-10 text-center">
              <CircleOff className="mx-auto text-foreground/25" size={28} />
              <p className="mt-4 text-sm text-muted-foreground">
                {isLocalAuthenticated
                  ? "No selected public repositories are available for this local overview. Review the selection in Settings."
                  : "Regenerate the snapshot dataset to repopulate the published overview."}
              </p>
            </div>
          }
        />
      </section>

      {repos.length > 0 ? (
        <section className="space-y-6">
          <SectionHeading title="Granular Diagnostics" body="Real metrics only." />

          <div className="grid gap-3 md:hidden">
            {prioritizedRepos.map((entry) => (
              <article key={entry.repo.id} className="rounded-3xl surface-panel-deep p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-foreground">{entry.repo.name}</p>
                    <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-foreground/48">
                      {entry.repo.defaultBranch} / {entry.repo.owner}
                    </p>
                  </div>
                  <p className={cn("text-sm font-semibold", entry.health.status === "healthy" ? "text-primary" : entry.health.status === "warning" ? "text-secondary" : "text-destructive")}>
                    {entry.health.status === "healthy" ? "STABLE" : entry.health.status === "warning" ? "DEGRADED" : "CRITICAL"} / {entry.health.score}%
                  </p>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[1.35rem] border border-white/6 bg-white/[0.02] px-4 py-3">
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-foreground/38">Last build</p>
                    <p className="mt-2 text-sm text-foreground/72">{entry.stats.latestWorkflowConclusion ?? "No workflows yet"}</p>
                  </div>
                  <div className="rounded-[1.35rem] border border-white/6 bg-white/[0.02] px-4 py-3">
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-foreground/38">Workflow data</p>
                    <p className="mt-2 text-sm text-foreground/72">
                      {entry.availability.workflowRuns.available ? `${entry.stats.totalCommitsTracked} commits tracked` : "Unavailable"}
                    </p>
                  </div>
                </div>

                <Link
                  to={`/app/repo/${entry.repo.owner}/${entry.repo.name}`}
                  className="mt-5 inline-flex items-center gap-2 rounded-full border border-primary/18 bg-primary/[0.08] px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/[0.12]"
                >
                  Inspect project
                  <ArrowRight size={14} />
                </Link>
              </article>
            ))}
          </div>

          <div className="hidden overflow-x-auto rounded-3xl surface-panel-deep md:block">
            <table className="w-full min-w-[58rem] text-left">
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
                {prioritizedRepos.map((entry) => (
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
        </section>
      ) : null}
    </div>
  );
}

function buildSnapshotShowcaseItems(entries: OverviewRepoSnapshot[]): ShowcaseItem[] {
  return entries.map((entry) => {
    const tone = entry.health.status === "critical" ? "critical" : entry.health.status === "warning" ? "warning" : "success";
    const workflowLabel =
      entry.stats.latestWorkflowConclusion === "failure"
        ? "Last workflow failed"
        : entry.stats.latestWorkflowConclusion === "success"
          ? "Last workflow passed"
          : "Waiting for workflow signal";

    return {
      id: entry.repo.fullName,
      route: `/app/repo/${entry.repo.owner}/${entry.repo.name}`,
      owner: entry.repo.owner,
      name: entry.repo.name,
      fullName: entry.repo.fullName,
      description: entry.repo.description || "No repository description in the current snapshot.",
      defaultBranch: entry.repo.defaultBranch,
      language: entry.repo.language ?? "untyped",
      imageLanguage: entry.repo.language,
      lastActivityLabel: `Last movement ${formatRelativeTime(entry.repo.lastPushAt, (value) => value)}`,
      statusLabel: tone === "critical" ? "Needs action" : tone === "warning" ? "Watch closely" : "Stable",
      statusTone: tone,
      scoreLabel: "Integrity",
      scoreValue: `${entry.health.score}%`,
      summary: `${workflowLabel}. ${entry.health.dependabotOpenCount} open alerts and ${entry.health.stalenessDays} stale day(s) inform the current rank.`,
      spotlightMetrics: [
        { label: "Last updated", value: formatRelativeTime(entry.repo.lastPushAt, (value) => value), tone: entry.health.stalenessDays > 30 ? "warning" : "success" },
        { label: "Workflow success", value: entry.health.workflowSuccessRate !== null ? `${entry.health.workflowSuccessRate}%` : "N/A", tone: entry.health.workflowSuccessRate !== null && entry.health.workflowSuccessRate < 80 ? "warning" : "success" },
        { label: "Open alerts", value: `${entry.health.dependabotOpenCount}`, tone: entry.health.dependabotOpenCount > 0 ? "critical" : "success" },
        { label: "Primary branch", value: entry.repo.defaultBranch, tone: "neutral" },
      ],
    };
  });
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

        <RepositoryShowcaseSkeleton />
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
