/**
 * PU14 red loop — one token, two accounts.
 *
 * Reported symptom (print, 2026-10-19): the token of `betafunda` is connected,
 * the section header reads `Account @betafunda`, and `Usage by repository` still
 * lists `mafhper/*` rows — the previous account's selection — with no warning.
 *
 * This test drives the real path end to end:
 *
 * 1. `AppProvider` restores the session from the keyring (stubbed to hold
 *    `betafunda`'s token) and validates it against `betafunda`.
 * 2. `gl_selected_repos` (localStorage, account-agnostic) still carries the
 *    previous account's selection.
 * 3. The real `useAccountQuotas` derives its inputs from both: `login` from the
 *    session, `repoNames` from the persisted selection.
 * 4. The real `fetchAccountQuotas` probes exactly those repositories, with the
 *    new token, and the section renders the rows it returned.
 *
 * The wiring below mirrors `Settings.tsx` (`QuotasSection` fed by
 * `useAccountQuotas`), so the assertion below is about the surface the user
 * actually saw.
 *
 * Invariant locked here (PU14 acceptance): rows owned by another account must
 * never be presented without an explicit warning.
 */
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppProvider } from "@/contexts/AppContext";
import { useApp } from "@/contexts/useApp";
import { useAccountQuotas } from "@/hooks/useGitHub";
import { QuotasSection } from "./QuotasSection";

vi.mock("@/config/site", async () => {
  const actual = await vi.importActual<typeof import("@/config/site")>("@/config/site");
  return {
    ...actual,
    isLocalSecureRuntime: vi.fn(() => true),
  };
});

vi.mock("@/services/secure-storage", () => ({
  loadGithubToken: vi.fn(async () => "ghp_betafunda_token"),
  saveGithubToken: vi.fn(async () => {}),
  clearGithubToken: vi.fn(async () => {}),
  isSecureStorageAvailable: vi.fn(() => false),
}));

vi.mock("@/services/github", async () => {
  const actual = await vi.importActual<typeof import("@/services/github")>("@/services/github");
  return {
    ...actual,
    validateToken: vi.fn(async () => ({ login: "betafunda", avatarUrl: "" })),
    diagnoseToken: vi.fn(async () => ({
      token: "valid",
      kind: "classic",
      accessibleRepoCount: 0,
      privateRepoCount: 0,
      permissions: [],
      dependabotProbe: { status: "unavailable", repoFullName: "" },
    })),
  };
});

/** Exactly the props `Settings.tsx` passes to the section. */
function QuotaSectionHarness() {
  const { session } = useApp();
  const { data, isLoading, isError, refetch } = useAccountQuotas();

  return (
    <QuotasSection
      snapshot={data}
      isLoading={isLoading}
      isError={isError}
      hasSession={Boolean(session?.token)}
      onRetry={() => {
        void refetch();
      }}
    />
  );
}

interface RecordedCall {
  url: string;
  authorization: string | null;
}

/**
 * GitHub double: the token belongs to `betafunda`; the probed repositories
 * belong to `mafhper`. `assets-hub` answers with cache data (as in the print),
 * the other two answer 404 (no access with this token).
 */
function stubGitHubApi(calls: RecordedCall[]) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const headers = (init?.headers ?? {}) as Record<string, string>;
      calls.push({ url, authorization: headers.Authorization ?? null });

      const reply = (status: number, body: unknown) => ({
        ok: status >= 200 && status < 300,
        status,
        headers: { get: () => null },
        json: async () => body,
      });

      if (/\/user$/.test(url)) return reply(200, { login: "betafunda", plan: { name: "free" } });
      if (url.includes("/users/betafunda/settings/billing/usage")) return reply(200, { usageItems: [] });
      if (url.includes("/settings/billing/shared-storage")) return reply(404, {});
      if (url.includes("/repos/mafhper/assets-hub/actions/cache/usage")) {
        return reply(200, { active_caches_size_in_bytes: 5 * 1024 ** 3, active_caches_count: 12 });
      }
      if (url.includes("/repos/mafhper/assets-hub/actions/artifacts")) {
        return reply(200, { artifacts: [{ size_in_bytes: 8 * 1024 * 1024, expired: false }] });
      }
      return reply(404, {});
    }),
  );
}

function renderHarness() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <AppProvider>
        <QuotaSectionHarness />
      </AppProvider>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("QuotasSection — token account vs selected repositories", () => {
  it("warns when the selection belongs to another account instead of listing it silently", async () => {
    // The state left by the previous account: selection and featured repo are
    // persisted in localStorage, which has no notion of an account.
    window.localStorage.setItem(
      "gl_selected_repos",
      JSON.stringify(["mafhper/assets-hub", "mafhper/aurawall", "mafhper/dinopad"]),
    );
    window.localStorage.setItem("gl_primary_repo", JSON.stringify("mafhper/aurawall"));
    // The identity saved when the new token was connected.
    window.localStorage.setItem(
      "gl_github_identity",
      JSON.stringify({ username: "betafunda", avatarUrl: "", savedAt: "2026-10-19T22:02:00.000Z" }),
    );

    const calls: RecordedCall[] = [];
    stubGitHubApi(calls);
    renderHarness();

    // The header names the token's account...
    await screen.findByText("Account @betafunda");

    // ...while the rows are the previous account's selection, still probed
    // with the new token (the mixture is live, not a stale disk cache).
    expect(await screen.findByText("mafhper/assets-hub")).toBeInTheDocument();
    expect(await screen.findByText("mafhper/aurawall")).toBeInTheDocument();
    expect(await screen.findByText("mafhper/dinopad")).toBeInTheDocument();
    const assetsProbe = calls.find((call) => call.url.includes("/repos/mafhper/assets-hub/actions/cache/usage"));
    expect(assetsProbe?.authorization).toBe("Bearer ghp_betafunda_token");

    // The invariant: this mismatch is never silent.
    const warning = screen.getByTestId("quota-account-mismatch");
    expect(warning).toHaveTextContent("mafhper");
  });
});
