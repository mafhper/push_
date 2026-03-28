import type { ReactNode } from "react";
import { useParams } from "react-router-dom";
import { ExternalLink, History } from "lucide-react";
import { RepositoryHero } from "@/components/repository/RepositoryHero";
import { WorkflowPulsePanel } from "@/components/repository/WorkflowPulsePanel";
import { EmptyPanel, StatusPill } from "@/components/site/TerminalPrimitives";
import { isLocalSecureRuntime } from "@/config/site";
import { useApp } from "@/contexts/useApp";
import { useRepoSnapshot } from "@/hooks/useGitHub";
import { formatDate } from "@/i18n";
import { resolveDependabotReason } from "@/lib/github-copy";
import { cn } from "@/lib/utils";
import { LANGUAGE_COLORS } from "@/types";

export default function RepoDetail() {
  const { owner = "", repo = "" } = useParams();
  const { session, settings, t } = useApp();
  const { data, isLoading, error } = useRepoSnapshot(owner, repo);
  const localRuntime = isLocalSecureRuntime();
  const isLocalAuthenticated = localRuntime && Boolean(session?.token);
  const modeLabel = data?.status.dataMode === "authenticated" || isLocalAuthenticated ? "local auth" : "snapshot";

  if (isLoading) {
    return <EmptyPanel title={t("loadingRepository")} body={t("loadingRepositoryBody")} />;
  }

  if (!data || error) {
    return <EmptyPanel title={t("repositoryUnavailable")} body={t("repositoryUnavailableBody")} />;
  }

  const languageEntries = Object.entries(data.languages);
  const totalLanguageBytes = languageEntries.reduce((sum, [, value]) => sum + value, 0);
  const latestOpenPullRequest = data.pullRequests?.[0] ?? null;
  const latestFailureRun = data.workflowRuns.find((run) => run.conclusion === "failure") ?? null;
  const highestPriorityAlert = [...data.alerts].sort((left, right) => severityWeight(right.severity) - severityWeight(left.severity))[0] ?? null;
  const priorityShortcuts = [
    highestPriorityAlert
      ? {
          href: highestPriorityAlert.htmlUrl,
          kicker: t("alertsTitle"),
          title: highestPriorityAlert.summary,
          body: `${highestPriorityAlert.packageName} / ${highestPriorityAlert.ecosystem}`,
          tone: highestPriorityAlert.severity === "critical" ? ("critical" as const) : ("warning" as const),
          badgeLabel: highestPriorityAlert.severity === "critical" ? t("investigate") : t("review"),
          priority: severityWeight(highestPriorityAlert.severity) + 10,
        }
      : null,
    latestFailureRun
      ? {
          href: latestFailureRun.htmlUrl,
          kicker: t("workflowLatestFailureTitle"),
          title: latestFailureRun.workflowName,
          body: t("workflowLatestFailureBody", {
            name: latestFailureRun.workflowName,
            when: formatDate(latestFailureRun.startedAt, settings.lang),
          }),
          tone: "critical" as const,
          badgeLabel: t("investigate"),
          priority: 8,
        }
      : null,
    latestOpenPullRequest
      ? {
          href: latestOpenPullRequest.htmlUrl,
          kicker: t("openPullRequests"),
          title: `#${latestOpenPullRequest.number} ${latestOpenPullRequest.title}`,
          body: `@${latestOpenPullRequest.authorLogin}`,
          tone: "warning" as const,
          badgeLabel: t("review"),
          priority: latestOpenPullRequest.draft ? 2 : 4,
        }
      : null,
  ]
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .sort((left, right) => right.priority - left.priority)
    .slice(0, 3);

  return (
    <div className="space-y-6">
      <RepositoryHero
        backLabel={t("back")}
        sourceLabel={modeLabel === "local auth" ? t("localData") : t("snapshotLabel")}
        sourceTone={modeLabel === "local auth" ? "warning" : "neutral"}
        healthLabel={data.health.status === "healthy" ? t("healthy") : data.health.status === "warning" ? t("watch") : t("criticalLabel")}
        healthTone={data.health.status === "healthy" ? "success" : data.health.status === "warning" ? "warning" : "critical"}
        name={data.repo.name}
        description={data.repo.description || t("keyHealthSignalsBody")}
        repoUrl={data.repo.htmlUrl}
        stars={data.repo.stars}
        score={data.health.score}
        workflowSuccessRate={data.health.workflowSuccessRate}
        openAlerts={data.health.dependabotOpenCount}
        openPullRequests={data.pullRequests?.length ?? 0}
        criticalAlerts={data.health.dependabotCriticalCount}
        failedRuns7d={data.health.failedRuns7d}
        stalenessDays={data.health.stalenessDays}
        lastPushAt={data.repo.lastPushAt}
        runs={data.workflowRuns}
        pullRequests={data.pullRequests}
      />

      <div className="grid gap-6 xl:grid-cols-[1.48fr_1fr] xl:items-start">
        <WorkflowPulsePanel
          runs={data.workflowRuns}
          title={t("pipeline")}
          body={modeLabel === "local auth" ? t("recentWorkflowRunsSession", { count: data.workflowRuns.length }) : t("recentWorkflowRunsSnapshot", { count: data.workflowRuns.length })}
          historyLabel={modeLabel === "local auth" ? t("localRuns") : t("snapshotRuns")}
          emptyMessage={modeLabel === "local auth" ? t("noWorkflowRunsSession") : t("noWorkflowRunsSnapshot")}
        />

        <div className="space-y-6">
          <section className="rounded-[2rem] border border-secondary/18 bg-[linear-gradient(135deg,rgba(175,141,17,0.1),rgba(10,10,10,0.96)_36%,rgba(244,122,97,0.08))] p-6">
            <div className="mb-6">
              <p className="terminal-label text-secondary/80">{t("attentionBannerLabel")}</p>
              <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-foreground">{t("repoActionBoardTitle")}</h2>
              <p className="mt-2 text-sm text-foreground/72">
                {t("repoActionBoardBody")}
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <DetailRow label={t("openPullRequests")} value={`${data.pullRequests?.length ?? 0}`} highlighted={(data.pullRequests?.length ?? 0) > 0} tone={(data.pullRequests?.length ?? 0) > 0 ? "warning" : "neutral"} />
              <DetailRow label={t("openAlertsLabel")} value={`${data.alerts.length}`} highlighted={data.alerts.length > 0} tone={data.alerts.length > 0 ? "critical" : "neutral"} />
              <DetailRow label={t("failingWorkflows")} value={`${data.health.failedRuns7d}`} highlighted={data.health.failedRuns7d > 0} tone={data.health.failedRuns7d > 0 ? "warning" : "neutral"} />
            </div>

            {priorityShortcuts.length > 0 ? (
              <div className="mt-4 grid gap-3">
                {priorityShortcuts.map((shortcut, index) => (
                  <PriorityShortcut
                    key={`${shortcut.kicker}-${shortcut.href}`}
                    href={shortcut.href}
                    kicker={shortcut.kicker}
                    title={shortcut.title}
                    body={shortcut.body}
                    tone={shortcut.tone}
                    badgeLabel={shortcut.badgeLabel}
                    primary={index === 0}
                  />
                ))}
              </div>
            ) : null}

            {data.pullRequests && data.pullRequests.length > 0 ? (
              <div className="mt-6 space-y-3">
                {data.pullRequests.slice(0, 4).map((pullRequest) => (
                  <a key={pullRequest.id} href={pullRequest.htmlUrl} className="flex items-start justify-between gap-4 rounded-[1.25rem] bg-black/20 px-4 py-4 shadow-[inset_0_0_0_1px_rgba(175,141,17,0.15)]">
                    <div className="min-w-0">
                      <p className="line-clamp-2 break-words text-sm font-semibold text-foreground">#{pullRequest.number} {pullRequest.title}</p>
                      <p className="mt-2 text-xs text-foreground/55">@{pullRequest.authorLogin}</p>
                    </div>
                    <StatusPill tone={pullRequest.draft ? "neutral" : "warning"}>
                      {pullRequest.draft ? t("draft") : t("open")}
                    </StatusPill>
                  </a>
                ))}
              </div>
            ) : (
              <div className="mt-6 rounded-[1.35rem] bg-black/18 px-4 py-4 text-sm text-muted-foreground">
                {t("repoNoOpenPullRequests")}
              </div>
            )}
          </section>

          <section className="rounded-[2rem] ops-surface p-6">
            <div className="mb-6">
              <p className="terminal-label">{t("alertsTitle")}</p>
              <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-foreground">{t("openAlertsTitle")}</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {data.alerts.length > 0 ? t("alertsNeedReview", { count: data.alerts.length }) : t("noOpenAlertsRightNow")}
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
                  {t("dependabotUnavailableBody")}
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
                  ? modeLabel === "local auth" ? t("securityDataLoadedSession") : t("securityDataLoadedSnapshot")
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
              {modeLabel === "local auth" ? t("latestCommitsSession") : t("latestCommitsSnapshot")}
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
            <div className="rounded-[1.35rem] ops-surface-soft px-4 py-4 text-sm text-muted-foreground">{t("noCommitDataYet")}</div>
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
  tone = "neutral",
}: {
  label: string;
  value: ReactNode;
  highlighted?: boolean;
  tone?: "neutral" | "warning" | "critical";
}) {
  return (
    <div className={cn(
      "flex items-center justify-between gap-4 rounded-[1rem] bg-white/[0.02] px-4 py-3",
      tone === "warning" && "shadow-[inset_0_0_0_1px_rgba(175,141,17,0.14)]",
      tone === "critical" && "shadow-[inset_0_0_0_1px_rgba(244,122,97,0.18)]",
    )}>
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={cn(
        highlighted ? "rounded-full px-3 py-1 text-sm font-semibold" : "text-sm font-semibold text-foreground",
        highlighted && tone === "critical" && "bg-destructive/10 text-destructive",
        highlighted && tone === "warning" && "bg-secondary/12 text-secondary",
        highlighted && tone === "neutral" && "bg-primary/10 text-primary",
      )}>{value}</span>
    </div>
  );
}

