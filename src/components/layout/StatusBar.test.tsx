import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { StatusBar } from "./StatusBar";
import { AppProvider } from "@/contexts/AppContext";

vi.mock("@/config/site", async () => {
  const actual = await vi.importActual<typeof import("@/config/site")>("@/config/site");
  return {
    ...actual,
    isLocalSecureRuntime: vi.fn(() => true),
  };
});

vi.mock("@/hooks/useGitHub", () => ({
  useDashboardSnapshot: vi.fn(() => ({ data: null })),
  useRateLimit: vi.fn(() => ({ data: null })),
}));

function renderStatusBar(path: string) {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <AppProvider>
        <MemoryRouter initialEntries={[path]}>
          <StatusBar />
        </MemoryRouter>
      </AppProvider>
    </QueryClientProvider>,
  );
}

describe("StatusBar", () => {
  it("drops its shortcuts on the settings screen and offers only the way back home", () => {
    renderStatusBar("/app/settings");

    // Search, refresh and the settings gear belong to the dashboard chrome;
    // inside settings the bar keeps only the back-home control.
    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute("href", "/app");
    expect(screen.queryByRole("link", { name: "Settings" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /search/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /refresh/i })).not.toBeInTheDocument();
  });

  it("keeps search, refresh and the settings shortcut on the other routes", () => {
    renderStatusBar("/app");

    expect(screen.getByRole("link", { name: "Settings" })).toHaveAttribute("href", "/app/settings");
    expect(screen.getByRole("button", { name: /search/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Refresh data" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Home" })).not.toBeInTheDocument();
  });
});
