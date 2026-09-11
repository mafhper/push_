import { describe, it, expect } from "vitest";
import {
  HEALTH_CATEGORIES,
  HEALTH_CHECKS,
  assertWeightsTotalHundred,
  evaluateRepositoryHealth,
  toRepoHealth,
} from "@/health";
import type { HealthContext } from "@/health";
import { createRepo } from "@/test/factories";
import { calculateHealth } from "@/utils/health";
import type { DependabotAlert, WorkflowRun } from "@/types";

const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

function successRun(id: number, workflowName = "CI"): WorkflowRun {
  return {
    id,
    workflowName,
    status: "completed",
    conclusion: "success",
    branch: "main",
    event: "push",
    startedAt: daysAgo(2),
    updatedAt: daysAgo(2),
    durationMs: 1000,
    htmlUrl: `https://github.com/test/repo/actions/runs/${id}`,
  };
}

function failRun(id: number): WorkflowRun {
  return {
    ...successRun(id),
    conclusion: "failure",
  };
}

function alert(id: number, severity: DependabotAlert["severity"]): DependabotAlert {
  return {
    id,
    severity,
    state: "open",
    packageName: "test-pkg",
    ecosystem: "npm",
    manifestPath: "package.json",
    createdAt: daysAgo(10),
    fixedIn: null,
    htmlUrl: "",
    cveId: `CVE-${id}`,
    summary: `Alert ${id}`,
  };
}

function healthyContext(): HealthContext {
  return {
    repo: createRepo({ lastPushAt: daysAgo(3) }),
    runs: [successRun(1), successRun(2, "Release"), successRun(3, "CI")],
    alerts: [],
    availability: { dependabotAlerts: { available: true, source: "snapshot" } },
    dependencies: [{ name: "react", version: "18", type: "dependencies" }],
    releases: [{ id: 1, tagName: "v1.0.0", name: "v1.0.0", publishedAt: daysAgo(10), htmlUrl: "", draft: false, prerelease: false, assetsCount: 2, body: "Release notes" }],
    branchProtection: { available: true, protected: true, requiredStatusChecks: true, codeOwnerReviews: true },
    rootTree: ["src", "package.json", "package-lock.json", "CODEOWNERS", ".github"],
    codeScanning: { openAlerts: 0 },
    pages: { configured: true, url: "https://repo.example.com", lastBuildStatus: "built" },
    security: { advancedSecurity: true, secretScanning: true, dependabotSecurityUpdates: true },
    readmeAvailable: true,
    dataMode: "authenticated",
  };
}

describe("health engine configuration", () => {
  it("category weights sum to 100", () => {
    expect(() => assertWeightsTotalHundred()).not.toThrow();
    expect(HEALTH_CATEGORIES.reduce((sum, c) => sum + c.weight, 0)).toBe(100);
  });

  it("every check belongs to a known category and has a positive weight", () => {
    const ids = new Set(HEALTH_CATEGORIES.map((c) => c.id));
    for (const check of HEALTH_CHECKS) {
      expect(ids.has(check.category)).toBe(true);
      expect(check.weight).toBeGreaterThan(0);
    }
  });
});

