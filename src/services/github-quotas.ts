import { FREE_PLAN_LIMITS, foreignRepoOwners, foreignRepos } from "@/quotas";
import type {
  AccountQuotaSnapshot,
  QuotaBillingState,
  QuotaFamily,
  QuotaFamilyId,
  QuotaOrigin,
  QuotaUnit,
  RepoQuotaUsage,
} from "@/quotas";

/**
 * Account quota reader, plus the repository cache management of PU15.
 *
 * The snapshot reads are independent and read-only: one family failing never
 * hides another, and the snapshot always says which source answered. The
 * endpoints, in the order they are tried:
 *
 * 1. `GET /users/{login}/settings/billing/usage` — enhanced billing platform.
 *    It is the only source that names a repository per usage item (Lote 1 #2).
 * 2. `GET /users/{login}/settings/billing/shared-storage` — the storage bucket
 *    and the remaining days of the cycle. Tried even when (1) works, because
 *    (1) reports storage as a SKU without a comparable size.
 * 3. Legacy `actions` and `packages` — used when (1) is unavailable. They are
 *    not in the current docs and may be retired, so failures are expected.
 * 4. Per repository: `actions/cache/usage` and `actions/artifacts` (Lote 1 #4
 *    and #5). They work on the Free plan and are labelled as current usage,
 *    never as billing.
 *
 * The cache actions are the only destructive capability in this module and
 * are separate from the snapshot: `GET .../actions/caches` lists what would be
 * deleted, and `DELETE .../actions/caches/{cache_id}` removes one entry. Only
 * those two documented endpoints are used; the delete-by-key variant is not,
 * because it removes more than the confirmation names. A 403 is returned
 * intact so the caller can state "no Actions write scope" instead of guessing.
 *
 * `timing` endpoints are deliberately not used: they are being retired
 * (Lote 1 #6). `usage/summary` is a preview and is deliberately not used.
 */

const GITHUB_API_BASE = "https://api.github.com";
const USAGE_MAX_PAGES = 10;
const ARTIFACTS_MAX_PAGES = 3;
/** 2 calls per repository every refresh: the probe is capped, not paginated. */
const REPO_PROBE_LIMIT = 25;
/** 100 entries per page; a repository above this is reported as truncated. */
const CACHES_MAX_PAGES = 10;

type RequestOk<T> = { state: "ok"; data: T; link?: string | null };
type RequestFailure = { state: "error"; status: number; message: string };
type RequestResult<T> = RequestOk<T> | RequestFailure;

async function requestJson<T>(
  pathname: string,
  token: string,
  method: "GET" | "DELETE" = "GET",
): Promise<RequestResult<T>> {
  try {
    const response = await fetch(`${GITHUB_API_BASE}${pathname}`, {
      method,
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2026-03-10",
        Authorization: `Bearer ${token}`,
        "User-Agent": "push_-local-runtime",
      },
    });
    if (!response.ok) {
      return { state: "error", status: response.status, message: `${response.status} ${pathname}` };
    }
    // The delete-by-id endpoint documents 204 No Content, which has no body.
    if (response.status === 204) {
      return { state: "ok", data: undefined as T, link: null };
    }
    return { state: "ok", data: (await response.json()) as T, link: response.headers?.get("link") ?? null };
  } catch (error) {
    return {
      state: "error",
      status: 0,
      message: `${error instanceof Error ? error.message : String(error)} (${pathname})`,
    };
  }
}

type BillingUsageItem = {
  date?: string;
  product?: string;
  sku?: string;
  quantity?: number;
  unitType?: string;
  repositoryName?: string | null;
};

type BillingUsagePayload = {
  usageItems?: BillingUsageItem[];
};

type LegacyActions = {
  total_minutes_used?: number;
  included_minutes?: number;
};

type LegacyPackages = {
  total_gigabytes_bandwidth_used?: number;
  included_gigabytes_bandwidth?: number;
};

type LegacyStorage = {
  days_left_in_billing_cycle?: number;
  estimated_storage_for_month?: number;
};

type CacheUsagePayload = {
  active_caches_size_in_bytes?: number;
  active_caches_count?: number;
};

type Artifact = {
  size_in_bytes?: number;
  expired?: boolean;
};

type ArtifactsPayload = {
  artifacts?: Artifact[];
};

