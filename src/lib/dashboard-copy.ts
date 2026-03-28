import type { DictKey } from "@/i18n";
import type { DiagnosticsRow } from "@/components/dashboard/RepositoryDiagnosticsList";
import type { ShowcaseItem } from "@/components/dashboard/RepositoryShowcase";
import type { OverviewRepoSnapshot, RepositoryRef } from "@/types";

type Translate = (key: DictKey, values?: Record<string, string | number>) => string;

export function buildSnapshotShowcaseItems(entries: OverviewRepoSnapshot[], t: Translate, relativeTime: (value: string) => string): ShowcaseItem[] {
  return entries.map((entry) => {
    const tone = entry.health.status === "critical" ? "critical" : entry.health.status === "warning" ? "warning" : "success";
    const workflowLabel =
      entry.stats.latestWorkflowConclusion === "failure"
        ? t("workflowFailing")
        : entry.stats.latestWorkflowConclusion === "success"
          ? t("workflowPassing")
          : t("noWorkflowSignal");
    const staleLabel = entry.health.stalenessDays > 0 ? t("staleDaysShort", { count: entry.health.stalenessDays }) : t("fresh");
    const alertLabel = entry.health.dependabotOpenCount > 0 ? t("alertsCountLabel", { count: entry.health.dependabotOpenCount }) : t("noAlertsLabel");

    return {
      id: entry.repo.fullName,
      route: `/app/repo/${entry.repo.owner}/${entry.repo.name}`,
      owner: entry.repo.owner,
      name: entry.repo.name,
      fullName: entry.repo.fullName,
      description: entry.repo.description || t("noRepositoryDescriptionSnapshot"),
      defaultBranch: entry.repo.defaultBranch,
      language: entry.repo.language ?? "untyped",
      imageLanguage: entry.repo.language,
      lastActivityLabel: t("lastMovement", { value: relativeTime(entry.repo.lastPushAt) }),
      statusLabel: tone === "critical" ? t("needsAction") : tone === "warning" ? t("watchClosely") : t("stable"),
      statusTone: tone,
      scoreLabel: t("health"),
      scoreValue: `${entry.health.score}%`,
      summary: `${alertLabel} · ${workflowLabel.toLowerCase()} · ${staleLabel}.`,
      spotlightMetrics: [
        { label: t("openAlertsLabel"), value: `${entry.health.dependabotOpenCount}`, tone: entry.health.dependabotOpenCount > 0 ? "critical" : "success" },
        { label: t("workflow"), value: entry.stats.latestWorkflowConclusion ?? t("unavailable"), tone: entry.stats.latestWorkflowConclusion === "failure" ? "critical" : entry.stats.latestWorkflowConclusion === "success" ? "success" : "neutral" },
        { label: t("staleDays"), value: `${entry.health.stalenessDays}`, tone: entry.health.stalenessDays > 30 ? "warning" : "success" },
        { label: t("lastPushLabel"), value: relativeTime(entry.repo.lastPushAt), tone: entry.health.stalenessDays > 30 ? "warning" : "success" },
      ],
    };
  });
}

