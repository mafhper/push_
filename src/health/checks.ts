import type { HealthCategoryId, HealthCheckStatus, HealthContext } from "./types";

export interface CheckDefinition {
  id: string;
  category: HealthCategoryId;
  label: string;
  weight: number;
  evaluate: (ctx: HealthContext, now: number) => { status: HealthCheckStatus; evidence?: string; url?: string };
}

const DAY_MS = 24 * 60 * 60 * 1000;

function recentRuns(runs: HealthContext["runs"]) {
  return runs.slice(0, 10);
}

function successRate(runs: HealthContext["runs"]): number | null {
  const window = recentRuns(runs);
  if (window.length === 0) return null;
  const succeeded = window.filter((run) => run.conclusion === "success").length;
  return succeeded / window.length;
}

function failedRuns7d(runs: HealthContext["runs"], now: number): number {
  return runs.filter((run) => {
    const started = new Date(run.startedAt).getTime();
    return run.conclusion === "failure" && now - started < 7 * DAY_MS;
  }).length;
}

function dependabotAlertsReachable(ctx: HealthContext): boolean {
  const available = ctx.availability?.dependabotAlerts?.available;
  return available === true || ctx.alerts.length > 0;
}

function stalenessDays(ctx: HealthContext, now: number): number {
  const lastPush = ctx.repo.lastPushAt ? new Date(ctx.repo.lastPushAt).getTime() : 0;
  return lastPush ? Math.floor((now - lastPush) / DAY_MS) : 999;
}

const LOCKFILE_MANAGERS: Array<{ lockfile: string; manager: string }> = [
  { lockfile: "package-lock.json", manager: "npm" },
  { lockfile: "yarn.lock", manager: "yarn" },
  { lockfile: "pnpm-lock.yaml", manager: "pnpm" },
  { lockfile: "bun.lock", manager: "bun" },
  { lockfile: "Cargo.lock", manager: "cargo" },
  { lockfile: "go.sum", manager: "go" },
  { lockfile: "composer.lock", manager: "composer" },
  { lockfile: "Gemfile.lock", manager: "bundler" },
  { lockfile: "poetry.lock", manager: "poetry" },
];

const PACKAGE_MANIFESTS = ["package.json", "Cargo.toml", "go.mod", "composer.json", "Gemfile", "pyproject.toml"];

const GENERATED_ARTIFACT_DIRS = ["dist", "build", "out", "release", "coverage", "node_modules", ".next", ".nuxt", "target"];
const GENERATED_ARTIFACT_SUFFIXES = [".exe", ".msi", ".dmg"];

function detectPackageManagers(rootTree?: string[]) {
  if (!rootTree) return { managers: [] as string[], hasManifest: false };
  const managers = new Set<string>();
  for (const entry of rootTree) {
    const match = LOCKFILE_MANAGERS.find((m) => m.lockfile === entry);
    if (match) managers.add(match.manager);
  }
  return { managers: [...managers], hasManifest: rootTree.some((entry) => PACKAGE_MANIFESTS.includes(entry)) };
}

function findGeneratedArtifacts(rootTree?: string[]) {
  if (!rootTree) return [];
  return rootTree.filter(
    (entry) =>
      GENERATED_ARTIFACT_DIRS.includes(entry) || GENERATED_ARTIFACT_SUFFIXES.some((suffix) => entry.endsWith(suffix)),
  );
}

