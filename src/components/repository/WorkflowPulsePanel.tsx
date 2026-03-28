import { Activity, AlertTriangle, Clock3, ExternalLink, GitBranch, TimerReset } from "lucide-react";
import { SectionHeading, StatusPill } from "@/components/site/TerminalPrimitives";
import { useApp } from "@/contexts/useApp";
import type { DictKey } from "@/i18n";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/utils/health";
import type { WorkflowRun } from "@/types";

const VISIBLE_RUNS = 8;

export function WorkflowPulsePanel({
  runs,
  title,
  body,
  historyLabel,
  emptyMessage,
}: {
  runs: WorkflowRun[];
  title: string;
  body: string;
  historyLabel: string;
  emptyMessage: string;
}) {
  const { t } = useApp();
  const recentRuns = runs.slice(0, VISIBLE_RUNS);
  const latestRun = recentRuns[0];
  const successCount = recentRuns.filter((run) => run.conclusion === "success").length;
  const failureCount = recentRuns.filter((run) => run.conclusion === "failure").length;
  const otherCount = recentRuns.length - successCount - failureCount;
  const successRate = recentRuns.length > 0 ? Math.round((successCount / recentRuns.length) * 100) : 0;
  const averageDurationMs =
    recentRuns.length > 0 ? Math.round(recentRuns.reduce((sum, run) => sum + run.durationMs, 0) / recentRuns.length) : 0;
  const longestDurationMs = Math.max(...recentRuns.map((run) => run.durationMs), 1);
  const latestFailure = recentRuns.find((run) => run.conclusion === "failure");
  const storyline =
    recentRuns.length === 0
      ? t("workflowNoWorkflowSignal")
      : latestFailure
        ? t("workflowRecentRunsFailureStory", {
            passed: successCount,
            total: recentRuns.length,
            when: formatRelativeTime(latestFailure.startedAt, t),
          })
        : t("workflowRecentRunsPassStory", { rate: successRate });

  return (
    <section className="rounded-[2rem] ops-surface p-6 md:p-7">
      <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <SectionHeading title={title} body={body} />
        <div className="flex flex-wrap gap-2">
          <StatusPill tone="success">{t("workflowCountSuccess", { count: successCount })}</StatusPill>
          <StatusPill tone="critical">{t("workflowCountFailed", { count: failureCount })}</StatusPill>
          <StatusPill tone="warning">{t("workflowCountOther", { count: otherCount })}</StatusPill>
        </div>
      </div>

      {recentRuns.length > 0 ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.32fr)_18.5rem]">
          <div className="space-y-5">
            <div className="overflow-hidden rounded-[1.5rem] ops-surface-soft">
              <div className="grid divide-y divide-white/6 md:grid-cols-3 md:divide-x md:divide-y-0">
                <InsightCard
                  icon={Activity}
                  label={t("workflowSuccessRate")}
                  value={`${successRate}%`}
                  note={`${successCount}/${recentRuns.length} runs`}
                  tone={successRate >= 80 ? "success" : successRate >= 50 ? "warning" : "critical"}
                />
                <InsightCard
                  icon={TimerReset}
                  label={t("workflowAvgDuration")}
                  value={formatDuration(averageDurationMs)}
                  note={latestRun ? t("workflowLatestDuration", { value: formatDuration(latestRun.durationMs) }) : t("workflowNoLatestRun")}
                  tone={latestRun && latestRun.durationMs > averageDurationMs * 1.4 ? "warning" : "neutral"}
                />
                <InsightCard
                  icon={Clock3}
                  label={t("workflowLastRun")}
                  value={latestRun ? formatRelativeTime(latestRun.startedAt, t) : t("unavailable")}
                  note={latestRun ? `${latestRun.event} / ${latestRun.branch}` : t("workflowNoWorkflowSignal")}
                  tone={failureCount > 0 ? "warning" : "success"}
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="terminal-label">{historyLabel}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{storyline}</p>
                </div>
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-foreground/38">
                  {t("workflowLatestStatus", { status: getRunStatus(latestRun?.conclusion ?? null, t).label.toLowerCase() })}
                </p>
              </div>

              <div className="space-y-3">
                {recentRuns.map((run) => {
                  const status = getRunStatus(run.conclusion, t);
                  const fillWidth = `${Math.max(10, Math.round((run.durationMs / longestDurationMs) * 100))}%`;

                  return (
                    <a
                      key={run.id}
                      href={run.htmlUrl}
                      className={cn(
                        "group block rounded-[1.35rem] px-4 py-4 transition-colors",
                        status.tone === "success"
                          ? "ops-surface-soft hover:bg-primary/[0.05]"
                          : status.tone === "critical"
                            ? "ops-surface-soft hover:bg-destructive/[0.05]"
                            : "ops-surface-soft hover:bg-secondary/[0.05]",
                      )}
                    >
                      <div className="flex items-start gap-4">
                        <div className={cn("mt-1 h-14 w-1.5 rounded-full", status.fillClass)} />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <StatusPill tone={status.tone}>{status.label}</StatusPill>
                            <p className="min-w-0 flex-1 truncate text-base font-semibold tracking-[-0.02em] text-foreground">
                              {run.workflowName}
                            </p>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                            <span className="inline-flex items-center gap-1.5">
                              <GitBranch size={12} />
                              {run.branch}
                            </span>
                            <span>{run.event}</span>
                            <span>{formatRelativeTime(run.startedAt, t)}</span>
                          </div>
                          <div className="mt-4 flex items-center gap-3">
                            <div className="h-2 flex-1 overflow-hidden rounded-full bg-black/26 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.03)]">
                              <div className={cn("h-full rounded-full", status.fillClass)} style={{ width: fillWidth }} />
                            </div>
                            <span className="font-mono text-xs uppercase tracking-[0.16em] text-foreground/45">
                              {formatDuration(run.durationMs)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </a>
                  );
                })}
              </div>
            </div>
          </div>

          <aside className="space-y-4">
            <div className="rounded-[1.6rem] ops-surface-deep p-5">
              <p className="terminal-label">{t("workflowLatestRunTitle")}</p>
              {latestRun ? (
                <>
                  <div className="mt-4 flex items-center gap-3">
                    <StatusPill tone={getRunStatus(latestRun.conclusion, t).tone}>{getRunStatus(latestRun.conclusion, t).label}</StatusPill>
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-foreground/42">Run #{latestRun.id}</p>
                  </div>

                  <h3 className="mt-4 text-2xl font-semibold tracking-[-0.03em] text-foreground">{latestRun.workflowName}</h3>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">{storyline}</p>

                  <div className="mt-6 space-y-3">
                    <SignalRow icon={TimerReset} label={t("workflowDuration")} value={formatDuration(latestRun.durationMs)} />
                    <SignalRow icon={GitBranch} label={t("workflowBranch")} value={latestRun.branch} />
                    <SignalRow icon={AlertTriangle} label={t("workflowTrigger")} value={latestRun.event} />
                    <SignalRow icon={Clock3} label={t("workflowStarted")} value={formatRelativeTime(latestRun.startedAt, t)} />
                  </div>

                  <a
                    href={latestRun.htmlUrl}
                    className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary/[0.08] px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/[0.12]"
                  >
                    {t("workflowOpenLatestRun")}
                    <ExternalLink size={14} />
                  </a>
                </>
              ) : (
                <WorkflowEmptyState message={emptyMessage} compact />
              )}
            </div>

            <div className="rounded-[1.6rem] ops-surface-soft p-5">
              <p className="terminal-label">{t("workflowWhatChanged")}</p>
              {latestFailure ? (
                <>
                  <h3 className="mt-4 text-lg font-semibold tracking-[-0.03em] text-foreground">{t("workflowLatestFailureTitle")}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {t("workflowLatestFailureBody", {
                      name: latestFailure.workflowName,
                      when: formatRelativeTime(latestFailure.startedAt, t),
                    })}
                  </p>
                </>
              ) : (
                <>
                  <h3 className="mt-4 text-lg font-semibold tracking-[-0.03em] text-foreground">{t("workflowNoRecentFailuresTitle")}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{t("workflowNoRecentFailuresBody")}</p>
                </>
              )}
            </div>
          </aside>
        </div>
      ) : (
        <div className="rounded-[1.8rem] ops-surface-deep p-5">
          <WorkflowEmptyState message={emptyMessage} />
        </div>
      )}
    </section>
  );
}

