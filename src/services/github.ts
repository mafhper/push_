import { Octokit } from '@octokit/rest';
import type {
  RepositoryRef,
  WorkflowRun,
  CommitSummary,
  DependabotAlert,
  ContributorSummary,
  LanguageBreakdown,
  RateLimitInfo,
} from '@/types';

let octokitInstance: Octokit | null = null;

export function initOctokit(token: string) {
  octokitInstance = new Octokit({ auth: token });
  return octokitInstance;
}

export function getOctokit(): Octokit {
  if (!octokitInstance) throw new Error('Octokit not initialized');
  return octokitInstance;
}

export function clearOctokit() {
  octokitInstance = null;
}

// --- Cache helpers ---
interface CacheEntry<T> { data: T; expires: number }

function getCache<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(`gl_cache_${key}`);
    if (!raw) return null;
    const entry: CacheEntry<T> = JSON.parse(raw);
    if (Date.now() > entry.expires) {
      sessionStorage.removeItem(`gl_cache_${key}`);
      return null;
    }
    return entry.data;
  } catch { return null; }
}

function setCache<T>(key: string, data: T, ttlSeconds: number) {
  try {
    const entry: CacheEntry<T> = { data, expires: Date.now() + ttlSeconds * 1000 };
    sessionStorage.setItem(`gl_cache_${key}`, JSON.stringify(entry));
  } catch { /* quota exceeded */ }
}

// --- Rate limit extraction ---
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

// --- API functions ---

export async function validateToken(token: string): Promise<{ login: string; avatarUrl: string } | null> {
  try {
    const ok = initOctokit(token);
    const { data } = await ok.rest.users.getAuthenticated();
    return { login: data.login, avatarUrl: data.avatar_url };
  } catch {
    clearOctokit();
    return null;
  }
}

export async function fetchUserRepos(username?: string): Promise<RepositoryRef[]> {
  const cached = getCache<RepositoryRef[]>('repos');
  if (cached) return cached;

  const ok = getOctokit();
  const repos: RepositoryRef[] = [];
  
  const iterator = ok.paginate.iterator(ok.rest.repos.listForAuthenticatedUser, {
    per_page: 100,
    sort: 'pushed',
    type: 'public',
  });

  for await (const { data } of iterator) {
    for (const r of data) {
      repos.push({
        id: r.id,
        owner: r.owner?.login || '',
        name: r.name,
        fullName: r.full_name,
        defaultBranch: r.default_branch || 'main',
        isPrivate: r.private,
        archived: r.archived || false,
        htmlUrl: r.html_url,
        description: r.description,
        language: r.language,
        stars: r.stargazers_count || 0,
        forks: r.forks_count || 0,
        openIssues: r.open_issues_count || 0,
        watchers: r.watchers_count || 0,
        lastPushAt: r.pushed_at || '',
        size: r.size || 0,
        topics: r.topics || [],
        createdAt: r.created_at || '',
        updatedAt: r.updated_at || '',
        socialImageUrl: `https://opengraph.githubassets.com/1/${r.owner?.login}/${r.name}`,
      });
    }
  }

  setCache('repos', repos, 300);
  return repos;
}

export async function fetchCommits(owner: string, repo: string, perPage = 15): Promise<CommitSummary[]> {
  const cacheKey = `commits_${owner}_${repo}`;
  const cached = getCache<CommitSummary[]>(cacheKey);
  if (cached) return cached;

  const ok = getOctokit();
  const { data } = await ok.rest.repos.listCommits({ owner, repo, per_page: perPage });

  const commits: CommitSummary[] = data.map(c => ({
    sha: c.sha,
    message: c.commit.message.split('\n')[0],
    authorLogin: c.author?.login || c.commit.author?.name || 'unknown',
    authorAvatar: c.author?.avatar_url || '',
    date: c.commit.author?.date || '',
    htmlUrl: c.html_url,
  }));

  setCache(cacheKey, commits, 120);
  return commits;
}

