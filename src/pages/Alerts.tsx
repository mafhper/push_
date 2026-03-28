import { useDashboardSnapshot, useRepoSnapshot } from "@/hooks/useGitHub";
import { EmptyPanel, SectionHeading, StatusPill } from "@/components/site/TerminalPrimitives";
import { isLocalSecureRuntime } from "@/config/site";
import { useApp } from "@/contexts/useApp";
import { resolveDependabotReason } from "@/lib/github-copy";
import { cn } from "@/lib/utils";

export default function AlertsPage() {
  const { session, t } = useApp();
  const { data, isLoading, error } = useDashboardSnapshot();
  const localRuntime = isLocalSecureRuntime();
  const isLocalAuthenticated = localRuntime && Boolean(session?.token);

  if (isLoading) {
    return <EmptyPanel title={t("alertsLoadingTitle")} body={t("alertsLoadingBody")} />;
  }

  if (!data || error) {
    return <EmptyPanel title={t("alertsDatasetUnavailableTitle")} body={t("alertsDatasetUnavailableBody")} />;
  }

  if (data.repos.length === 0) {
    return (
      <EmptyPanel
        title={t("alertsNoRepositoriesTitle")}
        body={
          isLocalAuthenticated
            ? t("alertsNoRepositoriesLocalBody")
            : t("alertsNoRepositoriesPublicBody")
        }
      />
    );
  }

  const prioritizedRepos = [...data.repos].sort((left, right) => {
    const leftWeight = left.health.dependabotOpenCount * 10 + (left.health.status === "critical" ? 3 : left.health.status === "warning" ? 1 : 0);
    const rightWeight = right.health.dependabotOpenCount * 10 + (right.health.status === "critical" ? 3 : right.health.status === "warning" ? 1 : 0);
    return rightWeight - leftWeight;
  });
  const reposNeedingAttention = prioritizedRepos.filter((entry) => entry.health.dependabotOpenCount > 0 || entry.health.status !== "healthy");
  const totalAlerts = data.repos.reduce((sum, entry) => sum + entry.health.dependabotOpenCount, 0);
  const criticalRepos = data.repos.filter((entry) => entry.health.status === "critical").length;
  const warningRepos = data.repos.filter((entry) => entry.health.status === "warning").length;

  return (
    <div className="space-y-8">
      <SectionHeading
        kicker={t("securitySurface")}
        title={t("alertsAndDegradedRepos")}
        body={
          isLocalAuthenticated
            ? t("alertsAttentionLocalBody")
            : t("alertsAttentionPublicBody")
        }
      />

      <div className="grid gap-3 xl:grid-cols-3">
        <AlertMetric label={t("openAlertsLabel")} value={totalAlerts} tone={totalAlerts > 0 ? "warning" : "success"} />
        <AlertMetric label={t("criticalRepos")} value={criticalRepos} tone={criticalRepos > 0 ? "critical" : "success"} />
        <AlertMetric label={t("warningRepos")} value={warningRepos} tone={warningRepos > 0 ? "warning" : "neutral"} />
      </div>

      {reposNeedingAttention.length > 0 ? (
        <div className="space-y-4">
          {reposNeedingAttention.map((entry) => (
            <AlertCard
              key={entry.repo.id}
              owner={entry.repo.owner}
              repo={entry.repo.name}
              openAlertCount={entry.health.dependabotOpenCount}
              status={entry.health.status}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-[1.8rem] ops-surface-deep p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="terminal-label">{t("alertsNothingUrgent")}</p>
              <p className="mt-3 text-lg font-semibold text-foreground">{t("alertsNoRepoNeedsAttention")}</p>
              <p className="mt-2 text-sm text-muted-foreground">{t("alertsCleanBody")}</p>
            </div>
            <StatusPill tone="success">{t("clean")}</StatusPill>
          </div>
        </div>
      )}
    </div>
  );
}

function AlertCard({
  owner,
  repo,
  openAlertCount,
  status,
}: {
  owner: string;
  repo: string;
  openAlertCount: number;
  status: "healthy" | "warning" | "critical";
}) {
  const { t } = useApp();
  const { data } = useRepoSnapshot(owner, repo);

  if (!data) {
    return (
      <div className="rounded-[1.8rem] ops-surface-deep p-6">
        <p className="terminal-label">{owner}/{repo}</p>
        <p className="mt-3 text-sm text-muted-foreground">{t("loadingAlertDetails")}</p>
      </div>
    );
  }

  return (
    <div className="rounded-[1.8rem] ops-surface-deep p-6">
      <div className="flex items-start justify-between gap-6">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <p className="font-headline text-2xl font-bold tracking-tight">{owner}/{repo}</p>
            <StatusPill tone={status === "critical" ? "critical" : status === "warning" ? "warning" : "success"}>
              {status === "critical" ? t("critical") : status === "warning" ? t("warning") : t("healthy")}
            </StatusPill>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            {openAlertCount > 0
              ? t("alertsOpenInMode", {
                  count: openAlertCount,
                  mode: data.status.dataMode === "authenticated" ? t("authenticatedSession").toLowerCase() : t("snapshotLabel").toLowerCase(),
                })
              : t("alertsOnlyListedBecauseDegraded")}
          </p>
        </div>
        <StatusPill tone={data.alerts.length > 0 ? "warning" : status === "critical" ? "critical" : "success"}>
          {data.alerts.length > 0 ? t("review") : status === "critical" ? t("investigate") : t("monitor")}
        </StatusPill>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-3">
        <AlertMini label="Dependabot" value={String(data.alerts.length)} tone={data.alerts.length > 0 ? "warning" : "success"} />
        <AlertMini label={t("repoFailedRuns7dLabel")} value={String(data.health.failedRuns7d)} tone={data.health.failedRuns7d > 0 ? "warning" : "success"} />
        <AlertMini label={t("staleDays")} value={String(data.health.stalenessDays)} tone={data.health.stalenessDays > 30 ? "warning" : "neutral"} />
      </div>

      <div className="mt-6 space-y-3">
        {data.alerts.length > 0 ? data.alerts.map((alert) => (
          <a key={alert.id} href={alert.htmlUrl} className="flex items-start justify-between gap-4 rounded-[1.2rem] bg-white/[0.03] p-4 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]">
            <div>
              <p className="font-semibold">{alert.summary}</p>
              <p className="mt-2 text-sm text-muted-foreground">{alert.packageName} / {alert.ecosystem}</p>
            </div>
            <StatusPill tone={alert.severity === "critical" ? "critical" : "warning"}>{alert.severity}</StatusPill>
          </a>
        )) : (
          <div className="rounded-[1.2rem] bg-white/[0.03] p-4 text-sm text-muted-foreground shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]">
            {resolveDependabotReason(data.availability.dependabotAlerts.reason, t, "dependabotReturnedNoIssues")}
          </div>
        )}
      </div>
    </div>
  );
}

function AlertMetric({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: number;
  tone?: "neutral" | "success" | "warning" | "critical";
}) {
  return (
    <div className="rounded-[1.5rem] ops-surface-soft px-5 py-4">
      <p className="terminal-label">{label}</p>
      <p
        className={cn(
          "mt-3 text-3xl font-black tracking-tight text-foreground",
          tone === "success" && "text-primary",
          tone === "warning" && "text-secondary",
          tone === "critical" && "text-destructive",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function AlertMini({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "success" | "warning";
}) {
  return (
    <div className="rounded-[1.2rem] bg-white/[0.03] px-4 py-3 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]">
      <p className="terminal-label">{label}</p>
      <p
        className={cn(
          "mt-2 text-lg font-semibold text-foreground",
          tone === "success" && "text-primary",
          tone === "warning" && "text-secondary",
        )}
      >
        {value}
      </p>
    </div>
  );
}
