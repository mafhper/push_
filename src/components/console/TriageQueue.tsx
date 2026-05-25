import { useSearchParams } from 'react-router-dom';
import { LayoutDashboard, Menu } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScoredRepo } from '@/lib/attention';
import { useApp } from '@/contexts/useApp';
import { RepoLogo } from '@/components/repository/RepoLogo';
import { SeverityDot } from './SeverityDot';

interface TriageQueueProps {
  repos: ScoredRepo[];
  selectedRepoId?: string;
  compact?: boolean;
  onToggleCompact?: () => void;
}

export function TriageQueue({ repos, selectedRepoId, compact = false, onToggleCompact }: TriageQueueProps) {
  const { t } = useApp();
  const [searchParams, setSearchParams] = useSearchParams();
  const filter = searchParams.get('filter') || 'all';
  const filterLabels = {
    all: t('triageFilterAll'),
    critical: t('triageFilterCritical'),
    warning: t('triageFilterWarning'),
    healthy: t('triageFilterHealthy'),
    archived: t('triageFilterArchived'),
  };

  const counts = {
    all: repos.length,
    critical: repos.filter(r => r.attentionScore >= 100).length,
    warning: repos.filter(r => r.attentionScore >= 40 && r.attentionScore < 100).length,
    healthy: repos.filter(r => r.attentionScore < 40 && !r.repo.archived).length,
    archived: repos.filter(r => r.repo.archived).length,
  };

  const filteredRepos = repos.filter(repo => {
    if (filter === 'all') return true;
    if (filter === 'critical') return repo.attentionScore >= 100;
    if (filter === 'warning') return repo.attentionScore >= 40 && repo.attentionScore < 100;
    if (filter === 'healthy') return repo.attentionScore < 40 && !repo.repo.archived;
    if (filter === 'archived') return repo.repo.archived;
    return true;
  });

  function setFilter(newFilter: string) {
    const params = new URLSearchParams(searchParams);
    params.set('filter', newFilter);
    if (params.get('repo')) params.delete('repo');
    setSearchParams(params, { replace: true });
  }

  function selectRepo(id: number) {
    const params = new URLSearchParams(searchParams);
    params.set('repo', id.toString());
    setSearchParams(params, { replace: true });
  }

  function showOverview() {
    const params = new URLSearchParams(searchParams);
    params.delete('repo');
    setSearchParams(params, { replace: true });
  }

  return (
    <div className={cn("flex h-full min-h-0 flex-col overflow-hidden", compact && "md:items-stretch")}>
      <div className={cn("shrink-0 border-b border-border/50 px-5 py-4", compact && "md:px-3 md:py-3")}>
        <div className={cn("flex items-start justify-between gap-3", compact && "md:justify-center")}>
          <div className={cn("min-w-0", compact && "md:hidden")}>
            <h2 className="text-micro font-bold uppercase tracking-wider text-foreground-subtle">{t('repositoryTriage')}</h2>
            <p className="mt-1 text-[10px] text-foreground-subtle/70">
              {t('triageCountSummary', { total: repos.length, critical: counts.critical, warning: counts.warning })}
            </p>
          </div>
          {onToggleCompact && (
            <button
              type="button"
              onClick={onToggleCompact}
              aria-label={compact ? t('expandSidebar') : t('collapseSidebar')}
              title={compact ? t('expandSidebar') : t('collapseSidebar')}
              className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-surface-1 text-foreground-subtle transition-colors hover:text-foreground lg:inline-flex"
            >
              <Menu size={15} />
            </button>
          )}
        </div>
        <p className={cn("hidden text-center font-mono text-[10px] font-semibold text-primary", compact && "md:block")}>
          {repos.length}
        </p>
      </div>

      <div className={cn("flex shrink-0 items-center gap-1.5 overflow-x-auto border-b border-border/50 px-4 py-2.5", compact && "md:hidden")}>
        {(['all', 'critical', 'warning', 'healthy', 'archived'] as const).map(key => {
          const count = counts[key];
          return (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={cn(
                "px-2.5 py-1 text-[10px] font-semibold rounded-lg transition-all duration-150 whitespace-nowrap",
                filter === key
                  ? "bg-primary/10 text-primary shadow-sm"
                  : "text-foreground-subtle hover:bg-surface-1 hover:text-foreground"
              )}
            >
              {filterLabels[key]}
              <span className="ml-1 font-mono opacity-60">{count}</span>
            </button>
          );
        })}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <button
          type="button"
          onClick={showOverview}
          title={t('dashboardOverview')}
          className={cn(
            "group flex w-full items-center gap-2.5 border-l-[3px] px-5 py-3 text-left transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            !selectedRepoId ? "border-l-primary bg-surface-2 shadow-sm" : "border-l-transparent hover:bg-surface-1/60",
            compact && "md:flex-col md:items-center md:gap-1.5 md:px-2 md:py-3 md:text-center"
          )}
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border/60 bg-surface-1 text-primary">
            <LayoutDashboard size={16} />
          </span>
          <span className={cn("min-w-0 flex-1 text-sm font-semibold text-foreground", compact && "md:hidden")}>
            {t('dashboardOverview')}
          </span>
        </button>
        {filteredRepos.length > 0 ? (
          <div className="divide-y divide-border/20">
            {filteredRepos.map(repo => (
              <TriageRow
                key={repo.repo.id}
                repo={repo}
                selected={selectedRepoId === repo.repo.id.toString()}
                compact={compact}
                onClick={() => selectRepo(repo.repo.id)}
              />
            ))}
          </div>
        ) : (
          <div className="flex h-32 items-center justify-center px-6 text-center text-[10px] italic text-foreground-subtle/60">
            {t('noRepositoriesMatchFilter')}
          </div>
        )}
      </div>
    </div>
  );
}

