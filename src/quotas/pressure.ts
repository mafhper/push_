import { QUOTA_THRESHOLDS, quotaPercent, quotaStatus, summarizeQuotas } from "./engine";
import type { QuotaFamily, QuotaStatus } from "./types";

/**
 * One reading of "how close to a limit are we", whatever produced it.
 *
 * The pill in the dashboard frame and the alert line under Fleet Overview
 * consume this shape instead of a family list, so neither surface decides a
 * band on its own. `account` comes from the monthly billing families (the same
 * summary the health penalty uses); `rateLimit` is the API window, which is
 * short-lived and never takes part in the score.
 */
export interface QuotaPressure {
  source: "account" | "rateLimit";
  status: QuotaStatus;
  /** Highest consumed percentage among the comparable readings, 0-∞. */
  percent: number;
  /** Lower bound of the band in force, or `null` when there is no alert band. */
  threshold: number | null;
  /** Monthly families at warning or worse; always empty for a rate reading. */
  alerting: QuotaFamily[];
}

/** The band's own lower bound, so a surface never has to map 80/90 itself. */
function bandThreshold(status: QuotaStatus): number | null {
  if (status === "warning") return QUOTA_THRESHOLDS.warning;
  if (status === "critical" || status === "exceeded") return QUOTA_THRESHOLDS.critical;
  return null;
}

/**
 * Account pressure, or `null` when nothing comparable was read.
 *
 * "No monthly family with a limit" is not `normal`: it means the surface knows
 * nothing, and an unknown reading must not be painted as a healthy pill.
 */
export function accountPressure(families: readonly QuotaFamily[] | undefined | null): QuotaPressure | null {
  if (!families || families.length === 0) return null;

  const summary = summarizeQuotas(families);
  if (summary.percent === null) return null;

  return {
    source: "account",
    status: summary.status,
    percent: summary.percent,
    threshold: bandThreshold(summary.status),
    alerting: summary.alerting,
  };
}

/**
 * API rate-limit pressure: the consumed share of the window.
 *
 * `remaining` is what the endpoint reports, so the percentage is inverted here
 * once — the surfaces only ever read "consumed". The band still comes from
 * `quotaStatus`, which is the single threshold table for both readings.
 */
export function rateLimitPressure(
  rateLimit: { remaining: number; limit: number } | undefined | null,
): QuotaPressure | null {
  if (!rateLimit) return null;

  const percent = quotaPercent(Math.max(0, rateLimit.limit - rateLimit.remaining), rateLimit.limit);
  if (percent === null) return null;

  return {
    source: "rateLimit",
    status: quotaStatus(percent),
    percent,
    threshold: bandThreshold(quotaStatus(percent)),
    alerting: [],
  };
}
