import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Dashboard from "./Dashboard";
import PublicDashboard from "./public/PublicDashboard";
import type { AccountQuotaSnapshot, QuotaFamily } from "@/quotas";
import { createOverview } from "@/test/factories";
import { renderWithAppProviders } from "@/test/render-app";
import type { OverviewRepoSnapshot } from "@/types";

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
    repos: Array<{ repo: { fullName: string }; health: { score: number; status: string } }>;
    quotaPressure?: { status: string } | null;
  }) => (
    <div
      data-testid="console"
      data-score={repos[0]?.health.score}
      data-status={repos[0]?.health.status}
      data-pressure={quotaPressure?.status ?? "none"}
      data-order={repos.map((entry) => entry.repo.fullName).join(",")}
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

/** One overview row with explicit alert metrics; the rest stays at zero. */
function attentionRow(name: string, critical: number, open: number): OverviewRepoSnapshot {
  const base = createOverview().repos[0];
  return {
    ...base,
    repo: { ...base.repo, id: name.length + critical, name, fullName: `acme/${name}` },
    health: {
      ...base.health,
      score: 100,
      status: "healthy",
      workflowSuccessRate: 100,
      failedRuns7d: 0,
      stalenessDays: 0,
      dependabotOpenCount: open,
      dependabotCriticalCount: critical,
    },
    stats: { ...base.stats, openPullRequestCount: 0 },
  };
}

function persistEmphasisOff() {
  window.localStorage.setItem("gl_settings", JSON.stringify({
    theme: "dark",
    lang: "en",
    attention: { criticalAlerts: false, failedRuns: true, alertCap: 5 },
  }));
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

  it("orders the local queue with the persisted emphasis", async () => {
    persistEmphasisOff();
    const hooks = await import("@/hooks/useGitHub");
    vi.mocked(hooks.useDashboardSnapshot).mockReturnValue({
      data: createOverview({ repos: [attentionRow("critical", 1, 1), attentionRow("noisy", 0, 2)] }),
      isPending: false,
      isFetching: false,
      error: null,
    } as never);

    renderWithAppProviders(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>,
    );

    // With the critical emphasis off, two ordinary alerts outrank one critical
    // in the order: the queue reads the preference, not only the pure report.
    expect(screen.getByTestId("console")).toHaveAttribute("data-order", "acme/noisy,acme/critical");
  });

  it("orders the published queue with the persisted emphasis", async () => {
    persistEmphasisOff();
    const publicHooks = await import("@/hooks/useGitHubPublic");
    vi.mocked(publicHooks.usePublicDashboardSnapshot).mockReturnValue({
      data: createOverview({ repos: [attentionRow("critical", 1, 1), attentionRow("noisy", 0, 2)] }),
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

    expect(screen.getByTestId("console")).toHaveAttribute("data-order", "acme/noisy,acme/critical");
  });
});
