import { screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { RepositoryHealthSection } from "@/components/repository/RepositoryHealthSection";
import { contextFromSnapshotDetail, evaluateRepositoryHealth } from "@/health";
import type { QuotaFamily, QuotaPressure } from "@/quotas";
import { createRepoDetail } from "@/test/factories";
import { renderWithAppProviders } from "@/test/render-app";

/**
 * The health section opens with the account quota alert line.
 *
 * It reuses the same row the fleet overview shows, plus one sentence saying the
 * reading belongs to the account: a repository page could otherwise suggest
 * that the number is scoped to this repository. The line renders nothing on a
 * quiet reading, so the section keeps its usual first line when there is
 * nothing to act on.
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

function report() {
  return evaluateRepositoryHealth(contextFromSnapshotDetail(createRepoDetail()));
}

function renderSection(quotaPressure?: QuotaPressure | null) {
  return renderWithAppProviders(
    <MemoryRouter>
      <RepositoryHealthSection report={report()} mode="balanced" quotaPressure={quotaPressure} />
    </MemoryRouter>,
  );
}

describe("RepositoryHealthSection quota alert line", () => {
  it("opens the section in the warning band, before the score heading", () => {
    renderSection(pressure());

    const line = screen.getByRole("status");
    expect(line).toHaveAttribute("aria-live", "polite");
    expect(line).toHaveTextContent("Monthly quota above the 80% threshold: Actions minutes.");
    expect(screen.getByRole("link", { name: "Review quotas" })).toHaveAttribute(
      "href",
      "/app/settings#settings-quotas",
    );

    const scoreHeading = screen.getByText(/\/ 100$/).closest("h2")!;
    expect(line.compareDocumentPosition(scoreHeading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("states that the reading is account-wide", () => {
    renderSection(pressure());

    expect(
      screen.getByText("Account-wide reading: every repository shows the same quota."),
    ).toBeInTheDocument();
  });

  it("carries the critical band", () => {
    renderSection(pressure({ status: "critical", percent: 95, threshold: 90 }));

    expect(screen.getByRole("status")).toHaveTextContent("90% threshold");
  });

  it("carries the exceeded band", () => {
    renderSection(
      pressure({ status: "exceeded", percent: 120, threshold: 90, alerting: [family({ used: 1400 })] }),
    );

    expect(screen.getByRole("status")).toHaveTextContent("90% threshold");
    expect(
      screen.getByText("Account-wide reading: every repository shows the same quota."),
    ).toBeInTheDocument();
  });

  it("stays silent in the normal band", () => {
    renderSection(pressure({ status: "normal", percent: 40, threshold: null, alerting: [] }));

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.queryByText(/Account-wide reading/)).not.toBeInTheDocument();
  });

  it("stays silent when the runtime passes no reading, which is the public runtime", () => {
    renderSection(undefined);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.queryByText(/Account-wide reading/)).not.toBeInTheDocument();

    renderSection(null);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("carries the 360px contract: the row wraps and the sentence breaks", () => {
    renderSection(pressure());

    const line = screen.getByRole("status");
    expect(line.className).toContain("flex-wrap");
    expect(line.className).not.toMatch(/whitespace-nowrap|w-\[|min-w-\[|overflow-x-auto/);
    expect(screen.getByText(/Account-wide reading/).className).toContain("break-words");
  });
});
