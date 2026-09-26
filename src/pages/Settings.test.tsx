import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import SettingsPage from "./Settings";
import { AppProvider } from "@/contexts/AppContext";
import { createManifest, createOverview, createRepo } from "@/test/factories";

const fakeToken = `${["ghp", "_"].join("")}test`;

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
    diagnoseToken: vi.fn(),
  };
});

describe("SettingsPage", () => {
  const publicRepo = createRepo({ id: 1, fullName: "mafhper/push_", name: "push_" });
  const secondPublicRepo = createRepo({ id: 2, fullName: "mafhper/public-ui", name: "public-ui" });
  const privateRepo = createRepo({ id: 3, fullName: "mafhper/segredo", name: "segredo", isPrivate: true });
  const archivedRepo = createRepo({ id: 4, fullName: "mafhper/velho", name: "velho", archived: true });
  const forkRepo = createRepo({
    id: 5,
    fullName: "third-party/fork-1",
    name: "fork-1",
    owner: "third-party",
    isFork: true,
    forkOf: { fullName: "upstream/original", htmlUrl: "https://github.com/upstream/original" },
  });
  const forkOfAccessibleRepo = createRepo({
    id: 6,
    fullName: "mafhper/fork-do-proprio",
    name: "fork-do-proprio",
    isFork: true,
    forkOf: { fullName: "mafhper/push_", htmlUrl: "https://github.com/mafhper/push_" },
  });

  async function renderSettings(repos: ReturnType<typeof createRepo>[]) {
    const hooks = await import("@/hooks/useGitHub");
    const github = await import("@/services/github");
    vi.mocked(hooks.useSnapshotManifest).mockReturnValue({ data: createManifest() } as never);
    vi.mocked(hooks.useDashboardSnapshot).mockReturnValue({ data: createOverview(), isLoading: false, error: null } as never);
    vi.mocked(hooks.useRateLimit).mockReturnValue({ data: null } as never);
    vi.mocked(hooks.useRepos).mockReturnValue({ data: repos, isLoading: false, error: null } as never);
    vi.mocked(github.validateToken).mockResolvedValue({ login: "mafhper", avatarUrl: "" });
    vi.mocked(github.diagnoseToken).mockResolvedValue({
      token: "valid",
      accessibleRepoCount: repos.length,
      privateRepoCount: repos.filter((repo) => repo.isPrivate).length,
      dependabotProbe: { status: "available", repoFullName: "mafhper/push_" },
    });

    const queryClient = new QueryClient();
    const view = render(
      <QueryClientProvider client={queryClient}>
        <AppProvider>
          <MemoryRouter>
            <SettingsPage />
          </MemoryRouter>
        </AppProvider>
      </QueryClientProvider>,
    );

    fireEvent.change(screen.getByPlaceholderText("Paste a GitHub personal access token"), {
      target: { value: fakeToken },
    });
    fireEvent.click(screen.getByRole("button", { name: /^connect$/i }));
    await waitFor(() => {
      expect(screen.getByText(repos[0]?.fullName ?? "")).toBeInTheDocument();
    });
    return view;
  }

  it("shows token controls in local runtime and never lists a private repository by default", async () => {
    await renderSettings([publicRepo, secondPublicRepo, privateRepo]);

    expect(screen.getAllByText("GitHub token").length).toBeGreaterThan(0);
    await waitFor(() => {
      expect(screen.getByText("mafhper/public-ui")).toBeInTheDocument();
    });
    expect(screen.getAllByText("Visible repos").length).toBeGreaterThan(0);
    expect(screen.getByText("Current dashboard set")).toBeInTheDocument();
    // CA-2 / CA-7: the private repository is in the catalog but not selected.
    expect(screen.getByText("mafhper/segredo")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /mafhper\/segredo/ })).toHaveAttribute("aria-pressed", "false");
  });

  it("CA-4: shows the four groups with the fixed precedence and no duplicated item", async () => {
    await renderSettings([publicRepo, secondPublicRepo, privateRepo, archivedRepo, forkRepo, forkOfAccessibleRepo]);

    expect(screen.getByRole("group", { name: "Public repositories" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Private repositories" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Forks" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Others" })).toBeInTheDocument();

    // Display order in the list: public first, then private, then others, forks last.
    const groupOrder = screen
      .getAllByRole("group")
      .map((element) => element.getAttribute("aria-labelledby"))
      .map((id) => document.getElementById(id ?? "")?.textContent);
    expect(groupOrder).toEqual(["Public repositories", "Private repositories", "Others", "Forks"]);

    // The fork whose upstream is in scope is NOT in the Forks group: precedence
    // falls through to the private rule, and it is public, so it lands in Public.
    const forksGroup = screen.getByRole("group", { name: "Forks" });
    expect(within(forksGroup).getByText("third-party/fork-1")).toBeInTheDocument();
    expect(within(forksGroup).queryByText("mafhper/fork-do-proprio")).not.toBeInTheDocument();
    const publicGroup = screen.getByRole("group", { name: "Public repositories" });
    expect(within(publicGroup).getByText("mafhper/fork-do-proprio")).toBeInTheDocument();
    expect(within(publicGroup).getByText("mafhper/push_")).toBeInTheDocument();

    // Each item appears exactly once across the whole list.
    expect(screen.getAllByText("mafhper/push_")).toHaveLength(1);
    expect(screen.getAllByText("mafhper/segredo")).toHaveLength(1);

    const othersGroup = screen.getByRole("group", { name: "Others" });
    expect(within(othersGroup).getByText("mafhper/velho")).toBeInTheDocument();
  });

  it("CA-5: selecting a group does not touch the other groups", async () => {
    await renderSettings([publicRepo, secondPublicRepo, privateRepo]);

    const publicGroup = within(screen.getByRole("group", { name: "Public repositories" }));
    const privateGroup = within(screen.getByRole("group", { name: "Private repositories" }));

    fireEvent.click(publicGroup.getByRole("button", { name: "Select group" }));

    await waitFor(() => {
      expect(publicGroup.getByRole("button", { name: /mafhper\/push_/ })).toHaveAttribute("aria-pressed", "true");
      expect(publicGroup.getByRole("button", { name: /mafhper\/public-ui/ })).toHaveAttribute("aria-pressed", "true");
    });
    expect(privateGroup.getByRole("button", { name: /mafhper\/segredo/ })).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(privateGroup.getByRole("button", { name: "Select group" }));
    await waitFor(() => {
      expect(privateGroup.getByRole("button", { name: /mafhper\/segredo/ })).toHaveAttribute("aria-pressed", "true");
    });
    expect(publicGroup.getByRole("button", { name: /mafhper\/push_/ })).toHaveAttribute("aria-pressed", "true");

    // Clearing the private group leaves the public group selected (CA-5).
    fireEvent.click(privateGroup.getByRole("button", { name: "Clear group" }));
    await waitFor(() => {
      expect(privateGroup.getByRole("button", { name: /mafhper\/segredo/ })).toHaveAttribute("aria-pressed", "false");
    });
    expect(publicGroup.getByRole("button", { name: /mafhper\/push_/ })).toHaveAttribute("aria-pressed", "true");
  });

  it("CA-7: the global bulk action never selects a private repository", async () => {
    await renderSettings([publicRepo, secondPublicRepo, privateRepo]);

    fireEvent.click(screen.getByRole("button", { name: "Select public" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /mafhper\/push_/ })).toHaveAttribute("aria-pressed", "true");
    });
    expect(screen.getByRole("button", { name: /mafhper\/segredo/ })).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(screen.getByRole("button", { name: "Deselect all" }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /mafhper\/push_/ })).toHaveAttribute("aria-pressed", "false");
    });
  });

  it("CA-6: a token with no private scope shows the count and the scope instruction", async () => {
    const hooks = await import("@/hooks/useGitHub");
    vi.mocked(hooks.useRepos).mockReturnValue({ data: [publicRepo], isLoading: false, error: null } as never);
    const github = await import("@/services/github");
    vi.mocked(github.diagnoseToken).mockResolvedValue({
      token: "valid",
      accessibleRepoCount: 1,
      privateRepoCount: 0,
      dependabotProbe: { status: "available", repoFullName: "mafhper/push_" },
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

    fireEvent.change(screen.getByPlaceholderText("Paste a GitHub personal access token"), {
      target: { value: fakeToken },
    });
    fireEvent.click(screen.getByRole("button", { name: /^connect$/i }));

    await waitFor(() => {
      expect(screen.getByText("mafhper/push_")).toBeInTheDocument();
    });
    expect(screen.getByText("Private in scope")).toBeInTheDocument();
    expect(screen.getAllByText("0").length).toBeGreaterThan(0);
    // Two distinct surfaces explain the scope: the diagnostics card and the
    // empty private group.
    expect(screen.getAllByText(/A classic personal access token reaches your private repositories/).length).toBe(2);
    expect(screen.getByText(/No private repository is accessible with this token/)).toBeInTheDocument();
  });

  it("C3: rows label private, fork upstream and archived", async () => {
    await renderSettings([privateRepo, archivedRepo, forkRepo]);

    expect(screen.getByText("Private")).toBeInTheDocument();
    expect(screen.getByText("Archived")).toBeInTheDocument();
    expect(screen.getByText("Fork of upstream/original")).toBeInTheDocument();
  });

  it("handles a large catalog: counters, collapsing and search stay usable per group", async () => {
    const largeCatalog = [
      ...Array.from({ length: 150 }, (_, index) =>
        createRepo({ id: 1000 + index, fullName: `acme/public-${index}`, name: `public-${index}` }),
      ),
      ...Array.from({ length: 60 }, (_, index) =>
        createRepo({ id: 2000 + index, fullName: `acme/private-${index}`, name: `private-${index}`, isPrivate: true }),
      ),
      ...Array.from({ length: 20 }, (_, index) =>
        createRepo({ id: 3000 + index, fullName: `acme/archived-${index}`, name: `archived-${index}`, archived: true }),
      ),
      ...Array.from({ length: 45 }, (_, index) =>
        createRepo({
          id: 4000 + index,
          fullName: `acme/fork-${index}`,
          name: `fork-${index}`,
          isFork: true,
          forkOf: { fullName: `upstream/original-${index}`, htmlUrl: `https://github.com/upstream/original-${index}` },
        }),
      ),
    ];
    await renderSettings(largeCatalog);

    // Every group survives with a real total, and the first one is public.
    const groupOrder = screen
      .getAllByRole("group")
      .map((element) => document.getElementById(element.getAttribute("aria-labelledby") ?? "")?.textContent);
    expect(groupOrder).toEqual(["Public repositories", "Private repositories", "Others", "Forks"]);
    expect(within(screen.getByRole("group", { name: "Public repositories" })).getByText("0 of 150 selected")).toBeInTheDocument();
    expect(within(screen.getByRole("group", { name: "Private repositories" })).getByText("0 of 60 selected")).toBeInTheDocument();
    expect(within(screen.getByRole("group", { name: "Forks" })).getByText("0 of 45 selected")).toBeInTheDocument();

    // Collapsing a big group takes its rows out of the page.
    const publicGroup = within(screen.getByRole("group", { name: "Public repositories" }));
    expect(publicGroup.getByText("acme/public-0")).toBeInTheDocument();
    fireEvent.click(publicGroup.getByRole("button", { name: "Collapse group" }));
    expect(publicGroup.queryByText("acme/public-0")).not.toBeInTheDocument();
    expect(screen.getByText("0 of 150 selected")).toBeInTheDocument();

    // Search works inside a big group and does not hide the other groups.
    fireEvent.click(publicGroup.getByRole("button", { name: "Expand group" }));
    fireEvent.change(screen.getByPlaceholderText("Search repositories..."), { target: { value: "public-149" } });
    expect(publicGroup.getByText("acme/public-149")).toBeInTheDocument();
    expect(publicGroup.queryByText("acme/public-0")).not.toBeInTheDocument();
    const forksGroup = within(screen.getByRole("group", { name: "Forks" }));
    expect(forksGroup.getByText("No repository in this group matches the current filter.")).toBeInTheDocument();

    // And a fork term finds the fork row and its upstream label.
    fireEvent.change(screen.getByPlaceholderText("Search repositories..."), { target: { value: "fork-0" } });
    expect(forksGroup.getByText("Fork of upstream/original-0")).toBeInTheDocument();
  });

  it("keeps groups visible and collapsible, and the search filters inside them", async () => {
    await renderSettings([publicRepo, secondPublicRepo, privateRepo]);

    const publicGroup = screen.getByRole("group", { name: "Public repositories" });
    const collapseButton = within(publicGroup).getByRole("button", { name: "Collapse group" });
    expect(collapseButton).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(collapseButton);
    expect(within(publicGroup).queryByText("mafhper/push_")).not.toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Public repositories" })).toBeInTheDocument();

    fireEvent.click(within(screen.getByRole("group", { name: "Public repositories" })).getByRole("button", { name: "Expand group" }));
    fireEvent.change(screen.getByPlaceholderText("Search repositories..."), { target: { value: "public-ui" } });

    const filteredPublic = within(screen.getByRole("group", { name: "Public repositories" }));
    expect(filteredPublic.getByText("mafhper/public-ui")).toBeInTheDocument();
    expect(filteredPublic.queryByText("mafhper/push_")).not.toBeInTheDocument();
    // The group itself survives the search (RF-08).
    expect(filteredPublic.getByText("0 of 2 selected")).toBeInTheDocument();
    expect(within(screen.getByRole("group", { name: "Private repositories" })).getByText("No repository in this group matches the current filter.")).toBeInTheDocument();
  });
});
