import { Minus, Plus } from "lucide-react";
import { useState } from "react";
import { useApp } from "@/contexts/useApp";
import { cn } from "@/lib/utils";
import {
  ALERT_RANGE_MAX,
  PR_RANGE_MAX,
  PROMO_FLEET,
  SCORE_BAR_MAX,
  SCORE_THRESHOLDS,
  SCORE_WEIGHTS,
  STATUS_DOT,
  STATUS_TEXT,
  scoreOf,
  statusLabelKey,
  statusOf,
  type ScoreInput,
} from "./promoFleet";

export function PromoScoring() {
  const { t } = useApp();
  const [input, setInput] = useState<ScoreInput>({ criticalAlert: false, failedMain: true, alerts: 0, prs: 2 });
  const patch = (next: Partial<ScoreInput>) => setInput((state) => ({ ...state, ...next }));

  const score = scoreOf(input);
  const status = statusOf(score);

  const ranked = [
    ...PROMO_FLEET.map((repo) => ({ key: repo.name, name: repo.name, score: repo.score, mark: repo.mark, you: false })),
    { key: "your-repo", name: t("promoScoreYourRepo"), score, mark: "YR", you: true },
  ].sort((a, b) => b.score - a.score || (a.you ? -1 : 1));

  const rank = ranked.findIndex((repo) => repo.you);
  const start = Math.max(0, Math.min(rank - 2, ranked.length - 5));
  const visible = ranked.slice(start, start + 5);

  return (
    <section id="scoring" className="mx-auto max-w-6xl scroll-mt-24 px-6 py-16 sm:py-20 md:px-8">
      <div className="max-w-3xl">
        <p className="font-mono text-micro font-semibold uppercase tracking-[0.18em] text-primary">{t("promoScoreKicker")}</p>
        <h2 className="mt-3 font-headline text-3xl font-semibold leading-tight text-foreground sm:text-4xl">
          {t("promoScoreTitle")}
        </h2>
        <p className="mt-4 text-base leading-7 text-foreground-muted">{t("promoScoreBody")}</p>
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-xl border border-border/70 bg-surface-1 p-5 sm:p-6">
          <div className="divide-y divide-border/60">
            <SignalRow label={t("promoScoreCriticalAlert")} hint={t("promoScoreCriticalAlertHint")} points={input.criticalAlert ? SCORE_WEIGHTS.criticalAlert : 0}>
              <Toggle
                on={input.criticalAlert}
                onChange={(value) => patch({ criticalAlert: value })}
                label={t("promoScoreCriticalAlert")}
              />
            </SignalRow>
            <SignalRow label={t("promoScoreFailedMain")} hint={t("promoScoreFailedMainHint")} points={input.failedMain ? SCORE_WEIGHTS.failedMain : 0}>
              <Toggle on={input.failedMain} onChange={(value) => patch({ failedMain: value })} label={t("promoScoreFailedMain")} />
            </SignalRow>
            <SignalRow label={t("promoScoreAlerts")} hint={t("promoScoreAlertsHint", { weight: SCORE_WEIGHTS.alert })} points={input.alerts * SCORE_WEIGHTS.alert}>
              <Stepper
                value={input.alerts}
                min={0}
                max={ALERT_RANGE_MAX}
                onChange={(value) => patch({ alerts: value })}
                label={t("promoScoreAlerts")}
                lessLabel={t("promoScoreLess")}
                moreLabel={t("promoScoreMore")}
              />
            </SignalRow>
            <SignalRow label={t("promoScorePrs")} hint={t("promoScorePrsHint", { weight: SCORE_WEIGHTS.pr })} points={input.prs * SCORE_WEIGHTS.pr}>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={0}
                  max={PR_RANGE_MAX}
                  value={input.prs}
                  onChange={(event) => patch({ prs: Number(event.target.value) })}
                  aria-label={t("promoScorePrs")}
                  className="w-24 accent-primary sm:w-28"
                />
                <span className="w-5 text-right font-mono text-sm tabular-nums text-foreground">{input.prs}</span>
              </div>
            </SignalRow>
          </div>

          <div className="mt-6 border-t border-border/60 pt-5">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="font-mono text-micro uppercase tracking-[0.16em] text-foreground-subtle">{t("promoScoreTotal")}</p>
                <p aria-live="polite" className={cn("mt-1 font-headline text-5xl font-semibold leading-none tabular-nums", STATUS_TEXT[status])}>
                  {score}
                </p>
              </div>
              <span className={cn("rounded-full px-3 py-1 text-micro font-semibold", STATUS_TEXT[status], "bg-surface-2")}>
                {t(statusLabelKey(status))}
              </span>
            </div>
            <div className="relative mt-5 h-2 rounded-full bg-surface-2">
              <div
                className={cn("h-full rounded-full transition-[width,background-color] duration-300", STATUS_DOT[status])}
                style={{ width: `${Math.min(100, (score / SCORE_BAR_MAX) * 100)}%` }}
              />
              {[SCORE_THRESHOLDS.warning, SCORE_THRESHOLDS.critical].map((threshold) => (
                <span
                  key={threshold}
                  className="absolute -top-1 h-4 w-px bg-foreground/50"
                  style={{ left: `${(threshold / SCORE_BAR_MAX) * 100}%` }}
                >
                  <span className="absolute left-1 top-4 font-mono text-[0.6rem] text-foreground-subtle">{threshold}</span>
                </span>
              ))}
            </div>
            <p className="mt-8 font-mono text-micro uppercase tracking-[0.16em] text-foreground-subtle">
              {t("promoScoreRank", { rank: rank + 1, total: ranked.length })}
            </p>
          </div>
        </div>

        <div className="flex flex-col rounded-xl border border-border/70 bg-surface-1 p-5 sm:p-6">
          <ol className="overflow-hidden rounded-lg border border-border/70">
            {visible.map((repo) => {
              const status = statusOf(repo.score);
              return (
                <li
                  key={repo.key}
                  className={cn(
                    "flex items-center gap-3 border-b border-border/60 px-3 py-2.5 text-sm last:border-b-0",
                    repo.you && "bg-surface-3",
                  )}
                >
                  <span className="w-6 font-mono text-[0.65rem] text-foreground-subtle">
                    {String(ranked.indexOf(repo) + 1).padStart(2, "0")}
                  </span>
                  <span className={cn("size-2 shrink-0 rounded-full", STATUS_DOT[status])} aria-hidden="true" />
                  <span className="grid size-6 shrink-0 place-items-center rounded-sm border border-border/70 font-mono text-[0.6rem] text-foreground-muted">
                    {repo.mark}
                  </span>
                  <span className={cn("min-w-0 flex-1 truncate text-foreground", repo.you && "font-semibold")}>{repo.name}</span>
                  <span className={cn("font-mono font-semibold tabular-nums", STATUS_TEXT[status])}>{repo.score}</span>
                </li>
              );
            })}
          </ol>
          <p className="mt-auto pt-4 text-[0.7rem] leading-snug text-foreground-subtle">{t("promoScoreFootnote")}</p>
        </div>
      </div>
    </section>
  );
}

