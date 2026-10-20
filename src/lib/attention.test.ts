import { describe, expect, it } from "vitest";
import {
  ATTENTION_ALERT_CAP_MAX,
  ATTENTION_BANDS,
  calculateAttention,
  clampAlertCap,
  normalizeAttentionSettings,
  previewAttention,
  sortReposByAttention,
} from "./attention";
import { createOverview } from "@/test/factories";
import type { OverviewRepoSnapshot, RepoHealth } from "@/types";

type HealthOverrides = Partial<RepoHealth>;

/**
 * One overview row with explicit metrics. The health score is irrelevant to
 * the queue, so it stays at a fixed value and the assertions read the metrics.
 */
function row(
  name: string,
  health: HealthOverrides = {},
  stats: Partial<OverviewRepoSnapshot["stats"]> = {},
  archived = false,
): OverviewRepoSnapshot {
  const base = createOverview().repos[0];
  return {
    ...base,
    repo: {
      ...base.repo,
      id: name.length * 101,
      name,
      fullName: `acme/${name}`,
      archived,
    },
    health: {
      ...base.health,
      score: 100,
      status: "healthy",
      workflowSuccessRate: 100,
      failedRuns7d: 0,
      dependabotOpenCount: 0,
      dependabotCriticalCount: 0,
      stalenessDays: 0,
      ...health,
    },
    stats: { ...base.stats, openPullRequestCount: 0, ...stats },
  };
}

describe("attention: pure report", () => {
  it("keeps the operating-console weights: 100 per critical, 40 per alert, 60 for failing CI, 15 per PR, 2 per stale day", () => {
    const repo = row("baseline", {
      dependabotCriticalCount: 1,
      dependabotOpenCount: 3,
      status: "critical",
      failedRuns7d: 2,
      stalenessDays: 10,
    }, { openPullRequestCount: 1 });

    // 100 + 2 other alerts × 40 + 60 + 15 + 10 days × 2
    expect(calculateAttention(repo).score).toBe(275);
  });

  it("does not apply an emphasis preference when the caller passes none", () => {
    const repo = row("many-alerts", { dependabotOpenCount: 7 });

    // Seven open alerts are seven charges in the pure model.
    expect(calculateAttention(repo).score).toBe(7 * 40);
    expect(sortReposByAttention([repo])[0].attentionScore).toBe(7 * 40);
  });

  it("labels signals from the repository facts, not from the preference", () => {
    const repo = row("critical", { dependabotCriticalCount: 2, dependabotOpenCount: 3 });
    const [scored] = sortReposByAttention([repo], { criticalAlerts: false, failedRuns: true, alertCap: 0 });

    // The score no longer charges the criticals apart, but the row still says
    // what is open — the signal list is not a scoring artefact.
    expect(scored.signals.map((signal) => signal.label)).toContain("2 critical CVEs");
    expect(scored.signals.map((signal) => signal.label)).toContain("1 alert");
  });

  it("guards the signal arithmetic so the label agrees with the charge", () => {
    // A snapshot written by an older sync can carry open alerts without the
    // critical counter. The score already reads the absence as zero; without
    // the same guard the subtraction produced NaN and the row was charged 200
    // while listing no alert at all.
    const repo = row("partial", { dependabotOpenCount: 5, dependabotCriticalCount: undefined });

    const [scored] = sortReposByAttention([repo], { criticalAlerts: true, failedRuns: true, alertCap: 5 });
    expect(scored.attentionScore).toBe(200);
    expect(scored.signals.map((signal) => signal.label)).toEqual(["5 alerts"]);
  });
});

