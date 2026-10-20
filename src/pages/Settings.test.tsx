import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import SettingsPage from "./Settings";
import { AppProvider } from "@/contexts/AppContext";
import { createManifest, createOverview, createRepo } from "@/test/factories";
import type { AccountQuotaSnapshot } from "@/quotas";

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
  useAccountQuotas: vi.fn(),
}));

vi.mock("@/services/github", async () => {
  const actual = await vi.importActual<typeof import("@/services/github")>("@/services/github");
  return {
    ...actual,
    validateToken: vi.fn(),
    diagnoseToken: vi.fn(),
  };
});

vi.mock("@/services/open-external", () => ({
  openExternal: vi.fn(),
}));

describe("SettingsPage", () => {
  const publicRepo = createRepo({ id: 1, fullName: "mafhper/push_", name: "push_" });
  const secondPublicRepo = createRepo({ id: 2, fullName: "mafhper/public-ui", name: "public-ui" });
  const privateRepo = createRepo({ id: 3, fullName: "mafhper/segredo", name: "segredo", isPrivate: true });
  const secondPrivateRepo = createRepo({ id: 7, fullName: "mafhper/segredo-2", name: "segredo-2", isPrivate: true });
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

  function groupBox(name: string) {
    return within(screen.getByRole("group", { name }));
  }

  function expandGroup(name: string) {
    fireEvent.click(groupBox(name).getByRole("button", { name: "Expand group" }));
  }

  function collapseGroup(name: string) {
    fireEvent.click(groupBox(name).getByRole("button", { name: "Collapse group" }));
  }

  function groupOrder() {
    // Repository groups are the labelled ones; the page also carries the alert
    // cap stepper as a group, which is not part of this ordering.
    return screen
      .getAllByRole("group")
      .filter((element) => element.hasAttribute("aria-labelledby"))
      .map((element) => document.getElementById(element.getAttribute("aria-labelledby") ?? "")?.textContent);
  }

  function buildLargeCatalog() {
    return [
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
  }

  function buildQuotaSnapshot(): AccountQuotaSnapshot {
    return {
      fetchedAt: "2026-10-19T12:00:00.000Z",
      login: "mafhper",
      billing: "enhanced",
      families: [
        {
          id: "actionsMinutes",
          used: 1800,
          limit: 2000,
          unit: "minutes",
          resetAt: null,
          origin: "billing",
          monthly: true,
        },
      ],
      repos: [
        {
          fullName: "mafhper/push_",
          cacheMb: 512,
          cacheCount: 2,
          artifactsMb: 64,
          actionsMinutes: 1800,
        },
      ],
      repoProbe: { probed: 1, requested: 1 },
      foreignOwners: [],
      foreignRepoCount: 0,
    };
  }

  async function renderSettings(repos: ReturnType<typeof createRepo>[], options: { login?: string } = {}) {
    const hooks = await import("@/hooks/useGitHub");
    const github = await import("@/services/github");
    vi.mocked(hooks.useSnapshotManifest).mockReturnValue({ data: createManifest() } as never);
    vi.mocked(hooks.useDashboardSnapshot).mockReturnValue({ data: createOverview(), isLoading: false, error: null } as never);
    vi.mocked(hooks.useRateLimit).mockReturnValue({ data: null } as never);
    vi.mocked(hooks.useAccountQuotas).mockReturnValue({
      data: buildQuotaSnapshot(),
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never);
    vi.mocked(hooks.useRepos).mockReturnValue({ data: repos, isLoading: false, error: null } as never);
    vi.mocked(github.validateToken).mockResolvedValue({ login: options.login ?? "mafhper", avatarUrl: "" });
    vi.mocked(github.diagnoseToken).mockResolvedValue({
      token: "valid",
      kind: "fine-grained",
      accessibleRepoCount: repos.length,
      privateRepoCount: repos.filter((repo) => repo.isPrivate).length,
      permissions: [
        { id: "metadata", status: "granted" },
        { id: "contents", status: "granted" },
        { id: "actions", status: "granted" },
        { id: "dependabot", status: "granted" },
      ],
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
      expect(screen.getByText("Public repositories")).toBeInTheDocument();
    });
    return view;
  }

  // Setup waits on token validation and the repository query: 1.4s warm, 5.6s on a
  // cold module cache, against a 15s global budget — no headroom once the suite
  // competes for the CPU. fd4e567 (clean baseline) failed here before any promo
  // change, so this budget is about the test's weight, not about a regression.
  it("shows token controls in local runtime and never lists a private repository by default", { timeout: 30000 }, async () => {
    await renderSettings([publicRepo, secondPublicRepo, privateRepo]);

    expect(screen.getAllByText("GitHub token").length).toBeGreaterThan(0);
    // The page closes with the app version and the repository link, which
    // always leaves the app instead of navigating the webview itself.
    expect(screen.getByText(/^v\d+\.\d+\.\d+$/)).toBeInTheDocument();
    const repoLink = screen.getByRole("link", { name: /github repository/i });
    expect(repoLink).toHaveAttribute("href", "https://github.com/mafhper/push_");
    fireEvent.click(repoLink);
    const { openExternal } = await import("@/services/open-external");
    expect(vi.mocked(openExternal)).toHaveBeenCalledWith("https://github.com/mafhper/push_");
    // The groups start closed: the header is the surface, the rows are on demand.
    expect(screen.queryByText("mafhper/public-ui")).not.toBeInTheDocument();
    expandGroup("Public repositories");
    expect(screen.getByText("mafhper/public-ui")).toBeInTheDocument();
    expect(screen.getAllByText("Visible repos").length).toBeGreaterThan(0);
    // Token validity lives only on the header badge — no diagnostics card
    // repeats it — and the scope hint only appears when the scope sees no
    // private repository.
    expect(screen.queryByText("Token valid")).not.toBeInTheDocument();
    expect(screen.queryByText(/A classic personal access token reaches your private repositories/)).not.toBeInTheDocument();
    // CA-2 / CA-7: the private repository is in the catalog but not selected.
    expandGroup("Private repositories");
    expect(screen.getByText("mafhper/segredo")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /mafhper\/segredo/ })).toHaveAttribute("aria-pressed", "false");
  });

  // The three group tests below mount the same page and then walk its rows: 1.4s,
  // 1.8s and 2.3s measured on an idle machine, which leaves no room once the
  // suite competes for the CPU. On a fully loaded one (96% CPU) CA-4 and CA-5
  // crossed the 15s global budget and were aborted at 21.2s and 20.5s, with the
  // file at 215s against 161s on the previous run. The assertion is untouched:
  // only the ceiling moves, so a real regression still fails inside the budget.
  it("CA-4: shows the four groups with the fixed precedence and no duplicated item", { timeout: 30000 }, async () => {
    await renderSettings([publicRepo, secondPublicRepo, privateRepo, archivedRepo, forkRepo, forkOfAccessibleRepo]);

    expect(screen.getByRole("group", { name: "Public repositories" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Private repositories" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Forks" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Others" })).toBeInTheDocument();

    // Order: biggest group first (Public has three); the groups tied at one
    // keep the fixed precedence (Private, Others, Forks).
    expect(groupOrder()).toEqual(["Public repositories", "Private repositories", "Others", "Forks"]);

    // The fork whose upstream is in scope is NOT in the Forks group: precedence
    // falls through to the private rule, and it is public, so it lands in Public.
    // Groups open one at a time, and opening one closes the others.
    expandGroup("Public repositories");
    expect(groupBox("Public repositories").getByText("mafhper/fork-do-proprio")).toBeInTheDocument();
    expect(groupBox("Public repositories").getByText("mafhper/push_")).toBeInTheDocument();
    expect(groupBox("Public repositories").getAllByText("mafhper/push_")).toHaveLength(1);

    expandGroup("Private repositories");
    expect(groupBox("Private repositories").getByText("mafhper/segredo")).toBeInTheDocument();
    expect(screen.getAllByText("mafhper/segredo")).toHaveLength(1);

    expandGroup("Others");
    expect(groupBox("Others").getByText("mafhper/velho")).toBeInTheDocument();

    expandGroup("Forks");
    expect(groupBox("Forks").getByText("third-party/fork-1")).toBeInTheDocument();
    expect(groupBox("Forks").queryByText("mafhper/fork-do-proprio")).not.toBeInTheDocument();
  });

  it("CA-5: selecting a group does not touch the other groups", { timeout: 30000 }, async () => {
    await renderSettings([publicRepo, secondPublicRepo, privateRepo]);

    expandGroup("Public repositories");
    fireEvent.click(groupBox("Public repositories").getByRole("button", { name: "Select group" }));
    await waitFor(() => {
      expect(groupBox("Public repositories").getByRole("button", { name: /mafhper\/push_/ })).toHaveAttribute("aria-pressed", "true");
      expect(groupBox("Public repositories").getByRole("button", { name: /mafhper\/public-ui/ })).toHaveAttribute("aria-pressed", "true");
    });

    // The private rows stay untouched by the public bulk action.
    expandGroup("Private repositories");
    expect(groupBox("Private repositories").getByRole("button", { name: /mafhper\/segredo/ })).toHaveAttribute("aria-pressed", "false");

    // Selecting the private group selects only it.
    fireEvent.click(groupBox("Private repositories").getByRole("button", { name: "Select group" }));
    await waitFor(() => {
      expect(groupBox("Private repositories").getByRole("button", { name: /mafhper\/segredo/ })).toHaveAttribute("aria-pressed", "true");
    });

    // Clearing the private group leaves the public selection alone (CA-5).
    fireEvent.click(groupBox("Private repositories").getByRole("button", { name: "Clear group" }));
    await waitFor(() => {
      expect(groupBox("Private repositories").getByRole("button", { name: /mafhper\/segredo/ })).toHaveAttribute("aria-pressed", "false");
    });
    expandGroup("Public repositories");
    expect(groupBox("Public repositories").getByRole("button", { name: /mafhper\/push_/ })).toHaveAttribute("aria-pressed", "true");
  });

  // Same page and rows as CA-4/CA-5, plus the bulk action: 2.3s idle, aborted at
  // 10.6s under the loaded run above when the previous two timed out and left
  // their queued updates behind. The larger ceiling (45s) covers the action on a
  // starved CPU; the assertions stay exactly as they were.
  it("CA-7: the global bulk action never selects a private repository", { timeout: 45000 }, async () => {
    await renderSettings([publicRepo, secondPublicRepo, privateRepo]);

    expandGroup("Public repositories");
    fireEvent.click(screen.getByRole("button", { name: "Select public" }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /mafhper\/push_/ })).toHaveAttribute("aria-pressed", "true");
    });

    // The private rows are reachable only through their own group, and the
    // bulk action left them alone.
    expandGroup("Private repositories");
    expect(screen.getByRole("button", { name: /mafhper\/segredo/ })).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(screen.getByRole("button", { name: "Deselect all" }));
    expect(screen.getByRole("button", { name: /mafhper\/segredo/ })).toHaveAttribute("aria-pressed", "false");
    expandGroup("Public repositories");
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
      kind: "classic",
      accessibleRepoCount: 1,
      privateRepoCount: 0,
      permissions: [
        { id: "metadata", status: "granted" },
        { id: "contents", status: "granted" },
        { id: "actions", status: "granted" },
        { id: "dependabot", status: "denied" },
      ],
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
      expect(screen.getByText("Public repositories")).toBeInTheDocument();
    });
    expandGroup("Public repositories");
    expect(groupBox("Public repositories").getByText("mafhper/push_")).toBeInTheDocument();
    expandGroup("Private repositories");
    expect(screen.getByText("Private in scope")).toBeInTheDocument();
    expect(screen.getAllByText("0").length).toBeGreaterThan(0);
    // Two distinct surfaces explain the scope: the diagnostics card and the
    // empty private group.
    expect(screen.getAllByText(/A classic personal access token reaches your private repositories/).length).toBe(2);
    expect(screen.getByText(/No private repository is accessible with this token/)).toBeInTheDocument();
  });

  it("points at the GitHub token pages and reports the token permissions after connecting", async () => {
    const hooks = await import("@/hooks/useGitHub");
    const github = await import("@/services/github");
    vi.mocked(hooks.useSnapshotManifest).mockReturnValue({ data: createManifest() } as never);
    vi.mocked(hooks.useDashboardSnapshot).mockReturnValue({ data: createOverview(), isLoading: false, error: null } as never);
    vi.mocked(hooks.useRateLimit).mockReturnValue({ data: null } as never);
    vi.mocked(hooks.useAccountQuotas).mockReturnValue({
      data: buildQuotaSnapshot(),
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never);
    vi.mocked(hooks.useRepos).mockReturnValue({ data: [publicRepo], isLoading: false, error: null } as never);
    vi.mocked(github.validateToken).mockResolvedValue({ login: "mafhper", avatarUrl: "" });
    vi.mocked(github.diagnoseToken).mockResolvedValue({
      token: "valid",
      kind: "fine-grained",
      accessibleRepoCount: 1,
      privateRepoCount: 0,
      permissions: [
        { id: "metadata", status: "granted" },
        { id: "contents", status: "granted" },
        { id: "actions", status: "denied" },
        { id: "dependabot", status: "granted" },
      ],
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

    // Before connecting: where to create the token, and what it needs.
    expect(screen.getByRole("link", { name: /fine-grained token/i })).toHaveAttribute("href", "https://github.com/settings/personal-access-tokens/new");
    expect(screen.getByRole("link", { name: /classic token/i })).toHaveAttribute("href", "https://github.com/settings/tokens/new");
    expect(screen.getByText("Permissions needed")).toBeInTheDocument();
    expect(screen.getByText("Repository metadata (read)")).toBeInTheDocument();
    expect(screen.getByText("Dependabot alerts (read)")).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("Paste a GitHub personal access token"), {
      target: { value: fakeToken },
    });
    fireEvent.click(screen.getByRole("button", { name: /^connect$/i }));

    // After connecting: the token kind and the probed permission status, in
    // the current-mode card next to the token card.
    await waitFor(() => {
      expect(screen.getByText("Token permissions")).toBeInTheDocument();
    });
    const modeCard = screen.getByRole("heading", { name: "Current mode" }).closest("section");
    expect(within(modeCard as HTMLElement).getByText("Token permissions")).toBeInTheDocument();
    expect(within(modeCard as HTMLElement).getByText("Missing")).toBeInTheDocument();
    expect(screen.getByText("Fine-grained")).toBeInTheDocument();
    expect(screen.getAllByText("Granted")).toHaveLength(3);
    expect(screen.getByText("Missing")).toBeInTheDocument();
  });

  it("selects theme, language and detail level from the dropdown rows", async () => {
    await renderSettings([publicRepo]);

    // Theme: the dot lives with the name — in the trigger and in the options.
    const themeTrigger = screen.getByRole("button", { name: "Theme" });
    expect(themeTrigger).toHaveTextContent("Graphite");
    fireEvent.click(themeTrigger);
    const themeList = screen.getByRole("listbox", { name: "Theme" });
    expect(within(themeList).getByRole("option", { name: "Graphite" })).toHaveAttribute("aria-selected", "true");
    fireEvent.click(within(themeList).getByRole("option", { name: "Paper" }));
    expect(screen.getByRole("button", { name: "Theme" })).toHaveTextContent("Paper");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();

    // The detail hint follows the active level instead of describing only the
    // balanced one.
    expect(screen.getByText("Essential signals first. Heavy data loads on demand.")).toBeInTheDocument();
    fireEvent.change(screen.getByRole("combobox", { name: "Detail level" }), { target: { value: "full" } });
    expect(screen.getByText("Audits every signal push_ was able to verify about this repository.")).toBeInTheDocument();
    expect(screen.queryByText("Essential signals first. Heavy data loads on demand.")).not.toBeInTheDocument();

    // Language last: switching it re-renders the page in the new locale.
    fireEvent.change(screen.getByRole("combobox", { name: "Language" }), { target: { value: "es" } });
    expect(screen.getByRole("combobox", { name: "Idioma" })).toHaveValue("es");
  });

  it("C3: rows label private, fork upstream and archived", async () => {
    await renderSettings([privateRepo, archivedRepo, forkRepo]);

    expandGroup("Private repositories");
    expect(groupBox("Private repositories").getByText("Private")).toBeInTheDocument();

    expandGroup("Others");
    expect(groupBox("Others").getByText("Archived")).toBeInTheDocument();

    expandGroup("Forks");
    expect(groupBox("Forks").getByText("Fork of upstream/original")).toBeInTheDocument();
  });

  it("orders the chevrons by repository count, breaking ties by the fixed precedence", async () => {
    await renderSettings([publicRepo, privateRepo, secondPrivateRepo, archivedRepo]);

    // Private (2 rows) leads; Public and Others tie at one row and keep the
    // fixed precedence; the empty Forks group closes the list.
    expect(groupOrder()).toEqual(["Private repositories", "Public repositories", "Others", "Forks"]);
  });

  it("opening a chevron closes the other ones", async () => {
    await renderSettings([publicRepo, secondPublicRepo, privateRepo]);

    expandGroup("Public repositories");
    expect(groupBox("Public repositories").getByText("mafhper/push_")).toBeInTheDocument();

    expandGroup("Private repositories");
    expect(groupBox("Private repositories").getByText("mafhper/segredo")).toBeInTheDocument();
    // The previously open group closed by itself.
    expect(groupBox("Public repositories").queryByText("mafhper/push_")).not.toBeInTheDocument();
    expect(groupBox("Public repositories").getByRole("button", { name: "Expand group" })).toHaveAttribute("aria-expanded", "false");
  });

  it("keeps the rows in a stable order when a repository is toggled", async () => {
    await renderSettings([secondPublicRepo, publicRepo]);
    expandGroup("Public repositories");

    const publicGroup = groupBox("Public repositories");
    const rowTexts = () => publicGroup
      .getAllByRole("button")
      .filter((element) => element.hasAttribute("aria-pressed"))
      .map((element) => element.textContent ?? "");

    const before = rowTexts();
    expect(before).toHaveLength(2);
    expect(before[0]).toContain("mafhper/public-ui");

    fireEvent.click(publicGroup.getByRole("button", { name: /mafhper\/push_/ }));

    expect(publicGroup.getByRole("button", { name: /mafhper\/push_/ })).toHaveAttribute("aria-pressed", "true");
    // Selecting must not move the row (featured or selected no longer sort
    // first), or the page would jump mid-selection.
    expect(rowTexts()).toEqual(before);
  });

  it("sorts by name by default, and by last modification or creation on demand", async () => {
    const updatedFirst = createRepo({
      id: 11,
      fullName: "mafhper/aaa-updated",
      name: "aaa-updated",
      updatedAt: "2026-03-01T00:00:00.000Z",
      createdAt: "2026-01-01T00:00:00.000Z",
    });
    const createdFirst = createRepo({
      id: 12,
      fullName: "mafhper/zzz-created",
      name: "zzz-created",
      updatedAt: "2026-01-10T00:00:00.000Z",
      createdAt: "2026-02-20T00:00:00.000Z",
    });
    await renderSettings([createdFirst, updatedFirst]);
    expandGroup("Public repositories");

    const rowTexts = () => groupBox("Public repositories")
      .getAllByRole("button")
      .filter((element) => element.hasAttribute("aria-pressed"))
      .map((element) => element.textContent ?? "");

    // Alphabetical by default, even though the input order was reversed.
    expect(rowTexts()[0]).toContain("mafhper/aaa-updated");

    fireEvent.click(screen.getByRole("button", { name: "Last modified" }));
    expect(rowTexts()[0]).toContain("mafhper/aaa-updated");
    expect(rowTexts()[1]).toContain("mafhper/zzz-created");

    fireEvent.click(screen.getByRole("button", { name: "Created" }));
    expect(rowTexts()[0]).toContain("mafhper/zzz-created");
    expect(rowTexts()[1]).toContain("mafhper/aaa-updated");

    fireEvent.click(screen.getByRole("button", { name: "Name" }));
    expect(rowTexts()[0]).toContain("mafhper/aaa-updated");
  });

  // The heaviest render in the suite (150+60+45+20 rows, three expansion passes):
  // 3.0s warm, 14.4s on a cold module cache, against a 15s global budget. fd4e567
  // (clean baseline) failed here before any promo change; assertions are untouched.
  it("paginates a big group at 50 rows per click: first page, everything, closed", { timeout: 45000 }, async () => {
    await renderSettings(buildLargeCatalog());

    // Biggest first, and the counters live on the collapsed headers.
    expect(groupOrder()).toEqual(["Public repositories", "Private repositories", "Forks", "Others"]);
    expect(groupBox("Public repositories").getByText("0 of 150 selected")).toBeInTheDocument();
    expect(groupBox("Private repositories").getByText("0 of 60 selected")).toBeInTheDocument();
    expect(groupBox("Forks").getByText("0 of 45 selected")).toBeInTheDocument();
    expect(groupBox("Others").getByText("0 of 20 selected")).toBeInTheDocument();
    expect(groupBox("Public repositories").queryByText("acme/public-0")).not.toBeInTheDocument();

    // 1st click on the title: the first 50 rows, plus the explicit affordance.
    expandGroup("Public repositories");
    expect(groupBox("Public repositories").getByText("acme/public-0")).toBeInTheDocument();
    expect(groupBox("Public repositories").queryByText("acme/public-149")).not.toBeInTheDocument();
    expect(groupBox("Public repositories").getByText("Showing the first 50 of 150.")).toBeInTheDocument();

    // 2nd click: everything.
    expandGroup("Public repositories");
    expect(groupBox("Public repositories").getByText("acme/public-149")).toBeInTheDocument();
    expect(groupBox("Public repositories").queryByText("Showing the first 50 of 150.")).not.toBeInTheDocument();

    // 3rd click: closed again, header and counter stay.
    collapseGroup("Public repositories");
    expect(groupBox("Public repositories").queryByText("acme/public-0")).not.toBeInTheDocument();
    expect(groupBox("Public repositories").getByText("0 of 150 selected")).toBeInTheDocument();

    // The footer button performs the same transition as the second click.
    expandGroup("Private repositories");
    expect(groupBox("Private repositories").queryByText("acme/private-59")).not.toBeInTheDocument();
    fireEvent.click(groupBox("Private repositories").getByRole("button", { name: "Show all (60)" }));
    expect(groupBox("Private repositories").getByText("acme/private-59")).toBeInTheDocument();
  });

  it("search bypasses the 50-row cap, reveals every group and leaves the states alone", async () => {
    await renderSettings(buildLargeCatalog());

    // A query reveals matches in groups that were never opened, uncapped.
    fireEvent.change(screen.getByPlaceholderText("Search repositories..."), { target: { value: "public-149" } });
    expect(groupBox("Public repositories").getByText("acme/public-149")).toBeInTheDocument();
    expect(groupBox("Public repositories").queryByText("acme/public-0")).not.toBeInTheDocument();
    expect(groupBox("Public repositories").queryByRole("button", { name: /Show all/ })).not.toBeInTheDocument();
    // Groups without a match say so instead of staying closed.
    expect(groupBox("Forks").getByText("No repository in this group matches the current filter.")).toBeInTheDocument();

    // Clearing the query restores the previous state: this group was closed.
    fireEvent.change(screen.getByPlaceholderText("Search repositories..."), { target: { value: "" } });
    expect(groupBox("Public repositories").queryByText("acme/public-149")).not.toBeInTheDocument();

    // A fork term finds the fork row and its upstream label.
    fireEvent.change(screen.getByPlaceholderText("Search repositories..."), { target: { value: "fork-0" } });
    expect(groupBox("Forks").getByText("Fork of upstream/original-0")).toBeInTheDocument();
  });

  it("keeps groups collapsible, and the search filters inside them", async () => {
    await renderSettings([publicRepo, secondPublicRepo, privateRepo]);

    // Closed by default: the header stays, the rows leave the page.
    expect(groupBox("Public repositories").queryByText("mafhper/push_")).not.toBeInTheDocument();
    const expandButton = groupBox("Public repositories").getByRole("button", { name: "Expand group" });
    expect(expandButton).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(expandButton);
    expect(groupBox("Public repositories").getByText("mafhper/push_")).toBeInTheDocument();
    expect(groupBox("Public repositories").getByRole("button", { name: "Collapse group" })).toHaveAttribute("aria-expanded", "true");
    collapseGroup("Public repositories");
    expect(groupBox("Public repositories").queryByText("mafhper/push_")).not.toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Public repositories" })).toBeInTheDocument();

    // The search filters inside each group and reveals matches everywhere.
    fireEvent.change(screen.getByPlaceholderText("Search repositories..."), { target: { value: "public-ui" } });
    expect(groupBox("Public repositories").getByText("mafhper/public-ui")).toBeInTheDocument();
    expect(groupBox("Public repositories").queryByText("mafhper/push_")).not.toBeInTheDocument();
    // The group itself survives the search (RF-08).
    expect(groupBox("Public repositories").getByText("0 of 2 selected")).toBeInTheDocument();
    expect(groupBox("Private repositories").getByText("No repository in this group matches the current filter.")).toBeInTheDocument();
  });

  it("shows account quotas and the rail badge above the 80% threshold", async () => {
    await renderSettings([publicRepo]);

    const section = document.getElementById("settings-quotas");
    expect(section).not.toBeNull();
    expect(within(section as HTMLElement).getByRole("heading", { name: "GitHub quotas" })).toBeInTheDocument();
    expect(within(section as HTMLElement).getByText("Actions minutes")).toBeInTheDocument();
    expect(within(section as HTMLElement).getByText("1,800 / 2,000 min")).toBeInTheDocument();
    expect(within(section as HTMLElement).getByText("Critical usage")).toBeInTheDocument();
    // Per-repository usage is closed by default; the header carries the count.
    fireEvent.click(within(section as HTMLElement).getByRole("button", { name: /Usage by repository/ }));
    expect(within(section as HTMLElement).getByText("mafhper/push_")).toBeInTheDocument();
    // Mobile and desktop rails carry the same alert badge.
    expect(screen.getAllByLabelText("Quota alert at 90%")).toHaveLength(2);
  });

  it("PU14: opens on Preferences with the approved chapter order", async () => {
    await renderSettings([publicRepo]);

    expect(screen.getByRole("heading", { level: 1, name: "Settings" })).toBeInTheDocument();

    // DOM order, which the scroll-spy follows.
    expect(Array.from(document.querySelectorAll('section[id^="settings-"]')).map((element) => element.id))
      .toEqual([
        "settings-preferences",
        "settings-scoring",
        "settings-access",
        "settings-repos",
        "settings-state",
        "settings-quotas",
      ]);

    // Both rails (narrow and wide) carry the same order; the quota badge is
    // inside the last button and is stripped before comparing.
    const rails = screen.getAllByRole("navigation", { name: "Settings" });
    expect(rails).toHaveLength(2);
    for (const rail of rails) {
      const labels = within(rail).getAllByRole("button")
        .map((button) => (button.textContent ?? "").replace(/\d+%$/, "").trim());
      expect(labels).toEqual([
        "Preferences",
        "Scoring",
        "GitHub access",
        "Repository Control",
        "Current mode",
        "Quotas",
      ]);
    }
  });

  it("renders the scoring chapter with the emphasis controls and the live preview", async () => {
    await renderSettings([publicRepo]);

    const chapter = document.getElementById("settings-scoring");
    expect(chapter).not.toBeNull();
    const scope = within(chapter as HTMLElement);
    expect(scope.getByRole("heading", { name: "Queue scoring" })).toBeInTheDocument();
    expect(scope.getByRole("switch", { name: "Critical alerts" })).toHaveAttribute("aria-checked", "true");
    expect(scope.getByRole("switch", { name: "Failed runs" })).toHaveAttribute("aria-checked", "true");
    expect(scope.getByRole("group", { name: "Alert cap" })).toHaveTextContent("Up to 5");

    // The one snapshot repository has a single open alert and no critical one:
    // the preview says so before any control is touched.
    expect(within(chapter as HTMLElement).getByTestId("attention-preview")).toHaveTextContent("0 Critical · 1 Warning");

    fireEvent.click(scope.getByRole("switch", { name: "Critical alerts" }));
    expect(JSON.parse(window.localStorage.getItem("gl_settings") ?? "{}").attention).toEqual({
      criticalAlerts: false,
      failedRuns: true,
      alertCap: 5,
    });
  });

  it("PU14: warns at the top of the access chapter when the token and the selection disagree", async () => {
    window.localStorage.setItem("gl_selected_repos", JSON.stringify(["mafhper/assets-hub"]));
    window.localStorage.setItem("gl_primary_repo", JSON.stringify("mafhper/assets-hub"));

    await renderSettings([publicRepo], { login: "betafunda" });

    const banner = screen.getByTestId("mixed-account-banner");
    expect(banner).toHaveTextContent("Token and repositories from different accounts");
    expect(banner).toHaveTextContent("@betafunda");
    expect(banner).toHaveTextContent("mafhper");
    // The echo in the selection chapter keeps the warning reachable there.
    expect(screen.getByText(/repositories are from @mafhper, but the token is @betafunda/)).toBeInTheDocument();
    // Nothing was deleted by connecting the new token.
    expect(JSON.parse(window.localStorage.getItem("gl_selected_repos") as string)).toEqual(["mafhper/assets-hub"]);
  });
});
