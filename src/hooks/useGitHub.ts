import { useQuery } from '@tanstack/react-query';
import { useApp } from '@/contexts/useApp';
import { isLocalSecureRuntime } from '@/config/site';
import {
  fetchAccessibleRepos,
  fetchDashboardSnapshot,
  fetchLiveDashboardSnapshot,
  fetchLiveRateLimit,
  fetchLiveRepoSnapshot,
  fetchUserRepos,
  fetchCommits,
  fetchWorkflowRuns,
  fetchDependabotAlerts,
  fetchLanguages,
  fetchContributors,
  fetchRateLimit,
  fetchRepoSnapshot,
  fetchSnapshotManifest,
} from '@/services/github';

function getRuntimeQueryKey(localRuntime: boolean, username?: string, authenticatedAt?: string) {
  if (!localRuntime || !username || !authenticatedAt) {
    return 'snapshot';
  }

  return `${username}:${authenticatedAt}`;
}

export function useRepos() {
  const { session } = useApp();
  const localRuntime = isLocalSecureRuntime();
  const token = localRuntime ? session?.token?.trim() : '';
  const tokenKey = getRuntimeQueryKey(localRuntime, session?.username, session?.authenticatedAt);

  return useQuery({
    queryKey: ['repos', tokenKey],
    queryFn: () => token ? fetchAccessibleRepos(token) : fetchUserRepos(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCommits(owner: string, repo: string) {
  const { session } = useApp();
  const localRuntime = isLocalSecureRuntime();
  const token = localRuntime ? session?.token?.trim() : '';
  const tokenKey = getRuntimeQueryKey(localRuntime, session?.username, session?.authenticatedAt);

  return useQuery({
    queryKey: ['commits', owner, repo, tokenKey],
    queryFn: () => token ? fetchLiveRepoSnapshot(token, owner, repo).then((detail) => detail.commits) : fetchCommits(owner, repo),
    enabled: !!owner && !!repo,
    staleTime: 10 * 60 * 1000,
  });
}

export function useWorkflowRuns(owner: string, repo: string) {
  const { session } = useApp();
  const localRuntime = isLocalSecureRuntime();
  const token = localRuntime ? session?.token?.trim() : '';
  const tokenKey = getRuntimeQueryKey(localRuntime, session?.username, session?.authenticatedAt);

  return useQuery({
    queryKey: ['workflows', owner, repo, tokenKey],
    queryFn: () => token ? fetchLiveRepoSnapshot(token, owner, repo).then((detail) => detail.workflowRuns) : fetchWorkflowRuns(owner, repo),
    enabled: !!owner && !!repo,
    staleTime: 10 * 60 * 1000,
  });
}

export function useDependabotAlerts(owner: string, repo: string) {
  const { session } = useApp();
  const localRuntime = isLocalSecureRuntime();
  const token = localRuntime ? session?.token?.trim() : '';
  const tokenKey = getRuntimeQueryKey(localRuntime, session?.username, session?.authenticatedAt);

  return useQuery({
    queryKey: ['dependabot', owner, repo, tokenKey],
    queryFn: () => token ? fetchLiveRepoSnapshot(token, owner, repo).then((detail) => detail.alerts) : fetchDependabotAlerts(owner, repo),
    enabled: !!owner && !!repo,
    staleTime: 5 * 60 * 1000,
  });
}

export function useLanguages(owner: string, repo: string) {
  const { session } = useApp();
  const localRuntime = isLocalSecureRuntime();
  const token = localRuntime ? session?.token?.trim() : '';
  const tokenKey = getRuntimeQueryKey(localRuntime, session?.username, session?.authenticatedAt);

  return useQuery({
    queryKey: ['languages', owner, repo, tokenKey],
    queryFn: () => token ? fetchLiveRepoSnapshot(token, owner, repo).then((detail) => detail.languages) : fetchLanguages(owner, repo),
    enabled: !!owner && !!repo,
    staleTime: 60 * 60 * 1000,
  });
}

export function useContributors(owner: string, repo: string) {
  const { session } = useApp();
  const localRuntime = isLocalSecureRuntime();
  const token = localRuntime ? session?.token?.trim() : '';
  const tokenKey = getRuntimeQueryKey(localRuntime, session?.username, session?.authenticatedAt);

  return useQuery({
    queryKey: ['contributors', owner, repo, tokenKey],
    queryFn: () => token ? fetchLiveRepoSnapshot(token, owner, repo).then((detail) => detail.contributors) : fetchContributors(owner, repo),
    enabled: !!owner && !!repo,
    staleTime: 30 * 60 * 1000,
  });
}

export function useRateLimit() {
  const { session } = useApp();
  const localRuntime = isLocalSecureRuntime();
  const token = localRuntime ? session?.token?.trim() : '';
  const tokenKey = getRuntimeQueryKey(localRuntime, session?.username, session?.authenticatedAt);

  return useQuery({
    queryKey: ['rateLimit', tokenKey],
    queryFn: () => token ? fetchLiveRateLimit(token) : fetchRateLimit(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useSnapshotManifest() {
  return useQuery({
    queryKey: ['snapshot-manifest'],
    queryFn: fetchSnapshotManifest,
    staleTime: 30 * 60 * 1000,
  });
}

export function useDashboardSnapshot() {
  const { session, selectedRepos, primaryRepo } = useApp();
  const localRuntime = isLocalSecureRuntime();
  const token = localRuntime ? session?.token?.trim() : '';
  const tokenKey = getRuntimeQueryKey(localRuntime, session?.username, session?.authenticatedAt);

  return useQuery({
    queryKey: ['dashboard-overview', tokenKey, selectedRepos.join('|'), primaryRepo ?? 'default'],
    queryFn: () => token ? fetchLiveDashboardSnapshot(token, selectedRepos, primaryRepo) : fetchDashboardSnapshot(),
    staleTime: 10 * 60 * 1000,
  });
}

export function useRepoSnapshot(owner: string, repo: string) {
  const { session } = useApp();
  const localRuntime = isLocalSecureRuntime();
  const token = localRuntime ? session?.token?.trim() : '';
  const tokenKey = getRuntimeQueryKey(localRuntime, session?.username, session?.authenticatedAt);

  return useQuery({
    queryKey: ['repo-snapshot', owner, repo, tokenKey],
    queryFn: () => token ? fetchLiveRepoSnapshot(token, owner, repo) : fetchRepoSnapshot(owner, repo),
    enabled: !!owner && !!repo,
    staleTime: 10 * 60 * 1000,
  });
}
