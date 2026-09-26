import { afterEach, describe, expect, it, vi } from "vitest";
import { diagnoseToken, fetchAccessibleRepos, validateToken } from "./github";

const fakeClassicToken = `${["ghp", "_"].join("")}${"a".repeat(36)}`;
const fakeShortToken = `${["ghp", "_"].join("")}test`;

/** Mock response with the `headers.get("link")` that the paged listing reads. */
function jsonResponse(body: unknown, headers: Record<string, string> = {}): Response {
  const lowercased = new Map(Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value]));
  return {
    ok: true,
    status: 200,
    json: async () => body,
    headers: { get: (name: string) => lowercased.get(name.toLowerCase()) ?? null },
  } as unknown as Response;
}

describe("fetchAccessibleRepos", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns public and private repositories from a single visibility=all call", async () => {
    const urls: string[] = [];
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      urls.push(String(input));
      return jsonResponse([repoPayload("push_"), repoPayload("segredo", { private: true })]);
    });

    const repos = await fetchAccessibleRepos(fakeShortToken);

    // `/user/repos?visibility=all` is the only endpoint that returns private
    // repositories, so the default path must not filter them out.
    expect(urls).toHaveLength(1);
    expect(urls[0]).toContain("visibility=all");
    expect(repos.map((repo) => repo.fullName)).toEqual(["mafhper/push_", "mafhper/segredo"]);
    expect(repos[1]?.isPrivate).toBe(true);
    expect(repos[0]?.license).toBe("MIT");
    expect(repos[0]?.isFork).toBe(false);
    expect(repos[0]?.forkOf).toBeNull();
  });

  it("unions the public listing and deduplicates by id when private repositories are requested", async () => {
    const urls: string[] = [];
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      urls.push(url);
      if (url.includes("visibility=all")) {
        return jsonResponse([repoPayload("push_"), repoPayload("segredo", { private: true })]);
      }
      // The public listing can lag behind the private one; the union must not
      // duplicate what `visibility=all` already returned.
      return jsonResponse([repoPayload("push_"), repoPayload("outro")]);
    });

    const repos = await fetchAccessibleRepos(fakeShortToken, { includePrivate: true });

    expect(urls).toHaveLength(2);
    expect(urls.filter((url) => url.includes("visibility=all"))).toHaveLength(1);
    expect(urls.filter((url) => url.includes("visibility=public"))).toHaveLength(1);
    expect(repos.map((repo) => repo.fullName)).toEqual(["mafhper/push_", "mafhper/segredo", "mafhper/outro"]);
  });

  it("follows the Link header to the next page", async () => {
    const urls: string[] = [];
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      urls.push(url);
      if (url.includes("page=2")) {
        return jsonResponse([repoPayload("pagina2")]);
      }
      return jsonResponse([repoPayload("pagina1")], {
        link: '<https://api.github.com/user/repos?per_page=100&page=2>; rel="next", <https://api.github.com/user/repos?per_page=100&page=9>; rel="last"',
      });
    });

    const repos = await fetchAccessibleRepos(fakeShortToken);

    expect(urls).toHaveLength(2);
    expect(urls[1]).toContain("page=2");
    // `visibility` must survive pagination.
    expect(urls[1]).toContain("visibility=all");
    expect(repos.map((repo) => repo.fullName)).toEqual(["mafhper/pagina1", "mafhper/pagina2"]);
  });

  it("stops walking pages at the cap instead of looping on a self-referencing Link", async () => {
    const urls: string[] = [];
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      urls.push(url);
      const next = new URL(url).searchParams.get("page") ?? "1";
      return jsonResponse([repoPayload("loop")], {
        link: `<https://api.github.com/user/repos?per_page=100&page=${Number(next) + 1}>; rel="next"`,
      });
    });

    const repos = await fetchAccessibleRepos(fakeShortToken);

    expect(urls).toHaveLength(10);
    expect(repos).toHaveLength(1);
  });

  it("keeps the private list when the public listing fails", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes("visibility=public")) {
        return { ok: false, status: 404 } as Response;
      }
      return jsonResponse([repoPayload("segredo", { private: true })]);
    });

    const repos = await fetchAccessibleRepos(fakeShortToken, { includePrivate: true });

    expect(repos.map((repo) => repo.fullName)).toEqual(["mafhper/segredo"]);
  });

  it("returns nothing instead of throwing when the listing is refused", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({ ok: false, status: 401 } as Response);

    await expect(fetchAccessibleRepos(fakeShortToken)).resolves.toEqual([]);
  });
});

