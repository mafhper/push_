import { OverviewRepoSnapshot } from '@/types';

export interface AttentionSignal {
  kind: 'security' | 'workflow' | 'stale' | 'pr' | 'archived';
  severity: 'critical' | 'high' | 'warning' | 'info';
  label: string;
}

export interface ScoredRepo extends OverviewRepoSnapshot {
  attentionScore: number;
  signals: AttentionSignal[];
}

/**
 * Calculates a deterministic attention score for a repository.
 * The weights follow the dev-3 operating-console model.
 */
export function calculateAttention(repo: OverviewRepoSnapshot): { score: number; signals: AttentionSignal[] } {
  const { health, repo: meta, stats } = repo;
  const signals: AttentionSignal[] = [];
  let score = 0;

  if (health.dependabotCriticalCount > 0) {
    score += 100 * health.dependabotCriticalCount;
    signals.push({
      kind: 'security',
      severity: 'critical',
      label: `${health.dependabotCriticalCount} critical CVE${health.dependabotCriticalCount > 1 ? 's' : ''}`,
    });
  }

  const otherAlerts = health.dependabotOpenCount - health.dependabotCriticalCount;
  if (otherAlerts > 0) {
    score += 40 * otherAlerts;
    signals.push({
      kind: 'security',
      severity: 'warning',
      label: `${otherAlerts} alert${otherAlerts > 1 ? 's' : ''}`,
    });
  }

  if (health.status === 'critical' && health.failedRuns7d > 0) {
    score += 60;
    signals.push({
      kind: 'workflow',
      severity: 'critical',
      label: 'CI failing',
    });
  }

  const prCount = stats.openPullRequestCount || 0;
  if (prCount > 0) {
    score += 15 * prCount;
    signals.push({
      kind: 'pr',
      severity: 'info',
      label: `${prCount} PR${prCount > 1 ? 's' : ''}`,
    });
  }

  if (health.stalenessDays > 0) {
    const clampedStale = Math.min(health.stalenessDays, 365);
    score += 2 * clampedStale;
    if (health.stalenessDays > 30) {
       signals.push({
         kind: 'stale',
         severity: health.stalenessDays > 90 ? 'warning' : 'info',
         label: `stale ${health.stalenessDays}d`,
       });
    }
  }

  if (meta.archived) {
    score -= 1000;
    signals.push({
      kind: 'archived',
      severity: 'info',
      label: 'archived',
    });
  }

  return { score, signals };
}

export function sortReposByAttention(repos: OverviewRepoSnapshot[]): ScoredRepo[] {
  return repos
    .map(repo => {
      const { score, signals } = calculateAttention(repo);
      return { ...repo, attentionScore: score, signals };
    })
    .sort((a, b) => b.attentionScore - a.attentionScore);
}
