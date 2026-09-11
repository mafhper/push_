import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { RepositoryHero } from "@/components/repository/RepositoryHero";
import { contextFromSnapshotDetail, evaluateRepositoryHealth } from "@/health";
import { createRepoDetail } from "@/test/factories";
import { renderWithAppProviders } from "@/test/render-app";

describe("RepositoryHero", () => {
  it("shows a freshness pill when generatedAt is provided", () => {
    const detail = createRepoDetail();
    const report = evaluateRepositoryHealth(contextFromSnapshotDetail(detail));

    renderWithAppProviders(
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
        />
      </MemoryRouter>,
    );

    expect(screen.getByText(/Updated/)).toBeInTheDocument();
  });

  it("omits the freshness pill when no generation time is available", () => {
    const detail = createRepoDetail();
    const report = evaluateRepositoryHealth(contextFromSnapshotDetail(detail));

    renderWithAppProviders(
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
        />
      </MemoryRouter>,
    );

    expect(screen.queryByText(/Updated/)).toBeNull();
  });
});