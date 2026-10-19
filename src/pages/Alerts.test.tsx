import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { AppProvider } from "@/contexts/AppContext";
import type { AccountQuotaSnapshot } from "@/quotas";
import { createOverview, createRepoDetail } from "@/test/factories";
import AlertsPage from "./Alerts";

vi.mock("@/hooks/useGitHub", () => ({
  useDashboardSnapshot: vi.fn(),
  useRepoSnapshot: vi.fn(),
  useAccountQuotas: vi.fn(),
}));

function createQuotaSnapshot(used: number): AccountQuotaSnapshot {
  return {
    fetchedAt: "2026-10-19T12:00:00.000Z",
    login: "betafunda",
    billing: "enhanced",
    families: [
      {
        id: "actionsMinutes",
        used,
        limit: 2000,
        unit: "minutes",
        resetAt: null,
        origin: "billing",
        monthly: true,
      },
    ],
    repos: [],
    repoProbe: { probed: 0, requested: 0 },
    foreignOwners: [],
    foreignRepoCount: 0,
  };
}

async function renderAlerts(quota: AccountQuotaSnapshot) {
  const hooks = await import("@/hooks/useGitHub");
  vi.mocked(hooks.useDashboardSnapshot).mockReturnValue({ data: createOverview(), isLoading: false, error: null } as never);
  vi.mocked(hooks.useRepoSnapshot).mockReturnValue({ data: createRepoDetail() } as never);
  vi.mocked(hooks.useAccountQuotas).mockReturnValue({ data: quota } as never);

  render(
    <QueryClientProvider client={new QueryClient()}>
      <AppProvider>
        <MemoryRouter>
          <AlertsPage />
        </MemoryRouter>
      </AppProvider>
    </QueryClientProvider>,
  );
}

describe("AlertsPage — quota banner", () => {
  it("shows the quota banner with a link to the settings section above the 80% threshold", async () => {
    await renderAlerts(createQuotaSnapshot(1800));

    expect(screen.getByText("GitHub quota near its limit")).toBeInTheDocument();
    expect(screen.getByText("Monthly quota above the 80% threshold: Actions minutes.")).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /review quotas/i });
    expect(link).toHaveAttribute("href", "/app/settings#settings-quotas");
  });

  it("stays out of the page while every monthly quota is below the threshold", async () => {
    await renderAlerts(createQuotaSnapshot(1000));

    expect(screen.queryByText("GitHub quota near its limit")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /review quotas/i })).not.toBeInTheDocument();
  });
});
