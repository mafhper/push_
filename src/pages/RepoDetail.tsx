import { useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useApp } from '@/contexts/AppContext';
import { useRepos, useCommits, useWorkflowRuns, useLanguages, useContributors, useDependabotAlerts } from '@/hooks/useGitHub';
import { initOctokit } from '@/services/github';
import { LanguageBar } from '@/components/LanguageBar';
import { HealthBadge } from '@/components/HealthBadge';
import { ProjectImage } from '@/components/ProjectImage';
import { calculateHealth, formatRelativeTime } from '@/utils/health';
import {
  ArrowLeft, Star, GitFork, Eye, ExternalLink,
  CheckCircle2, XCircle, Loader2, GitCommit, Shield,
  BarChart3, Users, Zap, Info, ShieldAlert
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell 
} from 'recharts';

export default function RepoDetail() {
  const { owner, repo } = useParams<{ owner: string; repo: string }>();
  const { t, session } = useApp();
  const navigate = useNavigate();

  useEffect(() => {
    if (!session) { navigate('/auth'); return; }
    initOctokit(session.token);
  }, [session, navigate]);

  const { data: repos } = useRepos();
  const repoData = repos?.find(r => r.owner === owner && r.name === repo);

  const { data: commits, isLoading: loadingCommits } = useCommits(owner || '', repo || '');
  const { data: runs, isLoading: loadingRuns } = useWorkflowRuns(owner || '', repo || '');
  const { data: languages } = useLanguages(owner || '', repo || '');
  const { data: contributors } = useContributors(owner || '', repo || '');
  const { data: alerts } = useDependabotAlerts(owner || '', repo || '');

  const health = useMemo(() => {
    if (repoData && runs && alerts) {
      return calculateHealth(repoData, runs, alerts);
    }
    return null;
  }, [repoData, runs, alerts]);

  const chartData = useMemo(() => {
    if (!runs) return [];
    // Take last 20 runs and reverse to show chronological order
    return runs.slice(0, 20).reverse().map(run => ({
      name: run.workflowName,
      duration: Math.round(run.durationMs / 1000), // in seconds
      status: run.conclusion,
      date: new Date(run.updatedAt).toLocaleDateString(),
    }));
  }, [runs]);

  const failureReasons = useMemo(() => {
    if (!runs) return [];
    return runs.filter(r => r.conclusion === 'failure').slice(0, 5);
  }, [runs]);

  if (!session || !owner || !repo) return null;

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* Navigation & Header */}
      <div className="space-y-4">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors"
        >
          <ArrowLeft size={14} strokeWidth={2.5} />
          {t('back')}
        </button>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="flex flex-col sm:flex-row gap-6 sm:items-center">
            {repoData && (
              <ProjectImage
                owner={owner}
                repo={repo}
                defaultBranch={repoData.defaultBranch}
                language={repoData.language}
                className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl border border-border bg-card shadow-sm"
              />
            )}
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <h1 className="text-4xl font-black tracking-tighter uppercase">{repo}</h1>
                {health && <HealthBadge status={health.status} score={health.score} size="lg" />}
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <span className="font-medium">{owner}</span>
                <span>•</span>
                <a
                  href={repoData?.htmlUrl || `https://github.com/${owner}/${repo}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs font-bold text-primary hover:underline"
                >
                  <ExternalLink size={12} />
                  VIEW ON GITHUB
                </a>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <MetricBox icon={Star} value={repoData?.stars ?? 0} label={t('stars')} color="text-warning" />
            <MetricBox icon={GitFork} value={repoData?.forks ?? 0} label={t('forks')} color="text-info" />
            <MetricBox icon={Eye} value={repoData?.watchers ?? 0} label="Watchers" color="text-primary" />
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Overview & CI */}
        <div className="lg:col-span-2 space-y-6">
          {/* CI/CD Visual Report */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl border border-border bg-card p-6 space-y-6 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black uppercase tracking-widest text-foreground flex items-center gap-2">
                <Zap size={16} className="text-primary" />
                {t('ciSuccess')} ({health?.workflowSuccessRate ?? '--'}%)
              </h2>
              <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <div className="h-3 w-3 rounded-sm bg-success" /> 
                  <CheckCircle2 size={12} className="text-success" />
                  {t('success')}
                </span>
                <span className="flex items-center gap-1.5">
                  <div className="h-3 w-3 rounded-sm bg-critical border-2 border-white/20" /> 
                  <XCircle size={12} className="text-critical" />
                  {t('failure')}
                </span>
              </div>
            </div>

            <div className="h-[200px] w-full">
              {loadingRuns ? (
                <div className="flex items-center justify-center h-full"><Loader2 className="animate-spin text-muted-foreground" /></div>
              ) : chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <defs>
                      <pattern id="pattern-fail" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                        <rect width="2" height="4" fill="rgba(255,255,255,0.2)" />
                      </pattern>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="date" hide />
                    <YAxis hide />
                    <Tooltip 
                      cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="rounded-xl border border-border bg-popover p-3 shadow-xl">
                              <div className="flex items-center gap-2 mb-1">
                                {data.status === 'success' ? <CheckCircle2 size={14} className="text-success" /> : <XCircle size={14} className="text-critical" />}
                                <p className="text-xs font-bold uppercase tracking-widest">{data.name}</p>
                              </div>
                              <p className="text-[10px] text-muted-foreground ml-5">{data.date}</p>
                              <p className={`text-xs font-black mt-1 ml-5 ${data.status === 'success' ? 'text-success' : 'text-critical'}`}>
                                {data.status?.toUpperCase()} • {data.duration}s
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="duration" radius={[4, 4, 0, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.status === 'success' ? 'hsl(var(--success))' : 'hsl(var(--critical))'} 
                          stroke={entry.status === 'failure' ? 'white' : 'none'}
                          strokeWidth={entry.status === 'failure' ? 1 : 0}
                          strokeOpacity={0.3}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground text-xs italic">
                  No workflow data available.
                </div>
              )}
            </div>

            {failureReasons.length > 0 && (
              <div className="space-y-3 pt-4 border-t border-border/50">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-critical flex items-center gap-1.5">
                  <ShieldAlert size={12} />
                  {t('failureReport')}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {failureReasons.map(run => (
                    <div key={run.id} className="rounded-xl border border-critical/10 bg-critical/5 p-3 space-y-1">
                      <p className="text-xs font-bold truncate">{run.workflowName}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {run.branch} • {formatRelativeTime(run.updatedAt, t)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>

          {/* Activity Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Recent Commits */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-3xl border border-border bg-card p-6 space-y-4"
            >
              <h2 className="text-sm font-black uppercase tracking-widest text-foreground flex items-center gap-2">
                <GitCommit size={16} className="text-primary" />
                {t('commits')}
              </h2>
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {loadingCommits ? (
                  <div className="flex justify-center py-8"><Loader2 className="animate-spin text-muted-foreground" /></div>
                ) : commits?.map(c => (
                  <a
                    key={c.sha}
                    href={c.htmlUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-start gap-3 transition-colors"
                  >
                    <img src={c.authorAvatar} alt="" className="h-6 w-6 rounded-full mt-1 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium line-clamp-1 group-hover:text-primary transition-colors">{c.message}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">
                        {c.sha.slice(0, 7)} • {formatRelativeTime(c.date, t)}
                      </p>
                    </div>
                  </a>
                ))}
              </div>
            </motion.div>

            {/* Metrics & Languages */}
            <div className="space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-3xl border border-border bg-card p-6 space-y-4"
              >
                <h2 className="text-sm font-black uppercase tracking-widest text-foreground flex items-center gap-2">
                  <BarChart3 size={16} className="text-primary" />
                  {t('languages')}
                </h2>
                {languages && Object.keys(languages).length > 0 ? (
                  <div className="space-y-6">
                    <LanguageBar languages={languages} showLabels />
                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t('linesOfCode')}</span>
                        <p className="text-lg font-black tabular-nums">
                          {repoData?.size ? (repoData.size * 50).toLocaleString() : '--'}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t('issues')}</span>
                        <p className="text-lg font-black tabular-nums">{repoData?.openIssues ?? 0}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic py-4">{t('calculating')}...</p>
                )}
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-3xl border border-border bg-card p-6 space-y-4"
              >
                <h2 className="text-sm font-black uppercase tracking-widest text-foreground flex items-center gap-2">
                  <Users size={16} className="text-primary" />
                  {t('contributors')}
                </h2>
                <div className="flex flex-wrap gap-2">
                  {contributors?.map(c => (
                    <div key={c.login} title={`${c.login} (${c.contributions} commits)`} className="relative group">
                      <img 
                        src={c.avatarUrl} 
                        alt={c.login} 
                        className="h-8 w-8 rounded-full border-2 border-background group-hover:border-primary transition-all shadow-sm" 
                      />
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>
          </div>
        </div>

        {/* Right Column: Security & Metadata */}
        <div className="space-y-6">
          {/* Security Summary */}
          <motion.div
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            className={`rounded-3xl border p-6 space-y-6 shadow-sm ${
              alerts && alerts.length > 0 ? 'border-critical/20 bg-critical/5' : 'border-border bg-card'
            }`}
          >
            <h2 className="text-sm font-black uppercase tracking-widest text-foreground flex items-center gap-2">
              <Shield size={16} className={alerts && alerts.length > 0 ? 'text-critical' : 'text-primary'} />
              {t('security')}
            </h2>
            
            {alerts && alerts.length > 0 ? (
              <div className="space-y-4">
                <div className="flex gap-2">
                  <div className="flex-1 rounded-2xl bg-critical/10 p-3 text-center space-y-1">
                    <p className="text-xl font-black text-critical">{alerts.filter(a => a.severity === 'critical').length}</p>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-critical">Critical</p>
                  </div>
                  <div className="flex-1 rounded-2xl bg-warning/10 p-3 text-center space-y-1">
                    <p className="text-xl font-black text-warning">{alerts.filter(a => a.severity === 'high').length}</p>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-warning">High</p>
                  </div>
                </div>
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                  {alerts.map(a => (
                    <a
                      key={a.id}
                      href={a.htmlUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block p-3 rounded-2xl bg-background/50 border border-border/50 hover:border-primary/30 transition-all space-y-1"
                    >
                      <p className="text-xs font-bold leading-tight line-clamp-2">{a.summary}</p>
                      <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                        {a.packageName} • {a.severity}
                      </p>
                    </a>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center space-y-2">
                <CheckCircle2 size={32} className="text-success opacity-50" />
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{t('noAlerts')}</p>
              </div>
            )}
          </motion.div>

          {/* Repo Info */}
          <motion.div
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            className="rounded-3xl border border-border bg-card p-6 space-y-6"
          >
            <h2 className="text-sm font-black uppercase tracking-widest text-foreground flex items-center gap-2">
              <Info size={16} className="text-primary" />
              Metadata
            </h2>
            
            <div className="space-y-4">
              <InfoRow label="Default Branch" value={repoData?.defaultBranch ?? '--'} />
              <InfoRow label="License" value="MIT" /> {/* Hardcoded for now, could be dynamic */}
              <InfoRow label="Created" value={repoData?.createdAt ? new Date(repoData.createdAt).toLocaleDateString() : '--'} />
              <InfoRow label="Last Push" value={repoData?.lastPushAt ? new Date(repoData.lastPushAt).toLocaleDateString() : '--'} />
              <div className="pt-2 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Topics</span>
                <div className="flex flex-wrap gap-1.5">
                  {repoData?.topics.map(topic => (
                    <span key={topic} className="rounded-lg bg-secondary px-2 py-0.5 text-xs font-bold">
                      #{topic}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

function MetricBox({ icon: Icon, value, label, color }: {
  icon: React.ElementType;
  value: number | string;
  label: string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-2 shadow-sm">
      <Icon size={18} className={color} strokeWidth={2.5} />
      <div className="flex flex-col">
        <span className="text-lg font-black leading-none tabular-nums">{value}</span>
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</span>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border/50 pb-2">
      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</span>
      <span className="text-xs font-black">{value}</span>
    </div>
  );
}
