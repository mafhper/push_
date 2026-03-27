import { Activity, ArrowLeft, Clock3, Github, Shield, ShieldAlert, Star } from "lucide-react";
import { Link } from "react-router-dom";
import { StatusPill } from "@/components/site/TerminalPrimitives";
import { cn } from "@/lib/utils";
import type { WorkflowRun } from "@/types";
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
  criticalAlerts,
  failedRuns7d,
  stalenessDays,
  lastPushAt,
  runs,
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
  criticalAlerts: number;
  failedRuns7d: number;
  stalenessDays: number;
  lastPushAt: string;
  runs: WorkflowRun[];
}) {
  const trendRuns = runs.slice(0, TREND_RUNS).reverse();
  const maxDuration = Math.max(...trendRuns.map((run) => run.durationMs), 1);
  const attentionItems = buildAttentionItems({
    openAlerts,
    criticalAlerts,
    failedRuns7d,
    stalenessDays,
    workflowSuccessRate,
  });
  const activeCount = attentionItems.filter((item) => item.tone !== "success").length;

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
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-foreground/42">Stars</span>
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
                <p className="terminal-label">Attention</p>
                <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-foreground">
                  {activeCount > 0 ? "Needs review now" : "No active blockers"}
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Critical alerts, failed runs, stale activity, and weak workflow signal stay at the top.
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
              </div>

              <div className="rounded-[1.6rem] ops-surface-deep p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="terminal-label">Run Trend</p>
                    <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-foreground">
                      {runs.length > 0 ? "Recent workflow signal" : "No workflow signal"}
                    </h2>
                  </div>
                  <div className="text-right">
                    <p className="terminal-label">Latest</p>
                    <p className="mt-2 text-sm font-semibold text-foreground">
                      {runs[0] ? formatRelativeTime(runs[0].startedAt, (value) => value) : "Unavailable"}
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
                              {formatRelativeTime(run.startedAt, (value) => value)}
                            </p>
                          </a>
                        );
                      })}
                    </div>

                    <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-primary" />
                        Success
                      </span>
                      <span className="inline-flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-destructive" />
                        Failed
                      </span>
                      <span className="inline-flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-secondary" />
                        Other
                      </span>
                    </div>
                  </>
                ) : (
                  <p className="mt-6 text-sm leading-7 text-muted-foreground">
                    No recent workflow executions were found for this repository.
                  </p>
                )}
              </div>
            </div>

            <div className="overflow-hidden rounded-[1.5rem] ops-surface-soft">
              <div className="grid divide-y divide-white/6 sm:grid-cols-2 sm:divide-x sm:divide-y-0 xl:grid-cols-4">
                <HeroMetric label="Health Score" value={`${score}%`} hint="Current repository score" />
                <HeroMetric label="Workflow" value={workflowSuccessRate !== null ? `${workflowSuccessRate}%` : "N/A"} hint="Recent success rate" />
                <HeroMetric label="Open Alerts" value={`${openAlerts}`} hint={openAlerts > 0 ? "Need review" : "No active alerts"} />
                <HeroMetric label="Last Push" value={formatRelativeTime(lastPushAt, (value) => value)} hint="Latest repository update" />
              </div>
            </div>
          </div>

          <aside className="rounded-[1.7rem] ops-surface-deep p-5 md:p-6">
            <p className="terminal-label">Attention Summary</p>
            <div className="mt-4">
              <p className="text-5xl font-black tracking-tighter text-foreground">{activeCount}</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-foreground">
                {activeCount > 0 ? "Attention flags open" : "Repository is calm"}
              </h2>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">
                Start with alerts and failed runs. Then check stale activity and workflow drift.
              </p>
            </div>

            <div className="mt-6 space-y-4">
              <SignalRow icon={Shield} label="Score" value={`${score}%`} />
              <SignalRow
                icon={ShieldAlert}
                label="Critical Alerts"
                value={`${criticalAlerts}`}
                tone={criticalAlerts > 0 ? "critical" : "success"}
              />
              <SignalRow
                icon={Activity}
                label="Failed Runs 7d"
                value={`${failedRuns7d}`}
                tone={failedRuns7d > 0 ? "warning" : "success"}
              />
              <SignalRow
                icon={Clock3}
                label="Stale Days"
                value={`${stalenessDays}`}
                tone={stalenessDays > 14 ? "warning" : "success"}
              />
            </div>

            <a href={repoUrl} className="button-primary-terminal mt-6 w-full justify-center text-sm">
              <Github size={15} />
              Open Repo
            </a>
          </aside>
        </div>
      </div>
    </section>
  );
}

function buildAttentionItems({
  openAlerts,
  criticalAlerts,
  failedRuns7d,
  stalenessDays,
  workflowSuccessRate,
}: {
  openAlerts: number;
  criticalAlerts: number;
  failedRuns7d: number;
  stalenessDays: number;
  workflowSuccessRate: number | null;
}) {
  const items = [];

  if (criticalAlerts > 0) {
    items.push({
      tone: "critical" as const,
      title: `${criticalAlerts} critical alert${criticalAlerts > 1 ? "s" : ""}`,
      body: "Security issues at the highest severity need action first.",
    });
  }

  if (openAlerts > 0) {
    items.push({
      tone: "warning" as const,
      title: `${openAlerts} open alert${openAlerts > 1 ? "s" : ""}`,
      body: "Dependabot findings are still open in the current dataset.",
    });
  }

  if (failedRuns7d > 0) {
    items.push({
      tone: "warning" as const,
      title: `${failedRuns7d} failed run${failedRuns7d > 1 ? "s" : ""} in 7 days`,
      body: "Recent CI failures can hide broken deploy or release paths.",
    });
  }

  if (stalenessDays > 14) {
    items.push({
      tone: "warning" as const,
      title: `${stalenessDays} stale day${stalenessDays > 1 ? "s" : ""}`,
      body: "This repository has been quiet long enough to deserve a check.",
    });
  }

  if (workflowSuccessRate !== null && workflowSuccessRate < 85) {
    items.push({
      tone: workflowSuccessRate < 60 ? ("critical" as const) : ("warning" as const),
      title: `${workflowSuccessRate}% workflow success`,
      body: "The recent pipeline slice is running below a stable threshold.",
    });
  }

  if (items.length === 0) {
    return [
      {
        tone: "success" as const,
        title: "No active blockers",
        body: "Alerts are clear, recent runs are stable, and the repository is moving.",
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