function PriorityShortcut({
  href,
  kicker,
  title,
  body,
  tone,
  badgeLabel,
  primary = false,
}: {
  href: string;
  kicker: string;
  title: string;
  body: string;
  tone: "warning" | "critical";
  badgeLabel: string;
  primary?: boolean;
}) {
  return (
    <a
      href={href}
      className={cn(
        "flex items-start justify-between gap-4 rounded-[1.25rem] px-4 py-4 transition-colors",
        primary && tone === "critical" && "bg-[linear-gradient(135deg,rgba(244,122,97,0.16),rgba(18,18,18,0.96))] shadow-[inset_0_0_0_1px_rgba(244,122,97,0.24)] hover:bg-[linear-gradient(135deg,rgba(244,122,97,0.2),rgba(18,18,18,0.98))]",
        primary && tone === "warning" && "bg-[linear-gradient(135deg,rgba(175,141,17,0.16),rgba(18,18,18,0.96))] shadow-[inset_0_0_0_1px_rgba(175,141,17,0.24)] hover:bg-[linear-gradient(135deg,rgba(175,141,17,0.2),rgba(18,18,18,0.98))]",
        !primary && tone === "critical" && "bg-destructive/[0.08] shadow-[inset_0_0_0_1px_rgba(244,122,97,0.18)] hover:bg-destructive/[0.11]",
        !primary && tone === "warning" && "bg-secondary/[0.08] shadow-[inset_0_0_0_1px_rgba(175,141,17,0.18)] hover:bg-secondary/[0.11]",
      )}
    >
      <div className="min-w-0">
        <p className="terminal-label">{kicker}</p>
        <p className={cn("mt-2 break-words text-sm font-semibold text-foreground", primary && "text-base")}>{title}</p>
        <p className="mt-2 break-words text-xs text-foreground/60">{body}</p>
      </div>
      <StatusPill tone={tone}>{badgeLabel}</StatusPill>
    </a>
  );
}

function severityWeight(severity: "critical" | "high" | "medium" | "low") {
  if (severity === "critical") return 4;
  if (severity === "high") return 3;
  if (severity === "medium") return 2;
  return 1;
}
