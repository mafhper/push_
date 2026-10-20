/**
 * PU15 — ordering, per-repository disclosure and the guarded cache deletion.
 *
 * The seams exercised here are the ones the user touches:
 *
 * 1. the default order is the storage rank approved by `@ui` (score, minutes
 *    tiebreak, name tiebreak), with unread rows after every real reading;
 * 2. the order control flips the rows and survives a remount through
 *    `localStorage push.quotaRepoSort`;
 * 3. each row opens on its own chevron, without closing the others;
 * 4. clearing the cache lists the entries first (even when the snapshot has no
 *    cache inventory), asks for confirmation with the count and size, and only
 *    then deletes — followed by a status message and a quota refetch;
 * 5. a 403 becomes an honest "no scope" state, and a missing token removes only
 *    the cache action — the external links stay available.
 */
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppProvider } from "@/contexts/AppContext";
import type { AccountQuotaSnapshot, RepoQuotaUsage } from "@/quotas";
import { QuotasSection } from "./QuotasSection";

function createRepo(
  fullName: string,
  overrides: Partial<RepoQuotaUsage> = {},
): RepoQuotaUsage {
  return {
    fullName,
    cacheMb: 100,
    cacheCount: 1,
    artifactsMb: 0,
    actionsMinutes: 10,
    ...overrides,
  };
}

function createSnapshot(repos: RepoQuotaUsage[]): AccountQuotaSnapshot {
  return {
    fetchedAt: "2026-10-19T12:00:00.000Z",
    login: "betafunda",
    billing: "enhanced",
    families: [],
    repos,
    repoProbe: { probed: repos.length, requested: repos.length },
    foreignOwners: [],
    foreignRepoCount: 0,
  };
}

function renderSection({
  repos,
  token,
  actionsDenied = false,
}: {
  repos: RepoQuotaUsage[];
  token?: string;
  actionsDenied?: boolean;
}) {
  const onCachesCleared = vi.fn();
  const view = render(
    <AppProvider>
      <QuotasSection
        snapshot={createSnapshot(repos)}
        isLoading={false}
        isError={false}
        hasSession
        onRetry={vi.fn()}
        token={token}
        actionsDenied={actionsDenied}
        onCachesCleared={onCachesCleared}
      />
    </AppProvider>,
  );
  return { ...view, onCachesCleared };
}

function openCard() {
  fireEvent.click(screen.getByRole("button", { name: /Usage by repository/ }));
}

function rowNames(): Array<string | null> {
  return screen.getAllByTestId("quota-repo-row").map((row) => row.getAttribute("data-full-name"));
}

function expandRow(fullName: string) {
  fireEvent.click(screen.getByRole("button", { name: fullName }));
}

interface RecordedCall {
  url: string;
  method: string;
}

