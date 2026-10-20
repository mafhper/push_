import { screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { DashboardPanel } from "./DashboardPanel";
import type { QuotaPressure } from "@/quotas";
import { sortReposByAttention } from "@/lib/attention";
import { createOverview } from "@/test/factories";
import { renderWithAppProviders } from "@/test/render-app";

const repos = sortReposByAttention(createOverview().repos);

function pressure(overrides: Partial<QuotaPressure> = {}): QuotaPressure {
  return {
    source: "account",
    status: "warning",
    percent: 85,
    threshold: 80,
    alerting: [
      {
        id: "actionsMinutes",
        used: 850,
        limit: 1000,
        unit: "minutes",
        resetAt: null,
        origin: "billing",
        monthly: true,
      },
    ],
    ...overrides,
  };
}

function renderPanel(quotaPressure?: QuotaPressure | null) {
  return renderWithAppProviders(
    <MemoryRouter>
      <DashboardPanel repos={repos} quotaPressure={quotaPressure} />
    </MemoryRouter>,
  );
}

describe("DashboardPanel quota alert line", () => {
  it("renders the line directly under the fleet heading in the alert bands", () => {
    renderPanel(pressure());

    const line = screen.getByRole("status");
    expect(line).toHaveTextContent("Monthly quota above the 80% threshold: Actions minutes.");
    expect(screen.getByRole("heading", { name: "Fleet Overview" })).toBeInTheDocument();
    // The heading comes first in document order: the line sits under it.
    expect(
      screen.getByRole("heading", { name: "Fleet Overview" }).compareDocumentPosition(line) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("carries the critical band as well", () => {
    renderPanel(pressure({ status: "critical", percent: 95, threshold: 90 }));

    expect(screen.getByRole("status")).toHaveTextContent("90% threshold");
  });

  it("stays silent in the normal band", () => {
    renderPanel(pressure({ status: "normal", percent: 40, threshold: null, alerting: [] }));

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("stays silent when no reading is passed, which is the public runtime", () => {
    renderPanel(undefined);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();

    renderPanel(null);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
