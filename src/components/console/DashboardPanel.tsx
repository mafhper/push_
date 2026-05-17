import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AttentionSignal, ScoredRepo } from '@/lib/attention';
import { SeverityDot } from './SeverityDot';
import { ShieldAlert, GitPullRequest, Archive, GitCommit, Info, ChevronRight, Hash, Activity, Clock, AlertTriangle, Boxes, CircleCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { isZeroMetricValue } from '@/lib/metric-state';

interface DashboardPanelProps {
  repos: ScoredRepo[];
}

export function DashboardPanel({ repos }: DashboardPanelProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [showScoreInfo, setShowScoreInfo] = useState(false);

  const totalRepos = repos.length;
  const criticalCount = repos.filter(r => r.attentionScore >= 100).length;
  const warningCount = repos.filter(r => r.attentionScore >= 40 && r.attentionScore < 100).length;
  const healthyCount = repos.filter(r => r.attentionScore < 40 && !r.repo.archived).length;
  const archivedCount = repos.filter(r => r.repo.archived).length;
  const totalAlerts = repos.reduce((acc, r) => acc + r.health.dependabotOpenCount, 0);
  const totalPRs = repos.reduce((acc, r) => acc + (r.stats.openPullRequestCount || 0), 0);
  const totalCommits = repos.reduce((acc, r) => acc + r.stats.totalCommitsTracked, 0);
  const failingCI = repos.filter(r => r.health.failedRuns7d > 0).length;

  const criticalRepos = repos.filter(r => r.attentionScore >= 100);
  const topRepos = repos.slice(0, 12);
  const attentionSources = repos.flatMap(repo => {
    const signals = repo.signals.length > 0
      ? repo.signals
      : repo.health.status !== 'healthy'
        ? [{ kind: 'workflow', severity: repo.health.status === 'critical' ? 'critical' : 'warning', label: 'health degraded' } satisfies AttentionSignal]
        : [];
    return signals.map(signal => ({ repo, signal }));
  }).sort((left, right) => {
    const severityWeight: Record<AttentionSignal['severity'], number> = { critical: 4, high: 3, warning: 2, info: 1 };
    return severityWeight[right.signal.severity] - severityWeight[left.signal.severity] || right.repo.attentionScore - left.repo.attentionScore;
  });

  function selectRepo(id: number) {
    const params = new URLSearchParams(searchParams);
    params.set('repo', id.toString());
    setSearchParams(params, { replace: true });
  }

  function selectRepoFromSignal(repo: ScoredRepo, signal: AttentionSignal) {
    const params = new URLSearchParams(searchParams);
    params.set('repo', repo.repo.id.toString());
    params.set('filter', signal.severity === 'critical' || signal.severity === 'high' ? 'critical' : signal.severity === 'warning' ? 'warning' : 'all');
    setSearchParams(params, { replace: true });
  }

  function setFilter(filter: string) {
    const params = new URLSearchParams(searchParams);
    params.set('filter', filter);
    params.delete('repo');
    setSearchParams(params, { replace: true });
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-1 flex-col overflow-y-auto">
      {/* Header */}
      <div className="border-b border-border/50 px-4 pb-6 pt-8 md:px-8">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4">
          <div>
            <h1 className="text-display font-headline font-bold tracking-tight text-foreground">Fleet Overview</h1>
            <p className="text-body text-foreground-subtle mt-1">
              {repos.length} repositories · {totalAlerts} alerts · {totalPRs} PRs · {totalCommits} commits
            </p>
          </div>
          <button
            onClick={() => setShowScoreInfo(!showScoreInfo)}
            className="flex items-center gap-1.5 text-micro font-medium text-foreground-subtle hover:text-primary transition-colors px-2.5 py-1.5 rounded-md hover:bg-surface-1"
          >
            <Info size={14} />
            About scoring
          </button>
        </div>

        {showScoreInfo && (
          <div className="mx-auto mt-4 w-full max-w-5xl rounded-xl border border-border/60 bg-surface-1/80 p-4 text-sm text-foreground-muted shadow-sm backdrop-blur-sm animate-fade-in space-y-1.5">
            <p className="font-semibold text-foreground">How attention score works</p>
            <p className="text-foreground-subtle">Each repository gets a score based on these weighted factors:</p>
            <ul className="list-disc list-inside space-y-0.5 text-foreground-subtle">
              <li><span className="text-critical font-mono font-semibold">+100</span> per critical CVE</li>
              <li><span className="text-warning font-mono font-semibold">+40</span> per other open alert</li>
              <li><span className="text-critical font-mono font-semibold">+60</span> if CI is failing</li>
              <li><span className="text-primary font-mono font-semibold">+15</span> per open PR</li>
              <li><span className="text-foreground-subtle font-mono">+2/day</span> for staleness (over 30 days)</li>
              <li><span className="text-foreground-subtle font-mono">-1000</span> if archived</li>
            </ul>
            <p className="text-micro text-foreground-subtle mt-2">
              Higher score = more urgent. Click any tile below to jump to that group.
            </p>
          </div>
        )}
      </div>

      {/* Metric & Stat Tiles */}
      <div className="mx-auto w-full max-w-5xl space-y-4 px-4 pb-4 pt-6 md:px-8">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricTile icon={<Boxes size={15} />} label="Total repos" value={totalRepos} description="Repositories in this view." onClick={() => setFilter('all')} />
          <MetricTile icon={<AlertTriangle size={15} />} label="Critical" value={criticalCount} severity="critical" description="Needs immediate action." onClick={() => setFilter('critical')} />
          <MetricTile icon={<Clock size={15} />} label="Warning" value={warningCount} severity="warning" description="Needs follow-up soon." onClick={() => setFilter('warning')} />
          <MetricTile icon={<CircleCheck size={15} />} label="Healthy" value={healthyCount} severity="success" description="No active attention signals." onClick={() => setFilter('healthy')} />
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricTile icon={<ShieldAlert size={15} />} label="Open Alerts" value={totalAlerts} severity={totalAlerts > 0 ? 'critical' : undefined} description="Security alerts visible." onClick={() => setFilter('critical')} />
          <MetricTile icon={<GitPullRequest size={15} />} label="Open PRs" value={totalPRs} description="Open review work." />
          <MetricTile icon={<GitCommit size={15} />} label="Commits Tracked" value={totalCommits} description="Recent commits loaded." />
          <MetricTile icon={<Hash size={15} />} label="CI Failing" value={failingCI} severity={failingCI > 0 ? 'critical' : undefined} description="Repos with failed runs." />
        </div>
      </div>

      {/* Critical Repos */}
      {criticalRepos.length > 0 && (
        <div className="border-t border-border/50">
          <div className="mx-auto w-full max-w-5xl px-4 py-5 md:px-8">
            <h2 className="text-micro font-bold uppercase tracking-wider text-foreground-subtle mb-4 flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-critical animate-pulse-critical" />
              Requires Immediate Attention
            </h2>
            <div className="grid gap-2">
              {criticalRepos.slice(0, 4).map(repo => (
                <CriticalRepoRow key={repo.repo.id} repo={repo} onClick={() => selectRepo(repo.repo.id)} />
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="border-t border-border/50">
        <div className="mx-auto w-full max-w-5xl px-4 py-5 md:px-8">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-micro font-bold uppercase tracking-wider text-foreground-subtle">
                Attention Sources
              </h2>
              <p className="mt-1 text-sm text-foreground-subtle">
                Where warnings and alerts come from across the selected repositories.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setFilter('warning')}
              className="rounded-lg border border-border/60 bg-surface-1 px-3 py-1.5 text-micro font-semibold text-foreground-subtle transition-colors hover:border-warning/40 hover:text-warning"
            >
              Show warnings
            </button>
          </div>

          {attentionSources.length > 0 ? (
            <div className="grid gap-2 xl:grid-cols-2">
              {attentionSources.slice(0, 8).map(({ repo, signal }) => (
                <AttentionSourceRow
                  key={`${repo.repo.id}-${signal.kind}-${signal.label}`}
                  repo={repo}
                  signal={signal}
                  onClick={() => selectRepoFromSignal(repo, signal)}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-border/60 bg-surface-1/60 px-4 py-5 text-sm text-foreground-subtle">
              No active warning sources in the loaded repository set.
            </div>
          )}
        </div>
      </div>

      {/* All Repos */}
      <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-5 md:px-8">
        <h2 className="text-micro font-bold uppercase tracking-wider text-foreground-subtle mb-3">
          All Repositories
        </h2>
        <div className="rounded-xl border border-border/60 bg-surface-1/30 overflow-hidden">
          <div className="divide-y divide-border/30">
            {topRepos.map(repo => (
              <RepoSummaryRow key={repo.repo.id} repo={repo} onClick={() => selectRepo(repo.repo.id)} />
            ))}
          </div>
        </div>
        {repos.length > 12 && (
          <p className="text-center text-micro text-foreground-subtle mt-5 italic">
            +{repos.length - 12} more · select a repository from the repository list
          </p>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-border/50 px-8 py-4">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-5 text-micro text-foreground-subtle">
          <span className="flex items-center gap-1.5"><ShieldAlert size={12} className="text-critical/60" /> {totalAlerts} alerts</span>
          <span className="flex items-center gap-1.5"><GitPullRequest size={12} className="text-primary/60" /> {totalPRs} PRs</span>
          <span className="flex items-center gap-1.5"><Archive size={12} className="text-foreground-subtle/60" /> {archivedCount} archived</span>
          <span className="flex items-center gap-1.5"><GitCommit size={12} className="text-foreground-subtle/60" /> {totalCommits} commits</span>
        </div>
      </footer>
    </div>
  );
}

function AttentionSourceRow({ repo, signal, onClick }: { repo: ScoredRepo; signal: AttentionSignal; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group flex w-full items-center gap-3 rounded-xl border bg-surface-1 px-4 py-3 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:bg-surface-2 hover:shadow-md",
        signal.severity === 'critical' && "border-critical/30",
        signal.severity === 'high' && "border-warning/30",
        signal.severity === 'warning' && "border-warning/25",
        signal.severity === 'info' && "border-border/60"
      )}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-3 text-foreground-subtle">
        <SignalSourceIcon kind={signal.kind} severity={signal.severity} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-body font-semibold text-foreground">{signal.label}</span>
          <span className={cn(
            "rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
            signal.severity === 'critical' && "bg-critical/10 text-critical",
            signal.severity === 'high' && "bg-warning/10 text-warning",
            signal.severity === 'warning' && "bg-warning/10 text-warning",
            signal.severity === 'info' && "bg-info/10 text-info"
          )}>
            {signal.kind}
          </span>
        </div>
        <p className="mt-0.5 truncate text-micro text-foreground-subtle">
          {repo.repo.fullName} · score {repo.attentionScore}
        </p>
      </div>
      <ChevronRight size={15} className="shrink-0 text-foreground-subtle/30 transition-all group-hover:translate-x-0.5 group-hover:text-foreground-subtle" />
    </button>
  );
}

function SignalSourceIcon({ kind, severity }: { kind: AttentionSignal['kind']; severity: AttentionSignal['severity'] }) {
  const className = cn(
    severity === 'critical' && "text-critical",
    (severity === 'high' || severity === 'warning') && "text-warning",
    severity === 'info' && "text-info"
  );
  const size = 16;
  if (kind === 'security') return <ShieldAlert size={size} className={className} />;
  if (kind === 'workflow') return <Activity size={size} className={className} />;
  if (kind === 'stale') return <Clock size={size} className={className} />;
  if (kind === 'pr') return <GitPullRequest size={size} className={className} />;
  if (kind === 'archived') return <Archive size={size} className={className} />;
  return <AlertTriangle size={size} className={className} />;
}

function MetricTile({ icon, label, value, description, severity, onClick }: {
  icon: React.ReactNode;
  label: string;
  value: number;
  description: string;
  severity?: 'critical' | 'warning' | 'success';
  onClick?: () => void
}) {
  const Comp = onClick ? 'button' : 'div';
  const isZero = isZeroMetricValue(value);
  return (
    <Comp
      onClick={onClick}
      className={cn(
        "flex min-h-[6.75rem] w-full flex-col justify-between rounded-xl border border-border/60 bg-surface-1 px-4 py-3.5 text-left shadow-sm transition-all duration-200",
        isZero && "border-border/35 bg-surface-1/45 shadow-none",
        onClick && "cursor-pointer hover:shadow-md hover:bg-surface-2 hover:border-foreground-subtle/20",
        onClick && isZero && "hover:shadow-sm hover:bg-surface-1/70"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="block text-[10px] font-semibold uppercase tracking-widest text-foreground-subtle">{label}</span>
          <span className="mt-1 block text-[10px] leading-snug text-foreground-subtle/70">{description}</span>
        </div>
        <span className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-3 text-foreground-subtle",
          isZero && "bg-surface-2/60 text-foreground-subtle/45",
          severity === 'critical' && "bg-critical/10 text-critical",
          severity === 'warning' && "bg-warning/10 text-warning",
          severity === 'success' && "bg-success/10 text-success",
          isZero && "bg-surface-2/60 text-foreground-subtle/45"
        )}>
          {icon}
        </span>
      </div>
      <div className="mt-3 flex items-end justify-between gap-3">
        <span className={cn(
          "font-headline text-title font-bold leading-none tracking-tight tabular-nums",
          severity === 'critical' && "text-critical",
          severity === 'warning' && "text-warning",
          severity === 'success' && "text-success",
          !severity && "text-foreground",
          isZero && "text-foreground-subtle/45"
        )}>
          {value}
        </span>
        {onClick && <ChevronRight size={14} className="text-foreground-subtle/30" />}
      </div>
    </Comp>
  );
}

function CriticalRepoRow({ repo, onClick }: { repo: ScoredRepo; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center gap-3 px-4 py-3 rounded-xl border border-critical/30 bg-critical/[0.03] hover:bg-critical/[0.07] hover:shadow-sm transition-all duration-200 text-left w-full group">
      <div className="h-2 w-2 rounded-full bg-critical shrink-0 animate-pulse-critical" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-body font-semibold text-foreground truncate">{repo.repo.fullName}</span>
          <span className="text-micro font-mono font-semibold text-critical bg-critical/10 px-1.5 py-0.5 rounded">{repo.attentionScore}</span>
        </div>
        <div className="flex items-center gap-2 mt-1">
          {repo.signals.slice(0, 3).map(sig => (
            <span key={sig.label} className={cn(
              "text-micro",
              sig.severity === 'critical' && "text-critical",
              sig.severity === 'warning' && "text-warning",
              sig.severity === 'info' && "text-foreground-subtle"
            )}>
              {sig.label}
            </span>
          ))}
        </div>
      </div>
      <ChevronRight size={16} className="text-foreground-subtle/40 group-hover:text-foreground-subtle group-hover:translate-x-0.5 transition-all shrink-0" />
    </button>
  );
}

function RepoSummaryRow({ repo, onClick }: { repo: ScoredRepo; onClick: () => void }) {
  const severity: 'critical' | 'warning' | 'success' =
    repo.attentionScore >= 100 ? 'critical' :
    repo.attentionScore >= 40 ? 'warning' : 'success';
  const severityLabel = severity === 'critical' ? 'Critical' : severity === 'warning' ? 'Warning' : 'Healthy';

  const topSignals = repo.signals.slice(0, 2);
  const prCount = repo.stats.openPullRequestCount || 0;

  return (
    <button onClick={onClick} className="flex items-center gap-3 px-4 py-2.5 hover:bg-surface-1/80 transition-colors text-left w-full group">
      <SeverityDot severity={severity} label={severityLabel} />
      <div className="flex-1 min-w-0 flex items-center gap-3">
        <span className="text-body font-medium text-foreground truncate min-w-0 group-hover:text-primary transition-colors">{repo.repo.fullName}</span>
        <div className="hidden md:flex items-center gap-2 shrink-0">
          {topSignals.map(sig => (
            <span key={sig.label} className={cn(
              "text-micro",
              sig.severity === 'critical' && "text-critical",
              sig.severity === 'warning' && "text-warning",
              'text-foreground-subtle'
            )}>
              {sig.label}
            </span>
          ))}
          {prCount > 0 && <span className="text-micro text-primary">{prCount} PRs</span>}
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <span className="text-micro text-foreground-subtle tabular-nums">
          {repo.health.stalenessDays > 0 ? `${repo.health.stalenessDays}d` : 'fresh'}
        </span>
        <span className={cn(
          "text-micro font-mono",
          severity === 'critical' && "text-critical",
          severity === 'warning' && "text-warning",
          'text-foreground-subtle/60'
        )}>
          {repo.attentionScore}
        </span>
        <ChevronRight size={14} className="text-foreground-subtle/20 group-hover:text-foreground-subtle/60 group-hover:translate-x-0.5 transition-all" />
      </div>
    </button>
  );
}
