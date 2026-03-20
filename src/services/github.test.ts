import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchAccessibleRepos } from "./github";

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

    const repos = await fetchAccessibleRepos("ghp_test");

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(repos).toHaveLength(1);
    expect(repos[0]?.fullName).toBe("mafhper/push_");
    expect(repos[0]?.license).toBe("MIT");
  });
});
