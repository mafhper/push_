import { afterEach, describe, expect, it, vi } from "vitest";
import { dehydrate } from "@tanstack/react-query";
import { QueryClient } from "@tanstack/react-query";
import type { PersistedClient } from "@tanstack/query-persist-client-core";
import {
  applyPrivatePolicy,
  privateRepoFullNames,
  repoFullNameFromQueryKey,
  shouldPersistQuery,
} from "./query-persistence";
import { createOverview, createRepo, createRepoDetail } from "@/test/factories";
import type { RepositoryRef } from "@/types";

type Entry = PersistedClient["clientState"]["queries"][number];

const RUNTIME_KEY = "snapshot";
const AUTH_KEY = "k1:1234";

const publicRepo = createRepo({ fullName: "mafhper/push_", name: "push_" });
const privateRepo = createRepo({
  id: 2,
  fullName: "mafhper/segredo",
  name: "segredo",
  isPrivate: true,
});

/** Minimal but faithful dehydrated query. `state` mirrors the real `QueryState`. */
function entry(queryKey: unknown[], data: unknown, state: Record<string, unknown> = {}): Entry {
  return {
    queryKey,
    queryHash: JSON.stringify(queryKey),
    state: {
      data,
      dataUpdateCount: 1,
      dataUpdatedAt: 1,
      error: null,
      errorUpdateCount: 0,
      errorUpdatedAt: 0,
      fetchFailureCount: 0,
      fetchFailureReason: null,
      fetchMeta: null,
      isInvalidated: false,
      status: "success",
      fetchStatus: "idle",
      ...state,
    },
    dehydratedAt: 1,
  } as unknown as Entry;
}

function stateOf(queries: Entry[], queryKey: unknown[]): unknown {
  return queries.find((query) => JSON.stringify(query.queryKey) === JSON.stringify(queryKey))?.state.data;
}

const CATALOG: RepositoryRef[] = [publicRepo, privateRepo];
const PRIVATE_NAMES = new Set(["mafhper/segredo"]);

describe("private content policy · helpers", () => {
  it("reads private full names from a catalog and reports an unknown catalog as null", () => {
    expect(privateRepoFullNames(CATALOG)).toEqual(PRIVATE_NAMES);
    // `null` is the "visibility unknown" signal, distinct from "no private repos".
    expect(privateRepoFullNames(undefined)).toBeNull();
    expect(privateRepoFullNames([])).toEqual(new Set());
  });

  it("derives the repository full name from a single-scope query key", () => {
    expect(repoFullNameFromQueryKey(["commits", "mafhper", "push_", RUNTIME_KEY])).toBe("mafhper/push_");
    expect(repoFullNameFromQueryKey(["repos", RUNTIME_KEY])).toBeNull();
    expect(repoFullNameFromQueryKey("commits")).toBeNull();
  });

  it("keeps shouldDehydrateQuery a plain allowlist", () => {
    const query = { queryKey: ["commits", "mafhper", "segredo", AUTH_KEY] } as never;
    // The policy lives in `persistClient`; this hook must stay binary so it
    // cannot depend on catalog state at dehydrate time.
    expect(shouldPersistQuery(query)).toBe(true);
  });
});

