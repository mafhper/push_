import { describe, expect, it } from "vitest";
import { fireEvent, screen, within } from "@testing-library/react";
import { contextFromSnapshotDetail, evaluateRepositoryHealth } from "@/health";
import { RepositoryHealthSection } from "@/components/repository/RepositoryHealthSection";
import { createRepoDetail } from "@/test/factories";
import { renderWithAppProviders } from "@/test/render-app";
import type { RepoSnapshotDetail } from "@/types";

function makeReport(overrides: Partial<RepoSnapshotDetail> = {}) {
  return evaluateRepositoryHealth(contextFromSnapshotDetail(createRepoDetail(overrides)));
}

describe("RepositoryHealthSection", () => {
  it("renders score, status and check counts in balanced mode", () => {
    const report = makeReport();
    renderWithAppProviders(<RepositoryHealthSection report={report} mode="balanced" />);

    expect(screen.getAllByText("Repository Health").length).toBeGreaterThan(0);
    expect(screen.getByText(`${report.score}`)).toBeInTheDocument();
    expect(screen.getByText(/passed/)).toBeInTheDocument();
  });

  it("renders one pill per summary bucket in balanced mode", () => {
    renderWithAppProviders(<RepositoryHealthSection report={makeReport()} mode="balanced" />);

    expect(screen.getByText(/passed/)).toBeInTheDocument();
    expect(screen.getByText(/need attention/)).toBeInTheDocument();
    expect(screen.getByText(/not verified/)).toBeInTheDocument();
  });

  it("lists checks with evidence in detailed mode", () => {
    renderWithAppProviders(<RepositoryHealthSection report={makeReport()} mode="detailed" />);

    const report = makeReport();
    const firstAttention = report.categories
      .flatMap((category) => category.checks)
      .find((check) => check.status === "warning" || check.status === "fail");

    if (firstAttention) {
      expect(screen.getAllByText(firstAttention.label).length).toBeGreaterThan(0);
    }

    expect(screen.queryAllByText(/Evidence/).length).toBeGreaterThan(0);
  });

  it("renders the audit note and expanded categories in full mode", () => {
    renderWithAppProviders(<RepositoryHealthSection report={makeReport()} mode="full" />);

    expect(screen.getByText(/Unknown checks are excluded/)).toBeInTheDocument();
    const section = screen.getAllByText("Repository Health")[0].closest("section");
    expect(section).not.toBeNull();
    expect(within(section!).getByText("Governance")).toBeInTheDocument();
  });

  it("surfaces critical alerts and failing runs regardless of score", () => {
    const report = makeReport({
      alerts: [
        {
          id: 1,
          severity: "critical",
          state: "open",
          packageName: "lodash",
          ecosystem: "npm",
          manifestPath: "package-lock.json",
          createdAt: "2026-03-18T00:00:00.000Z",
          fixedIn: null,
          htmlUrl: "https://github.com/mafhper/push_/security/dependabot/1",
          cveId: "CVE-2026-0001",
          summary: "Remote code execution",
        },
      ],
      workflowRuns: [
        {
          id: 1,
          workflowName: "CI",
          status: "completed",
          conclusion: "failure",
          branch: "main",
          event: "push",
          startedAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
          updatedAt: new Date(Date.now() - 59 * 60 * 1000).toISOString(),
          durationMs: 120000,
          htmlUrl: "https://github.com/mafhper/push_/actions/runs/1",
        },
      ],
    });
    renderWithAppProviders(<RepositoryHealthSection report={report} mode="balanced" />);

    expect(screen.getByText("Critical")).toBeInTheDocument();
    expect(screen.getByText("CI degraded")).toBeInTheDocument();
    expect(screen.getByText(/^1 critical Dependabot alert$/)).toBeInTheDocument();
    expect(screen.getByText(/^1 failing runs in the last 7 days$/)).toBeInTheDocument();
  });

  it("drills into the breakdown from balanced via the why-this-score button", () => {
    const report = makeReport();
    renderWithAppProviders(<RepositoryHealthSection report={report} mode="balanced" />);

    expect(screen.queryByText(/Evidence/)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: `Why ${report.score}?` }));
    expect(screen.getAllByText(/Evidence/).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.queryByText(/Evidence/)).toBeNull();
  });
});