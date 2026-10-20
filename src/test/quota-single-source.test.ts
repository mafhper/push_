import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * One source for the quota/rate reading.
 *
 * The pill used to coexist with an orphan `RateLimitBar` that classified its
 * own bands, and the frame printed a raw `remaining/limit` string. These checks
 * fail if a surface starts deriving a percentage or a band again instead of
 * consuming what `@/quotas` classified.
 *
 * They read source text on purpose: a runtime assertion cannot see the
 * difference between "imports the engine" and "reimplements the engine".
 */

const root = path.resolve(__dirname, "../..");

function read(relative: string): string {
  return readFileSync(path.join(root, relative), "utf8");
}

function walk(dir: string): string[] {
  const absolute = path.join(root, dir);
  return readdirSync(absolute).flatMap((entry) => {
    const child = path.join(absolute, entry);
    if (statSync(child).isDirectory()) return walk(path.relative(root, child).split(path.sep).join("/"));
    return /\.(ts|tsx)$/.test(entry) ? [child] : [];
  });
}

/** Source files that render a surface, excluding tests and the engine itself. */
const surfaceFiles = walk("src").filter(
  (file) => !file.includes(".test.") && !file.endsWith("src/quotas/engine.ts") && !file.endsWith("src/quotas/pressure.ts"),
);

function relative(file: string): string {
  return path.relative(root, file).split(path.sep).join("/");
}

describe("quota presentation single source", () => {
  it("no longer ships the orphan rate bar", () => {
    expect(existsSync(path.join(root, "src/components/RateLimitBar.tsx"))).toBe(false);
  });

  it("declares the threshold table once", () => {
    const declarers = surfaceFiles
      .filter((file) => /QUOTA_THRESHOLDS\s*=/.test(read(relative(file))))
      .map(relative);

    expect(declarers).toEqual(["src/quotas/engine.ts"]);
  });

  it("does not let a surface classify a reading on its own", () => {
    const consumers = [
      "src/components/layout/StatusBar.tsx",
      "src/components/console/DashboardPanel.tsx",
      "src/components/quotas/QuotaPressure.tsx",
      "src/components/repository/RepositoryHero.tsx",
      "src/components/repository/RepositoryHealthSection.tsx",
      "src/pages/Dashboard.tsx",
      "src/pages/RepoDetail.tsx",
    ];

    for (const file of consumers) {
      const text = read(file);
      expect(text, `${file} divides the rate window itself`).not.toMatch(/remaining\s*[/+*-]/);
      expect(text, `${file} classifies a band itself`).not.toMatch(/quotaStatus\(|summarizeQuotas\(|evaluateQuota\(/);
      expect(text, `${file} applies the health penalty itself`).not.toMatch(/applyQuotaPenalty\(|quotaPenalty\(/);
      expect(text, `${file} derives the quota percentage from used/limit`).not.toMatch(/\.used\s*[/*]/);
      expect(text, `${file} reads the threshold table itself`).not.toMatch(/QUOTA_THRESHOLDS/);
    }
  });

  it("renders both repository headers from the one shared module", () => {
    // Deleting the module breaks both surfaces, and neither can drift into a
    // private copy of the pill.
    expect(read("src/components/repository/RepositoryHero.tsx")).toContain(
      'import { QuotaPressurePill } from "@/components/quotas/QuotaPressure"',
    );
    expect(read("src/components/repository/RepositoryHealthSection.tsx")).toContain(
      'import { QuotaAlertLine } from "@/components/quotas/QuotaPressure"',
    );
  });

  it("feeds the pill one interface instead of raw account or rate payloads", () => {
    const pill = read("src/components/quotas/QuotaPressure.tsx");

    expect(pill).toContain('import type { QuotaPressure, QuotaStatus } from "@/quotas"');
    expect(pill).not.toContain("AccountQuotaSnapshot");
    expect(pill).not.toContain("RateLimitInfo");
    // The threshold printed by the line comes from the reading, not from a
    // second map of 80/90 inside the surface.
    expect(pill).not.toContain("QUOTA_THRESHOLDS");
  });

  it("keeps both readings on the same helpers in the frame", () => {
    const bar = read("src/components/layout/StatusBar.tsx");

    expect(bar).toContain("import { accountPressure, rateLimitPressure } from '@/quotas'");
    expect(bar).toContain("accountPressure(quotaSnapshot?.families) ?? rateLimitPressure(rateLimit)");
  });
});
