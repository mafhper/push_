import { motion } from 'framer-motion';
import { useCommits, useWorkflowRuns, useDependabotAlerts, useLanguages } from '@/hooks/useGitHub';
import { useApp } from '@/contexts/useApp';
import { calculateHealth, formatRelativeTime } from '@/utils/health';
import { HealthBadge } from '@/components/HealthBadge';
import { LanguageBar } from '@/components/LanguageBar';
import { ProjectImage } from '@/components/ProjectImage';
import { 
  GitCommit, Activity, ShieldAlert, CheckCircle2, XCircle, 
  ExternalLink, ArrowRight, Clock, Star, GitFork
} from 'lucide-react';
import type { RepositoryRef } from '@/types';
import { useNavigate } from 'react-router-dom';

interface MainRepoHighlightProps {
  repo: RepositoryRef;
}

export function MainRepoHighlight({ repo }: MainRepoHighlightProps) {
  const { t } = useApp();
  const navigate = useNavigate();
  
  const { data: commits } = useCommits(repo.owner, repo.name);
  const { data: runs } = useWorkflowRuns(repo.owner, repo.name);
  const { data: alerts } = useDependabotAlerts(repo.owner, repo.name);
  const { data: languages } = useLanguages(repo.owner, repo.name);

  const health = runs && alerts ? calculateHealth(repo, runs, alerts) : null;
  const isCritical = health?.status === 'critical';

  const recentCommits = commits?.slice(0, 3) || [];
  const latestRuns = runs?.slice(0, 5) || [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative overflow-hidden rounded-3xl border bg-card p-6 sm:p-8 transition-all shadow-sm ${
        isCritical ? 'border-critical/50 shadow-[0_0_20px_rgba(var(--critical),0.1)]' : 'border-primary/20'
      }`}
    >
      {isCritical && (
        <div className="absolute top-0 left-0 w-full h-1 bg-critical animate-pulse z-20" />
      )}
      <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/5 blur-3xl z-0" />
      
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex flex-col sm:flex-row gap-6">
            <div className="shrink-0 flex items-center justify-center relative">
              <ProjectImage 
                owner={repo.owner}
                repo={repo.name}
                defaultBranch={repo.defaultBranch}
                language={repo.language}
                className={`h-24 w-24 sm:h-32 sm:w-32 rounded-3xl border bg-card shadow-sm ${
                  isCritical ? 'border-critical/30' : 'border-border'
                }`}
              />
              {isCritical && (
                <div className="absolute -bottom-2 -right-2 bg-critical text-white p-1.5 rounded-xl shadow-lg border-2 border-card">
                  <XCircle size={20} />
                </div>
              )}
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                {isCritical ? (
                  <span className="rounded-full bg-critical px-4 py-1.5 text-xs font-black uppercase tracking-widest text-white shadow-lg animate-pulse">
                    Action Required
                  </span>
                ) : (
                  <span className="rounded-full bg-primary px-4 py-1.5 text-xs font-black uppercase tracking-widest text-primary-foreground shadow-sm">
                    {t('activeDevelopment')}
                  </span>
                )}
                {health && <HealthBadge status={health.status} score={health.score} size="lg" />}
              </div>
              <h2 className="text-4xl sm:text-5xl font-black tracking-tight text-foreground flex items-center gap-3">
                {repo.name}
                <a 
                  href={repo.htmlUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  <ExternalLink size={24} />
                </a>
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl leading-relaxed font-medium">
                {repo.description || t('noDescription')}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-8 text-base text-muted-foreground font-bold">
            <div className="flex items-center gap-2">
              <Star size={20} className="text-warning" />
              <span className="text-foreground">{repo.stars}</span> {t('stars')}
            </div>
            <div className="flex items-center gap-2">
              <GitFork size={20} className="text-info" />
              <span className="text-foreground">{repo.forks}</span> {t('forks')}
            </div>
            <div className="flex items-center gap-2">
              <Clock size={20} />
              <span>{t('lastUpdated')} {formatRelativeTime(repo.lastPushAt, t)}</span>
            </div>
          </div>

          {languages && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-black uppercase tracking-widest text-muted-foreground">
                <span>{t('languages')}</span>
              </div>
              <LanguageBar languages={languages} />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Recent Commits */}
            <div className="rounded-2xl border border-border bg-background/50 p-5 space-y-4 shadow-inner">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-muted-foreground">
                <GitCommit size={16} />
                {t('commits')}
              </div>
              <div className="space-y-4">
                {recentCommits.length > 0 ? recentCommits.map(commit => (
                  <div key={commit.sha} className="flex flex-col gap-1">
                    <p className="text-sm font-bold line-clamp-1">{commit.message}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground font-semibold">
                      <img src={commit.authorAvatar} alt="" className="h-5 w-5 rounded-full" />
                      <span>{commit.authorLogin}</span>
                      <span>|</span>
                      <span>{formatRelativeTime(commit.date, t)}</span>
                    </div>
                  </div>
                )) : (
                  <p className="text-sm text-muted-foreground italic">No recent commits found.</p>
                )}
              </div>
            </div>

            {/* CI Status */}
            <div className="rounded-2xl border border-border bg-background/50 p-5 space-y-4 shadow-inner">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-muted-foreground">
                <Activity size={16} />
                {t('workflows')}
              </div>
              <div className="space-y-3">
                {latestRuns.length > 0 ? latestRuns.map(run => (
                  <div key={run.id} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      {run.conclusion === 'success' ? (
                        <CheckCircle2 size={16} className="text-success shrink-0" />
                      ) : run.conclusion === 'failure' ? (
                        <XCircle size={16} className="text-critical shrink-0" />
                      ) : (
                        <Clock size={16} className="text-muted-foreground shrink-0" />
                      )}
                      <span className="text-sm font-bold truncate">{run.workflowName}</span>
                    </div>
                    <span className="text-xs text-muted-foreground font-semibold shrink-0">
                      {formatRelativeTime(run.updatedAt, t)}
                    </span>
                  </div>
                )) : (
                  <p className="text-sm text-muted-foreground italic">No workflow runs found.</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Health & Actions */}
        <div className="flex flex-col justify-between space-y-8">
          <div className="space-y-8">
            <div className="rounded-2xl border border-border bg-background/50 p-8 flex flex-col items-center justify-center text-center space-y-4 shadow-inner">
              <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                {t('healthScore')}
              </span>
              <div className="relative flex items-center justify-center">
                <svg className="h-32 w-32 transform -rotate-90">
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    stroke="currentColor"
                    strokeWidth="10"
                    fill="transparent"
                    className="text-secondary"
                  />
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    stroke="currentColor"
                    strokeWidth="10"
                    fill="transparent"
                    strokeDasharray={351.8}
                    strokeDashoffset={351.8 - (351.8 * (health?.score || 0)) / 100}
                    className={`transition-all duration-1000 ease-out ${
                      health?.status === 'healthy' ? 'text-success' :
                      health?.status === 'warning' ? 'text-warning' : 'text-critical'
                    }`}
                  />
                </svg>
                <span className="absolute text-4xl font-black tabular-nums">
                  {health?.score ?? '--'}
                </span>
              </div>
            </div>

            {alerts && alerts.length > 0 && (
              <div className="rounded-2xl border border-critical/30 bg-critical/5 p-5 space-y-4 shadow-sm">
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-critical">
                  <ShieldAlert size={18} />
                  {t('alerts')}
                </div>
                <div className="flex flex-wrap gap-3">
                  <span className="rounded-lg bg-critical/20 px-3 py-1.5 text-xs font-black text-critical">
                    {alerts.filter(a => a.severity === 'critical').length} Critical
                  </span>
                  <span className="rounded-lg bg-warning/20 px-3 py-1.5 text-xs font-black text-warning">
                    {alerts.filter(a => a.severity === 'high').length} High
                  </span>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => navigate(`/repo/${repo.owner}/${repo.name}`)}
            className="group w-full h-14 rounded-2xl bg-foreground text-background font-bold flex items-center justify-center gap-2 hover:bg-primary hover:text-primary-foreground transition-all duration-300"
          >
            {t('viewDetails')}
            <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