function TriageRow({ repo, selected, compact, onClick }: { repo: ScoredRepo; selected: boolean; compact: boolean; onClick: () => void }) {
  const { t } = useApp();
  const primarySignals = repo.signals.slice(0, 2);
  const severity: 'critical' | 'warning' | 'success' =
    repo.attentionScore >= 100 ? 'critical' :
    repo.attentionScore >= 40 ? 'warning' : 'success';
  const severityLabel = severity === 'critical' ? t('critical') : severity === 'warning' ? t('warning') : t('healthy');

  const tooltip = `${repo.repo.fullName} · ${severityLabel} · score ${repo.attentionScore} · ${primarySignals.map((signal) => signal.label).join(', ') || t('healthy')}`;

  return (
    <button
      onClick={onClick}
      title={tooltip}
      className={cn(
        "group flex w-full items-center gap-2.5 px-5 py-3 text-left transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        compact && "md:flex-col md:items-center md:gap-1.5 md:px-2 md:py-3 md:text-center",
        selected
          ? "bg-surface-2 shadow-sm border-l-[3px] border-l-primary"
          : "hover:bg-surface-1/60 border-l-[3px] border-l-transparent"
      )}
    >
      <div className={cn("flex shrink-0 items-center gap-2", compact && "md:block")}>
        <RepoLogo owner={repo.repo.owner} repo={repo.repo.name} defaultBranch={repo.repo.defaultBranch} language={repo.repo.language} className={cn("h-8 w-8", compact && "md:h-9 md:w-9")} />
        <span className={cn(compact && "md:hidden")}>
          <SeverityDot severity={severity} label={severityLabel} />
        </span>
      </div>

      <div className={cn("flex min-w-0 flex-1 flex-col", compact && "md:hidden")}>
        <span className={cn(
          "text-sm font-semibold truncate leading-tight transition-colors",
          selected ? "text-foreground" : "text-foreground group-hover:text-foreground"
        )}>
          {repo.repo.fullName}
        </span>
        <div className="flex items-center gap-1.5 mt-0.5">
          {primarySignals.length > 0 ? (
            primarySignals.map(sig => (
              <span key={sig.label} className={cn(
                "text-[10px] leading-none truncate",
                sig.severity === 'critical' && "text-critical font-medium",
                sig.severity === 'warning' && "text-warning",
                sig.severity === 'info' && "text-foreground-subtle/70",
              )}>
                {sig.label}
              </span>
            ))
          ) : (
            <span className="text-[10px] text-foreground-subtle/50">{severityLabel}</span>
          )}
        </div>
      </div>

      <div className={cn("flex shrink-0 flex-col items-end gap-0.5", compact && "md:flex-row md:items-center md:justify-center md:gap-1")}>
        <span className={cn("hidden", compact && "md:inline-flex")}>
          <SeverityDot severity={severity} label={severityLabel} />
        </span>
        <span className={cn(
          "text-[10px] font-mono font-semibold leading-none",
          severity === 'critical' && "text-critical",
          severity === 'warning' && "text-warning",
          severity === 'success' && "text-foreground-subtle/60",
        )}>
          {repo.attentionScore}
        </span>
        <span className={cn(
          "text-[9px] leading-none",
          compact && "md:hidden",
          selected ? "text-foreground-subtle/60" : "text-foreground-subtle/40"
        )}>
          {repo.health.stalenessDays > 0 ? `${repo.health.stalenessDays}d` : 'now'}
        </span>
      </div>
    </button>
  );
}
