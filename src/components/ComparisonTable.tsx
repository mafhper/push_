import { useMemo } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useWorkflowRuns, useDependabotAlerts } from '@/hooks/useGitHub';
import { calculateHealth, formatRelativeTime } from '@/utils/health';
import { Shield, Activity, CheckCircle2, AlertTriangle, XCircle, BarChart3, Clock, Star } from 'lucide-react';
import type { RepositoryRef } from '@/types';
import { useNavigate } from 'react-router-dom';

interface ComparisonTableProps {
  repos: RepositoryRef[];
}

export function ComparisonTable({ repos }: ComparisonTableProps) {
  const { t } = useApp();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-muted-foreground ml-1">
        <BarChart3 size={16} />
        {t('metrics')}
      </div>
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">{t('repos')}</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">{t('healthScore')}</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">{t('ciSuccess')}</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">{t('alerts')}</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">{t('lastUpdated')}</th>
              </tr>
            </thead>
            <tbody>
              {repos.map(repo => (
                <RepoRow key={repo.id} repo={repo} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function RepoRow({ repo }: { repo: RepositoryRef }) {
  const { t } = useApp();
  const navigate = useNavigate();
  const { data: runs } = useWorkflowRuns(repo.owner, repo.name);
  const { data: alerts } = useDependabotAlerts(repo.owner, repo.name);

  const health = useMemo(() => {
    if (!runs || !alerts) return null;
    return calculateHealth(repo, runs, alerts);
  }, [repo, runs, alerts]);

  const navigateToDetail = () => {
    navigate(`/repo/${repo.owner}/${repo.name}`);
  };

  return (
    <tr 
      className="border-b border-border/50 hover:bg-secondary/30 transition-colors cursor-pointer"
      onClick={navigateToDetail}
    >
      <td className="px-6 py-4">
        <div className="flex flex-col gap-0.5 min-w-[180px]">
          <span className="text-sm font-bold truncate">{repo.name}</span>
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            {repo.language && (
              <span className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                {repo.language}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Star size={10} />
              {repo.stars}
            </span>
          </div>
        </div>
      </td>
      <td className="px-6 py-4">
        {health ? (
          <div className="flex items-center gap-2">
            <div className="h-2 w-12 rounded-full bg-secondary overflow-hidden">
              <div 
                className={`h-full rounded-full ${
                  health.status === 'healthy' ? 'bg-success' : 
                  health.status === 'warning' ? 'bg-warning' : 'bg-critical'
                }`}
                style={{ width: `${health.score}%` }}
              />
            </div>
            <span className={`text-sm font-black tabular-nums ${
              health.status === 'healthy' ? 'text-success' : 
              health.status === 'warning' ? 'text-warning' : 'text-critical'
            }`}>
              {health.score}
            </span>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">...</span>
        )}
      </td>
      <td className="px-6 py-4">
        {health?.workflowSuccessRate !== null ? (
          <div className="flex items-center gap-1.5">
            <Activity size={14} className={health?.workflowSuccessRate && health.workflowSuccessRate > 80 ? 'text-success' : 'text-warning'} />
            <span className="text-sm font-bold tabular-nums">{health?.workflowSuccessRate}%</span>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">--</span>
        )}
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center gap-2">
          {health && health.dependabotOpenCount > 0 ? (
            <>
              <Shield size={14} className={health.dependabotCriticalCount > 0 ? 'text-critical' : 'text-warning'} />
              <span className={`text-sm font-bold tabular-nums ${health.dependabotCriticalCount > 0 ? 'text-critical' : 'text-warning'}`}>
                {health.dependabotOpenCount}
              </span>
            </>
          ) : (
            <div className="flex items-center gap-1.5 text-success">
              <CheckCircle2 size={14} />
              <span className="text-sm font-bold">0</span>
            </div>
          )}
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground whitespace-nowrap">
          <Clock size={12} />
          {formatRelativeTime(repo.lastPushAt, t)}
        </div>
      </td>
    </tr>
  );
}
