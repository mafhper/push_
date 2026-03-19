import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import PublicSettingsPage from "./PublicSettings";
import { createManifest, createOverview } from "@/test/factories";

vi.mock("@/hooks/useGitHubPublic", () => ({
  usePublicSnapshotManifest: vi.fn(),
  usePublicDashboardSnapshot: vi.fn(),
  usePublicRateLimit: vi.fn(),
}));

describe("PublicSettingsPage", () => {
  it("does not expose token controls in the published runtime", async () => {
    const hooks = await import("@/hooks/useGitHubPublic");
    vi.mocked(hooks.usePublicSnapshotManifest).mockReturnValue({ data: createManifest() } as never);
    vi.mocked(hooks.usePublicDashboardSnapshot).mockReturnValue({ data: createOverview(), isLoading: false, error: null } as never);
    vi.mocked(hooks.usePublicRateLimit).mockReturnValue({ data: { remaining: 60, limit: 60, resetAt: "2026-03-19T12:00:00.000Z" } } as never);

    render(
      <MemoryRouter>
        <PublicSettingsPage />
      </MemoryRouter>,
    );

    expect(screen.getByText("Snapshot status")).toBeInTheDocument();
    expect(screen.queryByText("GitHub token")).not.toBeInTheDocument();
    expect(screen.getByText("The published site does not accept a GitHub token.")).toBeInTheDocument();
  });
});