describe("private content policy · bucket 1 (single-scope queries)", () => {
  it("drops every single-scope query of a private repository", () => {
    const keys = [
      ["repo-snapshot", "mafhper", "segredo", AUTH_KEY],
      ["commits", "mafhper", "segredo", AUTH_KEY],
      ["workflows", "mafhper", "segredo", AUTH_KEY],
      ["dependabot", "mafhper", "segredo", AUTH_KEY],
      ["languages", "mafhper", "segredo", AUTH_KEY],
      ["contributors", "mafhper", "segredo", AUTH_KEY],
    ];
    const clientState = {
      mutations: [],
      queries: [
        ...keys.map((key) => entry(key, { private: true })),
        entry(["commits", "mafhper", "push_", AUTH_KEY], { private: false }),
      ],
    } as PersistedClient["clientState"];

    const { clientState: out, stripped } = applyPrivatePolicy(clientState, CATALOG);

    expect(stripped).toBe(true);
    expect(out.queries).toHaveLength(1);
    expect(stateOf(out.queries, ["commits", "mafhper", "push_", AUTH_KEY])).toEqual({ private: false });
  });

  it("drops a repo-snapshot that self-describes as private, even without a catalog entry", () => {
    const clientState = {
      mutations: [],
      queries: [
        entry(["repo-snapshot", "mafhper", "segredo", AUTH_KEY], createRepoDetail({ repo: privateRepo })),
        entry(["repo-snapshot", "mafhper", "push_", AUTH_KEY], createRepoDetail({ repo: publicRepo })),
      ],
    } as PersistedClient["clientState"];

    // The catalog does not list `segredo` as private: the payload still proves it.
    const { clientState: out, stripped } = applyPrivatePolicy(clientState, [publicRepo]);

    expect(stripped).toBe(true);
    expect(out.queries).toHaveLength(1);
    expect((stateOf(out.queries, ["repo-snapshot", "mafhper", "push_", AUTH_KEY]) as { repo: RepositoryRef }).repo.isPrivate).toBe(false);
  });

  it("fails closed when the catalog has not resolved yet", () => {
    const clientState = {
      mutations: [],
      queries: [
        entry(["commits", "mafhper", "push_", AUTH_KEY], { private: false }),
        entry(["rateLimit", AUTH_KEY], { remaining: 4999 }),
      ],
    } as PersistedClient["clientState"];

    // Cold start: no `repos` query exists yet, so visibility is unknown and a
    // public repository's content is dropped too — the safe direction.
    const { clientState: out, stripped } = applyPrivatePolicy(clientState, undefined);

    expect(stripped).toBe(true);
    expect(out.queries.map((query) => query.queryKey[0])).toEqual(["rateLimit"]);
  });

  it("drops a single-scope query whose key has no owner/repo, instead of guessing", () => {
    const clientState = {
      mutations: [],
      queries: [entry(["commits"], { private: false })],
    } as PersistedClient["clientState"];

    expect(applyPrivatePolicy(clientState, CATALOG).stripped).toBe(true);
  });
});

describe("private content policy · bucket 2 (aggregate queries)", () => {
  it("filters private entries out of the repository catalog and keeps the public ones", () => {
    const clientState = {
      mutations: [],
      queries: [entry(["repos", AUTH_KEY], CATALOG)],
    } as PersistedClient["clientState"];

    const { clientState: out, stripped } = applyPrivatePolicy(clientState, CATALOG);

    expect(stripped).toBe(true);
    const data = stateOf(out.queries, ["repos", AUTH_KEY]) as RepositoryRef[];
    expect(data.map((repo) => repo.fullName)).toEqual(["mafhper/push_"]);
    // The live reference is untouched: the policy rebuilds, never assigns.
    expect(stateOf(clientState.queries, ["repos", AUTH_KEY]) as RepositoryRef[]).toHaveLength(2);
  });

  it("repairs a featuredRepo that pointed at a stripped private repository", () => {
    const overview = createOverview({ featuredRepo: "mafhper/segredo" });
    overview.repos = [
      { ...overview.repos[0], repo: publicRepo },
      { ...overview.repos[0], repo: privateRepo },
    ];
    const clientState = {
      mutations: [],
      queries: [entry(["dashboard-overview", AUTH_KEY], overview)],
    } as PersistedClient["clientState"];

    const { clientState: out } = applyPrivatePolicy(clientState, CATALOG);
    const data = stateOf(out.queries, ["dashboard-overview", AUTH_KEY]) as typeof overview;

    expect(data.repos.map((item) => item.repo.fullName)).toEqual(["mafhper/push_"]);
    expect(data.featuredRepo).toBe("mafhper/push_");
  });

  it("empties featuredRepo when no repository survives the strip", () => {
    const overview = createOverview({ featuredRepo: "mafhper/segredo" });
    overview.repos = [{ ...overview.repos[0], repo: privateRepo }];
    const clientState = {
      mutations: [],
      queries: [entry(["dashboard-overview", AUTH_KEY], overview)],
    } as PersistedClient["clientState"];

    const { clientState: out } = applyPrivatePolicy(clientState, CATALOG);
    const data = stateOf(out.queries, ["dashboard-overview", AUTH_KEY]) as typeof overview;

    expect(data.repos).toHaveLength(0);
    expect(data.featuredRepo).toBe("");
  });

  it("still strips aggregates by their own isPrivate flag when the catalog is unknown", () => {
    const overview = createOverview({ featuredRepo: "mafhper/segredo" });
    overview.repos = [
      { ...overview.repos[0], repo: publicRepo },
      { ...overview.repos[0], repo: privateRepo },
    ];
    const clientState = {
      mutations: [],
      queries: [entry(["repos", AUTH_KEY], CATALOG), entry(["dashboard-overview", AUTH_KEY], overview)],
    } as PersistedClient["clientState"];

    const { clientState: out } = applyPrivatePolicy(clientState, undefined);

    expect((stateOf(out.queries, ["repos", AUTH_KEY]) as RepositoryRef[]).map((repo) => repo.fullName)).toEqual(["mafhper/push_"]);
    expect((stateOf(out.queries, ["dashboard-overview", AUTH_KEY]) as typeof overview).repos).toHaveLength(1);
  });
});