export async function fetchWorkflowRuns(owner: string, repo: string, perPage = 20): Promise<WorkflowRun[]> {
  const cacheKey = `workflows_${owner}_${repo}`;
  const cached = getCache<WorkflowRun[]>(cacheKey);
  if (cached) return cached;

  try {
    const ok = getOctokit();
    const { data } = await ok.rest.actions.listWorkflowRunsForRepo({ owner, repo, per_page: perPage });

    const runs: WorkflowRun[] = data.workflow_runs.map(r => ({
      id: r.id,
      workflowName: r.name || 'Unknown',
      status: r.status || '',
      conclusion: r.conclusion,
      branch: r.head_branch || '',
      event: r.event,
      startedAt: r.run_started_at || r.created_at,
      updatedAt: r.updated_at,
      durationMs: r.run_started_at ? new Date(r.updated_at).getTime() - new Date(r.run_started_at).getTime() : 0,
      htmlUrl: r.html_url,
    }));

    setCache(cacheKey, runs, 60);
    return runs;
  } catch {
    return [];
  }
}

interface GhAlert {
  number: number;
  security_advisory?: {
    severity: string;
    summary: string;
    cve_id: string | null;
    vulnerabilities?: ReadonlyArray<{
      first_patched_version?: { identifier: string };
    }>;
  };
  state: string;
  dependency?: {
    package?: { name: string; ecosystem: string };
    manifest_path?: string;
  };
  created_at: string;
  html_url: string;
}

export async function fetchDependabotAlerts(owner: string, repo: string): Promise<DependabotAlert[]> {
  const cacheKey = `dependabot_${owner}_${repo}`;
  const cached = getCache<DependabotAlert[]>(cacheKey);
  if (cached) return cached;

  try {
    const ok = getOctokit();
    const { data } = await ok.request('GET /repos/{owner}/{repo}/dependabot/alerts', {
      owner,
      repo,
      state: 'open',
      per_page: 100,
    });

    const alerts: DependabotAlert[] = (data as unknown as GhAlert[]).map((a) => ({
      id: a.number,
      severity: (a.security_advisory?.severity as DependabotAlert['severity']) || 'low',
      state: a.state,
      packageName: a.dependency?.package?.name || 'unknown',
      ecosystem: a.dependency?.package?.ecosystem || '',
      manifestPath: a.dependency?.manifest_path || '',
      createdAt: a.created_at,
      fixedIn: a.security_advisory?.vulnerabilities?.[0]?.first_patched_version?.identifier || null,
      htmlUrl: a.html_url,
      cveId: a.security_advisory?.cve_id || null,
      summary: a.security_advisory?.summary || '',
    }));

    setCache(cacheKey, alerts, 600);
    return alerts;
  } catch {
    return [];
  }
}

export async function fetchLanguages(owner: string, repo: string): Promise<LanguageBreakdown> {
  const cacheKey = `langs_${owner}_${repo}`;
  const cached = getCache<LanguageBreakdown>(cacheKey);
  if (cached) return cached;

  const ok = getOctokit();
  const { data } = await ok.rest.repos.listLanguages({ owner, repo });
  setCache(cacheKey, data, 3600);
  return data;
}

interface GhContributor {
  login?: string;
  avatar_url?: string;
  contributions?: number;
}

export async function fetchContributors(owner: string, repo: string, perPage = 10): Promise<ContributorSummary[]> {
  const cacheKey = `contribs_${owner}_${repo}`;
  const cached = getCache<ContributorSummary[]>(cacheKey);
  if (cached) return cached;

  try {
    const ok = getOctokit();
    const { data } = await ok.rest.repos.listContributors({ owner, repo, per_page: perPage });

    const contribs: ContributorSummary[] = (data as GhContributor[]).map((c) => ({
      login: c.login || 'unknown',
      avatarUrl: c.avatar_url || '',
      contributions: c.contributions || 0,
    }));

    setCache(cacheKey, contribs, 1800);
    return contribs;
  } catch {
    return [];
  }
}

export async function fetchRateLimit(): Promise<RateLimitInfo> {
  const ok = getOctokit();
  const { data } = await ok.rest.rateLimit.get();
  return {
    remaining: data.rate.remaining,
    limit: data.rate.limit,
    resetAt: new Date(data.rate.reset * 1000).toISOString(),
  };
}