describe("fetchAccessibleRepos · fork upstream", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("resolves the upstream with one call to the individual endpoint, because the listing omits parent", async () => {
    const urls: string[] = [];
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      urls.push(url);
      if (url.includes("/user/repos")) {
        return jsonResponse([forkListingPayload()]);
      }
      if (url.includes("/repos/mafhper/markdown-editor-donvito")) {
        return jsonResponse({
          ...forkListingPayload(),
          parent: { full_name: "donvito/markdown-editor", html_url: "https://github.com/donvito/markdown-editor" },
        });
      }
      return { ok: false, status: 404 } as Response;
    });

    const repos = await fetchAccessibleRepos(fakeShortToken);

    expect(urls.some((url) => url.includes("/repos/mafhper/markdown-editor-donvito"))).toBe(true);
    expect(repos[0]?.isFork).toBe(true);
    expect(repos[0]?.forkOf).toEqual({
      fullName: "donvito/markdown-editor",
      htmlUrl: "https://github.com/donvito/markdown-editor",
    });
  });

  it("keeps forkOf null when the upstream cannot be resolved instead of inventing one", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes("/user/repos")) {
        return jsonResponse([forkListingPayload()]);
      }
      // Token without repo scope, or the repo is gone: the upstream call fails.
      return { ok: false, status: 403 } as Response;
    });

    const repos = await fetchAccessibleRepos(fakeShortToken);

    expect(repos).toHaveLength(1);
    expect(repos[0]?.isFork).toBe(true);
    expect(repos[0]?.forkOf).toBeNull();
  });

  it("falls back to the fork network root (source) when there is no immediate parent", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes("/user/repos")) {
        return jsonResponse([forkListingPayload()]);
      }
      return jsonResponse({ ...forkListingPayload(), source: { full_name: "upstream/root" } });
    });

    const repos = await fetchAccessibleRepos(fakeShortToken);

    expect(repos[0]?.forkOf).toEqual({
      fullName: "upstream/root",
      htmlUrl: "https://github.com/upstream/root",
    });
  });

  it("spends no upstream call for a repository that is not a fork", async () => {
    const urls: string[] = [];
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      urls.push(url);
      return jsonResponse([repoPayload()]);
    });

    const repos = await fetchAccessibleRepos(fakeShortToken);

    expect(urls).toHaveLength(1);
    expect(repos[0]?.forkOf).toBeNull();
  });
});

describe("validateToken", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("classifies a 403 response as rate limited", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      status: 403,
    } as Response);

    await expect(validateToken(fakeClassicToken)).resolves.toEqual({
      login: "",
      avatarUrl: "",
      error: "rate_limited",
    });
  });

  it("classifies a 401 response as an invalid token", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      status: 401,
    } as Response);

    await expect(validateToken(fakeClassicToken)).resolves.toEqual({
      login: "",
      avatarUrl: "",
      error: "invalid_token",
    });
  });
});

