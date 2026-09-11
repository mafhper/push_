import type { RepoSnapshotDetail } from "@/types";
import type { HealthContext } from "./types";

export function contextFromSnapshotDetail(detail: RepoSnapshotDetail): HealthContext {
  const extended = detail.extended;
  return {
    repo: detail.repo,
    runs: detail.workflowRuns ?? [],
    alerts: detail.alerts ?? [],
    availability: detail.availability,
    dependencies: detail.dependencies,
    releases: extended?.releases,
    branchProtection: extended?.branchProtection,
    rootTree: extended?.rootTree,
    codeScanning: extended?.codeScanning,
    pages: extended?.pages,
    security: extended?.security,
    readmeAvailable: extended?.readme ? Boolean(extended.readme) : undefined,
    contributors: detail.contributors,
    languages: detail.languages,
    dataMode: detail.status?.dataMode,
  };
}