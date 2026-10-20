import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppProvider } from "@/contexts/AppContext";
import { PublicRuntimeProvider } from "@/contexts/PublicRuntimeProvider";
import type { AccountQuotaSnapshot, QuotaFamily } from "@/quotas";
import { createRepo, createRepoDetail } from "@/test/factories";
import RepoDetail from "./RepoDetail";
import PublicRepoDetail from "./public/PublicRepoDetail";

/**
 * The repository tab reads the account quota, not the repository's own data.
 *
 * Both headers are wired from the page: the identification block gets the pill
 * and the health section gets the alert line, from one `accountPressure` call
 * over the families the account query already returned. The proof below renders
 * two different repositories under the same account reading — the percentage
 * must not move — and the public page must render neither surface even when
 * the quota hook is told a warning reading.
 */

vi.mock("@/hooks/useGitHub", () => ({
  useRepoSnapshot: vi.fn(),
  useAccountQuotas: vi.fn(),
}));

vi.mock("@/hooks/useGitHubPublic", () => ({
  usePublicRepoSnapshot: vi.fn(),
}));

/** Monthly family at 85% of its limit: the warning band, threshold 80%. */
function warningFamilies(): QuotaFamily[] {
  return [
    {
      id: "actionsMinutes",
      used: 850,
      limit: 1000,
      unit: "minutes",
      resetAt: null,
      origin: "billing",
      monthly: true,
    },
  ];
}

function quotaSnapshot(used = 850): AccountQuotaSnapshot {
  return {
    fetchedAt: "2026-10-20T12:00:00.000Z",
    login: "mafhper",
    billing: "enhanced",
    families: used === 850 ? warningFamilies() : [{ ...warningFamilies()[0], used }],
    repos: [],
    repoProbe: { probed: 0, requested: 0 },
    foreignOwners: [],
    foreignRepoCount: 0,
  };
}

function shell(children: React.ReactNode, publicRuntime = false) {
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

async function mockLocal(quota: AccountQuotaSnapshot | undefined, detail = createRepoDetail()) {
  const hooks = await import("@/hooks/useGitHub");
  vi.mocked(hooks.useRepoSnapshot).mockReturnValue({ data: detail, isLoading: false, error: null } as never);
  vi.mocked(hooks.useAccountQuotas).mockReturnValue({ data: quota } as never);
}

async function mockPublic(detail = createRepoDetail()) {
  const publicHooks = await import("@/hooks/useGitHubPublic");
  vi.mocked(publicHooks.usePublicRepoSnapshot).mockReturnValue({ data: detail, isLoading: false, error: null } as never);

  // The public page must ignore this reading by wiring, not by the data
  // happening to be absent.
  const localHooks = await import("@/hooks/useGitHub");
  vi.mocked(localHooks.useAccountQuotas).mockReturnValue({ data: quotaSnapshot() } as never);
}

function quotaMarker() {
  return screen.queryByRole("link", { name: /Account quotas/ });
}

function quotaLine() {
  return screen.queryByRole("status");
}

describe("repository tab quota header", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("wires both headers from the account reading", async () => {
    await mockLocal(quotaSnapshot());

    render(shell(<RepoDetail />));

    const marker = quotaMarker();
    expect(marker).toHaveTextContent("85%");
    expect(marker).toHaveAttribute("href", "/app/settings#settings-quotas");

    const line = quotaLine();
    expect(line).toHaveTextContent("Monthly quota above the 80% threshold: Actions minutes.");
    expect(screen.getByRole("link", { name: "Review quotas" })).toHaveAttribute(
      "href",
      "/app/settings#settings-quotas",
    );
    expect(screen.getByText(/Account-wide reading/)).toBeInTheDocument();
  });

  it("shows the same account reading on a different repository", async () => {
    await mockLocal(quotaSnapshot());
    const { unmount } = render(shell(<RepoDetail />));
    expect(quotaMarker()).toHaveTextContent("85%");
    unmount();

    // A second repository with very different health data: if the marker were
    // derived from the repository, the percentage would move here.
    const otherRepo = createRepoDetail({
      repo: createRepo({
        id: 2,
        name: "other-repo",
        fullName: "mafhper/other-repo",
        htmlUrl: "https://github.com/mafhper/other-repo",
      }),
      health: { ...createRepoDetail().health, score: 41, status: "critical" },
    });
    await mockLocal(quotaSnapshot(), otherRepo);

    render(shell(<RepoDetail />));

    expect(quotaMarker()).toHaveTextContent("85%");
    expect(quotaLine()).toHaveTextContent("Monthly quota above the 80% threshold: Actions minutes.");
    expect(screen.getByText(/Account-wide reading/)).toBeInTheDocument();
  });

  it("renders neither surface in the normal band", async () => {
    await mockLocal(quotaSnapshot(40));

    render(shell(<RepoDetail />));

    expect(quotaMarker()).not.toBeInTheDocument();
    expect(quotaLine()).not.toBeInTheDocument();
  });

  it("renders neither surface when no reading is loaded", async () => {
    await mockLocal(undefined);

    render(shell(<RepoDetail />));

    expect(quotaMarker()).not.toBeInTheDocument();
    expect(quotaLine()).not.toBeInTheDocument();
  });

  it("renders neither surface in the public runtime and never asks for quotas", async () => {
    await mockPublic();

    render(shell(<PublicRepoDetail />, true));

    expect(quotaMarker()).not.toBeInTheDocument();
    expect(quotaLine()).not.toBeInTheDocument();
    expect(screen.queryByText(/Account-wide reading/)).not.toBeInTheDocument();

    const localHooks = await import("@/hooks/useGitHub");
    expect(vi.mocked(localHooks.useAccountQuotas)).not.toHaveBeenCalled();
  });
});
