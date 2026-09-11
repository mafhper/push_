import { HEALTH_CATEGORIES } from "./categories";
import { HEALTH_CHECKS, type CheckDefinition } from "./checks";
import { failedRuns7d, successRate } from "./checks";
import type {
  HealthCategoryResult,
  HealthCheck,
  HealthCheckStatus,
  HealthMetrics,
  HealthReport,
  HealthContext,
} from "./types";

const DAY_MS = 24 * 60 * 60 * 1000;

function isScoredStatus(status: HealthCheckStatus): boolean {
  return status !== "unknown" && status !== "not_applicable";
}

export function scoreCheck(check: CheckDefinition, ctx: HealthContext, now: number): HealthCheck {
  const result = check.evaluate(ctx, now);
  let score = 0;
  if (result.status === "pass") score = check.weight;
  else if (result.status === "warning") score = check.weight / 2;
  return {
    id: check.id,
    category: check.category,
    label: check.label,
    status: result.status,
    weight: check.weight,
    score,
    maxScore: check.weight,
    evidence: result.evidence,
    url: result.url,
  };
}

function buildCategory(
  checks: HealthCheck[],
  ctx: HealthContext,
): HealthCategoryResult | null {
  const check = checks[0];
  if (!check) return null;
  const definition = HEALTH_CATEGORIES.find((category) => category.id === check.category);
  const scoredChecks = checks.filter((item) => isScoredStatus(item.status));
  const score = scoredChecks.reduce((sum, item) => sum + item.score, 0);
  const maxScore = scoredChecks.reduce((sum, item) => sum + item.maxScore, 0);
  return {
    category: check.category,
    label: definition?.label ?? check.category,
    weight: definition?.weight ?? 0,
    score,
    maxScore,
    checks,
  };
}

function buildMetrics(ctx: HealthContext): HealthMetrics {
  const now = Date.now();
  const failures7d = failedRuns7d(ctx.runs, now);
  const rate = successRate(ctx.runs);
  const lastPush = ctx.repo.lastPushAt ? new Date(ctx.repo.lastPushAt).getTime() : 0;
  return {
    workflowSuccessRate: rate !== null ? Math.round(rate * 100) : null,
    failedRuns7d: failures7d,
    dependabotOpenCount: ctx.alerts.length,
    dependabotCriticalCount: ctx.alerts.filter((alert) => alert.severity === "critical").length,
    stalenessDays: lastPush ? Math.floor((now - lastPush) / DAY_MS) : 0,
    lastCommitAt: ctx.repo.lastPushAt ?? null,
  };
}

function summarize(categories: HealthCategoryResult[]): {
  score: number;
  status: HealthReport["status"];
  verifiedChecks: number;
  totalChecks: number;
} {
  const totalScore = categories.reduce((sum, category) => sum + category.score, 0);
  const totalMaxScore = categories.reduce((sum, category) => sum + category.maxScore, 0);
  const totalChecks = categories.reduce((sum, category) => sum + category.checks.length, 0);
  const verifiedChecks = categories.reduce(
    (sum, category) =>
      sum + category.checks.filter((check) => check.status !== "unknown" && check.status !== "not_applicable").length,
    0,
  );

  const score = totalMaxScore > 0 ? Math.round((totalScore / totalMaxScore) * 100) : 0;
  let status: HealthReport["status"];
  if (score >= 70) status = "healthy";
  else if (score >= 40) status = "warning";
  else status = "critical";
  if (verifiedChecks === 0) status = "warning";
  return {
    score,
    status,
    verifiedChecks,
    totalChecks,
  };
}

export function evaluateRepositoryHealth(ctx: HealthContext): HealthReport {
  const now = Date.now();
  const checks = HEALTH_CHECKS.map((check) => scoreCheck(check, ctx, now));
  const categories: HealthCategoryResult[] = [];
  for (const category of HEALTH_CATEGORIES) {
    const categoryChecks = checks.filter((check) => check.category === category.id);
    const built = buildCategory(categoryChecks, ctx);
    if (built) categories.push(built);
  }
  const { score, status, verifiedChecks, totalChecks } = summarize(categories);
  return {
    score,
    status,
    confidence: totalChecks > 0 ? Math.round((verifiedChecks / totalChecks) * 100) : 0,
    verifiedChecks,
    totalChecks,
    categories,
    metrics: buildMetrics(ctx),
    dataMode: ctx.dataMode ?? "public",
    generatedAt: new Date(now).toISOString(),
  };
}