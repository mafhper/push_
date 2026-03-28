import { EmptyPanel, SectionHeading, StatusPill } from "@/components/site/TerminalPrimitives";
import { useApp } from "@/contexts/useApp";
import { usePublicRuntime } from "@/contexts/usePublicRuntime";
import { usePublicDashboardSnapshot, usePublicProfileRepos, usePublicRepoSnapshot } from "@/hooks/useGitHubPublic";
import { resolveDependabotReason } from "@/lib/github-copy";

export default function PublicAlertsPage() {
  const { t } = useApp();
  const { mode, username } = usePublicRuntime();
  const snapshotQuery = usePublicDashboardSnapshot();
  const publicProfileQuery = usePublicProfileRepos();

  if (mode === "public-profile") {
    const { data: repos = [], isLoading, error } = publicProfileQuery;

    if (isLoading) {
      return <EmptyPanel title={t("loadingPublicRepositories")} body={t("publicAlertsProfileLoadingBody")} />;
    }

    if (error) {
      return <EmptyPanel title={t("publicProfileUnavailable")} body={t("publicProfileUnavailableBody", { username: username ?? "" })} />;
    }

    return (
      <div className="space-y-8">
        <SectionHeading
          kicker={t("securitySurface")}
          title={t("publicAlertsProfileTitle")}
          body={t("publicAlertsProfileBody", { username: username ?? "" })}
        />

        <div className="space-y-5">
          {repos.map((repo) => (
            <div key={repo.id} className="rounded-[1.8rem] ops-surface p-6">
              <div className="flex items-start justify-between gap-6">
                <div>
                  <p className="font-headline text-2xl font-bold tracking-tight">{repo.fullName}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{t("publicAlertsProfileRepoBody")}</p>
                </div>
                <StatusPill tone="neutral">{t("unavailable")}</StatusPill>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const { data, isLoading, error } = snapshotQuery;

  if (isLoading) {
    return <EmptyPanel title={t("alertsLoadingTitle")} body={t("alertsLoadingBody")} />;
  }

  if (!data || error) {
    return <EmptyPanel title={t("alertsDatasetUnavailableTitle")} body={t("alertsDatasetUnavailableBody")} />;
  }

  if (data.repos.length === 0) {
    return <EmptyPanel title={t("alertsNoRepositoriesTitle")} body={t("alertsNoRepositoriesPublicBody")} />;
  }

  return (
    <div className="space-y-8">
      <SectionHeading
        kicker={t("securitySurface")}
        title={t("publicAlertsPublishedTitle")}
        body={t("publicAlertsPublishedBody")}
      />

      <div className="space-y-5">
        {data.repos.map((entry) => (
          <AlertCard key={entry.repo.id} owner={entry.repo.owner} repo={entry.repo.name} />
        ))}
      </div>
    </div>
  );
}

function AlertCard({ owner, repo }: { owner: string; repo: string }) {
  const { t } = useApp();
  const { data } = usePublicRepoSnapshot(owner, repo);

  if (!data) return null;

  return (
    <div className="rounded-[1.8rem] ops-surface p-6">
      <div className="flex items-start justify-between gap-6">
        <div>
          <p className="font-headline text-2xl font-bold tracking-tight">{owner}/{repo}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {data.alerts.length > 0
              ? t("publicAlertsOpenCount", { count: data.alerts.length })
              : t("publicAlertsNoOpen")}
          </p>
        </div>
        <StatusPill tone={data.alerts.length > 0 ? "warning" : "success"}>
          {data.alerts.length > 0 ? t("review") : t("clean")}
        </StatusPill>
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
