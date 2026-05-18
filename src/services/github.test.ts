import { afterEach, describe, expect, it, vi } from "vitest";
import { diagnoseToken, fetchAccessibleRepos, validateToken } from "./github";

const fakeClassicToken = `${["ghp", "_"].join("")}${"a".repeat(36)}`;
const fakeShortToken = `${["ghp", "_"].join("")}test`;

describe("fetchAccessibleRepos", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns only public repositories and maps the license field", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ([
        {
          id: 1,
          owner: { login: "mafhper" },
          name: "push_",
          full_name: "mafhper/push_",
          default_branch: "main",
          private: false,
          archived: false,
          html_url: "https://github.com/mafhper/push_",
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
        },
        {
          id: 2,
          owner: { login: "mafhper" },
          name: "private-repo",
          full_name: "mafhper/private-repo",
          default_branch: "main",
          private: true,
          archived: false,
          html_url: "https://github.com/mafhper/private-repo",
          description: "Private repo",
          license: { spdx_id: "NOASSERTION", name: "Private" },
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
        },
      ]),
    } as Response);

    const repos = await fetchAccessibleRepos(fakeShortToken);

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(repos).toHaveLength(1);
    expect(repos[0]?.fullName).toBe("mafhper/push_");
    expect(repos[0]?.license).toBe("MIT");
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
        return { ok: true, status: 200, json: async () => ({ login: "mafhper" }) } as Response;
      }
      if (url.endsWith("/rate_limit")) {
        return { ok: true, status: 200, json: async () => ({ resources: { core: { remaining: 42, limit: 5000, reset: 1780000000 } } }) } as Response;
      }
      if (url.includes("/user/repos")) {
        return { ok: true, status: 200, json: async () => ([repoPayload()]) } as Response;
      }
      if (url.includes("/dependabot/alerts")) {
        return { ok: true, status: 200, json: async () => ([]) } as Response;
      }
      return { ok: false, status: 404 } as Response;
    });

    await expect(diagnoseToken(fakeClassicToken)).resolves.toMatchObject({
      token: "valid",
      accessibleRepoCount: 1,
      dependabotProbe: { status: "available", repoFullName: "mafhper/push_" },
    });
  });

  it("reports missing Dependabot permissions when the probe is forbidden", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.endsWith("/user")) {
        return { ok: true, status: 200, json: async () => ({ login: "mafhper" }) } as Response;
      }
      if (url.endsWith("/rate_limit")) {
        return { ok: true, status: 200, json: async () => ({ resources: { core: { remaining: 42, limit: 5000, reset: 1780000000 } } }) } as Response;
      }
      if (url.includes("/user/repos")) {
        return { ok: true, status: 200, json: async () => ([repoPayload()]) } as Response;
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
        return { ok: true, status: 200, json: async () => ({ login: "mafhper" }) } as Response;
      }
      if (url.endsWith("/rate_limit")) {
        return { ok: true, status: 200, json: async () => ({ resources: { core: { remaining: 42, limit: 5000, reset: 1780000000 } } }) } as Response;
      }
      if (url.includes("/user/repos")) {
        return { ok: true, status: 200, json: async () => ([repoPayload("empty"), repoPayload("push_")]) } as Response;
      }
      if (url.includes("/repos/mafhper/empty/dependabot/alerts")) {
        return { ok: false, status: 404 } as Response;
      }
      if (url.includes("/repos/mafhper/push_/dependabot/alerts")) {
        return { ok: true, status: 200, json: async () => ([]) } as Response;
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

function repoPayload(name = "push_") {
  return {
    id: 1,
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
  };
}
