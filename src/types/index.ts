export type Theme = 'dark' | 'light' | 'phosphor-green' | 'golden-matrix' | 'blue-calm' | 'green-ish' | 'brown-earth';
export type Language = 'en' | 'pt-BR' | 'es';
export type SidebarMode = 'expanded' | 'compact';
export type DataDetailMode = 'balanced' | 'detailed' | 'full';

export interface UserSettings {
  theme: Theme;
  lang: Language;
  dashboardDensity: 'balanced' | 'dense';
  sidebarMode?: SidebarMode;
  /**
   * Expanded width of the repository list, in pixels. Absent until the user
   * drags the divider, so the default layout keeps its responsive widths.
   * Values are clamped to the console layout limits before use.
   */
  sidebarWidth?: number;
  dataDetailMode?: DataDetailMode;
  repoDetailModes?: Record<string, DataDetailMode>;
  pollingInterval?: number;
  notificationsEnabled?: boolean;
  highlightMode?: 'primary' | 'recent';
}

export interface UserSession {
  token: string;
  username: string;
  avatarUrl: string;
  diagnostics?: TokenDiagnostics;
}

export type SessionStatus = 'loading' | 'authenticated' | 'anonymous' | 'invalid';

export interface TokenDiagnostics {
  token: 'valid' | 'invalid' | 'rate_limited' | 'unknown';
  rateLimit?: RateLimitInfo;
  /**
   * How many repositories the token can see, public and private together. A
   * classic personal access token returns both, so this is not a
   * public-only count.
   */
  accessibleRepoCount?: number;
  /** How many of `accessibleRepoCount` are private. `0` means the scope sees no private repository. */
  privateRepoCount?: number;
  dependabotProbe?: {
    status: 'available' | 'forbidden' | 'not_found' | 'unavailable' | 'skipped';
    repoFullName?: string;
    message?: string;
  };
}

export interface ForkOrigin {
  fullName: string;
  htmlUrl: string;
}

export interface RepositoryRef {
  id: number;
  owner: string;
  name: string;
  fullName: string;
  defaultBranch: string;
  isPrivate: boolean;
  archived: boolean;
/**
 * The repository itself is a fork (`fork: true` in the API).
 *
 * Required on purpose: every construction site has to declare the "not a fork"
 * case. Snapshots published before this field still load because reads normalize
 * the absence (`isFork: Boolean(undefined) === false`) — this is the task's
 * RNF-06 (backward compatibility of published snapshots).
 */
isFork: boolean;
/**
 * Upstream repository when known. `null` means "unknown", **not** "not a fork".
 *
 * GitHub's repository listing does not return `parent`/`source` (verified
 * 2026-09-26: `GET /user/repos` returns 82 fields per item and none of them is
 * the upstream); only the individual `GET /repos/{owner}/{repo}` endpoint does.
 * That is why the local runtime spends one call **per fork** to resolve this,
 * while the public snapshot gets it for free (the sync script already calls the
 * individual endpoint). Q4 depends on it: a fork only lands in the "Forks" group
 * by default when its upstream is **not** accessible.
 */
forkOf: ForkOrigin | null;
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

export interface DependencyInfo {
  name: string;
  version: string;
  type: 'dependencies' | 'devDependencies';
}

export interface ReleaseSummary {
  id: number;
  tagName: string;
  name: string;
  prerelease: boolean;
  draft: boolean;
  publishedAt: string | null;
  htmlUrl: string;
  assetsCount?: number;
  body?: string | null;
}

export interface IssueSummary {
  id: number;
  number: number;
  title: string;
  state: string;
  createdAt: string;
  updatedAt: string;
  htmlUrl: string;
  authorLogin: string;
  labels: string[];
}

export interface RepoLabelSummary {
  id: number;
  name: string;
  color: string;
  description: string | null;
}

export interface BranchProtectionSummary {
  available: boolean;
  protected: boolean;
  reason?: string;
  requiredStatusChecks?: boolean;
  codeOwnerReviews?: boolean;
}

export interface GitHubPagesInfo {
  configured: boolean;
  url?: string;
  lastBuildStatus?: 'built' | 'error' | 'building' | 'queued';
  hasLiveSite?: boolean;
  error?: string;
}

export interface RepoExtendedInfo {
  readme?: {
    text: string;
    htmlUrl: string;
  };
  releases?: ReleaseSummary[];
  issues?: IssueSummary[];
  labels?: RepoLabelSummary[];
  branchProtection?: BranchProtectionSummary;
  pages?: GitHubPagesInfo;
  rootTree?: string[];
  codeScanning?: { openAlerts: number } | null;
  security?: {
    advancedSecurity?: boolean;
    secretScanning?: boolean;
    dependabotSecurityUpdates?: boolean;
  };
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
  dependencies?: DependencyInfo[];
  extended?: RepoExtendedInfo;
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
