import { useMemo } from 'react';
import { useApp } from '@/contexts/useApp';
import { useWorkflowRuns, useDependabotAlerts } from '@/hooks/useGitHub';
import { calculateHealth } from '@/utils/health';
import { Shield, Activity, CheckCircle2, AlertTriangle, XCircle, Heart, Zap, Globe, GitCommit } from 'lucide-react';
import type { RepositoryRef, RepoHealth } from '@/types';
import { useNavigate } from 'react-router-dom';

interface GlobalHealthSummaryProps {
  repos: RepositoryRef[];
}

export function GlobalHealthSummary({ repos }: GlobalHealthSummaryProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <FleetHealthCard repos={repos} />
      <SecuritySurfaceCard repos={repos} />
      <CIReliabilityCard repos={repos} />
      <ActivityPulseCard repos={repos} />
    </div>
  );
}

function FleetHealthCard({ repos }: { repos: RepositoryRef[] }) {
  const { t } = useApp();
  
  const healthData = repos.map(repo => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const { data: runs } = useWorkflowRuns(repo.owner, repo.name);
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const { data: alerts } = useDependabotAlerts(repo.owner, repo.name);
    if (!runs || !alerts) return null;
    return calculateHealth(repo, runs, alerts);
  }).filter(Boolean) as RepoHealth[];

  const healthyCount = healthData.filter(h => h.status === 'healthy').length;
  const atRiskCount = healthData.filter(h => h.status !== 'healthy').length;

  return (
    <SummaryCard
      title="Fleet Health"
      icon={Globe}
      mainValue={healthData.length > 0 ? `${Math.round((healthyCount / healthData.length) * 100)}%` : '--'}
      subValue="Operational"
      footer={
        <div className="flex gap-3">
          <span className="text-success font-black">{healthyCount} Healthy</span>
          <span className={atRiskCount > 0 ? 'text-critical font-black' : 'text-muted-foreground'}>{atRiskCount} At Risk</span>
        </div>
      }
    />
  );
}

function SecuritySurfaceCard({ repos }: { repos: RepositoryRef[] }) {
  const { t } = useApp();
  const navigate = useNavigate();
  
  const allAlerts = repos.map(repo => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const { data: alerts } = useDependabotAlerts(repo.owner, repo.name);
    return { repo: repo.name, alerts: alerts || [] };
  });

  const affectedRepos = allAlerts.filter(r => r.alerts.length > 0).length;
  const totalCritical = allAlerts.reduce((acc, r) => acc + r.alerts.filter(a => a.severity === 'critical').length, 0);

  return (
    <SummaryCard
      title="Security Surface"
      icon={Shield}
      mainValue={affectedRepos}
      subValue="Repos Affected"
      onClick={() => navigate('/alerts')}
      variant={totalCritical > 0 ? 'critical' : affectedRepos > 0 ? 'warning' : 'success'}
      footer={
        <div className="flex gap-3">
          <span className={totalCritical > 0 ? 'text-critical font-black' : 'text-muted-foreground'}>{totalCritical} Critical</span>
          <span className="text-muted-foreground">{allAlerts.reduce((acc, r) => acc + r.alerts.length, 0)} Total</span>
        </div>
      }
    />
  );
}

function CIReliabilityCard({ repos }: { repos: RepositoryRef[] }) {
  const { t } = useApp();
  
  const allRuns = repos.map(repo => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const { data: runs } = useWorkflowRuns(repo.owner, repo.name);
    return runs || [];
  }).flat();

  const successRate = allRuns.length > 0 
    ? Math.round((allRuns.filter(r => r.conclusion === 'success').length / allRuns.length) * 100)
    : null;

  const activeWorkflows = repos.length; // Simplified

  return (
    <SummaryCard
      title="CI Reliability"
      icon={Zap}
      mainValue={successRate !== null ? `${successRate}%` : '--'}
      subValue="Avg Success Rate"
      variant={successRate && successRate < 80 ? 'warning' : 'success'}
      footer={
        <div className="flex gap-3">
          <span className="text-muted-foreground">{allRuns.filter(r => r.conclusion === 'failure').length} Recent Failures</span>
        </div>
      }
    />
  );
}

function ActivityPulseCard({ repos }: { repos: RepositoryRef[] }) {
  const { t } = useApp();
  
  const lastPush = useMemo(() => {
    if (repos.length === 0) return null;
    return [...repos].sort((a, b) => new Date(b.lastPushAt).getTime() - new Date(a.lastPushAt).getTime())[0];
  }, [repos]);

  return (
    <SummaryCard
      title="Activity Pulse"
      icon={Activity}
      mainValue={lastPush ? formatRelativeTimeSimple(lastPush.lastPushAt) : '--'}
      subValue="Since last push"
      footer={
        <div className="flex flex-col">
          <span className="text-muted-foreground truncate font-bold text-[10px]">
            {lastPush ? `Latest: ${lastPush.name}` : 'No activity'}
          </span>
        </div>
      }
    />
  );
}

// Reusable UI Component for Summary Cards
function SummaryCard({ title, icon: Icon, mainValue, subValue, footer, onClick, variant = 'neutral' }: {
  title: string;
  icon: React.ElementType;
  mainValue: string | number;
  subValue: string;
  footer: React.ReactNode;
  onClick?: () => void;
  variant?: 'success' | 'warning' | 'critical' | 'neutral';
}) {
  const glowClass = 
    variant === 'critical' ? 'shadow-[0_0_15px_rgba(var(--critical),0.15)] border-critical/30' :
    variant === 'warning' ? 'shadow-[0_0_15px_rgba(var(--warning),0.10)] border-warning/30' :
    'shadow-sm border-border';

  return (
    <div 
      onClick={onClick}
      className={`relative overflow-hidden rounded-3xl border bg-card p-6 flex flex-col justify-between transition-all ${glowClass} ${onClick ? 'cursor-pointer hover:scale-[1.02] active:scale-[0.98]' : ''}`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-muted-foreground font-black uppercase tracking-widest text-[11px]">
          <Icon size={16} strokeWidth={2.5} />
          {title}
        </div>
        {onClick && <ChevronRightSmall />}
      </div>

      <div className="space-y-1">
        <div className="flex items-baseline gap-2">
          <h2 className="text-4xl font-black tracking-tighter tabular-nums leading-none">{mainValue}</h2>
        </div>
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{subValue}</p>
      </div>

      <div className="mt-6 pt-4 border-t border-border/50 text-[11px] font-bold uppercase tracking-wide">
        {footer}
      </div>
    </div>
  );
}

function ChevronRightSmall() {
  return (
    <div className="h-5 w-5 rounded-full bg-secondary/50 flex items-center justify-center text-muted-foreground group-hover:bg-primary group-hover:text-white transition-colors">
      <ChevronRightIcon size={12} strokeWidth={3} />
    </div>
  );
}

function ChevronRightIcon({ size, strokeWidth }: { size: number, strokeWidth: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>;
}

function formatRelativeTimeSimple(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffMin < 1) return 'Now';
  if (diffMin < 60) return `${diffMin}m`;
  if (diffHr < 24) return `${diffHr}h`;
  return `${diffDay}d`;
}
