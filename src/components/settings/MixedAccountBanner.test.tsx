/**
 * PU14 — the three reconciliation paths, driven from the banner.
 *
 * The banner is the surface where the mismatch is named. Each action is
 * destructive in a different way, so every one of them is behind a
 * confirmation: nothing changes until "Confirm" is pressed. The tests seed the
 * installation-scoped storage the way a token swap leaves it and assert on
 * localStorage, not just on React state — the bug was in the stored selection.
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useEffect, useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { AppProvider } from "@/contexts/AppContext";
import { useApp } from "@/contexts/useApp";
import { MixedAccountBanner } from "./MixedAccountBanner";

vi.mock("@/services/query-persistence", () => ({
  removePersistedQueryCache: vi.fn(async () => {}),
}));

const SELECTION = ["mafhper/assets-hub", "mafhper/aurawall"];
const PRIMARY = "mafhper/assets-hub";
const IDENTITY = { username: "mafhper", avatarUrl: "", savedAt: "2026-10-18T00:00:00.000Z" };

function seedMixedInstallation() {
  window.localStorage.setItem("gl_selected_repos", JSON.stringify(SELECTION));
  window.localStorage.setItem("gl_primary_repo", JSON.stringify(PRIMARY));
  window.localStorage.setItem("gl_github_identity", JSON.stringify(IDENTITY));
  window.localStorage.setItem("gl_repo_logo:v4:mafhper/assets-hub/main", "logo");
  window.localStorage.setItem("gl_cache_dashboard", "cached");
  window.localStorage.setItem("gl_settings", JSON.stringify({ theme: "dark" }));
}

function Harness() {
  const { session, selectedRepos, primaryRepo, setSession } = useApp();
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    setSession({ token: "stored-token", username: "betafunda", avatarUrl: "" });
  }, [setSession]);

  return (
    <div>
      <MixedAccountBanner
        login="betafunda"
        owners={["mafhper"]}
        repoCount={SELECTION.length}
        onResolved={setNotice}
      />
      <p data-testid="session">{session?.username ?? "none"}</p>
      <p data-testid="selection">{selectedRepos.join(",")}</p>
      <p data-testid="primary">{primaryRepo ?? "none"}</p>
      {notice && <p role="status">{notice}</p>}
    </div>
  );
}

function renderHarness() {
  return render(
    <AppProvider>
      <Harness />
    </AppProvider>,
  );
}

describe("MixedAccountBanner — reconciliation with confirmation", () => {
  it("changes nothing before the confirmation, and cancel leaves everything as it was", async () => {
    seedMixedInstallation();
    renderHarness();
    await waitFor(() => expect(screen.getByTestId("session")).toHaveTextContent("betafunda"));

    fireEvent.click(screen.getByRole("button", { name: /keep the token and replace the repositories/i }));
    // The confirmation is a separate step; the action itself did nothing yet.
    expect(window.localStorage.getItem("gl_selected_repos")).toBe(JSON.stringify(SELECTION));
    fireEvent.click(screen.getByRole("button", { name: /^cancel$/i }));

    expect(screen.getByTestId("selection")).toHaveTextContent(SELECTION.join(","));
    expect(window.localStorage.getItem("gl_selected_repos")).toBe(JSON.stringify(SELECTION));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("keep token: clears selection and featured repository, keeps the session and the cache", async () => {
    seedMixedInstallation();
    renderHarness();
    await waitFor(() => expect(screen.getByTestId("session")).toHaveTextContent("betafunda"));

    fireEvent.click(screen.getByRole("button", { name: /keep the token and replace the repositories/i }));
    fireEvent.click(screen.getByRole("button", { name: /^confirm$/i }));

    await waitFor(() => expect(screen.getByTestId("selection")).toBeEmptyDOMElement());
    expect(screen.getByTestId("primary")).toHaveTextContent("none");
    expect(screen.getByTestId("session")).toHaveTextContent("betafunda");
    expect(window.localStorage.getItem("gl_selected_repos")).toBeNull();
    expect(window.localStorage.getItem("gl_primary_repo")).toBeNull();
    // A is not allowed to touch the cache.
    expect(window.localStorage.getItem("gl_cache_dashboard")).toBe("cached");
    expect(window.localStorage.getItem("gl_repo_logo:v4:mafhper/assets-hub/main")).toBe("logo");
    expect(await screen.findByRole("status")).toHaveTextContent("Account unified as @betafunda.");
  });

  it("keep repositories: disconnects the token and preserves the stored selection", async () => {
    seedMixedInstallation();
    renderHarness();
    await waitFor(() => expect(screen.getByTestId("session")).toHaveTextContent("betafunda"));

    fireEvent.click(screen.getByRole("button", { name: /keep the repositories and replace the token/i }));
    fireEvent.click(screen.getByRole("button", { name: /^confirm$/i }));

    await waitFor(() => expect(screen.getByTestId("session")).toHaveTextContent("none"));
    // B is the whole point: logout must not clear the selection.
    expect(screen.getByTestId("selection")).toHaveTextContent(SELECTION.join(","));
    expect(JSON.parse(window.localStorage.getItem("gl_selected_repos") as string)).toEqual(SELECTION);
    expect(window.localStorage.getItem("gl_primary_repo")).toBe(JSON.stringify(PRIMARY));
    expect(await screen.findByRole("status")).toHaveTextContent(/connect the token of @mafhper/i);
  });

  it("clear data: lists the keys, deletes only them, and reports the unified account", async () => {
    seedMixedInstallation();
    renderHarness();
    await waitFor(() => expect(screen.getByTestId("session")).toHaveTextContent("betafunda"));

    fireEvent.click(screen.getByRole("button", { name: /delete the old account's local data/i }));
    // The exact inventory is visible before anything is deleted.
    expect(screen.getByText("gl_selected_repos")).toBeInTheDocument();
    expect(screen.getByText("gl_repo_logo:*")).toBeInTheDocument();
    expect(window.localStorage.getItem("gl_selected_repos")).toBe(JSON.stringify(SELECTION));

    fireEvent.click(screen.getByRole("button", { name: /^confirm$/i }));

    await waitFor(() => expect(screen.getByTestId("selection")).toBeEmptyDOMElement());
    expect(screen.getByTestId("primary")).toHaveTextContent("none");
    expect(window.localStorage.getItem("gl_selected_repos")).toBeNull();
    expect(window.localStorage.getItem("gl_primary_repo")).toBeNull();
    expect(window.localStorage.getItem("gl_github_identity")).toBeNull();
    expect(window.localStorage.getItem("gl_repo_logo:v4:mafhper/assets-hub/main")).toBeNull();
    expect(window.localStorage.getItem("gl_cache_dashboard")).toBeNull();
    // Not account data: preferences and the connected token stay.
    expect(window.localStorage.getItem("gl_settings")).not.toBeNull();
    expect(screen.getByTestId("session")).toHaveTextContent("betafunda");
    expect(await screen.findByRole("status")).toHaveTextContent("Account unified as @betafunda.");
  });
});