type PlanPayload = {
  plan?: {
    name?: string;
  };
};

type UsageFamily = {
  id: QuotaFamilyId;
  unit: QuotaUnit;
  /** Multiplier that converts the API quantity into `unit`. */
  factor: number;
};

/**
 * Maps a billing item to a family. Only the products the surface shows are
 * recognised; unknown products are skipped instead of being guessed into a
 * family with an invented limit.
 */
function usageFamilyOf(product: string, unitType: string): UsageFamily | null {
  const productKey = (product || "").trim().toLowerCase();
  const unitKey = (unitType || "").trim().toLowerCase();

  const isMinutes = unitKey.includes("minute");
  const isGigabytes = unitKey === "gigabytes" || unitKey === "gb";
  const isMegabytes = unitKey === "megabytes" || unitKey === "mb";
  const isGigabyteHours = unitKey.includes("hour");

  if (productKey === "actions") {
    if (isMinutes) return { id: "actionsMinutes", unit: "minutes", factor: 1 };
    if (isGigabytes) return { id: "actionsStorage", unit: "mb", factor: 1024 };
    if (isMegabytes) return { id: "actionsStorage", unit: "mb", factor: 1 };
    if (isGigabyteHours) return { id: "actionsStorage", unit: "gbHours", factor: 1 };
    return null;
  }

  if (productKey === "packages") {
    if (isGigabytes) return { id: "packages", unit: "mb", factor: 1024 };
    if (isMegabytes) return { id: "packages", unit: "mb", factor: 1 };
    if (isGigabyteHours) return { id: "packages", unit: "gbHours", factor: 1 };
    return null;
  }

  if (productKey === "shared storage" || productKey === "storage") {
    if (isGigabytes) return { id: "sharedStorage", unit: "mb", factor: 1024 };
    if (isMegabytes) return { id: "sharedStorage", unit: "mb", factor: 1 };
    if (isGigabyteHours) return { id: "sharedStorage", unit: "gbHours", factor: 1 };
    return null;
  }

  return null;
}

/**
 * Follows the `Link` header instead of guessing page counts: the usage report
 * does not document pagination, and a blind `page=2` against an endpoint that
 * ignores it would read the same items twice.
 */
function nextPagePath(linkHeader: string | null | undefined): string | null {
  if (!linkHeader) return null;
  for (const part of linkHeader.split(",")) {
    if (!/rel="next"/.test(part)) continue;
    const match = /<([^>]+)>/.exec(part);
    if (!match) return null;
    const path = match[1].replace(GITHUB_API_BASE, "");
    return path.startsWith("/") ? path : null;
  }
  return null;
}

async function fetchBillingUsage(token: string, login: string): Promise<RequestResult<BillingUsageItem[]>> {
  const items: BillingUsageItem[] = [];
  let pathname: string | null = `/users/${encodeURIComponent(login)}/settings/billing/usage`;
  for (let depth = 0; pathname && depth < USAGE_MAX_PAGES; depth += 1) {
    const result = await requestJson<BillingUsagePayload>(pathname, token);
    if (result.state === "error") {
      // A later page failing keeps the pages already read; the first page
      // failing is the request failing.
      return depth === 0
        ? { state: "error", status: result.status, message: result.message }
        : { state: "ok", data: items };
    }
    const pageItems = Array.isArray(result.data?.usageItems) ? result.data.usageItems : [];
    items.push(...pageItems);
    pathname = nextPagePath(result.link);
  }
  return { state: "ok", data: items };
}

/**
 * Repository names in billing items may be bare (`push_`) or qualified
 * (`owner/repo`). A bare name is resolved against the probed repositories;
 * when it cannot be resolved it stays as returned — no owner is invented.
 */
function resolveRepositoryName(raw: string, knownFullNames: string[]): string {
  const value = raw.trim();
  if (!value) return value;
  if (value.includes("/")) return value;
  const match = knownFullNames.find((fullName) => fullName.split("/")[1]?.toLowerCase() === value.toLowerCase());
  return match ?? value;
}

interface UsageAggregate {
  families: QuotaFamily[];
  /** Minutes per repository, keyed by the resolved full name. */
  repoMinutes: Map<string, number>;
}

