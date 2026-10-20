import { describe, expect, it } from "vitest";
import { accountPressure, quotaStatus, rateLimitPressure } from "@/quotas";
import type { QuotaFamily } from "@/quotas";

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

describe("accountPressure", () => {
  it("returns null when no monthly family has a comparable limit", () => {
    expect(accountPressure(undefined)).toBeNull();
    expect(accountPressure([])).toBeNull();
    expect(accountPressure([family({ used: 5000, limit: null })])).toBeNull();
    expect(accountPressure([family({ used: 5000, limit: 0 })])).toBeNull();
  });

  it("reports the worst band together with the highest percentage", () => {
    expect(accountPressure([family({ used: 500 })])).toMatchObject({ status: "normal", percent: 50 });
    expect(accountPressure([family({ used: 850 })])).toMatchObject({ status: "warning", percent: 85 });
    expect(accountPressure([family({ used: 950 })])).toMatchObject({ status: "critical", percent: 95 });
    expect(accountPressure([family({ used: 1200 })])).toMatchObject({ status: "exceeded", percent: 120 });
  });

  it("reports the band's lower bound for a surface that only prints it", () => {
    expect(accountPressure([family({ used: 500 })])?.threshold).toBeNull();
    expect(accountPressure([family({ used: 850 })])?.threshold).toBe(80);
    expect(accountPressure([family({ used: 950 })])?.threshold).toBe(90);
    expect(accountPressure([family({ used: 1200 })])?.threshold).toBe(90);
    expect(rateLimitPressure({ remaining: 750, limit: 5000 })?.threshold).toBe(80);
  });

  it("keeps the alerting families so the line can name them", () => {
    const pressure = accountPressure([
      family({ used: 850 }),
      family({ id: "sharedStorage", used: 950, unit: "mb" }),
      family({ id: "packages", used: 100, unit: "mb" }),
    ]);

    expect(pressure?.alerting.map((entry) => entry.id)).toEqual(["actionsMinutes", "sharedStorage"]);
  });

  it("ignores short-lived readings that are not monthly consumption", () => {
    const rateWindow = family({ used: 5000, limit: 5000, monthly: false });

    expect(accountPressure([rateWindow])).toBeNull();
  });
});

describe("rateLimitPressure", () => {
  it("reads the consumed share of the window", () => {
    expect(rateLimitPressure({ remaining: 5000, limit: 5000 })).toMatchObject({ status: "normal", percent: 0 });
    expect(rateLimitPressure({ remaining: 750, limit: 5000 })).toMatchObject({ status: "warning", percent: 85 });
    expect(rateLimitPressure({ remaining: 500, limit: 5000 })).toMatchObject({ status: "critical", percent: 90 });
  });

  it("returns null for a window without a usable limit", () => {
    expect(rateLimitPressure(undefined)).toBeNull();
    expect(rateLimitPressure({ remaining: 0, limit: 0 })).toBeNull();
  });

  it("never reports less than zero consumed", () => {
    expect(rateLimitPressure({ remaining: 5000, limit: 1000 })?.percent).toBe(0);
  });
});

describe("rate and quota share one threshold source", () => {
  it("classifies the same consumed percentage identically for both readings", () => {
    // The bands live in `quotaStatus`; neither the pill nor the alert line may
    // carry their own copy of 80/90, so the two readings must agree here.
    for (const used of [0, 50, 79.9, 80, 89.9, 90, 99.9, 100, 140]) {
      const account = accountPressure([family({ used, limit: 100 })]);
      const rate = rateLimitPressure({ remaining: 100 - used, limit: 100 });

      expect(account?.status, `${used}% account`).toBe(quotaStatus(used));
      expect(rate?.status, `${used}% rate`).toBe(account?.status);
      expect(rate?.percent).toBeCloseTo(account?.percent ?? Number.NaN);
    }
  });
});
