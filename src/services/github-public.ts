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
import { calculateHealth } from "@/utils/health";

const GITHUB_API_BASE = "https://api.github.com";

let manifestCache: SnapshotManifest | null = null;
let overviewCache: SnapshotOverview | null = null;
const snapshotRepoCache = new Map<string, RepoSnapshotDetail>();
const publicReposCache = new Map<string, RepositoryRef[]>();
const publicRepoDetailCache = new Map<string, RepoSnapshotDetail>();

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

type GitHubRateLimitPayload = {
  resources?: {
    core?: {
      remaining?: number;
      limit?: number;
      reset?: number;
    };
  };
};

type GitHubWorkflowRunsPayload = {
  workflow_runs?: GitHubWorkflowRun[];
};

function buildAssetUrl(relativePath: string) {
  const normalizedBase = SITE_BASE_URL.endsWith("/") ? SITE_BASE_URL : `${SITE_BASE_URL}/`;
  return `${normalizedBase}${relativePath.replace(/^\/+/, "")}`;
}

async function readJson<T>(relativePath: string): Promise<T> {
  const response = await fetch(buildAssetUrl(relativePath), {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Failed to load ${relativePath}: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

async function githubPublicRequest<T>(pathname: string): Promise<T> {
  const response = await fetch(`${GITHUB_API_BASE}${pathname}`, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "push_-public-runtime",
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

async function githubPublicOptional<T>(pathname: string): Promise<T | GitHubFailure> {
  try {
    return await githubPublicRequest<T>(pathname);
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

function createPublicStatus() {
  return {
    generatedAt: new Date().toISOString(),
    generatedBy: "public-api" as const,
    dataMode: "public" as const,
  };
}

async function fetchAllPublicRepos(username: string) {
  const repos: GitHubRepo[] = [];
  let page = 1;

  while (true) {
    const batch = await githubPublicRequest<GitHubRepo[]>(`/users/${username}/repos?type=public&sort=updated&per_page=100&page=${page}`);
    repos.push(...batch);

    if (batch.length < 100) {
      break;
    }

    page += 1;
  }

  return repos;
}

async function buildPublicRepoDetail(owner: string, repo: string): Promise<RepoSnapshotDetail> {
  const cacheKey = `${owner}/${repo}`;
  const cached = publicRepoDetailCache.get(cacheKey);
  if (cached) return cached;

  const repoPath = `/repos/${owner}/${repo}`;
  const repoPayload = await githubPublicRequest<GitHubRepo>(repoPath);
  const mappedRepo = mapRepo(repoPayload);
  const isEmptyRepository = mappedRepo.size === 0 || !mappedRepo.lastPushAt;
  const unavailableBecauseEmpty = { error: "Repository has no commits yet." };

  const [commitsPayload, workflowsPayload, languagesPayload, contributorsPayload] = isEmptyRepository
    ? await Promise.all([
        Promise.resolve<GitHubCommit[] | GitHubFailure>(unavailableBecauseEmpty),
        Promise.resolve<GitHubWorkflowRunsPayload | GitHubFailure>(unavailableBecauseEmpty),
        Promise.resolve<LanguageBreakdown | GitHubFailure>(unavailableBecauseEmpty),
        Promise.resolve<GitHubContributor[] | GitHubFailure>(unavailableBecauseEmpty),
      ])
    : await Promise.all([
        githubPublicOptional<GitHubCommit[]>(`${repoPath}/commits?per_page=8`),
        githubPublicOptional<GitHubWorkflowRunsPayload>(`${repoPath}/actions/runs?per_page=12`),
        githubPublicOptional<LanguageBreakdown>(`${repoPath}/languages`),
        githubPublicOptional<GitHubContributor[]>(`${repoPath}/contributors?per_page=6`),
      ]);

  const commits = !isFailure(commitsPayload) ? commitsPayload.map(mapCommit) : [];
  const workflowRuns = !isFailure(workflowsPayload) ? (workflowsPayload.workflow_runs || []).map(mapWorkflowRun) : [];
  const languages = !isFailure(languagesPayload) ? languagesPayload : {};
  const contributors = !isFailure(contributorsPayload) ? contributorsPayload.map(mapContributor) : [];
  const alerts: DependabotAlert[] = [];
  const health = calculateHealth(mappedRepo, workflowRuns, alerts);

  const detail = {
    status: createPublicStatus(),
    featured: false,
    repo: mappedRepo,
    health,
    commits,
    workflowRuns,
    alerts,
    languages,
    contributors,
    availability: {
      repository: createAvailability(true, "public-api"),
      commits: isFailure(commitsPayload)
        ? createAvailability(false, "public-api", commitsPayload.error)
        : createAvailability(true, "public-api"),
      workflowRuns: isFailure(workflowsPayload)
        ? createAvailability(false, "public-api", workflowsPayload.error)
        : createAvailability(true, "public-api"),
      languages: isFailure(languagesPayload)
        ? createAvailability(false, "public-api", languagesPayload.error)
        : createAvailability(true, "public-api"),
      contributors: isFailure(contributorsPayload)
        ? createAvailability(false, "public-api", contributorsPayload.error)
        : createAvailability(true, "public-api"),
      dependabotAlerts: createAvailability(false, "public-api", "Dependabot alerts require an authenticated token."),
    },
  } satisfies RepoSnapshotDetail;

  publicRepoDetailCache.set(cacheKey, detail);
  return detail;
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
  const cached = snapshotRepoCache.get(key);
  if (cached) return cached;

  const manifest = await fetchSnapshotManifest();
  const relativePath = manifest.repoFiles[key];
  if (!relativePath) {
    throw new Error(`Snapshot route not found for ${key}`);
  }

  const detail = await readJson<RepoSnapshotDetail>(relativePath);
  snapshotRepoCache.set(key, detail);
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

export async function fetchPublicProfileRepos(username: string): Promise<RepositoryRef[]> {
  const normalizedUsername = username.trim().replace(/^@+/, "").toLowerCase();
  const cached = publicReposCache.get(normalizedUsername);
  if (cached) return cached;

  const repos = (await fetchAllPublicRepos(normalizedUsername))
    .map(mapRepo)
    .filter((repo) => !repo.isPrivate)
    .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime());

  publicReposCache.set(normalizedUsername, repos);
  return repos;
}

export async function fetchPublicProfileRepo(owner: string, repo: string): Promise<RepoSnapshotDetail> {
  return buildPublicRepoDetail(owner, repo);
}

export async function fetchPublicRateLimit(): Promise<RateLimitInfo> {
  const payload = await githubPublicRequest<GitHubRateLimitPayload>("/rate_limit");
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
  snapshotRepoCache.clear();
  publicReposCache.clear();
  publicRepoDetailCache.clear();
}
