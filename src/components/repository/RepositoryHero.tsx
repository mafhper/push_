import { Activity, ArrowLeft, Clock3, GitPullRequest, Github, Shield, ShieldAlert, Star } from "lucide-react";
import { Link } from "react-router-dom";
import { StatusPill } from "@/components/site/TerminalPrimitives";
import { useApp } from "@/contexts/useApp";
import { cn } from "@/lib/utils";
import type { PullRequestSummary, WorkflowRun } from "@/types";
import { formatRelativeTime } from "@/utils/health";

const TREND_RUNS = 8;

export function RepositoryHero({
  backLabel,
  sourceLabel,
  sourceTone,
  healthLabel,
  healthTone,
  name,
  description,
  repoUrl,
  stars,
  score,
  workflowSuccessRate,
  openAlerts,
  openPullRequests,
  criticalAlerts,
  failedRuns7d,
  stalenessDays,
  lastPushAt,
  runs,
  pullRequests,
}: {
  backLabel: string;
  sourceLabel: string;
  sourceTone: "success" | "warning" | "critical" | "neutral";
  healthLabel: string;
  healthTone: "success" | "warning" | "critical" | "neutral";
  name: string;
  description: string;
  repoUrl: string;
  stars: number;
  score: number;
  workflowSuccessRate: number | null;
  openAlerts: number;
  openPullRequests: number;
  criticalAlerts: number;
  failedRuns7d: number;
  stalenessDays: number;
  lastPushAt: string;
  runs: WorkflowRun[];
  pullRequests?: PullRequestSummary[];
}) {
  const { t } = useApp();
  const trendRuns = runs.slice(0, TREND_RUNS).reverse();
  const maxDuration = Math.max(...trendRuns.map((run) => run.durationMs), 1);
  const attentionItems = buildAttentionItems({
    openAlerts,
    openPullRequests,
    criticalAlerts,
    failedRuns7d,
    stalenessDays,
    workflowSuccessRate,
    t,
  });
  const activeCount = attentionItems.filter((item) => item.tone !== "success").length;
  const visiblePullRequests = (pullRequests ?? []).slice(0, 3);

  return (
    <section className="relative overflow-hidden rounded-[2rem] ops-surface px-6 py-6 md:px-8 md:py-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(0,255,65,0.12),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(175,141,17,0.08),transparent_24%)]" />
      <div className="relative space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/app"
              className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.24em] text-foreground/55 hover:text-primary"
            >
              <ArrowLeft size={12} />
              {backLabel}
            </Link>
            <StatusPill tone={sourceTone}>{sourceLabel}</StatusPill>
            <StatusPill tone={healthTone}>{healthLabel}</StatusPill>
          </div>

          <div className="inline-flex items-center gap-2 rounded-full ops-surface-soft px-4 py-2">
            <Star size={14} className="text-secondary" />
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-foreground/42">{t("stars")}</span>
            <span className="text-sm font-semibold text-foreground">{stars}</span>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_22rem] xl:items-stretch">
          <div className="space-y-6">
            <div className="max-w-4xl">
              <h1 className="text-fluid-4xl font-black tracking-tighter text-foreground">{name}</h1>
              <p className="mt-3 max-w-3xl text-base leading-7 text-muted-foreground">{description}</p>
            </div>

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
              <div className="rounded-[1.6rem] ops-surface-soft p-5">
                <p className="terminal-label">{t("attention")}</p>
                <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-foreground">
                  {activeCount > 0 ? t("repoNeedsAttention") : t("repoNothingUrgent")}
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  {t("repoAttentionBody")}
                </p>

                <div className="mt-5 space-y-3">
                  {attentionItems.map((item) => (
                    <div key={item.title} className="flex items-start gap-3">
                      <span
                        className={cn(
                          "mt-1.5 h-2.5 w-2.5 rounded-full",
                          item.tone === "critical" && "bg-destructive",
                          item.tone === "warning" && "bg-secondary",
                          item.tone === "success" && "bg-primary",
                        )}
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground">{item.title}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{item.body}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {visiblePullRequests.length > 0 ? (
                  <div className="mt-5 rounded-[1.4rem] bg-secondary/[0.08] p-4 shadow-[inset_0_0_0_1px_rgba(175,141,17,0.18)]">
                    <div className="flex items-center justify-between gap-3">
                      <p className="terminal-label text-secondary/80">{t("openPullRequests")}</p>
                      <StatusPill tone="warning">{t("review")}</StatusPill>
                    </div>
                    <div className="mt-4 space-y-3">
                      {visiblePullRequests.map((pullRequest) => (
                        <a
                          key={pullRequest.id}
                          href={pullRequest.htmlUrl}
                          className="flex items-start justify-between gap-4 rounded-[1rem] bg-black/18 px-4 py-3 transition-colors hover:bg-black/24"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-foreground">#{pullRequest.number} {pullRequest.title}</p>
                            <p className="mt-1 text-xs text-foreground/55">@{pullRequest.authorLogin}</p>
                          </div>
                          <StatusPill tone={pullRequest.draft ? "neutral" : "warning"}>
                            {pullRequest.draft ? t("draft") : t("open")}
                          </StatusPill>
                        </a>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="rounded-[1.6rem] ops-surface-deep p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="terminal-label">{t("repoRecentRunsTitle")}</p>
                    <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-foreground">
                      {runs.length > 0 ? t("repoRecentRunHistory") : t("repoNoRecentRuns")}
                    </h2>
                  </div>
                  <div className="text-right">
                    <p className="terminal-label">{t("repoLastRun")}</p>
                    <p className="mt-2 text-sm font-semibold text-foreground">
                      {runs[0] ? formatRelativeTime(runs[0].startedAt, t) : t("unavailable")}
                    </p>
                  </div>
                </div>

                {trendRuns.length > 0 ? (
                  <>
                    <div className="mt-6 flex items-end gap-2">
                      {trendRuns.map((run) => {
                        const statusTone = getRunTone(run.conclusion);
                        const height = `${Math.max(16, Math.round((run.durationMs / maxDuration) * 100))}%`;

                        return (
                          <a key={run.id} href={run.htmlUrl} className="group min-w-0 flex-1">
                            <div className="flex h-28 items-end rounded-[1.1rem] bg-black/22 p-2 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)] transition-colors group-hover:bg-white/[0.05]">
                              <div
                                className={cn(
                                  "w-full rounded-full transition-transform group-hover:scale-y-[1.03]",
                                  statusTone === "success" && "bg-primary",
                                  statusTone === "warning" && "bg-secondary",
                                  statusTone === "critical" && "bg-destructive/90",
                                )}
                                style={{ height }}
                              />
                            </div>
                            <p className="mt-2 truncate text-xs font-medium text-foreground/84">{trimRunName(run.workflowName)}</p>
                            <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-foreground/35">
                              {formatRelativeTime(run.startedAt, t)}
                            </p>
                          </a>
                        );
                      })}
                    </div>

                    <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-primary" />
                        {t("success")}
                      </span>
                      <span className="inline-flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-destructive" />
                        {t("failing")}
                      </span>
                      <span className="inline-flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-secondary" />
                        {t("otherLabel")}
                      </span>
                    </div>
                  </>
                ) : (
                  <p className="mt-6 text-sm leading-7 text-muted-foreground">
                    {t("repoRecentWorkflowExecutionsMissing")}
                  </p>
                )}
              </div>
            </div>

            <div className="overflow-hidden rounded-[1.5rem] ops-surface-soft">
              <div className="grid divide-y divide-white/6 sm:grid-cols-2 sm:divide-x sm:divide-y-0 xl:grid-cols-4">
                <HeroMetric label={t("health")} value={`${score}%`} hint={t("repoCurrentRepositoryScore")} />
                <HeroMetric label={t("workflow")} value={workflowSuccessRate !== null ? `${workflowSuccessRate}%` : "N/A"} hint={t("repoRecentSuccessRate")} />
                <HeroMetric label={t("alerts")} value={`${openAlerts}`} hint={openAlerts > 0 ? t("repoNeedReview") : t("repoNoActiveAlerts")} />
                <HeroMetric label={t("openPullRequests")} value={`${openPullRequests}`} hint={openPullRequests > 0 ? t("repoPullRequestsNeedReview") : t("repoNoOpenPullRequests")} />
              </div>
            </div>
          </div>

          <aside className="rounded-[1.7rem] ops-surface-deep p-5 md:p-6">
            <p className="terminal-label">{t("repoQuickRead")}</p>
            <div className="mt-4">
              <p className="text-5xl font-black tracking-tighter text-foreground">{activeCount}</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-foreground">
                {activeCount > 0 ? t("repoOpenItems") : t("repoNothingUrgent")}
              </h2>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">
                {t("repoQuickReadBody")}
              </p>
            </div>

            <div className="mt-6 space-y-4">
              <SignalRow icon={Shield} label={t("repoScoreLabel")} value={`${score}%`} />
              <SignalRow
                icon={ShieldAlert}
                label={t("repoCriticalAlertsLabel")}
                value={`${criticalAlerts}`}
                tone={criticalAlerts > 0 ? "critical" : "success"}
              />
              <SignalRow
                icon={GitPullRequest}
                label={t("openPullRequests")}
                value={`${openPullRequests}`}
                tone={openPullRequests > 0 ? "warning" : "success"}
              />
              <SignalRow
                icon={Activity}
                label={t("repoFailedRuns7dLabel")}
                value={`${failedRuns7d}`}
                tone={failedRuns7d > 0 ? "warning" : "success"}
              />
              <SignalRow
                icon={Clock3}
                label={t("staleDays")}
                value={`${stalenessDays}`}
                tone={stalenessDays > 14 ? "warning" : "success"}
              />
            </div>

            <a href={repoUrl} className="button-primary-terminal mt-6 w-full justify-center text-sm">
              <Github size={15} />
              {t("repoOpenRepo")}
            </a>
          </aside>
        </div>
      </div>
    </section>
  );
}

function buildAttentionItems({
  openAlerts,
  openPullRequests,
  criticalAlerts,
  failedRuns7d,
  stalenessDays,
  workflowSuccessRate,
  t,
}: {
  openAlerts: number;
  openPullRequests: number;
  criticalAlerts: number;
  failedRuns7d: number;
  stalenessDays: number;
  workflowSuccessRate: number | null;
  t: (key: string, values?: Record<string, string | number>) => string;
}) {
  const items = [];

  if (criticalAlerts > 0) {
    items.push({
      tone: "critical" as const,
      title: t("repoCriticalAlertsItem", { count: criticalAlerts }),
      body: t("repoCriticalAlertsBody"),
    });
  }

  if (openAlerts > 0) {
    items.push({
      tone: "warning" as const,
      title: t("repoOpenAlertsItem", { count: openAlerts }),
      body: t("repoOpenAlertsBody"),
    });
  }

  if (openPullRequests > 0) {
    items.push({
      tone: "warning" as const,
      title: t("repoOpenPullRequestsItem", { count: openPullRequests }),
      body: t("repoOpenPullRequestsBody"),
    });
  }

  if (failedRuns7d > 0) {
    items.push({
      tone: "warning" as const,
      title: t("repoFailedRunsItem", { count: failedRuns7d }),
      body: t("repoFailedRunsBody"),
    });
  }

  if (stalenessDays > 14) {
    items.push({
      tone: "warning" as const,
      title: t("repoStaleDaysItem", { count: stalenessDays }),
      body: t("repoStaleDaysBody"),
    });
  }

  if (workflowSuccessRate !== null && workflowSuccessRate < 85) {
    items.push({
      tone: workflowSuccessRate < 60 ? ("critical" as const) : ("warning" as const),
      title: t("repoWorkflowReliabilityItem", { count: workflowSuccessRate }),
      body: t("repoWorkflowReliabilityBody"),
    });
  }

  if (items.length === 0) {
    return [
      {
        tone: "success" as const,
        title: t("repoNothingUrgent"),
        body: t("repoClearBody"),
      },
    ];
  }

  return items.slice(0, 3);
}

function getRunTone(conclusion: string | null) {
  if (conclusion === "success") return "success" as const;
  if (conclusion === "failure") return "critical" as const;
  return "warning" as const;
}

function trimRunName(name: string) {
  if (name.length <= 18) return name;
  return `${name.slice(0, 15)}...`;
}

function SignalRow({
  icon: Icon,
  label,
  value,
  tone = "neutral",
}: {
  icon: typeof Shield;
  label: string;
  value: string;
  tone?: "success" | "warning" | "critical" | "neutral";
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[1.15rem] ops-surface-soft px-4 py-3">
      <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
        <Icon size={14} />
        {label}
      </span>
      <span
        className={cn(
          "text-sm font-semibold",
          tone === "success" && "text-primary",
          tone === "warning" && "text-secondary",
          tone === "critical" && "text-destructive",
          tone === "neutral" && "text-foreground",
        )}
      >
        {value}
      </span>
    </div>
  );
}

function HeroMetric({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="px-4 py-4">
      <p className="terminal-label">{label}</p>
      <p className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-foreground">{value}</p>
      <p className="mt-2 text-sm text-muted-foreground">{hint}</p>
    </div>
  );
}
