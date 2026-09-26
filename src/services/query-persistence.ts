import { Store } from '@tauri-apps/plugin-store';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import type { AsyncStorage, Persister, PersistedClient } from '@tanstack/query-persist-client-core';
import type { Query, QueryClient } from '@tanstack/react-query';
import { bootMark } from '@/services/startup-metrics';
import { notifyCacheHydrated } from '@/services/window-reveal';
import type { RepositoryRef, SnapshotOverview } from '@/types';

export const CACHE_VERSION = 1;
export const QUERY_CACHE_MAX_AGE = 24 * 60 * 60 * 1000;

const QUERY_CACHE_FILE = 'query-cache.json';
const QUERY_CACHE_KEY = 'push:query-cache';

const ALLOWED_QUERY_TOP_LEVEL = new Set([
  'dashboard-overview',
  'repos',
  'repo-snapshot',
  'commits',
  'workflows',
  'dependabot',
  'languages',
  'contributors',
  'rateLimit',
  'snapshot-manifest',
]);

/**
 * Bucket 1 — queries scoped to a single repository. Their payload is the
 * repository's content, so a private one is dropped whole (binary decision).
 */
const SINGLE_SCOPE_QUERY_TOP_LEVEL = new Set([
  'repo-snapshot',
  'commits',
  'workflows',
  'dependabot',
  'languages',
  'contributors',
]);

/**
 * Bucket 2 — aggregate queries. Their payload mixes repositories, so private
 * entries are stripped and the public part of the cache survives.
 */
const AGGREGATE_QUERY_TOP_LEVEL = new Set(['repos', 'dashboard-overview']);

/**
 * Bucket 3 — `rateLimit` and `snapshot-manifest` carry no repository data, so
 * they persist as-is with no policy. They are in `ALLOWED_QUERY_TOP_LEVEL` and
 * deliberately absent from both buckets above.
 */

function isPersistableKey(queryKey: unknown): boolean {
  return Array.isArray(queryKey) && ALLOWED_QUERY_TOP_LEVEL.has(String(queryKey[0]));
}

export function shouldPersistQuery(query: Query): boolean {
  return isPersistableKey(query.queryKey);
}

interface CacheEnvelope {
  version: number;
  timestamp: number;
  clientState: PersistedClient['clientState'];
  /**
   * Set on write when the private policy removed or rewrote something, so the
   * restore path can invalidate the aggregate queries exactly once (see ADR-001,
   * mitigation 2b). Recomputed on every write — it describes that write, it is
   * not remembered state.
   */
  stripped?: true;
}

type PolicyEnvelope = PersistedClient & { stripped?: true };

/**
 * `DehydratedQuery` is not part of the public `@tanstack/query-core` surface, so
 * the entry type is derived from `DehydratedState` instead of imported.
 */
type DehydratedQueryEntry = PersistedClient['clientState']['queries'][number];

export function queryTopLevel(queryKey: unknown): string {
  return Array.isArray(queryKey) ? String(queryKey[0]) : '';
}

/** `['commits', 'mafhper', 'push_', 'snapshot']` → `mafhper/push_`. */
export function repoFullNameFromQueryKey(queryKey: unknown): string | null {
  if (!Array.isArray(queryKey)) return null;
  const owner = queryKey[1];
  const repo = queryKey[2];
  if (typeof owner !== 'string' || typeof repo !== 'string') return null;
  return `${owner}/${repo}`;
}

/**
 * Private repository full names from the in-memory catalog.
 *
 * `null` means "visibility unknown" (the catalog query has not resolved yet) —
 * callers must then fail closed. The catalog is read from memory, never from the
 * persisted copy, because the persisted copy is already stripped.
 */
export function privateRepoFullNames(catalog: unknown): Set<string> | null {
  if (!Array.isArray(catalog)) return null;
  const names = new Set<string>();
  for (const entry of catalog as Partial<RepositoryRef>[]) {
    if (entry?.isPrivate && typeof entry.fullName === 'string') {
      names.add(entry.fullName);
    }
  }
  return names;
}

/**
 * In-memory catalog union across every `['repos', <runtimeKey>]` query.
 *
 * The runtime key is not known at persist time, so every catalog is merged —
 * union is the safe direction, since a repository that is private in any
 * catalog gets dropped from every single-scope query.
 *
 * `undefined` means "visibility unknown": no `repos` query exists yet, which is
 * what a cold start looks like before `/user` resolves. Callers must then fail
 * closed instead of treating an absent catalog as "no private repositories".
 */
