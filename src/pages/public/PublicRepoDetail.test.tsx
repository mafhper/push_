import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import PublicRepoDetail from "./PublicRepoDetail";
import { createRepoDetail } from "@/test/factories";

vi.mock("@/hooks/useGitHubPublic", () => ({
  usePublicRepoSnapshot: vi.fn(),
}));

vi.mock("@/contexts/usePublicRuntime", () => ({
  usePublicRuntime: vi.fn(),
}));

describe("PublicRepoDetail", () => {
  it("renders pipeline pulse insights when workflow runs exist", async () => {
    const { usePublicRepoSnapshot } = await import("@/hooks/useGitHubPublic");
    const { usePublicRuntime } = await import("@/contexts/usePublicRuntime");
    vi.mocked(usePublicRuntime).mockReturnValue({
      mode: "snapshot",
      username: null,
      setUsername: vi.fn(),
      clearUsername: vi.fn(),
    } as never);
    vi.mocked(usePublicRepoSnapshot).mockReturnValue({
      data: createRepoDetail(),
      isLoading: false,
      error: null,
    } as never);

    render(
      <MemoryRouter initialEntries={["/app/repo/mafhper/push_"]}>
        <Routes>
          <Route path="/app/repo/:owner/:repo" element={<PublicRepoDetail />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("Pipeline")).toBeInTheDocument();
    expect(screen.getByText("Success Rate")).toBeInTheDocument();
    expect(screen.getByText("Avg Duration")).toBeInTheDocument();
    expect(screen.getByText("Open latest run")).toBeInTheDocument();
  });

  it("shows explicit absence for optional fields", async () => {
    const { usePublicRepoSnapshot } = await import("@/hooks/useGitHubPublic");
    const { usePublicRuntime } = await import("@/contexts/usePublicRuntime");
    const detail = createRepoDetail();
    vi.mocked(usePublicRuntime).mockReturnValue({
      mode: "snapshot",
      username: null,
      setUsername: vi.fn(),
      clearUsername: vi.fn(),
    } as never);
    vi.mocked(usePublicRepoSnapshot).mockReturnValue({
      data: createRepoDetail({
        workflowRuns: [],
        repo: { ...detail.repo, license: null },
      }),
      isLoading: false,
      error: null,
    } as never);

    render(
      <MemoryRouter initialEntries={["/app/repo/mafhper/push_"]}>
        <Routes>
          <Route path="/app/repo/:owner/:repo" element={<PublicRepoDetail />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("License")).toBeInTheDocument();
    expect(screen.getAllByText("Unavailable").length).toBeGreaterThan(0);
    expect(screen.getByText("Size")).toBeInTheDocument();
    expect(screen.getByText("No workflow runs are available for this repository in the current snapshot.")).toBeInTheDocument();
  });
});