describe("diagnoseToken", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("reports Dependabot access when the probe succeeds", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.endsWith("/user")) {
        return jsonResponse({ login: "mafhper" });
      }
      if (url.endsWith("/rate_limit")) {
        return jsonResponse({ resources: { core: { remaining: 42, limit: 5000, reset: 1780000000 } } });
      }
      if (url.includes("/user/repos")) {
        return jsonResponse([repoPayload()]);
      }
      if (url.includes("/dependabot/alerts")) {
        return jsonResponse([]);
      }
      return { ok: false, status: 404 } as Response;
    });

    await expect(diagnoseToken(fakeClassicToken)).resolves.toMatchObject({
      token: "valid",
      accessibleRepoCount: 1,
      privateRepoCount: 0,
      dependabotProbe: { status: "available", repoFullName: "mafhper/push_" },
    });
  });

  it("reports how many private repositories the token scope can see", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.endsWith("/user")) {
        return jsonResponse({ login: "mafhper" });
      }
      if (url.endsWith("/rate_limit")) {
        return jsonResponse({ resources: { core: { remaining: 42, limit: 5000, reset: 1780000000 } } });
      }
      if (url.includes("/user/repos")) {
        return jsonResponse([
          repoPayload("push_"),
          repoPayload("segredo", { private: true }),
          repoPayload("interno", { private: true }),
        ]);
      }
      if (url.includes("/dependabot/alerts")) {
        return jsonResponse([]);
      }
      return { ok: false, status: 404 } as Response;
    });

    const diagnostics = await diagnoseToken(fakeClassicToken);

    expect(diagnostics.accessibleRepoCount).toBe(3);
    expect(diagnostics.privateRepoCount).toBe(2);
  });

  it("reports missing Dependabot permissions when the probe is forbidden", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.endsWith("/user")) {
        return jsonResponse({ login: "mafhper" });
      }
      if (url.endsWith("/rate_limit")) {
        return jsonResponse({ resources: { core: { remaining: 42, limit: 5000, reset: 1780000000 } } });
      }
      if (url.includes("/user/repos")) {
        return jsonResponse([repoPayload()]);
      }
      if (url.includes("/dependabot/alerts")) {
        return { ok: false, status: 403 } as Response;
      }
      return { ok: false, status: 404 } as Response;
    });

    await expect(diagnoseToken(fakeClassicToken)).resolves.toMatchObject({
      token: "valid",
      dependabotProbe: { status: "forbidden" },
    });
  });

  it("continues probing when the first repository has no Dependabot alerts endpoint", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.endsWith("/user")) {
        return jsonResponse({ login: "mafhper" });
      }
      if (url.endsWith("/rate_limit")) {
        return jsonResponse({ resources: { core: { remaining: 42, limit: 5000, reset: 1780000000 } } });
      }
      if (url.includes("/user/repos")) {
        return jsonResponse([repoPayload("empty"), repoPayload("push_")]);
      }
      if (url.includes("/repos/mafhper/empty/dependabot/alerts")) {
        return { ok: false, status: 404 } as Response;
      }
      if (url.includes("/repos/mafhper/push_/dependabot/alerts")) {
        return jsonResponse([]);
      }
      return { ok: false, status: 404 } as Response;
    });

    await expect(diagnoseToken(fakeClassicToken)).resolves.toMatchObject({
      token: "valid",
      accessibleRepoCount: 2,
      dependabotProbe: { status: "available", repoFullName: "mafhper/push_" },
    });
  });
});

/** Stable per-name id, so the `visibility=all` ∪ `visibility=public` dedup is meaningful. */
function repoIdFor(name: string): number {
  let hash = 7;
  for (const character of name) {
    hash = (hash * 31 + character.charCodeAt(0)) % 100000;
  }
  return hash;
}

function repoPayload(name = "push_", overrides: Record<string, unknown> = {}) {
  return {
    id: repoIdFor(name),
    owner: { login: "mafhper" },
    name,
    full_name: `mafhper/${name}`,
    default_branch: "main",
    private: false,
    archived: false,
    html_url: `https://github.com/mafhper/${name}`,
    description: "Public repo",
    license: { spdx_id: "MIT", name: "MIT License" },
    language: "TypeScript",
    stargazers_count: 1,
    forks_count: 0,
    open_issues_count: 0,
    watchers_count: 1,
    pushed_at: "2026-03-19T12:00:00.000Z",
    size: 120,
    topics: [],
    created_at: "2026-01-01T12:00:00.000Z",
    updated_at: "2026-03-19T12:00:00.000Z",
    ...overrides,
  };
}

/**
 * Payload as GitHub's **listing** actually returns it: compact schema, with
 * `fork: true` and **no** `parent`/`source` (82 fields, verified 2026-09-26
 * against the live API). This fixture exists to lock that down — a synthetic
 * payload carrying `parent` would pass even if production never received the
 * field.
 */
function forkListingPayload() {
  return { ...repoPayload("markdown-editor-donvito"), fork: true, forks_count: 0 };
}
