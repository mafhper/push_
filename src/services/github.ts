import { SITE_BASE_URL } from "@/config/site";
import type {
  CommitSummary,
  ContributorSummary,
  DependabotAlert,
  LanguageBreakdown,
  RateLimitInfo,
  RepoSnapshotDetail,
  RepositoryRef,
  SnapshotManifest,
  SnapshotOverview,
  WorkflowRun,
} from "@/types";

const GITHUB_API_BASE = "https://api.github.com";

let manifestCache: SnapshotManifest | null = null;
let overviewCache: SnapshotOverview | null = null;
const repoCache = new Map<string, RepoSnapshotDetail>();

type GitHubFailure = { error: string };

type GitHubOwner = {
  login: string;
};

type GitHubRepo = {
  id: number;
  owner: GitHubOwner;
  name: string;
  full_name: string;
  default_branch?: string;
  private?: boolean;
  archived?: boolean;
  html_url: string;
  description: string | null;
  license?: {
    spdx_id?: string | null;
    name?: string | null;
  } | null;
  language: string | null;
  stargazers_count?: number;
  forks_count?: number;
  open_issues_count?: number;
  watchers_count?: number;
  pushed_at?: string;
  size?: number;
  topics?: string[];
  created_at?: string;
  updated_at?: string;
};

type GitHubCommit = {
  sha: string;
  commit?: {
    message?: string;
    author?: {
      name?: string;
      date?: string;
    };
  };
  author?: {
    login?: string;
    avatar_url?: string;
  } | null;
  html_url: string;
};

type GitHubWorkflowRun = {
  id: number;
  name?: string;
  status?: string;
  conclusion: string | null;
  head_branch?: string;
  event?: string;
  run_started_at?: string;
  created_at?: string;
  updated_at?: string;
  html_url: string;
};

type GitHubContributor = {
  login?: string;
  avatar_url?: string;
  contributions?: number;
};

type GitHubDependabotAlert = {
  number: number;
  state: string;
  created_at: string;
  html_url: string;
  dependency?: {
    manifest_path?: string;
    package?: {
      name?: string;
      ecosystem?: string;
    };
  };
  security_advisory?: {
    severity?: DependabotAlert["severity"];
    cve_id?: string | null;
    summary?: string;
    vulnerabilities?: Array<{
      first_patched_version?: {
        identifier?: string;
      };
    }>;
  };
};

type GitHubWorkflowRunsPayload = {
  workflow_runs?: GitHubWorkflowRun[];
};

type GitHubRateLimitPayload = {
  resources?: {
    core?: {
      remaining?: number;
      limit?: number;
      reset?: number;
    };
  };
};

function buildAssetUrl(relativePath: string) {
  const normalizedBase = SITE_BASE_URL.endsWith("/") ? SITE_BASE_URL : `${SITE_BASE_URL}/`;
  return `${normalizedBase}${relativePath.replace(/^\/+/, "")}`;
}

