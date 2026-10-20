import type { QuotaFamily, QuotaStatus, RepoQuotaUsage } from "./types";

/**
 * Fixed thresholds approved for v1 (2026-10-19). They are intentionally not
 * configurable: a threshold that lives in a settings screen is a threshold
 * nobody checks. A change here is a product decision, not a preference.
 */
export const QUOTA_THRESHOLDS = {
  warning: 80,
  critical: 90,
  exceeded: 100,
} as const;

/**
 * Reference limits of the GitHub Free plan, used only when the API does not
 * report the plan's own included amount. Sources: GitHub billing docs —
 * 2,000 Actions minutes/month, 500 MB of shared storage, 10 GB of cache per
 * repository. The UI labels these as reference values; a paid plan's own
 * numbers win whenever an endpoint reports them.
 */
export const FREE_PLAN_LIMITS = {
  actionsMinutes: 2000,
  storageMb: 500,
  repoCacheMb: 10 * 1024,
} as const;

/** Percentage of the limit consumed; `null` when there is no comparable limit. */
export function quotaPercent(used: number, limit: number | null | undefined): number | null {
  if (limit === null || limit === undefined || !Number.isFinite(limit) || limit <= 0) return null;
  if (!Number.isFinite(used)) return null;
  return (used / limit) * 100;
}

/** Classic threshold classification. Boundaries belong to the upper band. */
export function quotaStatus(percent: number | null | undefined): QuotaStatus {
  if (percent === null || percent === undefined || !Number.isFinite(percent)) return "unknown";
  if (percent >= QUOTA_THRESHOLDS.exceeded) return "exceeded";
  if (percent >= QUOTA_THRESHOLDS.critical) return "critical";
  if (percent >= QUOTA_THRESHOLDS.warning) return "warning";
  return "normal";
}

export function evaluateQuota(used: number, limit: number | null | undefined): {
  percent: number | null;
  status: QuotaStatus;
} {
  const percent = quotaPercent(used, limit);
  return { percent, status: quotaStatus(percent) };
}

const STATUS_RANK: Record<QuotaStatus, number> = {
  unknown: 0,
  normal: 1,
  warning: 2,
  critical: 3,
  exceeded: 4,
};

export interface QuotaSummary {
  /** Worst status among monthly families that have a comparable limit. */
  status: QuotaStatus;
  /** Highest percentage among those families. */
  percent: number | null;
  /** Monthly families at warning or worse, in the order they were received. */
  alerting: QuotaFamily[];
}

/**
 * One summary drives the settings-rail badge and the alerts-page banner, so
 * both surfaces can never disagree about whether a quota is close to its limit.
 */
export function summarizeQuotas(families: QuotaFamily[]): QuotaSummary {
  let status: QuotaStatus = "unknown";
  let percent: number | null = null;
  const alerting: QuotaFamily[] = [];

  for (const family of families) {
    if (!family.monthly) continue;
    const evaluated = evaluateQuota(family.used, family.limit);
    if (evaluated.status === "unknown") continue;
    if (evaluated.percent !== null && (percent === null || evaluated.percent > percent)) {
      percent = evaluated.percent;
    }
    if (evaluated.status !== "normal") alerting.push(family);
    if (STATUS_RANK[evaluated.status] > STATUS_RANK[status]) status = evaluated.status;
  }

  return { status, percent, alerting };
}

/** Badge/banner gate: only the three alert levels count. */
export function isQuotaAlert(status: QuotaStatus): boolean {
  return status === "warning" || status === "critical" || status === "exceeded";
}

/** Whole days until `dateIso`, never negative; `null` when the date is unknown. */
export function daysUntil(dateIso: string | null | undefined, now: Date = new Date()): number | null {
  if (!dateIso) return null;
  const target = Date.parse(dateIso);
  if (Number.isNaN(target)) return null;
  return Math.max(0, Math.ceil((target - now.getTime()) / 86_400_000));
}

