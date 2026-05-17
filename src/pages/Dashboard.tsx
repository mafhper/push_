import { useDashboardSnapshot } from '@/hooks/useGitHub';
import { ConsoleLayout } from '@/components/console/ConsoleLayout';
import { sortReposByAttention } from '@/lib/attention';
import { Activity } from 'lucide-react';

export default function Dashboard() {
  const { data, isLoading, error } = useDashboardSnapshot();

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center gap-3 text-body text-foreground-subtle">
        <Activity size={16} className="animate-pulse" />
        Loading console...
      </div>
    );
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

  return <ConsoleLayout repos={sortedRepos} />;
}