describe("evaluateRepositoryHealth scoring", () => {
  it("scores 100 when every applicable check passes and reports confidence", () => {
    const report = evaluateRepositoryHealth(healthyContext());
    expect(report.score).toBe(100);
    expect(report.status).toBe("healthy");
    expect(report.totalChecks).toBe(25);
    expect(report.verifiedChecks).toBe(24);
    expect(report.confidence).toBe(96);
    expect(report.categories).toHaveLength(7);
  });

  it("produces 100% confidence when all checks are verifiable", () => {
    const ctx = healthyContext();
    const report = evaluateRepositoryHealth(ctx);
    expect(report.verifiedChecks).toBeLessThanOrEqual(report.totalChecks);
    expect(report.confidence).toBe(Math.round((report.verifiedChecks / report.totalChecks) * 100));
  });

  it("scores a repo with failing CI, no releases and unprotected branch as critical", () => {
    const report = evaluateRepositoryHealth({
      repo: createRepo({ lastPushAt: daysAgo(3) }),
      runs: [failRun(1), failRun(2), failRun(3), failRun(4), failRun(5)],
      alerts: [alert(1, "critical"), alert(2, "high"), alert(3, "medium"), alert(4, "medium")],
      availability: { dependabotAlerts: { available: true, source: "snapshot" } },
      releases: [],
      branchProtection: { available: true, protected: false },
      readmeAvailable: false,
      dataMode: "authenticated",
    });
    expect(report.status).toBe("critical");
    expect(report.score).toBeLessThan(40);
    expect(report.metrics.workflowSuccessRate).toBe(0);
    expect(report.metrics.failedRuns7d).toBe(5);
    expect(report.metrics.dependabotCriticalCount).toBe(1);
  });

  it("does not penalize checks that could not be verified", () => {
    const unknown = evaluateRepositoryHealth({
      repo: createRepo({ lastPushAt: daysAgo(3) }),
      runs: [successRun(1)],
      alerts: [],
      availability: { dependabotAlerts: { available: true, source: "snapshot" } },
      dependencies: [{ name: "react", version: "18", type: "dependencies" }],
      branchProtection: { available: true, protected: true },
      readmeAvailable: true,
      dataMode: "authenticated",
    });
    const verifiedFail = evaluateRepositoryHealth({
      repo: createRepo({ lastPushAt: daysAgo(3) }),
      runs: [successRun(1)],
      alerts: [],
      availability: { dependabotAlerts: { available: true, source: "snapshot" } },
      dependencies: [{ name: "react", version: "18", type: "dependencies" }],
      releases: [],
      branchProtection: { available: true, protected: true },
      readmeAvailable: true,
      dataMode: "authenticated",
    });

    expect(verifiedFail.score).toBeLessThan(unknown.score);
    expect(unknown.score).toBeGreaterThanOrEqual(verifiedFail.score);
  });

  it("returns a low-confidence healthy status for sparse data", () => {
    const report = evaluateRepositoryHealth({
      repo: createRepo({ lastPushAt: daysAgo(3) }),
      runs: [successRun(1)],
      alerts: [],
      dataMode: "public",
    });
    expect(report.confidence).toBeLessThan(30);
    expect(report.dataMode).toBe("public");
  });

  it("reports critical for a repository with no default branch and no data", () => {
    const report = evaluateRepositoryHealth({
      repo: createRepo({ defaultBranch: "", lastPushAt: null }),
      runs: [],
      alerts: [],
      dataMode: "public",
    });
    expect(report.status).toBe("critical");
    expect(report.score).toBe(0);
  });
});

