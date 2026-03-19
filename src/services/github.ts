import type {
  DashboardSnapshot,
  RepositoryRef,
  WorkflowRun,
  CommitSummary,
  DependabotAlert,
  ContributorSummary,
  LanguageBreakdown,
  RateLimitInfo,
  RepoSnapshotDetail,
  SnapshotManifest,
} from '@/types';

interface CacheEntry<T> { data: T; expires: number }

function getCache<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(`gl_cache_${key}`);
    if (!raw) return null;
    const entry: CacheEntry<T> = JSON.parse(raw);
    if (Date.now() > entry.expires) {
      localStorage.removeItem(`gl_cache_${key}`);
      return null;
    }
    return entry.data;
  } catch { return null; }
}

function setCache<T>(key: string, data: T, ttlSeconds: number) {
  try {
    const entry: CacheEntry<T> = { data, expires: Date.now() + ttlSeconds * 1000 };
    localStorage.setItem(`gl_cache_${key}`, JSON.stringify(entry));
  } catch { /* quota exceeded */ }
}

export function extractRateLimit(headers: Record<string, string | undefined>): RateLimitInfo | null {
  const remaining = headers['x-ratelimit-remaining'];
  const limit = headers['x-ratelimit-limit'];
  const reset = headers['x-ratelimit-reset'];
  if (remaining && limit && reset) {
    return {
      remaining: parseInt(remaining),
      limit: parseInt(limit),
      resetAt: new Date(parseInt(reset) * 1000).toISOString(),
    };
  }
  return null;
}

export function initOctokit() {
  return null;
}

export function getOctokit() {
  return null;
}

export function clearOctokit() {
  return null;
}

export async function validateToken(): Promise<null> {
  return null;
}

async function fetchStaticJson<T>(path: string, cacheKey: string, ttlSeconds: number): Promise<T> {
  const cached = getCache<T>(cacheKey);
  if (cached) return cached;

  const response = await fetch(`${import.meta.env.BASE_URL}${path}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${path}: ${response.status}`);
  }
  const data = await response.json() as T;
  setCache(cacheKey, data, ttlSeconds);
  return data;
}

export async function fetchSnapshotManifest(): Promise<SnapshotManifest> {
  return fetchStaticJson<SnapshotManifest>('data/manifest.json', 'snapshot_manifest', 300);
}

export async function fetchDashboardSnapshot(): Promise<DashboardSnapshot> {
  return fetchStaticJson<DashboardSnapshot>('data/overview.json', 'snapshot_overview', 300);
}

export async function fetchRepoSnapshot(owner: string, repo: string): Promise<RepoSnapshotDetail> {
  return fetchStaticJson<RepoSnapshotDetail>(
    `data/repos/${owner}--${repo}.json`,
    `snapshot_repo_${owner}_${repo}`,
    300,
  );
}

export async function fetchUserRepos(): Promise<RepositoryRef[]> {
  const overview = await fetchDashboardSnapshot();
  return overview.repos.map(entry => entry.repo);
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
  return {
    remaining: manifest.status.dataMode === 'authenticated' ? 5000 : 60,
    limit: manifest.status.dataMode === 'authenticated' ? 5000 : 60,
    resetAt: manifest.status.generatedAt,
  };
}
