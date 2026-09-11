import type { RepoHealth } from "@/types";
import type { HealthReport } from "./types";

export function toRepoHealth(report: HealthReport): RepoHealth {
  return {
    score: report.score,
    status: report.status,
    lastCommitAt: report.metrics.lastCommitAt,
    workflowSuccessRate: report.metrics.workflowSuccessRate,
    failedRuns7d: report.metrics.failedRuns7d,
    dependabotOpenCount: report.metrics.dependabotOpenCount,
    dependabotCriticalCount: report.metrics.dependabotCriticalCount,
    stalenessDays: report.metrics.stalenessDays,
  };
}