import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchPublicProfileRepos, fetchUserRepos } from "./github-public";

/**
 * CA-2: the published runtime is public by construction.
 *
 * Two guarantees are asserted here, because together they are what keeps a
 * private repository out of GitHub Pages:
 *  1. the public service never sends a credential, so it can only ever see what
 *     GitHub exposes anonymously;
 *  2. it never performs the per-repository enrichment that local discovery uses
 *     to resolve fork upstreams, so a public page cannot turn into an
 *     authenticated crawl.
 *
 * The publishing barrier itself (a private repository listed in the snapshot
 * config) is proved end to end in `src/test/snapshot-privacy.test.ts`.
 */

type FetchCall = { url: string; init: RequestInit | undefined };

/**
 * Host of a fetched URL, or `null` when it cannot be parsed. A base is supplied
 * so the relative paths of the snapshot service resolve instead of throwing.
 */
function hostOf(url: string): string | null {
  try {
    return new URL(url, "https://localhost").host;
  } catch {
    return null;
  }
}

describe("public GitHub service", () => {
  let calls: FetchCall[];
  let payloadFor: (url: string) => unknown;

  beforeEach(() => {
    calls = [];
    payloadFor = () => ({});
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      calls.push({ url, init });
      const payload = payloadFor(url);
      return {
        ok: true,
        status: 200,
        json: async () => payload,
        text: async () => JSON.stringify(payload),
      } as Response;
    }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("lists a public profile without ever sending a credential", async () => {
    payloadFor = (url) => (url.includes("/users/dev/repos")
      ? [
          {
            id: 1,
            name: "open-project",
            full_name: "dev/open-project",
            owner: { login: "dev" },
            private: false,
            fork: false,
            html_url: "https://github.com/dev/open-project",
            description: "Open source helper",
            stargazers_count: 3,
            language: "TypeScript",
          },
        ]
      : {});

    const repos = await fetchPublicProfileRepos("dev");

    expect(repos).toHaveLength(1);
    expect(repos[0]?.fullName).toBe("dev/open-project");
    expect(repos[0]?.isPrivate).toBe(false);

    for (const call of calls) {
      const headers = (call.init?.headers ?? {}) as Record<string, string>;
      expect(headers.Authorization).toBeUndefined();
      expect(headers.authorization).toBeUndefined();
    }
  });

  it("reads the published snapshot instead of an authenticated listing", async () => {
    const overview = {
      generatedAt: "2026-09-20T10:00:00Z",
      featuredRepo: "dev/open-project",
      repos: [
        {
          repo: {
            id: 1,
            owner: "dev",
            name: "open-project",
            fullName: "dev/open-project",
            isPrivate: false,
            isFork: false,
            forkOf: null,
            htmlUrl: "https://github.com/dev/open-project",
          },
          health: null,
          stats: {},
          availability: {},
        },
      ],
    };
    payloadFor = (url) => (url.endsWith("data/overview.json") ? overview : {});

    const repos = await fetchUserRepos();

    expect(repos.map((repo) => repo.fullName)).toEqual(["dev/open-project"]);
    // The snapshot is static data: the GitHub API host is never contacted.
    // Comparing the parsed host instead of a substring keeps the assertion
    // honest, since a substring also matches lookalike hosts.
    expect(calls.filter((call) => hostOf(call.url) === "api.github.com")).toEqual([]);
  });
});
