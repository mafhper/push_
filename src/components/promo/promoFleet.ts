import type { DictKey } from "@/i18n";

/**
 * Sample fleet for the promo site.
 *
 * This is illustrative content: the scores below are produced by the same
 * weights the app uses for repository attention, so the queue can be recomputed
 * without drifting from the copy. Nothing here is fetched at runtime.
 */

export const PROMO_SAMPLE_HANDLE = "acme";

export const SCORE_WEIGHTS = {
  criticalAlert: 100,
  failedMain: 60,
  alert: 40,
  pr: 15,
} as const;

export const SCORE_THRESHOLDS = {
  critical: 100,
  warning: 40,
} as const;

/** A repository at this score fills the pressure field; used by the hero amplitude. */
export const FIELD_SCORE_SCALE = 145;

/** Ceilings of the demo controls; the scoring bar derives its full width from them. */
export const ALERT_RANGE_MAX = 5;
export const PR_RANGE_MAX = 12;

export type PromoStatus = "critical" | "warning" | "healthy";

interface StatusMeta {
  /** Lowest score that still counts as this status. */
  min: number;
  labelKey: DictKey;
  dot: string;
  text: string;
}

/**
 * One table for the whole status vocabulary: threshold, dictionary key and the
 * two class names move together, so a new status cannot be half-wired.
 */
const STATUS_META: Record<PromoStatus, StatusMeta> = {
  critical: { min: SCORE_THRESHOLDS.critical, labelKey: "promoStatusCritical", dot: "bg-critical", text: "text-critical" },
  warning: { min: SCORE_THRESHOLDS.warning, labelKey: "promoStatusWarning", dot: "bg-warning", text: "text-warning" },
  healthy: { min: Number.NEGATIVE_INFINITY, labelKey: "promoStatusHealthy", dot: "bg-success", text: "text-success" },
};

/** Highest urgency first: the first band whose floor the score clears wins. */
const STATUS_ORDER: PromoStatus[] = ["critical", "warning", "healthy"];

export function statusOf(score: number): PromoStatus {
  return STATUS_ORDER.find((status) => score >= STATUS_META[status].min) ?? "healthy";
}

export interface ScoreInput {
  criticalAlert: boolean;
  failedMain: boolean;
  alerts: number;
  prs: number;
}

export function scoreOf(input: ScoreInput): number {
  return (
    (input.criticalAlert ? SCORE_WEIGHTS.criticalAlert : 0) +
    (input.failedMain ? SCORE_WEIGHTS.failedMain : 0) +
    Math.max(0, input.alerts) * SCORE_WEIGHTS.alert +
    Math.max(0, input.prs) * SCORE_WEIGHTS.pr
  );
}

/**
 * Full width of the scoring bar: the highest score the demo controls can reach.
 *
 * Derived from the weights rather than hand-picked: the previous fixed 250
 * clamped inputs that were still climbing (the controls reach 540), so the bar
 * saturated while the number kept rising and the threshold marks sat at 16%/40%
 * of a scale nothing else used.
 */
export const SCORE_BAR_MAX = scoreOf({
  criticalAlert: true,
  failedMain: true,
  alerts: ALERT_RANGE_MAX,
  prs: PR_RANGE_MAX,
});

export interface PromoRepo {
  name: string;
  score: number;
  alerts: number;
  prs: number;
  /** Position on the pressure chart: x from the left, y from the top, both 0..1. */
  at: [number, number];
  mark: string;
}

/**
 * Seven repositories, deliberately short of the app's full fleet: the promo
 * site shows the shape of the queue, not a live inventory.
 */
export const PROMO_FLEET: PromoRepo[] = [
  { name: "checkout-api", score: 145, alerts: 1, prs: 7, at: [0.14, 0.86], mark: "CA" },
  { name: "billing-worker", score: 115, alerts: 1, prs: 5, at: [0.4, 0.9], mark: "BW" },
  { name: "edge-cache", score: 75, alerts: 0, prs: 5, at: [0.66, 0.9], mark: "EC" },
  { name: "docs-portal", score: 45, alerts: 0, prs: 3, at: [0.42, 0.63], mark: "DP" },
  { name: "design-tokens", score: 30, alerts: 0, prs: 2, at: [0.22, 0.16], mark: "DT" },
  { name: "mobile-shell", score: 15, alerts: 0, prs: 1, at: [0.05, 0.09], mark: "MS" },
  { name: "status-page", score: 0, alerts: 0, prs: 0, at: [0.9, 0.05], mark: "SP" },
];

const EMPTY_REPO: PromoRepo = { name: "", score: 0, alerts: 0, prs: 0, at: [0.5, 0.5], mark: "??" };

/**
 * Entry guard for the sample fleet.
 *
 * The project runs with `strict: false` and `noUncheckedIndexedAccess` off, so
 * an out-of-range index is a runtime shape the compiler will not flag. Callers
 * that index the fleet read through here instead of trusting the tuple.
 */
export function fleetRepoAt(index: number): PromoRepo {
  return PROMO_FLEET[index] ?? EMPTY_REPO;
}

export const STATUS_DOT: Record<PromoStatus, string> = {
  critical: STATUS_META.critical.dot,
  warning: STATUS_META.warning.dot,
  healthy: STATUS_META.healthy.dot,
};

export const STATUS_TEXT: Record<PromoStatus, string> = {
  critical: STATUS_META.critical.text,
  warning: STATUS_META.warning.text,
  healthy: STATUS_META.healthy.text,
};

export function statusLabelKey(status: PromoStatus): DictKey {
  return (STATUS_META[status] ?? STATUS_META.healthy).labelKey;
}

type Translate = (key: DictKey, values?: Record<string, string | number>) => string;

/** "1 alert · 7 PRs", "No open signals". Plural forms come from the dictionary. */
export function describeSignals(repo: Pick<PromoRepo, "alerts" | "prs">, t: Translate): string {
  const parts: string[] = [];
  if (repo.alerts > 0) {
    parts.push(t(repo.alerts === 1 ? "promoQueueAlertsOne" : "promoQueueAlertsOther", { count: repo.alerts }));
  }
  if (repo.prs > 0) {
    parts.push(t(repo.prs === 1 ? "promoQueuePrsOne" : "promoQueuePrsOther", { count: repo.prs }));
  }
  return parts.length > 0 ? parts.join(" · ") : t("promoQueueNoSignals");
}

export function fieldAmplitude(score: number, hovered = false): number {
  return (score / FIELD_SCORE_SCALE) * 0.95 + (hovered ? 0.32 : 0);
}
