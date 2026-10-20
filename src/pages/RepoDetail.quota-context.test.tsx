import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppProvider } from "@/contexts/AppContext";
import { PublicRuntimeProvider } from "@/contexts/PublicRuntimeProvider";
import { contextFromSnapshotDetail, evaluateRepositoryHealth } from "@/health";
import type { AccountQuotaSnapshot, QuotaFamily } from "@/quotas";
import { createRepoDetail } from "@/test/factories";
import RepoDetail from "./RepoDetail";
import PublicRepoDetail from "./public/PublicRepoDetail";

/**
 * The quota band is a property of the authenticated runtime, not of the data:
 * the local detail may read the account quotas the user already loaded, while
 * the public detail must never ask for them. The score rendered by each page is
 * the observable difference, so the wiring is proved end to end instead of by
 * asserting that a builder returns the argument it received.
 */

vi.mock("@/hooks/useGitHub", () => ({
  useRepoSnapshot: vi.fn(),
  useAccountQuotas: vi.fn(),
}));

vi.mock("@/hooks/useGitHubPublic", () => ({
  usePublicRepoSnapshot: vi.fn(),
}));

const detail = createRepoDetail();
/** Score of the same detail with no quota input; the penalty is the delta from it. */
const baseScore = evaluateRepositoryHealth(contextFromSnapshotDetail(detail)).score;

/** Monthly family at 95% of its limit: the critical band, worth 10 points. */
function criticalQuotaFamilies(): QuotaFamily[] {
  return [
    {
      id: "actionsMinutes",
      used: 1900,
      limit: 2000,
      unit: "minutes",
      resetAt: null,
      origin: "billing",
      monthly: true,
    },
  ];
}

function quotaSnapshot(): AccountQuotaSnapshot {
  return {
    fetchedAt: "2026-10-20T12:00:00.000Z",
    login: "mafhper",
    billing: "enhanced",
    families: criticalQuotaFamilies(),
    repos: [],
    repoProbe: { probed: 0, requested: 0 },
    foreignOwners: [],
    foreignRepoCount: 0,
  };
}

function pageShell(children: ReactNode, publicRuntime = false) {
  const tree = (
    <QueryClientProvider client={new QueryClient()}>
      <AppProvider>
        <MemoryRouter initialEntries={["/app/repo/mafhper/push_"]}>
          <Routes>
            <Route path="/app/repo/:owner/:repo" element={children} />
          </Routes>
        </MemoryRouter>
      </AppProvider>
    </QueryClientProvider>
  );

  return publicRuntime ? <PublicRuntimeProvider>{tree}</PublicRuntimeProvider> : tree;
}

async function renderLocalDetail(quota: AccountQuotaSnapshot | undefined) {
  const hooks = await import("@/hooks/useGitHub");
  vi.mocked(hooks.useRepoSnapshot).mockReturnValue({ data: detail, isLoading: false, error: null } as never);
  vi.mocked(hooks.useAccountQuotas).mockReturnValue({ data: quota } as never);

  render(pageShell(<RepoDetail />));
}

async function renderPublicDetail(quota: AccountQuotaSnapshot | undefined) {
  const publicHooks = await import("@/hooks/useGitHubPublic");
  vi.mocked(publicHooks.usePublicRepoSnapshot).mockReturnValue({ data: detail, isLoading: false, error: null } as never);

  // The quota surface exists in this runtime tree, so the public page must
  // ignore it by wiring, not by the data being absent.
  const localHooks = await import("@/hooks/useGitHub");
  vi.mocked(localHooks.useAccountQuotas).mockReturnValue({ data: quota } as never);

  render(pageShell(<PublicRepoDetail />, true));
}

describe("repository detail quota context", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deducts the quota band from the local detail score when quotas are available", async () => {
    await renderLocalDetail(quotaSnapshot());

    expect(screen.getByRole("button", { name: `Why ${baseScore - 10}?` })).toBeInTheDocument();
  });

  it("leaves the local detail score untouched while no quota snapshot is loaded", async () => {
    await renderLocalDetail(undefined);

    expect(screen.getByRole("button", { name: `Why ${baseScore}?` })).toBeInTheDocument();
  });

  it("never loads quotas nor deducts points in the public detail", async () => {
    await renderPublicDetail(quotaSnapshot());

    expect(screen.getByRole("button", { name: `Why ${baseScore}?` })).toBeInTheDocument();

    const localHooks = await import("@/hooks/useGitHub");
    expect(vi.mocked(localHooks.useAccountQuotas)).not.toHaveBeenCalled();
  });
});
