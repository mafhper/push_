import type { RepoSnapshotDetail } from "@/types";
import type { HealthContext, HealthContextSupplement } from "./types";

/**
 * Builds the health context from a repository snapshot.
 *
 * A snapshot is public data and never carries account quotas, so anything that
 * is only knowable at runtime arrives through `supplement` — and only the
 * authenticated runtime has it. Omitting the argument is the public path.
 */
export function contextFromSnapshotDetail(
  detail: RepoSnapshotDetail,
  supplement?: HealthContextSupplement,
): HealthContext {
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
    quotas: supplement?.quotas,
    dataMode: detail.status?.dataMode,
  };
}
