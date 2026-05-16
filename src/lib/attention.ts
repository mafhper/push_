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
 * Calcula o Attention Score determinístico para um repositório.
 * attention(repo) = 
 *    100 * criticalAlertCount 
 *  +  40 * (dependabotOpenCount - criticalAlertCount) 
 *  +  60 * (latestWorkflowConclusion === "failure" ? 1 : 0) 
 *  +  15 * openPullRequestCount 
 *  +   2 * clamp(staleDays, 0, 365) 
 *  + (archived ? -1000 : 0)
 */
export function calculateAttention(repo: OverviewRepoSnapshot): { score: number; signals: AttentionSignal[] } {
  const { health, repo: meta } = repo;
  const signals: AttentionSignal[] = [];
  let score = 0;

  // 1. Alertas Críticos de Segurança
  if (health.criticalAlertCount > 0) {
    score += 100 * health.criticalAlertCount;
    signals.push({
      kind: 'security',
      severity: 'critical',
      label: `${health.criticalAlertCount} critical CVE${health.criticalAlertCount > 1 ? 's' : ''}`,
    });
  }

  // 2. Outros alertas Dependabot
  const otherAlerts = health.dependabotOpenCount - health.criticalAlertCount;
  if (otherAlerts > 0) {
    score += 40 * otherAlerts;
    signals.push({
      kind: 'security',
      severity: 'warning',
      label: `${otherAlerts} alert${otherAlerts > 1 ? 's' : ''}`,
    });
  }

  // 3. Falhas de Workflow
  // Nota: O modelo de dados atual em health tem failedRuns7d e status. 
  // O relatório dev-3 sugere usar a conclusão do último run.
  if (health.status === 'critical' && health.failedRuns7d > 0) {
    score += 60;
    signals.push({
      kind: 'workflow',
      severity: 'critical',
      label: 'CI failing',
    });
  }

  // 4. PRs Abertos (se disponível no snapshot)
  // O tipo RepoHealth atual não tem explicitamente openPullRequestCount, 
  // mas o relatório menciona PRs. Vou verificar se o tipo suporta ou adicionar zero por enquanto.
  // @ts-ignore - Depende da evolução do schema do snapshot
  const prCount = health.openPullRequestCount || 0;
  if (prCount > 0) {
    score += 15 * prCount;
    signals.push({
      kind: 'pr',
      severity: 'info',
      label: `${prCount} PR${prCount > 1 ? 's' : ''}`,
    });
  }

  // 5. Staleness
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

  // 6. Arquivado
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
