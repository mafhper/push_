import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useApp } from '@/contexts/AppContext';
import { useRepos, useWorkflowRuns, useDependabotAlerts, useLanguages } from '@/hooks/useGitHub';
import { RepoCard } from '@/components/RepoCard';
import { MainRepoHighlight } from '@/components/MainRepoHighlight';
import { calculateHealth } from '@/utils/health';
import { initOctokit, validateToken } from '@/services/github';
import {
  Package, CheckCircle2, RefreshCw, Search,
} from 'lucide-react';
import type { RepositoryRef } from '@/types';
import { useNavigate } from 'react-router-dom';
import { ComparisonTable } from '@/components/ComparisonTable';
import { GlobalHealthSummary } from '@/components/GlobalHealthSummary';

export default function Dashboard() {
  const { t, session, primaryRepo, setPrimaryRepo, selectedRepos, setSelectedRepos, settings, updateSettings, clearAll } = useApp();
  const navigate = useNavigate();
  const [searchFilter, setSearchFilter] = useState('');
  const [onboarding, setOnboarding] = useState(false);

  // Initialize octokit and validate session
  useEffect(() => {
    if (!session) {
      navigate('/auth');
      return;
    }
    initOctokit(session.token);
    
    // Optional: Re-validate on mount to catch revoked tokens early
    validateToken(session.token).then(res => {
      if (!res) {
        clearAll();
        navigate('/auth');
      }
    });
  }, [session, navigate, clearAll]);

  const { data: repos, isLoading, isError, error, refetch } = useRepos();

  // Handle API errors (like 401 Unauthorized)
  useEffect(() => {
    if (isError) {
      const status = typeof error === 'object' && error !== null && 'status' in error
        ? (error as { status?: number }).status
        : undefined;
      if (status === 401 || status === 403) {
        clearAll();
        navigate('/auth');
      }
    }
  }, [isError, error, clearAll, navigate]);

  // Check if needs onboarding
  useEffect(() => {
    if (repos && repos.length > 0 && !primaryRepo && selectedRepos.length === 0) {
      setOnboarding(true);
    }
  }, [repos, primaryRepo, selectedRepos]);

  const monitoredRepos = useMemo(() => {
    if (!repos) return [];
    const names = new Set([...(primaryRepo ? [primaryRepo] : []), ...selectedRepos]);
    if (names.size === 0) return repos.slice(0, 6);
    return repos.filter(r => names.has(r.fullName));
  }, [repos, primaryRepo, selectedRepos]);

  const primaryRepoData = useMemo(() => {
    if (settings.highlightMode === 'recent') {
      return [...monitoredRepos].sort((a, b) => 
        new Date(b.lastPushAt).getTime() - new Date(a.lastPushAt).getTime()
      )[0];
    }
    return monitoredRepos.find(r => r.fullName === primaryRepo);
  }, [monitoredRepos, primaryRepo, settings.highlightMode]);

  const otherMonitoredRepos = useMemo(() => {
    if (!primaryRepoData) return monitoredRepos;
    return monitoredRepos.filter(r => r.fullName !== primaryRepoData.fullName);
  }, [monitoredRepos, primaryRepoData]);

  const filteredForOnboarding = useMemo(() => {
    if (!repos) return [];
    const q = searchFilter.toLowerCase();
    return repos.filter(r =>
      r.name.toLowerCase().includes(q) || r.description?.toLowerCase().includes(q)
    );
  }, [repos, searchFilter]);

  if (!session) return null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <RefreshCw size={24} className="animate-spin" />
          <p className="text-sm">{t('refreshNow')}...</p>
        </div>
      </div>
    );
  }

  // Onboarding
  if (onboarding) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
          <h1 className="text-3xl font-black tracking-tighter">{t('selectPrimary')}</h1>
          <p className="text-muted-foreground text-sm">{t('selectAdditional')}</p>
        </motion.div>

        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchFilter}
            onChange={e => setSearchFilter(e.target.value)}
            placeholder={t('search')}
            className="w-full h-12 rounded-2xl border border-input bg-secondary/30 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
          />
        </div>

        <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
          {filteredForOnboarding.map(repo => {
            const isPrimary = primaryRepo === repo.fullName;
            const isSelected = selectedRepos.includes(repo.fullName);
            return (
              <div
                key={repo.id}
                className={`flex items-center justify-between gap-3 rounded-2xl border p-4 cursor-pointer transition-all ${
                  isPrimary ? 'border-primary bg-primary/5 ring-1 ring-primary/20' :
                  isSelected ? 'border-accent-foreground/20 bg-accent/30' : 'border-border hover:border-primary/30'
                }`}
                onClick={() => {
                  if (!primaryRepo) {
                    setPrimaryRepo(repo.fullName);
                  } else if (isPrimary) {
                    setPrimaryRepo(null);
                  } else if (isSelected) {
                    setSelectedRepos(selectedRepos.filter(r => r !== repo.fullName));
                  } else if (selectedRepos.length < 9) {
                    setSelectedRepos([...selectedRepos, repo.fullName]);
                  }
                }}
              >
                <div className="min-w-0">
                  <p className="text-sm font-bold truncate">{repo.fullName}</p>
                  <p className="text-xs text-muted-foreground truncate">{repo.description || t('noDescription')}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {repo.language && (
                    <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">{repo.language}</span>
                  )}
                  {isPrimary && (
                    <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
                      PRIMARY
                    </span>
                  )}
                  {isSelected && !isPrimary && (
                    <CheckCircle2 size={18} className="text-success" />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {primaryRepo && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={() => setOnboarding(false)}
            className="w-full h-14 rounded-2xl bg-primary text-primary-foreground font-bold text-base hover:opacity-90 transition-all shadow-lg shadow-primary/20"
          >
            {t('dashboard')} →
          </motion.button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tighter uppercase">{t('dashboard')}</h1>
          <p className="text-sm text-muted-foreground">
            {monitoredRepos.length} {t('monitoredRepos')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex p-1 rounded-xl bg-secondary/50 border border-border">
            <button
              onClick={() => updateSettings({ highlightMode: 'primary' })}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                settings.highlightMode === 'primary' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              ★ {t('primaryRepo')}
            </button>
            <button
              onClick={() => updateSettings({ highlightMode: 'recent' })}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                settings.highlightMode === 'recent' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              ⚡ {t('recentActivity')}
            </button>
          </div>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2 text-sm font-bold text-foreground hover:bg-secondary transition-all"
          >
            <RefreshCw size={16} strokeWidth={2} />
            {t('refreshNow')}
          </button>
          <button
            onClick={() => setOnboarding(true)}
            className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2 text-sm font-bold text-foreground hover:bg-secondary transition-all"
          >
            <Package size={16} strokeWidth={2} />
            {t('repos')}
          </button>
        </div>
      </div>

      <GlobalHealthSummary repos={monitoredRepos} />

      {/* Main Repo Highlight */}
      {primaryRepoData && (
        <MainRepoHighlight repo={primaryRepoData} />
      )}

      {/* Other Repos Section */}
      {otherMonitoredRepos.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground ml-1">
            {t('monitoredRepos')}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {otherMonitoredRepos.map(repo => (
              <MonitoredRepoCard key={repo.id} repo={repo} />
            ))}
          </div>
        </div>
      )}

      {/* Comparison Table */}
      {monitoredRepos.length > 1 && (
        <ComparisonTable repos={monitoredRepos} />
      )}
    </div>
  );
}

// Sub-component to manage its own health data
function MonitoredRepoCard({ repo }: { repo: RepositoryRef }) {
  const { data: runs } = useWorkflowRuns(repo.owner, repo.name);
  const { data: alerts } = useDependabotAlerts(repo.owner, repo.name);
  const { data: languages } = useLanguages(repo.owner, repo.name);

  const health = useMemo(() => {
    if (!runs || !alerts) return null;
    return calculateHealth(repo, runs, alerts);
  }, [repo, runs, alerts]);

  return (
    <RepoCard
      repo={repo}
      health={health}
      languages={languages}
      runs={runs}
    />
  );
}
