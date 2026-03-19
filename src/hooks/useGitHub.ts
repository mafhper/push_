import { useQuery } from '@tanstack/react-query';
import {
  fetchDashboardSnapshot,
  fetchRepoSnapshot,
  fetchSnapshotManifest,
  fetchUserRepos,
  fetchCommits,
  fetchWorkflowRuns,
  fetchDependabotAlerts,
  fetchLanguages,
  fetchContributors,
  fetchRateLimit,
} from '@/services/github';

export function useSnapshotManifest() {
  return useQuery({
    queryKey: ['snapshot-manifest'],
    queryFn: fetchSnapshotManifest,
    staleTime: 5 * 60 * 1000,
  });
}

export function useDashboardSnapshot() {
  return useQuery({
    queryKey: ['snapshot-overview'],
    queryFn: fetchDashboardSnapshot,
    staleTime: 60 * 1000,
  });
}

export function useRepoSnapshot(owner: string, repo: string) {
  return useQuery({
    queryKey: ['snapshot-detail', owner, repo],
    queryFn: () => fetchRepoSnapshot(owner, repo),
    enabled: !!owner && !!repo,
    staleTime: 60 * 1000,
  });
}

export function useRepos() {
  return useQuery({
    queryKey: ['repos'],
    queryFn: () => fetchUserRepos(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCommits(owner: string, repo: string) {
  return useQuery({
    queryKey: ['commits', owner, repo],
    queryFn: () => fetchCommits(owner, repo),
    enabled: !!owner && !!repo,
    staleTime: 60 * 1000,
    refetchInterval: 60 * 1000,
  });
}

export function useWorkflowRuns(owner: string, repo: string) {
  return useQuery({
    queryKey: ['workflows', owner, repo],
    queryFn: () => fetchWorkflowRuns(owner, repo),
    enabled: !!owner && !!repo,
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000,
  });
}

export function useDependabotAlerts(owner: string, repo: string) {
  return useQuery({
    queryKey: ['dependabot', owner, repo],
    queryFn: () => fetchDependabotAlerts(owner, repo),
    enabled: !!owner && !!repo,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });
}

export function useLanguages(owner: string, repo: string) {
  return useQuery({
    queryKey: ['languages', owner, repo],
    queryFn: () => fetchLanguages(owner, repo),
    enabled: !!owner && !!repo,
    staleTime: 60 * 60 * 1000,
  });
}

export function useContributors(owner: string, repo: string) {
  return useQuery({
    queryKey: ['contributors', owner, repo],
    queryFn: () => fetchContributors(owner, repo),
    enabled: !!owner && !!repo,
    staleTime: 30 * 60 * 1000,
  });
}

export function useRateLimit() {
  return useQuery({
    queryKey: ['rateLimit'],
    queryFn: fetchRateLimit,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });
}
