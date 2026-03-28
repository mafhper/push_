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
    const leftWeight = left.health.dependabotOpenCount * 10 + (left.stats.openPullRequestCount ?? 0) * 4 + (left.stats.latestWorkflowConclusion === "failure" ? 6 : 0) + (left.health.status === "critical" ? 3 : left.health.status === "warning" ? 1 : 0);
    const rightWeight = right.health.dependabotOpenCount * 10 + (right.stats.openPullRequestCount ?? 0) * 4 + (right.stats.latestWorkflowConclusion === "failure" ? 6 : 0) + (right.health.status === "critical" ? 3 : right.health.status === "warning" ? 1 : 0);
    return rightWeight - leftWeight;
  });
  const reposNeedingAttention = prioritizedRepos.filter((entry) =>
    entry.health.dependabotOpenCount > 0 ||
    (entry.stats.openPullRequestCount ?? 0) > 0 ||
    entry.stats.latestWorkflowConclusion === "failure" ||
    entry.health.status !== "healthy",
  );
  const totalAlerts = data.repos.reduce((sum, entry) => sum + entry.health.dependabotOpenCount, 0);
  const totalOpenPullRequests = data.repos.reduce((sum, entry) => sum + (entry.stats.openPullRequestCount ?? 0), 0);
  const criticalRepos = data.repos.filter((entry) => entry.health.status === "critical").length;
  const warningRepos = data.repos.filter((entry) => entry.health.status === "warning").length;
  const failingRepos = data.repos.filter((entry) => entry.stats.latestWorkflowConclusion === "failure").length;

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

      <div className="grid gap-3 xl:grid-cols-4">
        <AlertMetric label={t("openAlertsLabel")} value={totalAlerts} tone={totalAlerts > 0 ? "critical" : "success"} />
        <AlertMetric label={t("openPullRequests")} value={totalOpenPullRequests} tone={totalOpenPullRequests > 0 ? "warning" : "neutral"} />
        <AlertMetric label={t("criticalRepos")} value={criticalRepos} tone={criticalRepos > 0 ? "critical" : "success"} />
        <AlertMetric label={t("failingWorkflows")} value={failingRepos + warningRepos} tone={failingRepos > 0 ? "critical" : warningRepos > 0 ? "warning" : "neutral"} />
      </div>

      {isLocalAuthenticated ? (
        <div className="rounded-[1.8rem] border border-secondary/20 bg-[linear-gradient(135deg,rgba(175,141,17,0.12),rgba(9,9,9,0.96)_42%,rgba(244,122,97,0.08))] p-5">
          <p className="terminal-label text-secondary/80">{t("attentionBannerLabel")}</p>
          <h3 className="mt-3 text-2xl font-black tracking-tight text-foreground">{t("localAlertsBoardTitle")}</h3>
          <p className="mt-3 max-w-4xl text-sm leading-6 text-foreground/72">{t("localAlertsBoardBody")}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <AttentionPill label={t("openAlertsLabel")} value={totalAlerts} tone={totalAlerts > 0 ? "critical" : "neutral"} />
            <AttentionPill label={t("openPullRequests")} value={totalOpenPullRequests} tone={totalOpenPullRequests > 0 ? "warning" : "neutral"} />
            <AttentionPill label={t("failingWorkflows")} value={failingRepos} tone={failingRepos > 0 ? "critical" : "neutral"} />
          </div>
        </div>
      ) : null}

      {reposNeedingAttention.length > 0 ? (
        <div className="space-y-4">
          {reposNeedingAttention.map((entry) => (
            <AlertCard
              key={entry.repo.id}
              owner={entry.repo.owner}
              repo={entry.repo.name}
              openAlertCount={entry.health.dependabotOpenCount}
              openPullRequestCount={entry.stats.openPullRequestCount ?? 0}
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
  openPullRequestCount,
  status,
}: {
  owner: string;
  repo: string;
  openAlertCount: number;
  openPullRequestCount: number;
  status: "healthy" | "warning" | "critical";
}) {
  const { t } = useApp();
  const { data } = useRepoSnapshot(owner, repo);
  const pullRequests = data?.pullRequests ?? [];
  const criticalSignal = openAlertCount > 0 || status === "critical";

  if (!data) {
    return (
      <div className="rounded-[1.8rem] ops-surface-deep p-6">
        <p className="terminal-label">{owner}/{repo}</p>
        <p className="mt-3 text-sm text-muted-foreground">{t("loadingAlertDetails")}</p>
      </div>
    );
  }

  return (
    <div className={cn(
      "rounded-[1.8rem] p-6",
      criticalSignal
        ? "border border-destructive/18 bg-[linear-gradient(135deg,rgba(244,122,97,0.08),rgba(10,10,10,0.96)_38%,rgba(12,12,12,0.96))]"
        : openPullRequestCount > 0
          ? "border border-secondary/18 bg-[linear-gradient(135deg,rgba(175,141,17,0.08),rgba(10,10,10,0.96)_38%,rgba(12,12,12,0.96))]"
          : "ops-surface-deep",
    )}>
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

      <div className="mt-6 grid gap-3 md:grid-cols-4">
        <AlertMini label="Dependabot" value={String(data.alerts.length)} tone={data.alerts.length > 0 ? "warning" : "success"} />
        <AlertMini label={t("openPullRequests")} value={String(pullRequests.length)} tone={pullRequests.length > 0 ? "warning" : "neutral"} />
        <AlertMini label={t("repoFailedRuns7dLabel")} value={String(data.health.failedRuns7d)} tone={data.health.failedRuns7d > 0 ? "warning" : "success"} />
        <AlertMini label={t("staleDays")} value={String(data.health.stalenessDays)} tone={data.health.stalenessDays > 30 ? "warning" : "neutral"} />
      </div>

      {pullRequests.length > 0 ? (
        <div className="mt-6 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="terminal-label">{t("openPullRequests")}</p>
            <StatusPill tone="warning">{t("review")}</StatusPill>
          </div>
          {pullRequests.slice(0, 4).map((pullRequest) => (
            <a key={pullRequest.id} href={pullRequest.htmlUrl} className="flex items-start justify-between gap-4 rounded-[1.2rem] bg-secondary/[0.08] p-4 shadow-[inset_0_0_0_1px_rgba(175,141,17,0.18)]">
              <div>
                <p className="font-semibold text-foreground">#{pullRequest.number} {pullRequest.title}</p>
                <p className="mt-2 text-sm text-foreground/62">@{pullRequest.authorLogin}</p>
              </div>
              <StatusPill tone={pullRequest.draft ? "neutral" : "warning"}>
                {pullRequest.draft ? t("draft") : t("open")}
              </StatusPill>
            </a>
          ))}
        </div>
      ) : null}

      <div className="mt-6 space-y-3">
        {data.alerts.length > 0 ? data.alerts.map((alert) => (
          <a key={alert.id} href={alert.htmlUrl} className="flex items-start justify-between gap-4 rounded-[1.2rem] bg-destructive/[0.08] p-4 shadow-[inset_0_0_0_1px_rgba(244,122,97,0.18)]">
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
    <div className={cn(
      "rounded-[1.5rem] ops-surface-soft px-5 py-4",
      tone === "critical" && "shadow-[inset_0_0_0_1px_rgba(244,122,97,0.18)]",
      tone === "warning" && "shadow-[inset_0_0_0_1px_rgba(175,141,17,0.16)]",
    )}>
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

function AttentionPill({
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
