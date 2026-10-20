import { afterEach, describe, expect, it, vi } from "vitest";
import { applyQuotaPenalty, evaluateRepositoryHealth, quotaPenalty } from "@/health";
import type { HealthContext } from "@/health";
import type { QuotaFamily } from "@/quotas";
import { createRepo } from "@/test/factories";
import type { WorkflowRun } from "@/types";

const DAY_MS = 24 * 60 * 60 * 1000;
const daysAgo = (days: number) => new Date(Date.now() - days * DAY_MS).toISOString();

function family(overrides: Partial<QuotaFamily> = {}): QuotaFamily {
  return {
    id: "actionsMinutes",
    used: 0,
    limit: 1000,
    unit: "minutes",
    resetAt: null,
    origin: "billing",
    monthly: true,
    ...overrides,
  };
}

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

function healthyContext(): HealthContext {
  return {
    repo: createRepo({ lastPushAt: daysAgo(3) }),
    runs: [successRun(1), successRun(2, "Release"), successRun(3, "CI")],
    alerts: [],
    availability: { dependabotAlerts: { available: true, source: "snapshot" } },
    dependencies: [{ name: "react", version: "18", type: "dependencies" }],
    releases: [
      {
        id: 1,
        tagName: "v1.0.0",
        name: "v1.0.0",
        publishedAt: daysAgo(10),
        htmlUrl: "",
        draft: false,
        prerelease: false,
        assetsCount: 2,
        body: "Release notes",
      },
    ],
    branchProtection: { available: true, protected: true, requiredStatusChecks: true, codeOwnerReviews: true },
    rootTree: ["src", "package.json", "package-lock.json", "CODEOWNERS", ".github"],
    codeScanning: { openAlerts: 0 },
    pages: { configured: true, url: "https://repo.example.com", lastBuildStatus: "built" },
    security: { advancedSecurity: true, secretScanning: true, dependabotSecurityUpdates: true },
    readmeAvailable: true,
    dataMode: "authenticated",
  };
}

afterEach(() => {
  vi.useRealTimers();
});

describe("quotaPenalty", () => {
  it("returns 0 when quotas are absent, empty or safely below the warning band", () => {
    expect(quotaPenalty()).toBe(0);
    expect(quotaPenalty([])).toBe(0);
    expect(quotaPenalty([family({ used: 0 })])).toBe(0);
    expect(quotaPenalty([family({ used: 799.9 })])).toBe(0);
  });

  it("returns 5 in the attention band and 10 in the critical band", () => {
    expect(quotaPenalty([family({ used: 800 })])).toBe(5);
    expect(quotaPenalty([family({ used: 899.9 })])).toBe(5);
    expect(quotaPenalty([family({ used: 900 })])).toBe(10);
    expect(quotaPenalty([family({ used: 999.9 })])).toBe(10);
  });

  it("keeps 100% and above in the critical band instead of capping the reading", () => {
    expect(quotaPenalty([family({ used: 1000 })])).toBe(10);
    expect(quotaPenalty([family({ used: 1500 })])).toBe(10);
    expect(quotaPenalty([family({ used: 5000 })])).toBe(10);
  });

  it("follows the worst status among monthly families with a limit", () => {
    const quotas = [
      family({ used: 850 }), // 85% — attention
      family({ id: "sharedStorage", used: 950, unit: "mb" }), // 95% — critical
    ];
    expect(quotaPenalty(quotas)).toBe(10);
  });

  it("ignores non-monthly readings such as the API rate-limit window", () => {
    const rateLimitWindow = family({ used: 5000, limit: 5000, monthly: false });
    expect(quotaPenalty([rateLimitWindow])).toBe(0);
    expect(applyQuotaPenalty(100, [rateLimitWindow])).toBe(100);
  });

  it("ignores families without a comparable limit", () => {
    const noLimit = family({ used: 5000, limit: null });
    expect(quotaPenalty([noLimit])).toBe(0);
    expect(applyQuotaPenalty(100, [noLimit])).toBe(100);
  });
});

describe("applyQuotaPenalty", () => {
  it("applies the penalty before rounding, with halves rounded up at the end", () => {
    const safe = [family({ used: 500 })];
    const attention = [family({ used: 850 })];
    const critical = [family({ used: 950 })];

    const cases: Array<[base: number, expected: [number, number, number]]> = [
      [100, [100, 95, 90]],
      [80, [80, 75, 70]],
      [72, [72, 67, 62]],
      [72.4, [72, 67, 62]],
      [72.5, [73, 68, 63]],
    ];

    for (const [base, [safeScore, attentionScore, criticalScore]] of cases) {
      expect(applyQuotaPenalty(base, safe)).toBe(safeScore);
      expect(applyQuotaPenalty(base, attention)).toBe(attentionScore);
      expect(applyQuotaPenalty(base, critical)).toBe(criticalScore);
    }
  });

  it("moves between bands exactly at 80% and 90% and keeps 100%+ critical", () => {
    const base = 100;
    expect(applyQuotaPenalty(base, [family({ used: 799.9 })])).toBe(100);
    expect(applyQuotaPenalty(base, [family({ used: 800 })])).toBe(95);
    expect(applyQuotaPenalty(base, [family({ used: 899.9 })])).toBe(95);
    expect(applyQuotaPenalty(base, [family({ used: 900 })])).toBe(90);
    expect(applyQuotaPenalty(base, [family({ used: 999.9 })])).toBe(90);
    expect(applyQuotaPenalty(base, [family({ used: 1000 })])).toBe(90);
    expect(applyQuotaPenalty(base, [family({ used: 1500 })])).toBe(90);
  });

  it("never produces a negative score", () => {
    expect(applyQuotaPenalty(3, [family({ used: 1500 })])).toBe(0);
  });
});

describe("evaluateRepositoryHealth quota integration", () => {
  it("keeps the report byte-identical when quotas are absent, empty or normal", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-20T12:00:00.000Z"));

    const absent = evaluateRepositoryHealth(healthyContext());
    const empty = evaluateRepositoryHealth({ ...healthyContext(), quotas: [] });
    const normal = evaluateRepositoryHealth({ ...healthyContext(), quotas: [family({ used: 799.9 })] });

    expect(absent.score).toBe(100);
    expect(JSON.stringify(empty)).toBe(JSON.stringify(absent));
    expect(JSON.stringify(normal)).toBe(JSON.stringify(absent));
  });

  it("deducts 5 and 10 points from the final score in the attention and critical bands", () => {
    const safe = evaluateRepositoryHealth({ ...healthyContext(), quotas: [family({ used: 500 })] });
    const attention = evaluateRepositoryHealth({ ...healthyContext(), quotas: [family({ used: 850 })] });
    const critical = evaluateRepositoryHealth({ ...healthyContext(), quotas: [family({ used: 950 })] });

    expect(safe.score).toBe(100);
    expect(attention.score).toBe(95);
    expect(critical.score).toBe(90);
    expect(critical.status).toBe("healthy");
  });
});
