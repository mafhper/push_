import { describe, expect, it } from "vitest";
import {
  FIELD_SCORE_SCALE,
  PROMO_FLEET,
  SCORE_BAR_MAX,
  SCORE_THRESHOLDS,
  SCORE_WEIGHTS,
  fleetRepoAt,
  scoreOf,
  statusOf,
} from "./promoFleet";

describe("attention scoring", () => {
  it("adds the documented weights", () => {
    expect(SCORE_WEIGHTS.criticalAlert).toBe(100);
    expect(SCORE_WEIGHTS.failedMain).toBe(60);
    expect(SCORE_WEIGHTS.alert).toBe(40);
    expect(SCORE_WEIGHTS.pr).toBe(15);

    expect(scoreOf({ criticalAlert: true, failedMain: true, alerts: 0, prs: 0 })).toBe(160);
    expect(scoreOf({ criticalAlert: false, failedMain: false, alerts: 1, prs: 7 })).toBe(145);
    expect(scoreOf({ criticalAlert: true, failedMain: false, alerts: 2, prs: 3 })).toBe(225);
    expect(scoreOf({ criticalAlert: false, failedMain: false, alerts: 0, prs: 0 })).toBe(0);
  });

  it("never subtracts for negative counts", () => {
    expect(scoreOf({ criticalAlert: false, failedMain: false, alerts: -3, prs: -2 })).toBe(0);
  });

  it("separates the status bands at 40 and 100", () => {
    expect(SCORE_THRESHOLDS).toEqual({ critical: 100, warning: 40 });
    expect(statusOf(160)).toBe("critical");
    expect(statusOf(100)).toBe("critical");
    expect(statusOf(99)).toBe("warning");
    expect(statusOf(40)).toBe("warning");
    expect(statusOf(39)).toBe("healthy");
    expect(statusOf(0)).toBe("healthy");
  });

  it("scales the bar to the highest reachable combination", () => {
    // 100 (critical alert) + 60 (failed main) + 5 × 40 (alerts) + 12 × 15 (PRs).
    expect(SCORE_BAR_MAX).toBe(540);
    expect(SCORE_BAR_MAX).toBe(
      scoreOf({ criticalAlert: true, failedMain: true, alerts: 5, prs: 12 }),
    );
  });
});

describe("sample fleet", () => {
  it("ships seven repositories", () => {
    expect(PROMO_FLEET).toHaveLength(7);
  });

  it("guards an index outside the fleet instead of throwing", () => {
    expect(fleetRepoAt(0).name).toBe("checkout-api");
    for (const index of [-1, 7, 99]) {
      const repo = fleetRepoAt(index);
      expect(repo.name).toBe("");
      expect(repo.score).toBe(0);
    }
  });

  it("keeps every score consistent with its alerts and pull requests", () => {
    for (const repo of PROMO_FLEET) {
      const expected = scoreOf({ criticalAlert: false, failedMain: false, alerts: repo.alerts, prs: repo.prs });
      expect(repo.score, repo.name).toBe(expected);
    }
  });

  it("has a top repo that fills the pressure field", () => {
    const top = Math.max(...PROMO_FLEET.map((repo) => repo.score));
    expect(top).toBe(FIELD_SCORE_SCALE);
  });

  it("places every repo inside the chart", () => {
    for (const repo of PROMO_FLEET) {
      expect(repo.at[0], repo.name).toBeGreaterThanOrEqual(0);
      expect(repo.at[0], repo.name).toBeLessThanOrEqual(1);
      expect(repo.at[1], repo.name).toBeGreaterThanOrEqual(0);
      expect(repo.at[1], repo.name).toBeLessThanOrEqual(1);
    }
  });
});