function aggregateUsage(items: BillingUsageItem[], knownFullNames: string[]): UsageAggregate {
  const accumulators = new Map<string, { id: QuotaFamilyId; unit: QuotaUnit; used: number }>();
  const repoMinutes = new Map<string, number>();

  for (const item of items) {
    const quantity = typeof item.quantity === "number" ? item.quantity : null;
    if (quantity === null || !Number.isFinite(quantity)) continue;
    const family = usageFamilyOf(item.product || "", item.unitType || "");
    if (!family) continue;

    const key = `${family.id}:${family.unit}`;
    const current = accumulators.get(key) ?? { id: family.id, unit: family.unit, used: 0 };
    current.used += quantity * family.factor;
    accumulators.set(key, current);

    if (family.id === "actionsMinutes" && typeof item.repositoryName === "string" && item.repositoryName.trim()) {
      const repository = resolveRepositoryName(item.repositoryName, knownFullNames);
      repoMinutes.set(repository, (repoMinutes.get(repository) ?? 0) + quantity * family.factor);
    }
  }

  return {
    families: [...accumulators.values()].map((entry) => ({
      id: entry.id,
      used: entry.used,
      limit: null,
      unit: entry.unit,
      resetAt: null,
      origin: "billing" as QuotaOrigin,
      monthly: true,
    })),
    repoMinutes,
  };
}

function familyLimit(id: QuotaFamilyId, unit: QuotaUnit): number | null {
  if (id === "actionsMinutes" && unit === "minutes") return FREE_PLAN_LIMITS.actionsMinutes;
  if (id === "actionsStorage" && unit === "mb") return FREE_PLAN_LIMITS.storageMb;
  if (id === "sharedStorage" && unit === "mb") return FREE_PLAN_LIMITS.storageMb;
  return null;
}

function withReferenceLimits(families: QuotaFamily[], applyFreeLimits: boolean): QuotaFamily[] {
  return families.map((family) => ({
    ...family,
    limit: family.limit ?? (applyFreeLimits ? familyLimit(family.id, family.unit) : null),
  }));
}

function legacyFamilies(
  actions: RequestResult<LegacyActions> | null,
  packages: RequestResult<LegacyPackages> | null,
  storage: RequestResult<LegacyStorage>,
  now: Date,
  applyFreeLimits: boolean,
): QuotaFamily[] {
  const families: QuotaFamily[] = [];

  if (actions?.state === "ok") {
    const used = actions.data.total_minutes_used;
    if (typeof used === "number") {
      families.push({
        id: "actionsMinutes",
        used,
        limit: typeof actions.data.included_minutes === "number" && actions.data.included_minutes > 0
          ? actions.data.included_minutes
          : applyFreeLimits ? FREE_PLAN_LIMITS.actionsMinutes : null,
        unit: "minutes",
        resetAt: null,
        origin: "legacy",
        monthly: true,
      });
    }
  }

  if (packages?.state === "ok") {
    const usedGb = packages.data.total_gigabytes_bandwidth_used;
    if (typeof usedGb === "number") {
      families.push({
        id: "packages",
        used: usedGb * 1024,
        limit: typeof packages.data.included_gigabytes_bandwidth === "number" && packages.data.included_gigabytes_bandwidth > 0
          ? packages.data.included_gigabytes_bandwidth * 1024
          : null,
        unit: "mb",
        resetAt: null,
        origin: "legacy",
        monthly: true,
      });
    }
  }

  if (storage.state === "ok") {
    const usedGb = storage.data.estimated_storage_for_month;
    if (typeof usedGb === "number") {
      const daysLeft = storage.data.days_left_in_billing_cycle;
      families.push({
        id: "sharedStorage",
        used: usedGb * 1024,
        limit: applyFreeLimits ? FREE_PLAN_LIMITS.storageMb : null,
        unit: "mb",
        resetAt: typeof daysLeft === "number" && daysLeft >= 0
          ? new Date(now.getTime() + daysLeft * 86_400_000).toISOString()
          : null,
        origin: "legacy",
        monthly: true,
      });
    }
  }

  return families;
}

