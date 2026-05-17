import { useState } from "react";
import { Activity } from "lucide-react";
import { EmptyPanel } from "@/components/site/TerminalPrimitives";
import { ConsoleLayout } from "@/components/console/ConsoleLayout";
import { useApp } from "@/contexts/useApp";
import { usePublicRuntime } from "@/contexts/usePublicRuntime";
import { usePublicDashboardSnapshot, usePublicProfileRepos } from "@/hooks/useGitHubPublic";
import { sortReposByAttention } from "@/lib/attention";
import type { OverviewRepoSnapshot } from "@/types";

export default function PublicDashboard() {
  const { t } = useApp();
  const { mode, username } = usePublicRuntime();
  const snapshotQuery = usePublicDashboardSnapshot();
  const publicProfileQuery = usePublicProfileRepos();

  const [referenceNow] = useState(() => Date.now());

  if (mode === "public-profile") {
    const { data: repos = [], isLoading, error } = publicProfileQuery;

    if (isLoading) {
      return (
        <div className="flex h-full items-center justify-center gap-3 text-body text-foreground-subtle">
          <Activity size={16} className="animate-pulse" />
          Loading profile...
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-4 p-8">
          <EmptyPanel title={t("publicProfileUnavailable")} body={t("publicProfileUnavailableBody", { username: username ?? "" })} />
        </div>
      );
    }

    const filteredRepos = repos.filter(r => !r.archived);
    const mappedRepos: OverviewRepoSnapshot[] = filteredRepos.map(r => ({
      repo: {
        id: r.id || 0,
        owner: r.owner || '',
        name: r.name || '',
        fullName: r.fullName || r.name || '',
        defaultBranch: r.defaultBranch || 'main',
        isPrivate: r.isPrivate || false,
        archived: r.archived || false,
        htmlUrl: r.htmlUrl || '',
        description: r.description || '',
        license: r.license || null,
        language: r.language || null,
        stars: r.stars || 0,
        forks: r.forks || 0,
        openIssues: r.openIssues || 0,
        watchers: r.watchers || 0,
        lastPushAt: r.lastPushAt || r.updatedAt || '',
        size: r.size || 0,
        topics: r.topics || [],
        createdAt: r.createdAt || '',
        updatedAt: r.updatedAt || '',
      },
      health: {
        score: 100,
        status: 'healthy' as const,
        lastCommitAt: r.updatedAt || null,
        workflowSuccessRate: null,
        failedRuns7d: 0,
        dependabotOpenCount: 0,
        dependabotCriticalCount: 0,
        stalenessDays: r.updatedAt ? Math.floor((referenceNow - new Date(r.updatedAt).getTime()) / 86400000) : 0,
      },
      stats: {
        totalCommitsTracked: 0,
        contributorsTracked: 0,
        languagesTracked: 0,
        latestWorkflowConclusion: null,
        openAlertCount: 0,
      },
      availability: {
        repository: { available: true, source: 'public-api' },
        commits: { available: false, source: 'public-api' },
        workflowRuns: { available: false, source: 'public-api' },
        languages: { available: false, source: 'public-api' },
        contributors: { available: false, source: 'public-api' },
        dependabotAlerts: { available: false, source: 'public-api' },
      },
    }));
    const scoredRepos = sortReposByAttention(mappedRepos);

    return <ConsoleLayout repos={scoredRepos} runtime="public" />;
  }

  const { data, isLoading, error } = snapshotQuery;

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center gap-3 text-body text-foreground-subtle">
        <Activity size={16} className="animate-pulse" />
        Loading snapshot...
      </div>
    );
  }

  if (!data || error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-8">
        <EmptyPanel title={t("publishedSnapshot")} body={t("regenerateSnapshotOverview")} />
      </div>
    );
  }

  const sortedRepos = sortReposByAttention(data.repos);

  return <ConsoleLayout repos={sortedRepos} runtime="public" />;
}
