import { motion, AnimatePresence } from 'framer-motion';
import { Star, GitFork, Clock, Shield, Activity, XCircle, ChevronRight, BarChart3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import { ProjectImage } from '@/components/ProjectImage';
import { formatRelativeTime } from '@/utils/health';
import type { RepositoryRef, RepoHealth, LanguageBreakdown, WorkflowRun } from '@/types';
import { useState } from 'react';

interface RepoCardProps {
  repo: RepositoryRef;
  health?: RepoHealth | null;
  languages?: LanguageBreakdown | null;
  runs?: WorkflowRun[];
  isPrimary?: boolean;
}

export function RepoCard({ repo, health, languages, runs, isPrimary }: RepoCardProps) {
  const { t } = useApp();
  const navigate = useNavigate();
  const [isHovered, setIsHovered] = useState(false);

  const isCritical = health?.status === 'critical';
  const lastRunFailed = runs?.[0]?.conclusion === 'failure';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`group relative flex flex-col rounded-2xl border bg-card transition-all cursor-pointer overflow-hidden h-[200px] ${
        isPrimary 
          ? 'border-primary/40 ring-1 ring-primary/10 shadow-md' 
          : lastRunFailed
            ? 'border-critical/50 shadow-[0_0_15px_rgba(var(--critical),0.1)]' 
            : 'border-border hover:border-primary/20 shadow-sm'
      }`}
      onClick={() => navigate(`/repo/${repo.owner}/${repo.name}`)}
    >
      {/* Header Area */}
      <div className="p-5 flex gap-4 items-start flex-1 min-w-0">
        <ProjectImage 
          owner={repo.owner}
          repo={repo.name}
          defaultBranch={repo.defaultBranch}
          language={repo.language}
          className="h-16 w-16 rounded-xl border border-border bg-secondary/10 shrink-0"
        />
        
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-black text-base uppercase tracking-tight truncate text-foreground group-hover:text-primary transition-colors">
              {repo.name}
            </h3>
            {isPrimary && (
              <span className="bg-primary text-[10px] font-black text-white px-2 py-0.5 rounded-md uppercase tracking-widest">
                Primary
              </span>
            )}
          </div>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest truncate">{repo.owner}</p>
          <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed h-10 mt-1">
            {repo.description || t('noDescription')}
          </p>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="px-5 pb-5 grid grid-cols-4 gap-2.5">
        <StatusIndicator 
          label="Health" 
          value={health?.score ?? '--'} 
          variant={health?.status === 'healthy' ? 'success' : health?.status === 'warning' ? 'warning' : 'critical'}
        />
        <StatusIndicator 
          label="CI Rate" 
          value={health?.workflowSuccessRate ? `${health.workflowSuccessRate}%` : '--'} 
          variant={health?.workflowSuccessRate && health.workflowSuccessRate > 80 ? 'success' : 'warning'}
          failed={lastRunFailed}
        />
        <StatusIndicator 
          label="Alerts" 
          value={health?.dependabotOpenCount ?? 0} 
          variant={health && health.dependabotOpenCount > 0 ? 'critical' : 'success'}
          icon={Shield}
        />
        <StatusIndicator 
          label="Stars" 
          value={repo.stars} 
          variant="neutral"
          icon={Star}
        />
      </div>

      {/* Hover Chart Overlay */}
      <AnimatePresence>
        {isHovered && runs && runs.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute inset-0 bg-card/98 backdrop-blur-md p-5 flex flex-col justify-between z-30"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-1.5">
                <Activity size={14} /> CI History (Last 15)
              </span>
              <span className="text-xs font-bold text-muted-foreground">{formatRelativeTime(repo.lastPushAt, t)}</span>
            </div>
            
            <div className="flex-1 flex items-end gap-1.5 px-1">
              {runs.slice(0, 15).reverse().map((run, i) => (
                <div 
                  key={run.id}
                  className={`flex-1 rounded-t-md transition-all relative group/bar ${
                    run.conclusion === 'success' 
                      ? 'bg-success' 
                      : run.conclusion === 'failure' 
                        ? 'bg-critical border-t-2 border-white/40' 
                        : 'bg-muted'
                  }`}
                  style={{ 
                    height: run.conclusion === 'success' ? '50%' : run.conclusion === 'failure' ? '100%' : '30%',
                    opacity: 0.6 + (i / 15) * 0.4
                  }}
                >
                  {run.conclusion === 'failure' && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 text-critical">
                      <XCircle size={8} strokeWidth={3} />
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
               <span className="text-xs font-bold text-foreground truncate max-w-[200px]">
                 {runs[0].workflowName}
               </span>
               <ChevronRight size={16} className="text-primary" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function StatusIndicator({ label, value, variant, icon: Icon, failed }: {
  label: string;
  value: string | number;
  variant: 'success' | 'warning' | 'critical' | 'neutral';
  icon?: React.ElementType;
  failed?: boolean;
}) {
  const colorClass = 
    variant === 'success' ? 'bg-success/15 text-success border-success/30' :
    variant === 'warning' ? 'bg-warning/15 text-warning border-warning/30' :
    variant === 'critical' ? 'bg-critical/15 text-critical border-critical/30' :
    'bg-secondary/40 text-muted-foreground border-border/60';

  return (
    <div className={`flex flex-col items-center justify-center p-2 rounded-xl border ${colorClass} ${failed ? 'animate-pulse ring-2 ring-critical/40' : ''}`}>
      <span className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-1">{label}</span>
      <div className="flex items-center gap-1.5">
        {Icon && <Icon size={12} strokeWidth={3} />}
        {failed && <XCircle size={12} className="text-critical" />}
        <span className="text-sm font-black tabular-nums">{value}</span>
      </div>
    </div>
  );
}
