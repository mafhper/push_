import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDashboardSnapshot } from '@/hooks/useGitHub';
import { TriageQueue } from '@/components/console/TriageQueue';
import { Inspector } from '@/components/console/Inspector';
import { sortReposByAttention } from '@/lib/attention';
import { EmptyPanel } from '@/components/site/TerminalPrimitives';
import { useApp } from '@/contexts/useApp';

export default function Dashboard() {
  const { t } = useApp();
  const { data, isLoading, error } = useDashboardSnapshot();
  const [searchParams] = useSearchParams();
  const repoId = searchParams.get('repo');

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center text-micro uppercase tracking-widest text-foreground-subtle">
        Loading console...
      </div>
    );
  }

  if (!data || error) {
    return <EmptyPanel title={t("publishedSnapshot")} body={t("regenerateSnapshotOverview")} />;
  }

  const sortedRepos = sortReposByAttention(data.repos);
  const selectedRepo = repoId ? sortedRepos.find(r => r.repo.id.toString() === repoId) || null : null;

  return (
    <div className="flex flex-1 overflow-hidden">
      <TriageQueue repos={sortedRepos} selectedRepoId={repoId || undefined} />
      <Inspector repo={selectedRepo} />
    </div>
  );
}
