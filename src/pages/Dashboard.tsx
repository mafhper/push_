import { useEffect, useRef } from 'react';
import { useDashboardSnapshot } from '@/hooks/useGitHub';
import { ConsoleLayout } from '@/components/console/ConsoleLayout';
import { DashboardSkeleton } from '@/components/console/DashboardSkeleton';
import { BackgroundRefreshIndicator } from '@/components/console/BackgroundRefreshIndicator';
import { sortReposByAttention } from '@/lib/attention';
import { bootMark, logStartupReport } from '@/services/startup-metrics';
import { Activity } from 'lucide-react';

export default function Dashboard() {
  const { data, isPending, isFetching, error } = useDashboardSnapshot();

  const paintedRef = useRef(false);
  const freshRef = useRef(false);

  useEffect(() => {
    if (data && !paintedRef.current) {
      paintedRef.current = true;
      bootMark('dashboard-painted');
    }
  }, [data]);

  useEffect(() => {
    if (data && !isFetching && !freshRef.current) {
      freshRef.current = true;
      bootMark('dashboard-fresh');
      logStartupReport();
    }
  }, [data, isFetching]);

  if (isPending && !data) {
    return <DashboardSkeleton />;
  }

  if (!data || error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
        <Activity size={32} className="text-foreground-subtle opacity-20" />
        <p className="text-body text-foreground-subtle">No snapshot data available. Run the app locally to connect your GitHub.</p>
      </div>
    );
  }

  const sortedRepos = sortReposByAttention(data.repos);

  return (
    <>
      <ConsoleLayout repos={sortedRepos} />
      {isFetching && <BackgroundRefreshIndicator />}
    </>
  );
}