describe("attention: emphasis preferences", () => {
  it("charges criticals apart and caps only the ordinary alerts", () => {
    const repo = row("critical-plus-alerts", { dependabotCriticalCount: 2, dependabotOpenCount: 9 });

    // 2 criticals × 100 + 5 capped ordinary alerts × 40
    expect(sortReposByAttention([repo], { criticalAlerts: true, failedRuns: true, alertCap: ATTENTION_ALERT_CAP_MAX })[0].attentionScore)
      .toBe(400);
  });

  it("folds criticals into the capped pool when the critical emphasis is off", () => {
    const repo = row("critical-plus-alerts", { dependabotCriticalCount: 2, dependabotOpenCount: 9 });

    // Nine open alerts, cap 5: 5 × 40, criticals included.
    expect(sortReposByAttention([repo], { criticalAlerts: false, failedRuns: true, alertCap: 5 })[0].attentionScore)
      .toBe(200);
  });

  it("honours a cap of zero and a cap of five", () => {
    const repo = row("alerts", { dependabotOpenCount: 4 });

    expect(sortReposByAttention([repo], { criticalAlerts: true, failedRuns: true, alertCap: 0 })[0].attentionScore).toBe(0);
    expect(sortReposByAttention([repo], { criticalAlerts: true, failedRuns: true, alertCap: 3 })[0].attentionScore).toBe(120);
    expect(sortReposByAttention([repo], { criticalAlerts: true, failedRuns: true, alertCap: 5 })[0].attentionScore).toBe(160);
  });

  it("charges recent failures even when the repository is not in the critical band", () => {
    const repo = row("failing", { status: "warning", failedRuns7d: 3, workflowSuccessRate: 100 });

    // The pure model only charges CI inside a critical repository; the
    // preference is about the signal itself.
    expect(calculateAttention(repo).score).toBe(0);
    expect(sortReposByAttention([repo], { criticalAlerts: true, failedRuns: true, alertCap: 5 })[0].attentionScore).toBe(60);
  });

  it("drops the CI charge when the failed-runs emphasis is off", () => {
    const repo = row("failing", { status: "critical", failedRuns7d: 4, workflowSuccessRate: 40 });

    expect(sortReposByAttention([repo], { criticalAlerts: true, failedRuns: false, alertCap: 5 })[0].attentionScore).toBe(0);
    // With the emphasis on: 60 for the failures + 20 for a rate 40 points below the pass line.
    expect(sortReposByAttention([repo], { criticalAlerts: true, failedRuns: true, alertCap: 5 })[0].attentionScore).toBe(80);
  });

  it("honours the honest zero of critical emphasis off with a cap of zero", () => {
    const repo = row("criticals", { dependabotCriticalCount: 2, dependabotOpenCount: 2 });

    const [scored] = sortReposByAttention([repo], { criticalAlerts: false, failedRuns: true, alertCap: 0 });
    // Two explicit requests - no critical emphasis, no open alert counted - are
    // taken literally: the pool is capped at zero instead of keeping a hidden
    // floor of one alert.
    expect(scored.attentionScore).toBe(0);
    // The charge is gone; the row still says what is open.
    expect(scored.signals.map((signal) => signal.label)).toEqual(["2 critical CVEs"]);
  });

  it("reports the success-rate pressure so a charged row has a visible reason", () => {
    const repo = row("slow-pipeline", { workflowSuccessRate: 60 });

    const charged = sortReposByAttention([repo], { criticalAlerts: true, failedRuns: true, alertCap: 5 })[0];
    expect(charged.attentionScore).toBe(10);
    expect(charged.signals).toContainEqual({ kind: "workflow", severity: "info", label: "CI 60%" });

    // Signals describe the row: with the emphasis off the charge is gone and
    // the label stays.
    const muted = sortReposByAttention([repo], { criticalAlerts: true, failedRuns: false, alertCap: 5 })[0];
    expect(muted.attentionScore).toBe(0);
    expect(muted.signals).toContainEqual({ kind: "workflow", severity: "info", label: "CI 60%" });

    // At the pass line there is no pressure, so there is nothing to report.
    const atPass = row("at-pass", { workflowSuccessRate: 80 });
    expect(sortReposByAttention([atPass], { criticalAlerts: true, failedRuns: true, alertCap: 5 })[0].signals).toEqual([]);
  });

  it("scales the success-rate pressure from the 80% pass line to zero percent", () => {
    const atPass = row("at-pass", { workflowSuccessRate: 80 });
    const atSixty = row("at-sixty", { workflowSuccessRate: 60 });
    const atZero = row("at-zero", { workflowSuccessRate: 0 });

    const settings = { criticalAlerts: true, failedRuns: true, alertCap: 5 };
    expect(sortReposByAttention([atPass], settings)[0].attentionScore).toBe(0);
    expect(sortReposByAttention([atSixty], settings)[0].attentionScore).toBe(10);
    expect(sortReposByAttention([atZero], settings)[0].attentionScore).toBe(40);
  });

  it("keeps archived repositories behind every live one", () => {
    const archived = row("old", { dependabotCriticalCount: 3 }, {}, true);
    const live = row("live", { dependabotOpenCount: 1 });

    const order = sortReposByAttention([archived, live], { criticalAlerts: true, failedRuns: true, alertCap: 5 });
    expect(order.map((entry) => entry.repo.name)).toEqual(["live", "old"]);
  });

  it("reorders the queue when a preference changes, without a second overlay", () => {
    const critical = row("critical", { dependabotCriticalCount: 1 });
    const noisy = row("noisy", { dependabotOpenCount: 2 });
    const settingsOn = { criticalAlerts: true, failedRuns: true, alertCap: 5 };
    const settingsOff = { criticalAlerts: false, failedRuns: true, alertCap: 5 };

    expect(sortReposByAttention([noisy, critical], settingsOn).map((entry) => entry.repo.name))
      .toEqual(["critical", "noisy"]);
    // One critical (100) against two ordinary alerts (80) when the emphasis is
    // on; folded into the ordinary pool (40) it no longer leads.
    expect(sortReposByAttention([noisy, critical], settingsOff).map((entry) => entry.repo.name))
      .toEqual(["noisy", "critical"]);
  });
});

