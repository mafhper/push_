import { useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useApp } from '@/contexts/AppContext';
import { useDependabotAlerts } from '@/hooks/useGitHub';
import { initOctokit } from '@/services/github';
import { useNavigate } from 'react-router-dom';
import { Shield } from 'lucide-react';

export default function AlertsPage() {
  const { t, session, primaryRepo, selectedRepos } = useApp();
  const navigate = useNavigate();

  useEffect(() => {
    if (!session) { navigate('/auth'); return; }
    initOctokit(session.token);
  }, [session, navigate]);

  const monitoredNames = useMemo(() => {
    const names = new Set([...(primaryRepo ? [primaryRepo] : []), ...selectedRepos]);
    return Array.from(names);
  }, [primaryRepo, selectedRepos]);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-fluid-2xl font-bold flex items-center gap-2">
          <Shield size={24} strokeWidth={1.5} />
          {t('alerts')}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t('security')} — {monitoredNames.length} {t('repos').toLowerCase()} {t('monitored').toLowerCase()}
        </p>
      </motion.div>

      {monitoredNames.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-8 text-center">
          <Shield size={32} strokeWidth={1} className="mx-auto mb-3 text-muted-foreground" />
          <p className="text-muted-foreground">{t('noAlerts')}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {monitoredNames.map(fullName => {
            const [owner, repo] = fullName.split('/');
            return <AlertsForRepo key={fullName} owner={owner} repo={repo} />;
          })}
        </div>
      )}
    </div>
  );
}

function AlertsForRepo({ owner, repo }: { owner: string; repo: string }) {
  const { t } = useApp();
  const { data: alerts, isLoading } = useDependabotAlerts(owner, repo);

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-card p-4 animate-pulse">
        <div className="h-4 bg-secondary rounded w-1/3" />
      </div>
    );
  }

  if (!alerts || alerts.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">{owner}/{repo}</span>
          <span className="text-xs text-success flex items-center gap-1">
            <Shield size={12} /> {t('noAlerts')}
          </span>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border bg-card p-4 space-y-3"
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">{owner}/{repo}</span>
        <span className="text-xs text-critical font-medium">{alerts.length} alerts</span>
      </div>
      <div className="space-y-2">
        {alerts.slice(0, 10).map(a => (
          <a
            key={a.id}
            href={a.htmlUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-start gap-2 rounded-lg p-2 hover:bg-secondary/50 transition-colors text-sm"
          >
            <Shield size={13} className={
              a.severity === 'critical' ? 'text-critical mt-0.5' :
              a.severity === 'high' ? 'text-destructive mt-0.5' :
              a.severity === 'medium' ? 'text-warning mt-0.5' : 'text-muted-foreground mt-0.5'
            } />
            <div className="min-w-0 flex-1">
              <span>{a.summary}</span>
              <span className="text-xs text-muted-foreground ml-2">{a.packageName}</span>
            </div>
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
              a.severity === 'critical' ? 'bg-critical/10 text-critical' :
              a.severity === 'high' ? 'bg-destructive/10 text-destructive' :
              a.severity === 'medium' ? 'bg-warning/10 text-warning' : 'bg-muted text-muted-foreground'
            }`}>
              {a.severity}
            </span>
          </a>
        ))}
      </div>
    </motion.div>
  );
}
