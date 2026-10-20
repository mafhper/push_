import type { AttentionSettings, OverviewRepoSnapshot } from '@/types';

export interface AttentionSignal {
  kind: 'security' | 'workflow' | 'stale' | 'pr' | 'archived';
  severity: 'critical' | 'high' | 'warning' | 'info';
  label: string;
}

export interface ScoredRepo extends OverviewRepoSnapshot {
  attentionScore: number;
  signals: AttentionSignal[];
}

/** Highest value the alert-cap stepper offers. */
export const ATTENTION_ALERT_CAP_MAX = 5;

/**
 * Emphasis the queue uses until the reader changes it. It keeps the weights
 * the queue has always used, but it is **not** the pure report order, and the
 * two differ by design:
 *
 * - the cap charges at most five open alerts per repository, while the report
 *   charges every one of them (seven alerts are 200 here and 280 there);
 * - the failed-runs emphasis charges recent failures in any repository, not
 *   only inside the critical band, and adds the success-rate pressure the
 *   report does not have (a failing repository is 60+ there and 0 here).
 *
 * `preferences === null` stays the pure report; the defaults are the emphasis
 * a reader gets before opening the controls.
 */
export const DEFAULT_ATTENTION_SETTINGS: AttentionSettings = {
  criticalAlerts: true,
  failedRuns: true,
  alertCap: ATTENTION_ALERT_CAP_MAX,
};

/**
 * The band cuts of the attention score. They belong to the queue, not to the
 * health engine: health bands are 70/40, attention bands are 100/40.
 */
export const ATTENTION_BANDS = { critical: 100, warning: 40 } as const;

/**
 * Attention units. Kept here instead of borrowed from the promo sample: the
 * published site must stay a leaf of the dependency graph, and the queue must
 * not start importing marketing content for its numbers.
 */
const WEIGHTS = {
  criticalAlert: 100,
  openAlert: 40,
  failedRuns: 60,
  successRateDeficit: 40,
  openPullRequest: 15,
  staleDay: 2,
  archived: -1000,
} as const;

/** The `ci_recent_success_rate` check passes at this percentage. */
const SUCCESS_RATE_PASS = 80;

/** A repository is never "stale" for more than a year in the order. */
const STALE_DAY_CAP = 365;

/**
 * Entry guard for a persisted cap. Settings live in `localStorage`, which the
 * project runs with `strict: false`: an old or hand-edited value can be
 * anything, so the number is clamped instead of trusted.
 */
export function clampAlertCap(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return ATTENTION_ALERT_CAP_MAX;
  return Math.min(ATTENTION_ALERT_CAP_MAX, Math.max(0, Math.round(value)));
}

/**
 * Completes an absent or partial `attention` block. Absence means "default
 * emphasis", never "off": a settings object written before this preference
 * existed must open with the same order the queue had.
 */
export function normalizeAttentionSettings(value: unknown): AttentionSettings {
  const raw = (typeof value === 'object' && value !== null ? value : {}) as Partial<AttentionSettings>;
  return {
    criticalAlerts: typeof raw.criticalAlerts === 'boolean' ? raw.criticalAlerts : true,
    failedRuns: typeof raw.failedRuns === 'boolean' ? raw.failedRuns : true,
    alertCap: clampAlertCap(raw.alertCap),
  };
}

/**
 * Pressure from the recent success rate, under the failed-runs emphasis.
 *
 * The health check `ci_recent_success_rate` passes at 80%. A rate below that
 * line keeps adding queue pressure even when the seven-day window shows no
 * failure, because a mostly failing pipeline is still a failing pipeline.
 * `null` means "no runs to rate" and adds nothing.
 */
function successRatePressure(rate: number | null | undefined): number {
  if (typeof rate !== 'number' || !Number.isFinite(rate)) return 0;
  const below = Math.max(0, Math.min(SUCCESS_RATE_PASS, SUCCESS_RATE_PASS - rate));
  return Math.round((below / SUCCESS_RATE_PASS) * WEIGHTS.successRateDeficit);
}

/**
 * One arithmetic for the whole app. `preferences === null` is the pure report
 * score the inspector and the snapshot show; a normalized preference object is
 * the queue order the settings page previews. Both live here so the queue
 * cannot drift from its own preview.
 */
function attentionScore(repo: OverviewRepoSnapshot, preferences: AttentionSettings | null): number {
  const { health, repo: meta, stats } = repo;
  const criticalCount = Math.max(0, health.dependabotCriticalCount || 0);
  const openCount = Math.max(0, health.dependabotOpenCount || 0);
  let score = 0;

  if (preferences) {
    if (preferences.criticalAlerts) {
      score += criticalCount * WEIGHTS.criticalAlert;
      // Under this emphasis criticals are charged apart and the cap does not
      // cut them: the cap is a ceiling for ordinary open alerts, not for the
      // strongest signal.
      const otherAlerts = Math.max(0, openCount - criticalCount);
      score += Math.min(otherAlerts, preferences.alertCap) * WEIGHTS.openAlert;
    } else {
      // Without the critical emphasis a critical alert is still an open alert:
      // it counts inside the cap instead of vanishing from the order. The count
      // never drops below the criticals, so a snapshot whose open count lags
      // behind its critical count cannot hide the stronger signal.
      //
      // A cap of zero therefore silences this pool entirely, criticals
      // included. That is the honest reading of two explicit requests ("no
      // critical emphasis" and "count no open alert"): a hidden floor of one
      // alert would make the stepper's "Up to 0" a lie. The row still reports
      // the criticals in its signals — the score is emphasis, the signals are
      // the record of what is open.
      score += Math.min(Math.max(openCount, criticalCount), preferences.alertCap) * WEIGHTS.openAlert;
    }

    if (preferences.failedRuns) {
      if ((health.failedRuns7d || 0) > 0) score += WEIGHTS.failedRuns;
      score += successRatePressure(health.workflowSuccessRate);
    }
  } else {
    if (criticalCount > 0) score += WEIGHTS.criticalAlert * criticalCount;
    const otherAlerts = Math.max(0, openCount - criticalCount);
    if (otherAlerts > 0) score += WEIGHTS.openAlert * otherAlerts;
    if (health.status === 'critical' && (health.failedRuns7d || 0) > 0) score += WEIGHTS.failedRuns;
  }

  const prCount = stats.openPullRequestCount || 0;
  if (prCount > 0) score += WEIGHTS.openPullRequest * prCount;

  const stalenessDays = Math.max(0, health.stalenessDays || 0);
  if (stalenessDays > 0) score += WEIGHTS.staleDay * Math.min(stalenessDays, STALE_DAY_CAP);

  if (meta.archived) score += WEIGHTS.archived;

  return score;
}

