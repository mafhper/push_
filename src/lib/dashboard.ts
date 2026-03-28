import type { OverviewRepoSnapshot, RepositoryRef } from "@/types";

export function getActivityTimestamp(value?: string | null) {
  if (!value) return 0;
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

export function getSnapshotPriority(entry: OverviewRepoSnapshot) {
  const statusRank =
    entry.health.status === "critical" ? 0 : entry.health.status === "warning" ? 1 : 2;
  const workflowPenalty = entry.stats.latestWorkflowConclusion === "failure" ? -2 : 0;
  const alertPenalty = Math.min(entry.health.dependabotOpenCount, 5);
  const stalenessPenalty = Math.min(Math.floor(entry.health.stalenessDays / 7), 6);

  return statusRank * 100 + workflowPenalty - alertPenalty - stalenessPenalty;
}

export function sortSnapshotRepos(entries: OverviewRepoSnapshot[]) {
  return [...entries].sort((left, right) => {
    const priorityDelta = getSnapshotPriority(left) - getSnapshotPriority(right);
    if (priorityDelta !== 0) return priorityDelta;

    const activityDelta = getActivityTimestamp(right.repo.lastPushAt) - getActivityTimestamp(left.repo.lastPushAt);
    if (activityDelta !== 0) return activityDelta;

    return left.repo.fullName.localeCompare(right.repo.fullName);
  });
}

export function getPublicRepoPriority(repo: RepositoryRef) {
  const archivedPenalty = repo.archived ? 2 : 0;
  const issuePenalty = repo.openIssues > 0 ? 0 : 1;
  const stalePenalty = getActivityTimestamp(repo.updatedAt || repo.lastPushAt) === 0 ? 1 : 0;

  return archivedPenalty + issuePenalty + stalePenalty;
}

export function sortPublicRepos(repos: RepositoryRef[]) {
  return [...repos].sort((left, right) => {
    const priorityDelta = getPublicRepoPriority(left) - getPublicRepoPriority(right);
    if (priorityDelta !== 0) return priorityDelta;

    const issueDelta = right.openIssues - left.openIssues;
    if (issueDelta !== 0) return issueDelta;

    const activityDelta =
      getActivityTimestamp(right.updatedAt || right.lastPushAt) - getActivityTimestamp(left.updatedAt || left.lastPushAt);
    if (activityDelta !== 0) return activityDelta;

    return left.fullName.localeCompare(right.fullName);
  });
}
