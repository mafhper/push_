import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Activity } from 'lucide-react';
import { GlobalDashboard } from '@/components/console/GlobalDashboard';
import { Inspector } from '@/components/console/Inspector';
import { TriageQueue } from '@/components/console/TriageQueue';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { useApp } from '@/contexts/useApp';
import { cn } from '@/lib/utils';
import type { ScoredRepo } from '@/lib/attention';

interface ConsoleLayoutProps {
  repos: ScoredRepo[];
  runtime?: 'local' | 'public';
}

export function ConsoleLayout({ repos, runtime = 'local' }: ConsoleLayoutProps) {
  const { settings, updateSettings } = useApp();
  const [searchParams, setSearchParams] = useSearchParams();
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const repoId = searchParams.get('repo');
  const selectedRepo = repoId ? repos.find((entry) => entry.repo.id.toString() === repoId) ?? null : null;
  const desktopRepo = selectedRepo;
  const compact = settings.sidebarMode === 'compact';

  function clearSelectedRepo() {
    const params = new URLSearchParams(searchParams);
    params.delete('repo');
    setSearchParams(params, { replace: true });
  }

  if (repos.length === 0) {
    return (
      <div className="flex h-full min-h-0 w-full items-center justify-center p-6 text-center">
        <div className="max-w-sm">
          <Activity size={28} className="mx-auto text-foreground-subtle opacity-25" />
          <p className="mt-4 text-title font-semibold text-foreground">No repositories loaded</p>
          <p className="mt-2 text-body text-foreground-subtle">
            Connect a local token or regenerate the published snapshot to populate the triage queue.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "grid h-full min-h-0 w-full min-w-0 overflow-hidden transition-[grid-template-columns] duration-200",
      compact ? "lg:grid-cols-[5.25rem_minmax(0,1fr)]" : "lg:grid-cols-[24rem_minmax(0,1fr)] xl:grid-cols-[26rem_minmax(0,1fr)]"
    )}>
      <aside className="min-h-0 min-w-0 border-r border-border/60 bg-background">
        <TriageQueue
          repos={repos}
          selectedRepoId={selectedRepo?.repo.id.toString()}
          compact={compact}
          onToggleCompact={() => updateSettings({ sidebarMode: compact ? 'expanded' : 'compact' })}
        />
      </aside>

      <section className="hidden min-h-0 min-w-0 overflow-hidden bg-surface-2 lg:flex">
        {desktopRepo ? <Inspector repo={desktopRepo} runtime={runtime} /> : <GlobalDashboard repos={repos} />}
      </section>

      <Sheet open={!isDesktop && Boolean(selectedRepo)} onOpenChange={(open) => { if (!open) clearSelectedRepo(); }}>
        <SheetContent side="right" className="flex w-full max-w-none flex-col overflow-hidden border-border bg-surface-2 p-0 sm:max-w-[34rem] lg:hidden">
          <SheetTitle className="sr-only">Repository inspector</SheetTitle>
          <SheetDescription className="sr-only">Repository analysis categories and operational signals.</SheetDescription>
          <Inspector repo={selectedRepo} runtime={runtime} />
        </SheetContent>
      </Sheet>
    </div>
  );
}

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    const media = window.matchMedia(query);
    const handleChange = () => setMatches(media.matches);
    handleChange();
    media.addEventListener('change', handleChange);
    return () => media.removeEventListener('change', handleChange);
  }, [query]);

  return matches;
}
