import type { ReactNode } from "react";
import { useParams } from "react-router-dom";
import { ExternalLink, History } from "lucide-react";
import { RepositoryHero } from "@/components/repository/RepositoryHero";
import { WorkflowPulsePanel } from "@/components/repository/WorkflowPulsePanel";
import { EmptyPanel, StatusPill } from "@/components/site/TerminalPrimitives";
import { useApp } from "@/contexts/useApp";
import { usePublicRuntime } from "@/contexts/usePublicRuntime";
import { usePublicRepoSnapshot } from "@/hooks/useGitHubPublic";
import { formatDate } from "@/i18n";
import { resolveDependabotReason } from "@/lib/github-copy";
import { LANGUAGE_COLORS } from "@/types";

export default function PublicRepoDetail() {
  const { settings, t } = useApp();
  const { mode } = usePublicRuntime();
  const { owner = "", repo = "" } = useParams();
  const { data, isLoading, error } = usePublicRepoSnapshot(owner, repo);

  if (isLoading) {
    return (
      <EmptyPanel
        title={t("loadingRepository")}
        body={mode === "public-profile" ? t("publicProfileSourceBody") : t("loadingRepositoryBody")}
      />
    );
  }

  if (!data || error) {
    return (
      <EmptyPanel
        title={t("repositoryUnavailable")}
        body={mode === "public-profile" ? t("publicProfileUnavailableBody", { username: `${owner}/${repo}` }) : t("repositoryUnavailableBody")}
      />
    );
  }

  const languageEntries = Object.entries(data.languages);
  const totalLanguageBytes = languageEntries.reduce((sum, [, value]) => sum + value, 0);

  return (
    <div className="space-y-6">
      <RepositoryHero
        backLabel={t("back")}
        sourceLabel={mode === "public-profile" ? t("publicApiLabel") : t("snapshotLabel")}
        sourceTone="success"
        healthLabel={data.health.status === "healthy" ? t("healthy") : data.health.status === "warning" ? t("watch") : t("criticalLabel")}
        healthTone={data.health.status === "healthy" ? "success" : data.health.status === "warning" ? "warning" : "critical"}
        name={data.repo.name}
        description={data.repo.description || t("publicKeyHealthSignalsBody")}
        repoUrl={data.repo.htmlUrl}
        stars={data.repo.stars}
        score={data.health.score}
        workflowSuccessRate={data.health.workflowSuccessRate}
        openAlerts={data.health.dependabotOpenCount}
        criticalAlerts={data.health.dependabotCriticalCount}
        failedRuns7d={data.health.failedRuns7d}
        stalenessDays={data.health.stalenessDays}
        lastPushAt={data.repo.lastPushAt}
        runs={data.workflowRuns}
      />

      <div className="grid gap-6 xl:grid-cols-[1.48fr_1fr] xl:items-start">
        <WorkflowPulsePanel
          runs={data.workflowRuns}
          title={t("pipeline")}
          body={
            mode === "public-profile"
              ? t("recentWorkflowRunsPublicApi", { count: data.workflowRuns.length })
              : t("recentWorkflowRunsSnapshot", { count: data.workflowRuns.length })
          }
          historyLabel={mode === "public-profile" ? t("publicRuns") : t("snapshotRuns")}
          emptyMessage={
            mode === "public-profile"
              ? t("noWorkflowRunsPublicApi")
              : t("noWorkflowRunsSnapshot")
          }
        />

        <div className="space-y-6">
          <section className="rounded-[2rem] ops-surface p-6">
            <div className="mb-6">
              <p className="terminal-label">{t("alertsTitle")}</p>
              <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-foreground">{t("openAlertsTitle")}</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {data.alerts.length > 0
                  ? t("alertsNeedReview", { count: data.alerts.length })
                  : resolveDependabotReason(data.availability.dependabotAlerts.reason, t, "noOpenAlertsRightNow")}
              </p>
            </div>

            <div className="space-y-3">
              {data.alerts.length > 0 ? (
                data.alerts.slice(0, 3).map((alert) => (
                  <a key={alert.id} href={alert.htmlUrl} className="block rounded-[1.35rem] ops-surface-soft px-4 py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="line-clamp-2 text-sm font-semibold text-foreground">{alert.summary}</p>
                        <p className="mt-2 text-xs text-muted-foreground">
                          {alert.packageName} / {alert.ecosystem}
                        </p>
                      </div>
                      <StatusPill tone={alert.severity === "critical" ? "critical" : alert.severity === "high" ? "warning" : "neutral"}>
                        {alert.severity}
                      </StatusPill>
                    </div>
                  </a>
                ))
              ) : (
                <div className="rounded-[1.35rem] ops-surface-soft px-4 py-4 text-sm text-muted-foreground">
                  {resolveDependabotReason(data.availability.dependabotAlerts.reason, t)}
                </div>
              )}
            </div>

            <a href={`${data.repo.htmlUrl}/security/dependabot`} className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
              {t("openOnGitHub")}
              <ExternalLink size={14} />
            </a>
          </section>

          <section className="rounded-[2rem] ops-surface p-6">
            <p className="terminal-label">{t("repositoryFacts")}</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-foreground">{t("repositoryFacts")}</h2>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <DetailRow label={t("license")} value={data.repo.license ?? t("unavailable")} highlighted={Boolean(data.repo.license)} />
              <DetailRow label={t("mainBranch")} value={data.repo.defaultBranch} highlighted />
              <DetailRow label={t("size")} value={`${(data.repo.size / 1024).toFixed(1)} MB`} />
              <DetailRow label={t("visibility")} value={data.repo.isPrivate ? t("privateLabel") : t("publicLabel")} highlighted={!data.repo.isPrivate} />
              <DetailRow label={t("created")} value={formatDate(data.repo.createdAt, settings.lang)} />
              <DetailRow label={t("lastPush")} value={data.repo.lastPushAt ? formatDate(data.repo.lastPushAt, settings.lang) : t("unavailable")} />
              <DetailRow
                label={t("security")}
                value={data.availability.dependabotAlerts.available ? t("available") : t("unavailable")}
                highlighted={data.availability.dependabotAlerts.available}
              />
              <DetailRow
                label={t("external")}
                value={
                  <a href={data.repo.htmlUrl} className="inline-flex items-center gap-2 text-primary hover:underline">
                    {t("openOnGitHub")} <ExternalLink size={13} />
                  </a>
                }
              />
            </div>

            <div className="mt-8 rounded-[1.35rem] ops-surface-soft p-4">
              <p className="text-sm font-semibold text-foreground">
                {data.availability.dependabotAlerts.available ? t("securityDataAvailable") : t("securityDataUnavailable")}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {data.availability.dependabotAlerts.available
                  ? t("securityDataLoadedDataset")
                  : resolveDependabotReason(data.availability.dependabotAlerts.reason, t)}
              </p>
            </div>

            <div className="mt-6">
              <p className="terminal-label">{t("languageMix")}</p>
              <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/5">
                {languageEntries.map(([language, bytes]) => {
                  const width = totalLanguageBytes > 0 ? `${(bytes / totalLanguageBytes) * 100}%` : "0%";
                  return <div key={language} className="float-left h-full" style={{ width, backgroundColor: LANGUAGE_COLORS[language] ?? "#00FF41" }} />;
                })}
              </div>
              <div className="mt-5 space-y-3">
                {languageEntries.map(([language, bytes]) => (
                  <div key={language} className="flex items-center justify-between text-sm">
                    <span className="inline-flex items-center gap-3">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: LANGUAGE_COLORS[language] ?? "#00FF41" }} />
                      {language}
                    </span>
                    <span className="font-mono text-xs text-muted-foreground">{totalLanguageBytes > 0 ? Math.round((bytes / totalLanguageBytes) * 100) : 0}%</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>

      <section className="rounded-[2rem] ops-surface p-6">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <p className="terminal-label">{t("recentCommitsTitle")}</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-foreground">{t("recentCommitsTitle")}</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {mode === "public-profile" ? t("latestCommitsPublicApi") : t("latestCommitsSnapshot")}
            </p>
          </div>
          <History size={16} className="text-foreground/30" />
        </div>

        <div className="grid gap-3 xl:grid-cols-2">
          {data.commits.length > 0 ? (
            data.commits.slice(0, 6).map((commit) => (
              <a key={commit.sha} href={commit.htmlUrl} className="flex items-start gap-4 rounded-[1.35rem] ops-surface-soft px-4 py-4">
                <div className="mt-1 h-10 w-10 overflow-hidden rounded-full bg-white/6">
                  {commit.authorAvatar ? <img src={commit.authorAvatar} alt={commit.authorLogin} className="h-full w-full object-cover" /> : null}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 font-semibold text-foreground">{commit.message}</p>
                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span>{commit.authorLogin}</span>
                    <span>{commit.sha.slice(0, 7)}</span>
                    <span>{formatDate(commit.date, settings.lang)}</span>
                  </div>
                </div>
              </a>
            ))
          ) : (
            <div className="rounded-[1.35rem] ops-surface-soft px-4 py-4 text-sm text-muted-foreground">
              {mode === "public-profile" ? t("noPublicCommitData") : t("noCommitDataYet")}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function DetailRow({
  label,
  value,
  highlighted = false,
}: {
  label: string;
  value: ReactNode;
  highlighted?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-[1rem] bg-white/[0.02] px-4 py-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={highlighted ? "rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary" : "text-sm font-semibold text-foreground"}>{value}</span>
    </div>
  );
}
