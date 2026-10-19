import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchAccountQuotas } from "./github-quotas";

type Handler = (url: string) => {
  status?: number;
  body?: unknown;
  headers?: Record<string, string>;
} | Promise<never>;

function stubFetch(handler: Handler) {
  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
    const result = await handler(String(input));
    const status = result.status ?? 200;
    return {
      ok: status >= 200 && status < 300,
      status,
      headers: {
        get: (name: string) => result.headers?.[name.toLowerCase()] ?? null,
      },
      json: async () => result.body,
    };
  }));
}

function route(handler: Handler) {
  return (url: string) => {
    if (/\/user$/.test(url)) return handler(url);
    if (url.includes("/settings/billing/usage")) return handler(url);
    if (url.includes("/settings/billing/shared-storage")) return handler(url);
    if (url.includes("/settings/billing/actions")) return handler(url);
    if (url.includes("/settings/billing/packages")) return handler(url);
    if (url.includes("/actions/cache/usage")) return handler(url);
    if (url.includes("/actions/artifacts")) return handler(url);
    return { status: 404 };
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchAccountQuotas — enhanced billing platform", () => {
  it("maps every family, applies the plan limits and joins per-repository usage", async () => {
    stubFetch(route((url) => {
      if (url.includes("/settings/billing/usage")) {
        return {
          body: {
            usageItems: [
              { product: "Actions", sku: "Actions Linux", quantity: 1200, unitType: "minutes", repositoryName: "site" },
              { product: "Actions", sku: "Actions Linux", quantity: 500, unitType: "minutes", repositoryName: "betafunda/api" },
              { product: "Actions", sku: "Actions macOS", quantity: 100, unitType: "minutes", repositoryName: null },
              { product: "Actions", sku: "Actions storage", quantity: 0.25, unitType: "gigabytes" },
              { product: "Packages", sku: "Packages storage", quantity: 0.1, unitType: "gigabytes", repositoryName: "betafunda/site" },
            ],
          },
        };
      }
      if (url.includes("/settings/billing/shared-storage")) return { status: 404 };
      if (url.includes("/repos/betafunda/site/actions/cache/usage")) {
        return { body: { active_caches_size_in_bytes: 512 * 1024 * 1024, active_caches_count: 3 } };
      }
      if (url.includes("/repos/betafunda/site/actions/artifacts")) {
        return {
          body: {
            artifacts: [
              { size_in_bytes: 1024 * 1024, expired: false },
              { size_in_bytes: 2 * 1024 * 1024, expired: false },
              { size_in_bytes: 9 * 1024 * 1024, expired: true },
            ],
          },
        };
      }
      return { status: 404 };
    }));

    const snapshot = await fetchAccountQuotas("token", "betafunda", ["betafunda/site", "betafunda/api"]);

    expect(snapshot.billing).toBe("enhanced");
    expect(snapshot.login).toBe("betafunda");
    expect(snapshot.repoProbe).toEqual({ probed: 2, requested: 2 });

    const minutes = snapshot.families.find((family) => family.id === "actionsMinutes");
    expect(minutes).toMatchObject({ used: 1800, limit: 2000, unit: "minutes", origin: "billing", monthly: true });

    const actionsStorage = snapshot.families.find((family) => family.id === "actionsStorage");
    expect(actionsStorage).toMatchObject({ used: 256, limit: 500, unit: "mb" });

    const packages = snapshot.families.find((family) => family.id === "packages");
    expect(packages?.unit).toBe("mb");
    expect(packages?.limit).toBeNull();
    expect(packages?.used).toBeCloseTo(102.4, 5);

    // A bare repository name is resolved against the probed repositories, and
    // the cache/artifact inventory joins the billing minutes in one row.
    const site = snapshot.repos.find((repo) => repo.fullName === "betafunda/site");
    expect(site).toMatchObject({ cacheMb: 512, cacheCount: 3, artifactsMb: 3, actionsMinutes: 1200 });

    const api = snapshot.repos.find((repo) => repo.fullName === "betafunda/api");
    expect(api).toMatchObject({ cacheMb: null, artifactsMb: null, actionsMinutes: 500 });
  });

  it("reports zero minutes when a working usage endpoint returns no items", async () => {
    stubFetch(route((url) => {
      if (url.includes("/settings/billing/usage")) return { body: { usageItems: [] } };
      return { status: 404 };
    }));

    const snapshot = await fetchAccountQuotas("token", "betafunda", []);

    expect(snapshot.billing).toBe("enhanced");
    expect(snapshot.families).toEqual([
      {
        id: "actionsMinutes",
        used: 0,
        limit: 2000,
        unit: "minutes",
        resetAt: null,
        origin: "billing",
        monthly: true,
      },
    ]);
  });

  it("does not apply the Free reference ceiling to a paid plan", async () => {
    stubFetch(route((url) => {
      if (/\/user$/.test(url)) return { body: { plan: { name: "pro" } } };
      if (url.includes("/settings/billing/usage")) {
        return { body: { usageItems: [{ product: "Actions", quantity: 2400, unitType: "minutes" }] } };
      }
      return { status: 404 };
    }));

    const snapshot = await fetchAccountQuotas("token", "betafunda", []);

    const minutes = snapshot.families.find((family) => family.id === "actionsMinutes");
    expect(minutes?.used).toBe(2400);
    // 2,400 against an invented 2,000 would look "exceeded". The paid plan's
    // own ceiling is unknown, so no limit is stated.
    expect(minutes?.limit).toBeNull();
  });

  it("follows the Link header of the usage report instead of guessing page numbers", async () => {
    stubFetch(route((url) => {
      if (url.includes("/settings/billing/usage") && url.includes("page=2")) {
        return { body: { usageItems: [{ product: "Actions", quantity: 300, unitType: "minutes" }] } };
      }
      if (url.includes("/settings/billing/usage")) {
        return {
          body: { usageItems: [{ product: "Actions", quantity: 500, unitType: "minutes" }] },
          headers: {
            link: '<https://api.github.com/users/betafunda/settings/billing/usage?page=2>; rel="next"',
          },
        };
      }
      return { status: 404 };
    }));

    const snapshot = await fetchAccountQuotas("token", "betafunda", []);

    const minutes = snapshot.families.find((family) => family.id === "actionsMinutes");
    // 500 from the first page + 300 from the linked page, never duplicated.
    expect(minutes?.used).toBe(800);
  });
});