function reply(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => null },
    json: async () => body,
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("QuotasSection — per-repository order (PU15)", () => {
  it("opens on the biggest storage consumer and falls back to minutes, then name", () => {
    renderSection({
      repos: [
        createRepo("zeta/small", { cacheMb: 100, artifactsMb: 0, actionsMinutes: 999 }),
        createRepo("alpha/big", { cacheMb: 2048, artifactsMb: 0, actionsMinutes: 1 }),
        createRepo("beta/tie", { cacheMb: 512, artifactsMb: 512, actionsMinutes: 4 }),
        createRepo("delta/tie", { cacheMb: 0, artifactsMb: 1024, actionsMinutes: 10 }),
        createRepo("gamma/only-minutes", { cacheMb: null, cacheCount: null, artifactsMb: null, actionsMinutes: 500 }),
        createRepo("omega/nothing", { cacheMb: null, cacheCount: null, artifactsMb: null, actionsMinutes: null }),
      ],
    });

    openCard();

    // delta and beta are tied on storage (1,024 MB); minutes decide, and the
    // unread rows stay after every repository with a reading.
    expect(rowNames()).toEqual([
      "alpha/big",
      "delta/tie",
      "beta/tie",
      "zeta/small",
      "gamma/only-minutes",
      "omega/nothing",
    ]);
  });

  it("switches to A–Z and keeps the choice after a remount", () => {
    const repos = [createRepo("zeta/small"), createRepo("alpha/big", { cacheMb: 2048 })];

    const first = renderSection({ repos });
    openCard();
    expect(rowNames()).toEqual(["alpha/big", "zeta/small"]);

    fireEvent.click(screen.getByRole("button", { name: "A–Z" }));
    expect(rowNames()).toEqual(["alpha/big", "zeta/small"]);
    // A–Z and the default happen to agree here only because alpha is also the
    // biggest; the pressed state is what proves the choice was applied.
    expect(screen.getByRole("button", { name: "A–Z" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Highest usage" })).toHaveAttribute("aria-pressed", "false");
    expect(window.localStorage.getItem("push.quotaRepoSort")).toBe("name");

    first.unmount();
    renderSection({ repos });
    openCard();
    expect(window.localStorage.getItem("push.quotaRepoSort")).toBe("name");
    expect(screen.getByRole("button", { name: "A–Z" })).toHaveAttribute("aria-pressed", "true");
  });

  it("uses A–Z as a real reorder when the biggest repository is not first alphabetically", () => {
    renderSection({
      repos: [createRepo("zeta/big", { cacheMb: 2048 }), createRepo("alpha/small", { cacheMb: 10 })],
    });
    openCard();
    expect(rowNames()).toEqual(["zeta/big", "alpha/small"]);

    fireEvent.click(screen.getByRole("button", { name: "A–Z" }));
    expect(rowNames()).toEqual(["alpha/small", "zeta/big"]);
  });
});

describe("QuotasSection — per-repository disclosure (PU15)", () => {
  it("opens the row's readings and notes without closing another row", () => {
    renderSection({
      repos: [
        createRepo("betafunda/push_", { cacheMb: 1536, artifactsMb: 64, actionsMinutes: 1200 }),
        createRepo("betafunda/other", { cacheMb: 10, artifactsMb: 0, actionsMinutes: 5 }),
      ],
    });
    openCard();

    const first = screen.getByRole("button", { name: "betafunda/push_" });
    const second = screen.getByRole("button", { name: "betafunda/other" });
    expect(first).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("Cache 1.5 GB / 10 GB")).not.toBeInTheDocument();

    fireEvent.click(first);
    expect(first).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Cache 1.5 GB / 10 GB")).toBeInTheDocument();
    expect(screen.getByText("Artifacts 64 MB")).toBeInTheDocument();
    expect(screen.getByText("1,200 min")).toBeInTheDocument();
    expect(screen.getByText(/minutes already used are not recovered/)).toBeInTheDocument();

    // Non-exclusive: the second row opens while the first stays open.
    fireEvent.click(second);
    expect(second).toHaveAttribute("aria-expanded", "true");
    expect(first).toHaveAttribute("aria-expanded", "true");

    fireEvent.click(first);
    expect(first).toHaveAttribute("aria-expanded", "false");
  });

  it("keeps only the guarded cache action out of the DOM when there is no token", () => {
    renderSection({
      repos: [createRepo("betafunda/push_")],
      token: undefined,
    });
    openCard();
    expandRow("betafunda/push_");

    // Clearing a cache uses the local token, so it does not exist without one…
    expect(screen.queryByRole("button", { name: "Clear cache" })).not.toBeInTheDocument();
    // …but the external links never consume the token and stay available.
    expect(screen.getByRole("link", { name: /View on GitHub/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Manage caches/ })).toBeInTheDocument();
    // A single repository has no order to choose.
    expect(screen.queryByRole("button", { name: "A–Z" })).not.toBeInTheDocument();
  });
});

describe("QuotasSection — clearing a repository cache (PU15)", () => {
  it("lists the caches when the inventory is null, confirms, deletes and refreshes", async () => {
    const calls: RecordedCall[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        const method = init?.method ?? "GET";
        calls.push({ url, method });

        if (url.includes("/repos/betafunda/push_/actions/caches?per_page=100")) {
          return reply(200, {
            total_count: 2,
            actions_caches: [
              { id: 11, key: "linux-a", ref: "refs/heads/main", size_in_bytes: 1.5 * 1024 ** 3 },
              { id: 12, key: "linux-b", ref: "refs/heads/main", size_in_bytes: 512 * 1024 ** 2 },
            ],
          });
        }
        if (/\/repos\/betafunda\/push_\/actions\/caches\/1[12]$/.test(url)) {
          return reply(204, {});
        }
        return reply(404, {});
      }),
    );

    const { onCachesCleared } = renderSection({
      // The snapshot knows artifacts and minutes but not the cache inventory:
      // the confirmation must list the repository instead of guessing.
      repos: [
        createRepo("betafunda/push_", {
          cacheMb: null,
          cacheCount: null,
          artifactsMb: 4,
          actionsMinutes: 1200,
        }),
      ],
      token: "ghp_test_token",
    });
    openCard();
    expandRow("betafunda/push_");

    fireEvent.click(screen.getByRole("button", { name: "Clear cache" }));
    const confirm = await screen.findByRole("button", { name: "Delete 2 caches · ~2 GB" });
    // The action the user pressed unmounts; keyboard focus must land on the
    // confirmation instead of falling back to the document. The focus runs in
    // a passive effect, so wait for it instead of racing the commit.
    await waitFor(() => expect(confirm).toHaveFocus());
    expect(screen.getByText(/Artifacts, Actions minutes and repository contents are not touched/)).toBeInTheDocument();

    const listCalls = () => calls.filter((call) => call.url.includes("/actions/caches?per_page=100"));
    expect(listCalls()).toHaveLength(1);
    // Nothing is deleted before the second step.
    expect(calls.filter((call) => call.method === "DELETE")).toHaveLength(0);

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("button", { name: /Delete 2 caches/ })).not.toBeInTheDocument();
    expect(calls.filter((call) => call.method === "DELETE")).toHaveLength(0);

    // Reopening the confirmation lists the repository again (fresh inventory).
    fireEvent.click(screen.getByRole("button", { name: "Clear cache" }));
    const secondConfirm = await screen.findByRole("button", { name: "Delete 2 caches · ~2 GB" });
    expect(listCalls()).toHaveLength(2);

    fireEvent.click(secondConfirm);
    const status = await screen.findByRole("status");
    expect(status).toHaveTextContent("2 caches deleted · 2 GB freed.");

    const deletes = calls.filter((call) => call.method === "DELETE");
    expect(deletes.map((call) => call.url)).toEqual([
      "https://api.github.com/repos/betafunda/push_/actions/caches/11",
      "https://api.github.com/repos/betafunda/push_/actions/caches/12",
    ]);
    expect(onCachesCleared).toHaveBeenCalledTimes(1);
    // The row stays open after the action, as approved.
    expect(screen.getByRole("button", { name: "betafunda/push_" })).toHaveAttribute("aria-expanded", "true");
  });

  it("marks the listing as busy while the request is in flight", async () => {
    let resolveList: ((value: unknown) => void) | undefined;
    const pending = new Promise((resolve) => {
      resolveList = resolve;
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(() => pending),
    );

    renderSection({ repos: [createRepo("betafunda/push_")], token: "ghp_test_token" });
    openCard();
    expandRow("betafunda/push_");
    fireEvent.click(screen.getByRole("button", { name: "Clear cache" }));

    const busy = screen.getByRole("button", { name: "Listing caches..." });
    expect(busy).toHaveAttribute("aria-busy", "true");
    expect(busy).toBeDisabled();

    resolveList?.(reply(200, { total_count: 0, actions_caches: [] }));
    expect(await screen.findByText("No caches to clear in this repository.")).toBeInTheDocument();
  });

  it("turns a 403 into a disabled action with the reason and the access link", async () => {
    const calls: RecordedCall[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        calls.push({ url: String(input), method: init?.method ?? "GET" });
        return reply(403, {});
      }),
    );

    renderSection({ repos: [createRepo("betafunda/push_")], token: "ghp_test_token" });
    openCard();
    expandRow("betafunda/push_");
    fireEvent.click(screen.getByRole("button", { name: "Clear cache" }));

    expect(await screen.findByText(/cannot manage Actions caches/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Clear cache" })).toBeDisabled();
    expect(screen.getByRole("link", { name: "Review GitHub access" })).toHaveAttribute("href", "#settings-access");
    expect(calls.filter((call) => call.method === "DELETE")).toHaveLength(0);
  });

  it("starts disabled when diagnostics already denied Actions", () => {
    renderSection({
      repos: [createRepo("betafunda/push_")],
      token: "ghp_test_token",
      actionsDenied: true,
    });
    openCard();
    expandRow("betafunda/push_");

    const button = screen.getByRole("button", { name: "Clear cache" });
    expect(button).toBeDisabled();
    expect(within(button.closest("div") as HTMLElement).getByText(/cannot manage Actions caches/)).toBeInTheDocument();
  });
});
