import { Check, GitCommitHorizontal, GitPullRequest, ShieldAlert, X } from "lucide-react";
import { useState } from "react";
import { useApp } from "@/contexts/useApp";
import { cn } from "@/lib/utils";
import {
  PROMO_FLEET,
  PROMO_SAMPLE_HANDLE,
  SCORE_WEIGHTS,
  STATUS_DOT,
  STATUS_TEXT,
  fleetRepoAt,
  statusLabelKey,
  statusOf,
} from "./promoFleet";
import {
  SAMPLE_COMMITS,
  SAMPLE_REVIEWS,
  SAMPLE_RUNS,
  SAMPLE_TRAIL,
  SAMPLE_TRAIL_PEAK,
  SAMPLE_TRAIL_TOTAL,
} from "./promoSample";

type Mode = "balanced" | "detailed" | "full";

const MODE_LEVEL: Record<Mode, number> = { balanced: 1, detailed: 2, full: 3 };

export function PromoInspector() {
  const { t } = useApp();
  const [mode, setMode] = useState<Mode>("balanced");
  const repo = fleetRepoAt(0);
  const status = statusOf(repo.score);
  const level = MODE_LEVEL[mode];
  // The bars divide by the score; the empty fallback entry scores zero.
  const scale = Math.max(1, repo.score);
  const alertShare = (repo.alerts * SCORE_WEIGHTS.alert) / scale;
  const prShare = (repo.prs * SCORE_WEIGHTS.pr) / scale;

  const modes: { key: Mode; label: string; body: string }[] = [
    { key: "balanced", label: t("promoInspectorModeBalanced"), body: t("promoInspectorModeBalancedBody") },
    { key: "detailed", label: t("promoInspectorModeDetailed"), body: t("promoInspectorModeDetailedBody") },
    { key: "full", label: t("promoInspectorModeFull"), body: t("promoInspectorModeFullBody") },
  ];

  return (
    <section id="inspector" className="scroll-mt-20 border-y border-border/70 bg-surface-1/40">
      <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20 md:px-8">
        <div className="max-w-3xl">
          <p className="font-mono text-micro font-semibold uppercase tracking-[0.18em] text-primary">
            {t("promoInspectorKicker")}
          </p>
          <h2 className="mt-3 font-headline text-3xl font-semibold leading-tight text-foreground sm:text-4xl">
            {t("promoInspectorTitle")}
          </h2>
          <p className="mt-4 text-base leading-7 text-foreground-muted">{t("promoInspectorBody")}</p>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-12">
          <div className="lg:col-span-3">
            <p className="font-mono text-micro uppercase tracking-[0.16em] text-foreground-subtle">
              {t("promoInspectorModeLabel")}
            </p>
            <div className="mt-3 grid gap-2" role="radiogroup" aria-label={t("promoInspectorModeLabel")}>
              {modes.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  role="radio"
                  aria-checked={mode === item.key}
                  onClick={() => setMode(item.key)}
                  className="rounded-lg border border-border/70 bg-surface-1 p-4 text-left transition-colors hover:border-border-strong aria-checked:border-primary aria-checked:ring-1 aria-checked:ring-primary"
                >
                  <span className="text-sm font-semibold text-foreground">{item.label}</span>
                  <span className="mt-1 block text-xs leading-snug text-foreground-subtle">{item.body}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-border/70 bg-background lg:col-span-9">
            <div className="flex items-center gap-2 border-b border-border/70 bg-surface-1 px-4 py-2.5">
              <span className="size-2 rounded-full bg-surface-3" aria-hidden="true" />
              <span className="size-2 rounded-full bg-surface-3" aria-hidden="true" />
              <span className="size-2 rounded-full bg-surface-3" aria-hidden="true" />
              <span className="ml-3 font-mono text-micro text-foreground-subtle">
                @{PROMO_SAMPLE_HANDLE}/{repo.name}
              </span>
            </div>

            <div className="grid md:grid-cols-[12rem_1fr]">
              <aside aria-hidden="true" className="border-r border-border/70 bg-surface-1/60 max-md:hidden">
                <p className="border-b border-border/70 px-4 py-3 font-mono text-micro uppercase tracking-[0.16em] text-foreground-subtle">
                  {t("promoInspectorQueue")}
                </p>
                {PROMO_FLEET.map((item, index) => {
                  const itemStatus = statusOf(item.score);
                  return (
                    <div
                      key={item.name}
                      className={cn(
                        "flex items-center gap-2 border-b border-border/60 px-3 py-2 text-xs",
                        index === 0 && "bg-surface-3",
                      )}
                    >
                      <span className={cn("size-1.5 rounded-full", STATUS_DOT[itemStatus])} />
                      <span className="flex-1 truncate text-foreground-muted">{item.name}</span>
                      <span className={cn("font-mono tabular-nums", STATUS_TEXT[itemStatus])}>{item.score}</span>
                    </div>
                  );
                })}
              </aside>

              <div className="min-w-0 p-5 sm:p-6">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="grid size-10 place-items-center rounded-md border border-border/70 font-mono text-xs font-semibold text-foreground">
                    {repo.mark}
                  </span>
                  <div className="mr-auto">
                    <p className="text-xs text-foreground-subtle">@{PROMO_SAMPLE_HANDLE} /</p>
                    <p className="font-headline text-xl leading-tight text-foreground">{repo.name}</p>
                  </div>
                  <span className={cn("rounded-full bg-surface-2 px-3 py-1 text-micro font-semibold", STATUS_TEXT[status])}>
                    {t(statusLabelKey(status))} · {repo.score}
                  </span>
                </div>

                <div className="mt-6 grid gap-4 xl:grid-cols-2">
                  <Panel title={t("promoInspectorWhy")}>
                    <div className="flex h-3 overflow-hidden rounded-full bg-surface-2">
                      <span
                        className="bg-warning"
                        style={{ width: `${alertShare * 100}%` }}
                      />
                      <span className="bg-primary" style={{ width: `${prShare * 100}%` }} />
                    </div>
                    <dl className="mt-4 grid gap-2 text-sm">
                      <Row label={t("promoScoreAlerts")} value={`${repo.alerts} · +${repo.alerts * SCORE_WEIGHTS.alert}`} />
                      <Row label={t("promoScorePrs")} value={`${repo.prs} · +${repo.prs * SCORE_WEIGHTS.pr}`} />
                      <Row label={t("promoInspectorWorkflowPassing")} value={t("promoInspectorPassing")} muted />
                    </dl>
                  </Panel>

                  <Panel title={t("promoInspectorSecurity")}>
                    <div className="flex gap-3">
                      <span className="grid size-8 shrink-0 place-items-center rounded-md bg-critical/12 text-critical">
                        <ShieldAlert className="size-4" aria-hidden="true" />
                      </span>
                      <div className="min-w-0 text-sm">
                        <p className="font-semibold text-foreground">{t("promoInspectorSecurityItem")}</p>
                        <p className="text-foreground-subtle">{t("promoInspectorSecurityMeta")}</p>
                      </div>
                    </div>
                    <p className="mt-4 rounded-md border border-dashed border-border px-3 py-2 font-mono text-[0.7rem] text-foreground-subtle">
                      {t("promoInspectorSecurityPath")}
                    </p>
                  </Panel>

                  {level >= 2 && (
                    <Panel title={t("promoInspectorRuns")}>
                      <ul className="grid grid-cols-1 gap-2 text-sm">
                        {SAMPLE_RUNS.map((run) => (
                          <li key={`${run.workflow}-${run.ref}`} className="flex items-center gap-2.5">
                            <span
                              className={cn(
                                "grid size-5 shrink-0 place-items-center rounded-full",
                                run.ok ? "bg-success/15 text-success" : "bg-critical/15 text-critical",
                              )}
                            >
                              {run.ok ? (
                                <Check className="size-3" strokeWidth={3} aria-hidden="true" />
                              ) : (
                                <X className="size-3" strokeWidth={3} aria-hidden="true" />
                              )}
                            </span>
                            <span className="font-mono text-xs text-foreground">{run.workflow}</span>
                            <span className="min-w-0 truncate text-xs text-foreground-subtle">{run.ref}</span>
                            <span className="ml-auto whitespace-nowrap font-mono text-[0.65rem] text-foreground-subtle">
                              {run.duration} · {run.when}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </Panel>
                  )}

                  {level >= 2 && (
                    <Panel title={t("promoInspectorCommits")}>
                      <ul className="grid grid-cols-1 gap-2 text-sm">
                        {SAMPLE_COMMITS.map(([hash, message, when]) => (
                          <li key={hash} className="flex items-center gap-2.5">
                            <GitCommitHorizontal className="size-4 shrink-0 text-foreground-subtle" aria-hidden="true" />
                            <span className="font-mono text-xs text-primary">{hash}</span>
                            <span className="min-w-0 truncate text-foreground-muted">{message}</span>
                            <span className="ml-auto whitespace-nowrap font-mono text-[0.65rem] text-foreground-subtle">{when}</span>
                          </li>
                        ))}
                      </ul>
                    </Panel>
                  )}

                  {level >= 3 && (
                    <Panel title={`${t("promoInspectorReviews")} · ${repo.prs}`}>
                      <ul className="grid grid-cols-1 gap-2 text-sm">
                        {SAMPLE_REVIEWS.map(([number, title, state, age]) => (
                          <li key={number} className="flex items-center gap-2.5">
                            <GitPullRequest className="size-4 shrink-0 text-success" aria-hidden="true" />
                            <span className="font-mono text-xs text-foreground-subtle">{number}</span>
                            <span className="min-w-0 truncate text-foreground-muted">{title}</span>
                            <span className="ml-auto whitespace-nowrap text-[0.7rem] text-foreground-subtle">
                              {state} · {age}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </Panel>
                  )}

                  {level >= 3 && (
                    <Panel title={t("promoInspectorActivity")}>
                      <div className="flex h-24 items-end gap-1.5">
                        {SAMPLE_TRAIL.map((value, index) => (
                          <span
                            key={index}
                            className="flex-1 rounded-sm bg-primary/70"
                            style={{ height: `${(value / SAMPLE_TRAIL_PEAK) * 100}%` }}
                          />
                        ))}
                      </div>
                      <p className="mt-3 flex justify-between font-mono text-[0.65rem] text-foreground-subtle">
                        <span>{t("promoInspectorActivityStart")}</span>
                        <span>{SAMPLE_TRAIL_TOTAL}</span>
                        <span>{t("promoInspectorActivityEnd")}</span>
                      </p>
                    </Panel>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border/70 bg-surface-1 p-4">
      <p className="mb-4 font-mono text-micro uppercase tracking-[0.16em] text-foreground-subtle">{title}</p>
      {children}
    </div>
  );
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="min-w-0 truncate text-foreground-muted">{label}</dt>
      <dd className={cn("shrink-0 font-mono tabular-nums", muted ? "text-foreground-subtle" : "font-semibold text-foreground")}>
        {value}
      </dd>
    </div>
  );
}
