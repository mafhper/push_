import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import PublicSettingsPage from "./PublicSettings";
import { renderWithAppProviders } from "@/test/render-app";
import { createManifest, createOverview } from "@/test/factories";

vi.mock("@/hooks/useGitHubPublic", () => ({
  usePublicSnapshotManifest: vi.fn(),
  usePublicDashboardSnapshot: vi.fn(),
  usePublicProfileRepos: vi.fn(),
  usePublicRateLimit: vi.fn(),
}));

vi.mock("@/contexts/usePublicRuntime", () => ({
  usePublicRuntime: vi.fn(),
}));

describe("PublicSettingsPage", () => {
  it("does not expose token controls in the published runtime", async () => {
    const hooks = await import("@/hooks/useGitHubPublic");
    const { usePublicRuntime } = await import("@/contexts/usePublicRuntime");
    vi.mocked(usePublicRuntime).mockReturnValue({
      mode: "snapshot",
      username: null,
      setUsername: vi.fn(),
      clearUsername: vi.fn(),
    } as never);
    vi.mocked(hooks.usePublicSnapshotManifest).mockReturnValue({ data: createManifest() } as never);
    vi.mocked(hooks.usePublicDashboardSnapshot).mockReturnValue({ data: createOverview(), isLoading: false, error: null } as never);
    vi.mocked(hooks.usePublicProfileRepos).mockReturnValue({ data: [], isLoading: false, error: null } as never);
    vi.mocked(hooks.usePublicRateLimit).mockReturnValue({ data: { remaining: 60, limit: 60, resetAt: "2026-03-19T12:00:00.000Z" } } as never);

    renderWithAppProviders(
      <MemoryRouter>
        <PublicSettingsPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "Published snapshot" })).toBeInTheDocument();
    expect(screen.queryByText("GitHub token")).not.toBeInTheDocument();
    expect(screen.getByText("The published site does not accept a GitHub token.")).toBeInTheDocument();
  });
});