describe("private content policy · bucket 3 and no-op path", () => {
  it("persists rateLimit and snapshot-manifest untouched", () => {
    const rateLimit = { remaining: 4999, limit: 5000 };
    const manifest = { generatedAt: "2026-09-26T00:00:00.000Z" };
    const clientState = {
      mutations: [],
      queries: [entry(["rateLimit", AUTH_KEY], rateLimit), entry(["snapshot-manifest", RUNTIME_KEY], manifest)],
    } as PersistedClient["clientState"];

    const { clientState: out, stripped } = applyPrivatePolicy(clientState, CATALOG);

    expect(stripped).toBe(false);
    expect(out).toBe(clientState);
    expect(stateOf(out.queries, ["rateLimit", AUTH_KEY])).toBe(rateLimit);
    expect(stateOf(out.queries, ["snapshot-manifest", RUNTIME_KEY])).toBe(manifest);
  });

  it("returns the same clientState when there is nothing private to do", () => {
    const clientState = {
      mutations: [],
      queries: [entry(["repos", AUTH_KEY], [publicRepo])],
    } as PersistedClient["clientState"];

    const result = applyPrivatePolicy(clientState, CATALOG);

    expect(result.stripped).toBe(false);
    expect(result.clientState).toBe(clientState);
  });

  it("keeps the other dehydrated state fields when it rebuilds an entry", () => {
    const clientState = {
      mutations: [],
      queries: [entry(["repos", AUTH_KEY], CATALOG, { isInvalidated: true, dataUpdateCount: 7 })],
    } as PersistedClient["clientState"];

    const { clientState: out } = applyPrivatePolicy(clientState, CATALOG);
    const rebuilt = out.queries[0];

    expect(rebuilt).not.toBe(clientState.queries[0]);
    expect(rebuilt.state.isInvalidated).toBe(true);
    expect(rebuilt.state.dataUpdateCount).toBe(7);
    expect(rebuilt.queryHash).toBe(clientState.queries[0].queryHash);
  });
});

describe("private content policy · against a real QueryClient", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("does not corrupt the in-memory cache that dehydrate handed out", () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(["repos", AUTH_KEY], CATALOG);
    queryClient.setQueryData(["commits", "mafhper", "segredo", AUTH_KEY], { private: true });

    const dehydrated = dehydrate(queryClient, {
      shouldDehydrateQuery: (query) => shouldPersistQuery(query),
    });
    const catalog = queryClient.getQueryData<RepositoryRef[]>(["repos", AUTH_KEY]);
    const { clientState, stripped } = applyPrivatePolicy(dehydrated, catalog);

    expect(stripped).toBe(true);
    const persistedRepos = stateOf(clientState.queries, ["repos", AUTH_KEY]) as RepositoryRef[];
    expect(persistedRepos).toHaveLength(1);
    expect(persistedRepos[0]?.isPrivate).toBe(false);

    // The live cache still holds both repositories — this is exactly what
    // filtering inside `shouldDehydrateQuery` would have destroyed.
    expect(queryClient.getQueryData<RepositoryRef[]>(["repos", AUTH_KEY])).toHaveLength(2);
    expect(queryClient.getQueryData(["commits", "mafhper", "segredo", AUTH_KEY])).toEqual({ private: true });

    queryClient.clear();
  });
});
