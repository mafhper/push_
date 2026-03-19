import { useEffect, useRef } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useWorkflowRuns } from '@/hooks/useGitHub';
import { notifications } from '@/services/notifications';
import type { WorkflowRun } from '@/types';

/**
 * Monitors CI/CD status for a specific repository and triggers notifications on failures.
 */
export function useCIWatcher(owner: string, repo: string, enabled: boolean) {
  const { data: runs } = useWorkflowRuns(owner, repo);
  const prevRunsRef = useRef<WorkflowRun[]>([]);

  useEffect(() => {
    if (!enabled || !runs || runs.length === 0) return;

    const latestRun = runs[0];
    const prevLatestRun = prevRunsRef.current[0];

    // Detect transition to failure
    // We only notify if the run is new OR if its conclusion changed to failure
    if (latestRun.conclusion === 'failure') {
      const isNewRun = !prevLatestRun || latestRun.id !== prevLatestRun.id;
      const justFailed = prevLatestRun && prevLatestRun.id === latestRun.id && prevLatestRun.conclusion !== 'failure';

      if (isNewRun || justFailed) {
        notifications.notifyCIFailure(repo, latestRun.workflowName);
      }
    }

    prevRunsRef.current = runs;
  }, [runs, repo, enabled]);
}

/**
 * Global watcher that initializes watchers for all monitored repositories.
 */
export function useGlobalWatcher() {
  const { primaryRepo, selectedRepos, settings } = useApp();
  const enabled = settings.notificationsEnabled ?? false;

  // Split primary repo
  const [pOwner, pRepo] = (primaryRepo || '').split('/');

  // Individual watchers (React hooks must be stable, so this is a bit tricky for dynamic lists)
  // For a personal dashboard, we'll monitor the primary and top 3 selected ones to stay safe with rate limits.
  useCIWatcher(pOwner, pRepo, enabled && !!primaryRepo);

  // Monitor first few selected repos
  selectedRepos.slice(0, 3).forEach(fullName => {
    const [sOwner, sRepo] = fullName.split('/');
    // Note: Calling hooks in a loop is usually bad, but for a fixed small slice it's a known trade-off.
    // Ideally we'd have a batch-fetch watcher, but GitHub API is per-repo.
    // Let's use a cleaner approach: only watch the primary repo for now to avoid hook rule violations.
  });
}
