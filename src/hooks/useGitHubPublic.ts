import { useQuery } from "@tanstack/react-query";
import {
  fetchDashboardSnapshot,
  fetchRateLimit,
  fetchRepoSnapshot,
  fetchSnapshotManifest,
  fetchUserRepos,
} from "@/services/github-public";

export function usePublicRepos() {
  return useQuery({
    queryKey: ["public-repos"],
    queryFn: fetchUserRepos,
    staleTime: 5 * 60 * 1000,
  });
}

export function usePublicRateLimit() {
  return useQuery({
    queryKey: ["public-rateLimit"],
    queryFn: fetchRateLimit,
    staleTime: 5 * 60 * 1000,
  });
}

export function usePublicSnapshotManifest() {
  return useQuery({
    queryKey: ["public-snapshot-manifest"],
    queryFn: fetchSnapshotManifest,
    staleTime: 30 * 60 * 1000,
  });
}

export function usePublicDashboardSnapshot() {
  return useQuery({
    queryKey: ["public-dashboard-overview"],
    queryFn: fetchDashboardSnapshot,
    staleTime: 10 * 60 * 1000,
  });
}

export function usePublicRepoSnapshot(owner: string, repo: string) {
  return useQuery({
    queryKey: ["public-repo-snapshot", owner, repo],
    queryFn: () => fetchRepoSnapshot(owner, repo),
    enabled: !!owner && !!repo,
    staleTime: 10 * 60 * 1000,
  });
}
