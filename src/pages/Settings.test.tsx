import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import SettingsPage from "./Settings";
import { AppProvider } from "@/contexts/AppContext";
import { createManifest, createOverview, createRepo } from "@/test/factories";

vi.mock("@/config/site", async () => {
  const actual = await vi.importActual<typeof import("@/config/site")>("@/config/site");
  return {
    ...actual,
    isLocalSecureRuntime: vi.fn(() => true),
  };
});

vi.mock("@/hooks/useGitHub", () => ({
  useSnapshotManifest: vi.fn(),
  useDashboardSnapshot: vi.fn(),
  useRepos: vi.fn(),
  useRateLimit: vi.fn(),
}));

vi.mock("@/services/github", async () => {
  const actual = await vi.importActual<typeof import("@/services/github")>("@/services/github");
  return {
    ...actual,
    validateToken: vi.fn(),
  };
});

describe("SettingsPage", () => {
  it("shows token controls in local runtime and lists only public repositories", async () => {
    const hooks = await import("@/hooks/useGitHub");
    const github = await import("@/services/github");
    vi.mocked(hooks.useSnapshotManifest).mockReturnValue({ data: createManifest() } as never);
    vi.mocked(hooks.useDashboardSnapshot).mockReturnValue({ data: createOverview(), isLoading: false, error: null } as never);
    vi.mocked(hooks.useRateLimit).mockReturnValue({ data: null } as never);
    vi.mocked(hooks.useRepos).mockReturnValue({
      data: [
        createRepo({ id: 1, fullName: "mafhper/push_", name: "push_" }),
        createRepo({ id: 2, fullName: "mafhper/public-ui", name: "public-ui" }),
      ],
      isLoading: false,
      error: null,
    } as never);
    vi.mocked(github.validateToken).mockResolvedValue({
      login: "mafhper",
      avatarUrl: "",
    });

    const queryClient = new QueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <AppProvider>
          <MemoryRouter>
            <SettingsPage />
          </MemoryRouter>
        </AppProvider>
      </QueryClientProvider>,
    );

    expect(screen.getByText("GitHub token")).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText("Paste a GitHub personal access token"), {
      target: { value: "ghp_test" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^connect$/i }));

    await waitFor(() => {
      expect(screen.getByText("mafhper/push_")).toBeInTheDocument();
      expect(screen.getByText("mafhper/public-ui")).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getAllByText("Visible repos").length).toBeGreaterThan(0);
      expect(screen.getByText("Current dashboard set")).toBeInTheDocument();
      expect(screen.getAllByText("Featured repo").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Featured").length).toBeGreaterThan(0);
      expect(screen.getAllByText("mafhper/push_").length).toBeGreaterThan(0);
    });

    expect(screen.queryByText("Private")).not.toBeInTheDocument();
  });
});