function storageFamilyFromLegacy(
  storage: RequestResult<LegacyStorage>,
  now: Date,
  applyFreeLimits: boolean,
): QuotaFamily | null {
  if (storage.state === "error") return null;
  const usedGb = storage.data.estimated_storage_for_month;
  if (typeof usedGb !== "number") return null;
  const daysLeft = storage.data.days_left_in_billing_cycle;
  return {
    id: "sharedStorage",
    used: usedGb * 1024,
    limit: applyFreeLimits ? FREE_PLAN_LIMITS.storageMb : null,
    unit: "mb",
    resetAt: typeof daysLeft === "number" && daysLeft >= 0
      ? new Date(now.getTime() + daysLeft * 86_400_000).toISOString()
      : null,
    origin: "legacy",
    monthly: true,
  };
}

function billingStateOf(
  usage: RequestResult<BillingUsageItem[]>,
  legacyAnswered: boolean,
): { state: QuotaBillingState; message?: string } {
  if (usage.state === "ok") return { state: "enhanced" };
  if (legacyAnswered) return { state: "legacy" };
  const classified: QuotaBillingState = usage.status === 401 || usage.status === 403
    ? "forbidden"
    : usage.status === 404 || usage.status === 501
      ? "unavailable"
      : "error";
  return { state: classified, message: usage.message };
}

function bytesToMb(bytes: number | undefined): number | null {
  if (typeof bytes !== "number" || !Number.isFinite(bytes)) return null;
  return bytes / (1024 * 1024);
}

async function fetchArtifactBytes(owner: string, repo: string, token: string): Promise<number | null> {
  let totalBytes = 0;
  let answered = false;
  for (let page = 1; page <= ARTIFACTS_MAX_PAGES; page += 1) {
    const result = await requestJson<ArtifactsPayload>(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/actions/artifacts?per_page=100&page=${page}`,
      token,
    );
    if (result.state === "error") return answered ? totalBytes / (1024 * 1024) : null;
    answered = true;
    const artifacts = Array.isArray(result.data?.artifacts) ? result.data.artifacts : [];
    for (const artifact of artifacts) {
      if (artifact.expired) continue;
      if (typeof artifact.size_in_bytes === "number") totalBytes += artifact.size_in_bytes;
    }
    if (artifacts.length < 100) break;
  }
  return answered ? totalBytes / (1024 * 1024) : null;
}

/** One cache entry as documented by `GET /repos/{owner}/{repo}/actions/caches`. */
export interface RepoCacheEntry {
  id: number;
  key: string;
  ref: string;
  /** `size_in_bytes`; `0` when the endpoint omitted it, never an invented value. */
  sizeInBytes: number;
}

export interface RepoCacheInventory {
  entries: RepoCacheEntry[];
  /** `total_count` from the endpoint, or the number of entries when absent. */
  totalCount: number;
  /** True when the listing stopped before `totalCount` entries. */
  truncated: boolean;
}

export type RepoCacheListResult =
  | { state: "ok"; inventory: RepoCacheInventory }
  | { state: "error"; status: number; message: string };

export type RepoCacheMutationResult = { state: "ok" } | { state: "error"; status: number; message: string };

type CacheEntryPayload = {
  id?: number;
  key?: string;
  ref?: string;
  size_in_bytes?: number;
};

type CachesPayload = {
  total_count?: number;
  actions_caches?: CacheEntryPayload[];
};

/**
 * Repository-scoped cache management (PU15, Lote 2).
 *
 * Only the two documented endpoints are used: the paginated listing and the
 * delete-by-id. The delete-by-key variant is deliberately not used because it
 * removes every cache that shares a key and a ref, which is more than the
 * confirmation promises. A 403 is surfaced as-is so the surface can say the
 * token lacks Actions write access instead of pretending the repository has
 * no caches.
 */
function repositoryCachePath(fullName: string, suffix: string): string | null {
  const [owner, repo] = fullName.split("/");
  if (!owner || !repo) return null;
  return `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/actions/caches${suffix}`;
}

export async function listRepoCaches(token: string, fullName: string): Promise<RepoCacheListResult> {
  const basePath = repositoryCachePath(fullName, "");
  if (!basePath) {
    return { state: "error", status: 0, message: `Invalid repository name: ${fullName}` };
  }

  const entries: RepoCacheEntry[] = [];
  let totalCount = 0;
  let pathname: string | null = `${basePath}?per_page=100`;

  for (let depth = 0; pathname && depth < CACHES_MAX_PAGES; depth += 1) {
    const result = await requestJson<CachesPayload>(pathname, token);
    if (result.state === "error") {
      // The first page failing is the request failing. A later page failing
      // keeps what was already listed and is reported as truncated.
      if (depth === 0) return { state: "error", status: result.status, message: result.message };
      break;
    }

    const pageEntries = Array.isArray(result.data?.actions_caches) ? result.data.actions_caches : [];
    if (typeof result.data?.total_count === "number" && Number.isFinite(result.data.total_count)) {
      totalCount = Math.max(totalCount, result.data.total_count);
    }
    for (const entry of pageEntries) {
      if (typeof entry.id !== "number" || !Number.isFinite(entry.id)) continue;
      entries.push({
        id: entry.id,
        key: entry.key ?? "",
        ref: entry.ref ?? "",
        sizeInBytes: typeof entry.size_in_bytes === "number" && Number.isFinite(entry.size_in_bytes)
          ? entry.size_in_bytes
          : 0,
      });
    }

    pathname = nextPagePath(result.link);
    if (pageEntries.length < 100) pathname = null;
  }

  const reportedTotal = Math.max(totalCount, entries.length);
  return {
    state: "ok",
    inventory: { entries, totalCount: reportedTotal, truncated: entries.length < reportedTotal },
  };
}

/** `DELETE /repos/{owner}/{repo}/actions/caches/{cache_id}` — documented 204. */
export async function deleteRepoCache(
  token: string,
  fullName: string,
  cacheId: number,
): Promise<RepoCacheMutationResult> {
  const path = repositoryCachePath(fullName, `/${encodeURIComponent(String(cacheId))}`);
  if (!path) {
    return { state: "error", status: 0, message: `Invalid repository name: ${fullName}` };
  }
  const result = await requestJson<unknown>(path, token, "DELETE");
  return result.state === "error" ? result : { state: "ok" };
}

async function probeRepository(fullName: string, token: string): Promise<RepoQuotaUsage> {
  const [owner, repo] = fullName.split("/");
  const base: RepoQuotaUsage = {
    fullName,
    cacheMb: null,
    cacheCount: null,
    artifactsMb: null,
    actionsMinutes: null,
  };
  if (!owner || !repo) return base;

  const [cache, artifactsMb] = await Promise.all([
    requestJson<CacheUsagePayload>(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/actions/cache/usage`,
      token,
    ),
    fetchArtifactBytes(owner, repo, token),
  ]);

  return {
    ...base,
    cacheMb: cache.state === "ok" ? bytesToMb(cache.data.active_caches_size_in_bytes) : null,
    cacheCount: cache.state === "ok" && typeof cache.data.active_caches_count === "number"
      ? cache.data.active_caches_count
      : null,
    artifactsMb,
  };
}