/**
 * Repositories whose owner is not the token's account (PU14).
 *
 * The repository selection is stored per installation, not per account, so it
 * survives a token swap: after connecting another account's token the surfaces
 * would show the previous account's repositories under the new account's name.
 * This is the detection only — what to do with the mismatch is a surface
 * decision. Case-insensitive; a name without an owner segment does not name an
 * account and is ignored; `login` empty means "cannot compare", and an empty
 * result then is the honest answer.
 */
export function foreignRepos(login: string, repoFullNames: readonly string[]): string[] {
  const account = (login ?? "").trim().toLowerCase();
  if (!account) return [];

  // The caller may pass the selection and the displayed rows, which overlap.
  return [...new Set(repoFullNames.filter((fullName) => {
    if (!fullName.includes("/")) return false;
    const owner = (fullName.split("/")[0] ?? "").trim();
    if (!owner) return false;
    return owner.toLowerCase() !== account;
  }))];
}

/** Owners among `foreignRepos`, once each and sorted, for a compact warning. */
export function foreignRepoOwners(login: string, repoFullNames: readonly string[]): string[] {
  const owners = new Set<string>();
  for (const fullName of foreignRepos(login, repoFullNames)) {
    const owner = (fullName.split("/")[0] ?? "").trim();
    if (owner) owners.add(owner);
  }
  return [...owners].sort((left, right) => left.localeCompare(right));
}

/**
 * Whether the selection holds at least one repository from another account.
 * A valid login plus a selection with a foreign owner is the only way to be
 * mixed; "no login" is "cannot compare", never an accusation.
 */
export function isMixedAccount(login: string, repoFullNames: readonly string[]): boolean {
  return foreignRepos(login, repoFullNames).length > 0;
}

/** Order offered for the per-repository rows (PU15). */
export type QuotaRepoSort = "usage" | "name";

/**
 * Storage a repository currently holds: cache plus artifacts, in MB.
 *
 * This is a rank key, never a displayed number: the two quantities come from
 * different inventories and adding them would invite the reader to take the
 * sum as a billing quantity. `null` means neither inventory answered, which
 * is different from a repository that answered zero.
 */
export function repoStorageMb(repo: Pick<RepoQuotaUsage, "cacheMb" | "artifactsMb">): number | null {
  const known = [repo.cacheMb, repo.artifactsMb].filter(
    (value): value is number => typeof value === "number" && Number.isFinite(value),
  );
  if (known.length === 0) return null;
  return known.reduce((total, value) => total + value, 0);
}

/** Descending, with "no reading" after every real reading. */
function compareNumberDescNullsLast(left: number | null, right: number | null): number {
  if (left === null && right === null) return 0;
  if (left === null) return 1;
  if (right === null) return -1;
  return right - left;
}

/**
 * Per-repository order approved in PU15:
 * 1. storage (cache + artifacts) descending — the biggest consumer first;
 * 2. Actions minutes descending, for repositories tied on storage;
 * 3. `fullName` ascending, so the order is stable across refreshes.
 *
 * A repository whose probes returned nothing goes after every repository with
 * a reading; the minutes tiebreak still applies among the unread ones, so a
 * row that only has minutes is not hidden behind a row with no data at all.
 */
export function compareReposByUsage(left: RepoQuotaUsage, right: RepoQuotaUsage): number {
  const byStorage = compareNumberDescNullsLast(repoStorageMb(left), repoStorageMb(right));
  if (byStorage !== 0) return byStorage;
  const byMinutes = compareNumberDescNullsLast(left.actionsMinutes, right.actionsMinutes);
  if (byMinutes !== 0) return byMinutes;
  return left.fullName.localeCompare(right.fullName);
}

/** Copy sorted for display; the snapshot itself keeps its own order. */
export function sortQuotaRepos(repos: readonly RepoQuotaUsage[], sort: QuotaRepoSort): RepoQuotaUsage[] {
  const copy = [...repos];
  if (sort === "name") return copy.sort((left, right) => left.fullName.localeCompare(right.fullName));
  return copy.sort(compareReposByUsage);
}
