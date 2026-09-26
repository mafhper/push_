import { spawn } from "node:child_process";
import { createServer, type Server } from "node:http";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

/**
 * CA-8: the publishing barrier.
 *
 * `scripts/sync-snapshots.mjs` is the only path that writes the public runtime
 * data, so the invariant "no private repository is ever published" is proved
 * here end to end: the real script runs as a child process against a stub GitHub
 * API that reports one public and one private repository, and the generated
 * snapshots must contain the public repository and no trace of the private one.
 *
 * The test uses `SNAPSHOT_CONFIG`, `GITHUB_API_BASE` and `SNAPSHOT_OUTPUT`, so it
 * never touches `data/repositories.json` nor `public/data`.
 */

const PUBLIC_FULL_NAME = "acme/open-project";
const PRIVATE_FULL_NAME = "acme/secret-project";

type StubPayload = Record<string, unknown>;

function repoPayload(fullName: string, isPrivate: boolean): StubPayload {
  const [owner, name] = fullName.split("/");
  return {
    id: isPrivate ? 202 : 101,
    name,
    full_name: fullName,
    owner: { login: owner },
    private: isPrivate,
    archived: false,
    fork: false,
    default_branch: "main",
    html_url: `https://github.com/${fullName}`,
    description: isPrivate ? "Internal roadmap" : "Open source helper",
    license: { spdx_id: "MIT" },
    language: "TypeScript",
    stargazers_count: 12,
    forks_count: 3,
    open_issues_count: 1,
    watchers_count: 12,
    pushed_at: "2026-09-20T10:00:00Z",
    size: 4096,
    topics: ["tooling"],
    created_at: "2024-01-05T10:00:00Z",
    updated_at: "2026-09-20T10:00:00Z",
  };
}

function commitPayload() {
  return {
    sha: "abc1234",
    commit: { message: "chore: ship it", author: { name: "Dev", date: "2026-09-20T09:00:00Z" } },
    author: { login: "dev", avatar_url: "" },
    html_url: "https://github.com/acme/open-project/commit/abc1234",
  };
}

function runPayload(fullName: string) {
  return {
    total_count: 1,
    workflow_runs: [
      {
        id: 900,
        name: "CI",
        status: "completed",
        conclusion: "success",
        created_at: "2026-09-20T08:00:00Z",
        updated_at: "2026-09-20T08:05:00Z",
        html_url: `https://github.com/${fullName}/actions/runs/900`,
        head_branch: "main",
        event: "push",
        run_number: 12,
      },
    ],
  };
}

describe("published snapshot privacy barrier", () => {
  let server: Server;
  let apiBase = "";
  let workDir = "";
  let stdout = "";
  let stderr = "";
  let exitCode: number | null = null;

  beforeAll(async () => {
    server = createServer((request, response) => {
      const url = new URL(request.url ?? "/", "http://localhost");
      const send = (payload: unknown, status = 200) => {
        response.writeHead(status, { "Content-Type": "application/json" });
        response.end(JSON.stringify(payload));
      };

      if (url.pathname === "/repos/acme/open-project") return send(repoPayload(PUBLIC_FULL_NAME, false));
      if (url.pathname === "/repos/acme/secret-project") return send(repoPayload(PRIVATE_FULL_NAME, true));
      if (url.pathname.startsWith("/repos/acme/open-project/")) {
        if (url.pathname.endsWith("/commits?per_page=8")) return send([commitPayload()]);
        if (url.pathname.endsWith("/actions/runs?per_page=12")) return send(runPayload(PUBLIC_FULL_NAME));
        if (url.pathname.endsWith("/languages")) return send({ TypeScript: 1024 });
        if (url.pathname.endsWith("/contributors?per_page=6")) {
          return send([{ login: "dev", contributions: 42, avatar_url: "" }]);
        }
        if (url.pathname.startsWith("/repos/acme/open-project/dependabot")) return send([]);
        return send({});
      }
      // Anything unexpected must not silently look like data.
      return send({ message: "not found" }, 404);
    });

    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Stub API did not bind a port.");
    apiBase = `http://127.0.0.1:${address.port}`;

    workDir = await mkdtemp(path.join(tmpdir(), "push_-snapshot-barrier-"));
    await writeFile(
      path.join(workDir, "repositories.json"),
      JSON.stringify(
        {
          site: { name: "push_", tagline: "Test", description: "Test" },
          featuredRepo: PUBLIC_FULL_NAME,
          repositories: [
            { owner: "acme", repo: "open-project" },
            { owner: "acme", repo: "secret-project" },
          ],
        },
        null,
        2,
      ),
      "utf8",
    );

    exitCode = await new Promise<number>((resolve) => {
      const child = spawn(process.execPath, ["scripts/sync-snapshots.mjs"], {
        cwd: path.resolve(__dirname, "../.."),
        env: {
          ...process.env,
          SNAPSHOT_CONFIG: path.join(workDir, "repositories.json"),
          SNAPSHOT_OUTPUT: workDir,
          GITHUB_API_BASE: apiBase,
          GH_STATS_TOKEN: "",
          GITHUB_TOKEN: "",
        },
      });
      child.stdout.on("data", (chunk) => { stdout += String(chunk); });
      child.stderr.on("data", (chunk) => { stderr += String(chunk); });
      child.on("close", (code) => resolve(code ?? -1));
    });
  }, 60_000);

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    if (workDir) await rm(workDir, { recursive: true, force: true });
  });

  it("publishes the public repository and refuses the private one", async () => {
    expect(exitCode).toBe(0);
    expect(stderr).toContain("PRIVACY BARRIER");
    expect(stderr).toContain(PRIVATE_FULL_NAME);

    const overview = JSON.parse(await readFile(path.join(workDir, "overview.json"), "utf8"));
    const publishedNames: string[] = overview.repos.map(
      (entry: { repo: { fullName: string } }) => entry.repo.fullName,
    );
    expect(publishedNames).toContain(PUBLIC_FULL_NAME);
    expect(publishedNames).not.toContain(PRIVATE_FULL_NAME);
    // A private entry cannot even become the featured repository.
    expect(overview.featuredRepo).toBe(PUBLIC_FULL_NAME);
  });

  it("leaves no private trace in any generated file", async () => {
    const generatedFiles = await readdir(path.join(workDir, "repos"));
    expect(generatedFiles.some((name) => name.includes("secret-project"))).toBe(false);

    const allFiles = ["manifest.json", "overview.json", ...generatedFiles.map((name) => `repos/${name}`)];
    for (const name of allFiles) {
      const content = await readFile(path.join(workDir, name), "utf8");
      expect(content).not.toContain(PRIVATE_FULL_NAME);
      expect(content).not.toContain("secret-project");
      expect(content).not.toContain("Internal roadmap");
    }
  });
});
