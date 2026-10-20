import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Dashboard from "./Dashboard";
import PublicDashboard from "./public/PublicDashboard";
import type { AccountQuotaSnapshot, QuotaFamily } from "@/quotas";
import { createOverview } from "@/test/factories";
import { renderWithAppProviders } from "@/test/render-app";

/**
 * The overview card and the repository detail must agree under a quota band.
 *
 * The card health is produced by the service without quotas; the quota
 * supplement lives in the authenticated runtime. These tests observe what the
 * dashboard actually hands the console: the penalized score, the pressure the
 * alert line consumes, and the public runtime receiving neither.
 */

vi.mock("@/components/console/ConsoleLayout", () => ({
  ConsoleLayout: ({
    repos,
    quotaPressure,
  }: {
    repos: Array<{ health: { score: number; status: string } }>;
    quotaPressure?: { status: string } | null;
  }) => (
    <div
      data-testid="console"
      data-score={repos[0]?.health.score}
      data-status={repos[0]?.health.status}
      data-pressure={quotaPressure?.status ?? "none"}
    />
  ),
}));

vi.mock("@/hooks/useGitHub", () => ({
  useDashboardSnapshot: vi.fn(),
  useAccountQuotas: vi.fn(),
}));

vi.mock("@/hooks/useGitHubPublic", () => ({
  usePublicDashboardSnapshot: vi.fn(),
  usePublicProfileRepos: vi.fn(),
}));

vi.mock("@/contexts/usePublicRuntime", () => ({
  usePublicRuntime: vi.fn(),
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

async function mockQuotas(used: number | null) {
  const hooks = await import("@/hooks/useGitHub");
  vi.mocked(hooks.useAccountQuotas).mockReturnValue({ data: used === null ? null : quotaSnapshot(used) } as never);
}

async function mockDashboard() {
  const hooks = await import("@/hooks/useGitHub");
  vi.mocked(hooks.useDashboardSnapshot).mockReturnValue({
    data: createOverview(),
    isPending: false,
    isFetching: false,
    error: null,
  } as never);
}

beforeEach(async () => {
  await mockDashboard();
  await mockQuotas(null);
});

describe("Dashboard quota context", () => {
  it("hands the console the penalized card score and the alert pressure", async () => {
    await mockQuotas(950);

    renderWithAppProviders(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>,
    );

    const console = screen.getByTestId("console");
    expect(console).toHaveAttribute("data-score", "78"); // 88 - 10, once
    expect(console).toHaveAttribute("data-status", "healthy");
    expect(console).toHaveAttribute("data-pressure", "critical");
  });

  it("keeps the card untouched below the warning band", async () => {
    await mockQuotas(400);

    renderWithAppProviders(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>,
    );

    const console = screen.getByTestId("console");
    expect(console).toHaveAttribute("data-score", "88");
    expect(console).toHaveAttribute("data-pressure", "normal");
  });

  it("never applies quotas to the public overview, even with the reading available", async () => {
    await mockQuotas(950);
    const publicHooks = await import("@/hooks/useGitHubPublic");
    vi.mocked(publicHooks.usePublicDashboardSnapshot).mockReturnValue({
      data: createOverview(),
      isLoading: false,
      error: null,
    } as never);
    vi.mocked(publicHooks.usePublicProfileRepos).mockReturnValue({ data: [], isLoading: false, error: null } as never);
    const runtime = await import("@/contexts/usePublicRuntime");
    vi.mocked(runtime.usePublicRuntime).mockReturnValue({
      mode: "snapshot",
      username: null,
      setUsername: vi.fn(),
      clearUsername: vi.fn(),
    } as never);

    renderWithAppProviders(
      <MemoryRouter>
        <PublicDashboard />
      </MemoryRouter>,
    );

    const console = screen.getByTestId("console");
    expect(console).toHaveAttribute("data-score", "88");
    expect(console).toHaveAttribute("data-pressure", "none");

    const localHooks = await import("@/hooks/useGitHub");
    expect(vi.mocked(localHooks.useAccountQuotas)).not.toHaveBeenCalled();
  });
});