export const HEALTH_CHECKS: CheckDefinition[] = [
  // ---------------------------------------------------------------------------
  // Governance (15)
  // ---------------------------------------------------------------------------
  {
    id: "default_branch_exists",
    category: "governance",
    label: "Default branch present",
    weight: 3,
    evaluate: (ctx) =>
      ctx.repo.defaultBranch
        ? { status: "pass", evidence: `Default branch is "${ctx.repo.defaultBranch}".` }
        : { status: "fail", evidence: "Repository has no default branch." },
  },
  {
    id: "default_branch_protected",
    category: "governance",
    label: "Default branch protected",
    weight: 3,
    evaluate: (ctx) => {
      const protection = ctx.branchProtection;
      if (!protection || !protection.available) {
        return { status: "unknown", evidence: protection?.reason, url: ctx.repo.htmlUrl ? `${ctx.repo.htmlUrl}/settings/branches` : undefined };
      }
      if (protection.protected) {
        return { status: "pass", evidence: `"${ctx.repo.defaultBranch}" is protected.` };
      }
      return { status: "fail", evidence: `"${ctx.repo.defaultBranch}" has no branch protection.` };
    },
  },
  {
    id: "required_status_checks",
    category: "governance",
    label: "Required status checks",
    weight: 3,
    evaluate: (ctx) => {
      const protection = ctx.branchProtection;
      if (!protection || !protection.available || protection.requiredStatusChecks === undefined) {
        return { status: "unknown", evidence: "Required status checks could not be verified from the available data." };
      }
      if (protection.requiredStatusChecks) {
        return { status: "pass", evidence: `"${ctx.repo.defaultBranch}" requires passing status checks.` };
      }
      return { status: "fail", evidence: `"${ctx.repo.defaultBranch}" has no required status checks.` };
    },
  },
  {
    id: "codeowners_configured",
    category: "governance",
    label: "CODEOWNERS configured",
    weight: 3,
    evaluate: (ctx) => {
      if (ctx.branchProtection?.codeOwnerReviews === true) {
        return { status: "pass", evidence: "CODEOWNERS review is enforced by branch protection." };
      }
      if (!ctx.rootTree) {
        return { status: "unknown", evidence: "CODEOWNERS presence could not be verified from the available data." };
      }
      if (ctx.rootTree.includes("CODEOWNERS")) {
        return { status: "pass", evidence: "CODEOWNERS file is present at the repository root." };
      }
      if (!ctx.rootTree.includes(".github")) {
        return { status: "fail", evidence: "No CODEOWNERS file was found in the repository." };
      }
      return { status: "unknown", evidence: "CODEOWNERS may live under .github/ but could not be verified from the top-level tree." };
    },
  },
  {
    id: "review_policy",
    category: "governance",
    label: "Pull request review policy",
    weight: 3,
    evaluate: () => ({ status: "unknown" as HealthCheckStatus, evidence: "Review policy could not be verified from the available data." }),
  },

  // ---------------------------------------------------------------------------
  // CI / Automation (20)
  // ---------------------------------------------------------------------------
  {
    id: "ci_configured",
    category: "ci",
    label: "CI configured",
    weight: 6,
    evaluate: (ctx) => {
      const runsAvailable = ctx.availability?.workflowRuns?.available;
      if (runsAvailable === false) {
        return { status: "unknown", evidence: "Workflow runs could not be read." };
      }
      if (runsAvailable === true && ctx.runs.length === 0) {
        return { status: "warning", evidence: "No workflow runs observed on the default branch." };
      }
      if (ctx.runs.length > 0) {
        return { status: "pass", evidence: `${ctx.runs.length} workflow run(s) observed.` };
      }
      return { status: "unknown", evidence: "Workflow availability is unknown." };
    },
  },
  {
    id: "ci_recent_success_rate",
    category: "ci",
    label: "Recent CI passing",
    weight: 8,
    evaluate: (ctx) => {
      const rate = successRate(ctx.runs);
      if (rate === null) {
        return { status: "unknown" as HealthCheckStatus, evidence: "No workflow runs to rate." };
      }
      if (rate >= 0.8) {
        return { status: "pass", evidence: `${Math.round(rate * 100)}% of recent runs passed.` };
      }
      if (rate >= 0.5) {
        return { status: "warning", evidence: `${Math.round(rate * 100)}% of recent runs passed.` };
      }
      return { status: "fail", evidence: `${Math.round(rate * 100)}% of recent runs passed (below 50%).` };
    },
  },
  {
    id: "ci_no_recent_failures",
    category: "ci",
    label: "No failing runs in 7 days",
    weight: 6,
    evaluate: (ctx, now) => {
      const failures = failedRuns7d(ctx.runs, now);
      if (ctx.runs.length === 0) {
        return { status: "unknown" as HealthCheckStatus, evidence: "No workflow runs to inspect." };
      }
      if (failures === 0) {
        return { status: "pass", evidence: "No failed workflow runs in the last 7 days." };
      }
      if (failures <= 3) {
        return { status: "warning", evidence: `${failures} failed workflow run(s) in the last 7 days.` };
      }
      return { status: "fail", evidence: `${failures} failed workflow runs in the last 7 days.` };
    },
  },

  // ---------------------------------------------------------------------------
  // Security (20)
  // ---------------------------------------------------------------------------
  {
    id: "codeql_configured",
    category: "security",
    label: "Code scanning (CodeQL) configured",
    weight: 5,
    evaluate: (ctx) => {
      if (ctx.codeScanning === undefined) {
        return { status: "unknown", evidence: "Code scanning could not be verified from the available data." };
      }
      if (ctx.codeScanning === null) {
        return { status: "fail", evidence: "Code scanning is not enabled for this repository." };
      }
      if (ctx.codeScanning.openAlerts === 0) {
        return { status: "pass", evidence: "Code scanning is enabled with no open alerts." };
      }
      return { status: "warning", evidence: `${ctx.codeScanning.openAlerts} open code-scanning alert(s).` };
    },
  },
  {
    id: "secret_scanning",
    category: "security",
    label: "Secret scanning enabled",
    weight: 3,
    evaluate: (ctx) => {
      if (ctx.security?.secretScanning === undefined) {
        return { status: "unknown", evidence: "Secret scanning could not be verified from the available data." };
      }
      if (ctx.security.secretScanning) {
        return { status: "pass", evidence: "Secret scanning is enabled for this repository." };
      }
      return { status: "fail", evidence: "Secret scanning is not enabled for this repository." };
    },
  },
  {
    id: "dependabot_enabled",
    category: "security",
    label: "Dependabot enabled",
    weight: 3,
    evaluate: (ctx) => {
      const reason = ctx.availability?.dependabotAlerts?.reason?.toLowerCase() ?? "";
      if (dependabotAlertsReachable(ctx)) {
        return { status: "pass", evidence: "Dependabot alerts endpoint is reachable." };
      }
      if (!ctx.availability?.dependabotAlerts) {
        return { status: "unknown" as HealthCheckStatus, evidence: "Dependabot availability was not exposed." };
      }
      if (reason.includes("not enabled") || reason.includes("not available") || reason.includes("not found")) {
        return { status: "fail", evidence: ctx.availability.dependabotAlerts.reason };
      }
      return { status: "unknown", evidence: ctx.availability.dependabotAlerts.reason };
    },
  },
  {
    id: "no_critical_alerts",
    category: "security",
    label: "No critical Dependabot alerts",
    weight: 4,
    evaluate: (ctx) => {
      if (!dependabotAlertsReachable(ctx)) {
        return { status: "unknown" as HealthCheckStatus, evidence: "Dependabot alerts are not readable in this runtime." };
      }
      const critical = ctx.alerts.filter((alert) => alert.severity === "critical").length;
      if (critical === 0) {
        return { status: "pass", evidence: "No critical Dependabot alerts open." };
      }
      return { status: "fail", evidence: `${critical} critical Dependabot alert(s) open.` };
    },
  },
  {
    id: "no_high_alerts",
    category: "security",
    label: "No high-severity alerts",
    weight: 3,
    evaluate: (ctx) => {
      if (!dependabotAlertsReachable(ctx)) {
        return { status: "unknown" as HealthCheckStatus, evidence: "Dependabot alerts are not readable in this runtime." };
      }
      const high = ctx.alerts.filter((alert) => alert.severity === "high").length;
      if (high === 0) {
        return { status: "pass", evidence: "No high-severity Dependabot alerts open." };
      }
      return { status: "warning", evidence: `${high} high-severity Dependabot alert(s) open.` };
    },
  },
  {
    id: "no_alert_backlog",
    category: "security",
    label: "No alert backlog",
    weight: 2,
    evaluate: (ctx) => {
      if (!dependabotAlertsReachable(ctx)) {
        return { status: "unknown" as HealthCheckStatus, evidence: "Dependabot alerts are not readable in this runtime." };
      }
      const backlog = ctx.alerts.filter((alert) => alert.severity === "medium" || alert.severity === "low").length;
      if (backlog === 0) {
        return { status: "pass", evidence: "No medium/low Dependabot alerts open." };
      }
      return { status: "warning", evidence: `${backlog} medium/low Dependabot alert(s) open.` };
    },
  },

  // ---------------------------------------------------------------------------
  // Dependencies (10)
  // ---------------------------------------------------------------------------
  {
    id: "dependency_inventory",
    category: "dependencies",
    label: "Package inventory readable",
    weight: 5,
    evaluate: (ctx) => {
      if (!ctx.dependencies) {
        return { status: "unknown" as HealthCheckStatus, evidence: "No package manifest was read for this repository." };
      }
      return {
        status: "pass",
        evidence: `${ctx.dependencies.length} package(s) inventoried from the manifest.`,
      };
    },
  },
  {
    id: "package_manager_consistent",
    category: "dependencies",
    label: "Single package manager",
    weight: 5,
    evaluate: (ctx) => {
      const { managers, hasManifest } = detectPackageManagers(ctx.rootTree);
      if (!ctx.rootTree) {
        return { status: "unknown", evidence: "Repository tree could not be inspected for package manager consistency." };
      }
      if (managers.length > 1) {
        return { status: "fail", evidence: `Multiple package managers detected: ${managers.join(", ")}.` };
      }
      if (managers.length === 1) {
        return { status: "pass", evidence: `${managers[0]} is the only package manager detected.` };
      }
      if (!hasManifest) {
        return { status: "not_applicable", evidence: "No package manifest or lockfile detected." };
      }
      return { status: "warning", evidence: "Package manifest present but no lockfile committed." };
    },
  },

  // ---------------------------------------------------------------------------
  // Release Engineering (15)
  // ---------------------------------------------------------------------------
  {
    id: "release_workflow_configured",
    category: "release",
    label: "Release workflow configured",
    weight: 3,
    evaluate: (ctx) => {
      const hasReleaseWorkflow = ctx.runs.some((run) => /release/i.test(run.workflowName));
      if (hasReleaseWorkflow) {
        return { status: "pass", evidence: "A release-oriented workflow is present among observed runs." };
      }
      if (ctx.runs.length === 0) {
        return { status: "unknown" as HealthCheckStatus, evidence: "No workflow runs observed to identify a release workflow." };
      }
      return { status: "warning", evidence: "No release-oriented workflow observed among runs." };
    },
  },
  {
    id: "latest_release_exists",
    category: "release",
    label: "Latest release exists",
    weight: 3,
    evaluate: (ctx) => {
      if (!ctx.releases) {
        return { status: "unknown" as HealthCheckStatus, evidence: "Release data was not exposed." };
      }
      if (ctx.releases.length === 0) {
        return { status: "fail", evidence: "No releases were found for this repository." };
      }
      const latest = ctx.releases[0];
      return { status: "pass", evidence: `Latest release is "${latest.tagName}".`, url: latest.htmlUrl };
    },
  },
  {
    id: "release_recency",
    category: "release",
    label: "Release is recent",
    weight: 2,
    evaluate: (ctx, now) => {
      if (!ctx.releases) {
        return { status: "unknown" as HealthCheckStatus, evidence: "Release data was not exposed." };
      }
      const published = ctx.releases
        .map((release) => (release.publishedAt ? new Date(release.publishedAt).getTime() : 0))
        .filter((time) => time > 0)
        .sort((a, b) => b - a)[0];
      if (!published) {
        return { status: "warning", evidence: "Latest release has no recorded publish date." };
      }
      const ageDays = (now - published) / DAY_MS;
      if (ageDays <= 180) {
        return { status: "pass", evidence: `Latest release is ${Math.round(ageDays)} day(s) old.` };
      }
      if (ageDays <= 365) {
        return { status: "warning", evidence: `Latest release is ${Math.round(ageDays)} day(s) old.` };
      }
      return { status: "fail", evidence: `Latest release is ${Math.round(ageDays)} day(s) old.` };
    },
  },
  {
    id: "release_assets",
    category: "release",
    label: "Release ships binaries/assets",
    weight: 4,
    evaluate: (ctx) => {
      if (!ctx.releases || ctx.releases.length === 0) {
        return { status: "unknown", evidence: "Release asset data was not exposed or no releases exist." };
      }
      const latest = ctx.releases[0];
      if (latest.assetsCount === undefined) {
        return { status: "unknown", evidence: "Release asset data was not exposed." };
      }
      if (latest.assetsCount > 0) {
        return { status: "pass", evidence: `Latest release ships ${latest.assetsCount} asset(s).` };
      }
      return { status: "warning", evidence: "Latest release has no attached binaries or assets." };
    },
  },
  {
    id: "release_notes",
    category: "release",
    label: "Release notes provided",
    weight: 3,
    evaluate: (ctx) => {
      if (!ctx.releases || ctx.releases.length === 0) {
        return { status: "unknown", evidence: "Release note data was not exposed or no releases exist." };
      }
      const latest = ctx.releases[0];
      if (latest.body === undefined) {
        return { status: "unknown", evidence: "Release note data was not exposed." };
      }
      if (latest.body && latest.body.trim().length > 0) {
        return { status: "pass", evidence: "Latest release includes release notes." };
      }
      return { status: "warning", evidence: "Latest release has no release notes." };
    },
  },

  // ---------------------------------------------------------------------------
  // Deployment (10)
  // ---------------------------------------------------------------------------
  {
    id: "pages_configured",
    category: "deployment",
    label: "GitHub Pages configured",
    weight: 5,
    evaluate: (ctx) => {
      if (!ctx.pages) {
        return { status: "unknown", evidence: "Pages configuration could not be verified from the available data." };
      }
      if (ctx.pages.configured) {
        return { status: "pass", evidence: ctx.pages.url ? `GitHub Pages is live at ${ctx.pages.url}.` : "GitHub Pages is configured for this repository.", url: ctx.pages.url };
      }
      return { status: "fail", evidence: "GitHub Pages is not configured for this repository." };
    },
  },
  {
    id: "latest_deployment_healthy",
    category: "deployment",
    label: "Latest deployment healthy",
    weight: 5,
    evaluate: (ctx) => {
      if (!ctx.pages) {
        return { status: "unknown", evidence: "Deployment status could not be verified from the available data." };
      }
      if (!ctx.pages.configured) {
        return { status: "not_applicable", evidence: "No GitHub Pages site to deploy." };
      }
      const buildStatus = ctx.pages.lastBuildStatus;
      if (buildStatus === "built") {
        return { status: "pass", evidence: "Latest Pages build succeeded." };
      }
      if (buildStatus === "error") {
        return { status: "fail", evidence: ctx.pages.error || "Latest Pages build failed." };
      }
      if (buildStatus === "building" || buildStatus === "queued") {
        return { status: "warning", evidence: `Latest Pages build is ${buildStatus}.` };
      }
      return { status: "unknown", evidence: "Latest Pages build status is not available." };
    },
  },

  // ---------------------------------------------------------------------------
  // Repository Hygiene (10)
  // ---------------------------------------------------------------------------
  {
    id: "documentation_available",
    category: "hygiene",
    label: "Documentation present",
    weight: 5,
    evaluate: (ctx) => {
      if (ctx.readmeAvailable === undefined) {
        return { status: "unknown" as HealthCheckStatus, evidence: "README availability was not exposed." };
      }
      if (ctx.readmeAvailable) {
        return { status: "pass", evidence: "Repository README is available." };
      }
      return { status: "warning", evidence: "Repository README is not available." };
    },
  },
  {
    id: "no_generated_artifacts",
    category: "hygiene",
    label: "No generated build artifacts",
    weight: 5,
    evaluate: (ctx) => {
      if (!ctx.rootTree) {
        return { status: "unknown", evidence: "Repository tree could not be inspected for generated artifacts." };
      }
      const artifacts = findGeneratedArtifacts(ctx.rootTree);
      if (artifacts.length === 0) {
        return { status: "pass", evidence: "No generated build artifacts at the repository root." };
      }
      return { status: "fail", evidence: `Generated build artifact(s) found: ${artifacts.join(", ")}.` };
    },
  },
];

export { failedRuns7d, successRate, stalenessDays };