import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import PublicRepoDetail from "./PublicRepoDetail";
import { createRepoDetail } from "@/test/factories";

vi.mock("@/hooks/useGitHubPublic", () => ({
  usePublicRepoSnapshot: vi.fn(),
}));

describe("PublicRepoDetail", () => {
  it("shows explicit absence for optional fields", async () => {
    const { usePublicRepoSnapshot } = await import("@/hooks/useGitHubPublic");
    const detail = createRepoDetail();
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
    expect(screen.getByText("Unavailable")).toBeInTheDocument();
    expect(screen.getByText("Repository Size")).toBeInTheDocument();
    expect(screen.getByText("No workflow executions are available for this repository in the current snapshot.")).toBeInTheDocument();
  });
});