function readPrivateRepoCatalog(queryClient: QueryClient): RepositoryRef[] | undefined {
  const catalogs = queryClient
    .getQueryCache()
    .findAll({ queryKey: ['repos'] })
    .map((query) => queryClient.getQueryData<RepositoryRef[]>(query.queryKey))
    .filter((data): data is RepositoryRef[] => Array.isArray(data));
  if (catalogs.length === 0) return undefined;
  return catalogs.flat();
}

/** One pass, once per restore — `restoreClient` runs a single time per boot. */
function invalidateStrippedAggregates(queryClient: QueryClient): void {
  void queryClient.invalidateQueries({
    predicate: (query) => AGGREGATE_QUERY_TOP_LEVEL.has(queryTopLevel(query.queryKey)),
  });
}

/**
 * `repo-snapshot` is the one single-scope query whose payload self-describes
 * (`RepoSnapshotDetail.repo.isPrivate`). The other five are slices of the
 * detail (commits, workflow runs, alerts, languages, contributors), so their
 * visibility can only come from the query key.
 */
function isPrivateRepoSnapshotData(topLevel: string, data: unknown): boolean {
  if (topLevel !== 'repo-snapshot' || !data || typeof data !== 'object') return false;
  const repo = (data as { repo?: Partial<RepositoryRef> }).repo;
  return repo?.isPrivate === true;
}

function shouldDropQuery(query: DehydratedQueryEntry, privateNames: Set<string> | null): boolean {
  const topLevel = queryTopLevel(query.queryKey);
  if (!SINGLE_SCOPE_QUERY_TOP_LEVEL.has(topLevel)) return false;

  // Fail closed: with no catalog we cannot prove the repository is public, and
  // a cold start would otherwise write private content before `/user` resolves.
  if (!privateNames) return true;
  if (isPrivateRepoSnapshotData(topLevel, query.state?.data)) return true;

  const fullName = repoFullNameFromQueryKey(query.queryKey);
  if (!fullName) return true;
  return privateNames.has(fullName);
}

/**
 * Pure: builds a new array, never mutates the input.
 * Returns `undefined` when nothing was removed, so the caller can keep the
 * existing reference and skip a pointless rewrite.
 */
function stripRepositoryList(data: unknown, privateNames: Set<string>): RepositoryRef[] | undefined {
  if (!Array.isArray(data)) return undefined;
  const kept = (data as Partial<RepositoryRef>[]).filter(
    (repo) => repo?.isPrivate !== true && !(typeof repo?.fullName === 'string' && privateNames.has(repo.fullName)),
  );
  return kept.length === data.length ? undefined : (kept as RepositoryRef[]);
}

/**
 * Pure: builds a new object, never mutates the input. Returns `undefined` when
 * nothing was removed.
 *
 * `featuredRepo` is set by the live path from the first detail or from the
 * user's primary repo (`github.ts`), so it can name a private repository that
 * the strip just removed. A dangling highlight would point at a repository that
 * is not in the list, so it falls back to the first entry that survived.
 */
function stripOverview(data: unknown, privateNames: Set<string>): SnapshotOverview | undefined {
  if (!data || typeof data !== 'object') return undefined;
  const overview = data as SnapshotOverview;
  if (!Array.isArray(overview.repos)) return undefined;

  const repos = overview.repos.filter(
    (entry) => entry?.repo?.isPrivate !== true && !(typeof entry?.repo?.fullName === 'string' && privateNames.has(entry.repo.fullName)),
  );
  if (repos.length === overview.repos.length) return undefined;

  const featuredStillListed = repos.some((entry) => entry?.repo?.fullName === overview.featuredRepo);
  const featuredRepo = featuredStillListed
    ? overview.featuredRepo
    : (repos[0]?.repo?.fullName ?? '');

  return { ...overview, repos, featuredRepo };
}

function stripAggregateData(data: unknown, privateNames: Set<string>): unknown {
  return stripRepositoryList(data, privateNames) ?? stripOverview(data, privateNames);
}

export interface PrivatePolicyResult {
  clientState: PersistedClient['clientState'];
  stripped: boolean;
}

/**
 * The private-content policy (ADR-001, accepted 2026-09-26).
 *
 * The seam is here — inside `persistClient` — and not in
 * `shouldDehydrateQuery`: that hook receives the **live** `Query`, and
 * `dehydrate()` hands out references into it, so filtering there would corrupt
 * the in-memory cache.
 *
 * Entries are always rebuilt (`{ ...query, state: { ...query.state, data } }`),
 * never assigned in place. In the installed `query-core@5.102.8` the dehydrated
 * `state` already is a copy while `data` is still a live reference; rebuilding
 * keeps the code correct if a version returns `state` by reference.
 */
