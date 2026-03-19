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

let manifestCache: SnapshotManifest | null = null;
let overviewCache: SnapshotOverview | null = null;
const repoCache = new Map<string, RepoSnapshotDetail>();

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

export function clearSnapshotCache() {
  manifestCache = null;
  overviewCache = null;
  repoCache.clear();
}
