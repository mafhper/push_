import { Link } from "react-router-dom";
import { RepositoryDiagnosticsList, type DiagnosticsRow } from "@/components/dashboard/RepositoryDiagnosticsList";
import { RepositoryShowcase, RepositoryShowcaseSkeleton, type ShowcaseItem } from "@/components/dashboard/RepositoryShowcase";
import { useDashboardSnapshot } from "@/hooks/useGitHub";
import { EmptyPanel, SectionHeading, StatusPill } from "@/components/site/TerminalPrimitives";
import { isLocalSecureRuntime } from "@/config/site";
import { useApp } from "@/contexts/useApp";
import { buildSnapshotDiagnosticsRows, buildSnapshotShowcaseItems } from "@/lib/dashboard-copy";
import { sortSnapshotRepos } from "@/lib/dashboard";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/utils/health";
import { CircleOff } from "lucide-react";
import type { OverviewRepoSnapshot } from "@/types";

export default function Dashboard() {
  const { session, selectedRepos, t } = useApp();
  const { data, isLoading, error } = useDashboardSnapshot();
  const localRuntime = isLocalSecureRuntime();
  const isLocalAuthenticated = localRuntime && Boolean(session?.token);

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (!data || error) {
    return <EmptyPanel title={t("publishedSnapshot")} body={t("regenerateSnapshotOverview")} />;
  }

  const repos = data.repos;
  const prioritizedRepos = sortSnapshotRepos(repos);
  const totalAlerts = repos.reduce((sum, entry) => sum + entry.health.dependabotOpenCount, 0);
  const totalOpenPullRequests = repos.reduce((sum, entry) => sum + (entry.stats.openPullRequestCount ?? 0), 0);
  const averageScore = repos.length > 0 ? Math.round(repos.reduce((sum, entry) => sum + entry.health.score, 0) / repos.length) : 0;
  const activeCount = repos.filter((entry) => !entry.repo.archived).length;
  const reposWithWorkflowData = repos.filter((entry) => entry.availability.workflowRuns.available).length;
  const failingRepos = repos.filter((entry) => entry.stats.latestWorkflowConclusion === "failure").length;
  const attentionRepos = repos.filter((entry) =>
    entry.health.status !== "healthy" ||
    entry.health.dependabotOpenCount > 0 ||
    (entry.stats.openPullRequestCount ?? 0) > 0 ||
    entry.stats.latestWorkflowConclusion === "failure",
  ).length;

  return (
    <div className="space-y-10">
      <section className="space-y-6">
        <div className="flex items-end justify-between gap-6">
          <SectionHeading
            kicker={t("dashboardOverview")}
            title={t("fleetHealth")}
            body={
              isLocalAuthenticated
                ? t("liveDiagnosticsBody")
                : t("publishedDiagnosticsBody")
            }
          />
          <StatusPill tone={isLocalAuthenticated ? "warning" : "success"}>{isLocalAuthenticated ? t("localAuth") : t("snapshotFeed")}</StatusPill>
        </div>

        <div className="grid gap-3 xl:grid-cols-4">
          <CompactMetric label={t("reposNeedingAttention")} value={attentionRepos} hint={t("attentionQueueHint")} tone={attentionRepos > 0 ? "critical" : "success"} />
          <CompactMetric label={t("openAlertsLabel")} value={totalAlerts} hint={t("dependabotTotal")} tone={totalAlerts > 0 ? "critical" : "success"} />
          <CompactMetric label={t("openPullRequests")} value={totalOpenPullRequests} hint={isLocalAuthenticated ? t("reviewQueueHint") : t("localOnlySignalHint")} tone={totalOpenPullRequests > 0 ? "warning" : "neutral"} />
          <CompactMetric
            label={t("failingWorkflows")}
            value={failingRepos}
            hint={`${reposWithWorkflowData} ${t("reposWithWorkflowData")}`}
            tone={failingRepos > 0 ? "critical" : averageScore >= 70 ? "success" : "warning"}
          />
        </div>

        {(attentionRepos > 0 || totalOpenPullRequests > 0 || totalAlerts > 0 || failingRepos > 0) ? (
          <div className="rounded-[1.9rem] border border-destructive/18 bg-[linear-gradient(135deg,rgba(244,122,97,0.1),rgba(9,9,9,0.96)_38%,rgba(175,141,17,0.12))] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.24)]">
            <p className="terminal-label text-destructive/80">{t("attentionBannerLabel")}</p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <h3 className="text-2xl font-black tracking-tight text-foreground">{t("attentionBannerTitle")}</h3>
              <StatusPill tone={attentionRepos > 0 ? "critical" : totalOpenPullRequests > 0 || totalAlerts > 0 ? "warning" : "success"}>
                {attentionRepos > 0 ? t("needsAction") : t("watchClosely")}
              </StatusPill>
            </div>
            <p className="mt-3 max-w-4xl text-sm leading-6 text-foreground/72">
              {isLocalAuthenticated ? t("localAttentionBannerBody") : t("publishedAttentionBannerBody")}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <AttentionChip label={t("openAlertsLabel")} value={totalAlerts} tone={totalAlerts > 0 ? "critical" : "neutral"} />
              <AttentionChip label={t("openPullRequests")} value={totalOpenPullRequests} tone={totalOpenPullRequests > 0 ? "warning" : "neutral"} />
              <AttentionChip label={t("failingWorkflows")} value={failingRepos} tone={failingRepos > 0 ? "critical" : "neutral"} />
              <AttentionChip label={t("reposNeedingAttention")} value={attentionRepos} tone={attentionRepos > 0 ? "critical" : "neutral"} />
            </div>
          </div>
        ) : null}
      </section>

      <section className="space-y-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h3 className="font-headline text-fluid-2xl font-bold tracking-tight">{t("activeRepositoriesTitle")}</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {isLocalAuthenticated
                ? selectedRepos.length > 0
                  ? t("onlySelectedReposBody")
                  : t("selectPublicReposBody")
                : t("trackedReposSnapshotBody")}
            </p>
          </div>
          <Link to="/app/settings" className="font-mono text-[11px] uppercase tracking-[0.24em] text-primary">{t("manageRepos")}</Link>
        </div>

        <RepositoryShowcase
          items={buildSnapshotShowcaseItems(prioritizedRepos, t, (value) => formatRelativeTime(value, t))}
          storageKey="gl_dashboard_active_repo"
          emptyState={
            <div className="rounded-3xl surface-panel p-10 text-center">
              <CircleOff className="mx-auto text-foreground/25" size={28} />
              <p className="mt-4 text-sm text-muted-foreground">
                {isLocalAuthenticated
                  ? t("noSelectedReposAvailable")
                  : t("regenerateSnapshotOverview")}
              </p>
            </div>
          }
        />
      </section>

      {repos.length > 0 ? (
        <section className="space-y-6">
          <RepositoryDiagnosticsList
            items={buildSnapshotDiagnosticsRows(prioritizedRepos, t, (value) => formatRelativeTime(value, t))}
            title={t("fleetQueueTitle")}
            body={t("fleetQueueBody")}
          />
        </section>
      ) : null}
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

function CompactMetric({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: string | number;
  hint: string;
  tone?: "neutral" | "success" | "warning" | "critical";
}) {
  return (
    <div className={cn(
      "rounded-[1.35rem] ops-surface-soft px-4 py-4",
      tone === "success" && "shadow-[inset_0_0_0_1px_rgba(0,255,65,0.12)]",
      tone === "warning" && "shadow-[inset_0_0_0_1px_rgba(175,141,17,0.16)]",
      tone === "critical" && "shadow-[inset_0_0_0_1px_rgba(244,122,97,0.2)]",
    )}>
      <div className="flex items-center justify-between gap-3">
        <p className="terminal-label">{label}</p>
        <p className={cn("text-2xl font-black tracking-tight", tone === "success" && "text-primary", tone === "warning" && "text-secondary", tone === "critical" && "text-destructive")}>{value}</p>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

function AttentionChip({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "neutral" | "warning" | "critical";
}) {
  return (
    <div
      className={cn(
        "rounded-full px-3 py-2 font-mono text-[11px] uppercase tracking-[0.2em]",
        tone === "critical" && "bg-destructive/[0.14] text-destructive shadow-[inset_0_0_0_1px_rgba(244,122,97,0.2)]",
        tone === "warning" && "bg-secondary/[0.14] text-secondary shadow-[inset_0_0_0_1px_rgba(175,141,17,0.2)]",
        tone === "neutral" && "bg-white/[0.05] text-foreground/70 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]",
      )}
    >
      {label}: {value}
    </div>
  );
}
