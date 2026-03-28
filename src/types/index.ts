export type Theme = 'dark' | 'light';
export type Language = 'en' | 'pt-BR' | 'es';

export interface UserSettings {
  theme: Theme;
  lang: Language;
  dashboardDensity: 'balanced' | 'dense';
  pollingInterval?: number;
  notificationsEnabled?: boolean;
  highlightMode?: 'primary' | 'recent';
}

export interface UserSession {
  token: string;
  username: string;
  avatarUrl: string;
  authenticatedAt: string;
}

export interface RepositoryRef {
  id: number;
  owner: string;
  name: string;
  fullName: string;
  defaultBranch: string;
  isPrivate: boolean;
  archived: boolean;
  htmlUrl: string;
  description: string | null;
  license: string | null;
  language: string | null;
  stars: number;
  forks: number;
  openIssues: number;
  watchers: number;
  lastPushAt: string;
  size: number;
  topics: string[];
  createdAt: string;
  updatedAt: string;
  socialImageUrl?: string;
}

export interface WorkflowRun {
  id: number;
  workflowName: string;
  status: string;
  conclusion: string | null;
  branch: string;
  event: string;
  startedAt: string;
  updatedAt: string;
  durationMs: number;
  htmlUrl: string;
}

export interface CommitSummary {
  sha: string;
  message: string;
  authorLogin: string;
  authorAvatar: string;
  date: string;
  htmlUrl: string;
}

export interface DependabotAlert {
  id: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  state: string;
  packageName: string;
  ecosystem: string;
  manifestPath: string;
  createdAt: string;
  fixedIn: string | null;
  htmlUrl: string;
  cveId: string | null;
  summary: string;
}

export interface PullRequestSummary {
  id: number;
  number: number;
  title: string;
  state: string;
  draft: boolean;
  createdAt: string;
  updatedAt: string;
  htmlUrl: string;
  authorLogin: string;
}

export interface ContributorSummary {
  login: string;
  avatarUrl: string;
  contributions: number;
}

export interface LanguageBreakdown {
  [language: string]: number;
}

export interface RepoHealth {
  score: number;
  status: 'healthy' | 'warning' | 'critical';
  lastCommitAt: string | null;
  workflowSuccessRate: number | null;
  failedRuns7d: number;
  dependabotOpenCount: number;
  dependabotCriticalCount: number;
  stalenessDays: number;
}

export interface RateLimitInfo {
  remaining: number;
  limit: number;
  resetAt: string;
}

export interface AvailabilityInfo {
  available: boolean;
  source: string;
  reason?: string;
}

export interface SnapshotStatus {
  generatedAt: string;
  generatedBy: 'seed' | 'local' | 'github-actions' | 'public-api';
  dataMode: 'public' | 'authenticated';
}

export interface SiteManifest {
  name: string;
  tagline: string;
  description: string;
}

export interface OverviewRepoSnapshot {
  repo: RepositoryRef;
  health: RepoHealth;
  stats: {
    totalCommitsTracked: number;
    contributorsTracked: number;
    languagesTracked: number;
    latestWorkflowConclusion: string | null;
    openAlertCount: number;
    openPullRequestCount?: number;
  };
  availability: {
    repository: AvailabilityInfo;
    commits: AvailabilityInfo;
    workflowRuns: AvailabilityInfo;
    languages: AvailabilityInfo;
    contributors: AvailabilityInfo;
    dependabotAlerts: AvailabilityInfo;
    pullRequests?: AvailabilityInfo;
  };
}

export interface SnapshotManifest {
  site: SiteManifest;
  status: SnapshotStatus;
  featuredRepo: string;
  routes: {
    promo: string[];
    app: string[];
  };
  repoFiles: Record<string, string>;
}

export interface SnapshotOverview {
  status: SnapshotStatus;
  featuredRepo: string;
  repos: OverviewRepoSnapshot[];
}

export interface RepoSnapshotDetail {
  status: SnapshotStatus;
  featured: boolean;
  repo: RepositoryRef;
  health: RepoHealth;
  commits: CommitSummary[];
  workflowRuns: WorkflowRun[];
  alerts: DependabotAlert[];
  pullRequests?: PullRequestSummary[];
  languages: LanguageBreakdown;
  contributors: ContributorSummary[];
  availability: OverviewRepoSnapshot['availability'];
}

export const LANGUAGE_COLORS: Record<string, string> = {
  JavaScript: '#f1e05a',
  TypeScript: '#2b7489',
  Python: '#3572A5',
  Java: '#b07219',
  'C++': '#f34b7d',
  'C#': '#178600',
  Go: '#00ADD8',
  Rust: '#dea584',
  Ruby: '#701516',
  PHP: '#4F5D95',
  HTML: '#e34c26',
  CSS: '#563d7c',
  Shell: '#89e051',
  Kotlin: '#A97BFF',
  Swift: '#F05138',
  Dart: '#00B4AB',
  Vue: '#41b883',
  Scala: '#c22d40',
  Lua: '#000080',
  R: '#198CE7',
};
