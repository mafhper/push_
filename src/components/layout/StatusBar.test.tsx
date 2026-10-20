import { cleanup, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StatusBar } from "./StatusBar";
import { AppProvider } from "@/contexts/AppContext";
import type { AccountQuotaSnapshot, QuotaFamily } from "@/quotas";

vi.mock("@/config/site", async () => {
  const actual = await vi.importActual<typeof import("@/config/site")>("@/config/site");
  return {
    ...actual,
    isLocalSecureRuntime: vi.fn(() => true),
  };
});

vi.mock("@/hooks/useGitHub", () => ({
  useDashboardSnapshot: vi.fn(() => ({ data: null })),
  useAccountQuotas: vi.fn(() => ({ data: null })),
  useRateLimit: vi.fn(() => ({ data: null })),
}));

vi.mock("@/hooks/useGitHubPublic", () => ({
  usePublicDashboardSnapshot: vi.fn(() => ({ data: null })),
  usePublicProfileRepos: vi.fn(() => ({ data: [] })),
  usePublicRateLimit: vi.fn(() => ({ data: null })),
  usePublicSnapshotManifest: vi.fn(() => ({ data: null })),
}));

vi.mock("@/contexts/usePublicRuntime", () => ({
  usePublicRuntime: vi.fn(() => ({ mode: "snapshot", username: null })),
}));

function family(used: number): QuotaFamily {
  return {
    id: "actionsMinutes",
    used,
    limit: 1000,
    unit: "minutes",
    resetAt: null,
    origin: "billing",
    monthly: true,
  };
}

function quotaSnapshot(used: number): AccountQuotaSnapshot {
  return {
    fetchedAt: "2026-10-20T12:00:00.000Z",
    login: "mafhper",
    billing: "enhanced",
    families: [family(used)],
    repos: [],
    repoProbe: { probed: 0, requested: 0 },
    foreignOwners: [],
    foreignRepoCount: 0,
  };
}

async function mockLocalQuotas(used: number | null, rate: { remaining: number; limit: number } | null = null) {
  const hooks = await import("@/hooks/useGitHub");
  vi.mocked(hooks.useAccountQuotas).mockReturnValue({ data: used === null ? null : quotaSnapshot(used) } as never);
  vi.mocked(hooks.useRateLimit).mockReturnValue({ data: rate } as never);
}

function renderStatusBar(path: string, runtime: "local" | "public" = "local") {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <AppProvider>
        <MemoryRouter initialEntries={[path]}>
          <StatusBar runtime={runtime} />
        </MemoryRouter>
      </AppProvider>
    </QueryClientProvider>,
  );
}

describe("StatusBar", () => {
  beforeEach(async () => {
    await mockLocalQuotas(null);
  });

  it("drops its shortcuts on the settings screen and offers only the way back home", () => {
    renderStatusBar("/app/settings");

    // Search, refresh and the settings gear belong to the dashboard chrome;
    // inside settings the bar keeps only the back-home control.
    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute("href", "/app");
    expect(screen.queryByRole("link", { name: "Settings" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /search/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /refresh/i })).not.toBeInTheDocument();
  });

  it("keeps search, refresh and the settings shortcut on the other routes", () => {
    renderStatusBar("/app");

    expect(screen.getByRole("link", { name: "Settings" })).toHaveAttribute("href", "/app/settings");
    expect(screen.getByRole("button", { name: /search/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Refresh data" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Home" })).not.toBeInTheDocument();
  });

  it("shows the account quota pill in the normal band", async () => {
    await mockLocalQuotas(400);
    renderStatusBar("/app");
    expect(screen.getByRole("link", { name: /Account quotas: Within limit · 40% used/ })).toHaveTextContent("40%");
  });

  it("steps the pill aside below md, where the overview line carries the alert", async () => {
    await mockLocalQuotas(400);
    renderStatusBar("/app");

    // jsdom has no layout; the contract is the responsive class pair.
    expect(screen.getByRole("link", { name: /Account quotas/ }).className).toContain("hidden md:inline-flex");
  });

  it("hides the pill on preferences and keeps it on the dashboard with the same reading", async () => {
    await mockLocalQuotas(850);

    // Preferences carries the quota chapter itself, so the header pill would
    // only repeat the reading from one screen above it.
    renderStatusBar("/app/settings");
    expect(screen.queryByRole("link", { name: /Account quotas/ })).not.toBeInTheDocument();

    cleanup();

    renderStatusBar("/app");
    expect(screen.getByRole("link", { name: /Near the limit · 85% used/ })).toBeInTheDocument();
  });

  it("moves the pill to the warning and critical bands with the same reading", async () => {
    await mockLocalQuotas(850);
    renderStatusBar("/app");
    expect(screen.getByRole("link", { name: /Near the limit · 85% used/ })).toBeInTheDocument();
  });

  it("keeps the critical band visible", async () => {
    await mockLocalQuotas(950);
    renderStatusBar("/app");
    expect(screen.getByRole("link", { name: /Critical usage · 95% used/ })).toBeInTheDocument();
  });

  it("falls back to the API window when billing is unavailable", async () => {
    await mockLocalQuotas(null, { remaining: 500, limit: 5000 });
    renderStatusBar("/app");

    expect(screen.queryByRole("link", { name: /Account quotas/ })).not.toBeInTheDocument();
    expect(screen.getByText("API rate limit: Critical usage · 90% used.")).toBeInTheDocument();
    expect(screen.getByText("90%")).toBeInTheDocument();
  });

  it("never renders the quota pill in the public runtime", async () => {
    await mockLocalQuotas(950);
    renderStatusBar("/app", "public");

    expect(screen.queryByRole("link", { name: /Account quotas/ })).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Account quotas/)).not.toBeInTheDocument();
  });
});
