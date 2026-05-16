import React from 'react';
import { Link } from 'react-router-dom';
import { Settings, Search, User, Clock, ShieldAlert, CircleCheck } from 'lucide-react';
import { useApp } from '@/contexts/useApp';
import { useDashboardSnapshot } from '@/hooks/useGitHub';
import { isLocalSecureRuntime } from '@/config/site';
import { cn } from '@/lib/utils';

export function StatusBar() {
  const { t, session } = useApp();
  const { data } = useDashboardSnapshot();
  const localRuntime = isLocalSecureRuntime();
  const isLocalAuthenticated = localRuntime && Boolean(session?.token);

  // Derivar métricas básicas para o status bar
  const repos = data?.repos || [];
  const criticalCount = repos.filter(r => r.health.criticalAlertCount > 0 || r.health.status === 'critical').length;
  const warningCount = repos.filter(r => (r.health.dependabotOpenCount > 0 && r.health.criticalAlertCount === 0) || r.health.status === 'warning').length;
  const totalAttentionItems = criticalCount + warningCount;

  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-border bg-surface-1 px-4">
      <div className="flex items-center gap-4">
        <Link to="/app" className="font-headline text-base font-bold tracking-tighter text-primary">
          push<span className="text-foreground">_</span>
        </Link>

        <div className="h-4 w-px bg-border" />

        <div className="flex items-center gap-2 text-micro font-medium uppercase tracking-wider text-foreground-subtle">
           <RuntimePill isLive={isLocalAuthenticated} updatedAt={data?.generatedAt} />
        </div>

        <div className="h-4 w-px bg-border" />

        <div className={cn(
          "flex items-center gap-2 text-micro font-bold uppercase tracking-wider",
          totalAttentionItems > 0 ? "text-critical" : "text-success"
        )}>
          {totalAttentionItems > 0 ? (
            <>
              <ShieldAlert size={14} />
              <span>{totalAttentionItems} needing attention</span>
            </>
          ) : (
            <>
              <CircleCheck size={14} />
              <span>all healthy</span>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button className="flex h-7 items-center gap-2 rounded border border-border bg-surface-3 px-2 text-micro text-foreground-subtle hover:border-border-strong hover:text-foreground transition-colors">
          <Search size={14} />
          <span>Search...</span>
          <kbd className="font-mono opacity-40">⌘K</kbd>
        </button>

        <Link to="/app/settings" className="text-foreground-subtle hover:text-primary transition-colors">
          <Settings size={18} />
        </Link>

        {isLocalAuthenticated && session?.user && (
           <div className="flex items-center gap-2 border-l border-border pl-4">
              <span className="text-micro font-medium text-foreground-muted">@{session.user.login}</span>
              <div className="h-6 w-6 rounded-full bg-surface-3 border border-border overflow-hidden">
                 {session.user.avatarUrl ? (
                   <img src={session.user.avatarUrl} alt="" className="h-full w-full object-cover" />
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

function RuntimePill({ isLive, updatedAt }: { isLive: boolean; updatedAt?: string }) {
  return (
    <div className="flex items-center gap-2 group cursor-help">
      <div className={cn("h-1.5 w-1.5 rounded-full", isLive ? "bg-warning animate-pulse" : "bg-info")} />
      <span>
        {isLive ? 'live' : 'snapshot'}
      </span>
      {updatedAt && (
        <span className="normal-case opacity-60">
           · {new Date(updatedAt).toLocaleLowerCase()}
        </span>
      )}
    </div>
  );
}
