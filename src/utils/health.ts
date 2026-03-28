import type { RepositoryRef, WorkflowRun, DependabotAlert, RepoHealth } from '@/types';
import type { DictKey } from '@/i18n';

export function calculateHealth(
  repo: RepositoryRef,
  runs: WorkflowRun[],
  alerts: DependabotAlert[]
): RepoHealth {
  let score = 100;
  const now = Date.now();
  const lastPush = repo.lastPushAt ? new Date(repo.lastPushAt).getTime() : 0;
  const stalenessDays = lastPush ? Math.floor((now - lastPush) / (1000 * 60 * 60 * 24)) : 999;

  // CI/Actions (35%)
  const recentRuns = runs.slice(0, 10);
  const successRuns = recentRuns.filter(r => r.conclusion === 'success').length;
  const failedRuns7d = runs.filter(r => {
    const d = new Date(r.startedAt).getTime();
    return r.conclusion === 'failure' && (now - d) < 7 * 24 * 60 * 60 * 1000;
  }).length;
  const successRate = recentRuns.length > 0 ? successRuns / recentRuns.length : null;

  if (successRate !== null && successRate < 0.5) score -= 20;
  else if (successRate !== null && successRate < 0.8) score -= 10;
  if (failedRuns7d > 3) score -= 10;
  if (failedRuns7d > 0) score -= 5;

  // Security (25%)
  const criticalAlerts = alerts.filter(a => a.severity === 'critical').length;
  const highAlerts = alerts.filter(a => a.severity === 'high').length;
  if (criticalAlerts > 0) score -= 35;
  if (highAlerts > 0) score -= 15;
  if (alerts.length > 5) score -= 5;

  // Activity (20%)
  if (stalenessDays > 90) score -= 15;
  else if (stalenessDays > 30) score -= 10;
  else if (stalenessDays > 14) score -= 5;

  // Maintenance (10%)
  if (repo.openIssues > 50) score -= 5;

  score = Math.max(0, Math.min(100, score));

  let status: 'healthy' | 'warning' | 'critical' = 'healthy';
  if (score < 40) status = 'critical';
  else if (score < 70) status = 'warning';

  return {
    score,
    status,
    lastCommitAt: repo.lastPushAt || null,
    workflowSuccessRate: successRate !== null ? Math.round(successRate * 100) : null,
    failedRuns7d,
    dependabotOpenCount: alerts.length,
    dependabotCriticalCount: criticalAlerts,
    stalenessDays,
  };
}

export function formatRelativeTime(dateStr: string, t: (key: DictKey) => string): string {
  if (!dateStr) return t('neverPushed');
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return t('justNow');
  if (diffMin < 60) return `${diffMin} ${t('minutes')} ${t('ago')}`;
  if (diffHr < 24) return `${diffHr} ${t('hours')} ${t('ago')}`;
  return `${diffDay} ${t('days')} ${t('ago')}`;
}
