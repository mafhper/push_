export type Theme = 'light' | 'dark' | 'golden' | 'nord' | 'midnight' | 'emerald';
export type Language = 'en' | 'pt' | 'es';
export type HighlightMode = 'primary' | 'recent';

export interface UserSettings {
  theme: Theme;
  lang: Language;
  pollingInterval: number; // seconds
  maxRepos: number;
  rememberToken: boolean;
  notificationsEnabled: boolean;
  highlightMode: HighlightMode;
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
