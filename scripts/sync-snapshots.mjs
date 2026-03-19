import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CONFIG_PATH = path.join(ROOT, "data", "repositories.json");
const OUTPUT_ROOT = path.join(ROOT, process.env.SNAPSHOT_OUTPUT || "public/data");
const OUTPUT_REPOS = path.join(OUTPUT_ROOT, "repos");

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function loadEnvFile() {
  const envPath = path.join(ROOT, ".env.local");
  try {
    const content = await fs.readFile(envPath, "utf8");
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const separator = trimmed.indexOf("=");
      if (separator < 0) continue;
      const key = trimmed.slice(0, separator).trim();
      const value = trimmed.slice(separator + 1).trim().replace(/^['"]|['"]$/g, "");
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // Optional local-only credentials file.
  }
}

function createAvailability(available, source, reason) {
  return {
    available,
    source,
    ...(reason ? { reason } : {}),
  };
}

function mapRepo(data) {
  return {
    id: data.id,
    owner: data.owner.login,
    name: data.name,
    fullName: data.full_name,
    defaultBranch: data.default_branch || "main",
    isPrivate: Boolean(data.private),
    archived: Boolean(data.archived),
    htmlUrl: data.html_url,
    description: data.description,
    license: data.license?.spdx_id && data.license.spdx_id !== "NOASSERTION" ? data.license.spdx_id : data.license?.name || null,
    language: data.language,
    stars: data.stargazers_count || 0,
    forks: data.forks_count || 0,
    openIssues: data.open_issues_count || 0,
    watchers: data.watchers_count || 0,
    lastPushAt: data.pushed_at || "",
    size: data.size || 0,
    topics: data.topics || [],
    createdAt: data.created_at || "",
    updatedAt: data.updated_at || "",
    socialImageUrl: `https://opengraph.githubassets.com/1/${data.owner.login}/${data.name}`,
  };
}

function mapCommit(commit) {
  return {
    sha: commit.sha,
    message: commit.commit?.message?.split("\n")[0] || "Commit",
    authorLogin: commit.author?.login || commit.commit?.author?.name || "unknown",
    authorAvatar: commit.author?.avatar_url || "",
    date: commit.commit?.author?.date || "",
    htmlUrl: commit.html_url,
  };
}

function mapWorkflowRun(run) {
  const startedAt = run.run_started_at || run.created_at || run.updated_at;
  const updatedAt = run.updated_at || startedAt;
  return {
    id: run.id,
    workflowName: run.name || "Workflow",
    status: run.status || "",
    conclusion: run.conclusion,
    branch: run.head_branch || "",
    event: run.event,
    startedAt,
    updatedAt,
    durationMs: startedAt ? new Date(updatedAt).getTime() - new Date(startedAt).getTime() : 0,
    htmlUrl: run.html_url,
  };
}

function mapContributor(contributor) {
  return {
    login: contributor.login || "unknown",
    avatarUrl: contributor.avatar_url || "",
    contributions: contributor.contributions || 0,
  };
}

function mapDependabot(alert) {
  return {
    id: alert.number,
    severity: alert.security_advisory?.severity || "low",
    state: alert.state,
    packageName: alert.dependency?.package?.name || "unknown",
    ecosystem: alert.dependency?.package?.ecosystem || "",
    manifestPath: alert.dependency?.manifest_path || "",
    createdAt: alert.created_at,
    fixedIn: alert.security_advisory?.vulnerabilities?.[0]?.first_patched_version?.identifier || null,
    htmlUrl: alert.html_url,
    cveId: alert.security_advisory?.cve_id || null,
    summary: alert.security_advisory?.summary || "Security alert",
  };
}

function calculateHealth(repo, runs, alerts) {
  let score = 100;
  const now = Date.now();
  const lastPush = repo.lastPushAt ? new Date(repo.lastPushAt).getTime() : 0;
  const stalenessDays = lastPush ? Math.floor((now - lastPush) / 86400000) : 999;
  const recentRuns = runs.slice(0, 10);
  const successRuns = recentRuns.filter((run) => run.conclusion === "success").length;
  const failedRuns7d = runs.filter((run) => {
    const started = new Date(run.startedAt).getTime();
    return run.conclusion === "failure" && (now - started) < 7 * 86400000;
  }).length;
  const successRate = recentRuns.length ? successRuns / recentRuns.length : null;
  const criticalAlerts = alerts.filter((alert) => alert.severity === "critical").length;
  const highAlerts = alerts.filter((alert) => alert.severity === "high").length;

  if (successRate !== null && successRate < 0.5) score -= 20;
  else if (successRate !== null && successRate < 0.8) score -= 10;
  if (failedRuns7d > 3) score -= 10;
  else if (failedRuns7d > 0) score -= 5;
  if (criticalAlerts > 0) score -= 35;
  if (highAlerts > 0) score -= 15;
  if (alerts.length > 5) score -= 5;
  if (stalenessDays > 90) score -= 15;
  else if (stalenessDays > 30) score -= 10;
  else if (stalenessDays > 14) score -= 5;
  if (repo.openIssues > 50) score -= 5;

  score = Math.max(0, Math.min(100, score));
  let status = "healthy";
  if (score < 40) status = "critical";
  else if (score < 70) status = "warning";

  return {
    score,
    status,
    lastCommitAt: repo.lastPushAt || null,
    workflowSuccessRate: successRate !== null ? Math.round(successRate * 100) : null,
    failedRuns7d,
    dependabotOpenCount: alerts.length,
    dependabotCriticalCount: criticalAlerts,
    stalenessDays,
  };
}

async function fetchGitHub(pathname, token) {
  const response = await fetch(`https://api.github.com${pathname}`, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "push_-snapshot-sync",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!response.ok) {
    throw new Error(`${response.status} ${pathname} ${await response.text()}`);
  }

  if (response.status === 204) return [];
  const raw = await response.text();
  return raw ? JSON.parse(raw) : [];
}

async function fetchOptional(pathname, token) {
  try {
    return await fetchGitHub(pathname, token);
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}

function inferMode(token) {
  return token ? "authenticated" : "public";
}

async function main() {
  await loadEnvFile();
  await ensureDir(OUTPUT_ROOT);
  await ensureDir(OUTPUT_REPOS);

  const config = await readJson(CONFIG_PATH);
  const token = process.env.GH_STATS_TOKEN || process.env.GITHUB_TOKEN || "";
  const generatedBy = process.env.GITHUB_ACTIONS ? "github-actions" : token ? "local" : "seed";
  const generatedAt = new Date().toISOString();
  const dataMode = inferMode(token);
  const repoFiles = {};
  const overviewRepos = [];
  let resolvedFeaturedRepo = "";

  for (const entry of config.repositories) {
    const repoPath = `/repos/${entry.owner}/${entry.repo}`;
    const repoPayload = await fetchOptional(repoPath, token);

    if (repoPayload.error) {
      throw new Error(`Cannot build snapshot for ${entry.owner}/${entry.repo}: ${repoPayload.error}`);
    }

    const repo = mapRepo(repoPayload);
    if (repo.isPrivate) {
      console.log(`Skipping private repository ${repo.fullName}`);
      continue;
    }

    const isEmptyRepository = repo.size === 0 || !repo.lastPushAt;
    const unavailableBecauseEmpty = { error: "Repository has no commits yet." };
    const [commitsPayload, workflowsPayload, languagesPayload, contributorsPayload, dependabotPayload] = isEmptyRepository
      ? await Promise.all([
          Promise.resolve(unavailableBecauseEmpty),
          Promise.resolve(unavailableBecauseEmpty),
          Promise.resolve(unavailableBecauseEmpty),
          Promise.resolve(unavailableBecauseEmpty),
          Promise.resolve(unavailableBecauseEmpty),
        ])
      : await Promise.all([
          fetchOptional(`${repoPath}/commits?per_page=8`, token),
          fetchOptional(`${repoPath}/actions/runs?per_page=12`, token),
          fetchOptional(`${repoPath}/languages`, token),
          fetchOptional(`${repoPath}/contributors?per_page=6`, token),
          token
            ? fetchOptional(`${repoPath}/dependabot/alerts?state=open&per_page=20`, token)
            : Promise.resolve({ error: "Dependabot alerts require authenticated access." }),
        ]);

    const commits = Array.isArray(commitsPayload) ? commitsPayload.map(mapCommit) : [];
    const workflowRuns = Array.isArray(workflowsPayload?.workflow_runs)
      ? workflowsPayload.workflow_runs.map(mapWorkflowRun)
      : [];
    const languages = languagesPayload && !languagesPayload.error ? languagesPayload : {};
    const contributors = Array.isArray(contributorsPayload) ? contributorsPayload.map(mapContributor) : [];
    const alerts = Array.isArray(dependabotPayload) ? dependabotPayload.map(mapDependabot) : [];
    const health = calculateHealth(repo, workflowRuns, alerts);

    const availability = {
      repository: createAvailability(true, "public-api"),
      commits: Array.isArray(commitsPayload)
        ? createAvailability(true, "public-api")
        : createAvailability(false, "public-api", commitsPayload.error),
      workflowRuns: Array.isArray(workflowsPayload?.workflow_runs)
        ? createAvailability(true, "public-api")
        : createAvailability(false, "public-api", workflowsPayload.error),
      languages: !languagesPayload?.error
        ? createAvailability(true, "public-api")
        : createAvailability(false, "public-api", languagesPayload.error),
      contributors: Array.isArray(contributorsPayload)
        ? createAvailability(true, "public-api")
        : createAvailability(false, "public-api", contributorsPayload.error),
      dependabotAlerts: Array.isArray(dependabotPayload)
        ? createAvailability(true, token ? "authenticated-api" : "public-api")
        : createAvailability(false, token ? "authenticated-api" : "public-api", dependabotPayload.error),
    };

    const detail = {
      status: {
        generatedAt,
        generatedBy,
        dataMode,
      },
      featured: config.featuredRepo === repo.fullName,
      repo,
      health,
      commits,
      workflowRuns,
      alerts,
      languages,
      contributors,
      availability,
    };

    const fileName = `${entry.owner}--${entry.repo}.json`;
    repoFiles[repo.fullName] = `data/repos/${fileName}`;
    if (!resolvedFeaturedRepo || config.featuredRepo === repo.fullName) {
      resolvedFeaturedRepo = repo.fullName;
    }
    overviewRepos.push({
      repo,
      health,
      stats: {
        totalCommitsTracked: commits.length,
        contributorsTracked: contributors.length,
        languagesTracked: Object.keys(languages).length,
        latestWorkflowConclusion: workflowRuns[0]?.conclusion || null,
        openAlertCount: alerts.length,
      },
      availability,
    });

    await fs.writeFile(path.join(OUTPUT_REPOS, fileName), JSON.stringify(detail, null, 2), "utf8");
  }

  const status = {
    generatedAt,
    generatedBy,
    dataMode,
  };

  const manifest = {
    site: config.site,
    status,
    featuredRepo: resolvedFeaturedRepo,
    routes: {
      promo: ["/", "/technology", "/faq", "/about"],
      app: ["/app", "/app/repo/:owner/:repo", "/app/alerts", "/app/settings"],
    },
    repoFiles,
  };

  const overview = {
    status,
    featuredRepo: resolvedFeaturedRepo,
    repos: overviewRepos,
  };

  await fs.writeFile(path.join(OUTPUT_ROOT, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");
  await fs.writeFile(path.join(OUTPUT_ROOT, "overview.json"), JSON.stringify(overview, null, 2), "utf8");

  console.log(`Snapshots written to ${OUTPUT_ROOT}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
