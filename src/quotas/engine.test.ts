import { describe, expect, it } from "vitest";
import {
  FREE_PLAN_LIMITS,
  QUOTA_THRESHOLDS,
  compareReposByUsage,
  daysUntil,
  evaluateQuota,
  foreignRepoOwners,
  foreignRepos,
  isMixedAccount,
  isQuotaAlert,
  quotaPercent,
  quotaStatus,
  repoStorageMb,
  sortQuotaRepos,
  summarizeQuotas,
} from "./engine";
import type { QuotaFamily, RepoQuotaUsage } from "./types";

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

describe("per-repository order (PU15 — storage first, never the sum on screen)", () => {
  function repo(fullName: string, cacheMb: number | null, artifactsMb: number | null, actionsMinutes: number | null): RepoQuotaUsage {
    return { fullName, cacheMb, cacheCount: null, artifactsMb, actionsMinutes };
  }

  it("sums cache and artifacts as a rank key and treats a missing reading as unknown", () => {
    expect(repoStorageMb(repo("a/x", 1536, 64, 10))).toBe(1600);
    expect(repoStorageMb(repo("a/y", 0, 0, 10))).toBe(0);
    expect(repoStorageMb(repo("a/z", null, null, 10))).toBeNull();
    // One known inventory still ranks; the missing one does not become zero by accident.
    expect(repoStorageMb(repo("a/w", 512, null, 10))).toBe(512);
  });

  it("orders by storage, then minutes descending, then name ascending", () => {
    const ordered = sortQuotaRepos([
      repo("zeta/small", 100, 0, 999),
      repo("alpha/big", 2048, 0, 1),
      repo("beta/tie", 512, 512, 4),
      repo("delta/tie", 0, 1024, 10),
      repo("gamma/only-minutes", null, null, 500),
      repo("omega/nothing", null, null, null),
    ], "usage");

    expect(ordered.map((entry) => entry.fullName)).toEqual([
      "alpha/big",
      "delta/tie",
      "beta/tie",
      "zeta/small",
      "gamma/only-minutes",
      "omega/nothing",
    ]);
  });

  it("breaks a complete tie on the repository name so the order never flickers", () => {
    const left = repo("acme/same", 900, 0, 7);
    const right = repo("acme/other", 900, 0, 7);
    expect(compareReposByUsage(left, right)).toBeGreaterThan(0);
    expect(compareReposByUsage(right, left)).toBeLessThan(0);
  });

  it("switches to plain alphabetical order without touching the input array", () => {
    const input = [repo("zeta/small", 100, 0, 999), repo("alpha/big", 2048, 0, 1)];
    const ordered = sortQuotaRepos(input, "name");

    expect(ordered.map((entry) => entry.fullName)).toEqual(["alpha/big", "zeta/small"]);
    expect(input.map((entry) => entry.fullName)).toEqual(["zeta/small", "alpha/big"]);
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
