import { useQuery } from "@tanstack/react-query";
import { usePublicRuntime } from "@/contexts/usePublicRuntime";
import {
  fetchDashboardSnapshot,
  fetchPublicProfileRepos,
  fetchPublicProfileRepo,
  fetchPublicRateLimit,
  fetchRateLimit,
  fetchRepoSnapshot,
  fetchSnapshotManifest,
} from "@/services/github-public";

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

export function usePublicProfileRepos() {
  const { username } = usePublicRuntime();

  return useQuery({
    queryKey: ["public-profile-repos", username ?? "none"],
    queryFn: () => fetchPublicProfileRepos(username ?? ""),
    enabled: Boolean(username),
    staleTime: 5 * 60 * 1000,
  });
}

export function usePublicRateLimit() {
  const { mode } = usePublicRuntime();

  return useQuery({
    queryKey: ["public-rateLimit", mode],
    queryFn: () => (mode === "public-profile" ? fetchPublicRateLimit() : fetchRateLimit()),
    staleTime: 5 * 60 * 1000,
  });
}

export function usePublicRepoSnapshot(owner: string, repo: string) {
  const { mode } = usePublicRuntime();

  return useQuery({
    queryKey: ["public-repo-snapshot", mode, owner, repo],
    queryFn: () => (mode === "public-profile" ? fetchPublicProfileRepo(owner, repo) : fetchRepoSnapshot(owner, repo)),
    enabled: !!owner && !!repo,
    staleTime: 10 * 60 * 1000,
  });
}
