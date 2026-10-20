import { useMemo } from "react";
import { accountPressure } from "@/quotas";
import type { QuotaPressure } from "@/quotas";
import { applyQuotasToOverview } from "@/health";
import { useAccountQuotas, useDashboardSnapshot } from "./useGitHub";

/**
 * The dashboard snapshot with the account quota penalty already applied.
 *
 * The service evaluates each repository health without quotas because a
 * snapshot must not carry them; the authenticated runtime is the only place
 * where the families exist. Composing both queries here — instead of inside the
 * query function — keeps the card and the detail on the same engine result
 * without making the overview refetch every repository when a quota moves a
 * band: both read the same `account-quotas` cache entry the surface already
 * loads, and nothing new is polled.
 */
export function useQuotaOverview() {
  const snapshot = useDashboardSnapshot();
  const { data: quotaSnapshot } = useAccountQuotas();
  const families = quotaSnapshot?.families;

  const data = useMemo(
    () => (snapshot.data ? applyQuotasToOverview(snapshot.data, families) : snapshot.data),
    [snapshot.data, families],
  );
  const quotaPressure = useMemo<QuotaPressure | null>(() => accountPressure(families), [families]);

  return { ...snapshot, data, quotaPressure };
}
