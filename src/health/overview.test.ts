import { describe, expect, it } from "vitest";
import {
  applyQuotasToOverview,
  contextFromSnapshotDetail,
  evaluateRepositoryHealth,
  penalizeHealth,
  toRepoHealth,
} from "@/health";
import type { QuotaFamily } from "@/quotas";
import { createOverview, createRepoDetail } from "@/test/factories";

/**
 * The overview card and the repository detail must show the same note.
 *
 * The card health is evaluated by the service from the same detail the page
 * evaluates — the only difference used to be the quota supplement, which only
 * the detail received. These tests pin the two paths to the same engine output
 * instead of trusting them to stay aligned.
 */

function family(overrides: Partial<QuotaFamily> = {}): QuotaFamily {
  return {
    id: "actionsMinutes",
    used: 0,
    limit: 2000,
    unit: "minutes",
    resetAt: null,
    origin: "billing",
    monthly: true,
    ...overrides,
  };
}

const attention = [family({ used: 1700 })]; // 85% — warning band, 5 points
const critical = [family({ used: 1900 })]; // 95% — critical band, 10 points
const normal = [family({ used: 400 })]; // 20% — no penalty

function overviewWith(healthOverrides: Parameters<typeof createOverview>[0] = {}) {
  return createOverview(healthOverrides);
}

describe("penalizeHealth", () => {
  it("returns the very same object when there is nothing to deduct", () => {
    const health = toRepoHealth(evaluateRepositoryHealth(contextFromSnapshotDetail(createRepoDetail())));

    expect(penalizeHealth(health)).toBe(health);
    expect(penalizeHealth(health, [])).toBe(health);
    expect(penalizeHealth(health, normal)).toBe(health);
  });

  it("deducts the band once and keeps the other metrics untouched", () => {
    const health = toRepoHealth(evaluateRepositoryHealth(contextFromSnapshotDetail(createRepoDetail())));
    const penalized = penalizeHealth(health, critical);

    // 10 points for the critical band, deducted once — not once per row.
    expect(penalized.score).toBe(health.score - 10);
    expect(penalized.status).toBe("healthy");
    expect(penalized.stalenessDays).toBe(health.stalenessDays);
    expect(penalized.dependabotOpenCount).toBe(health.dependabotOpenCount);
  });

  it("leaves an already zero score alone so the engine's warning override survives", () => {
    const report = evaluateRepositoryHealth({ ...contextFromSnapshotDetail(createRepoDetail()), quotas: critical });
    const health = { ...toRepoHealth(report), score: 0, status: "warning" as const };

    expect(penalizeHealth(health, critical)).toBe(health);
  });
});

describe("applyQuotasToOverview", () => {
  it("is a no-op without quotas, with an empty list or below the warning band", () => {
    const overview = overviewWith();

    expect(applyQuotasToOverview(overview)).toBe(overview);
    expect(applyQuotasToOverview(overview, [])).toBe(overview);
    expect(applyQuotasToOverview(overview, normal)).toBe(overview);
  });

  it("penalizes every row from the single account reading", () => {
    const overview = overviewWith();
    const adjusted = applyQuotasToOverview(overview, attention);

    expect(adjusted.repos[0]?.health.score).toBe(83); // 88 - 5
    expect(adjusted.repos[0]?.health.status).toBe("healthy");
    expect(adjusted.repos[0]?.stats).toBe(overview.repos[0]?.stats);
  });

  it("gives the card and the detail the same score and status under quota", () => {
    const detail = createRepoDetail();
    const base = toRepoHealth(evaluateRepositoryHealth(contextFromSnapshotDetail(detail)));
    const overview = {
      ...overviewWith(),
      repos: [{ ...overviewWith().repos[0]!, health: base }],
    };

    for (const quotas of [normal, attention, critical]) {
      const card = applyQuotasToOverview(overview, quotas).repos[0]!.health;
      const page = evaluateRepositoryHealth(contextFromSnapshotDetail(detail, { quotas }));

      expect(card.score, `score at ${quotas[0]?.used}`).toBe(page.score);
      expect(card.status, `status at ${quotas[0]?.used}`).toBe(page.status);
    }
  });
});