/**
 * Reads everything the account surface can show. The function never throws:
 * a failed source becomes a state on the snapshot, because an honest
 * "unavailable" is part of the feature.
 */
export async function fetchAccountQuotas(
  token: string,
  login: string,
  repoNames: string[],
): Promise<AccountQuotaSnapshot> {
  const now = new Date();
  const trimmedLogin = (login || "").trim();
  const knownFullNames = repoNames.filter((name) => name.includes("/"));
  const probedNames = repoNames.slice(0, REPO_PROBE_LIMIT);

  const usagePromise: Promise<RequestResult<BillingUsageItem[]>> = trimmedLogin
    ? fetchBillingUsage(token, trimmedLogin)
    : Promise.resolve({ state: "error", status: 0, message: "No account login available." });
  const storagePromise: Promise<RequestResult<LegacyStorage>> = trimmedLogin
    ? requestJson<LegacyStorage>(`/users/${encodeURIComponent(trimmedLogin)}/settings/billing/shared-storage`, token)
    : Promise.resolve({ state: "error", status: 0, message: "No account login available." });
  const planPromise: Promise<RequestResult<PlanPayload>> = requestJson<PlanPayload>("/user", token);

  const [usage, storage, plan, probedRepos] = await Promise.all([
    usagePromise,
    storagePromise,
    planPromise,
    Promise.all(probedNames.map((fullName) => probeRepository(fullName, token))),
  ]);

  // The Free table is a reference, not a fact: for a paid plan a 2,000-minute
  // ceiling would be invented. `GET /user` names the plan, and an unknown plan
  // keeps the reference table (the note in the section says so).
  const planName = plan.state === "ok" ? (plan.data.plan?.name ?? "").trim().toLowerCase() : "";
  const applyFreeLimits = planName === "" || planName === "free";

  let legacyActions: RequestResult<LegacyActions> | null = null;
  let legacyPackages: RequestResult<LegacyPackages> | null = null;
  if (usage.state === "error") {
    [legacyActions, legacyPackages] = await Promise.all([
      requestJson<LegacyActions>(`/users/${encodeURIComponent(trimmedLogin)}/settings/billing/actions`, token),
      requestJson<LegacyPackages>(`/users/${encodeURIComponent(trimmedLogin)}/settings/billing/packages`, token),
    ]);
  }

  const legacyAnswered = Boolean(legacyActions?.state === "ok" || legacyPackages?.state === "ok" || storage.state === "ok");
  const billing = billingStateOf(usage, legacyAnswered);

  let families: QuotaFamily[];
  let repoMinutes = new Map<string, number>();

  if (usage.state === "ok") {
    const aggregate = aggregateUsage(usage.data, knownFullNames);
    repoMinutes = aggregate.repoMinutes;
    families = aggregate.families;
    // An empty usage answer on a working endpoint means zero minutes, which is
    // a real statement about the month — not a missing family.
    if (!families.some((family) => family.id === "actionsMinutes" && family.unit === "minutes")) {
      families.push({
        id: "actionsMinutes",
        used: 0,
        limit: applyFreeLimits ? FREE_PLAN_LIMITS.actionsMinutes : null,
        unit: "minutes",
        resetAt: null,
        origin: "billing",
        monthly: true,
      });
    }
    families = withReferenceLimits(families, applyFreeLimits);
  } else {
    families = withReferenceLimits(
      legacyFamilies(legacyActions, legacyPackages, storage, now, applyFreeLimits),
      applyFreeLimits,
    );
  }

  // The storage bucket has one comparable quantity. Prefer whichever source
  // reports it as a size; the legacy endpoint also carries the cycle reset.
  const hasComparableStorage = families.some(
    (family) => (family.id === "sharedStorage" || family.id === "actionsStorage") && family.unit === "mb",
  );
  if (!hasComparableStorage) {
    const legacyStorage = storageFamilyFromLegacy(storage, now, applyFreeLimits);
    if (legacyStorage) {
      // The legacy endpoint reports the same bucket as a size; a GB-hours SKU
      // from the usage endpoint would be a second reading of it in another
      // unit. The comparable one wins and the other is dropped.
      families = families.filter(
        (family) => !((family.id === "sharedStorage" || family.id === "actionsStorage") && family.unit === "gbHours"),
      );
      families.push(legacyStorage);
    }
  }

  const repoUsage = new Map<string, RepoQuotaUsage>();
  const ensureRepo = (fullName: string): RepoQuotaUsage => {
    const existing = repoUsage.get(fullName);
    if (existing) return existing;
    const created: RepoQuotaUsage = {
      fullName,
      cacheMb: null,
      cacheCount: null,
      artifactsMb: null,
      actionsMinutes: null,
    };
    repoUsage.set(fullName, created);
    return created;
  };

  for (const probed of probedRepos) repoUsage.set(probed.fullName, probed);
  for (const [repository, minutes] of repoMinutes) {
    ensureRepo(repository).actionsMinutes = minutes;
  }

  // The selection is stored per installation, not per account: after a token
  // swap the requested repositories can still name the previous account. The
  // union covers what was requested and what ended up displayed.
  const accountRepos = [...repoNames, ...repoUsage.keys()];
  const foreignOwners = foreignRepoOwners(trimmedLogin, accountRepos);
  const foreignRepoCount = foreignRepos(trimmedLogin, accountRepos).length;

  return {
    fetchedAt: now.toISOString(),
    login: trimmedLogin,
    billing: billing.state,
    ...(billing.message ? { billingMessage: billing.message } : {}),
    families,
    repos: [...repoUsage.values()].sort((left, right) => left.fullName.localeCompare(right.fullName)),
    repoProbe: { probed: probedNames.length, requested: repoNames.length },
    foreignOwners,
    foreignRepoCount,
  };
}