export function buildSnapshotDiagnosticsRows(entries: OverviewRepoSnapshot[], t: Translate, relativeTime: (value: string) => string): DiagnosticsRow[] {
  return entries.map((entry, index) => {
    const tone = entry.health.status === "critical" ? "critical" : entry.health.status === "warning" ? "warning" : "success";
    const workflowValue =
      entry.stats.latestWorkflowConclusion === "failure"
        ? t("failing")
        : entry.stats.latestWorkflowConclusion === "success"
          ? t("passing")
          : t("noSignal");

    return {
      id: entry.repo.fullName,
      route: `/app/repo/${entry.repo.owner}/${entry.repo.name}`,
      rank: index + 1,
      name: entry.repo.name,
      owner: entry.repo.owner,
      defaultBranch: entry.repo.defaultBranch,
      description: entry.repo.description,
      statusLabel: tone === "critical" ? t("needsAction") : tone === "warning" ? t("watchClosely") : t("stable"),
      statusTone: tone,
      activityLabel: relativeTime(entry.repo.lastPushAt),
      summaryLabel:
        entry.health.dependabotOpenCount > 0
          ? t("alertsOpenLabel", { count: entry.health.dependabotOpenCount })
          : entry.health.stalenessDays > 30
            ? t("staleDaysShort", { count: entry.health.stalenessDays })
            : t("noUrgentSignal"),
      signals: [
        { label: t("health"), value: `${entry.health.score}%`, tone },
        { label: t("workflow"), value: workflowValue, tone: workflowValue === t("failing") ? "critical" : workflowValue === t("passing") ? "success" : "neutral" },
        {
          label: t("coverage"),
          value: entry.availability.workflowRuns.available ? t("commitsCountLabel", { count: entry.stats.totalCommitsTracked }) : t("workflowUnavailable"),
          tone: entry.availability.workflowRuns.available ? "neutral" : "warning",
        },
      ],
    };
  });
}

export function buildPublicShowcaseItems(repos: RepositoryRef[], t: Translate, relativeTime: (value: string) => string): ShowcaseItem[] {
  return repos.map((repo) => {
    const tone = repo.archived ? "warning" : repo.openIssues > 0 ? "warning" : "success";
    const updatedAt = repo.updatedAt || repo.lastPushAt;
    const updatedLabel = relativeTime(updatedAt);

    return {
      id: repo.fullName,
      route: `/app/repo/${repo.owner}/${repo.name}`,
      owner: repo.owner,
      name: repo.name,
      fullName: repo.fullName,
      description: repo.description || t("noDescription"),
      defaultBranch: repo.defaultBranch,
      language: repo.language ?? "unknown",
      imageLanguage: repo.language,
      lastActivityLabel: t("lastMovement", { value: updatedLabel }),
      statusLabel: repo.archived ? t("archived") : repo.openIssues > 0 ? t("backlogOpen") : t("activeLabel"),
      statusTone: tone,
      scoreLabel: t("stars"),
      scoreValue: `${repo.stars}`,
      summary: `${repo.openIssues} ${t("issues").toLowerCase()} · ${repo.forks} ${t("forks").toLowerCase()} · ${t("updated").toLowerCase()} ${updatedLabel}.`,
      spotlightMetrics: [
        { label: t("issues"), value: `${repo.openIssues}`, tone: repo.openIssues > 0 ? "warning" : "success" },
        { label: t("forks"), value: `${repo.forks}`, tone: "neutral" },
        { label: t("watchers"), value: `${repo.watchers}`, tone: "neutral" },
        { label: t("latestUpdate"), value: updatedLabel, tone: "success" },
      ],
    };
  });
}

export function buildPublicDiagnosticsRows(repos: RepositoryRef[], t: Translate, relativeTime: (value: string) => string): DiagnosticsRow[] {
  return repos.map((repo, index) => {
    const updatedAt = repo.updatedAt || repo.lastPushAt;
    const tone = repo.archived ? "warning" : repo.openIssues > 0 ? "warning" : "success";

    return {
      id: repo.fullName,
      route: `/app/repo/${repo.owner}/${repo.name}`,
      rank: index + 1,
      name: repo.name,
      owner: repo.owner,
      defaultBranch: repo.defaultBranch,
      description: repo.description,
      statusLabel: repo.archived ? t("archived") : repo.openIssues > 0 ? t("backlogOpen") : t("activeLabel"),
      statusTone: tone,
      activityLabel: relativeTime(updatedAt),
      summaryLabel: repo.openIssues > 0 ? t("alertsOpenLabel", { count: repo.openIssues }) : t("noOpenIssue"),
      signals: [
        { label: t("stars"), value: `${repo.stars}`, tone: repo.stars > 0 ? "success" : "neutral" },
        { label: t("forks"), value: `${repo.forks}`, tone: "neutral" },
        { label: t("watchers"), value: `${repo.watchers}`, tone: "neutral" },
      ],
    };
  });
}
