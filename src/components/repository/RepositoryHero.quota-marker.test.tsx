import { screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { RepositoryHero } from "@/components/repository/RepositoryHero";
import { contextFromSnapshotDetail, evaluateRepositoryHealth } from "@/health";
import type { QuotaFamily, QuotaPressure } from "@/quotas";
import { createRepoDetail } from "@/test/factories";
import { renderWithAppProviders } from "@/test/render-app";

/**
 * The repository tab carries the account reading in its identification block.
 *
 * The marker is the shared pill, so the band, the percentage and the
 * destination are the ones `@/quotas` already classified — the header only
 * decides that a quiet reading has nothing to say here. The steady state is
 * silence: the health and source pills already fill this row, and a fourth
 * green pill would add no decision.
 */

function family(overrides: Partial<QuotaFamily> = {}): QuotaFamily {
  return {
    id: "actionsMinutes",
    used: 850,
    limit: 1000,
    unit: "minutes",
    resetAt: null,
    origin: "billing",
    monthly: true,
    ...overrides,
  };
}

function pressure(overrides: Partial<QuotaPressure> = {}): QuotaPressure {
  return {
    source: "account",
    status: "warning",
    percent: 85,
    threshold: 80,
    alerting: [family()],
    ...overrides,
  };
}

function renderHero(quotaPressure?: QuotaPressure | null) {
  const detail = createRepoDetail();
  const report = evaluateRepositoryHealth(contextFromSnapshotDetail(detail));

  return renderWithAppProviders(
    <MemoryRouter>
      <RepositoryHero
        backLabel="Back"
        sourceLabel="Snapshot"
        sourceTone="neutral"
        healthLabel="Healthy"
        healthTone="success"
        name={detail.repo.name}
        description={detail.repo.description}
        repoUrl={detail.repo.htmlUrl}
        stars={detail.repo.stars}
        score={report.score}
        workflowSuccessRate={report.metrics.workflowSuccessRate}
        openAlerts={report.metrics.dependabotOpenCount}
        openPullRequests={0}
        criticalAlerts={report.metrics.dependabotCriticalCount}
        failedRuns7d={report.metrics.failedRuns7d}
        stalenessDays={report.metrics.stalenessDays}
        lastPushAt={detail.repo.lastPushAt}
        runs={detail.workflowRuns}
        updatedAt={detail.status.generatedAt}
        quotaPressure={quotaPressure}
      />
    </MemoryRouter>,
  );
}

function quotaMarker() {
  return screen.queryByRole("link", { name: /Account quotas/ });
}

describe("RepositoryHero quota marker", () => {
  it("marks the warning band in the identification block and links to the quota chapter", () => {
    renderHero(pressure());

    const link = quotaMarker();
    expect(link).toHaveAccessibleName("Account quotas: Near the limit · 85% used. Open quota settings.");
    expect(link).toHaveAttribute("href", "/app/settings#settings-quotas");
    expect(link).toHaveTextContent("85%");
  });

  it("marks the critical band", () => {
    renderHero(pressure({ status: "critical", percent: 95, threshold: 90 }));

    expect(quotaMarker()).toHaveAccessibleName(
      "Account quotas: Critical usage · 95% used. Open quota settings.",
    );
  });

  it("marks the exceeded band without touching the existing label", () => {
    renderHero(pressure({ status: "exceeded", percent: 120, threshold: 90 }));

    const link = quotaMarker();
    expect(link).toHaveTextContent("120%");
    expect(link).toHaveAccessibleName("Account quotas: Above the included allowance · 120% used. Open quota settings.");
  });

  it("stays absent in the normal band", () => {
    renderHero(pressure({ status: "normal", percent: 40, threshold: null, alerting: [] }));

    expect(quotaMarker()).not.toBeInTheDocument();
  });

  it("stays absent when the runtime passes no reading, which is the public runtime", () => {
    renderHero(undefined);
    expect(quotaMarker()).not.toBeInTheDocument();

    renderHero(null);
    expect(quotaMarker()).not.toBeInTheDocument();
  });

  it("carries the 360px contract: the row wraps and the pill never exceeds its slot", () => {
    renderHero(pressure());

    const link = quotaMarker()!;
    expect(link.className).toContain("max-w-full");
    expect(link.parentElement?.className).toContain("flex-wrap");
    expect(link.className).not.toMatch(/whitespace-nowrap|w-\[|min-w-\[|overflow-x-auto/);
  });
});
