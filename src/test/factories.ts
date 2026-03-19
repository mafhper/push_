import type {
  RepoSnapshotDetail,
  RepositoryRef,
  SnapshotManifest,
  SnapshotOverview,
  WorkflowRun,
} from "@/types";

export function createRepo(overrides: Partial<RepositoryRef> = {}): RepositoryRef {
  return {
    id: 1,
    owner: "mafhper",
    name: "push_",
    fullName: "mafhper/push_",
    defaultBranch: "main",
    isPrivate: false,
    archived: false,
    htmlUrl: "https://github.com/mafhper/push_",
    description: "Public GitHub dashboard",
    license: "MIT",
    language: "TypeScript",
    stars: 10,
    forks: 2,
    openIssues: 1,
    watchers: 4,
    lastPushAt: "2026-03-19T12:00:00.000Z",
    size: 2048,
    topics: ["dashboard"],
    createdAt: "2026-01-01T12:00:00.000Z",
    updatedAt: "2026-03-19T12:00:00.000Z",
    ...overrides,
  };
}

export function createOverview(overrides: Partial<SnapshotOverview> = {}): SnapshotOverview {
  const repo = createRepo();
  return {
    status: {
      generatedAt: "2026-03-19T12:00:00.000Z",
      generatedBy: "seed",
      dataMode: "public",
    },
    featuredRepo: repo.fullName,
    repos: [
      {
        repo,
        health: {
          score: 88,
          status: "healthy",
          lastCommitAt: repo.lastPushAt,
          workflowSuccessRate: 100,
          failedRuns7d: 0,
          dependabotOpenCount: 1,
          dependabotCriticalCount: 0,
          stalenessDays: 1,
        },
        stats: {
          totalCommitsTracked: 5,
          contributorsTracked: 2,
          languagesTracked: 2,
          latestWorkflowConclusion: "success",
          openAlertCount: 1,
        },
        availability: {
          repository: { available: true, source: "snapshot" },
          commits: { available: true, source: "snapshot" },
          workflowRuns: { available: true, source: "snapshot" },
          languages: { available: true, source: "snapshot" },
          contributors: { available: true, source: "snapshot" },
          dependabotAlerts: { available: true, source: "snapshot" },
        },
      },
    ],
    ...overrides,
  };
}

export function createRepoDetail(overrides: Partial<RepoSnapshotDetail> = {}): RepoSnapshotDetail {
  const repo = createRepo();
  const workflowRuns: WorkflowRun[] = [
    {
      id: 1,
      workflowName: "CI",
      status: "completed",
      conclusion: "success",
      branch: "main",
      event: "push",
      startedAt: "2026-03-19T11:00:00.000Z",
      updatedAt: "2026-03-19T11:02:00.000Z",
      durationMs: 120000,
      htmlUrl: "https://github.com/mafhper/push_/actions/runs/1",
    },
  ];

  return {
    status: {
      generatedAt: "2026-03-19T12:00:00.000Z",
      generatedBy: "seed",
      dataMode: "public",
    },
    featured: true,
    repo,
    health: {
      score: 88,
      status: "healthy",
      lastCommitAt: repo.lastPushAt,
      workflowSuccessRate: 100,
      failedRuns7d: 0,
      dependabotOpenCount: 0,
      dependabotCriticalCount: 0,
      stalenessDays: 1,
    },
    commits: [
      {
        sha: "abcdef1234567890",
        message: "Initial release",
        authorLogin: "mafhper",
        authorAvatar: "",
        date: "2026-03-19T10:00:00.000Z",
        htmlUrl: "https://github.com/mafhper/push_/commit/abcdef1",
      },
    ],
    workflowRuns,
    alerts: [],
    languages: {
      TypeScript: 80,
      CSS: 20,
    },
    contributors: [],
    availability: {
      repository: { available: true, source: "snapshot" },
      commits: { available: true, source: "snapshot" },
      workflowRuns: { available: true, source: "snapshot" },
      languages: { available: true, source: "snapshot" },
      contributors: { available: true, source: "snapshot" },
      dependabotAlerts: { available: false, source: "snapshot", reason: "Dependabot requires authenticated access." },
    },
    ...overrides,
  };
}

export function createManifest(overrides: Partial<SnapshotManifest> = {}): SnapshotManifest {
  return {
    site: {
      name: "Push_",
      tagline: "Public GitHub dashboard",
      description: "Dashboard",
    },
    status: {
      generatedAt: "2026-03-19T12:00:00.000Z",
      generatedBy: "seed",
      dataMode: "public",
    },
    featuredRepo: "mafhper/push_",
    routes: {
      promo: ["/", "/technology", "/faq", "/about"],
      app: ["/app", "/app/alerts", "/app/settings"],
    },
    repoFiles: {
      "mafhper/push_": "data/repos/mafhper__push_.json",
    },
    ...overrides,
  };
}