/**
 * What the repository *is*, independent of the emphasis. Signals describe the
 * row, so they keep reporting a critical alert even when the emphasis is off.
 */
function attentionSignals(repo: OverviewRepoSnapshot): AttentionSignal[] {
  const { health, repo: meta, stats } = repo;
  const signals: AttentionSignal[] = [];
  // Same guards as the score, and for the same reason: a snapshot written by an
  // older sync can leave a counter absent, and the raw value would either drop
  // a signal the score already charged (undefined never compares greater than
  // zero) or print `NaN` in the label.
  const criticalCount = Math.max(0, health.dependabotCriticalCount || 0);
  const openCount = Math.max(0, health.dependabotOpenCount || 0);
  const failedRuns = health.failedRuns7d || 0;
  const stalenessDays = Math.max(0, health.stalenessDays || 0);

  if (criticalCount > 0) {
    signals.push({
      kind: 'security',
      severity: 'critical',
      label: `${criticalCount} critical CVE${criticalCount > 1 ? 's' : ''}`,
    });
  }

  const otherAlerts = Math.max(0, openCount - criticalCount);
  if (otherAlerts > 0) {
    signals.push({
      kind: 'security',
      severity: 'warning',
      label: `${otherAlerts} alert${otherAlerts > 1 ? 's' : ''}`,
    });
  }

  if (health.status === 'critical' && failedRuns > 0) {
    signals.push({
      kind: 'workflow',
      severity: 'critical',
      label: 'CI failing',
    });
  }

  // The success-rate pressure is charged by the score under the failed-runs
  // emphasis and used to have no signal at all: a row could climb with nothing
  // on it explaining why. Signals describe the repository, so the rate is
  // reported whenever the charge is real — like the critical signal, it
  // survives the emphasis being off. The guard reuses the scoring function, so
  // a rate close enough to the pass line to round to zero pressure stays silent
  // instead of labelling a row the score did not move.
  const rate = health.workflowSuccessRate;
  if (typeof rate === 'number' && successRatePressure(rate) > 0) {
    signals.push({
      kind: 'workflow',
      severity: 'info',
      label: `CI ${Math.round(rate)}%`,
    });
  }

  const prCount = stats.openPullRequestCount || 0;
  if (prCount > 0) {
    signals.push({
      kind: 'pr',
      severity: 'info',
      label: `${prCount} PR${prCount > 1 ? 's' : ''}`,
    });
  }

  if (stalenessDays > 30) {
    signals.push({
      kind: 'stale',
      severity: stalenessDays > 90 ? 'warning' : 'info',
      label: `stale ${stalenessDays}d`,
    });
  }

  if (meta.archived) {
    signals.push({
      kind: 'archived',
      severity: 'info',
      label: 'archived',
    });
  }

  return signals;
}

/**
 * Calculates a deterministic attention score for a repository.
 * The weights follow the dev-3 operating-console model. This is the pure
 * report: no user preference participates.
 */
export function calculateAttention(repo: OverviewRepoSnapshot): { score: number; signals: AttentionSignal[] } {
  return { score: attentionScore(repo, null), signals: attentionSignals(repo) };
}

/**
 * The single ordering point of the queue.
 *
 * Without `attention`, the order is the pure report order. With it, the same
 * weights are applied under the reader's emphasis — there is no second overlay
 * computing a parallel list.
 */
export function sortReposByAttention(
  repos: OverviewRepoSnapshot[],
  attention?: AttentionSettings | null,
): ScoredRepo[] {
  const preferences = attention ? normalizeAttentionSettings(attention) : null;
  return repos
    .map(repo => ({
      ...repo,
      attentionScore: attentionScore(repo, preferences),
      signals: attentionSignals(repo),
    }))
    .sort((a, b) => b.attentionScore - a.attentionScore);
}

export interface AttentionPreview {
  /** Repositories at or above the critical attention band. */
  critical: number;
  /** Repositories between the warning and the critical bands. */
  warning: number;
}

/**
 * Counts the repositories in each attention band under the given emphasis.
 * The settings page renders this text instead of an invented score: the reader
 * sees what the controls do to the fleet in front of them.
 */
export function previewAttention(
  repos: OverviewRepoSnapshot[],
  attention?: AttentionSettings | null,
): AttentionPreview {
  const preferences = attention ? normalizeAttentionSettings(attention) : null;
  let critical = 0;
  let warning = 0;

  for (const repo of repos) {
    const score = attentionScore(repo, preferences);
    if (score >= ATTENTION_BANDS.critical) critical += 1;
    else if (score >= ATTENTION_BANDS.warning) warning += 1;
  }

  return { critical, warning };
}