describe("new engine checks (Fase 6)", () => {
  const base = () => ({
    repo: createRepo({ lastPushAt: daysAgo(3) }),
    runs: [successRun(1)],
    alerts: [],
    availability: { dependabotAlerts: { available: true, source: "snapshot" } },
    readmeAvailable: true,
    dataMode: "authenticated" as const,
  });

  const findCheck = (report: ReturnType<typeof evaluateRepositoryHealth>, id: string) => {
    const category = report.categories.find((category) => category.checks.some((check) => check.id === id));
    return category?.checks.find((check) => check.id === id);
  };

  it("scores required status checks and codeowners from branch protection", () => {
    const report = evaluateRepositoryHealth({
      ...base(),
      branchProtection: { available: true, protected: true, requiredStatusChecks: true, codeOwnerReviews: true },
      rootTree: ["src", ".github"],
    });
    expect(findCheck(report, "required_status_checks")?.status).toBe("pass");
    expect(findCheck(report, "codeowners_configured")?.status).toBe("pass");
  });

  it("fails required status checks when unprotected", () => {
    const report = evaluateRepositoryHealth({
      ...base(),
      branchProtection: { available: true, protected: true, requiredStatusChecks: false },
    });
    expect(findCheck(report, "required_status_checks")?.status).toBe("fail");
  });

  it("fails codeowners when no CODEOWNERS and no .github directory exist", () => {
    const report = evaluateRepositoryHealth({
      ...base(),
      rootTree: ["src", "index.html"],
    });
    expect(findCheck(report, "codeowners_configured")?.status).toBe("fail");
  });

  it("scores codeql and secret scanning from collected data", () => {
    const report = evaluateRepositoryHealth({
      ...base(),
      codeScanning: { openAlerts: 0 },
      security: { advancedSecurity: true, secretScanning: true },
    });
    expect(findCheck(report, "codeql_configured")?.status).toBe("pass");
    expect(findCheck(report, "secret_scanning")?.status).toBe("pass");
  });

  it("warns on open code-scanning alerts and fails when scanning disabled", () => {
    const warning = evaluateRepositoryHealth({ ...base(), codeScanning: { openAlerts: 3 } });
    const disabled = evaluateRepositoryHealth({ ...base(), codeScanning: null });
    expect(findCheck(warning, "codeql_configured")?.status).toBe("warning");
    expect(findCheck(disabled, "codeql_configured")?.status).toBe("fail");
  });

  it("detects multiple package managers as a fail", () => {
    const report = evaluateRepositoryHealth({
      ...base(),
      rootTree: ["package.json", "package-lock.json", "yarn.lock"],
    });
    expect(findCheck(report, "package_manager_consistent")?.status).toBe("fail");
    expect(findCheck(report, "package_manager_consistent")?.evidence).toContain("Multiple package managers");
  });

  it("accepts a single committed lockfile and flags missing lockfile", () => {
    const single = evaluateRepositoryHealth({ ...base(), rootTree: ["package.json", "package-lock.json"] });
    const missing = evaluateRepositoryHealth({ ...base(), rootTree: ["package.json"] });
    expect(findCheck(single, "package_manager_consistent")?.status).toBe("pass");
    expect(findCheck(missing, "package_manager_consistent")?.status).toBe("warning");
  });

  it("marks package manager check as not applicable without any manifest", () => {
    const report = evaluateRepositoryHealth({ ...base(), rootTree: ["src", ".github"] });
    expect(findCheck(report, "package_manager_consistent")?.status).toBe("not_applicable");
  });

  it("scores release assets and notes from the latest release", () => {
    const report = evaluateRepositoryHealth({
      ...base(),
      releases: [
        {
          id: 1,
          tagName: "v1.0.0",
          name: "v1.0.0",
          publishedAt: daysAgo(5),
          htmlUrl: "",
          draft: false,
          prerelease: false,
          assetsCount: 3,
          body: "Notes",
        },
      ],
    });
    expect(findCheck(report, "release_assets")?.status).toBe("pass");
    expect(findCheck(report, "release_notes")?.status).toBe("pass");
  });

  it("warns on a release without assets or notes", () => {
    const report = evaluateRepositoryHealth({
      ...base(),
      releases: [
        {
          id: 1,
          tagName: "v1.0.0",
          name: "v1.0.0",
          publishedAt: daysAgo(5),
          htmlUrl: "",
          draft: false,
          prerelease: false,
          assetsCount: 0,
          body: "",
        },
      ],
    });
    expect(findCheck(report, "release_assets")?.status).toBe("warning");
    expect(findCheck(report, "release_notes")?.status).toBe("warning");
  });

  it("scores pages and deployment from collected data", () => {
    const report = evaluateRepositoryHealth({
      ...base(),
      pages: { configured: true, url: "https://repo.example.com", lastBuildStatus: "built" },
    });
    expect(findCheck(report, "pages_configured")?.status).toBe("pass");
    expect(findCheck(report, "latest_deployment_healthy")?.status).toBe("pass");
  });

  it("marks deployment as not applicable when Pages is not configured", () => {
    const report = evaluateRepositoryHealth({ ...base(), pages: { configured: false } });
    expect(findCheck(report, "pages_configured")?.status).toBe("fail");
    expect(findCheck(report, "latest_deployment_healthy")?.status).toBe("not_applicable");
  });

  it("fails on generated artifacts in the repository root", () => {
    const report = evaluateRepositoryHealth({ ...base(), rootTree: ["src", "dist", "bundle.exe"] });
    expect(findCheck(report, "no_generated_artifacts")?.status).toBe("fail");
  });
});

describe("calculateHealth delegate", () => {
  it("returns the RepoHealth shape via toRepoHealth", () => {
    const ctx = healthyContext();
    const health = calculateHealth(ctx.repo, ctx.runs ?? [], ctx.alerts ?? [], {
      availability: ctx.availability,
      dependencies: ctx.dependencies,
      releases: ctx.releases,
      branchProtection: ctx.branchProtection,
      readmeAvailable: ctx.readmeAvailable,
      dataMode: ctx.dataMode,
    });
    expect(health.score).toBe(100);
    expect(health.status).toBe("healthy");
    expect(health.workflowSuccessRate).toBe(100);
    expect(health.failedRuns7d).toBe(0);
    expect(health.dependabotOpenCount).toBe(0);
    expect(health.dependabotCriticalCount).toBe(0);
    expect(Number.isFinite(health.stalenessDays)).toBe(true);
  });

  it("maps a report through toRepoHealth", () => {
    const report = evaluateRepositoryHealth(healthyContext());
    const repoHealth = toRepoHealth(report);
    expect(repoHealth).toEqual({
      score: report.score,
      status: report.status,
      lastCommitAt: report.metrics.lastCommitAt,
      workflowSuccessRate: report.metrics.workflowSuccessRate,
      failedRuns7d: report.metrics.failedRuns7d,
      dependabotOpenCount: report.metrics.dependabotOpenCount,
      dependabotCriticalCount: report.metrics.dependabotCriticalCount,
      stalenessDays: report.metrics.stalenessDays,
    });
  });
});