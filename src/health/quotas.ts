import { summarizeQuotas } from "@/quotas";
import type { QuotaFamily, QuotaStatus } from "@/quotas";

/**
 * Points deducted from the repository health score per quota band.
 *
 * Only monthly billing families with a comparable limit take part: the API
 * rate-limit window and cache proxies are short-lived readings, not monthly
 * consumption, so they never move the score. The bands reuse the account quota
 * thresholds (80/90) from `@/quotas` instead of restating them here.
 */
export const QUOTA_PENALTY_POINTS: Record<QuotaStatus, number> = {
  unknown: 0,
  normal: 0,
  warning: 5,
  critical: 10,
  exceeded: 10,
};

/** Points to deduct for the worst monthly quota status; 0 when absent or safe. */
export function quotaPenalty(quotas?: QuotaFamily[]): number {
  if (!quotas || quotas.length === 0) return 0;
  return QUOTA_PENALTY_POINTS[summarizeQuotas(quotas).status];
}

/**
 * Applies the quota penalty to a raw health percentage.
 *
 * The percentage is rounded once, at the end, to the nearest integer with
 * halves rounded up — after the penalty, so 72.4 stays 72 and 72.5 becomes 73
 * before any band is applied.
 */
export function applyQuotaPenalty(baseScore: number, quotas?: QuotaFamily[]): number {
  const adjusted = Math.max(0, Math.min(100, baseScore - quotaPenalty(quotas)));
  return Math.floor(adjusted + 0.5);
}
