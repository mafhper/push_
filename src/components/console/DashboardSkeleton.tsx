import { cn } from '@/lib/utils';

function SkeletonBlock({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-md bg-surface-3/50', className)} />;
}

function Tile() {
  return (
    <div className="flex min-h-[6.75rem] w-full flex-col justify-between rounded-xl border border-border/50 bg-surface-1/60 px-4 py-3.5 shadow-none">
      <div className="flex items-start justify-between gap-3">
        <SkeletonBlock className="h-3 w-24" />
        <SkeletonBlock className="h-8 w-8 rounded-lg" />
      </div>
      <SkeletonBlock className="h-6 w-12" />
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="grid h-full min-h-0 w-full min-w-0 overflow-hidden md:grid-cols-[5.25rem_minmax(0,1fr)] lg:grid-cols-[24rem_minmax(0,1fr)] xl:grid-cols-[26rem_minmax(0,1fr)]">
      <aside className="min-h-0 min-w-0 border-r border-border/60 bg-background">
        <div className="flex h-full flex-col gap-2 p-3">
          <SkeletonBlock className="h-9 w-full" />
          <SkeletonBlock className="h-14 w-full" />
          <SkeletonBlock className="h-14 w-full" />
          <SkeletonBlock className="h-14 w-full" />
          <SkeletonBlock className="hidden h-14 w-full lg:block" />
        </div>
      </aside>

      <section className="hidden min-h-0 min-w-0 overflow-hidden bg-surface-2 md:flex">
        <div className="flex h-full min-h-0 w-full flex-1 flex-col overflow-y-auto">
          <div className="border-b border-border/50 px-4 pb-8 pt-8 md:px-8">
            <div className="mx-auto flex w-full max-w-5xl items-start justify-between gap-4">
              <div className="space-y-2">
                <SkeletonBlock className="h-7 w-52" />
                <SkeletonBlock className="h-4 w-80" />
              </div>
              <SkeletonBlock className="h-8 w-28" />
            </div>
          </div>

          <div className="mx-auto w-full max-w-5xl space-y-4 px-4 pb-4 pt-6 md:px-8">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Tile />
              <Tile />
              <Tile />
              <Tile />
            </div>
            <div className="hidden grid-cols-4 gap-3 sm:grid xl:grid-cols-4">
              <Tile />
              <Tile />
              <Tile />
              <Tile />
            </div>
          </div>

          <div className="border-t border-border/50">
            <div className="mx-auto w-full max-w-5xl space-y-3 px-4 py-5 md:px-8">
              <SkeletonBlock className="h-4 w-44" />
              <SkeletonBlock className="h-14 w-full" />
              <SkeletonBlock className="hidden h-14 w-full md:block" />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}