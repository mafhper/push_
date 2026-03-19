import { useQuery } from '@tanstack/react-query';
import { useApp } from '@/contexts/AppContext';
import {
  fetchUserRepos,
  fetchCommits,
  fetchWorkflowRuns,
  fetchDependabotAlerts,
  fetchLanguages,
  fetchContributors,
  fetchRateLimit,
} from '@/services/github';

export function useRepos() {
  const { session } = useApp();
  return useQuery({
    queryKey: ['repos', session?.username],
    queryFn: () => fetchUserRepos(),
    enabled: !!session,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCommits(owner: string, repo: string) {
  const { session } = useApp();
  return useQuery({
    queryKey: ['commits', owner, repo],
    queryFn: () => fetchCommits(owner, repo),
    enabled: !!session && !!owner && !!repo,
    staleTime: 60 * 1000,
    refetchInterval: 60 * 1000,
  });
}

export function useWorkflowRuns(owner: string, repo: string) {
  const { session } = useApp();
  return useQuery({
    queryKey: ['workflows', owner, repo],
    queryFn: () => fetchWorkflowRuns(owner, repo),
    enabled: !!session && !!owner && !!repo,
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000,
  });
}

export function useDependabotAlerts(owner: string, repo: string) {
  const { session } = useApp();
  return useQuery({
    queryKey: ['dependabot', owner, repo],
    queryFn: () => fetchDependabotAlerts(owner, repo),
    enabled: !!session && !!owner && !!repo,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });
}

export function useLanguages(owner: string, repo: string) {
  const { session } = useApp();
  return useQuery({
    queryKey: ['languages', owner, repo],
    queryFn: () => fetchLanguages(owner, repo),
    enabled: !!session && !!owner && !!repo,
    staleTime: 60 * 60 * 1000,
  });
}

export function useContributors(owner: string, repo: string) {
  const { session } = useApp();
  return useQuery({
    queryKey: ['contributors', owner, repo],
    queryFn: () => fetchContributors(owner, repo),
    enabled: !!session && !!owner && !!repo,
    staleTime: 30 * 60 * 1000,
  });
}

export function useRateLimit() {
  const { session } = useApp();
  return useQuery({
    queryKey: ['rateLimit'],
    queryFn: fetchRateLimit,
    enabled: !!session,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });
}
