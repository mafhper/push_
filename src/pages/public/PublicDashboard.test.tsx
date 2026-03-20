import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import PublicDashboard from "./PublicDashboard";
import { createOverview } from "@/test/factories";

vi.mock("@/hooks/useGitHubPublic", () => ({
  usePublicDashboardSnapshot: vi.fn(),
}));

describe("PublicDashboard", () => {
  it("renders real metrics only", async () => {
    const { usePublicDashboardSnapshot } = await import("@/hooks/useGitHubPublic");
    vi.mocked(usePublicDashboardSnapshot).mockReturnValue({
      data: createOverview(),
      isLoading: false,
      error: null,
    } as never);

    render(
      <MemoryRouter>
        <PublicDashboard />
      </MemoryRouter>,
    );

    expect(screen.getByText("Tracked Repos")).toBeInTheDocument();
    expect(screen.queryByText("Global Uptime")).not.toBeInTheDocument();
    expect(screen.queryByText("Traffic (24h)")).not.toBeInTheDocument();
  });

  it("renders an empty state when no repositories are tracked", async () => {
    const { usePublicDashboardSnapshot } = await import("@/hooks/useGitHubPublic");
    vi.mocked(usePublicDashboardSnapshot).mockReturnValue({
      data: createOverview({ repos: [] }),
      isLoading: false,
      error: null,
    } as never);

    render(
      <MemoryRouter>
        <PublicDashboard />
      </MemoryRouter>,
    );

    expect(screen.getByText("The published snapshot currently has no tracked repositories.")).toBeInTheDocument();
  });
});