export function applyPrivatePolicy(
  clientState: PersistedClient['clientState'],
  catalog: unknown,
): PrivatePolicyResult {
  const privateNames = Array.isArray(catalog) ? privateRepoFullNames(catalog) : null;
  const queries = clientState?.queries ?? [];
  const kept: DehydratedQueryEntry[] = [];
  let stripped = false;

  for (const query of queries) {
    if (shouldDropQuery(query, privateNames)) {
      stripped = true;
      continue;
    }
    if (AGGREGATE_QUERY_TOP_LEVEL.has(queryTopLevel(query.queryKey))) {
      // Aggregates self-describe (`isPrivate` on each entry), so they still get
      // stripped when the catalog is unknown.
      const data = stripAggregateData(query.state?.data, privateNames ?? new Set());
      if (data !== undefined && data !== query.state?.data) {
        stripped = true;
        kept.push({ ...query, state: { ...query.state, data } });
        continue;
      }
    }
    kept.push(query);
  }

  return {
    clientState: stripped ? { ...clientState, queries: kept } : clientState,
    stripped,
  };
}

let storePromise: Promise<Store> | null = null;
function getStore(): Promise<Store> {
  storePromise ??= Store.load(QUERY_CACHE_FILE);
  return storePromise;
}

function createTauriQueryStorage(): AsyncStorage<string> {
  return {
    async getItem(key: string): Promise<string | null> {
      try {
        const store = await getStore();
        const envelope = (await store.get(key)) as CacheEnvelope | undefined;
        if (!envelope) return null;
        if (envelope.version !== CACHE_VERSION) {
          await store.delete(key);
          return null;
        }
        const clientState = {
          ...envelope.clientState,
          queries: envelope.clientState.queries.filter((q) => isPersistableKey(q.queryKey)),
        };
        return JSON.stringify({
          buster: String(CACHE_VERSION),
          timestamp: envelope.timestamp,
          clientState,
          ...(envelope.stripped ? { stripped: true } : {}),
        } satisfies PolicyEnvelope);
      } catch {
        return null;
      }
    },
    async setItem(key: string, value: string): Promise<void> {
      const store = await getStore();
      const persisted = JSON.parse(value) as PolicyEnvelope;
      const envelope: CacheEnvelope = {
        version: CACHE_VERSION,
        timestamp: Date.now(),
        clientState: persisted.clientState,
        ...(persisted.stripped ? { stripped: true } : {}),
      };
      await store.set(key, envelope);
    },
    async removeItem(key: string): Promise<void> {
      const store = await getStore();
      await store.delete(key);
    },
  };
}

export function createQueryPersister(queryClient: QueryClient): Persister {
  const base = createAsyncStoragePersister({
    storage: createTauriQueryStorage(),
    key: QUERY_CACHE_KEY,
    throttleTime: 500,
  });

  return {
    ...base,
    /**
     * Seams the private policy here (ADR-001). `dehydrate()` has already built
     * the envelope by the time this runs, and the catalog is read from memory,
     * so what is written to disk is the only place a private payload is ever
     * filtered.
     */
    async persistClient(persistedClient: PersistedClient): Promise<void> {
      const catalog = readPrivateRepoCatalog(queryClient);
      const { clientState, stripped } = applyPrivatePolicy(persistedClient.clientState, catalog);
      const envelope: PolicyEnvelope = { ...persistedClient, clientState };
      if (stripped) envelope.stripped = true;
      await base.persistClient(envelope);
    },
    async restoreClient(): Promise<PersistedClient | undefined> {
      const restored = (await base.restoreClient()) as PolicyEnvelope | undefined;
      bootMark('cache-hydrated');
      notifyCacheHydrated();
      // Hydrated aggregate caches are missing the entries the policy removed, so
      // they are stale by construction. Invalidating here refreshes them before
      // any observer mounts; with no mounted observer TanStack only marks them
      // stale, so this costs no extra request on a cold start.
      if (restored?.stripped) invalidateStrippedAggregates(queryClient);
      return restored;
    },
  };
}

export async function removePersistedQueryCache(): Promise<void> {
  const store = await getStore();
  await store.delete(QUERY_CACHE_KEY);
}