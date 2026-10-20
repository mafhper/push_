import { Link, useLocation } from 'react-router';
import { ArrowLeft, RefreshCw, Settings, Search, User, ShieldAlert, CircleCheck, GitBranch } from 'lucide-react';
import { useIsFetching, useQueryClient } from '@tanstack/react-query';
import { useApp } from '@/contexts/useApp';
import { useAccountQuotas, useDashboardSnapshot, useRateLimit } from '@/hooks/useGitHub';
import { QuotaPressurePill } from '@/components/quotas/QuotaPressure';
import { accountPressure, rateLimitPressure } from '@/quotas';
import type { QuotaPressure } from '@/quotas';
import { usePublicDashboardSnapshot, usePublicProfileRepos, usePublicRateLimit, usePublicSnapshotManifest } from '@/hooks/useGitHubPublic';
import { usePublicRuntime } from '@/contexts/usePublicRuntime';
import { isLocalSecureRuntime } from '@/config/site';
import { cn } from '@/lib/utils';
import type { OverviewRepoSnapshot } from '@/types';

type StatusBarRuntime = 'local' | 'public';

export function StatusBar({ runtime = 'local' }: { runtime?: StatusBarRuntime }) {
  return runtime === 'public' ? <PublicStatusBar /> : <LocalStatusBar />;
}

function LocalStatusBar() {
  const { t, session } = useApp();
  const { data } = useDashboardSnapshot();
  const { data: rateLimit } = useRateLimit();
  const { data: quotaSnapshot } = useAccountQuotas();
  const localRuntime = isLocalSecureRuntime();
  const isLocalAuthenticated = localRuntime && Boolean(session?.token);
  const username = session?.username;
  // The account reading wins; the API window is the fallback when billing is
  // unavailable, so the old rate text is absorbed instead of duplicated.
  const quotaPressure = accountPressure(quotaSnapshot?.families) ?? rateLimitPressure(rateLimit);

  return (
    <StatusBarFrame
      runtimeLabel={isLocalAuthenticated ? 'live' : 'snapshot'}
      updatedAt={data?.status?.generatedAt}
      isLive={isLocalAuthenticated}
      repos={data?.repos ?? []}
      quotaPressure={quotaPressure}
      username={isLocalAuthenticated ? username : undefined}
      avatarUrl={isLocalAuthenticated ? session?.avatarUrl : undefined}
      t={t}
    />
  );
}

function PublicStatusBar() {
  const { t } = useApp();
  const { mode, username } = usePublicRuntime();
  const { data: snapshot } = usePublicDashboardSnapshot();
  const { data: manifest } = usePublicSnapshotManifest();
  const { data: profileRepos = [] } = usePublicProfileRepos();
  const { data: rateLimit } = usePublicRateLimit();

  const mappedPublicRepos: OverviewRepoSnapshot[] = profileRepos.map((repo) => ({
    repo,
    health: {
      score: 100,
      status: 'healthy',
      lastCommitAt: repo.updatedAt || null,
      workflowSuccessRate: null,
      failedRuns7d: 0,
      dependabotOpenCount: 0,
      dependabotCriticalCount: 0,
      stalenessDays: 0,
    },
    stats: {
      totalCommitsTracked: 0,
      contributorsTracked: 0,
      languagesTracked: 0,
      latestWorkflowConclusion: null,
      openAlertCount: 0,
      openPullRequestCount: 0,
    },
    availability: {
      repository: { available: true, source: 'public-api' },
      commits: { available: false, source: 'public-api' },
      workflowRuns: { available: false, source: 'public-api' },
      languages: { available: false, source: 'public-api' },
      contributors: { available: false, source: 'public-api' },
      dependabotAlerts: { available: false, source: 'public-api' },
      pullRequests: { available: false, source: 'public-api' },
    },
  }));

  return (
    <StatusBarFrame
      runtimeLabel={mode === 'public-profile' ? 'public api' : 'snapshot'}
      updatedAt={snapshot?.status.generatedAt ?? manifest?.status.generatedAt}
      isLive={mode === 'public-profile'}
      repos={mode === 'public-profile' ? mappedPublicRepos : snapshot?.repos ?? []}
      rightMeta={mode === 'public-profile' && rateLimit ? `rate ${rateLimit.remaining}/${rateLimit.limit}` : undefined}
      username={mode === 'public-profile' ? username ?? undefined : undefined}
      t={t}
    />
  );
}

