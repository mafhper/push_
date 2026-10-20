import type { QuotaFamily } from "@/quotas";
import type { RepoHealth, SnapshotOverview } from "@/types";
import { applyQuotaPenalty, quotaPenalty } from "./quotas";
import { healthStatusForScore } from "./scoring";

/**
 * The quota penalty applied to an already evaluated repository health row.
 *
 * The overview card is built by the service from the same report the detail
 * page evaluates, but the service has no access to the account quotas — they
 * only exist in the authenticated runtime. Re-applying the penalty here, with
 * the same engine functions, is what keeps the card and the detail from
 * disagreeing: the band and the rounding belong to `@/health`, not to the
 * surface.
 *
 * A zero penalty returns the input untouched, so an unauthenticated or safe
 * reading cannot change a single byte of the overview.
 */
export function penalizeHealth(health: RepoHealth, quotas?: QuotaFamily[]): RepoHealth {
  if (quotaPenalty(quotas) === 0) return health;

  const score = applyQuotaPenalty(health.score, quotas);
  // A score that did not move means the base was already zero: re-banding it
  // would drop the engine's `verifiedChecks === 0 → warning` override, which
  // the service already encoded in `status`.
  if (score === health.score) return health;

  return { ...health, score, status: healthStatusForScore(score) };
}

/**
 * Applies the account penalty to every row of an overview snapshot.
 *
 * Same rule as `penalizeHealth`: no penalty, same object back.
 */
export function applyQuotasToOverview(
  overview: SnapshotOverview,
  quotas?: QuotaFamily[],
): SnapshotOverview {
  if (quotaPenalty(quotas) === 0) return overview;

  return {
    ...overview,
    repos: overview.repos.map((entry) => ({ ...entry, health: penalizeHealth(entry.health, quotas) })),
  };
}