function InsightCard({
  icon: Icon,
  label,
  value,
  note,
  tone,
}: {
  icon: typeof Activity;
  label: string;
  value: string;
  note: string;
  tone: "success" | "warning" | "critical" | "neutral";
}) {
  return (
    <div className="px-4 py-4">
      <div className="flex items-center gap-2">
        <Icon
          size={14}
          className={cn(
            tone === "success" && "text-primary",
            tone === "warning" && "text-secondary",
            tone === "critical" && "text-destructive",
            tone === "neutral" && "text-foreground/58",
          )}
        />
        <p className="terminal-label">{label}</p>
      </div>
      <p className="mt-4 text-2xl font-semibold tracking-[-0.03em] text-foreground">{value}</p>
      <p className="mt-2 text-sm text-muted-foreground">{note}</p>
    </div>
  );
}

function SignalRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Activity;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[1.2rem] ops-surface-soft px-4 py-3">
      <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
        <Icon size={14} />
        {label}
      </span>
      <span className="text-sm font-semibold text-foreground">{value}</span>
    </div>
  );
}

function getRunStatus(conclusion: string | null, t: (key: DictKey, values?: Record<string, string | number>) => string) {
  if (conclusion === "success") {
    return {
      label: t("success"),
      tone: "success" as const,
      fillClass: "bg-primary",
    };
  }

  if (conclusion === "failure") {
    return {
      label: t("failing"),
      tone: "critical" as const,
      fillClass: "bg-destructive/80",
    };
  }

  return {
    label: t("otherLabel"),
    tone: "warning" as const,
    fillClass: "bg-secondary",
  };
}

function formatDuration(durationMs: number) {
  if (!durationMs || durationMs <= 0) return "0s";

  const totalSeconds = Math.round(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes === 0) return `${seconds}s`;
  if (minutes < 60) return `${minutes}m ${String(seconds).padStart(2, "0")}s`;

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${String(remainingMinutes).padStart(2, "0")}m`;
}

function WorkflowEmptyState({ message, compact = false }: { message: string; compact?: boolean }) {
  const { t } = useApp();
  return (
    <div className={cn("rounded-[1.5rem] ops-surface-soft", compact ? "p-4" : "p-5")}>
      <p className="terminal-label">{t("workflowUnavailableTitle")}</p>
      <h3 className="mt-3 text-lg font-semibold tracking-[-0.03em] text-foreground">{t("workflowNoRunsTitle")}</h3>
      <p className="mt-3 text-sm leading-7 text-muted-foreground">{message}</p>
    </div>
  );
}