function StatusBarFrame({
  runtimeLabel,
  updatedAt,
  isLive,
  repos,
  rightMeta,
  quotaPressure,
  username,
  avatarUrl,
  t,
}: {
  runtimeLabel: string;
  updatedAt?: string;
  isLive: boolean;
  repos: OverviewRepoSnapshot[];
  rightMeta?: string;
  quotaPressure?: QuotaPressure | null;
  username?: string;
  avatarUrl?: string;
  t: ReturnType<typeof useApp>['t'];
}) {
  const criticalCount = repos.filter((r) => r.health.dependabotCriticalCount > 0 || r.health.status === 'critical').length;
  const warningCount = repos.filter((r) => (r.health.dependabotOpenCount > 0 && r.health.dependabotCriticalCount === 0) || r.health.status === 'warning').length;
  const totalAttentionItems = criticalCount + warningCount;

  // On the settings screen the bar drops its own shortcuts — search, refresh
  // and the settings gear — and keeps only the way back home: those controls
  // either do nothing useful there or already live inside the screen.
  const { pathname } = useLocation();
  const onSettingsRoute = pathname.startsWith('/app/settings');

  return (
    <header className="flex h-12 shrink-0 items-center justify-between gap-2 overflow-hidden border-b border-border/60 bg-surface-1/95 px-3 backdrop-blur-xs sm:px-5">
      <div className="flex min-w-0 items-center gap-2 sm:gap-4">
        <Link to="/app" className="shrink-0 font-headline text-base font-bold tracking-tighter text-primary">
          push<span className="text-foreground">_</span>
        </Link>

        <div className="hidden h-4 w-px bg-border sm:block" />

        <div className="flex min-w-0 items-center gap-2 text-micro font-medium uppercase tracking-wider text-foreground-subtle">
          <RuntimePill isLive={isLive} label={runtimeLabel} updatedAt={updatedAt} />
        </div>

        <div className="h-4 w-px bg-border" />

        <div className={cn(
          "flex min-w-0 items-center gap-1.5 text-micro font-bold uppercase tracking-wider sm:gap-2",
          totalAttentionItems > 0 ? "text-critical" : "text-success"
        )}>
          {totalAttentionItems > 0 ? (
            <>
              <ShieldAlert size={14} className="shrink-0" />
              <span className="truncate">{totalAttentionItems} needing attention</span>
            </>
          ) : (
            <>
              <CircleCheck size={14} className="shrink-0" />
              <span className="truncate">all healthy</span>
            </>
          )}
        </div>

        {/* Metadata pill, not a control: it reports the account reading and
            links to the quota chapter. Below md the header has no room for a
            fifth token at 360px, so the pill steps aside and the overview alert
            line carries the signal instead. On the settings route it steps
            aside too: the quota chapter below repeats the same reading, and the
            pill would only link to the screen it is already on. */}
        {quotaPressure && !onSettingsRoute ? (
          <>
            <div className="hidden h-4 w-px bg-border md:block" />
            <QuotaPressurePill pressure={quotaPressure} className="hidden md:inline-flex" />
          </>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-4">
        {rightMeta ? (
          <span className="hidden items-center gap-1.5 text-micro text-foreground-subtle lg:inline-flex">
            <GitBranch size={12} />
            {rightMeta}
          </span>
        ) : null}
        {onSettingsRoute ? (
          <Link
            to="/app"
            aria-label={t('home')}
            className="flex h-8 items-center gap-1.5 rounded-lg border border-border/60 bg-surface-3/80 px-2.5 text-micro font-medium text-foreground-subtle transition-colors hover:border-foreground-subtle/20 hover:text-foreground"
          >
            <ArrowLeft size={14} />
            <span className="hidden sm:inline">{t('home')}</span>
          </Link>
        ) : (
          <>
            <button className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/60 bg-surface-3/80 text-micro text-foreground-subtle transition-all hover:border-foreground-subtle/20 hover:text-foreground sm:w-auto sm:px-2.5">
              <Search size={14} />
              <span className="hidden sm:ml-2 sm:inline">Search...</span>
              <kbd className="hidden font-mono text-[8px] opacity-30 sm:ml-1 sm:inline">⌘K</kbd>
            </button>

            <RefreshButton />

            <Link to="/app/settings" aria-label={t('settings')} className="flex h-8 w-8 items-center justify-center text-foreground-subtle transition-colors hover:text-primary">
              <Settings size={18} />
            </Link>
          </>
        )}

        {username && (
           <div className="hidden items-center gap-2 border-l border-border pl-4 md:flex">
              <span className="text-micro font-medium text-foreground-muted">@{username}</span>
              <div className="h-6 w-6 rounded-full bg-surface-3 border border-border overflow-hidden">
                 {avatarUrl ? (
                   <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                 ) : (
                   <User size={14} className="m-1 text-foreground-subtle" />
                 )}
              </div>
           </div>
        )}
      </div>
    </header>
  );
}

function RefreshButton() {
  const queryClient = useQueryClient();
  const isFetching = useIsFetching();
  const { t } = useApp();
  const running = isFetching > 0;

  return (
    <button
      type="button"
      onClick={() => queryClient.invalidateQueries()}
      disabled={running}
      title={running ? t('statusRefreshing') : t('statusRefresh')}
      aria-label={running ? t('statusRefreshing') : t('statusRefresh')}
      className="flex h-8 w-8 items-center justify-center text-foreground-subtle transition-colors hover:text-primary disabled:cursor-wait disabled:opacity-70"
    >
      <RefreshCw size={16} className={running ? 'animate-spin' : undefined} />
    </button>
  );
}

function RuntimePill({ isLive, label, updatedAt }: { isLive: boolean; label: string; updatedAt?: string }) {
  return (
    <div className="group flex min-w-0 cursor-help items-center gap-2">
      <div className={cn("h-1.5 w-1.5 shrink-0 rounded-full", isLive ? "bg-warning animate-pulse" : "bg-info")} />
      <span className="truncate">{label}</span>
      {updatedAt && (
        <span className="hidden normal-case opacity-60 sm:inline">
          · {new Date(updatedAt).toLocaleDateString()}
        </span>
      )}
    </div>
  );
}
