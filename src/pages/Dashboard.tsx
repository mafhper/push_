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
  const averageScore = repos.length > 0 ? Math.round(repos.reduce((sum, entry) => sum + entry.health.score, 0) / repos.length) : 0;
  const activeCount = repos.filter((entry) => !entry.repo.archived).length;
  const reposWithWorkflowData = repos.filter((entry) => entry.availability.workflowRuns.available).length;

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
          <CompactMetric label={t("trackedRepos")} value={repos.length} hint={isLocalAuthenticated ? `${selectedRepos.length} ${t("selected")}` : t("publishedSnapshot")} />
          <CompactMetric label={t("activeRepos")} value={activeCount} hint={t("nonArchived")} />
          <CompactMetric label={t("openAlertsLabel")} value={totalAlerts} hint={t("dependabotTotal")} tone={totalAlerts > 0 ? "warning" : "success"} />
          <CompactMetric
            label={t("averageHealth")}
            value={`${averageScore}%`}
            hint={`${reposWithWorkflowData} ${t("reposWithWorkflowData")}`}
            tone={averageScore >= 70 ? "success" : "warning"}
          />
        </div>
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
  tone?: "neutral" | "success" | "warning";
}) {
  return (
    <div className={cn("rounded-[1.35rem] ops-surface-soft px-4 py-4", tone === "success" && "shadow-[inset_0_0_0_1px_rgba(0,255,65,0.12)]", tone === "warning" && "shadow-[inset_0_0_0_1px_rgba(175,141,17,0.16)]")}>
      <div className="flex items-center justify-between gap-3">
        <p className="terminal-label">{label}</p>
        <p className={cn("text-2xl font-black tracking-tight", tone === "success" && "text-primary", tone === "warning" && "text-secondary")}>{value}</p>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}
