import type {
  BranchProtectionSummary,
  ContributorSummary,
  DependabotAlert,
  DependencyInfo,
  GitHubPagesInfo,
  LanguageBreakdown,
  OverviewRepoSnapshot,
  ReleaseSummary,
  RepositoryRef,
  WorkflowRun,
} from "@/types";

export type HealthCheckStatus = "pass" | "warning" | "fail" | "unknown" | "not_applicable";

export type HealthCategoryId =
  | "governance"
  | "ci"
  | "security"
  | "dependencies"
  | "release"
  | "deployment"
  | "hygiene";

export interface HealthCategoryDefinition {
  id: HealthCategoryId;
  label: string;
  weight: number;
}

export interface HealthCheck {
  id: string;
  category: HealthCategoryId;
  label: string;
  status: HealthCheckStatus;
  /** Potential contribution of this check to the score (0-100 scale). */
  weight: number;
  /** Earned points for the check (pass = weight, warning = weight/2, fail = 0, unknown/na = 0). */
  score: number;
  /** Full possible points when applicable (unknown/na checks are excluded from scoring but keep maxScore = weight). */
  maxScore: number;
  evidence?: string;
  url?: string;
}

export interface HealthCategoryResult {
  category: HealthCategoryId;
  label: string;
  weight: number;
  score: number;
  maxScore: number;
  checks: HealthCheck[];
}

export interface HealthMetrics {
  workflowSuccessRate: number | null;
  failedRuns7d: number;
  dependabotOpenCount: number;
  dependabotCriticalCount: number;
  stalenessDays: number;
  lastCommitAt: string | null;
}

export interface HealthReport {
  score: number;
  status: "healthy" | "warning" | "critical";
  confidence: number;
  verifiedChecks: number;
  totalChecks: number;
  categories: HealthCategoryResult[];
  metrics: HealthMetrics;
  dataMode: "public" | "authenticated";
  generatedAt: string;
}

export interface HealthContext {
  repo: RepositoryRef;
  runs: WorkflowRun[];
  alerts: DependabotAlert[];
  dependencies?: DependencyInfo[];
  releases?: ReleaseSummary[];
  branchProtection?: BranchProtectionSummary;
  contributors?: ContributorSummary[];
  languages?: LanguageBreakdown;
  readmeAvailable?: boolean;
  rootTree?: string[];
  codeScanning?: { openAlerts: number } | null;
  pages?: GitHubPagesInfo;
  security?: {
    advancedSecurity?: boolean;
    secretScanning?: boolean;
    dependabotSecurityUpdates?: boolean;
  };
  availability?: Partial<OverviewRepoSnapshot["availability"]>;
  dataMode?: "public" | "authenticated";
}

export type HealthContextExtras = Omit<HealthContext, "repo" | "runs" | "alerts">;