function SignalRow({
  label,
  hint,
  points,
  children,
}: {
  label: string;
  hint: string;
  points: number;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-foreground-subtle">{hint}</p>
      </div>
      {children}
      <span
        className={cn(
          "w-12 text-right font-mono text-sm tabular-nums",
          points ? "text-foreground" : "text-foreground-subtle",
        )}
      >
        +{points}
      </span>
    </div>
  );
}

function Toggle({ on, onChange, label }: { on: boolean; onChange: (value: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className="relative h-6 w-10 shrink-0 rounded-full bg-surface-3 transition-colors aria-checked:bg-primary"
    >
      <span
        className={cn(
          "absolute left-0.5 top-0.5 size-5 rounded-full bg-card shadow transition-transform",
          on && "translate-x-4",
        )}
      />
    </button>
  );
}

function Stepper({
  value,
  min,
  max,
  onChange,
  label,
  lessLabel,
  moreLabel,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  label: string;
  lessLabel: string;
  moreLabel: string;
}) {
  return (
    <div className="flex items-center rounded-md border border-border" role="group" aria-label={label}>
      <button
        type="button"
        aria-label={lessLabel}
        onClick={() => onChange(Math.max(min, value - 1))}
        className="grid size-7 place-items-center text-foreground-subtle hover:text-foreground"
      >
        <Minus className="size-3.5" aria-hidden="true" />
      </button>
      <span className="w-6 text-center font-mono text-sm tabular-nums text-foreground">{value}</span>
      <button
        type="button"
        aria-label={moreLabel}
        onClick={() => onChange(Math.min(max, value + 1))}
        className="grid size-7 place-items-center text-foreground-subtle hover:text-foreground"
      >
        <Plus className="size-3.5" aria-hidden="true" />
      </button>
    </div>
  );
}