describe("attention: preview", () => {
  it("counts each exclusive attention band", () => {
    const critical = row("critical", { dependabotCriticalCount: 1 });
    const warning = row("warning", { dependabotOpenCount: 1 });
    const quiet = row("quiet");
    const archived = row("archived", { dependabotCriticalCount: 1 }, {}, true);

    expect(previewAttention([critical, warning, quiet, archived])).toEqual({ critical: 1, warning: 1 });
    expect(ATTENTION_BANDS).toEqual({ critical: 100, warning: 40 });
  });

  it("follows the emphasis it is given", () => {
    const critical = row("critical", { dependabotCriticalCount: 1 });
    const warning = row("warning", { dependabotOpenCount: 1 });

    expect(previewAttention([critical, warning], { criticalAlerts: false, failedRuns: true, alertCap: 5 }))
      .toEqual({ critical: 0, warning: 2 });
  });
});

describe("attention: normalization", () => {
  it("reads absence as the default emphasis", () => {
    expect(normalizeAttentionSettings(undefined)).toEqual({
      criticalAlerts: true,
      failedRuns: true,
      alertCap: ATTENTION_ALERT_CAP_MAX,
    });
    expect(normalizeAttentionSettings({})).toEqual({
      criticalAlerts: true,
      failedRuns: true,
      alertCap: ATTENTION_ALERT_CAP_MAX,
    });
  });

  it("clamps a persisted cap and refuses non-numeric values", () => {
    expect(clampAlertCap(3)).toBe(3);
    expect(clampAlertCap(2.6)).toBe(3);
    expect(clampAlertCap(-4)).toBe(0);
    expect(clampAlertCap(99)).toBe(ATTENTION_ALERT_CAP_MAX);
    expect(clampAlertCap("4")).toBe(ATTENTION_ALERT_CAP_MAX);
    expect(clampAlertCap(Number.NaN)).toBe(ATTENTION_ALERT_CAP_MAX);
  });

  it("keeps booleans only when they are booleans", () => {
    expect(normalizeAttentionSettings({ criticalAlerts: false, failedRuns: false, alertCap: 0 })).toEqual({
      criticalAlerts: false,
      failedRuns: false,
      alertCap: 0,
    });
    expect(normalizeAttentionSettings({ criticalAlerts: "no", failedRuns: 1, alertCap: 5 })).toEqual({
      criticalAlerts: true,
      failedRuns: true,
      alertCap: 5,
    });
  });
});
