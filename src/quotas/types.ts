/**
 * Account quota surface. The numbers come from GitHub billing endpoints; the
 * percentages, thresholds and summaries come from `engine.ts` — never from a
 * component, so one rule decides every card and every alert.
 */

/** Canonical units. Storage is normalised to MB; billing reports GB and GB-hours. */
export type QuotaUnit = "minutes" | "mb" | "gbHours";

/**
 * `normal` and the three alert levels; `unknown` means "no comparable limit"
 * (the API reported usage without a limit), which is not an alert.
 */
export type QuotaStatus = "normal" | "warning" | "critical" | "exceeded" | "unknown";

/** Families the account surface shows. Rate limit stays in the session card. */
export type QuotaFamilyId = "actionsMinutes" | "actionsStorage" | "sharedStorage" | "packages";

/** Which endpoint family produced the number. Shown only as a note. */
export type QuotaOrigin = "billing" | "legacy";

export interface QuotaFamily {
  id: QuotaFamilyId;
  /** Consumption in `unit`. */
  used: number;
  /** Monthly limit in `unit`; `null` when GitHub exposes usage without a limit. */
  limit: number | null;
  unit: QuotaUnit;
  /** Billing-cycle reset, when the endpoint reports how many days are left. */
  resetAt: string | null;
  origin: QuotaOrigin;
  /** Monthly families take part in the 80/90/100 alerts; proxies never do. */
  monthly: boolean;
}

/**
 * - `enhanced`: the usage endpoint of the enhanced billing platform answered.
 * - `legacy`: the legacy billing endpoints answered at least partially.
 * - `forbidden`: the token is not authorized for billing (403).
 * - `unavailable`: the endpoint returned no data for this account (404/501).
 * - `error`: the request failed without an HTTP answer (network, timeout).
 */
export type QuotaBillingState = "enhanced" | "legacy" | "forbidden" | "unavailable" | "error";

/**
 * Per-repository usage. Minutes come from billing items that name a repository;
 * cache and artifacts are point-in-time inventories from the repository itself
 * (the free-plan fallback), never a billing quantity.
 */
export interface RepoQuotaUsage {
  fullName: string;
  cacheMb: number | null;
  cacheCount: number | null;
  artifactsMb: number | null;
  actionsMinutes: number | null;
}

export interface AccountQuotaSnapshot {
  fetchedAt: string;
  login: string;
  billing: QuotaBillingState;
  /** Exact endpoint and status of the failed billing request, when it failed. */
  billingMessage?: string;
  families: QuotaFamily[];
  repos: RepoQuotaUsage[];
  /** How many monitored repositories were probed, and how many were requested. */
  repoProbe: { probed: number; requested: number };
  /**
   * Owners of the requested repositories that are not `login` (PU14): the
   * selection lives per installation, so a token swap can leave another
   * account's repositories selected. Empty when the login is unknown or when
   * every requested repository belongs to it.
   */
  foreignOwners: string[];
  /** How many requested repositories have one of those owners. */
  foreignRepoCount: number;
}
