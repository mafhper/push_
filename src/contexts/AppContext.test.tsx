/**
 * PU14/H4: the stored identity is only a hint.
 *
 * Before the fix the provider published `gl_github_identity` as the session
 * while `/user` was still in flight, so every account-aware surface compared
 * the new token against the previous account's name for one round-trip.
 */
import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AppProvider } from "./AppContext";
import { useApp } from "./useApp";

const { validateTokenMock } = vi.hoisted(() => ({ validateTokenMock: vi.fn() }));

vi.mock("@/services/secure-storage", () => ({
  loadGithubToken: vi.fn(async () => "stored-token"),
  clearGithubToken: vi.fn(async () => {}),
  saveGithubToken: vi.fn(async () => {}),
  isSecureStorageAvailable: vi.fn(() => false),
}));

vi.mock("@/services/github", () => ({
  validateToken: validateTokenMock,
  diagnoseToken: vi.fn(async () => ({
    token: "valid",
    kind: "classic",
    permissions: [],
    accessibleRepoCount: 0,
    privateRepoCount: 0,
  })),
}));

vi.mock("@/services/presentation-identity", () => ({
  saveIdentity: vi.fn(),
  clearIdentity: vi.fn(),
}));

function SessionProbe() {
  const { session, sessionStatus } = useApp();
  return (
    <>
      <p data-testid="session">{session?.username ?? "none"}</p>
      <p data-testid="status">{sessionStatus}</p>
    </>
  );
}

describe("AppProvider — session restore", () => {
  it("never publishes the stored identity before the token is validated", async () => {
    window.localStorage.setItem(
      "gl_github_identity",
      JSON.stringify({ username: "mafhper", avatarUrl: "", savedAt: "2026-10-18T00:00:00.000Z" }),
    );

    let resolveViewer: ((value: unknown) => void) | undefined;
    validateTokenMock.mockReturnValue(new Promise((resolve) => {
      resolveViewer = resolve;
    }));

    render(
      <AppProvider>
        <SessionProbe />
      </AppProvider>,
    );

    await waitFor(() => expect(validateTokenMock).toHaveBeenCalledWith("stored-token"));
    // The previous account's name is on disk, but the token has not spoken.
    expect(screen.getByTestId("session")).toHaveTextContent("none");
    expect(screen.getByTestId("status")).toHaveTextContent("loading");

    resolveViewer?.({ login: "betafunda", avatarUrl: "" });
    await waitFor(() => expect(screen.getByTestId("session")).toHaveTextContent("betafunda"));
    expect(screen.getByTestId("status")).toHaveTextContent("authenticated");
  });
});
