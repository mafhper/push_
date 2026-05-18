import React, { useState, useMemo, useCallback } from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import { useSearchParams } from 'react-router-dom';
import { ExternalLink, ShieldAlert, GitPullRequest, Activity, Clock, AlertTriangle, User, ChevronRight, ChevronDown, RefreshCw, Package, GitBranch, GitCommit, Boxes } from 'lucide-react';
import { cn } from '@/lib/utils';
import { isZeroMetricValue } from '@/lib/metric-state';
import { AttentionSignal, ScoredRepo } from '@/lib/attention';
import { resolveDependabotReason } from '@/lib/github-copy';
import { SeverityDot } from './SeverityDot';
import { useRepoSnapshot } from '@/hooks/useGitHub';
import { usePublicRepoSnapshot } from '@/hooks/useGitHubPublic';
import { useApp } from '@/contexts/useApp';
import { RepoLogo } from '@/components/repository/RepoLogo';
import type { WorkflowRun, DependabotAlert, RepoSnapshotDetail } from '@/types';

interface InspectorProps {
  repo: ScoredRepo | null;
  runtime?: 'local' | 'public';
}

export function Inspector({ repo, runtime = 'local' }: InspectorProps) {
  return runtime === 'public' ? <PublicInspector repo={repo} /> : <LocalInspector repo={repo} />;
}

function LocalInspector({ repo }: { repo: ScoredRepo | null }) {
  const { data: detail } = useRepoSnapshot(repo?.repo?.owner ?? '', repo?.repo?.name ?? '');
  return <InspectorContent repo={repo} detail={detail} />;
}

function PublicInspector({ repo }: { repo: ScoredRepo | null }) {
  const { data: detail } = usePublicRepoSnapshot(repo?.repo?.owner ?? '', repo?.repo?.name ?? '');
  return <InspectorContent repo={repo} detail={detail} />;
}