async function readJson<T>(relativePath: string): Promise<T> {
  const response = await fetch(buildAssetUrl(relativePath), {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to load ${relativePath}: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

async function githubRequest<T>(pathname: string, token: string): Promise<T> {
  const response = await fetch(`${GITHUB_API_BASE}${pathname}`, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "push_-local-runtime",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`${response.status} ${pathname}`);
  }

  if (response.status === 204) {
    return [] as T;
  }

  return response.json() as Promise<T>;
}

async function githubOptional<T>(pathname: string, token: string): Promise<T | GitHubFailure> {
  try {
    return await githubRequest<T>(pathname, token);
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}

function isFailure<T>(payload: T | GitHubFailure): payload is GitHubFailure {
  return typeof payload === "object" && payload !== null && "error" in payload;
}

function createAvailability(available: boolean, source: string, reason?: string) {
  return {
    available,
    source,
    ...(reason ? { reason } : {}),
  };
}

function mapRepo(data: GitHubRepo): RepositoryRef {
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

function mapCommit(commit: GitHubCommit): CommitSummary {
  return {
    sha: commit.sha,
    message: commit.commit?.message?.split("\n")[0] || "Commit",
    authorLogin: commit.author?.login || commit.commit?.author?.name || "unknown",
    authorAvatar: commit.author?.avatar_url || "",
    date: commit.commit?.author?.date || "",
    htmlUrl: commit.html_url,
  };
}

function mapWorkflowRun(run: GitHubWorkflowRun): WorkflowRun {
  const startedAt = run.run_started_at || run.created_at || run.updated_at;
  const updatedAt = run.updated_at || startedAt;
  return {
    id: run.id,
    workflowName: run.name || "Workflow",
    status: run.status || "",
    conclusion: run.conclusion,
    branch: run.head_branch || "",
    event: run.event || "",
    startedAt,
    updatedAt,
    durationMs: startedAt ? new Date(updatedAt).getTime() - new Date(startedAt).getTime() : 0,
    htmlUrl: run.html_url,
  };
}

function mapContributor(contributor: GitHubContributor): ContributorSummary {
  return {
    login: contributor.login || "unknown",
    avatarUrl: contributor.avatar_url || "",
    contributions: contributor.contributions || 0,
  };
}

function mapDependabot(alert: GitHubDependabotAlert): DependabotAlert {
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

function calculateHealth(repo: RepositoryRef, runs: WorkflowRun[], alerts: DependabotAlert[]) {
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

  return {
    score,
    status: score < 40 ? "critical" : score < 70 ? "warning" : "healthy",
    lastCommitAt: repo.lastPushAt || null,
    workflowSuccessRate: successRate !== null ? Math.round(successRate * 100) : null,
    failedRuns7d,
    dependabotOpenCount: alerts.length,
    dependabotCriticalCount: criticalAlerts,
    stalenessDays,
  } as RepoSnapshotDetail["health"];
}

function buildLiveStatus() {
  return {
    generatedAt: new Date().toISOString(),
    generatedBy: "local" as const,
    dataMode: "authenticated" as const,
  };
}

async function buildLiveRepoSnapshot(owner: string, repo: string, token: string): Promise<RepoSnapshotDetail> {
  const repoPath = `/repos/${owner}/${repo}`;
  const repoPayload = await githubRequest<GitHubRepo>(repoPath, token);
  const mappedRepo = mapRepo(repoPayload);
  const isEmptyRepository = mappedRepo.size === 0 || !mappedRepo.lastPushAt;
  const unavailableBecauseEmpty = { error: "Repository has no commits yet." };

  const [commitsPayload, workflowsPayload, languagesPayload, contributorsPayload, dependabotPayload] = isEmptyRepository
    ? await Promise.all([
        Promise.resolve<GitHubCommit[] | GitHubFailure>(unavailableBecauseEmpty),
        Promise.resolve<GitHubWorkflowRunsPayload | GitHubFailure>(unavailableBecauseEmpty),
        Promise.resolve<LanguageBreakdown | GitHubFailure>(unavailableBecauseEmpty),
        Promise.resolve<GitHubContributor[] | GitHubFailure>(unavailableBecauseEmpty),
        Promise.resolve<GitHubDependabotAlert[] | GitHubFailure>(unavailableBecauseEmpty),
      ])
    : await Promise.all([
        githubOptional<GitHubCommit[]>(`${repoPath}/commits?per_page=8`, token),
        githubOptional<GitHubWorkflowRunsPayload>(`${repoPath}/actions/runs?per_page=12`, token),
        githubOptional<LanguageBreakdown>(`${repoPath}/languages`, token),
        githubOptional<GitHubContributor[]>(`${repoPath}/contributors?per_page=6`, token),
        githubOptional<GitHubDependabotAlert[]>(`${repoPath}/dependabot/alerts?state=open&per_page=20`, token),
      ]);

  const commits = !isFailure(commitsPayload) ? commitsPayload.map(mapCommit) : [];
  const workflowRuns = !isFailure(workflowsPayload) ? (workflowsPayload.workflow_runs || []).map(mapWorkflowRun) : [];
  const languages = !isFailure(languagesPayload) ? languagesPayload : {};
  const contributors = !isFailure(contributorsPayload) ? contributorsPayload.map(mapContributor) : [];
  const alerts = !isFailure(dependabotPayload) ? dependabotPayload.map(mapDependabot) : [];
  const health = calculateHealth(mappedRepo, workflowRuns, alerts);

  const availability = {
    repository: createAvailability(true, "authenticated-api"),
    commits: isFailure(commitsPayload)
      ? createAvailability(false, "authenticated-api", commitsPayload.error)
      : createAvailability(true, "authenticated-api"),
    workflowRuns: isFailure(workflowsPayload)
      ? createAvailability(false, "authenticated-api", workflowsPayload.error)
      : createAvailability(true, "authenticated-api"),
    languages: isFailure(languagesPayload)
      ? createAvailability(false, "authenticated-api", languagesPayload.error)
      : createAvailability(true, "authenticated-api"),
    contributors: isFailure(contributorsPayload)
      ? createAvailability(false, "authenticated-api", contributorsPayload.error)
      : createAvailability(true, "authenticated-api"),
    dependabotAlerts: isFailure(dependabotPayload)
      ? createAvailability(false, "authenticated-api", dependabotPayload.error)
      : createAvailability(true, "authenticated-api"),
  };

  return {
    status: buildLiveStatus(),
    featured: false,
    repo: mappedRepo,
    health,
    commits,
    workflowRuns,
    alerts,
    languages,
    contributors,
    availability,
  };
}

export async function fetchSnapshotManifest(): Promise<SnapshotManifest> {
  if (!manifestCache) {
    manifestCache = await readJson<SnapshotManifest>("data/manifest.json");
  }
  return manifestCache;
}

export async function fetchSnapshotOverview(): Promise<SnapshotOverview> {
  if (!overviewCache) {
    overviewCache = await readJson<SnapshotOverview>("data/overview.json");
  }
  return overviewCache;
}

export async function fetchRepoSnapshot(owner: string, repo: string): Promise<RepoSnapshotDetail> {
  const key = `${owner}/${repo}`;
  const cached = repoCache.get(key);
  if (cached) return cached;

  const manifest = await fetchSnapshotManifest();
  const relativePath = manifest.repoFiles[key];
  if (!relativePath) {
    throw new Error(`Snapshot route not found for ${key}`);
  }

  const detail = await readJson<RepoSnapshotDetail>(relativePath);
  repoCache.set(key, detail);
  return detail;
}

export async function fetchUserRepos(): Promise<RepositoryRef[]> {
  const overview = await fetchSnapshotOverview();
  return overview.repos.map((entry) => entry.repo);
}

export async function fetchDashboardSnapshot(): Promise<SnapshotOverview> {
  return fetchSnapshotOverview();
}

export async function fetchCommits(owner: string, repo: string): Promise<CommitSummary[]> {
  const detail = await fetchRepoSnapshot(owner, repo);
  return detail.commits;
}

export async function fetchWorkflowRuns(owner: string, repo: string): Promise<WorkflowRun[]> {
  const detail = await fetchRepoSnapshot(owner, repo);
  return detail.workflowRuns;
}

export async function fetchDependabotAlerts(owner: string, repo: string): Promise<DependabotAlert[]> {
  const detail = await fetchRepoSnapshot(owner, repo);
  return detail.alerts;
}

export async function fetchLanguages(owner: string, repo: string): Promise<LanguageBreakdown> {
  const detail = await fetchRepoSnapshot(owner, repo);
  return detail.languages;
}

export async function fetchContributors(owner: string, repo: string): Promise<ContributorSummary[]> {
  const detail = await fetchRepoSnapshot(owner, repo);
  return detail.contributors;
}

export async function fetchRateLimit(): Promise<RateLimitInfo> {
  const manifest = await fetchSnapshotManifest();
  const remaining = manifest.status.dataMode === "authenticated" ? 5000 : 60;
  return {
    remaining,
    limit: remaining,
    resetAt: manifest.status.generatedAt,
  };
}

export async function fetchAccessibleRepos(token: string): Promise<RepositoryRef[]> {
  const payload = await githubRequest<GitHubRepo[]>("/user/repos?per_page=100&sort=updated&affiliation=owner,collaborator,organization_member", token);
  return payload.map(mapRepo).filter((repo) => !repo.isPrivate);
}

export async function fetchLiveDashboardSnapshot(token: string, selectedRepos: string[], featuredRepo: string | null): Promise<SnapshotOverview> {
  const availableRepos = await fetchAccessibleRepos(token);
  const selectedSet = new Set(selectedRepos);
  const repoTargets = selectedSet.size > 0
    ? availableRepos.filter((repo) => selectedSet.has(repo.fullName))
    : [];

  const details = await Promise.all(
    repoTargets.map((repo) => buildLiveRepoSnapshot(repo.owner, repo.name, token)),
  );

  return {
    status: buildLiveStatus(),
    featuredRepo: featuredRepo || details[0]?.repo.fullName || "",
    repos: details.map((detail) => ({
      repo: detail.repo,
      health: detail.health,
      stats: {
        totalCommitsTracked: detail.commits.length,
        contributorsTracked: detail.contributors.length,
        languagesTracked: Object.keys(detail.languages).length,
        latestWorkflowConclusion: detail.workflowRuns[0]?.conclusion || null,
        openAlertCount: detail.alerts.length,
      },
      availability: detail.availability,
    })),
  };
}

export async function fetchLiveRepoSnapshot(token: string, owner: string, repo: string): Promise<RepoSnapshotDetail> {
  return buildLiveRepoSnapshot(owner, repo, token);
}

export async function fetchLiveRateLimit(token: string): Promise<RateLimitInfo> {
  const payload = await githubRequest<GitHubRateLimitPayload>("/rate_limit", token);
  const core = payload.resources?.core;
  return {
    remaining: core?.remaining ?? 0,
    limit: core?.limit ?? 0,
    resetAt: core?.reset ? new Date(core.reset * 1000).toISOString() : new Date().toISOString(),
  };
}

export function clearSnapshotCache() {
  manifestCache = null;
  overviewCache = null;
  repoCache.clear();
}

// Compatibility exports kept for local authenticated mode and legacy call sites.
export function initOctokit(_token: string) {
  return null;
}

export function getOctokit() {
  return null;
}

export function clearOctokit() {
  return undefined;
}

export function extractRateLimit(_headers: Record<string, string | undefined>): RateLimitInfo | null {
  return null;
}

export async function validateToken(token: string): Promise<{ login: string; avatarUrl: string } | null> {
  const trimmed = token.trim();
  if (!trimmed) return null;

  try {
    const viewer = await githubRequest<{ login: string; avatar_url?: string }>("/user", trimmed);
    return {
      login: viewer.login,
      avatarUrl: viewer.avatar_url || "",
    };
  } catch {
    return null;
  }
}
