import { screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { QuotaAlertLine, QuotaPressurePill } from "./QuotaPressure";
import type { QuotaFamily, QuotaPressure } from "@/quotas";
import { renderWithAppProviders } from "@/test/render-app";

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

function renderPill(value: QuotaPressure) {
  return renderWithAppProviders(
    <MemoryRouter>
      <QuotaPressurePill pressure={value} />
    </MemoryRouter>,
  );
}

function renderLine(value: QuotaPressure | null) {
  return renderWithAppProviders(
    <MemoryRouter>
      <QuotaAlertLine pressure={value} />
    </MemoryRouter>,
  );
}

describe("QuotaPressurePill", () => {
  it("shows the percentage under one accessible sentence and links to the quota chapter", () => {
    renderPill(pressure());

    const link = screen.getByRole("link", {
      name: "Account quotas: Near the limit · 85% used. Open quota settings.",
    });

    expect(link).toHaveAttribute("href", "/app/settings#settings-quotas");
    expect(link).toHaveTextContent("Quotas");
    expect(link).toHaveTextContent("85%");
  });

  it("keeps the displayed percentage inside its own band", () => {
    renderPill(pressure({ status: "normal", percent: 79.9, threshold: null, alerting: [] }));

    expect(screen.getByText("79%")).toBeInTheDocument();
    expect(screen.queryByText("80%")).not.toBeInTheDocument();
  });

  it("renders the API window as information, without a link", () => {
    renderPill(pressure({ source: "rateLimit", status: "critical", percent: 92, threshold: 90, alerting: [] }));

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.getByText("API rate limit: Critical usage · 92% used.")).toHaveTextContent(
      "API rate limit: Critical usage · 92% used.",
    );
    expect(screen.getByText("92%")).toBeInTheDocument();
  });

  it("carries the mobile contract: never wider than its slot, label truncates", () => {
    renderPill(pressure());

    const link = screen.getByRole("link");
    expect(link.className).toContain("max-w-full");
    expect(screen.getByText("Quotas").className).toContain("truncate");
    // 360px has no room for a fixed width or a non-breaking label.
    expect(link.className).not.toMatch(/whitespace-nowrap|w-\[|min-w-\[/);
    expect(link.className).not.toContain("overflow-x-auto");
  });
});

describe("QuotaAlertLine", () => {
  it("stays absent in the normal band", () => {
    renderLine(pressure({ status: "normal", percent: 40, threshold: null, alerting: [] }));

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.queryByText(/Monthly quota above/)).not.toBeInTheDocument();
  });

  it("stays absent when nothing comparable was read", () => {
    renderLine(null);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();

    renderLine(pressure({ status: "unknown", percent: 0, threshold: null, alerting: [] }));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("announces the warning band with the 80% threshold and the offending family", () => {
    renderLine(pressure());

    const line = screen.getByRole("status");
    expect(line).toHaveAttribute("aria-live", "polite");
    expect(line).toHaveTextContent("GitHub quota near its limit");
    expect(line).toHaveTextContent("Monthly quota above the 80% threshold: Actions minutes.");
    expect(screen.getByRole("link", { name: "Review quotas" })).toHaveAttribute(
      "href",
      "/app/settings#settings-quotas",
    );
  });

  it("moves the threshold to 90% in the critical band", () => {
    renderLine(pressure({ status: "critical", percent: 95, threshold: 90 }));

    expect(screen.getByRole("status")).toHaveTextContent("90% threshold");
  });

  it("keeps the 90% threshold when the quota is already exceeded", () => {
    renderLine(
      pressure({ status: "exceeded", percent: 120, threshold: 90, alerting: [family({ used: 1400 })] }),
    );

    expect(screen.getByRole("status")).toHaveTextContent("90% threshold");
  });

  it("names every family in the alert band", () => {
    renderLine(
      pressure({
        alerting: [family(), family({ id: "sharedStorage", used: 950, unit: "mb" })],
      }),
    );

    expect(screen.getByRole("status")).toHaveTextContent("Actions minutes, Shared storage");
  });

  it("carries the mobile contract: wraps instead of scrolling", () => {
    renderLine(pressure());

    const line = screen.getByRole("status");
    expect(line.className).toContain("flex-wrap");
    expect(screen.getByText(/Monthly quota above/).closest("p")?.className).toContain("break-words");
    expect(line.className).not.toMatch(/whitespace-nowrap|w-\[|min-w-\[|overflow-x-auto/);
  });
});