function InspectorContent({ repo, detail }: { repo: ScoredRepo | null; detail?: RepoSnapshotDetail }) {
  const { settings, updateSettings, session, t } = useApp();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null);
  const [expandedWorkflows, setExpandedWorkflows] = useState<Set<string>>(new Set());
  const workflowRuns = detail?.workflowRuns;
  const alerts = detail?.alerts;
  const activityCount = (detail?.pullRequests?.length || 0) + (detail?.commits?.length || 0) + (detail?.alerts?.length || 0);
  const repoDetailMode = repo ? settings.repoDetailModes?.[repo.repo.fullName] ?? settings.dataDetailMode ?? 'balanced' : settings.dataDetailMode ?? 'balanced';
  const activeFilter = searchParams.get('filter') ?? 'all';
  const focusedSignals = useMemo(() => {
    if (!repo || (activeFilter !== 'critical' && activeFilter !== 'warning')) return [];
    return repo.signals.filter((signal) => signalMatchesFilter(signal, activeFilter));
  }, [repo, activeFilter]);

  const toggleWorkflow = useCallback((name: string) => {
    setExpandedWorkflows(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }, []);

  const handleBranchClick = useCallback((branch: string) => {
    setSelectedBranch(prev => prev === branch ? null : branch);
    setActiveTab('workflows');
  }, []);

  const branches = useMemo(() => {
    if (!workflowRuns) return [];
    return Array.from(new Set(workflowRuns.map(r => r.branch))).sort();
  }, [workflowRuns]);

  const workflowGroups = useMemo(() => {
    if (!workflowRuns) return [];
    const runs = selectedBranch
      ? workflowRuns.filter(r => r.branch === selectedBranch)
      : workflowRuns;
    const map = new Map<string, WorkflowRun[]>();
    runs.forEach(run => {
      const arr = map.get(run.workflowName) || [];
      arr.push(run);
      map.set(run.workflowName, arr);
    });
    return Array.from(map.entries()).map(([name, runs]) => ({
      name,
      runs: runs.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()),
      latest: runs.reduce((latest, r) =>
        new Date(r.startedAt).getTime() > new Date(latest.startedAt).getTime() ? r : latest
      ),
    })).sort((a, b) => new Date(b.latest.startedAt).getTime() - new Date(a.latest.startedAt).getTime());
  }, [workflowRuns, selectedBranch]);

  const packageMap = useMemo(() => {
    if (!alerts) return new Map();
    const map = new Map<string, Map<string, DependabotAlert[]>>();
    alerts.forEach(alert => {
      const eco = alert.ecosystem || 'unknown';
      if (!map.has(eco)) map.set(eco, new Map());
      const ecoMap = map.get(eco)!;
      if (!ecoMap.has(alert.packageName)) ecoMap.set(alert.packageName, []);
      ecoMap.get(alert.packageName)!.push(alert);
    });
    return map;
  }, [alerts]);

  if (!repo) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-surface-2 p-8 text-center">
        <Activity size={28} className="text-foreground-subtle opacity-20" />
        <p className="mt-4 text-micro font-medium uppercase tracking-widest text-foreground-subtle">
          Select a repository to inspect
        </p>
      </div>
    );
  }

  const severity: 'critical' | 'warning' | 'success' =
    repo.attentionScore >= 100 ? 'critical' :
    repo.attentionScore >= 40 ? 'warning' : 'success';
  const severityLabel = severity === 'critical' ? 'Critical' : severity === 'warning' ? 'Warning' : 'Healthy';

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden bg-surface-2">
      <header className="border-b border-border/50 bg-surface-2/80 px-4 py-5 backdrop-blur-sm md:px-8">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2 min-w-0">
            <RepoLogo owner={repo.repo.owner} repo={repo.repo.name} defaultBranch={repo.repo.defaultBranch} language={repo.repo.language} className="h-10 w-10" />
            <SeverityDot severity={severity} label={severityLabel} showLabel />
            <div className="min-w-0">
              <h2 className="text-title font-semibold text-foreground truncate">{repo.repo.fullName}</h2>
              {repo.repo.description && (
                <p className="text-sm text-foreground-subtle truncate">{repo.repo.description}</p>
              )}
            </div>
          </div>
          <a
            href={`https://github.com/${repo.repo.fullName}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex shrink-0 items-center gap-1.5 text-micro font-medium text-primary hover:text-primary/80 transition-colors"
          >
            Open <ExternalLink size={12} />
          </a>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-foreground-subtle">
          {repo.repo.language && (
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-primary/60" />
              {repo.repo.language}
            </span>
          )}
          {repo.repo.stars > 0 && <span>{repo.repo.stars} stars</span>}
          {repo.repo.forks > 0 && <span>{repo.repo.forks} forks</span>}
          {repo.health.workflowSuccessRate !== null && (
            <span className={repo.health.workflowSuccessRate < 50 ? 'text-critical' : 'text-success'}>
              {repo.health.workflowSuccessRate}% CI success
            </span>
          )}
          <span className={repo.health.stalenessDays > 30 ? 'text-warning' : ''}>
            {repo.health.stalenessDays > 0 ? `${repo.health.stalenessDays}d stale` : 'fresh'}
          </span>
          <span className="text-micro text-foreground-subtle font-mono">
            score: {repo.attentionScore}
          </span>
          </div>
          <div className="flex items-center gap-1 rounded-lg border border-border/50 bg-surface-1/50 p-1">
            {(['balanced', 'detailed', 'full'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => updateSettings({ repoDetailModes: { ...(settings.repoDetailModes ?? {}), [repo.repo.fullName]: mode } })}
                className={cn(
                  "rounded-md px-2 py-1 text-[10px] font-semibold capitalize transition-colors",
                  repoDetailMode === mode ? "bg-primary text-primary-foreground" : "text-foreground-subtle hover:text-foreground"
                )}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>
        </div>
      </header>

      <Tabs.Root value={activeTab} onValueChange={setActiveTab} className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <Tabs.List className="flex shrink-0 justify-center border-b border-border/50 bg-surface-2/60 px-3 sm:px-5">
          <div className="flex w-full max-w-5xl flex-wrap gap-x-1">
          <TabTrigger value="overview" label="Overview" />
          <TabTrigger value="workflows" label="Workflows" count={workflowGroups.length} />
          <TabTrigger value="dependencies" label="Dependencies" count={(detail?.dependencies?.length || 0) + (detail?.alerts?.length || 0) || undefined} />
          <TabTrigger value="activity" label="Activity" count={activityCount || undefined} />
          </div>
        </Tabs.List>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {activeTab === 'overview' && (
            <div className="mx-auto w-full max-w-5xl space-y-5 px-4 py-5 outline-none md:px-8">
              {focusedSignals.length > 0 && (
                <section className="rounded-xl border border-warning/30 bg-warning/[0.04] p-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <AlertTriangle size={17} className="mt-0.5 shrink-0 text-warning" />
                    <div className="min-w-0">
                      <h3 className="text-body font-semibold text-foreground">
                        {activeFilter === 'critical' ? 'Why this repository is critical' : 'Why this repository is in warning'}
                      </h3>
                      <p className="mt-1 text-sm text-foreground-subtle">
                        This repository matched the selected queue tag because of the highlighted signals below.
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {focusedSignals.map(signal => (
                          <span key={`${signal.kind}-${signal.label}`} className={cn(
                            "inline-flex items-center gap-1.5 rounded-lg border bg-surface-1 px-2.5 py-1 text-micro font-medium",
                            signal.severity === 'critical' ? "border-critical/25 text-critical" : "border-warning/25 text-warning"
                          )}>
                            <SignalIcon kind={signal.kind} severity={signal.severity} />
                            {signal.label}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </section>
              )}

              <section>
                <h3 className="text-micro font-bold uppercase tracking-wider text-foreground-subtle mb-3">Attention Score Breakdown</h3>
                <div className="grid gap-2">
                  {repo.signals.length > 0 ? repo.signals.map(sig => {
                    const isFocused = signalMatchesFilter(sig, activeFilter);
                    return (
                    <div key={sig.label} className={cn(
                      "flex items-center gap-3 rounded-xl border px-3 py-2.5 shadow-sm transition-colors",
                      isFocused ? "border-warning/40 bg-warning/[0.05]" : "border-border/60 bg-surface-1"
                    )}>
                      <SignalIcon kind={sig.kind} severity={sig.severity} />
                      <div className="flex-1 min-w-0">
                        <span className="text-body font-medium text-foreground">{sig.label}</span>
                        <span className="block text-micro text-foreground-subtle capitalize">{sig.kind} signal</span>
                      </div>
                      <span className={cn("text-micro font-mono px-1.5 py-0.5 rounded", sig.severity === 'critical' && "bg-critical/10 text-critical", sig.severity === 'high' && "bg-warning/10 text-warning", sig.severity === 'warning' && "bg-warning/10 text-warning", sig.severity === 'info' && "bg-info/10 text-info")}>
                        {sig.severity}
                      </span>
                    </div>
                    );
                  }) : (
                    <p className="text-body text-foreground-subtle italic">No active signals · repository is healthy</p>
                  )}
                </div>
              </section>

              <section className="rounded-xl border border-border/60 bg-surface-1 p-4 shadow-sm">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-micro font-bold uppercase tracking-wider text-foreground-subtle">Alerts in overview</h3>
                  <button
                    type="button"
                    onClick={() => setActiveTab('activity')}
                    className="text-micro font-semibold text-primary transition-colors hover:text-primary/80"
                  >
                    Open in activity
                  </button>
                </div>
                {detail?.alerts && detail.alerts.length > 0 ? (
                  <div className="space-y-2">
                    {detail.alerts.slice(0, 3).map(alert => (
                      <a
                        key={alert.id}
                        href={alert.htmlUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-start gap-3 rounded-lg border border-critical/20 bg-critical/[0.03] px-3 py-2.5 transition-colors hover:bg-critical/[0.06]"
                      >
                        <ShieldAlert size={15} className="mt-0.5 shrink-0 text-critical" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-foreground">{alert.packageName}</span>
                          <span className="block truncate text-micro text-foreground-subtle">{alert.summary}</span>
                        </span>
                        <span className="shrink-0 rounded bg-critical/10 px-1.5 py-0.5 text-micro font-mono text-critical">{alert.severity}</span>
                      </a>
                    ))}
                    {detail.alerts.length > 3 && (
                      <p className="text-micro text-foreground-subtle">+{detail.alerts.length - 3} more in Activity</p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-foreground-subtle">
                    {!detail
                      ? 'Loading alert status...'
                      : resolveDependabotReason(
                        detail.availability.dependabotAlerts.reason,
                        t,
                        session?.token ? "dependabotReturnedNoIssues" : "dependabotRequiresAuth",
                      )}
                  </p>
                )}
              </section>

              <section className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <MiniStat icon={<AlertTriangle size={15} />} label="Score" value={repo.attentionScore.toString()} severity={severity === 'critical' ? 'critical' : severity === 'warning' ? 'warning' : undefined} description="Weighted attention index." tooltip="Weighted sum: +100 per critical CVE, +40 per alert, +60 for failing CI, +15 per PR, +2/day stale" />
                <MiniStat icon={<Activity size={15} />} label="CI Success" value={repo.health.workflowSuccessRate !== null ? `${repo.health.workflowSuccessRate}%` : 'N/A'} severity={repo.health.workflowSuccessRate !== null && repo.health.workflowSuccessRate < 50 ? 'critical' : undefined} description="Recent run success rate." />
                <MiniStat icon={<ShieldAlert size={15} />} label="Open Alerts" value={repo.health.dependabotOpenCount.toString()} severity={repo.health.dependabotOpenCount > 0 ? 'warning' : undefined} description="Security alerts visible." />
                <MiniStat icon={<GitPullRequest size={15} />} label="Open PRs" value={(repo.stats.openPullRequestCount || 0).toString()} description="Open review work." />
                <MiniStat icon={<Boxes size={15} />} label="Workflows" value={workflowGroups.length.toString()} description="GitHub Actions groups." />
                <MiniStat icon={<GitBranch size={15} />} label="Branches" value={branches.length.toString()} description="Branches with runs." />
                <MiniStat icon={<GitCommit size={15} />} label="Commits" value={(detail?.commits?.length || 0).toString()} description="Recent commit records." />
                <MiniStat icon={<Package size={15} />} label="Affected Packages" value={packageMap.size > 0 ? Array.from(packageMap.values()).reduce((sum, m) => sum + m.size, 0).toString() : '0'} description="Packages with alerts." />
              </section>

              {branches.length > 0 && (
                <section>
                  <h3 className="text-micro font-bold uppercase tracking-wider text-foreground-subtle mb-3">Active Branches</h3>
                  <div className="flex flex-wrap gap-2">
                    {branches.slice(0, 12).map(branch => {
                      const branchRuns = detail!.workflowRuns.filter(r => r.branch === branch);
                      const latest = branchRuns.reduce((latest, r) => new Date(r.startedAt).getTime() > new Date(latest.startedAt).getTime() ? r : latest);
                      const failCount = branchRuns.filter(r => r.conclusion === 'failure').length;
                      return (
                        <button key={branch} onClick={() => handleBranchClick(branch)}
                          className={cn("inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-micro font-medium transition-all duration-150 text-left",
                            selectedBranch === branch ? "border-primary/40 bg-primary/10 text-primary shadow-sm" : "border-border/60 bg-surface-1/80 text-foreground-muted hover:border-foreground-subtle/30 hover:bg-surface-1 hover:text-foreground hover:shadow-sm")}>
                          <GitBranch size={12} />
                          {branch}
                          {failCount > 0 && <span className="text-critical font-mono">({failCount} failed)</span>}
                        </button>
                      );
                    })}
                    {branches.length > 12 && <span className="inline-flex items-center text-micro text-foreground-subtle italic">+{branches.length - 12} more</span>}
                  </div>
                </section>
              )}

              {detail?.languages && Object.keys(detail.languages).length > 0 && (
                <section>
                  <h3 className="text-micro font-bold uppercase tracking-wider text-foreground-subtle mb-3">Languages</h3>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(detail.languages).slice(0, 8).map(([lang, bytes]) => {
                      const total = Object.values(detail.languages).reduce((a, b) => a + b, 0);
                      const pct = total > 0 ? ((bytes / total) * 100).toFixed(0) : '0';
                      const color = LANGUAGE_COLORS[lang] || '#888';
                      return (
                        <span key={lang} className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-surface-1/80 px-3 py-1.5 text-micro text-foreground-muted shadow-sm">
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                          {lang} {pct}%
                        </span>
                      );
                    })}
                  </div>
                </section>
              )}
            </div>
          )}

          {activeTab === 'workflows' && (
            <div className="mx-auto w-full max-w-5xl space-y-5 px-4 py-5 outline-none md:px-8">
              <section className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
                <MiniStat icon={<Boxes size={15} />} label="Actions" value={workflowGroups.length.toString()} description="Unique workflow names in recent runs." />
                <MiniStat icon={<Activity size={15} />} label="Runs" value={(workflowRuns?.length ?? 0).toString()} description="Tracked workflow executions." />
                <MiniStat icon={<AlertTriangle size={15} />} label="Failures" value={(workflowRuns?.filter(run => run.conclusion === 'failure').length ?? 0).toString()} severity={(workflowRuns?.some(run => run.conclusion === 'failure')) ? 'critical' : undefined} description="Runs currently marked as failed." />
                <MiniStat icon={<GitBranch size={15} />} label="Branches" value={branches.length.toString()} description="Branches with workflow activity." />
              </section>

              <section>
                <h3 className="mb-3 flex items-center gap-2 text-micro font-bold uppercase tracking-wider text-foreground-subtle">
                  <Boxes size={14} />GitHub Actions catalog
                </h3>
                {workflowGroups.length > 0 ? (
                  <div className="grid gap-2 lg:grid-cols-2">
                    {workflowGroups.map(group => {
                      const failRuns = group.runs.filter(run => run.conclusion === 'failure').length;
                      const events = Array.from(new Set(group.runs.map(run => run.event))).slice(0, 3);
                      return (
                        <button
                          key={group.name}
                          type="button"
                          onClick={() => toggleWorkflow(group.name)}
                          className="rounded-xl border border-border/60 bg-surface-1 p-3 text-left shadow-sm transition-colors hover:bg-surface-2"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-foreground">{group.name}</p>
                              <p className="mt-1 text-micro text-foreground-subtle">
                                {group.runs.length} run{group.runs.length > 1 ? 's' : ''} · latest {formatAgo(group.latest.startedAt)}
                              </p>
                            </div>
                            <span className={cn(
                              "shrink-0 rounded-md px-1.5 py-0.5 text-micro font-mono",
                              failRuns > 0 ? "bg-critical/10 text-critical" : "bg-success/10 text-success"
                            )}>
                              {failRuns > 0 ? `${failRuns} failed` : 'ok'}
                            </span>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {events.map(event => (
                              <span key={event} className="rounded-md bg-surface-3 px-1.5 py-0.5 text-[10px] text-foreground-subtle">
                                {event}
                              </span>
                            ))}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-border/50 bg-surface-1/30 px-4 py-5 text-sm text-foreground-subtle">
                    No GitHub Actions workflow runs are available in the loaded data for this repository.
                  </div>
                )}
              </section>

              {selectedBranch && (
                <div className="flex items-center gap-2 mb-4 px-1">
                  <span className="text-micro text-foreground-subtle/60">Showing:</span>
                  <span className="inline-flex items-center gap-1 rounded-lg bg-primary/10 border border-primary/30 px-3 py-1 text-micro text-primary font-medium"><GitBranch size={12} />{selectedBranch}</span>
                  <button onClick={() => setSelectedBranch(null)} className="text-micro text-foreground-subtle hover:text-foreground transition-colors">Clear filter</button>
                </div>
              )}
              {workflowGroups.length > 0 ? (
                <div className="space-y-3">
                  {workflowGroups.map(group => {
                    const latest = group.latest;
                    const isExpanded = expandedWorkflows.has(group.name);
                    const totalRuns = group.runs.length;
                    const successRuns = group.runs.filter(r => r.conclusion === 'success').length;
                    const failRuns = group.runs.filter(r => r.conclusion === 'failure').length;
                    const latestConclusion = latest.conclusion;
                    return (
                      <div key={group.name} className="rounded-xl border border-border/60 bg-surface-1 shadow-sm overflow-hidden">
                        <button onClick={() => toggleWorkflow(group.name)} className="flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-surface-2/80 transition-colors">
                          <WorkflowDot conclusion={latestConclusion} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-body font-medium text-foreground truncate">{group.name}</span>
                              <span className={cn("text-micro px-1.5 py-0.5 rounded font-mono", latestConclusion === 'success' && "bg-success/10 text-success", latestConclusion === 'failure' && "bg-critical/10 text-critical", !latestConclusion && "bg-warning/10 text-warning")}>{latestConclusion || latest.status}</span>
                            </div>
                            <div className="flex items-center gap-3 text-micro text-foreground-subtle mt-0.5">
                              <span>{totalRuns} run{totalRuns > 1 ? 's' : ''}</span>
                              <span className="text-success">{successRuns} ok</span>
                              {failRuns > 0 && <span className="text-critical">{failRuns} failed</span>}
                              <span>{latest.branch}</span>
                              <span>{formatAgo(latest.startedAt)}</span>
                            </div>
                          </div>
                          {isExpanded ? <ChevronDown size={14} className="text-foreground-subtle shrink-0" /> : <ChevronRight size={14} className="text-foreground-subtle shrink-0" />}
                        </button>
                        {isExpanded && (
                          <div className="border-t border-border/50">
                            {group.runs.slice(0, 10).map(run => (
                              <div key={run.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-border/20 last:border-b-0 hover:bg-surface-2/60 transition-colors">
                                <WorkflowDot conclusion={run.conclusion} />
                                <div className="flex-1 min-w-0 flex items-center gap-3 text-sm">
                                  <span className="text-foreground truncate min-w-0 text-body">{run.workflowName}</span>
                                  <span className={cn("text-micro px-1.5 py-0.5 rounded-md font-mono shrink-0", run.conclusion === 'success' && "bg-success/10 text-success", run.conclusion === 'failure' && "bg-critical/10 text-critical", !run.conclusion && "bg-warning/10 text-warning")}>{run.conclusion || run.status}</span>
                                  <span className="text-micro text-foreground-subtle/70 shrink-0">{run.branch}</span>
                                  <span className="text-micro text-foreground-subtle/70 shrink-0">{run.event}</span>
                                  {run.durationMs > 0 && <span className="text-micro text-foreground-subtle/70 shrink-0 tabular-nums">{(run.durationMs / 1000).toFixed(0)}s</span>}
                                  <span className="text-micro text-foreground-subtle/70 shrink-0">{formatAgo(run.startedAt)}</span>
                                </div>
                                <a href={run.htmlUrl} target="_blank" rel="noopener noreferrer" className="text-micro font-medium text-primary/80 hover:text-primary transition-colors shrink-0">Details</a>
                              </div>
                            ))}
                            {group.runs.length > 10 && <div className="px-4 py-2 text-center text-micro text-foreground-subtle italic">+{group.runs.length - 10} more runs</div>}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Activity size={24} className="text-foreground-subtle opacity-20" />
                  <p className="mt-3 text-body text-foreground-subtle italic">{!detail ? 'Loading workflows...' : selectedBranch ? `No workflow runs on ${selectedBranch}` : 'No workflow data available'}</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'dependencies' && (
            <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-5 outline-none md:px-8">
              <DependencyRiskSummary detail={detail} />

              {detail?.dependencies && detail.dependencies.length > 0 ? (
                <section>
                  <h3 className="text-micro font-bold uppercase tracking-wider text-foreground-subtle mb-3 flex items-center gap-2">
                    <Package size={14} />Package Dependencies
                    <span className="text-foreground-subtle font-normal normal-case">· {detail.dependencies.filter(d => d.type === 'dependencies').length} prod + {detail.dependencies.filter(d => d.type === 'devDependencies').length} dev</span>
                  </h3>
                  <div className="grid gap-1">
                    {detail.dependencies.map(dep => {
                      const npmUrl = `https://www.npmjs.com/package/${dep.name}`;
                      return (
                        <div key={dep.name} className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl border border-border/60 bg-surface-1 shadow-sm hover:shadow-md transition-shadow">
                          <Package size={14} className="text-foreground-subtle shrink-0" />
                          <div className="flex-1 min-w-0 flex items-center gap-3">
                            <span className="text-body font-medium text-foreground truncate">{dep.name}</span>
                            <code className="text-micro font-mono text-foreground-subtle bg-surface-3 px-1.5 py-0.5 rounded shrink-0">{dep.version}</code>
                            <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0", dep.type === 'dependencies' ? "bg-primary/10 text-primary" : "bg-surface-3 text-foreground-subtle")}>{dep.type === 'dependencies' ? 'prod' : 'dev'}</span>
                          </div>
                          <a href={npmUrl} target="_blank" rel="noopener noreferrer" className="text-micro font-medium text-primary/70 hover:text-primary transition-colors shrink-0">npm ↗</a>
                        </div>
                      );
                    })}
                  </div>
                </section>
              ) : detail?.dependencies && detail.dependencies.length === 0 ? (
                <section>
                  <div className="flex flex-col items-center justify-center py-10 text-center rounded-xl border border-dashed border-border/50 bg-surface-1/30">
                    <Package size={22} className="text-foreground-subtle opacity-30" />
                    <p className="mt-3 text-body text-foreground-subtle italic">No package.json data available</p>
                    <p className="text-micro text-foreground-subtle/60 mt-1 max-w-sm">Run in authenticated mode or regenerate the snapshot to fetch dependency data from the repository.</p>
                  </div>
                </section>
              ) : null}
              {detail?.extended && (
                <section>
                  <h3 className="mb-3 flex items-center gap-2 text-micro font-bold uppercase tracking-wider text-foreground-subtle">
                    <InfoIcon />Repository context
                  </h3>
                  <div className="grid gap-2 md:grid-cols-2">
                    <ContextCard label="Releases" value={`${detail.extended.releases?.length ?? 0}`} />
                    <ContextCard label="Open issues" value={`${detail.extended.issues?.length ?? 0}`} />
                    <ContextCard label="Labels" value={`${detail.extended.labels?.length ?? 0}`} />
                    <ContextCard label="Default branch" value={detail.extended.branchProtection?.protected ? "protected" : "not protected"} />
                  </div>
                </section>
              )}
              {detail && (!detail.dependencies || detail.dependencies.length === 0) && (!detail.alerts || detail.alerts.length === 0) && (
                <section>
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Package size={24} className="text-foreground-subtle opacity-20" />
                    <p className="mt-3 text-body text-foreground-subtle italic">No package or alert data available</p>
                    <p className="text-micro text-foreground-subtle/60 mt-1 max-w-md">
                      This runtime can only show package inventory when package.json is reachable. Dependabot security alerts require authenticated GitHub access or an authenticated snapshot.
                    </p>
                  </div>
                </section>
              )}
            </div>
          )}

          {activeTab === 'activity' && (
            <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-5 outline-none md:px-8">
              <section className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
                <MiniStat icon={<ShieldAlert size={15} />} label="Alerts" value={(detail?.alerts.length ?? 0).toString()} severity={(detail?.alerts.length ?? 0) > 0 ? 'warning' : undefined} description="Dependabot/security items visible in this runtime." />
                <MiniStat icon={<GitPullRequest size={15} />} label="PRs" value={(detail?.pullRequests?.length ?? 0).toString()} description="Open pull requests currently tracked." />
                <MiniStat icon={<GitCommit size={15} />} label="Commits" value={(detail?.commits.length ?? 0).toString()} description="Recent commits loaded for this repository." />
                <MiniStat icon={<User size={15} />} label="Contributors" value={(detail?.contributors.length ?? 0).toString()} description="Known contributors in the loaded data." />
              </section>

              <section>
                <h3 className="text-micro font-bold uppercase tracking-wider text-foreground-subtle mb-3 flex items-center gap-2">
                  <ShieldAlert size={14} />Security Alerts
                  {detail?.alerts && detail.alerts.length > 0 && <span className="text-foreground-subtle font-normal normal-case">· {detail.alerts.length} open</span>}
                </h3>
                {detail && detail.alerts.length > 0 ? (
                  <div className="grid gap-2">
                    {detail.alerts.map(alert => {
                      const npmUrl = `https://www.npmjs.com/package/${alert.packageName}`;
                      return (
                        <div key={alert.id} className="flex items-start gap-3 rounded-xl border border-border/60 bg-surface-1 px-4 py-3 shadow-sm">
                          <ShieldAlert size={16} className={cn("mt-0.5 shrink-0", alert.severity === 'critical' && "text-critical", alert.severity === 'high' && "text-warning", alert.severity === 'medium' && "text-info", "text-foreground-subtle")} />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-body font-medium text-foreground">{alert.packageName}</span>
                              <span className="text-micro text-foreground-subtle">{alert.ecosystem}</span>
                              <span className={cn("text-micro font-mono px-1.5 py-0.5 rounded", alert.severity === 'critical' && "bg-critical/10 text-critical", alert.severity === 'high' && "bg-warning/10 text-warning", alert.severity === 'medium' && "bg-info/10 text-info")}>
                                {alert.severity}
                              </span>
                            </div>
                            <p className="mt-0.5 truncate text-sm text-foreground-subtle">{alert.summary}</p>
                            <div className="mt-1.5 flex flex-wrap items-center gap-3">
                              {alert.cveId && <span className="text-micro font-mono text-critical">{alert.cveId}</span>}
                              {alert.fixedIn && <span className="flex items-center gap-1 text-micro text-success"><RefreshCw size={11} />fix: {alert.fixedIn}</span>}
                              <span className="text-micro text-foreground-subtle">{alert.manifestPath}</span>
                            </div>
                          </div>
                          <div className="flex shrink-0 flex-col gap-1.5">
                            <a href={alert.htmlUrl} target="_blank" rel="noopener noreferrer" className="text-micro text-primary hover:underline">GitHub</a>
                            <a href={npmUrl} target="_blank" rel="noopener noreferrer" className="text-micro text-foreground-subtle transition-colors hover:text-primary">npm</a>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/50 bg-surface-1/30 py-10 text-center">
                    <ShieldAlert size={20} className="text-foreground-subtle opacity-30" />
                    <p className="mt-2 text-body text-foreground-subtle italic">{!detail ? 'Loading alerts...' : 'No Dependabot alerts open'}</p>
                    <p className="mt-1 max-w-md text-micro text-foreground-subtle/60">
                      {resolveDependabotReason(
                        detail?.availability.dependabotAlerts.reason,
                        t,
                        session?.token ? "dependabotReturnedNoIssues" : "dependabotRequiresAuth",
                      )}
                    </p>
                  </div>
                )}
              </section>

              <section>
                <h3 className="text-micro font-bold uppercase tracking-wider text-foreground-subtle mb-3 flex items-center gap-2">
                  <GitPullRequest size={14} />Pull Requests
                  {detail?.pullRequests && detail.pullRequests.length > 0 && <span className="text-foreground-subtle font-normal normal-case">· {detail.pullRequests.length} open</span>}
                </h3>
                {detail?.pullRequests && detail.pullRequests.length > 0 ? (
                  <div className="max-w-3xl grid gap-2">
                    {detail.pullRequests.map(pr => (
                      <div key={pr.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-border/60 bg-surface-1 shadow-sm">
                        <GitPullRequest size={15} className={cn("shrink-0", pr.draft ? "text-foreground-subtle" : pr.state === 'open' ? 'text-success' : 'text-primary')} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-body font-medium text-foreground truncate">{pr.title}</span>
                            {pr.draft && <span className="text-[10px] px-1 py-0.5 rounded bg-surface-3 text-foreground-subtle shrink-0">Draft</span>}
                          </div>
                          <div className="flex items-center gap-3 text-micro text-foreground-subtle mt-0.5">
                            <span>#{pr.number}</span>
                            <span className="flex items-center gap-1"><User size={10} />{pr.authorLogin}</span>
                            <span>{formatAgo(pr.createdAt)}</span>
                          </div>
                        </div>
                        <a href={pr.htmlUrl} target="_blank" rel="noopener noreferrer" className="text-micro text-primary hover:underline shrink-0">View</a>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-10 text-center rounded-xl border border-dashed border-border/50 bg-surface-1/30">
                    <GitPullRequest size={20} className="text-foreground-subtle opacity-30" />
                    <p className="mt-2 text-body text-foreground-subtle italic">{!detail ? 'Loading PRs...' : 'No open pull requests'}</p>
                  </div>
                )}
              </section>
              <section>
                <h3 className="text-micro font-bold uppercase tracking-wider text-foreground-subtle mb-3 flex items-center gap-2">
                  <Activity size={14} />PR Conversations
                </h3>
                <div className="rounded-xl border border-border/60 bg-surface-1 px-4 py-3 text-sm text-foreground-subtle">
                  Pull request review comments and discussion threads are not part of the current repository snapshot yet. This is the right place for them once the detail fetcher adds that data.
                </div>
              </section>
              <section>
                <h3 className="text-micro font-bold uppercase tracking-wider text-foreground-subtle mb-3 flex items-center gap-2">
                  <Activity size={14} />Recent Commits
                  {detail?.commits && detail.commits.length > 0 && <span className="text-foreground-subtle font-normal normal-case">· {detail.commits.length}</span>}
                </h3>
                {detail?.commits && detail.commits.length > 0 ? (
                  <div className="max-w-3xl grid gap-1">
                    {detail.commits.map(commit => (
                      <div key={commit.sha} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-surface-1/80 transition-colors border border-transparent hover:border-border/30">
                        <div className="flex shrink-0 items-center justify-center h-7 w-7 rounded-full bg-surface-3 border border-border/30 overflow-hidden">
                          {commit.authorAvatar ? <img src={commit.authorAvatar} alt="" className="h-full w-full object-cover" /> : <User size={12} className="text-foreground-subtle" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-body text-foreground truncate block">{commit.message}</span>
                          <div className="flex items-center gap-2 text-micro text-foreground-subtle">
                            <span>{commit.authorLogin}</span>
                            <span>{formatAgo(commit.date)}</span>
                          </div>
                        </div>
                        <a href={commit.htmlUrl} target="_blank" rel="noopener noreferrer" className="text-micro font-mono text-foreground-subtle hover:text-primary shrink-0">{commit.sha.slice(0, 7)}</a>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-10 text-center rounded-xl border border-dashed border-border/50 bg-surface-1/30">
                    <Activity size={20} className="text-foreground-subtle opacity-30" />
                    <p className="mt-2 text-body text-foreground-subtle italic">{!detail ? 'Loading commits...' : 'No commits tracked'}</p>
                  </div>
                )}
              </section>
            </div>
          )}
        </div>
      </Tabs.Root>
    </div>
  );
}

function TabTrigger({ value, label, count }: { value: string; label: string; count?: number }) {
  return (
    <Tabs.Trigger
      value={value}
      className={cn(
        "relative flex h-9 items-center gap-1.5 px-2.5 text-micro font-medium transition-colors outline-none whitespace-nowrap sm:gap-2 sm:px-3",
        "text-foreground-subtle hover:text-foreground",
        "data-[state=active]:text-primary data-[state=active]:after:absolute data-[state=active]:after:bottom-0 data-[state=active]:after:inset-x-3 data-[state=active]:after:h-[2px] data-[state=active]:after:bg-primary data-[state=active]:after:rounded-full"
      )}
    >
      {label}
      {count !== undefined && count > 0 && (
        <span className="rounded-md bg-surface-3 px-1.5 py-0.5 text-[10px] leading-none text-foreground-subtle font-mono">
          {count}
        </span>
      )}
    </Tabs.Trigger>
  );
}

function SignalIcon({ kind, severity }: { kind: string; severity: string }) {
  const className = severity === 'critical' ? 'text-critical' : severity === 'high' || severity === 'warning' ? 'text-warning' : 'text-foreground-subtle';
  const size = 16;
  switch (kind) {
    case 'security': return <ShieldAlert size={size} className={className} />;
    case 'workflow': return <Activity size={size} className={className} />;
    case 'stale': return <Clock size={size} className={className} />;
    case 'pr': return <GitPullRequest size={size} className={className} />;
    case 'archived': return <ArchiveIcon size={size} className={className} />;
    default: return <AlertTriangle size={size} className={className} />;
  }
}

function signalMatchesFilter(signal: AttentionSignal, filter: string) {
  if (filter === 'critical') {
    return signal.severity === 'critical' || signal.severity === 'high';
  }
  if (filter === 'warning') {
    return signal.severity === 'warning' || signal.kind === 'stale' || signal.kind === 'workflow' || signal.kind === 'pr';
  }
  return false;
}

function ArchiveIcon({ size, className }: { size: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="2" y="3" width="20" height="5" rx="1" />
      <path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8" />
      <path d="M10 12h4" />
    </svg>
  );
}

function formatAgo(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diffMin = Math.floor((now - date) / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 30) return `${diffDay}d ago`;
  return `${Math.floor(diffDay / 30)}mo ago`;
}

function WorkflowDot({ conclusion }: { conclusion: string | null }) {
  return (
    <div className={cn(
      "h-2 w-2 rounded-full shrink-0",
      conclusion === 'success' && "bg-success",
      conclusion === 'failure' && "bg-critical",
      conclusion === 'cancelled' && "text-foreground-subtle",
      !conclusion && "bg-warning"
    )} />
  );
}

function MiniStat({
  icon,
  label,
  value,
  description,
  severity,
  tooltip,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
  description?: string;
  severity?: 'critical' | 'warning';
  tooltip?: string;
}) {
  const [showTip, setShowTip] = useState(false);
  const isZero = isZeroMetricValue(value);
  return (
    <div
      className={cn(
        "relative flex min-h-[6.75rem] flex-col justify-between rounded-xl border border-border/60 bg-surface-1 px-3.5 py-3 shadow-sm transition-shadow hover:shadow-md",
        isZero && "border-border/35 bg-surface-1/45 shadow-none hover:shadow-sm"
      )}
      onMouseEnter={() => setShowTip(true)}
      onMouseLeave={() => setShowTip(false)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="block text-[10px] font-semibold uppercase tracking-widest text-foreground-subtle">{label}</span>
          {description && <span className="mt-1 block text-[10px] leading-snug text-foreground-subtle/70">{description}</span>}
        </div>
        {icon && (
          <span className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-3 text-foreground-subtle",
            severity === 'critical' && "bg-critical/10 text-critical",
            severity === 'warning' && "bg-warning/10 text-warning",
            isZero && "bg-surface-2/60 text-foreground-subtle/45"
          )}>
            {icon}
          </span>
        )}
      </div>
      <span className={cn(
        "mt-3 block text-title font-bold font-headline tracking-tight tabular-nums",
        severity === 'critical' && "text-critical",
        severity === 'warning' && "text-warning",
        !severity && "text-foreground",
        isZero && "text-foreground-subtle/45"
      )}>
        {value}
      </span>
      {tooltip && showTip && (
        <div className="absolute bottom-full left-0 mb-2 w-52 rounded-lg border border-border/60 bg-surface-3 p-2.5 text-[10px] text-foreground-subtle shadow-lg z-10 leading-relaxed">
          {tooltip}
        </div>
      )}
    </div>
  );
}

function DependencyRiskSummary({ detail }: { detail?: RepoSnapshotDetail }) {
  const { session, t } = useApp();
  const dependencies = detail?.dependencies ?? [];
  const alerts = detail?.alerts ?? [];
  const prodCount = dependencies.filter((dep) => dep.type === 'dependencies').length;
  const devCount = dependencies.filter((dep) => dep.type === 'devDependencies').length;
  const criticalOrHigh = alerts.filter((alert) => alert.severity === 'critical' || alert.severity === 'high').length;
  const affectedPackages = new Set(alerts.map((alert) => `${alert.ecosystem}:${alert.packageName}`)).size;
  const dependabotAvailable = Boolean(detail?.availability.dependabotAlerts.available);

  return (
    <section className="grid gap-2.5 sm:grid-cols-4">
      <MiniStat
        icon={<ShieldAlert size={15} />}
        label="Risk alerts"
        value={criticalOrHigh.toString()}
        severity={criticalOrHigh > 0 ? 'critical' : undefined}
        description="Critical/high alerts."
        tooltip="Critical and high severity Dependabot alerts visible in this runtime."
      />
      <MiniStat
        icon={<AlertTriangle size={15} />}
        label="Affected"
        value={affectedPackages.toString()}
        severity={affectedPackages > 0 ? 'warning' : undefined}
        description="Packages tied to alerts."
      />
      <MiniStat icon={<Package size={15} />} label="Prod deps" value={prodCount.toString()} description="Runtime dependency count." />
      <MiniStat icon={<Package size={15} />} label="Dev deps" value={devCount.toString()} description="Build/test dependency count." />
      <div className="rounded-xl border border-border/60 bg-surface-1 px-3.5 py-3 text-micro text-foreground-subtle sm:col-span-4">
        <span className={cn("font-semibold", dependabotAvailable ? "text-success" : "text-warning")}>
          {dependabotAvailable ? "Authenticated alert data available." : resolveDependabotReason(detail?.availability.dependabotAlerts.reason, t, session?.token ? "dependabotReturnedNoIssues" : "dependabotRequiresAuth")}
        </span>{" "}
        <span>
          {t("packageInventorySource")}
        </span>
      </div>
    </section>
  );
}

function ContextCard({ label, value }: { label: string; value: string }) {
  const isZero = isZeroMetricValue(value);
  return (
    <div className={cn(
      "rounded-xl border border-border/60 bg-surface-1 px-3.5 py-3",
      isZero && "border-border/35 bg-surface-1/45"
    )}>
      <p className="text-micro font-semibold uppercase tracking-wider text-foreground-subtle">{label}</p>
      <p className={cn("mt-1 text-sm font-semibold text-foreground", isZero && "text-foreground-subtle/45")}>{value}</p>
    </div>
  );
}

function InfoIcon() {
  return <Package size={14} />;
}

const LANGUAGE_COLORS: Record<string, string> = {
  JavaScript: '#f1e05a',
  TypeScript: '#2b7489',
  Python: '#3572A5',
  Java: '#b07219',
  'C++': '#f34b7d',
  'C#': '#178600',
  Go: '#00ADD8',
  Rust: '#dea584',
  Ruby: '#701516',
  PHP: '#4F5D95',
  HTML: '#e34c26',
  CSS: '#563d7c',
  Shell: '#89e051',
  Kotlin: '#A97BFF',
  Swift: '#F05138',
  Dart: '#00B4AB',
  Vue: '#41b883',
  Scala: '#c22d40',
  Lua: '#000080',
  R: '#198CE7',
};
