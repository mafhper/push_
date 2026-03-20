import { describe, it, expect } from "vitest";
import { calculateHealth } from "../utils/health";
import type { RepositoryRef, WorkflowRun, DependabotAlert } from "../types";

describe("Health Calculation", () => {
  const mockRepo: RepositoryRef = {
    id: 1,
    owner: "test",
    name: "repo",
    fullName: "test/repo",
    defaultBranch: "main",
    isPrivate: false,
    archived: false,
    htmlUrl: "",
    description: "",
    license: null,
    language: "TypeScript",
    stars: 10,
    forks: 2,
    openIssues: 5,
    watchers: 10,
    lastPushAt: new Date().toISOString(),
    size: 1000,
    topics: [],
    createdAt: "",
    updatedAt: "",
  };

  it("should return a perfect score for a healthy repo", () => {
    const runs: WorkflowRun[] = [
      { id: 1, workflowName: "CI", status: "completed", conclusion: "success", branch: "main", event: "push", startedAt: new Date().toISOString(), updatedAt: new Date().toISOString(), durationMs: 1000, htmlUrl: "" }
    ];
    const alerts: DependabotAlert[] = [];
    
    const health = calculateHealth(mockRepo, runs, alerts);
    expect(health.score).toBeGreaterThanOrEqual(90);
    expect(health.status).toBe("healthy");
  });

  it("should penalize for failed workflows", () => {
    const runs: WorkflowRun[] = [
      { id: 1, workflowName: "CI", status: "completed", conclusion: "failure", branch: "main", event: "push", startedAt: new Date().toISOString(), updatedAt: new Date().toISOString(), durationMs: 1000, htmlUrl: "" }
    ];
    const alerts: DependabotAlert[] = [];
    
    const health = calculateHealth(mockRepo, runs, alerts);
    expect(health.score).toBeLessThan(100);
  });

  it("should penalize for critical security alerts", () => {
    const runs: WorkflowRun[] = [];
    const alerts: DependabotAlert[] = [
      { id: 1, severity: "critical", state: "open", packageName: "test", ecosystem: "npm", manifestPath: "package.json", createdAt: new Date().toISOString(), fixedIn: null, htmlUrl: "", cveId: "CVE-123", summary: "Critical" }
    ];
    
    const health = calculateHealth(mockRepo, runs, alerts);
    expect(health.status).toBe("warning"); // Depends on exact threshold, but should be lower
  });
});
