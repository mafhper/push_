import { describe, expect, it } from "vitest";
import {
  FREE_PLAN_LIMITS,
  QUOTA_THRESHOLDS,
  daysUntil,
  evaluateQuota,
  foreignRepoOwners,
  foreignRepos,
  isMixedAccount,
  isQuotaAlert,
  quotaPercent,
  quotaStatus,
  summarizeQuotas,
} from "./engine";
import type { QuotaFamily } from "./types";

function createFamily(overrides: Partial<QuotaFamily> = {}): QuotaFamily {
  return {
    id: "actionsMinutes",
    used: 0,
    limit: FREE_PLAN_LIMITS.actionsMinutes,
    unit: "minutes",
    resetAt: null,
    origin: "billing",
    monthly: true,
    ...overrides,
  };
}

describe("quota thresholds (80/90/100, approved 2026-10-19)", () => {
  it("assigns each boundary to the band that starts at it", () => {
    expect(QUOTA_THRESHOLDS).toEqual({ warning: 80, critical: 90, exceeded: 100 });
    expect(quotaStatus(0)).toBe("normal");
    expect(quotaStatus(79.99)).toBe("normal");
    expect(quotaStatus(80)).toBe("warning");
    expect(quotaStatus(89.99)).toBe("warning");
    expect(quotaStatus(90)).toBe("critical");
    expect(quotaStatus(99.99)).toBe("critical");
    expect(quotaStatus(100)).toBe("exceeded");
    expect(quotaStatus(150)).toBe("exceeded");
  });

  it("computes the percentage as used over limit", () => {
    expect(quotaPercent(1600, 2000)).toBe(80);
    expect(quotaPercent(500, 500)).toBe(100);
    expect(quotaPercent(0, 2000)).toBe(0);
  });

  it("does not invent a percentage without a comparable limit", () => {
    expect(quotaPercent(42, null)).toBeNull();
    expect(quotaPercent(42, undefined)).toBeNull();
    expect(quotaPercent(42, 0)).toBeNull();
    expect(evaluateQuota(42, null)).toEqual({ percent: null, status: "unknown" });
  });

  it("turns usage over the limit into an exceeded status", () => {
    const evaluated = evaluateQuota(512, 500);
    expect(evaluated.percent).toBeCloseTo(102.4, 5);
    expect(evaluated.status).toBe("exceeded");
  });
});

describe("summarizeQuotas", () => {
  it("reports the worst monthly family and the highest percentage", () => {
    const summary = summarizeQuotas([
      createFamily({ used: 1600 }), // 80% — warning
      createFamily({ id: "sharedStorage", used: 1024, limit: 500, unit: "mb" }), // 204.8% — exceeded
      createFamily({ id: "packages", used: 90, limit: null, unit: "mb" }), // no limit — unknown
    ]);

    expect(summary.status).toBe("exceeded");
    expect(summary.percent).toBeCloseTo(204.8, 5);
    expect(summary.alerting.map((family) => family.id)).toEqual(["actionsMinutes", "sharedStorage"]);
  });

  it("ignores non-monthly families: a full repository cache is not a billing alert", () => {
    const summary = summarizeQuotas([
      createFamily({ used: 100 }),
      createFamily({ id: "actionsStorage", used: 10 * 1024, limit: 10 * 1024, unit: "mb", monthly: false }),
    ]);

    expect(summary.status).toBe("normal");
    expect(summary.alerting).toEqual([]);
  });

  it("returns unknown when no monthly family has a limit", () => {
    expect(summarizeQuotas([])).toEqual({ status: "unknown", percent: null, alerting: [] });
    expect(summarizeQuotas([createFamily({ used: 10, limit: null })])).toEqual({
      status: "unknown",
      percent: null,
      alerting: [],
    });
  });
});

describe("isQuotaAlert", () => {
  it("only warns from the 80% band onwards", () => {
    expect(isQuotaAlert("normal")).toBe(false);
    expect(isQuotaAlert("unknown")).toBe(false);
    expect(isQuotaAlert("warning")).toBe(true);
    expect(isQuotaAlert("critical")).toBe(true);
    expect(isQuotaAlert("exceeded")).toBe(true);
  });
});

describe("daysUntil", () => {
  const now = new Date("2026-10-19T12:00:00.000Z");

  it("rounds partial days up and never goes negative", () => {
    expect(daysUntil("2026-10-21T12:00:00.000Z", now)).toBe(2);
    expect(daysUntil("2026-10-21T13:00:00.000Z", now)).toBe(3);
    expect(daysUntil("2026-10-19T12:00:00.000Z", now)).toBe(0);
    expect(daysUntil("2026-10-01T12:00:00.000Z", now)).toBe(0);
  });

  it("returns null for a missing or invalid date", () => {
    expect(daysUntil(null, now)).toBeNull();
    expect(daysUntil(undefined, now)).toBeNull();
    expect(daysUntil("not-a-date", now)).toBeNull();
  });
});

describe("foreignRepoOwners (PU14 — selection that survived a token swap)", () => {
  it("names every owner that is not the token's account, once, sorted", () => {
    expect(
      foreignRepoOwners("betafunda", [
        "mafhper/assets-hub",
        "mafhper/aurawall",
        "betafunda/push_",
        "acme/api",
        "mafhper/dinopad",
      ]),
    ).toEqual(["acme", "mafhper"]);
  });

  it("compares case-insensitively and never flags the account's own repositories", () => {
    expect(foreignRepoOwners("BetaFunda", ["betafunda/site", "BETAFUNDA/api"])).toEqual([]);
  });

  it("needs an account to compare against, and a name that carries an owner", () => {
    expect(foreignRepoOwners("", ["mafhper/assets-hub"])).toEqual([]);
    expect(foreignRepoOwners("betafunda", ["mafhper/assets-hub"])).toEqual(["mafhper"]);
    // A bare repository name names no account; the billing path can emit one.
    expect(foreignRepoOwners("betafunda", ["site"])).toEqual([]);
  });
});

describe("foreignRepos / isMixedAccount (PU14 — the selection itself)", () => {
  it("lists exactly the selected repositories owned by another account", () => {
    expect(
      foreignRepos("betafunda", [
        "mafhper/assets-hub",
        "betafunda/push_",
        "mafhper/aurawall",
        "site",
      ]),
    ).toEqual(["mafhper/assets-hub", "mafhper/aurawall"]);
  });

  it("is case-insensitive and needs an account to compare against", () => {
    expect(foreignRepos("BetaFunda", ["betafunda/site", "BETAFUNDA/api"])).toEqual([]);
    expect(foreignRepos("", ["mafhper/assets-hub"])).toEqual([]);
  });

  it("reports a mixed account only when a selected repository has another owner", () => {
    expect(isMixedAccount("betafunda", ["betafunda/site"])).toBe(false);
    expect(isMixedAccount("betafunda", ["betafunda/site", "mafhper/push_"])).toBe(true);
    // No selection and no comparable login are both "nothing to reconcile".
    expect(isMixedAccount("betafunda", [])).toBe(false);
    expect(isMixedAccount("", ["mafhper/push_"])).toBe(false);
  });
});
