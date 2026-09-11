import type { RepositoryRef, WorkflowRun, DependabotAlert, RepoHealth } from '@/types';
import type { DictKey } from '@/i18n';
import { evaluateRepositoryHealth, toRepoHealth } from '@/health';
import type { HealthContextExtras } from '@/health';

export function calculateHealth(
  repo: RepositoryRef,
  runs: WorkflowRun[],
  alerts: DependabotAlert[],
  extras?: HealthContextExtras
): RepoHealth {
  const report = evaluateRepositoryHealth({
    repo,
    runs,
    alerts,
    ...extras,
  });
  return toRepoHealth(report);
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