describe("fetchAccountQuotas — degraded states", () => {
  it("falls back to legacy endpoints and keeps their own included amounts", async () => {
    stubFetch(route((url) => {
      if (url.includes("/settings/billing/usage")) return { status: 403 };
      if (url.includes("/settings/billing/shared-storage")) {
        return { body: { days_left_in_billing_cycle: 10, estimated_storage_for_month: 1 } };
      }
      if (url.includes("/settings/billing/actions")) {
        return { body: { total_minutes_used: 2100, included_minutes: 2000 } };
      }
      if (url.includes("/settings/billing/packages")) return { status: 403 };
      return { status: 404 };
    }));

    const snapshot = await fetchAccountQuotas("token", "betafunda", ["betafunda/push_"]);

    expect(snapshot.billing).toBe("legacy");
    expect(snapshot.billingMessage).toBeUndefined();

    const minutes = snapshot.families.find((family) => family.id === "actionsMinutes");
    expect(minutes).toMatchObject({ used: 2100, limit: 2000, origin: "legacy" });

    const storage = snapshot.families.find((family) => family.id === "sharedStorage");
    expect(storage).toMatchObject({ used: 1024, limit: 500, unit: "mb", origin: "legacy" });
    expect(storage?.resetAt).toBeTruthy();

    // Packages did not answer, so no invented family or limit.
    expect(snapshot.families.some((family) => family.id === "packages")).toBe(false);
    expect(snapshot.repos[0]).toMatchObject({
      fullName: "betafunda/push_",
      cacheMb: null,
      artifactsMb: null,
      actionsMinutes: null,
    });
  });

  it("reports a forbidden token with the exact endpoint and status", async () => {
    stubFetch(route(() => ({ status: 403 })));

    const snapshot = await fetchAccountQuotas("token", "betafunda", []);

    expect(snapshot.billing).toBe("forbidden");
    expect(snapshot.billingMessage).toContain("403 /users/betafunda/settings/billing/usage");
    expect(snapshot.families).toEqual([]);
  });

  it("reports a network failure as an error, not as an empty quota", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => {
      throw new Error("network down");
    }));

    const snapshot = await fetchAccountQuotas("token", "betafunda", []);

    expect(snapshot.billing).toBe("error");
    expect(snapshot.billingMessage).toContain("network down");
    expect(snapshot.billingMessage).toContain("/settings/billing/usage");
    expect(snapshot.families).toEqual([]);
  });

  it("reports an unavailable endpoint separately from a forbidden one", async () => {
    stubFetch(route(() => ({ status: 404 })));

    const snapshot = await fetchAccountQuotas("token", "betafunda", []);

    expect(snapshot.billing).toBe("unavailable");
    expect(snapshot.billingMessage).toContain("404 /users/betafunda/settings/billing/usage");
  });
});

describe("fetchAccountQuotas — mixed accounts (PU14)", () => {
  it("flags the owners of requested repositories that are not the token's account", async () => {
    stubFetch(route((url) => {
      if (url.includes("/settings/billing/usage")) return { body: { usageItems: [] } };
      return { status: 404 };
    }));

    const snapshot = await fetchAccountQuotas("token", "betafunda", [
      "mafhper/assets-hub",
      "mafhper/aurawall",
      "betafunda/push_",
    ]);

    // The rows still come from the requested selection — nothing is dropped
    // without confirmation — but the mismatch is named on the snapshot.
    expect(snapshot.login).toBe("betafunda");
    expect(snapshot.foreignOwners).toEqual(["mafhper"]);
    expect(snapshot.foreignRepoCount).toBe(2);
    expect(snapshot.repos.map((repo) => repo.fullName)).toEqual([
      "betafunda/push_",
      "mafhper/assets-hub",
      "mafhper/aurawall",
    ]);
  });

  it("keeps a selection without owner segments out of the mismatch", async () => {
    stubFetch(route(() => ({ status: 404 })));

    const snapshot = await fetchAccountQuotas("token", "", []);

    expect(snapshot.foreignOwners).toEqual([]);
  });
});
